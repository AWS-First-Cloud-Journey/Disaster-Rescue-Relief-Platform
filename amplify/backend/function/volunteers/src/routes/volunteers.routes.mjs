import express from 'express';
import {
  CognitoIdentityProvider,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import {
  generateTemporaryPassword,
  formatVolunteerData,
  calculateSkillsDistribution,
  calculateLocationDistribution,
  calculateAvailabilityMetrics
} from '../utils/volunteerUtils.mjs';
import { historyService } from '../services/history.service.mjs';

// Initialize Cognito client with region
const cognito = new CognitoIdentityProvider({
  region: process.env.REGION || 'us-east-1'
});
const router = express.Router();

// Get all volunteers with optional pagination
router.get('/', async (req, res) => {
  try {
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const params = {
      UserPoolId: userPoolId,
      Limit: limit
    };

    if (req.query.token) {
      params.PaginationToken = req.query.token;
    }

    // SDK v3 uses command pattern
    const command = new ListUsersCommand(params);
    const response = await cognito.send(command);

    const volunteers = response.Users.map(formatVolunteerData);

    res.json({
      volunteers,
      nextToken: response.PaginationToken
    });
  } catch (error) {
    console.error('Error listing volunteers:', error);
    res.status(500).json({ error: error.message || 'Failed to list volunteers' });
  }
});

// Search volunteers by filter criteria
router.get('/search', async (req, res) => {
  try {
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    const { attribute, value } = req.query;
    if (!attribute || !value) {
      return res.status(400).json({ error: 'attribute and value query parameters are required' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const params = {
      UserPoolId: userPoolId,
      Filter: `${attribute} = "${value}"`,
      Limit: limit
    };

    if (req.query.token) {
      params.PaginationToken = req.query.token;
    }

    const command = new ListUsersCommand(params);
    const response = await cognito.send(command);

    const volunteers = response.Users.map(formatVolunteerData);

    res.json({
      volunteers,
      nextToken: response.PaginationToken
    });
  } catch (error) {
    console.error('Error searching volunteers:', error);
    res.status(500).json({ error: error.message || 'Failed to search volunteers' });
  }
});

// NEW ROUTES FOR HISTORY TRACKING

// Get history for a specific volunteer
router.get('/:username/history', async (req, res) => {
  try {
    // First verify volunteer exists
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    try {
      // Check if volunteer exists
      const params = {
        UserPoolId: userPoolId,
        Username: req.params.username
      };

      const command = new AdminGetUserCommand(params);
      await cognito.send(command);
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        return res.status(404).json({ error: 'Volunteer not found' });
      }
      throw error;
    }

    // Get volunteer history using the GSI
    const history = await historyService.getVolunteerHistory(req.params.username);

    // Calculate statistics
    const stats = {
      totalTasks: history.length,
      tasksByStatus: {},
      tasksByType: {},
      completionRate: 0
    };

    if (history.length > 0) {
      // Count tasks by final status
      history.forEach(item => {
        if (item.new_status) {
          stats.tasksByStatus[item.new_status] = (stats.tasksByStatus[item.new_status] || 0) + 1;
        }

        // Count by action type
        if (item.action_type) {
          stats.tasksByType[item.action_type] = (stats.tasksByType[item.action_type] || 0) + 1;
        }
      });

      // Calculate completion rate
      const completedTasks = stats.tasksByStatus.DONE || 0;
      stats.completionRate = (completedTasks / history.length * 100).toFixed(2);
    }

    res.json({
      username: req.params.username,
      history: history,
      stats: stats
    });
  } catch (error) {
    console.error(`Error getting history for volunteer ${req.params.username}:`, error);
    res.status(500).json({ error: error.message || 'Failed to get volunteer history' });
  }
});

// Get summary statistics for volunteer performance
router.get('/:username/performance', async (req, res) => {
  try {
    const username = req.params.username;

    // First check if volunteer exists
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    let volunteerData;
    try {
      const params = {
        UserPoolId: userPoolId,
        Username: username
      };

      const command = new AdminGetUserCommand(params);
      const response = await cognito.send(command);
      volunteerData = formatVolunteerData(response);
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        return res.status(404).json({ error: 'Volunteer not found' });
      }
      throw error;
    }

    // Get volunteer history
    const history = await historyService.getVolunteerHistory(username);

    // Calculate performance metrics
    const metrics = {
      totalRequests: history.length,
      completedRequests: 0,
      averageCompletionTime: null, // in hours
      requestsByType: {},
      requestsByMonth: {},
      requestsByLocation: {}
    };

    if (history.length > 0) {
      // Group requests by status
      const completed = [];

      history.forEach(item => {
        // Count by action type
        if (item.action_type) {
          metrics.requestsByType[item.action_type] = (metrics.requestsByType[item.action_type] || 0) + 1;
        }

        // Count by status (look for COMPLETE actions)
        if (item.action_type === 'COMPLETE' || item.new_status === 'DONE') {
          metrics.completedRequests += 1;

          // For completed tasks, calculate duration if possible
          if (item.claim_time && item.completion_time) {
            const claimTime = new Date(item.claim_time);
            const completionTime = new Date(item.completion_time);
            const durationHours = (completionTime - claimTime) / (1000 * 60 * 60);
            completed.push(durationHours);
          }
        }

        // Group by month
        const month = new Date(item.timestamp).toLocaleString('en-us', { month: 'short', year: 'numeric' });
        metrics.requestsByMonth[month] = (metrics.requestsByMonth[month] || 0) + 1;

        // Group by location if available
        if (item.request_location) {
          metrics.requestsByLocation[item.request_location] =
            (metrics.requestsByLocation[item.request_location] || 0) + 1;
        }
      });

      // Calculate average completion time
      if (completed.length > 0) {
        const sum = completed.reduce((a, b) => a + b, 0);
        metrics.averageCompletionTime = (sum / completed.length).toFixed(2);
      }
    }

    res.json({
      volunteer: volunteerData,
      performance: metrics
    });
  } catch (error) {
    console.error(`Error getting performance metrics for volunteer ${req.params.username}:`, error);
    res.status(500).json({ error: error.message || 'Failed to get performance metrics' });
  }
});

// Get active requests for a specific volunteer
router.get('/:username/active-requests', async (req, res) => {
  try {
    // First check if volunteer exists
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    try {
      const params = {
        UserPoolId: userPoolId,
        Username: req.params.username
      };

      const command = new AdminGetUserCommand(params);
      await cognito.send(command);
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        return res.status(404).json({ error: 'Volunteer not found' });
      }
      throw error;
    }

    // Get volunteer's active requests using a custom query
    // This would depend on your data structure, but assuming you have a way to
    // query active requests assigned to a volunteer
    const activeRequests = await historyService.getVolunteerActiveRequests(req.params.username);

    res.json({
      username: req.params.username,
      activeRequests: activeRequests
    });
  } catch (error) {
    console.error(`Error getting active requests for volunteer ${req.params.username}:`, error);
    res.status(500).json({ error: error.message || 'Failed to get active requests' });
  }
});

// Get volunteers by skill
router.get('/skills/:skill', async (req, res) => {
  try {
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    const skill = req.params.skill;
    const limit = parseInt(req.query.limit) || 50;

    // Note: This filter assumes skills are stored in a custom:skills attribute
    const params = {
      UserPoolId: userPoolId,
      Filter: `custom:skills contains "${skill}"`,
      Limit: limit
    };

    if (req.query.token) {
      params.PaginationToken = req.query.token;
    }

    const command = new ListUsersCommand(params);
    const response = await cognito.send(command);

    const volunteers = response.Users.map(formatVolunteerData);

    res.json({
      volunteers,
      nextToken: response.PaginationToken
    });
  } catch (error) {
    console.error(`Error getting volunteers with skill ${req.params.skill}:`, error);
    res.status(500).json({ error: error.message || 'Failed to get volunteers by skill' });
  }
});

// Get volunteers by location
router.get('/location/:location', async (req, res) => {
  try {
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    const location = req.params.location;
    const limit = parseInt(req.query.limit) || 50;

    const params = {
      UserPoolId: userPoolId,
      Filter: `custom:location = "${location}"`,
      Limit: limit
    };

    if (req.query.token) {
      params.PaginationToken = req.query.token;
    }

    const command = new ListUsersCommand(params);
    const response = await cognito.send(command);

    const volunteers = response.Users.map(formatVolunteerData);

    res.json({
      volunteers,
      nextToken: response.PaginationToken
    });
  } catch (error) {
    console.error(`Error getting volunteers in location ${req.params.location}:`, error);
    res.status(500).json({ error: error.message || 'Failed to get volunteers by location' });
  }
});

// Get volunteers overview statistics
router.get('/stats', async (req, res) => {
  try {
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    // Fetch all volunteers (with pagination if needed)
    let allVolunteers = [];
    let paginationToken = null;

    do {
      const params = {
        UserPoolId: userPoolId,
        Limit: 60 // Maximum allowed by Cognito
      };

      if (paginationToken) {
        params.PaginationToken = paginationToken;
      }

      const command = new ListUsersCommand(params);
      const response = await cognito.send(command);

      allVolunteers = allVolunteers.concat(response.Users.map(formatVolunteerData));
      paginationToken = response.PaginationToken;

    } while (paginationToken);

    // Calculate overview statistics
    const overview = {
      totalVolunteers: allVolunteers.length,
      activeVolunteers: allVolunteers.filter(v => v.enabled).length,

      // Group by skills
      skillsDistribution: calculateSkillsDistribution(allVolunteers),

      // Group by location
      locationDistribution: calculateLocationDistribution(allVolunteers),

      // Calculate availability metrics
      availabilityMetrics: calculateAvailabilityMetrics(allVolunteers),

      // Recently joined (last 30 days)
      recentlyJoined: allVolunteers.filter(v => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(v.created) >= thirtyDaysAgo;
      }).length
    };

    res.json(overview);
  } catch (error) {
    console.error('Error generating volunteers overview:', error);
    res.status(500).json({ error: error.message || 'Failed to generate overview' });
  }
});

// Get a specific volunteer by username
router.get('/:username', async (req, res) => {
  try {
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    const params = {
      UserPoolId: userPoolId,
      Username: req.params.username
    };

    const command = new AdminGetUserCommand(params);
    const response = await cognito.send(command);
    const volunteer = formatVolunteerData(response);

    res.json(volunteer);
  } catch (error) {
    console.error(`Error getting volunteer ${req.params.username}:`, error);

    if (error.name === 'UserNotFoundException') {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    res.status(500).json({ error: error.message || 'Failed to get volunteer' });
  }
});

export default router;