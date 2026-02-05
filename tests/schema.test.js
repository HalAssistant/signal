// Tests for src/schema.js
import { test } from "node:test";
import assert from "node:assert";
import {
  validateSnapshot,
  validateSpace,
  validateProtocol,
  validateSecurityAlert,
  validateSignal,
  validateVitals
} from "../src/schema.js";

// 2.1 Snapshot Validation
test("validateSnapshot: valid snapshot passes", () => {
  const snapshot = {
    crawl: 12,
    date: "2026-02-04",
    spaces: [],
    protocols: [],
    security: [],
    signals: [],
    vitals: {}
  };
  const result = validateSnapshot(snapshot);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test("validateSnapshot: missing crawl number fails", () => {
  const snapshot = {
    date: "2026-02-04",
    spaces: []
  };
  const result = validateSnapshot(snapshot);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("crawl")));
});

test("validateSnapshot: missing date fails", () => {
  const snapshot = {
    crawl: 12,
    spaces: []
  };
  const result = validateSnapshot(snapshot);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("date")));
});

test("validateSnapshot: missing spaces array fails", () => {
  const snapshot = {
    crawl: 12,
    date: "2026-02-04"
  };
  const result = validateSnapshot(snapshot);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("spaces")));
});

test("validateSnapshot: spaces as non-array fails", () => {
  const snapshot = {
    crawl: 12,
    date: "2026-02-04",
    spaces: "not an array"
  };
  const result = validateSnapshot(snapshot);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("spaces")));
});

test("validateSnapshot: extra fields are allowed (forward compat)", () => {
  const snapshot = {
    crawl: 12,
    date: "2026-02-04",
    spaces: [],
    protocols: [],
    security: [],
    signals: [],
    foo: "extra field"
  };
  const result = validateSnapshot(snapshot);
  assert.strictEqual(result.valid, true);
});

// 2.2 Space Validation
test("validateSpace: valid space passes", () => {
  const space = {
    id: "shipyard.bot",
    name: "Shipyard",
    status: "surging",
    trust: "medium-high",
    agents: 124
  };
  const result = validateSpace(space);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test("validateSpace: missing id fails", () => {
  const space = { name: "Test" };
  const result = validateSpace(space);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("id")));
});

test("validateSpace: invalid status value fails", () => {
  const space = {
    id: "test",
    status: "banana"
  };
  const result = validateSpace(space);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("invalid status")));
});

test("validateSpace: status must be valid enum value", () => {
  const validStatuses = ["surging", "active", "steady", "quiet", "warning", "down", "critical", "avoid"];
  validStatuses.forEach(status => {
    const space = { id: "test", status };
    const result = validateSpace(space);
    assert.strictEqual(result.valid, true, `Status ${status} should be valid`);
  });
});

test("validateSpace: trust must be valid enum value", () => {
  const validTrust = ["high", "medium-high", "medium", "low", "critical", "avoid"];
  validTrust.forEach(trust => {
    const space = { id: "test", trust };
    const result = validateSpace(space);
    assert.strictEqual(result.valid, true, `Trust ${trust} should be valid`);
  });
});

test("validateSpace: agents can be null (unknown)", () => {
  const space = { id: "test", agents: null };
  const result = validateSpace(space);
  assert.strictEqual(result.valid, true);
});

test("validateSpace: agents must be non-negative number if present", () => {
  const space = { id: "test", agents: -5 };
  const result = validateSpace(space);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("agents")));
});

test("validateSpace: metrics can be null or object", () => {
  const space1 = { id: "test", metrics: null };
  const result1 = validateSpace(space1);
  assert.strictEqual(result1.valid, true);

  const space2 = { id: "test", metrics: { verifiedShips: 133 } };
  const result2 = validateSpace(space2);
  assert.strictEqual(result2.valid, true);

  const space3 = { id: "test", metrics: "not an object" };
  const result3 = validateSpace(space3);
  assert.strictEqual(result3.valid, false);
});

// 2.3 Protocol Validation
test("validateProtocol: valid protocol passes", () => {
  const protocol = {
    id: "a2a",
    name: "A2A",
    status: "growing"
  };
  const result = validateProtocol(protocol);
  assert.strictEqual(result.valid, true);
});

test("validateProtocol: missing id fails", () => {
  const protocol = { name: "Test" };
  const result = validateProtocol(protocol);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("id")));
});

test("validateProtocol: status must be valid enum value", () => {
  const validStatuses = ["emerging", "growing", "established", "stalled", "deprecated"];
  validStatuses.forEach(status => {
    const protocol = { id: "test", status };
    const result = validateProtocol(protocol);
    assert.strictEqual(result.valid, true, `Status ${status} should be valid`);
  });
});

// 2.4 Security Alert Validation
test("validateSecurityAlert: valid alert passes", () => {
  const alert = {
    id: "test-alert",
    severity: "critical",
    affectsUs: true,
    ourStatus: "patched",
    firstSeen: "2026-02-04"
  };
  const result = validateSecurityAlert(alert);
  assert.strictEqual(result.valid, true);
});

test("validateSecurityAlert: severity must be valid enum value", () => {
  const validSeverities = ["critical", "high", "medium", "low", "info"];
  validSeverities.forEach(severity => {
    const alert = { id: "test", severity };
    const result = validateSecurityAlert(alert);
    assert.strictEqual(result.valid, true, `Severity ${severity} should be valid`);
  });
});

test("validateSecurityAlert: affectsUs must be boolean", () => {
  const alert1 = { id: "test", affectsUs: true };
  const result1 = validateSecurityAlert(alert1);
  assert.strictEqual(result1.valid, true);

  const alert2 = { id: "test", affectsUs: "yes" };
  const result2 = validateSecurityAlert(alert2);
  assert.strictEqual(result2.valid, false);
  assert.ok(result2.errors.some(e => e.includes("affectsUs")));
});

test("validateSecurityAlert: ourStatus must be valid enum or null", () => {
  const validStatuses = ["patched", "vulnerable", "not-applicable", "monitoring"];
  validStatuses.forEach(status => {
    const alert = { id: "test", ourStatus: status };
    const result = validateSecurityAlert(alert);
    assert.strictEqual(result.valid, true, `ourStatus ${status} should be valid`);
  });

  const alertNull = { id: "test", ourStatus: null };
  const resultNull = validateSecurityAlert(alertNull);
  assert.strictEqual(resultNull.valid, true);
});

test("validateSecurityAlert: firstSeen must be ISO date string if present", () => {
  const alert1 = { id: "test", firstSeen: "2026-02-04" };
  const result1 = validateSecurityAlert(alert1);
  assert.strictEqual(result1.valid, true);

  const alert2 = { id: "test", firstSeen: "not-a-date" };
  const result2 = validateSecurityAlert(alert2);
  assert.strictEqual(result2.valid, false);
  assert.ok(result2.errors.some(e => e.includes("firstSeen")));
});

// 2.5 Signal Validation
test("validateSignal: valid signal passes", () => {
  const signal = {
    type: "surge",
    severity: "warning",
    space: "test",
    summary: "Test surge"
  };
  const result = validateSignal(signal);
  assert.strictEqual(result.valid, true);
});

test("validateSignal: type must be valid enum value", () => {
  const validTypes = ["surge", "decline", "launch", "death", "merge", "breach", "anomaly", "correction"];
  validTypes.forEach(type => {
    const signal = { type };
    const result = validateSignal(signal);
    assert.strictEqual(result.valid, true, `Type ${type} should be valid`);
  });
});

test("validateSignal: severity must be valid if present", () => {
  const validSeverities = ["critical", "high", "medium", "low", "info", "warning"];
  validSeverities.forEach(severity => {
    const signal = { type: "surge", severity };
    const result = validateSignal(signal);
    assert.strictEqual(result.valid, true, `Severity ${severity} should be valid`);
  });
});

// 2.6 Vitals Validation
test("validateVitals: valid vitals passes", () => {
  const vitals = {
    totalSpaces: 28,
    activeSpaces: 12,
    warningSpaces: 5,
    downSpaces: 2,
    totalAgentsClaimed: 55000,
    totalAgentsVerified: 800,
    newSpacesSinceLastCrawl: 3,
    securityAlerts: {
      critical: 3,
      high: 5,
      medium: 4,
      low: 2
    }
  };
  const result = validateVitals(vitals);
  assert.strictEqual(result.valid, true);
});

test("validateVitals: totalSpaces must be non-negative integer", () => {
  const vitals1 = { totalSpaces: -5 };
  const result1 = validateVitals(vitals1);
  assert.strictEqual(result1.valid, false);

  const vitals2 = { totalSpaces: 5.5 };
  const result2 = validateVitals(vitals2);
  assert.strictEqual(result2.valid, false);

  const vitals3 = { totalSpaces: 5 };
  const result3 = validateVitals(vitals3);
  assert.strictEqual(result3.valid, true);
});

test("validateVitals: securityAlerts must have critical/high/medium/low keys", () => {
  const vitals1 = {
    securityAlerts: {
      critical: 3,
      high: 5,
      medium: 4,
      low: 2
    }
  };
  const result1 = validateVitals(vitals1);
  assert.strictEqual(result1.valid, true);

  const vitals2 = {
    securityAlerts: {
      critical: 3
      // missing other keys
    }
  };
  const result2 = validateVitals(vitals2);
  assert.strictEqual(result2.valid, false);
  assert.ok(result2.errors.some(e => e.includes("high")));
});

test("validateVitals: all counts are non-negative", () => {
  const vitals = {
    totalSpaces: 28,
    activeSpaces: -1
  };
  const result = validateVitals(vitals);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes("activeSpaces")));
});
