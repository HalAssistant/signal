// Display formatting functions for SIGNAL dashboard
// ES module exports only, zero dependencies

/**
 * Format agent count for display
 * @param {number | null} n - Agent count
 * @returns {string} Formatted count ("124" / "11.4K" / "546K" / "—")
 */
export function formatAgentCount(n) {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "0";
  if (n < 1000) return String(n);
  if (n < 100000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n / 1000)}K`;
}

/**
 * Format delta for display
 * @param {number | null} n - Delta value
 * @returns {string} Formatted delta ("+4" / "-12" / "—")
 */
export function formatDelta(n) {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "0";
  const sign = n > 0 ? "+" : "";
  if (Math.abs(n) < 1000) return `${sign}${n}`;
  const k = Math.round(n / 1000);
  return `${sign}${k}K`;
}

/**
 * Format percentage for display
 * @param {number} n - Percentage value
 * @returns {string} Formatted percent ("+2,461%" / "-5%")
 */
export function formatPercent(n) {
  if (n === null || n === undefined || isNaN(n)) return "0%";
  const sign = n > 0 ? "+" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) {
    // Add comma thousands separator
    const formatted = abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return `${sign}${formatted}%`;
  }
  return `${sign}${Math.round(n)}%`;
}

/**
 * Get color for trust tier
 * @param {string} trust - Trust level
 * @returns {string} CSS color hex
 */
export function trustColor(trust) {
  const colors = {
    "high": "#22c55e",
    "medium-high": "#eab308",
    "medium": "#eab308",
    "low": "#f97316",
    "critical": "#ef4444",
    "avoid": "#dc2626"
  };
  return colors[trust] || "#6b7280"; // fallback gray
}

/**
 * Get color for status
 * @param {string} status - Status value
 * @returns {string} CSS color hex
 */
export function statusColor(status) {
  const colors = {
    "surging": "#22c55e",
    "active": "#3b82f6",
    "steady": "#6b7280",
    "quiet": "#4b5563",
    "warning": "#f97316",
    "down": "#ef4444",
    "critical": "#ef4444"
  };
  return colors[status] || "#6b7280";
}

/**
 * Get color for severity
 * @param {string} severity - Severity level
 * @returns {string} CSS color hex
 */
export function severityColor(severity) {
  const colors = {
    "critical": "#ef4444",
    "high": "#f97316",
    "medium": "#eab308",
    "low": "#3b82f6",
    "info": "#6b7280"
  };
  return colors[severity] || "#6b7280";
}

/**
 * Get icon for status
 * @param {string} status - Status value
 * @returns {string} Icon character
 */
export function statusIcon(status) {
  const icons = {
    "surging": "▲",
    "active": "●",
    "steady": "◇",
    "warning": "⚠",
    "down": "✕",
    "quiet": "▼",
    "critical": "⚠"
  };
  return icons[status] || "●";
}

/**
 * Get icon for signal type
 * @param {string} type - Signal type
 * @returns {string} Icon character
 */
export function signalTypeIcon(type) {
  const icons = {
    "surge": "▲",
    "decline": "▼",
    "launch": "★",
    "death": "✕",
    "merge": "●",
    "breach": "⚠",
    "anomaly": "⚠",
    "correction": "↓"
  };
  return icons[type] || "●";
}

/**
 * Get label for signal type
 * @param {string} type - Signal type
 * @returns {string} Display label
 */
export function signalTypeLabel(type) {
  const labels = {
    "surge": "SURGE",
    "decline": "DECLINE",
    "launch": "LAUNCH",
    "death": "DOWN",
    "merge": "MERGE",
    "breach": "BREACH",
    "anomaly": "ANOMALY",
    "correction": "CORRECTION"
  };
  return labels[type] || type.toUpperCase();
}

/**
 * Get label for trust tier
 * @param {string} trust - Trust level
 * @returns {string} Display label
 */
export function trustLabel(trust) {
  if (!trust) return "UNKNOWN";
  return trust.toUpperCase();
}

/**
 * Format date for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date ("Feb 4, 2026")
 */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  } catch {
    return "—";
  }
}

/**
 * Calculate maturity score for protocol status
 * @param {string} status - Protocol status
 * @returns {number} Score 1-10 for bar width
 */
export function maturityScore(status) {
  const scores = {
    "established": 9,
    "growing": 7,
    "emerging": 4,
    "stalled": 3,
    "deprecated": 2
  };
  return scores[status] || 5;
}
