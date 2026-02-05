// Tests for src/format.js
import { test } from "node:test";
import assert from "node:assert";
import {
  formatAgentCount,
  formatDelta,
  formatPercent,
  trustColor,
  statusColor,
  severityColor,
  statusIcon,
  signalTypeIcon,
  signalTypeLabel,
  trustLabel,
  formatDate,
  maturityScore
} from "../src/format.js";

// 7.1 Agent Count Formatting
test("formatAgentCount: small numbers shown as-is", () => {
  assert.strictEqual(formatAgentCount(124), "124");
  assert.strictEqual(formatAgentCount(5), "5");
  assert.strictEqual(formatAgentCount(999), "999");
});

test("formatAgentCount: thousands get K notation", () => {
  assert.strictEqual(formatAgentCount(11396), "11.4K");
  assert.strictEqual(formatAgentCount(1000), "1.0K");
  assert.strictEqual(formatAgentCount(5500), "5.5K");
});

test("formatAgentCount: hundreds of thousands", () => {
  assert.strictEqual(formatAgentCount(546000), "546K");
  assert.strictEqual(formatAgentCount(100000), "100K");
});

test("formatAgentCount: null returns dash", () => {
  assert.strictEqual(formatAgentCount(null), "—");
  assert.strictEqual(formatAgentCount(undefined), "—");
});

test("formatAgentCount: zero", () => {
  assert.strictEqual(formatAgentCount(0), "0");
});

// 7.2 Delta Formatting
test("formatDelta: positive delta", () => {
  assert.strictEqual(formatDelta(4), "+4");
  assert.strictEqual(formatDelta(100), "+100");
});

test("formatDelta: negative delta", () => {
  assert.strictEqual(formatDelta(-12), "-12");
  assert.strictEqual(formatDelta(-5), "-5");
});

test("formatDelta: zero delta", () => {
  assert.strictEqual(formatDelta(0), "0");
});

test("formatDelta: null delta", () => {
  assert.strictEqual(formatDelta(null), "—");
  assert.strictEqual(formatDelta(undefined), "—");
});

test("formatDelta: large delta with K", () => {
  assert.strictEqual(formatDelta(10951), "+11K");
  assert.strictEqual(formatDelta(-5000), "-5K");
});

// 7.3 Percent Formatting
test("formatPercent: large positive percentage", () => {
  assert.strictEqual(formatPercent(2461), "+2,461%");
});

test("formatPercent: negative percentage", () => {
  assert.strictEqual(formatPercent(-5), "-5%");
});

test("formatPercent: zero percentage", () => {
  assert.strictEqual(formatPercent(0), "0%");
});

test("formatPercent: handles null/undefined", () => {
  assert.strictEqual(formatPercent(null), "0%");
  assert.strictEqual(formatPercent(undefined), "0%");
});

// 7.4 Color Mapping - Trust
test("trustColor: high trust is green", () => {
  assert.strictEqual(trustColor("high"), "#22c55e");
});

test("trustColor: medium-high trust is amber", () => {
  assert.strictEqual(trustColor("medium-high"), "#eab308");
});

test("trustColor: avoid trust is deep red", () => {
  assert.strictEqual(trustColor("avoid"), "#dc2626");
});

test("trustColor: unknown returns fallback gray", () => {
  assert.strictEqual(trustColor("unknown"), "#6b7280");
  assert.strictEqual(trustColor(""), "#6b7280");
});

// 7.4 Color Mapping - Status
test("statusColor: surging is green", () => {
  assert.strictEqual(statusColor("surging"), "#22c55e");
});

test("statusColor: down is red", () => {
  assert.strictEqual(statusColor("down"), "#ef4444");
});

test("statusColor: active is blue", () => {
  assert.strictEqual(statusColor("active"), "#3b82f6");
});

// 7.4 Color Mapping - Severity
test("severityColor: critical is red", () => {
  assert.strictEqual(severityColor("critical"), "#ef4444");
});

test("severityColor: info is gray", () => {
  assert.strictEqual(severityColor("info"), "#6b7280");
});

test("severityColor: high is orange", () => {
  assert.strictEqual(severityColor("high"), "#f97316");
});

// 7.5 Icons & Labels - Status
test("statusIcon: returns correct icons", () => {
  assert.strictEqual(statusIcon("surging"), "▲");
  assert.strictEqual(statusIcon("active"), "●");
  assert.strictEqual(statusIcon("steady"), "◇");
  assert.strictEqual(statusIcon("warning"), "⚠");
  assert.strictEqual(statusIcon("down"), "✕");
  assert.strictEqual(statusIcon("quiet"), "▼");
});

test("statusIcon: unknown status returns default", () => {
  assert.strictEqual(statusIcon("unknown"), "●");
});

// 7.5 Icons & Labels - Signal Type
test("signalTypeIcon: returns correct icons", () => {
  assert.strictEqual(signalTypeIcon("surge"), "▲");
  assert.strictEqual(signalTypeIcon("breach"), "⚠");
  assert.strictEqual(signalTypeIcon("death"), "✕");
  assert.strictEqual(signalTypeIcon("launch"), "★");
  assert.strictEqual(signalTypeIcon("merge"), "●");
});

test("signalTypeLabel: returns uppercase labels", () => {
  assert.strictEqual(signalTypeLabel("surge"), "SURGE");
  assert.strictEqual(signalTypeLabel("breach"), "BREACH");
  assert.strictEqual(signalTypeLabel("anomaly"), "ANOMALY");
});

// 7.5 Trust Labels
test("trustLabel: returns uppercase trust levels", () => {
  assert.strictEqual(trustLabel("medium-high"), "MEDIUM-HIGH");
  assert.strictEqual(trustLabel("high"), "HIGH");
  assert.strictEqual(trustLabel("low"), "LOW");
});

test("trustLabel: handles null/undefined", () => {
  assert.strictEqual(trustLabel(null), "UNKNOWN");
  assert.strictEqual(trustLabel(undefined), "UNKNOWN");
  assert.strictEqual(trustLabel(""), "UNKNOWN");
});

// 7.6 Maturity Score
test("maturityScore: established has high score", () => {
  const score = maturityScore("established");
  assert.ok(score >= 9 && score <= 10);
});

test("maturityScore: growing has medium-high score", () => {
  const score = maturityScore("growing");
  assert.ok(score >= 6 && score <= 8);
});

test("maturityScore: emerging has low-medium score", () => {
  const score = maturityScore("emerging");
  assert.ok(score >= 3 && score <= 5);
});

test("maturityScore: deprecated has low score", () => {
  const score = maturityScore("deprecated");
  assert.ok(score >= 1 && score <= 3);
});

test("maturityScore: values are in range [1, 10]", () => {
  const statuses = ["established", "growing", "emerging", "stalled", "deprecated"];
  statuses.forEach(status => {
    const score = maturityScore(status);
    assert.ok(score >= 1 && score <= 10, `Score ${score} for ${status} out of range`);
  });
});

// 7.7 Date Formatting
test("formatDate: formats ISO date correctly", () => {
  assert.strictEqual(formatDate("2026-02-04"), "Feb 4, 2026");
  assert.strictEqual(formatDate("2026-12-25"), "Dec 25, 2026");
  assert.strictEqual(formatDate("2026-01-01"), "Jan 1, 2026");
});

test("formatDate: handles null/undefined gracefully", () => {
  assert.strictEqual(formatDate(null), "—");
  assert.strictEqual(formatDate(undefined), "—");
  assert.strictEqual(formatDate(""), "—");
});

test("formatDate: handles invalid date strings", () => {
  assert.strictEqual(formatDate("not-a-date"), "—");
  assert.strictEqual(formatDate("2026-13-45"), "—");
});
