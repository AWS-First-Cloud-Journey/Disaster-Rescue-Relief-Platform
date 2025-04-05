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
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize Cognito client with region
const cognito = new CognitoIdentityProvider({
  region: process.env.REGION || 'us-east-1'
});
const ddbClient = new DynamoDBClient({ region: process.env.REGION || 'us-east-1' });
const documentClient = DynamoDBDocumentClient.from(ddbClient);

const VOLUNTEERS_TABLE_NAME = process.env.VOLUNTEERS_TABLE_NAME;
if (!VOLUNTEERS_TABLE_NAME) {
  console.error('VOLUNTEERS_TABLE_NAME environment variable not set');
}

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

// Verify a volunteer (admin only) using PATCH
router.patch('/:username/verify', async (req, res) => {
  try {
    // Verify environment variable is set
    if (!VOLUNTEERS_TABLE_NAME) {
      return res.status(500).json({ error: 'VOLUNTEERS_TABLE_NAME environment variable not set' });
    }

    // Verify admin status
    const adminId = req.headers['x-admin-id'];
    const isAdmin = req.headers['x-is-admin'] === 'true';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required for this operation' });
    }

    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID is required' });
    }

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    // Get volunteer from Cognito to verify username and email
    const username = req.params.username;
    let email;

    try {
      const params = {
        UserPoolId: userPoolId,
        Username: username
      };

      const command = new AdminGetUserCommand(params);
      const response = await cognito.send(command);

      // Get email from user attributes
      const emailAttr = response.UserAttributes.find(attr => attr.Name === 'email');
      if (!emailAttr) {
        return res.status(400).json({ error: 'Volunteer email not found' });
      }

      email = emailAttr.Value;
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        return res.status(404).json({ error: 'Volunteer not found' });
      }
      throw error;
    }

    // First, check current verification status
    const getParams = {
      TableName: VOLUNTEERS_TABLE_NAME,
      Key: {
        id: username,
        email: email
      }
    };

    const getCommand = new GetCommand(getParams);
    const currentRecord = await documentClient.send(getCommand);

    if (!currentRecord.Item) {
      return res.status(404).json({ error: 'Volunteer record not found in database' });
    }

    if (currentRecord.Item.is_verified) {
      return res.status(400).json({ error: 'Volunteer is already verified' });
    }

    // Update the verification status
    const updateParams = {
      TableName: VOLUNTEERS_TABLE_NAME,
      Key: {
        id: username,
        email: email
      },
      UpdateExpression: 'SET is_verified = :verified, is_verified_by = :admin',
      ExpressionAttributeValues: {
        ':verified': true,
        ':admin': adminId
      },
      ReturnValues: 'ALL_NEW'
    };

    const updateCommand = new UpdateCommand(updateParams);
    const result = await documentClient.send(updateCommand);

    // Log the verification
    console.log(`Volunteer ${username} verified by admin ${adminId}`);

    // Record this action in the volunteer's history
    const timestamp = new Date().toISOString();
    const historyKey = `verification_${timestamp}`;

    const historyUpdateParams = {
      TableName: VOLUNTEERS_TABLE_NAME,
      Key: {
        id: username,
        email: email
      },
      UpdateExpression: 'SET history.#historyKey = :historyValue',
      ExpressionAttributeNames: {
        '#historyKey': historyKey
      },
      ExpressionAttributeValues: {
        ':historyValue': JSON.stringify({
          action: 'verification',
          admin_id: adminId,
          timestamp: timestamp
        })
      }
    };

    const historyCommand = new UpdateCommand(historyUpdateParams);
    await documentClient.send(historyCommand);

    res.json({
      message: 'Volunteer successfully verified',
      volunteer: result.Attributes
    });
  } catch (error) {
    console.error(`Error verifying volunteer ${req.params.username}:`, error);
    res.status(500).json({ error: error.message || 'Failed to verify volunteer' });
  }
});

export default router;