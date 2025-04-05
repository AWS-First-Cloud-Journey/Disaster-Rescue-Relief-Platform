/**
 * Maps frontend form data to DynamoDB schema
 * @param {Object} frontendData - Data from the frontend form
 * @returns {Object} - Data formatted for DynamoDB schema
 */
export const mapRequestToDynamoSchema = (frontendData) => {
  // Generate unique ID if not provided
  const id = frontendData.id || `req-${Date.now()}`;

  // Determine request types based on quantities
  const requestTypes = [];
  if (parseInt(frontendData.supply) > 0) requestTypes.push("MEDICAL_SUPPLIES");
  if (parseInt(frontendData.bag) > 0) requestTypes.push("SLEEPING_BAGS");
  if (parseInt(frontendData.water) > 0) requestTypes.push("WATER");
  if (parseInt(frontendData.food) > 0) requestTypes.push("FOOD");
  if (parseInt(frontendData.shelter) > 0) requestTypes.push("SHELTER");
  if (parseInt(frontendData.bodyBag) > 0) requestTypes.push("BODY_BAGS");

  // Map to DynamoDB schema
  return {
    id: id,
    req_full_name: frontendData.name || "",
    req_phone_number: parseInt(frontendData.phoneNumber) || 0,
    req_address: frontendData.address || "",
    req_location_link: frontendData.mapLink || "",
    req_affected_individuals: parseInt(frontendData.personCount) || 0,
    // If multiple types, use the first one as primary
    req_type: requestTypes.length > 0 ? requestTypes[0] : null,
    // Store as a proper array now, not a comma-separated string
    req_all_types: requestTypes,
    medical_supplies_quantity: parseInt(frontendData.supply) || 0,
    sleeping_bags_quantity: parseInt(frontendData.bag) || 0,
    water_liters: parseInt(frontendData.water) || 0,
    food_meals_quantity: parseInt(frontendData.food) || 0,
    shelter_people_quantity: parseInt(frontendData.shelter) || 0,
    body_bags_quantity: parseInt(frontendData.bodyBag) || 0,
    // Use image_key to match the schema field name
    image_key: frontendData.imageKey || null,
    // Add timestamp
    created_at: new Date().toISOString(),
    status: frontendData.status || "PENDING",
    // Add assignedUser field
    assigned_user: frontendData.assignedUser || null
  };
};

/**
 * Maps DynamoDB data back to frontend format
 * @param {Object} dynamoData - Data from DynamoDB
 * @returns {Object} - Data formatted for frontend
 */
export const mapDynamoToFrontendSchema = (dynamoData) => {
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
    status: dynamoData.status || "PENDING",
    createdAt: dynamoData.created_at,
    // Map DB fields to frontend
    imageKey: dynamoData.image_key,
    assignedUser: dynamoData.assigned_user
  };
};