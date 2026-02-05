// Diff engine for SIGNAL dashboard
// Computes changes between two snapshots
// ES module exports only, zero dependencies

/**
 * Diff spaces arrays to detect changes
 * @param {Array} current - Current spaces array
 * @param {Array} previous - Previous spaces array
 * @returns {Array} Array of space diffs
 */
export function diffSpaces(current, previous) {
  const diffs = [];
  const prevMap = new Map(previous.map(s => [s.id, s]));
  const currMap = new Map(current.map(s => [s.id, s]));

  // Check for added and changed spaces
  for (const currSpace of current) {
    const prevSpace = prevMap.get(currSpace.id);

    if (!prevSpace) {
      // New space
      diffs.push({
        id: currSpace.id,
        change: "added",
        space: currSpace
      });
    } else {
      // Check for changes
      const changes = [];

      // Status change
      if (currSpace.status !== prevSpace.status) {
        changes.push({
          id: currSpace.id,
          change: "status",
          from: prevSpace.status,
          to: currSpace.status
        });
      }

      // Trust change
      if (currSpace.trust !== prevSpace.trust) {
        changes.push({
          id: currSpace.id,
          change: "trust",
          from: prevSpace.trust,
          to: currSpace.trust
        });
      }

      // Agent count change
      if (currSpace.agents !== prevSpace.agents) {
        const delta = (currSpace.agents || 0) - (prevSpace.agents || 0);
        const percentChange = prevSpace.agents && prevSpace.agents !== 0
          ? Math.round((delta / prevSpace.agents) * 10000) / 100
          : null;

        changes.push({
          id: currSpace.id,
          change: "agents",
          from: prevSpace.agents,
          to: currSpace.agents,
          delta,
          percentChange
        });
      }

      diffs.push(...changes);
    }
  }

  // Check for removed spaces
  for (const prevSpace of previous) {
    if (!currMap.has(prevSpace.id)) {
      diffs.push({
        id: prevSpace.id,
        change: "removed",
        space: prevSpace
      });
    }
  }

  return diffs;
}

/**
 * Diff security alerts to detect new, resolved, or changed alerts
 * @param {Array} current - Current security alerts
 * @param {Array} previous - Previous security alerts
 * @returns {Array} Array of security diffs
 */
export function diffSecurity(current, previous) {
  const diffs = [];
  const prevMap = new Map(previous.map(a => [a.id, a]));
  const currMap = new Map(current.map(a => [a.id, a]));

  // Check for new and changed alerts
  for (const currAlert of current) {
    const prevAlert = prevMap.get(currAlert.id);

    if (!prevAlert) {
      // New alert
      diffs.push({
        id: currAlert.id,
        isNew: true,
        alert: currAlert
      });
    } else {
      // Check for severity change
      if (currAlert.severity !== prevAlert.severity) {
        diffs.push({
          id: currAlert.id,
          severityChanged: true,
          from: prevAlert.severity,
          to: currAlert.severity,
          escalated: getSeverityLevel(currAlert.severity) > getSeverityLevel(prevAlert.severity)
        });
      }

      // Check for ourStatus change
      if (currAlert.ourStatus !== prevAlert.ourStatus) {
        diffs.push({
          id: currAlert.id,
          ourStatusChanged: true,
          from: prevAlert.ourStatus,
          to: currAlert.ourStatus
        });
      }
    }
  }

  // Check for resolved alerts
  for (const prevAlert of previous) {
    if (!currMap.has(prevAlert.id)) {
      diffs.push({
        id: prevAlert.id,
        resolved: true,
        alert: prevAlert
      });
    }
  }

  return diffs;
}

/**
 * Get numeric severity level for comparison
 * @param {string} severity - Severity string
 * @returns {number}
 */
function getSeverityLevel(severity) {
  const levels = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0
  };
  return levels[severity] || 0;
}

/**
 * Diff protocols to detect changes
 * @param {Array} current - Current protocols
 * @param {Array} previous - Previous protocols
 * @returns {Array} Array of protocol diffs
 */
export function diffProtocols(current, previous) {
  const diffs = [];
  const prevMap = new Map(previous.map(p => [p.id, p]));
  const currMap = new Map(current.map(p => [p.id, p]));

  // Check for new and changed protocols
  for (const currProto of current) {
    const prevProto = prevMap.get(currProto.id);

    if (!prevProto) {
      // New protocol
      diffs.push({
        id: currProto.id,
        change: "added",
        protocol: currProto
      });
    } else {
      // Check for status change
      if (currProto.status !== prevProto.status) {
        diffs.push({
          id: currProto.id,
          change: "status",
          from: prevProto.status,
          to: currProto.status
        });
      }

      // Check for stars increase
      if (currProto.stars !== prevProto.stars && currProto.stars !== null && prevProto.stars !== null) {
        const delta = currProto.stars - prevProto.stars;
        diffs.push({
          id: currProto.id,
          change: "stars",
          from: prevProto.stars,
          to: currProto.stars,
          delta
        });
      }
    }
  }

  // Check for removed protocols
  for (const prevProto of previous) {
    if (!currMap.has(prevProto.id)) {
      diffs.push({
        id: prevProto.id,
        change: "removed",
        protocol: prevProto
      });
    }
  }

  return diffs;
}

/**
 * Diff vitals to detect aggregate changes
 * @param {Object} current - Current vitals
 * @param {Object} previous - Previous vitals (can be null for first snapshot)
 * @returns {Object} Vitals diff with deltas
 */
export function diffVitals(current, previous) {
  if (!previous) {
    // First snapshot - no previous data
    const result = {};
    for (const key in current) {
      if (typeof current[key] === "number") {
        result[key] = { value: current[key], delta: null };
      } else if (typeof current[key] === "object" && current[key] !== null) {
        // Handle nested objects like securityAlerts
        result[key] = {};
        for (const subKey in current[key]) {
          result[key][subKey] = { value: current[key][subKey], delta: null };
        }
      }
    }
    return result;
  }

  const diff = {};

  // Process all keys in current vitals
  for (const key in current) {
    const currValue = current[key];
    const prevValue = previous[key];

    if (typeof currValue === "number") {
      const delta = currValue - (prevValue || 0);
      diff[key] = { value: currValue, delta };
    } else if (typeof currValue === "object" && currValue !== null) {
      // Handle nested objects like securityAlerts
      diff[key] = {};
      for (const subKey in currValue) {
        const currSubValue = currValue[subKey];
        const prevSubValue = prevValue?.[subKey] || 0;
        const delta = currSubValue - prevSubValue;
        diff[key][subKey] = { value: currSubValue, delta };
      }
    }
  }

  return diff;
}

/**
 * Diff complete snapshots
 * @param {Object} current - Current snapshot
 * @param {Object} previous - Previous snapshot (can be null for first snapshot)
 * @returns {Object} Complete diff result
 */
export function diffSnapshots(current, previous) {
  if (!previous) {
    // First snapshot - everything is new
    return {
      spaces: current.spaces.map(s => ({ id: s.id, change: "added", space: s })),
      security: current.security.map(a => ({ id: a.id, isNew: true, alert: a })),
      protocols: current.protocols.map(p => ({ id: p.id, change: "added", protocol: p })),
      vitals: diffVitals(current.vitals, null)
    };
  }

  return {
    spaces: diffSpaces(current.spaces, previous.spaces),
    security: diffSecurity(current.security, previous.security),
    protocols: diffProtocols(current.protocols, previous.protocols),
    vitals: diffVitals(current.vitals, previous.vitals)
  };
}
