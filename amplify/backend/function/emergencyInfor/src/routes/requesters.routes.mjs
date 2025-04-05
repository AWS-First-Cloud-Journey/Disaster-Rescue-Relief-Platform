import express from 'express';
import { dynamoService } from '../services/dynamodb.service.mjs';
import { mapRequestToDynamoSchema, mapDynamoToFrontendSchema } from '../utils/requestMapper.mjs';
import { historyService } from '../services/history.service.mjs';
import statsService from '../services/stats.service.mjs';

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
router.put('/', async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: 'Missing request body' });
    }

    // Map frontend data to DynamoDB schema
    const dynamoItem = mapRequestToDynamoSchema(req.body);
    console.log('Putting item:', JSON.stringify(dynamoItem));

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

// UPDATE requester information
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get the current request to know its old status
    const currentItem = await dynamoService.getItemById(id);
    if (!currentItem) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Update the item in DynamoDB
    const updatedItem = await dynamoService.updateItem(id, updateData);

    // Map the response to frontend schema
    const updatedRequest = mapDynamoToFrontendSchema(updatedItem);

    const oldStatus = currentItem.status || 'PENDING';
    const newStatus = updateData.status || oldStatus;

    // If status has changed, record it in history
    if (oldStatus !== newStatus) {
      console.log(`Status changed from ${oldStatus} to ${newStatus} for request ${id}`);

      // Determine action type
      let actionType;
      if (oldStatus === 'PENDING' && newStatus === 'IN_PROGRESS') {
        actionType = 'CLAIM';
      } else if (newStatus === 'DONE') {
        actionType = 'COMPLETE';
      } else if (oldStatus === 'DONE' && newStatus !== 'DONE') {
        actionType = 'REOPEN';
      } else {
        actionType = 'STATUS_CHANGE';
      }

      // Get user info from the request if available
      const userId = req.user?.sub || 'system';

      await historyService.recordStatusChange(
        id,
        oldStatus,
        newStatus,
        userId,
        actionType,
        {
          request_name: currentItem.req_name,
          request_address: currentItem.req_address,
          volunteerId: updateData.assignedUser || currentItem.assignedUser, // Store assigned volunteer ID
          comments: updateData.comments
        }
      );
    }

    // Return response immediately
    return res.json({
      success: true,
      data: updatedRequest
    });
  } catch (err) {
    console.error('Error updating request:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;