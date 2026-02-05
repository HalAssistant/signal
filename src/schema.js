// Schema validation functions for SIGNAL dashboard
// ES module exports only, zero dependencies

/**
 * Validate a complete snapshot object
 * @param {any} obj - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSnapshot(obj) {
  const errors = [];

  if (!obj || typeof obj !== "object") {
    return { valid: false, errors: ["Snapshot must be an object"] };
  }

  // Required fields
  if (typeof obj.crawl !== "number") {
    errors.push("crawl is required and must be a number");
  }

  if (typeof obj.date !== "string") {
    errors.push("date is required and must be a string");
  }

  if (!Array.isArray(obj.spaces)) {
    errors.push("spaces is required and must be an array");
  }

  if (!Array.isArray(obj.protocols)) {
    errors.push("protocols must be an array");
  }

  if (!Array.isArray(obj.security)) {
    errors.push("security must be an array");
  }

  if (!Array.isArray(obj.signals)) {
    errors.push("signals must be an array");
  }

  if (obj.vitals && typeof obj.vitals !== "object") {
    errors.push("vitals must be an object if present");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a space object
 * @param {any} obj - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSpace(obj) {
  const errors = [];

  if (!obj || typeof obj !== "object") {
    return { valid: false, errors: ["Space must be an object"] };
  }

  // Required: id
  if (typeof obj.id !== "string" || obj.id.length === 0) {
    errors.push("id is required and must be a non-empty string");
  }

  // Status validation
  const validStatuses = ["surging", "active", "steady", "quiet", "warning", "down", "critical", "avoid"];
  if (obj.status !== undefined && !validStatuses.includes(obj.status)) {
    errors.push(`invalid status: ${obj.status} (must be one of: ${validStatuses.join(", ")})`);
  }

  // Trust validation
  const validTrust = ["high", "medium-high", "medium", "low", "critical", "avoid"];
  if (obj.trust !== undefined && !validTrust.includes(obj.trust)) {
    errors.push(`invalid trust: ${obj.trust} (must be one of: ${validTrust.join(", ")})`);
  }

  // Agents validation
  if (obj.agents !== null && obj.agents !== undefined) {
    if (typeof obj.agents !== "number" || obj.agents < 0) {
      errors.push("agents must be null or a non-negative number");
    }
  }

  // Metrics validation
  if (obj.metrics !== null && obj.metrics !== undefined) {
    if (typeof obj.metrics !== "object") {
      errors.push("metrics must be null or an object");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a protocol object
 * @param {any} obj - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProtocol(obj) {
  const errors = [];

  if (!obj || typeof obj !== "object") {
    return { valid: false, errors: ["Protocol must be an object"] };
  }

  // Required: id
  if (typeof obj.id !== "string" || obj.id.length === 0) {
    errors.push("id is required and must be a non-empty string");
  }

  // Status validation
  const validStatuses = ["emerging", "growing", "established", "stalled", "deprecated"];
  if (obj.status !== undefined && !validStatuses.includes(obj.status)) {
    errors.push(`invalid status: ${obj.status} (must be one of: ${validStatuses.join(", ")})`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a security alert object
 * @param {any} obj - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSecurityAlert(obj) {
  const errors = [];

  if (!obj || typeof obj !== "object") {
    return { valid: false, errors: ["Security alert must be an object"] };
  }

  // Severity validation
  const validSeverities = ["critical", "high", "medium", "low", "info"];
  if (obj.severity !== undefined && !validSeverities.includes(obj.severity)) {
    errors.push(`invalid severity: ${obj.severity} (must be one of: ${validSeverities.join(", ")})`);
  }

  // affectsUs validation
  if (obj.affectsUs !== undefined && typeof obj.affectsUs !== "boolean") {
    errors.push("affectsUs must be a boolean");
  }

  // ourStatus validation
  const validOurStatus = ["patched", "vulnerable", "not-applicable", "monitoring"];
  if (obj.ourStatus !== null && obj.ourStatus !== undefined && !validOurStatus.includes(obj.ourStatus)) {
    errors.push(`invalid ourStatus: ${obj.ourStatus} (must be one of: ${validOurStatus.join(", ")} or null)`);
  }

  // firstSeen validation
  if (obj.firstSeen !== undefined && obj.firstSeen !== null) {
    if (typeof obj.firstSeen !== "string") {
      errors.push("firstSeen must be an ISO date string if present");
    } else {
      // Basic ISO date format check
      const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoDatePattern.test(obj.firstSeen)) {
        errors.push("firstSeen must be in ISO date format (YYYY-MM-DD)");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a signal object
 * @param {any} obj - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSignal(obj) {
  const errors = [];

  if (!obj || typeof obj !== "object") {
    return { valid: false, errors: ["Signal must be an object"] };
  }

  // Type validation
  const validTypes = ["surge", "decline", "launch", "death", "merge", "breach", "anomaly", "correction"];
  if (obj.type !== undefined && !validTypes.includes(obj.type)) {
    errors.push(`invalid type: ${obj.type} (must be one of: ${validTypes.join(", ")})`);
  }

  // Severity validation (if present)
  const validSeverities = ["critical", "high", "medium", "low", "info", "warning"];
  if (obj.severity !== undefined && !validSeverities.includes(obj.severity)) {
    errors.push(`invalid severity: ${obj.severity} (must be one of: ${validSeverities.join(", ")})`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate vitals object
 * @param {any} obj - Object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateVitals(obj) {
  const errors = [];

  if (!obj || typeof obj !== "object") {
    return { valid: false, errors: ["Vitals must be an object"] };
  }

  // Validate numeric fields are non-negative
  const numericFields = [
    "totalSpaces",
    "activeSpaces",
    "warningSpaces",
    "downSpaces",
    "totalAgentsClaimed",
    "totalAgentsVerified",
    "newSpacesSinceLastCrawl"
  ];

  numericFields.forEach(field => {
    if (obj[field] !== undefined) {
      if (typeof obj[field] !== "number" || obj[field] < 0 || !Number.isInteger(obj[field])) {
        errors.push(`${field} must be a non-negative integer`);
      }
    }
  });

  // Validate securityAlerts structure
  if (obj.securityAlerts !== undefined) {
    if (typeof obj.securityAlerts !== "object" || obj.securityAlerts === null) {
      errors.push("securityAlerts must be an object");
    } else {
      const requiredKeys = ["critical", "high", "medium", "low"];
      requiredKeys.forEach(key => {
        if (obj.securityAlerts[key] === undefined) {
          errors.push(`securityAlerts must have ${key} key`);
        } else if (typeof obj.securityAlerts[key] !== "number" || obj.securityAlerts[key] < 0) {
          errors.push(`securityAlerts.${key} must be a non-negative number`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
