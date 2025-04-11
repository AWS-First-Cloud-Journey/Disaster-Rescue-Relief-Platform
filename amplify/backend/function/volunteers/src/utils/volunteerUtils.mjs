import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

/**
 * Generates a secure temporary password for new user accounts
 * @returns {string} A 12-character temporary password
 */
export function generateTemporaryPassword() {
  // Generate a secure random password - in production, use a more robust method
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';

  // Generate a 12-character password
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

/**
 * Format Cognito user data into a cleaner volunteer object
 * @param {Object} user - Cognito user object
 * @returns {Object} Formatted volunteer data
 */
export function formatVolunteerData(user) {
  // Extract attributes into a cleaner object
  const attributes = {};
  const userAttributes = user.Attributes || user.UserAttributes || [];

  userAttributes.forEach(attr => {
    // Remove the 'custom:' prefix from custom attributes for cleaner output
    const name = attr.Name.replace('custom:', '');
    attributes[name] = attr.Value;
  });

  return {
    username: user.Username,
    status: user.UserStatus,
    enabled: user.Enabled,
    created: user.UserCreateDate,
    lastModified: user.UserLastModifiedDate,
    email: attributes.email,
    name: attributes.name || `${attributes.given_name || ''} ${attributes.family_name || ''}`.trim(),
    phone: attributes.phone_number,
    skills: attributes.skills ? attributes.skills.split(',') : [],
    availability: attributes.availability,
    location: attributes.location,
    // Include other relevant attributes
    attributes: Object.keys(attributes)
      .filter(key => !['email', 'phone_number', 'given_name', 'family_name', 'name'].includes(key))
      .reduce((obj, key) => {
        obj[key] = attributes[key];
        return obj;
      }, {})
  };
}

// Helper function to calculate skills distribution
export function calculateSkillsDistribution(volunteers) {
  const skillsMap = {};

  volunteers.forEach(volunteer => {
    if (volunteer.skills && volunteer.skills.length > 0) {
      volunteer.skills.forEach(skill => {
        if (!skillsMap[skill]) {
          skillsMap[skill] = 0;
        }
        skillsMap[skill]++;
      });
    }
  });

  // Convert to array sorted by count (descending)
  const skillsArray = Object.entries(skillsMap).map(([skill, count]) => ({
    skill,
    count,
    percentage: Math.round((count / volunteers.length) * 100)
  }));

  return skillsArray.sort((a, b) => b.count - a.count);
}

// Helper function to calculate location distribution
export function calculateLocationDistribution(volunteers) {
  const locationMap = {};

  volunteers.forEach(volunteer => {
    if (volunteer.location) {
      if (!locationMap[volunteer.location]) {
        locationMap[volunteer.location] = 0;
      }
      locationMap[volunteer.location]++;
    }
  });

  // Convert to array sorted by count (descending)
  const locationArray = Object.entries(locationMap).map(([location, count]) => ({
    location,
    count,
    percentage: Math.round((count / volunteers.length) * 100)
  }));

  return locationArray.sort((a, b) => b.count - a.count);
}

// Helper function to calculate availability metrics
export function calculateAvailabilityMetrics(volunteers) {
  // Assuming availability is stored as JSON string or object with properties
  // like weekdays, weekends, etc.
  const metrics = {
    weekdaysAvailable: 0,
    weekendsAvailable: 0,
    eveningsAvailable: 0,
    fullTimeAvailable: 0
  };

  volunteers.forEach(volunteer => {
    if (volunteer.availability) {
      let availability;

      // Parse if it's a JSON string
      if (typeof volunteer.availability === 'string') {
        try {
          availability = JSON.parse(volunteer.availability);
        } catch (e) {
          // If not valid JSON, treat as simple string
          availability = { value: volunteer.availability };
        }
      } else {
        availability = volunteer.availability;
      }

      // Count different availability types
      if (availability.weekdays) metrics.weekdaysAvailable++;
      if (availability.weekends) metrics.weekendsAvailable++;
      if (availability.evenings) metrics.eveningsAvailable++;
      if (availability.fullTime) metrics.fullTimeAvailable++;
    }
  });

  return metrics;
}

/**
 * Checks if a user is an admin and removes them from the volunteers table if they are
 * @param {string} userId - The Cognito user ID to check
 * @param {string} userPoolId - Cognito User Pool ID
 * @param {string} tableName - DynamoDB volunteers table name
 * @param {Object} cognito - Initialized Cognito client  
 * @param {Object} documentClient - Initialized DynamoDB Document client
 * @returns {Promise<Object>} - Result object with operation details
 */
export async function removeIfAdmin(userId, userPoolId, tableName, cognito, documentClient) {
  try {
    // First check if the user is an admin in Cognito
    const isAdmin = await checkIfUserIsAdmin(userId, userPoolId, cognito);

    // If not an admin, no need to proceed
    if (!isAdmin) {
      return {
        isAdmin: false,
        message: 'User is not an admin, no removal needed'
      };
    }

    // User is an admin, remove from volunteers table if present
    const result = await removeFromVolunteersTable(userId, tableName, documentClient);

    return {
      isAdmin: true,
      removed: result.removed,
      message: result.message
    };
  } catch (error) {
    console.error('Error in removeIfAdmin:', error);
    throw new Error(`Failed to process admin check and removal: ${error.message}`);
  }
}

/**
 * Checks if a user has admin role in Cognito
 * @param {string} userId - User ID to check
 * @param {string} userPoolId - Cognito User Pool ID
 * @param {Object} cognito - Initialized Cognito client
 * @returns {Promise<boolean>} - True if user is an admin
 */
export async function checkIfUserIsAdmin(userId, userPoolId, cognito) {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: userId
    });

    const response = await cognito.send(command);

    // Check for admin role in user attributes
    const customRoleAttr = response.UserAttributes.find(
      attr => attr.Name === 'custom:role'
    );

    return Boolean(customRoleAttr && customRoleAttr.Value === 'admin');
  } catch (error) {
    console.error(`Error checking if user ${userId} is admin:`, error);
    return false; // Assume not admin on error
  }
}

/**
 * Removes a user from the volunteers table
 * @param {string} userId - User ID to remove
 * @param {string} tableName - DynamoDB volunteers table name
 * @param {Object} documentClient - Initialized DynamoDB Document client
 * @returns {Promise<Object>} - Result of the removal operation
 */
async function removeFromVolunteersTable(userId, tableName, documentClient) {
  try {
    // Find the volunteer record(s)
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });

    const { Items } = await documentClient.send(scanCommand);

    if (!Items || Items.length === 0) {
      return {
        removed: false,
        message: `Admin user ${userId} not found in volunteers table`
      };
    }

    // Delete each matching record (normally should be just one)
    const results = [];

    for (const item of Items) {
      const deleteCommand = new DeleteCommand({
        TableName: tableName,
        Key: {
          id: item.id,
          email: item.email
        }
      });

      await documentClient.send(deleteCommand);
      results.push(`Deleted record with email: ${item.email}`);
    }

    return {
      removed: true,
      recordsRemoved: Items.length,
      message: `Admin user ${userId} successfully removed from volunteers table`,
      details: results
    };
  } catch (error) {
    console.error(`Error removing user ${userId} from volunteers table:`, error);
    return {
      removed: false,
      message: `Failed to remove admin from volunteers table: ${error.message}`
    };
  }
}