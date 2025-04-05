const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'volunteers';

/**
 * Main handler function that determines event type and delegates accordingly
 */
exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Check if this is a Cognito post-confirmation event
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    return await handleCognitoPostConfirmation(event);
  }

  // Otherwise treat as API Gateway event for CRUD operations
  try {
    const { operation, payload } = JSON.parse(event.body || '{}');

    if (!operation) {
      return buildResponse(400, { error: 'Operation is required' });
    }

    let response;
    switch (operation) {
      case 'create':
        response = await createVolunteer(payload);
        break;
      case 'read':
        response = await getVolunteer(payload);
        break;
      case 'readAll':
        response = await listVolunteers();
        break;
      case 'update':
        response = await updateVolunteer(payload);
        break;
      case 'delete':
        response = await deleteVolunteer(payload);
        break;
      default:
        return buildResponse(400, { error: 'Unsupported operation' });
    }

    return buildResponse(200, response);
  } catch (error) {
    console.error('Error processing request:', error);
    return buildResponse(500, { error: error.message });
  }
};

/**
 * Handles Cognito post-confirmation trigger events
 */
async function handleCognitoPostConfirmation(event) {
  try {
    // Save user to volunteers table
    await saveCognitoUserToVolunteers(event);

    // Important: Always return the event to allow Cognito process to complete
    return event;
  } catch (error) {
    console.error('Error in Cognito post-confirmation handler:', error);
    // Important: Don't throw errors in Cognito triggers - return the event to continue
    return event;
  }
}

/**
 * Format Cognito user data for DynamoDB volunteers table
 */
function formatCognitoData(cognitoEvent) {
  // Extract user data from Cognito event
  const {
    userName,
    request: { userAttributes }
  } = cognitoEvent;

  // Extract specific attributes with fallbacks
  const {
    email,
    phone_number,
    name,
    given_name,
    family_name,
    // Add other attributes as needed
  } = userAttributes || {};

  // Determine the best name value to use
  let fullName = name;
  if (!fullName && (given_name || family_name)) {
    fullName = `${given_name || ''} ${family_name || ''}`.trim();
  }

  // Format phone number as integer if present
  let formattedPhoneNumber = null;
  if (phone_number) {
    formattedPhoneNumber = parseInt(phone_number.replace(/\D/g, ''));
    // Handle potential NaN cases
    if (isNaN(formattedPhoneNumber)) {
      formattedPhoneNumber = null;
    }
  }

  // Create formatted volunteer data object
  const formattedData = {
    id: userName,
    email: email || '',
    phone_number: formattedPhoneNumber,
    full_name: fullName || '',
    history: {}
  };

  return formattedData;
}

/**
 * Save Cognito user to volunteers table after successful confirmation
 */
async function saveCognitoUserToVolunteers(event) {
  try {
    // Format the Cognito data
    const volunteerData = formatCognitoData(event);

    // Create DynamoDB params
    const params = {
      TableName: TABLE_NAME,
      Item: volunteerData,
      // Use conditional write to avoid overwriting existing records
      ConditionExpression: 'attribute_not_exists(id) AND attribute_not_exists(email)'
    };

    // Save to DynamoDB
    await docClient.put(params).promise();
    console.log(`Successfully created volunteer record for user: ${volunteerData.id}`);
    return true;
  } catch (error) {
    console.error('Error saving Cognito user to volunteers table:', error);
    // For post confirmation hooks, we should not throw errors
    // as that would prevent the user from being created in Cognito
    return false;
  }
}

/**
 * Create a new volunteer record
 */
async function createVolunteer(data) {
  if (!data) {
    throw new Error('Volunteer data is required');
  }

  const { id, email, phone_number, full_name } = data;

  if (!id || !email) {
    throw new Error('ID and email are required');
  }

  const item = {
    id,
    email,
    phone_number: phone_number ? parseInt(phone_number.replace(/\D/g, '')) : null,
    full_name: full_name || '',
    history: {}
  };

  const params = {
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(id) AND attribute_not_exists(email)'
  };

  await docClient.put(params).promise();
  return { message: 'Volunteer created successfully', volunteer: item };
}

/**
 * Get a single volunteer by ID and email
 */
async function getVolunteer(data) {
  if (!data) {
    throw new Error('Query data is required');
  }

  const { id, email } = data;

  if (!id || !email) {
    throw new Error('ID and email are required');
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      id,
      email
    }
  };

  const result = await docClient.get(params).promise();
  if (!result.Item) {
    throw new Error('Volunteer not found');
  }

  return result.Item;
}

/**
 * List all volunteers (use with caution for large datasets)
 */
async function listVolunteers() {
  const params = {
    TableName: TABLE_NAME
  };

  const result = await docClient.scan(params).promise();
  return result.Items;
}

/**
 * Update a volunteer's details
 */
async function updateVolunteer(data) {
  if (!data) {
    throw new Error('Update data is required');
  }

  const { id, email, ...updates } = data;

  if (!id || !email) {
    throw new Error('ID and email are required');
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No update fields provided');
  }

  let updateExpression = 'SET ';
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Build dynamic update expression
  Object.keys(updates).forEach((key, index) => {
    const prefix = index === 0 ? '' : ', ';
    const attributeName = `#${key}`;
    const attributeValue = `:${key}`;

    updateExpression += `${prefix}${attributeName} = ${attributeValue}`;
    expressionAttributeNames[attributeName] = key;

    // Special handling for phone_number
    if (key === 'phone_number' && updates[key]) {
      expressionAttributeValues[attributeValue] = parseInt(updates[key].replace(/\D/g, ''));
    } else {
      expressionAttributeValues[attributeValue] = updates[key];
    }
  });

  const params = {
    TableName: TABLE_NAME,
    Key: {
      id,
      email
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };

  const result = await docClient.update(params).promise();
  return result.Attributes;
}

/**
 * Delete a volunteer record
 */
async function deleteVolunteer(data) {
  if (!data) {
    throw new Error('Delete data is required');
  }

  const { id, email } = data;

  if (!id || !email) {
    throw new Error('ID and email are required');
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      id,
      email
    }
  };

  await docClient.delete(params).promise();
  return { message: 'Volunteer deleted successfully' };
}

/**
 * Helper function to build API Gateway response
 */
function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}