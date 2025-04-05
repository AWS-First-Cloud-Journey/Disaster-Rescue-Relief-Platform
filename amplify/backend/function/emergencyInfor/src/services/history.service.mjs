import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: process.env.REGION || 'ap-southeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const HISTORY_TABLE = process.env.HISTORY_TABLE || 'requestHistory';
const REQUESTS_TABLE = process.env.REQUESTS_TABLE || 'Requests';

export const historyService = {
  /**
   * Record a status change in the request history
   * @param {string} requestId - ID of the request
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {string} changedByUserId - User ID who made the change
   * @param {string} actionType - Type of action (CLAIM, ASSIGN, COMPLETE, etc.)
   * @param {object} additionalData - Any additional data to store
   * @returns {Promise<object>} - The created history record
   */
  recordStatusChange: async (requestId, oldStatus, newStatus, changedByUserId, actionType, additionalData = {}) => {
    try {
      const timestamp = new Date().toISOString();
      const id = uuidv4();

      const historyItem = {
        id,                     // Primary key
        timestamp,              // Sort key
        request_id: requestId,  // For requestIdIndex GSI
        change_type: 'STATUS_CHANGE',
        action_type: actionType || 'STATUS_CHANGE',
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedByUserId,
        volunteer_id: additionalData.volunteerId || additionalData.assignedUser || null, // For volunteerIdIndex GSI
        ...additionalData       // Include any additional data
      };

      console.log(`Attempting to record history item: ${JSON.stringify(historyItem)}`);

      const params = {
        TableName: HISTORY_TABLE,
        Item: historyItem
      };

      await docClient.send(new PutCommand(params));
      console.log(`Successfully recorded ${actionType || 'status change'} for request ${requestId}`);

      return historyItem;
    } catch (error) {
      console.error('Error recording status change history:', error);
      throw error;
    }
  },

  /**
   * Get history for a specific volunteer
   * @param {string} volunteerId - ID/username of the volunteer
   * @returns {Promise<Array>} - Array of history records
   */
  getVolunteerHistory: async (volunteerId) => {
    try {
      console.log(`Fetching history for volunteer: ${volunteerId}`);

      const params = {
        TableName: HISTORY_TABLE,
        IndexName: 'volunteerIdIndex',
        KeyConditionExpression: 'volunteer_id = :volunteerId',
        ExpressionAttributeValues: {
          ':volunteerId': volunteerId
        },
        ScanIndexForward: false // Most recent first
      };

      const result = await docClient.send(new QueryCommand(params));
      console.log(`Found ${result.Items?.length || 0} history records for volunteer ${volunteerId}`);

      return result.Items || [];
    } catch (error) {
      console.error('Error fetching volunteer history:', error);
      throw error;
    }
  },

  /**
   * Get active requests for a volunteer
   * @param {string} volunteerId - ID/username of the volunteer
   * @returns {Promise<Array>} - Array of active request records
   */
  getVolunteerActiveRequests: async (volunteerId) => {
    try {
      // This uses a scan with filter as a fallback method
      // In production, you should create an appropriate index for this query
      const params = {
        TableName: REQUESTS_TABLE,
        FilterExpression: 'assignedUser = :volunteerId AND #status <> :doneStatus',
        ExpressionAttributeValues: {
          ':volunteerId': volunteerId,
          ':doneStatus': 'DONE'
        },
        ExpressionAttributeNames: {
          '#status': 'status'
        }
      };

      const result = await docClient.send(new ScanCommand(params));
      console.log(`Found ${result.Items?.length || 0} active requests for volunteer ${volunteerId}`);

      return result.Items || [];
    } catch (error) {
      console.error('Error fetching volunteer active requests:', error);
      throw error;
    }
  }
};