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