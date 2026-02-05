// Vitals calculation module for SIGNAL dashboard
// ES module exports only, zero dependencies

/**
 * Count spaces by status
 * @param {Array} spaces - Array of space objects
 * @returns {Record<string, number>}
 */
export function countByStatus(spaces) {
  const counts = {
    surging: 0,
    active: 0,
    steady: 0,
    quiet: 0,
    warning: 0,
    down: 0,
    critical: 0,
    avoid: 0
  };

  for (const space of spaces) {
    if (space.status && counts[space.status] !== undefined) {
      counts[space.status]++;
    }
  }

  return counts;
}

/**
 * Count spaces by trust tier
 * @param {Array} spaces - Array of space objects
 * @returns {Record<string, number>}
 */
export function countByTrust(spaces) {
  const counts = {
    high: 0,
    "medium-high": 0,
    medium: 0,
    low: 0,
    critical: 0,
    avoid: 0
  };

  for (const space of spaces) {
    if (space.trust && counts[space.trust] !== undefined) {
      counts[space.trust]++;
    }
  }

  return counts;
}

/**
 * Sum agent counts, optionally filtered by trust tier
 * @param {Array} spaces - Array of space objects
 * @param {string[]} [trustFilter] - Optional array of trust tiers to include
 * @returns {number}
 */
export function sumAgents(spaces, trustFilter = null) {
  let total = 0;

  for (const space of spaces) {
    if (space.agents !== null && space.agents !== undefined) {
      // If trustFilter is provided, only include matching trust tiers
      if (trustFilter === null || trustFilter.includes(space.trust)) {
        total += space.agents;
      }
    }
  }

  return total;
}

/**
 * Calculate vitals from spaces and security data
 * @param {Array} spaces - Array of space objects
 * @param {Array} security - Array of security alert objects
 * @returns {Object} Vitals object with aggregate statistics
 */
export function calculateVitals(spaces, security) {
  const vitals = {
    totalSpaces: spaces.length,
    activeSpaces: spaces.filter(s => s.status === "active" || s.status === "surging").length,
    warningSpaces: spaces.filter(s => s.status === "warning").length,
    downSpaces: spaces.filter(s => s.status === "down").length,
    totalAgentsClaimed: sumAgents(spaces),
    totalAgentsVerified: sumAgents(spaces, ["high", "medium-high"]),
    newSpacesSinceLastCrawl: spaces.filter(s => s.isNew).length,
    securityAlerts: {
      critical: security.filter(a => a.severity === "critical").length,
      high: security.filter(a => a.severity === "high").length,
      medium: security.filter(a => a.severity === "medium").length,
      low: security.filter(a => a.severity === "low").length
    }
  };

  return vitals;
}
