/**
 * Maps frontend form data to DynamoDB schema according to EmergencyInfor table schema
 * @param {Object} frontendData - Data from the frontend form
 * @returns {Object} - Data formatted for DynamoDB schema
 * @throws {Error} - If required fields are missing
 */
export const mapRequestToDynamoSchema = (frontendData) => {
  // Validate required fields according to schema
  const requiredFields = [
    { key: 'name', dbField: 'req_full_name' },
    { key: 'phoneNumber', dbField: 'req_phone_number' },
    { key: 'address', dbField: 'req_address' },
    { key: 'personCount', dbField: 'req_affected_individuals' }
  ];

  const missingFields = requiredFields.filter(field => !frontendData[field.key]);
  if (missingFields.length > 0) {
    const missingFieldNames = missingFields.map(f => f.dbField).join(', ');
    throw new Error(`Missing required fields: ${missingFieldNames}`);
  }

  // Generate unique ID if not provided
  const id = frontendData.id || `req-${Date.now()}`;

  // Determine request types based on quantities
  // Using the exact enum values from schema: MEDICAL_SUPPLIES, SLEEPING_BAGS, WATER, FOOD, SHELTER, BODY_BAGS
  const requestTypes = [];
  if (parseInt(frontendData.supply) > 0)
    requestTypes.push('MEDICAL_SUPPLIES');
  if (parseInt(frontendData.bag) > 0)
    requestTypes.push('SLEEPING_BAGS');
  if (parseInt(frontendData.water) > 0)
    requestTypes.push('WATER');
  if (parseInt(frontendData.food) > 0)
    requestTypes.push('FOOD');
  if (parseInt(frontendData.shelter) > 0)
    requestTypes.push('SHELTER');
  if (parseInt(frontendData.bodyBag) > 0)
    requestTypes.push('BODY_BAGS');

  // Ensure status is one of the allowed values
  let status = frontendData.status || 'PENDING';
  if (!['PENDING', 'IN_PROGRESS', 'DONE'].includes(status)) {
    status = 'PENDING'; // Default to PENDING if invalid status
  }

  // Map to DynamoDB schema - include all fields from the schema
  return {
    id: id,
    req_full_name: frontendData.name,
    req_phone_number: parseInt(frontendData.phoneNumber) || 0,
    req_address: frontendData.address,
    req_affected_individuals: parseInt(frontendData.personCount) || 0,
    req_location_link: frontendData.mapLink || '',
    // If multiple types, use the first one as primary
    req_type: requestTypes.length > 0 ? requestTypes[0] : null,
    // Store as a proper array for the list type in schema
    req_all_types: requestTypes,
    medical_supplies_quantity: parseInt(frontendData.supply) || 0,
    sleeping_bags_quantity: parseInt(frontendData.bag) || 0,
    water_liters: parseInt(frontendData.water) || 0,
    food_meals_quantity: parseInt(frontendData.food) || 0,
    shelter_people_quantity: parseInt(frontendData.shelter) || 0,
    body_bags_quantity: parseInt(frontendData.bodyBag) || 0,
    image_key: frontendData.imageKey || null,
    created_at: frontendData.createdAt || new Date().toISOString(),
    status: status,
    // Use assigned_user to match schema exactly (snake_case)
    assigned_user: frontendData.assignedUser || null,

    // Optional fields not in the core schema but might be used
    updated_at: frontendData.updatedAt || null,
    updated_by: frontendData.updatedBy || null,
    completed_at: frontendData.completedAt || null,
    completed_by: frontendData.completedBy || null
  };
};

/**
 * Maps DynamoDB data back to frontend format
 * @param {Object} dynamoData - Data from DynamoDB
 * @returns {Object} - Data formatted for frontend
 */
export const mapDynamoToFrontendSchema = (dynamoData) => {
  // Check if dynamoData exists
  if (!dynamoData) return null;

  return {
    id: dynamoData.id,
    name: dynamoData.req_full_name,
    phoneNumber: dynamoData.req_phone_number,
    address: dynamoData.req_address,
    mapLink: dynamoData.req_location_link,
    personCount: dynamoData.req_affected_individuals,
    supply: dynamoData.medical_supplies_quantity || 0,
    bag: dynamoData.sleeping_bags_quantity || 0,
    water: dynamoData.water_liters || 0,
    food: dynamoData.food_meals_quantity || 0,
    shelter: dynamoData.shelter_people_quantity || 0,
    bodyBag: dynamoData.body_bags_quantity || 0,
    // Handle both array and string formats for backward compatibility
    requestTypes: Array.isArray(dynamoData.req_all_types)
      ? dynamoData.req_all_types
      : (dynamoData.req_all_types?.split(',') || []),
    // Include the primary type separately
    requestType: dynamoData.req_type || '',
    status: dynamoData.status || 'PENDING',
    createdAt: dynamoData.created_at,
    // Map DB fields to frontend (camelCase)
    imageKey: dynamoData.image_key,
    assignedUser: dynamoData.assigned_user,

    // Include additional metadata fields
    updatedAt: dynamoData.updated_at || null,
    updatedBy: dynamoData.updated_by || null,
    completedAt: dynamoData.completed_at || null,
    completedBy: dynamoData.completed_by || null,

    // Include city and township if they exist
    city: dynamoData.req_city || '',
    township: dynamoData.req_township || ''
  };
};

/**
 * Validates that a request update matches the schema requirements
 * @param {Object} updateData - The fields to update
 * @returns {Object} - Validated update data 
 */
export const validateUpdateData = (updateData) => {
  const validatedData = { ...updateData };

  // Validate status if present
  if (updateData.status && !['PENDING', 'IN_PROGRESS', 'DONE'].includes(updateData.status)) {
    throw new Error('Invalid status value. Must be PENDING, IN_PROGRESS, or DONE');
  }

  // Convert assignedUser to assigned_user
  if (updateData.assignedUser !== undefined) {
    validatedData.assigned_user = updateData.assignedUser;
    delete validatedData.assignedUser;
  }

  // Ensure number fields are properly parsed
  const numberFields = [
    'req_phone_number',
    'req_affected_individuals',
    'medical_supplies_quantity',
    'sleeping_bags_quantity',
    'water_liters',
    'food_meals_quantity',
    'shelter_people_quantity',
    'body_bags_quantity'
  ];

  numberFields.forEach(field => {
    if (validatedData[field] !== undefined) {
      validatedData[field] = parseInt(validatedData[field]) || 0;
    }
  });

  return validatedData;
};