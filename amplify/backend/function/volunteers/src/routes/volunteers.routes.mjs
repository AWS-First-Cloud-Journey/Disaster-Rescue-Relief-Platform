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
  calculateAvailabilityMetrics,
  removeIfAdmin,
  checkIfUserIsAdmin
} from '../utils/volunteerUtils.mjs';
import { historyService } from '../services/history.service.mjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize Cognito client with region
const cognito = new CognitoIdentityProvider({
  region: process.env.REGION || 'us-east-1'
});
const ddbClient = new DynamoDBClient({ region: process.env.REGION || 'us-east-1' });
const documentClient = DynamoDBDocumentClient.from(ddbClient);

const tableName = process.env.VOLUNTEERS_TABLE_NAME;
if (!tableName) {
  console.error('tableName environment variable not set');
}

const router = express.Router();

// Get all volunteers with optional pagination (admin only)
router.get('/', async (req, res) => {
  try {
    // Check environment variables
    if (!tableName) {
      return res.status(500).json({ error: 'VOLUNTEERS_TABLE_NAME environment variable not set' });
    }

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    // Extract user identity from Cognito Identity Pool ID
    const authProvider = req.apiGateway?.event?.requestContext?.identity?.cognitoAuthenticationProvider;

    let userId;
    if (authProvider) {
      const parts = authProvider.split(':');
      userId = parts[parts.length - 1];
    }

    if (!userId) {
      console.error('Missing identity information in request context:',
        JSON.stringify(req.apiGateway?.event?.requestContext?.identity || {}, null, 2));
      return res.status(401).json({ error: 'User identity not found in request' });
    }

    // Check if user has admin role by querying Cognito
    try {
      const params = {
        UserPoolId: userPoolId,
        Username: userId
      };

      const command = new AdminGetUserCommand(params);
      const response = await cognito.send(command);

      // Check for admin role in user attributes
      // This could be a custom attribute or group membership
      const customRoleAttr = response.UserAttributes.find(
        attr => attr.Name === 'custom:role'
      );

      const isAdmin = customRoleAttr && customRoleAttr.Value === 'admin';

      if (!isAdmin) {
        return res.status(403).json({
          error: 'Access denied. Admin privileges required.'
        });
      }
    } catch (error) {
      console.error('Error verifying admin status:', error);
      return res.status(401).json({ error: 'Could not verify admin status' });
    }

    // User is confirmed as admin, proceed with fetching volunteer data

    // Parse pagination parameters
    const limit = parseInt(req.query.limit) || 50;
    const params = {
      TableName: tableName,
      Limit: limit
    };

    // Add LastEvaluatedKey for pagination if provided
    if (req.query.nextToken) {
      try {
        params.ExclusiveStartKey = JSON.parse(
          Buffer.from(req.query.nextToken, 'base64').toString()
        );
      } catch (err) {
        return res.status(400).json({ error: 'Invalid pagination token' });
      }
    }

    // Execute scan operation
    const command = new ScanCommand(params);
    const result = await documentClient.send(command);

    // Format the response
    let nextToken = null;
    if (result.LastEvaluatedKey) {
      nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    res.json({
      volunteers: result.Items || [],
      nextToken: nextToken,
      count: result.Count,
      scannedCount: result.ScannedCount,
      adminId: userId // Include who made the request for audit logs
    });
  } catch (error) {
    console.error('Error in volunteer list access:', error);
    res.status(500).json({ error: error.message || 'Failed to list volunteers' });
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

// Get all verified volunteers (admin only)
router.get('/verified', async (req, res) => {
  try {
    // Verify environment variable is set
    if (!tableName) {
      return res.status(500).json({ error: 'VOLUNTEERS_TABLE_NAME environment variable not set' });
    }

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    // Extract user identity from Cognito Identity Pool ID
    const authProvider = req.apiGateway?.event?.requestContext?.identity?.cognitoAuthenticationProvider;

    let userId;
    if (authProvider) {
      const parts = authProvider.split(':');
      userId = parts[parts.length - 1];
    }

    if (!userId) {
      console.error('Missing identity information in request context:',
        JSON.stringify(req.apiGateway?.event?.requestContext?.identity || {}, null, 2));
      return res.status(401).json({ error: 'User identity not found in request' });
    }

    // Use utility function to check if user is admin
    const isAdmin = await checkIfUserIsAdmin(userId, userPoolId, cognito);
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
    }

    // Process any newly assigned admin roles by removing them from volunteers table
    await removeIfAdmin(userId, userPoolId, tableName, cognito, documentClient);

    // Parse pagination parameters
    const limit = parseInt(req.query.limit) || 50;
    const params = {
      TableName: tableName,
      FilterExpression: 'is_verified = :verificationStatus',
      ExpressionAttributeValues: {
        ':verificationStatus': true
      },
      Limit: limit
    };

    // Add LastEvaluatedKey for pagination if provided
    if (req.query.nextToken) {
      try {
        // The nextToken is passed as a base64 encoded string to avoid JSON parsing issues
        params.ExclusiveStartKey = JSON.parse(Buffer.from(req.query.nextToken, 'base64').toString());
      } catch (err) {
        return res.status(400).json({ error: 'Invalid pagination token' });
      }
    }

    // Execute scan operation
    const command = new ScanCommand(params);
    const result = await documentClient.send(command);

    // Format the response
    let nextToken = null;
    if (result.LastEvaluatedKey) {
      // Encode the LastEvaluatedKey to make it URL-friendly
      nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    res.json({
      verifiedVolunteers: result.Items || [],
      nextToken: nextToken,
      count: result.Count,
      scannedCount: result.ScannedCount,
      adminId: userId // Include who made the request for audit logs
    });
  } catch (error) {
    console.error('Error listing verified volunteers:', error);
    res.status(500).json({ error: error.message || 'Failed to list verified volunteers' });
  }
});

// Get all unverified volunteers (admin only)
router.get('/unverified', async (req, res) => {
  try {
    // Verify environment variable is set
    if (!tableName) {
      return res.status(500).json({ error: 'VOLUNTEERS_TABLE_NAME environment variable not set' });
    }

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    // Extract user identity from Cognito Identity Pool ID
    const authProvider = req.apiGateway?.event?.requestContext?.identity?.cognitoAuthenticationProvider;

    let userId;
    if (authProvider) {
      const parts = authProvider.split(':');
      userId = parts[parts.length - 1];
    }

    if (!userId) {
      console.error('Missing identity information in request context:',
        JSON.stringify(req.apiGateway?.event?.requestContext?.identity || {}, null, 2));
      return res.status(401).json({ error: 'User identity not found in request' });
    }

    // Use utility function to check if user is admin
    const isAdmin = await checkIfUserIsAdmin(userId, userPoolId, cognito);
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
    }

    // Process any newly assigned admin roles by removing them from volunteers table
    await removeIfAdmin(userId, userPoolId, tableName, cognito, documentClient);

    // Parse pagination parameters
    const limit = parseInt(req.query.limit) || 50;
    const params = {
      TableName: tableName,
      FilterExpression: 'is_verified = :verificationStatus OR attribute_not_exists(is_verified)',
      ExpressionAttributeValues: {
        ':verificationStatus': false
      },
      Limit: limit
    };

    // Add LastEvaluatedKey for pagination if provided
    if (req.query.nextToken) {
      try {
        // The nextToken is passed as a base64 encoded string to avoid JSON parsing issues
        params.ExclusiveStartKey = JSON.parse(Buffer.from(req.query.nextToken, 'base64').toString());
      } catch (err) {
        return res.status(400).json({ error: 'Invalid pagination token' });
      }
    }

    // Execute scan operation
    const command = new ScanCommand(params);
    const result = await documentClient.send(command);

    // Format the response
    let nextToken = null;
    if (result.LastEvaluatedKey) {
      // Encode the LastEvaluatedKey to make it URL-friendly
      nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    res.json({
      unverifiedVolunteers: result.Items || [],
      nextToken: nextToken,
      count: result.Count,
      scannedCount: result.ScannedCount,
      adminId: userId // Include who made the request for audit logs
    });
  } catch (error) {
    console.error('Error listing unverified volunteers:', error);
    res.status(500).json({ error: error.message || 'Failed to list unverified volunteers' });
  }
});

// Get a specific volunteer by id (admin only)
router.get('/:id', async (req, res) => {
  try {
    // Verify environment variable is set
    if (!tableName) {
      return res.status(500).json({ error: 'VOLUNTEERS_TABLE_NAME environment variable not set' });
    }

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    // Extract user identity from Cognito Identity Pool ID
    const authProvider = req.apiGateway?.event?.requestContext?.identity?.cognitoAuthenticationProvider;

    let userId;
    if (authProvider) {
      const parts = authProvider.split(':');
      userId = parts[parts.length - 1];
    }

    if (!userId) {
      console.error('Missing identity information in request context:',
        JSON.stringify(req.apiGateway?.event?.requestContext?.identity || {}, null, 2));
      return res.status(401).json({ error: 'User identity not found in request' });
    }

    // Check if user has admin role by querying Cognito
    try {
      const params = {
        UserPoolId: userPoolId,
        Username: userId
      };

      const command = new AdminGetUserCommand(params);
      const response = await cognito.send(command);

      // Check for admin role in user attributes
      const customRoleAttr = response.UserAttributes.find(
        attr => attr.Name === 'custom:role'
      );

      const isAdmin = customRoleAttr && customRoleAttr.Value === 'admin';

      if (!isAdmin) {
        return res.status(403).json({
          error: 'Access denied. Admin privileges required.'
        });
      }
    } catch (error) {
      console.error('Error verifying admin status:', error);
      return res.status(401).json({ error: 'Could not verify admin status' });
    }

    // Admin is confirmed, proceed with retrieving volunteer data

    const volunteerId = req.params.id;
    if (!volunteerId) {
      return res.status(400).json({ error: 'Volunteer ID is required' });
    }

    // Find volunteer in DynamoDB using scan with filter
    // Note: For production with large datasets, consider adding a GSI on the id field
    const scanParams = {
      TableName: tableName,
      FilterExpression: 'id = :idValue',
      ExpressionAttributeValues: {
        ':idValue': volunteerId
      },
      Limit: 1 // We only need the first match
    };

    const scanCommand = new ScanCommand(scanParams);
    const scanResult = await documentClient.send(scanCommand);

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Return the volunteer data
    const volunteer = scanResult.Items[0];

    res.json({
      volunteer: volunteer,
      adminId: userId // Include who made the request for audit logs
    });
  } catch (error) {
    console.error(`Error getting volunteer ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Failed to get volunteer' });
  }
});

// Verify a volunteer (admin only) using PATCH
router.patch('/:id/verify', async (req, res) => {
  try {
    // Check environment variables
    if (!tableName) {
      return res.status(500).json({ error: 'VOLUNTEERS_TABLE_NAME environment variable not set' });
    }

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({ error: 'USER_POOL_ID environment variable not set' });
    }

    // Extract user identity from Cognito Identity Pool ID
    const authProvider = req.apiGateway?.event?.requestContext?.identity?.cognitoAuthenticationProvider;

    let adminId;
    if (authProvider) {
      const parts = authProvider.split(':');
      adminId = parts[parts.length - 1];
    }

    if (!adminId) {
      console.error('Missing identity information in request context:',
        JSON.stringify(req.apiGateway?.event?.requestContext?.identity || {}, null, 2));
      return res.status(401).json({ error: 'User identity not found in request' });
    }

    // Check if user has admin role by querying Cognito
    try {
      const params = {
        UserPoolId: userPoolId,
        Username: adminId
      };

      const command = new AdminGetUserCommand(params);
      const response = await cognito.send(command);

      // Check for admin role in user attributes
      const customRoleAttr = response.UserAttributes.find(
        attr => attr.Name === 'custom:role'
      );

      const isAdmin = customRoleAttr && customRoleAttr.Value === 'admin';

      if (!isAdmin) {
        return res.status(403).json({
          error: 'Access denied. Admin privileges required.'
        });
      }
    } catch (error) {
      console.error('Error verifying admin status:', error);
      return res.status(401).json({ error: 'Could not verify admin status' });
    }

    // Admin is confirmed, proceed with verification

    // Get volunteer information
    const volunteerId = req.params.id;

    console.log(`Verifying volunteer with ID: ${volunteerId}`);

    // Find volunteer in DynamoDB
    // Note: For production with large datasets, consider adding a GSI on the id field
    const scanParams = {
      TableName: tableName,
      FilterExpression: 'id = :idValue',
      ExpressionAttributeValues: {
        ':idValue': volunteerId
      },
      Limit: 1 // We only need the first match
    };

    const scanCommand = new ScanCommand(scanParams);
    const scanResult = await documentClient.send(scanCommand);

    console.log(`Scan result for volunteer ${volunteerId}:`, scanResult);

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    const volunteer = scanResult.Items[0];

    // Check if already verified
    if (volunteer.is_verified) {
      return res.status(400).json({ error: 'Volunteer is already verified' });
    }

    // Update the verification status
    const updateParams = {
      TableName: tableName,
      Key: {
        id: volunteer.id,
        email: volunteer.email
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
    console.log(`Volunteer ${volunteerId} verified by admin ${adminId}`);

    // Record this action in the volunteer's history
    const timestamp = new Date().toISOString();
    const historyKey = `verification_${timestamp}`;

    const historyUpdateParams = {
      TableName: tableName,
      Key: {
        id: volunteer.id,
        email: volunteer.email
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
    console.error(`Error verifying volunteer ${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Failed to verify volunteer' });
  }
});

export default router;