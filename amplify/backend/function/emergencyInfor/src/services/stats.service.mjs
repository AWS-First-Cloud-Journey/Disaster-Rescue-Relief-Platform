/**
 * Statistics service for calculating request metrics and comparisons
 */

/**
 * Calculate statistics for a collection of request items
 * @param {Array} items - Array of request objects to analyze
 * @returns {Object} Calculated statistics
 */
export function calculatePeriodStats(items) {
  // Initialize stats object
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

  // Calculate statistics
  items.forEach(item => {
    // Count by status (with default to UNKNOWN)
    const status = item.status || 'UNKNOWN';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // Count by request type
    if (item.req_all_types) {
      const types = Array.isArray(item.req_all_types)
        ? item.req_all_types
        : (typeof item.req_all_types === 'string' ? item.req_all_types.split(',') : []);

      types.forEach(type => {
        if (type && type.trim()) {
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

  // Add derived metrics
  stats.completionRate = items.length > 0
    ? parseFloat((stats.byStatus.DONE || 0) / items.length * 100).toFixed(1)
    : 0;

  stats.inProgressRate = items.length > 0
    ? parseFloat((stats.byStatus.IN_PROGRESS || 0) / items.length * 100).toFixed(1)
    : 0;

  return stats;
}

/**
 * Calculate percentage changes between current and previous period statistics
 * @param {Object} current - Statistics for the current period
 * @param {Object} previous - Statistics for the previous period
 * @returns {Object} Object containing percentage changes for all metrics
 */
export function calculatePercentageChanges(current, previous) {
  if (!current || !previous) {
    throw new Error('Both current and previous period stats are required');
  }

  const changes = {
    totalRequests: calculateChange(current.totalRequests, previous.totalRequests),
    byStatus: {},
    byType: {},
    totalAffectedIndividuals: calculateChange(current.totalAffectedIndividuals, previous.totalAffectedIndividuals),
    totalSupplies: {},
    completionRate: calculateChange(parseFloat(current.completionRate), parseFloat(previous.completionRate)),
    inProgressRate: calculateChange(parseFloat(current.inProgressRate), parseFloat(previous.inProgressRate))
  };

  // Calculate changes for statuses
  const allStatuses = new Set([...Object.keys(current.byStatus || {}), ...Object.keys(previous.byStatus || {})]);
  allStatuses.forEach(status => {
    changes.byStatus[status] = calculateChange(
      current.byStatus?.[status] || 0,
      previous.byStatus?.[status] || 0
    );
  });

  // Calculate changes for types
  const allTypes = new Set([...Object.keys(current.byType || {}), ...Object.keys(previous.byType || {})]);
  allTypes.forEach(type => {
    changes.byType[type] = calculateChange(
      current.byType?.[type] || 0,
      previous.byType?.[type] || 0
    );
  });

  // Calculate changes for supplies
  Object.keys(current.totalSupplies || {}).forEach(supply => {
    changes.totalSupplies[supply] = calculateChange(
      current.totalSupplies?.[supply] || 0,
      previous.totalSupplies?.[supply] || 0
    );
  });

  return changes;
}

/**
 * Calculate percentage change between two values
 * @param {number} current - Current period value
 * @param {number} previous - Previous period value
 * @returns {number} Percentage change (positive for increase, negative for decrease)
 */
export function calculateChange(current, previous) {
  // Handle edge cases
  if (previous === 0) {
    return current > 0 ? 100 : 0; // If previous was 0, show as 100% increase or 0% change
  }

  if (isNaN(current) || isNaN(previous)) {
    return 0; // Return 0 for invalid inputs
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Format a percentage value with a + or - sign
 * @param {number} value - Percentage value to format
 * @returns {string} Formatted percentage string with sign
 */
export function formatPercentage(value) {
  if (value === Infinity || value === -Infinity) {
    return value > 0 ? 'New' : 'N/A';
  }

  if (isNaN(value)) {
    return 'N/A';
  }

  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

/**
 * Find the supply with the highest percentage change
 * @param {Object} supplyChanges - Object with percentage changes for each supply
 * @returns {Object} Object with supply name and formatted percentage change
 */
function getHighestSupplyChange(supplyChanges) {
  if (!supplyChanges || Object.keys(supplyChanges).length === 0) {
    return { name: 'none', change: '0.0%' };
  }

  const supplies = Object.entries(supplyChanges)
    .map(([name, change]) => ({ name, change }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  return {
    name: supplies[0].name,
    change: formatPercentage(supplies[0].change)
  };
}

/**
 * Find the status with most improvement (highest positive change)
 * @param {Object} statusChanges - Object with percentage changes for each status
 * @returns {Object} Object with status name and formatted percentage change
 */
function getMostImprovedStatus(statusChanges) {
  if (!statusChanges || Object.keys(statusChanges).length === 0) {
    return { status: 'none', change: '0.0%' };
  }

  const statuses = Object.entries(statusChanges)
    .map(([status, change]) => ({ status, change }))
    .filter(item => item.change > 0)
    .sort((a, b) => b.change - a.change);

  if (statuses.length === 0) {
    return { status: 'none', change: '0.0%' };
  }

  return {
    status: statuses[0].status,
    change: formatPercentage(statuses[0].change)
  };
}

/**
 * Identify the most significant request type trend
 * @param {Object} typeChanges - Object with percentage changes for each request type
 * @returns {Object} Object describing the most significant trend
 */
function getRequestTypeTrend(typeChanges) {
  if (!typeChanges || Object.keys(typeChanges).length === 0) {
    return { trend: 'No significant trends' };
  }

  const types = Object.entries(typeChanges)
    .map(([type, change]) => ({ type, change }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  if (types.length === 0) {
    return { trend: 'No significant trends' };
  }

  const highest = types[0];

  return {
    trend: `${highest.type} requests: ${formatPercentage(highest.change)}`,
    type: highest.type,
    change: formatPercentage(highest.change)
  };
}

/**
 * Generate detailed statistics comparing pending status between two periods
 * @param {Object} current - Statistics for current period
 * @param {Object} previous - Statistics for previous period
 * @returns {Object} Detailed pending status comparison
 */
export function getPendingStatusComparison(current, previous) {
  // Get pending counts from each period
  const currentPendingCount = current.byStatus?.PENDING || 0;
  const previousPendingCount = previous.byStatus?.PENDING || 0;

  // Calculate percentage change
  const percentageChange = calculateChange(currentPendingCount, previousPendingCount);

  // Calculate what percentage of total requests are pending in each period
  const currentPendingPercentage = current.totalRequests > 0
    ? (currentPendingCount / current.totalRequests) * 100
    : 0;

  const previousPendingPercentage = previous.totalRequests > 0
    ? (previousPendingCount / previous.totalRequests) * 100
    : 0;

  // Calculate percentage point change in the pending rate
  const pendingRateChange = currentPendingPercentage - previousPendingPercentage;

  return {
    currentPeriod: {
      pendingCount: currentPendingCount,
      totalRequests: current.totalRequests,
      pendingPercentage: currentPendingPercentage.toFixed(1) + '%'
    },
    previousPeriod: {
      pendingCount: previousPendingCount,
      totalRequests: previous.totalRequests,
      pendingPercentage: previousPendingPercentage.toFixed(1) + '%'
    },
    changes: {
      absoluteChange: currentPendingCount - previousPendingCount,
      percentageChange: formatPercentage(percentageChange),
      pendingRateChange: (pendingRateChange > 0 ? '+' : '') + pendingRateChange.toFixed(1) + ' pp' // percentage points
    }
  };
}

/**
 * Generate a comprehensive comparison summary between two periods
 * @param {Object} current - Statistics for current period
 * @param {Object} previous - Statistics for previous period
 * @returns {Object} Formatted summary with key metrics and their changes
 */
export function generateComparisonSummary(current, previous) {
  const changes = calculatePercentageChanges(current, previous);
  const pendingComparison = getPendingStatusComparison(current, previous);

  return {
    totalRequestsChange: formatPercentage(changes.totalRequests),
    affectedIndividualsChange: formatPercentage(changes.totalAffectedIndividuals),
    completionRateChange: formatPercentage(changes.completionRate),
    highestSupplyChange: getHighestSupplyChange(changes.totalSupplies),
    mostImprovedStatus: getMostImprovedStatus(changes.byStatus),
    requestTypeTrend: getRequestTypeTrend(changes.byType),
    pendingStatus: pendingComparison
  };
}

// Export the stats service functions
export default {
  calculatePeriodStats,
  calculatePercentageChanges,
  calculateChange,
  formatPercentage,
  generateComparisonSummary,
  getPendingStatusComparison
};