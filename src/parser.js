// Parser for agentsy.live text format
// ES module exports only, zero dependencies

import { validateSnapshot } from "./schema.js";

/**
 * Parse PULSE header to extract crawl number and date
 * @param {string} text - Full text to search
 * @returns {{ crawl: number, date: string } | null}
 */
export function parsePulseHeader(text) {
  const pulseMatch = text.match(/PULSE\s+◇\s+(\d{4}-\d{2}-\d{2})\s+◇\s+crawl\s+#(\d+)/i);
  if (!pulseMatch) return null;

  return {
    date: pulseMatch[1],
    crawl: parseInt(pulseMatch[2], 10)
  };
}

/**
 * Parse agent count from various formats
 * @param {string} str - Agent count string
 * @returns {number | null}
 */
export function parseAgentCount(str) {
  if (!str) return null;

  // Handle "no visible activity" and similar
  if (/no visible activity|no agents|empty/i.test(str)) {
    return null;
  }

  // Handle K notation with ranges (e.g., "50-70K DAU") - use upper bound
  const rangeKMatch = str.match(/(\d+)-(\d+)K/i);
  if (rangeKMatch) {
    return parseInt(rangeKMatch[2], 10) * 1000;
  }

  // Handle K notation with decimals (e.g., "4.2K skill installs")
  const decimalKMatch = str.match(/([\d.]+)K\+?/i);
  if (decimalKMatch) {
    return Math.round(parseFloat(decimalKMatch[1]) * 1000);
  }

  // Handle comma-separated numbers (e.g., "11,396 agents claimed")
  const commaMatch = str.match(/([\d,]+)\+?\s*(?:agents|users|instances|members|posts)/i);
  if (commaMatch) {
    return parseInt(commaMatch[1].replace(/,/g, ""), 10);
  }

  // Handle simple numbers with qualifiers (e.g., "120+ ERC-8004 verified agents")
  const simpleMatch = str.match(/(\d+)\+?\s*(?:agents|users|instances|members|ERC-8004)/i);
  if (simpleMatch) {
    return parseInt(simpleMatch[1], 10);
  }

  return null;
}

/**
 * Parse status icon to status string
 * @param {string} icon - Unicode status icon
 * @returns {string}
 */
function parseStatusIcon(icon) {
  const statusMap = {
    "▲": "surging",
    "●": "active",
    "◇": "steady",
    "⚠": "warning",
    "✕": "down",
    "▼": "quiet"
  };
  return statusMap[icon] || "active";
}

/**
 * Parse trust tier from label
 * @param {string} label - Trust label text
 * @returns {string}
 */
function parseTrustTier(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes("high trust")) return "high";
  if (normalized.includes("medium-high") || normalized.includes("medium+")) return "medium-high";
  if (normalized.includes("medium trust")) return "medium";
  if (normalized.includes("low trust")) return "low";
  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("avoid")) return "avoid";
  return "medium";
}

/**
 * Parse trust tiers from TRUST NOTES section
 * @param {string} text - Full text
 * @returns {Map<string, string>}
 */
export function parseTrustTiers(text) {
  const trustMap = new Map();

  const trustSection = text.match(/TRUST NOTES\s*\n-+\n([\s\S]*?)(?:\n\n|$)/);
  if (!trustSection) return trustMap;

  const lines = trustSection[1].split("\n");

  for (const line of lines) {
    // Parse format: "TIER : domain (annotation)" or "TIER : domain / alias (annotation)"
    const match = line.match(/^(HIGH|MEDIUM\+?|LOW|CRITICAL|AVOID)\s*:\s*([^\s(]+(?:\s*\/\s*[^\s(]+)?)/i);
    if (match) {
      const tierRaw = match[1].toUpperCase();
      const domains = match[2].split("/").map(d => d.trim());

      // Map tier to trust value
      let trustValue = "medium";
      if (tierRaw === "HIGH") trustValue = "high";
      else if (tierRaw === "MEDIUM+" || tierRaw === "MEDIUM-HIGH") trustValue = "medium-high";
      else if (tierRaw === "MEDIUM") trustValue = "medium";
      else if (tierRaw === "LOW") trustValue = "low";
      else if (tierRaw === "CRITICAL") trustValue = "critical";
      else if (tierRaw === "AVOID") trustValue = "avoid";

      domains.forEach(domain => {
        trustMap.set(domain, trustValue);
      });
    }
  }

  return trustMap;
}

/**
 * Parse spaces from text (both KNOWN SPACES and NEW SPACES)
 * @param {string} text - Full text
 * @returns {Array}
 */
export function parseSpaces(text) {
  const spaces = [];
  const trustMap = parseTrustTiers(text);

  // Parse inline spaces (before SIGNALS section)
  const inlineSection = text.match(/PULSE[^\n]+\n-+\n([\s\S]*?)(?=\nSIGNALS|$)/);
  if (inlineSection) {
    const lines = inlineSection[1].trim().split("\n");

    for (const line of lines) {
      if (!line.trim() || line.startsWith("-")) continue;

      // Parse format: "domain ▲ status (details)"
      const match = line.match(/^([^\s]+)\s+(▲|●|◇|⚠|✕|▼)\s+([^\s(]+)(?:\s+\(([^)]+)\))?/);
      if (match) {
        const id = match[1];
        const icon = match[2];
        const statusText = match[3];
        const details = match[4] || "";

        spaces.push({
          id,
          name: id.split(".")[0],
          url: `https://${id}`,
          status: parseStatusIcon(icon),
          trust: trustMap.get(id) || "medium",
          agents: parseAgentCount(details),
          description: details,
          isNew: false,
          securityNotes: statusText === "warning" || details.includes("bot invasion") || details.includes("breach") ? details : null
        });
      }
    }
  }

  // Parse KNOWN SPACES section
  const knownSection = text.match(/KNOWN SPACES\s*\n-+\n([\s\S]*?)(?=\n(?:NEW SPACES|TRUST NOTES|BE CAREFUL|$))/);
  if (knownSection) {
    const entries = knownSection[1].split(/\n(?=[^\s])/);

    for (const entry of entries) {
      const lines = entry.trim().split("\n");
      if (lines.length === 0) continue;

      const firstLine = lines[0];
      const match = firstLine.match(/^([^\s]+)\s+(▲|●|◇|⚠|✕|▼)\s+(.+)/);
      if (!match) continue;

      const id = match[1];
      const icon = match[2];
      const restOfFirst = match[3];

      // Extract trust from first line
      let trust = parseTrustTier(restOfFirst);
      if (trustMap.has(id)) {
        trust = trustMap.get(id);
      }

      // Combine all description lines
      const descLines = [restOfFirst, ...lines.slice(1).map(l => l.trim())];
      const description = descLines.join(" ").replace(/\s+/g, " ");

      // Extract agent count from description
      const agents = parseAgentCount(description);

      // Check for security notes
      const hasSecurityNote = description.includes("⚠") ||
                             description.includes("breach") ||
                             description.includes("malicious") ||
                             description.includes("bot invasion");

      spaces.push({
        id,
        name: id.split(".")[0],
        url: `https://${id}`,
        status: parseStatusIcon(icon),
        trust,
        agents,
        description,
        isNew: false,
        securityNotes: hasSecurityNote ? description : null,
        metrics: {}
      });
    }
  }

  // Parse NEW SPACES section
  const newSection = text.match(/NEW SPACES[^\n]*\n-+\n([\s\S]*?)(?=\n(?:TRUST NOTES|BE CAREFUL|API ENDPOINTS|$))/);
  if (newSection) {
    const entries = newSection[1].split(/\n(?=[^\s])/);

    for (const entry of entries) {
      const lines = entry.trim().split("\n");
      if (lines.length === 0) continue;

      const firstLine = lines[0];
      const match = firstLine.match(/^([^\s]+)\s+(▲|●|◇|⚠|✕|▼)?\s*(.+)/);
      if (!match) continue;

      const id = match[1];
      const icon = match[2] || "●";
      const restOfFirst = match[3];

      // Extract trust from description
      let trust = parseTrustTier(restOfFirst);
      if (trustMap.has(id)) {
        trust = trustMap.get(id);
      }

      // Combine description lines
      const descLines = [restOfFirst, ...lines.slice(1).map(l => l.trim())];
      const description = descLines.join(" ").replace(/\s+/g, " ");

      const agents = parseAgentCount(description);

      spaces.push({
        id,
        name: id.split(".")[0],
        url: `https://${id}`,
        status: parseStatusIcon(icon),
        trust,
        agents,
        description,
        isNew: true,
        securityNotes: description.includes("⚠") ? description : null
      });
    }
  }

  return spaces;
}

/**
 * Parse security warnings from BE CAREFUL section
 * @param {string} text - Full text
 * @returns {Array}
 */
export function parseSecurity(text) {
  const alerts = [];

  const securitySection = text.match(/BE CAREFUL\s*\n-+\n([\s\S]*?)(?=\n(?:API ENDPOINTS|SPACES FOR REFLECTION|PROTOCOLS EMERGING|$))/);
  if (!securitySection) return alerts;

  // Split by ⚠ blocks
  const blocks = securitySection[1].split(/\n⚠\s+/).filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length === 0) continue;

    const title = lines[0].replace(/^⚠\s*/, "").trim();

    // Find defense line
    let defenseIdx = lines.findIndex(l => /Defense:/i.test(l));

    const summaryLines = defenseIdx > 0 ? lines.slice(1, defenseIdx) : lines.slice(1);
    const summary = summaryLines.map(l => l.trim()).filter(l => l).join(" ");

    const defenseLine = defenseIdx > 0 ? lines.slice(defenseIdx).join(" ") : "";

    // Determine severity from keywords
    let severity = "medium";
    const content = (title + " " + summary).toLowerCase();
    if (content.includes("critical") || content.includes("exposed") || content.includes("breach")) {
      severity = "critical";
    } else if (content.includes("warning") || content.includes("attack") || content.includes("invasion")) {
      severity = "high";
    }

    // Check if it affects OpenClaw users
    const affectsUs = content.includes("openclaw") || content.includes("42k");

    alerts.push({
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 50),
      severity,
      title,
      summary,
      detail: defenseLine,
      affectsUs,
      ourStatus: null,
      firstSeen: null
    });
  }

  return alerts;
}

/**
 * Parse signals from SIGNALS section
 * @param {string} text - Full text
 * @returns {Array}
 */
export function parseSignals(text) {
  const signals = [];

  const signalsSection = text.match(/SIGNALS\s*\n-+\n([\s\S]*?)(?=\n(?:KNOWN SPACES|NEW SPACES|$))/);
  if (!signalsSection) return signals;

  const lines = signalsSection[1].split("\n").filter(l => l.trim());

  for (const line of lines) {
    // Parse format: "⚠ Description with numbers"
    const match = line.match(/^(▲|●|◇|⚠|✕|▼|↓)\s+(.+)/);
    if (!match) continue;

    const icon = match[1];
    const summary = match[2];

    // Map icon to signal type
    let type = "anomaly";
    if (icon === "▲") type = "surge";
    else if (icon === "✕") type = "death";
    else if (icon === "●") type = "merge";
    else if (icon === "⚠") type = "breach";
    else if (icon === "↓") type = "correction";
    else if (icon === "▼") type = "decline";

    // Extract space from summary if present
    const spaceMatch = summary.match(/([a-z0-9.-]+\.[a-z]{2,})/i);
    const space = spaceMatch ? spaceMatch[1] : null;

    signals.push({
      type,
      space,
      summary,
      severity: icon === "⚠" ? "warning" : icon === "✕" ? "high" : "medium"
    });
  }

  return signals;
}

/**
 * Parse protocols from PROTOCOLS EMERGING section
 * @param {string} text - Full text
 * @returns {Array}
 */
export function parseProtocols(text) {
  const protocols = [];

  const protocolsSection = text.match(/PROTOCOLS EMERGING\s*\n-+\n([\s\S]*?)(?=\n-{3,}|$)/);
  if (!protocolsSection) return protocols;

  const entries = protocolsSection[1].split(/\n(?=[A-Z][^\s])/);

  for (const entry of entries) {
    const lines = entry.trim().split("\n");
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    const match = firstLine.match(/^([A-Z][A-Za-z0-9._-]*)\s+(.+)/);
    if (!match) continue;

    const id = match[1];
    const description = [match[2], ...lines.slice(1).map(l => l.trim())].join(" ").replace(/\s+/g, " ");

    // Extract stars if present
    const starsMatch = description.match(/([\d.]+)K?\s+stars/i);
    const stars = starsMatch ? parseAgentCount(starsMatch[0]) : null;

    // Extract partners if present
    const partnersMatch = description.match(/(\d+)\+?\s+partners/i);
    const partners = partnersMatch ? parseInt(partnersMatch[1], 10) : null;

    // Determine status from context
    let status = "emerging";
    if (description.includes("Linux Foundation") || description.includes("production")) {
      status = "growing";
    }
    if (description.includes("SOC2") || description.includes("99.")) {
      status = "established";
    }
    if (description.includes("collapse") || description.includes("uncertain")) {
      status = "stalled";
    }

    protocols.push({
      id,
      name: id,
      description,
      status,
      stars,
      partners
    });
  }

  return protocols;
}

/**
 * Calculate vitals from spaces and security data
 * @param {Array} spaces - Parsed spaces
 * @param {Array} security - Parsed security alerts
 * @returns {Object}
 */
function calculateVitals(spaces, security) {
  const vitals = {
    totalSpaces: spaces.length,
    activeSpaces: spaces.filter(s => s.status === "active" || s.status === "surging").length,
    warningSpaces: spaces.filter(s => s.status === "warning").length,
    downSpaces: spaces.filter(s => s.status === "down").length,
    totalAgentsClaimed: 0,
    totalAgentsVerified: 0,
    newSpacesSinceLastCrawl: spaces.filter(s => s.isNew).length,
    securityAlerts: {
      critical: security.filter(a => a.severity === "critical").length,
      high: security.filter(a => a.severity === "high").length,
      medium: security.filter(a => a.severity === "medium").length,
      low: security.filter(a => a.severity === "low").length
    }
  };

  // Sum agent counts
  for (const space of spaces) {
    if (space.agents) {
      vitals.totalAgentsClaimed += space.agents;
      if (space.trust === "high" || space.trust === "medium-high") {
        vitals.totalAgentsVerified += space.agents;
      }
    }
  }

  return vitals;
}

/**
 * Parse full agentsy.live text into structured snapshot
 * @param {string} text - Full agentsy.live text
 * @returns {Object} Snapshot object
 */
export function parseAgentsy(text) {
  if (!text || typeof text !== "string") {
    // Return valid skeleton for empty input
    return {
      crawl: null,
      date: null,
      spaces: [],
      protocols: [],
      security: [],
      signals: [],
      vitals: {
        totalSpaces: 0,
        activeSpaces: 0,
        warningSpaces: 0,
        downSpaces: 0,
        totalAgentsClaimed: 0,
        totalAgentsVerified: 0,
        newSpacesSinceLastCrawl: 0,
        securityAlerts: { critical: 0, high: 0, medium: 0, low: 0 }
      }
    };
  }

  const pulse = parsePulseHeader(text);
  const spaces = parseSpaces(text);
  const protocols = parseProtocols(text);
  const security = parseSecurity(text);
  const signals = parseSignals(text);
  const vitals = calculateVitals(spaces, security);

  const snapshot = {
    crawl: pulse?.crawl || null,
    date: pulse?.date || null,
    spaces,
    protocols,
    security,
    signals,
    vitals
  };

  // Validate output
  const validation = validateSnapshot(snapshot);
  if (!validation.valid) {
    console.warn("Parser produced invalid snapshot:", validation.errors);
  }

  return snapshot;
}
