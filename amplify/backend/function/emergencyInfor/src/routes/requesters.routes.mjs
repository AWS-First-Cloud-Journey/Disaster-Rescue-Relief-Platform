import express from 'express';
import { dynamoService } from '../services/dynamodb.service.mjs';
import { mapRequestToDynamoSchema, mapDynamoToFrontendSchema, validateUpdateData } from '../utils/requestMapper.mjs';
import { historyService } from '../services/history.service.mjs';
import statsService from '../services/stats.service.mjs';
import { CognitoIdentityProvider, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const router = express.Router();

// GET all requesters information
router.get('/', async (req, res) => {
  try {
    const items = await dynamoService.getAllItems();
    // Optionally map back to frontend format
    const mappedItems = items.map(item => mapDynamoToFrontendSchema(item));
    res.json({ success: true, data: mappedItems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.name, message: 'Could not load items' });
  }
});

router.get('/count', async (req, res) => {
  try {
    const items = await dynamoService.getAllItems();

    // Initialize stats object with default values
    const stats = {
      totalRequests: items.length,
      byStatus: {},
      byType: {},
      totalAffectedIndividuals: 0,
      totalSupplies: {
        medicalSupplies: 0,
        sleepingBags: 0,
        waterLiters: 0,
        foodMeals: 0,
        shelterCapacity: 0,
        bodyBags: 0
      }
    };

    // Calculate statistics in a single pass through the data
    items.forEach(item => {
      // Count by status (with default to UNKNOWN)
      const status = item.status || 'UNKNOWN';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by request type - handle both array and string formats
      if (item.req_all_types) {
        // Handle both array and legacy string format
        const types = Array.isArray(item.req_all_types)
          ? item.req_all_types
          : (typeof item.req_all_types === 'string' ? item.req_all_types.split(',') : []);

        types.forEach(type => {
          if (type && type.trim()) { // Ensure the type is not empty
            stats.byType[type] = (stats.byType[type] || 0) + 1;
          }
        });
      }

      // Sum affected individuals (safely parse integer)
      stats.totalAffectedIndividuals += parseInt(item.req_affected_individuals || 0, 10) || 0;

      // Sum supplies (safely parse integers)
      stats.totalSupplies.medicalSupplies += parseInt(item.medical_supplies_quantity || 0, 10) || 0;
      stats.totalSupplies.sleepingBags += parseInt(item.sleeping_bags_quantity || 0, 10) || 0;
      stats.totalSupplies.waterLiters += parseInt(item.water_liters || 0, 10) || 0;
      stats.totalSupplies.foodMeals += parseInt(item.food_meals_quantity || 0, 10) || 0;
      stats.totalSupplies.shelterCapacity += parseInt(item.shelter_people_quantity || 0, 10) || 0;
      stats.totalSupplies.bodyBags += parseInt(item.body_bags_quantity || 0, 10) || 0;
    });

    // Add some additional derived metrics
    stats.completionRate = items.length > 0
      ? parseFloat((stats.byStatus.DONE || 0) / items.length * 100).toFixed(1)
      : 0;

    stats.inProgressRate = items.length > 0
      ? parseFloat((stats.byStatus.IN_PROGRESS || 0) / items.length * 100).toFixed(1)
      : 0;

    // Return stats
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error getting request statistics:', err);
    res.status(500).json({
      success: false,
      error: err.name || 'UnknownError',
      message: err.message || 'Could not retrieve request statistics'
    });
  }
});

// GET request statistics with date range filter
router.get('/count-by-date', async (req, res) => {
  try {
    // Get start and end dates from query parameters
    const { startDate, endDate } = req.query;

    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Both startDate and endDate parameters are required (format: MM/DD/YYYY)'
      });
    }

    // Parse date strings to Date objects
    const startDateTime = new Date(startDate);
    let endDateTime = new Date(endDate);

    // Set end date to end of day (23:59:59.999)
    endDateTime.setHours(23, 59, 59, 999);

    // Check for valid date parsing
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid date format. Use MM/DD/YYYY format.'
      });
    }

    // Calculate previous week dates (exactly 7 days earlier)
    const prevWeekStartDateTime = new Date(startDateTime);
    prevWeekStartDateTime.setDate(prevWeekStartDateTime.getDate() - 7);

    const prevWeekEndDateTime = new Date(endDateTime);
    prevWeekEndDateTime.setDate(prevWeekEndDateTime.getDate() - 7);

    // Get all items
    const allItems = await dynamoService.getAllItems();

    // Filter items for current period
    const currentPeriodItems = allItems.filter(item => {
      const itemDate = new Date(item.created_at || item.timestamp || item.createdAt);
      return !isNaN(itemDate.getTime()) && itemDate >= startDateTime && itemDate <= endDateTime;
    });

    // Filter items for previous week
    const prevWeekItems = allItems.filter(item => {
      const itemDate = new Date(item.created_at || item.timestamp || item.createdAt);
      return !isNaN(itemDate.getTime()) && itemDate >= prevWeekStartDateTime && itemDate <= prevWeekEndDateTime;
    });

    // Calculate statistics for current period
    const currentStats = statsService.calculatePeriodStats(currentPeriodItems);
    const prevWeekStats = statsService.calculatePeriodStats(prevWeekItems);

    // Get percentage changes
    const changes = statsService.calculatePercentageChanges(currentStats, prevWeekStats);

    // Get pending status analysis
    const pendingAnalysis = statsService.getPendingStatusComparison(currentStats, prevWeekStats);

    // Get a comprehensive summary
    const summary = statsService.generateComparisonSummary(currentStats, prevWeekStats);

    // Return response with comparison data
    res.json({
      success: true,
      data: currentStats,
      weekOverWeekComparison: {
        previousWeek: prevWeekStats,
        percentageChanges: changes,
        summary: summary,
        pendingStatusAnalysis: pendingAnalysis
      }
    });
  } catch (err) {
    console.error('Error getting date-filtered request statistics:', err);
    res.status(500).json({
      success: false,
      error: err.name || 'UnknownError',
      message: err.message || 'Could not retrieve date-filtered statistics'
    });
  }
});

// GET requesters information by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await dynamoService.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    // Map to frontend format
    const mappedItem = mapDynamoToFrontendSchema(item);
    res.json({ success: true, data: mappedItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.name, message: 'Could not load item' });
  }
});

// CREATE requesters information
router.post('/', async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: 'Missing request body' });
    }

    // Map frontend data to DynamoDB schema
    const dynamoItem = mapRequestToDynamoSchema(req.body);

    // Check if a request with the same phone number and address already exists
    const requestExists = await dynamoService.checkRequestExists(
      dynamoItem.req_phone_number,
      dynamoItem.req_address
    );

    if (requestExists) {
      return res.status(409).json({
        success: false,
        message: 'A request with this phone number and address already exists'
      });
    }

    const item = await dynamoService.putItem(dynamoItem);
    res.json({ success: true, message: 'Item created successfully', data: item });
  } catch (err) {
    console.error('DynamoDB error:', err);

    // Check if it's a validation error (missing required fields)
    if (err.message && err.message.includes('Missing required fields')) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: err.message
      });
    }

    res.status(500).json({ success: false, error: err.name, message: err.message || 'Could not create item' });
  }
});

// UPDATE requester information with role-based permissions
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Step 1: Extract user identity from Cognito Identity Pool ID
    const authProvider = req.apiGateway?.event?.requestContext?.identity?.cognitoAuthenticationProvider;
    if (!authProvider) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const parts = authProvider.split(':');
    const userId = parts[parts.length - 1];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User identity not found'
      });
    }

    // Step 2: Get current request to check status and permissions
    const dbItem = await dynamoService.getItemById(id);
    if (!dbItem) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Convert DB format to frontend format for consistent field access
    const currentItem = mapDynamoToFrontendSchema(dbItem);

    console.log(`Request update attempt - User: ${userId}, Request: ${id}`, {
      currentStatus: currentItem.status,
      assignedUser: currentItem.assignedUser || 'none',
      requestUpdate: updateData
    });

    // Step 3: Check user role (admin or volunteer)
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      return res.status(500).json({
        success: false,
        message: 'USER_POOL_ID environment variable not set'
      });
    }

    let isAdmin = false;
    try {
      const cognito = new CognitoIdentityProvider({
        region: process.env.REGION || 'us-east-1'
      });

      const command = new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: userId
      });

      const response = await cognito.send(command);
      const customRoleAttr = response.UserAttributes.find(
        attr => attr.Name === 'custom:role'
      );

      isAdmin = customRoleAttr && customRoleAttr.Value === 'admin';
    } catch (error) {
      console.error('Error checking user role:', error);
      return res.status(401).json({
        success: false,
        message: 'Could not verify user role'
      });
    }

    // Step 4: Apply permission rules based on request status
    let isAuthorized = false;
    let updateReason = '';

    switch (currentItem.status) {
      case 'PENDING':
        if (isAdmin) {
          // Admins can assign to any volunteer and update status
          isAuthorized = true;
          updateReason = 'admin_update_pending';
        } else {
          // Volunteers can only claim for themselves
          if (updateData.status === 'IN_PROGRESS' &&
            updateData.assignedUser === userId &&
            !currentItem.assignedUser) {
            isAuthorized = true;
            updateReason = 'volunteer_initial_claim';
          } else {
            return res.status(403).json({
              success: false,
              message: 'Volunteers can only claim unassigned PENDING requests for themselves'
            });
          }
        }
        break;

      case 'IN_PROGRESS':
        if (isAdmin) {
          // Admins can assign to any volunteer and update status
          isAuthorized = true;
          updateReason = 'admin_update_in_progress';
        } else if (currentItem.assignedUser === userId) {
          // Volunteers can only update their own requests
          if (updateData.assignedUser && updateData.assignedUser !== userId) {
            return res.status(403).json({
              success: false,
              message: 'Volunteers cannot reassign requests to other volunteers'
            });
          }

          // Check if volunteer is trying to mark as DONE
          if (updateData.status === 'DONE') {
            isAuthorized = true;
            updateReason = 'volunteer_completion';
            // Add completion metadata (using frontend field names)
            updateData.completedAt = new Date().toISOString();
            updateData.completedBy = userId;
          } else {
            isAuthorized = true;
            updateReason = 'volunteer_update_own';
          }
        } else {
          return res.status(403).json({
            success: false,
            message: 'You can only update requests assigned to you'
          });
        }
        break;

      case 'DONE':
        if (isAdmin) {
          // Only admins can update DONE requests
          isAuthorized = true;
          updateReason = 'admin_update_done';
        } else {
          return res.status(403).json({
            success: false,
            message: 'Only admins can update completed requests'
          });
        }
        break;

      default:
        // Unknown status, only allow admin updates
        if (isAdmin) {
          isAuthorized = true;
          updateReason = 'admin_update_unknown';
        } else {
          return res.status(403).json({
            success: false,
            message: 'Cannot update request with unknown status'
          });
        }
    }

    // Step 5: Perform the update if authorized
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to perform this update'
      });
    }

    // Add update metadata (using frontend field names)
    updateData.updatedAt = new Date().toISOString();
    updateData.updatedBy = userId;

    // Use the validateUpdateData function to convert to proper DynamoDB format
    // This will handle field name conversion (camelCase to snake_case)
    const dbUpdateData = validateUpdateData(updateData);

    // Perform the update with the properly formatted data
    const updatedDbItem = await dynamoService.updateItem(id, dbUpdateData);

    // Map the response back to frontend format for the API response
    const mappedItem = mapDynamoToFrontendSchema(updatedDbItem);

    // Step 6: Return success response with audit info
    return res.json({
      success: true,
      data: mappedItem,
      audit: {
        userId,
        isAdmin,
        updateReason,
        timestamp: updateData.updatedAt
      }
    });
  } catch (err) {
    console.error('Error updating request:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Could not update request'
    });
  }
});

export default router;