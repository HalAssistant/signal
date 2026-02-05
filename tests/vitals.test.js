// Tests for vitals.js
import { test } from "node:test";
import assert from "node:assert";
import { calculateVitals, countByStatus, countByTrust, sumAgents } from "../src/vitals.js";

// Test countByStatus
test("countByStatus: counts spaces by status correctly", () => {
  const spaces = [
    { id: "a", status: "active" },
    { id: "b", status: "active" },
    { id: "c", status: "active" },
    { id: "d", status: "warning" },
    { id: "e", status: "warning" },
    { id: "f", status: "down" },
    { id: "g", status: "surging" }
  ];

  const result = countByStatus(spaces);

  assert.strictEqual(result.active, 3);
  assert.strictEqual(result.warning, 2);
  assert.strictEqual(result.down, 1);
  assert.strictEqual(result.surging, 1);
  assert.strictEqual(result.steady, 0);
  assert.strictEqual(result.quiet, 0);
});

test("countByStatus: handles empty spaces array", () => {
  const result = countByStatus([]);

  assert.strictEqual(result.active, 0);
  assert.strictEqual(result.warning, 0);
  assert.strictEqual(result.down, 0);
  assert.strictEqual(result.surging, 0);
  assert.strictEqual(result.steady, 0);
  assert.strictEqual(result.quiet, 0);
});

// Test countByTrust
test("countByTrust: counts spaces by trust tier correctly", () => {
  const spaces = [
    { id: "a", trust: "high" },
    { id: "b", trust: "high" },
    { id: "c", trust: "medium-high" },
    { id: "d", trust: "medium" },
    { id: "e", trust: "low" },
    { id: "f", trust: "low" },
    { id: "g", trust: "critical" },
    { id: "h", trust: "avoid" }
  ];

  const result = countByTrust(spaces);

  assert.strictEqual(result.high, 2);
  assert.strictEqual(result["medium-high"], 1);
  assert.strictEqual(result.medium, 1);
  assert.strictEqual(result.low, 2);
  assert.strictEqual(result.critical, 1);
  assert.strictEqual(result.avoid, 1);
});

test("countByTrust: handles empty spaces array", () => {
  const result = countByTrust([]);

  assert.strictEqual(result.high, 0);
  assert.strictEqual(result["medium-high"], 0);
  assert.strictEqual(result.medium, 0);
  assert.strictEqual(result.low, 0);
});

// Test sumAgents
test("sumAgents: sums all agent counts, skipping nulls", () => {
  const spaces = [
    { id: "a", agents: 100 },
    { id: "b", agents: null },
    { id: "c", agents: 50 },
    { id: "d", agents: 250 }
  ];

  const result = sumAgents(spaces);
  assert.strictEqual(result, 400);
});

test("sumAgents: sums only verified agents (high + medium-high trust)", () => {
  const spaces = [
    { id: "a", agents: 100, trust: "high" },
    { id: "b", agents: 200, trust: "low" },
    { id: "c", agents: 50, trust: "medium-high" },
    { id: "d", agents: 75, trust: "medium" }
  ];

  const result = sumAgents(spaces, ["high", "medium-high"]);
  assert.strictEqual(result, 150);
});

test("sumAgents: returns 0 for empty array", () => {
  const result = sumAgents([]);
  assert.strictEqual(result, 0);
});

test("sumAgents: handles all null agent counts", () => {
  const spaces = [
    { id: "a", agents: null },
    { id: "b", agents: null }
  ];

  const result = sumAgents(spaces);
  assert.strictEqual(result, 0);
});

test("sumAgents: filters by multiple trust tiers", () => {
  const spaces = [
    { id: "a", agents: 100, trust: "high" },
    { id: "b", agents: 50, trust: "medium" },
    { id: "c", agents: 25, trust: "low" },
    { id: "d", agents: 200, trust: "avoid" }
  ];

  const result = sumAgents(spaces, ["high", "medium"]);
  assert.strictEqual(result, 150);
});

// Test calculateVitals
test("calculateVitals: produces complete vitals object", () => {
  const spaces = [
    { id: "a", status: "active", trust: "high", agents: 100, isNew: false },
    { id: "b", status: "surging", trust: "medium-high", agents: 200, isNew: false },
    { id: "c", status: "warning", trust: "low", agents: 50, isNew: true },
    { id: "d", status: "down", trust: "medium", agents: null, isNew: false },
    { id: "e", status: "active", trust: "high", agents: 150, isNew: false }
  ];

  const security = [
    { severity: "critical" },
    { severity: "critical" },
    { severity: "high" },
    { severity: "high" },
    { severity: "high" },
    { severity: "medium" },
    { severity: "low" }
  ];

  const result = calculateVitals(spaces, security);

  assert.strictEqual(result.totalSpaces, 5);
  assert.strictEqual(result.activeSpaces, 3); // active + surging
  assert.strictEqual(result.warningSpaces, 1);
  assert.strictEqual(result.downSpaces, 1);
  assert.strictEqual(result.totalAgentsClaimed, 500); // 100 + 200 + 50 + 150
  assert.strictEqual(result.totalAgentsVerified, 450); // high + medium-high: 100 + 150 + 200
  assert.strictEqual(result.newSpacesSinceLastCrawl, 1);
  assert.strictEqual(result.securityAlerts.critical, 2);
  assert.strictEqual(result.securityAlerts.high, 3);
  assert.strictEqual(result.securityAlerts.medium, 1);
  assert.strictEqual(result.securityAlerts.low, 1);
});

test("calculateVitals: handles empty spaces and security", () => {
  const result = calculateVitals([], []);

  assert.strictEqual(result.totalSpaces, 0);
  assert.strictEqual(result.activeSpaces, 0);
  assert.strictEqual(result.warningSpaces, 0);
  assert.strictEqual(result.downSpaces, 0);
  assert.strictEqual(result.totalAgentsClaimed, 0);
  assert.strictEqual(result.totalAgentsVerified, 0);
  assert.strictEqual(result.newSpacesSinceLastCrawl, 0);
  assert.strictEqual(result.securityAlerts.critical, 0);
  assert.strictEqual(result.securityAlerts.high, 0);
  assert.strictEqual(result.securityAlerts.medium, 0);
  assert.strictEqual(result.securityAlerts.low, 0);
});

test("calculateVitals: handles spaces with all null agent counts", () => {
  const spaces = [
    { id: "a", status: "active", trust: "high", agents: null, isNew: false },
    { id: "b", status: "active", trust: "medium", agents: null, isNew: false }
  ];

  const result = calculateVitals(spaces, []);

  assert.strictEqual(result.totalSpaces, 2);
  assert.strictEqual(result.activeSpaces, 2);
  assert.strictEqual(result.totalAgentsClaimed, 0);
  assert.strictEqual(result.totalAgentsVerified, 0);
});
