// Filters and sorting logic for SIGNAL dashboard
// ES module exports only, zero dependencies

/**
 * Define spaces that are relevant to OpenClaw/us
 */
const OUR_SPACES = new Set([
  "clawnews.org",
  "clawhub.io",
  "shipyard.bot",
  "farcaster.xyz",
  "warpcast.com"
]);

/**
 * Check if an item is relevant to us (OpenClaw)
 * @param {Object} item - Space, alert, or protocol
 * @returns {boolean}
 */
export function isRelevantToUs(item) {
  // Security alerts: check affectsUs flag
  if (item.affectsUs !== undefined) {
    return item.affectsUs === true;
  }

  // Protocols: check relevanceToUs field
  if (item.relevanceToUs !== undefined) {
    return item.relevanceToUs === "high";
  }

  // Spaces: check if in our defined list
  if (item.id) {
    return OUR_SPACES.has(item.id);
  }

  return false;
}

/**
 * Filter data to show only items that affect us
 * @param {Array} spaces - Spaces array
 * @param {Array} security - Security alerts array
 * @param {Array} protocols - Protocols array
 * @returns {Object} Filtered data
 */
export function filterAffectsUs(spaces, security, protocols) {
  return {
    spaces: spaces.filter(isRelevantToUs),
    security: security.filter(isRelevantToUs),
    protocols: protocols.filter(isRelevantToUs)
  };
}

/**
 * Filter data to show only items that have changes
 * @param {Array} data - Array of items
 * @param {Object} diff - Diff result with arrays of changes
 * @returns {Array} Filtered items that have changes
 */
export function filterChangesOnly(data, diff) {
  if (!diff || !Array.isArray(diff)) {
    return [];
  }

  const changedIds = new Set(diff.map(d => d.id));
  return data.filter(item => changedIds.has(item.id));
}

/**
 * Get severity level for sorting
 * @param {string} severity - Severity string
 * @returns {number}
 */
function getSeverityLevel(severity) {
  const levels = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1
  };
  return levels[severity] || 0;
}

/**
 * Sort security alerts by severity (critical > high > medium > low > info)
 * Alerts with affectsUs=true are pinned above same-severity alerts
 * @param {Array} alerts - Security alerts array
 * @returns {Array} Sorted alerts (does not mutate original)
 */
export function sortBySeverity(alerts) {
  return [...alerts].sort((a, b) => {
    const severityA = getSeverityLevel(a.severity);
    const severityB = getSeverityLevel(b.severity);

    // First compare by severity level
    if (severityA !== severityB) {
      return severityB - severityA; // Higher severity first
    }

    // If same severity, affectsUs=true comes first
    const affectsUsA = a.affectsUs === true ? 1 : 0;
    const affectsUsB = b.affectsUs === true ? 1 : 0;

    return affectsUsB - affectsUsA; // affectsUs=true first
  });
}

/**
 * Sort signals by date (newest first)
 * @param {Array} signals - Signals array
 * @returns {Array} Sorted signals (does not mutate original)
 */
export function sortSignalsByDate(signals) {
  return [...signals].sort((a, b) => {
    // Handle missing dates - push to end
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;

    // Sort newest first (descending)
    return b.date.localeCompare(a.date);
  });
}
