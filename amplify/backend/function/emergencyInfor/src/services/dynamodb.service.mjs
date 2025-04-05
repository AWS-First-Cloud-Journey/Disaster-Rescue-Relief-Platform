import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Create DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Get table name with environment suffix
const getTableName = (baseTableName) => {
  if (process.env.ENV && process.env.ENV !== "NONE") {
    return baseTableName + "-" + process.env.ENV;
  }
  return baseTableName;
};

// Emergency information table
const emergencyTable = getTableName("EmergencyInfor");

const validateRequiredFields = (item) => {
  const requiredFields = ['req_full_name', 'req_phone_number', 'req_address', 'req_affected_individuals'];

  const missingFields = requiredFields.filter(field => {
    // Check if field is missing or empty (0 is a valid value for number fields)
    return item[field] === undefined || item[field] === null ||
      (typeof item[field] === 'string' && item[field].trim() === '');
  });

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  return true;
};

export const dynamoService = {
  getAllItems: async () => {
    try {
      const params = { TableName: emergencyTable };
      console.log('Getting all items from table:', emergencyTable);
      const data = await docClient.send(new ScanCommand(params));
      return data.Items || []; // Return empty array if no items
    } catch (error) {
      console.error('Error in getAllItems:', error);
      throw error;
    }
  },

  getItemById: async (id) => {
    const params = { TableName: emergencyTable, Key: { id } };
    const data = await docClient.send(new GetCommand(params));
    return data.Item;
  },

  putItem: async (item) => {
    // Validate required fields before putting item
    validateRequiredFields(item);

    if (!item.id) item.id = Date.now().toString();
    const params = { TableName: emergencyTable, Item: item };
    await docClient.send(new PutCommand(params));
    return item;
  },

  deleteItem: async (id) => {
    const params = { TableName: emergencyTable, Key: { id } };
    await docClient.send(new DeleteCommand(params));
    return { id };
  },

  // Fix for the updateItem function
  updateItem: async (id, updateData) => {
    console.log('Updating item:', id, 'with data:', JSON.stringify(updateData));

    // Create expression parts
    let updateExpression = 'SET';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Field mapping - important for translating frontend to DB field names
    const fieldMappings = {
      assignedUser: 'assigned_user',
      // Add other mappings as needed
    };

    // Build update expression dynamically
    Object.entries(updateData).forEach(([key, value], index) => {
      // Map frontend field name to DB field name if needed
      const dbFieldName = fieldMappings[key] || key;

      const nameKey = `#field${index}`;
      const valueKey = `:value${index}`;

      updateExpression += ` ${nameKey} = ${valueKey}${index < Object.keys(updateData).length - 1 ? ',' : ''}`;
      expressionAttributeNames[nameKey] = dbFieldName;
      expressionAttributeValues[valueKey] = value;
    });

    const params = {
      TableName: emergencyTable, // FIXED: Use emergencyTable instead of tableName
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    console.log('DynamoDB update params:', JSON.stringify(params, null, 2));

    try {
      const command = new UpdateCommand(params);
      const result = await docClient.send(command);
      console.log('Update successful, result:', JSON.stringify(result.Attributes));
      return result.Attributes;
    } catch (error) {
      console.error('Error updating item in DynamoDB:', error);
      throw error;
    }
  },

  updateItemField: async (id, fieldName, fieldValue) => {
    const params = {
      TableName: emergencyTable,
      Key: { id },
      UpdateExpression: `set ${fieldName} = :value`,
      ExpressionAttributeValues: {
        ':value': fieldValue
      },
      ReturnValues: 'ALL_NEW'
    };

    // FIXED: Use the current SDK pattern instead of .promise()
    const command = new UpdateCommand(params);
    const result = await docClient.send(command);
    return result.Attributes;
  },

  checkRequestExists: async (phoneNumber, address) => {
    if (!phoneNumber || !address) {
      return false;
    }

    try {
      const params = {
        TableName: emergencyTable, // Use the same table name variable as other functions
        FilterExpression: 'req_phone_number = :phone AND req_address = :addr',
        ExpressionAttributeValues: {
          ':phone': phoneNumber,
          ':addr': address
        }
      };

      const result = await docClient.send(new ScanCommand(params));
      return result.Items && result.Items.length > 0;
    } catch (error) {
      console.error('Error checking for existing request:', error);
      return false;
    }
  }
};