// Tests for diff.js
import { test } from "node:test";
import assert from "node:assert";
import { diffSnapshots, diffSpaces, diffSecurity, diffProtocols, diffVitals } from "../src/diff.js";

// Test diffSpaces
test("diffSpaces: detects new space", () => {
  const current = [
    { id: "new-space", status: "active" },
    { id: "existing", status: "active" }
  ];
  const previous = [
    { id: "existing", status: "active" }
  ];

  const result = diffSpaces(current, previous);
  const newSpaceDiff = result.find(d => d.id === "new-space" && d.change === "added");

  assert.ok(newSpaceDiff);
  assert.strictEqual(newSpaceDiff.space.id, "new-space");
});

test("diffSpaces: detects removed space", () => {
  const current = [
    { id: "existing", status: "active" }
  ];
  const previous = [
    { id: "existing", status: "active" },
    { id: "gone-space", status: "down" }
  ];

  const result = diffSpaces(current, previous);
  const removedDiff = result.find(d => d.id === "gone-space" && d.change === "removed");

  assert.ok(removedDiff);
  assert.strictEqual(removedDiff.space.id, "gone-space");
});

test("diffSpaces: detects status change", () => {
  const current = [
    { id: "x", status: "down" }
  ];
  const previous = [
    { id: "x", status: "active" }
  ];

  const result = diffSpaces(current, previous);
  const statusDiff = result.find(d => d.id === "x" && d.change === "status");

  assert.ok(statusDiff);
  assert.strictEqual(statusDiff.from, "active");
  assert.strictEqual(statusDiff.to, "down");
});

test("diffSpaces: detects trust tier change", () => {
  const current = [
    { id: "x", trust: "high", status: "active" }
  ];
  const previous = [
    { id: "x", trust: "medium", status: "active" }
  ];

  const result = diffSpaces(current, previous);
  const trustDiff = result.find(d => d.id === "x" && d.change === "trust");

  assert.ok(trustDiff);
  assert.strictEqual(trustDiff.from, "medium");
  assert.strictEqual(trustDiff.to, "high");
});

test("diffSpaces: detects agent count change with delta and percentChange", () => {
  const current = [
    { id: "x", agents: 124, status: "active" }
  ];
  const previous = [
    { id: "x", agents: 120, status: "active" }
  ];

  const result = diffSpaces(current, previous);
  const agentDiff = result.find(d => d.id === "x" && d.change === "agents");

  assert.ok(agentDiff);
  assert.strictEqual(agentDiff.from, 120);
  assert.strictEqual(agentDiff.to, 124);
  assert.strictEqual(agentDiff.delta, 4);
  assert.strictEqual(agentDiff.percentChange, 3.33);
});

test("diffSpaces: handles null agent counts (unknown to known)", () => {
  const current = [
    { id: "x", agents: 50, status: "active" }
  ];
  const previous = [
    { id: "x", agents: null, status: "active" }
  ];

  const result = diffSpaces(current, previous);
  const agentDiff = result.find(d => d.id === "x" && d.change === "agents");

  assert.ok(agentDiff);
  assert.strictEqual(agentDiff.from, null);
  assert.strictEqual(agentDiff.to, 50);
  assert.strictEqual(agentDiff.delta, 50);
});

test("diffSpaces: handles large agent count swings", () => {
  const current = [
    { id: "4claw.org", agents: 11396, status: "surging" }
  ];
  const previous = [
    { id: "4claw.org", agents: 445, status: "active" }
  ];

  const result = diffSpaces(current, previous);
  const agentDiff = result.find(d => d.id === "4claw.org" && d.change === "agents");

  assert.ok(agentDiff);
  assert.strictEqual(agentDiff.delta, 10951);
  assert.strictEqual(agentDiff.percentChange, 2460.9);
});

test("diffSpaces: no diff for identical spaces", () => {
  const spaces = [
    { id: "x", status: "active", trust: "high", agents: 100 }
  ];

  const result = diffSpaces(spaces, spaces);

  // Should be empty since nothing changed
  assert.strictEqual(result.length, 0);
});

// Test diffSecurity
test("diffSecurity: detects new security alert", () => {
  const current = [
    { id: "new-threat", severity: "critical" }
  ];
  const previous = [];

  const result = diffSecurity(current, previous);
  const newAlert = result.find(d => d.id === "new-threat" && d.isNew);

  assert.ok(newAlert);
  assert.strictEqual(newAlert.alert.severity, "critical");
});

test("diffSecurity: detects resolved alert", () => {
  const current = [];
  const previous = [
    { id: "old-threat", severity: "high" }
  ];

  const result = diffSecurity(current, previous);
  const resolvedAlert = result.find(d => d.id === "old-threat" && d.resolved);

  assert.ok(resolvedAlert);
});

test("diffSecurity: detects severity change with escalation flag", () => {
  const current = [
    { id: "x", severity: "critical" }
  ];
  const previous = [
    { id: "x", severity: "high" }
  ];

  const result = diffSecurity(current, previous);
  const severityDiff = result.find(d => d.id === "x" && d.severityChanged);

  assert.ok(severityDiff);
  assert.strictEqual(severityDiff.from, "high");
  assert.strictEqual(severityDiff.to, "critical");
  assert.strictEqual(severityDiff.escalated, true);
});

test("diffSecurity: detects ourStatus change", () => {
  const current = [
    { id: "x", severity: "high", ourStatus: "patched" }
  ];
  const previous = [
    { id: "x", severity: "high", ourStatus: "vulnerable" }
  ];

  const result = diffSecurity(current, previous);
  const statusDiff = result.find(d => d.id === "x" && d.ourStatusChanged);

  assert.ok(statusDiff);
  assert.strictEqual(statusDiff.from, "vulnerable");
  assert.strictEqual(statusDiff.to, "patched");
});

// Test diffProtocols
test("diffProtocols: detects new protocol", () => {
  const current = [
    { id: "new-protocol", status: "emerging" }
  ];
  const previous = [];

  const result = diffProtocols(current, previous);
  const newProto = result.find(d => d.id === "new-protocol" && d.change === "added");

  assert.ok(newProto);
});

test("diffProtocols: detects status change", () => {
  const current = [
    { id: "x", status: "growing" }
  ];
  const previous = [
    { id: "x", status: "emerging" }
  ];

  const result = diffProtocols(current, previous);
  const statusDiff = result.find(d => d.id === "x" && d.change === "status");

  assert.ok(statusDiff);
  assert.strictEqual(statusDiff.from, "emerging");
  assert.strictEqual(statusDiff.to, "growing");
});

test("diffProtocols: detects stars increase", () => {
  const current = [
    { id: "x", status: "growing", stars: 22000 }
  ];
  const previous = [
    { id: "x", status: "growing", stars: 21700 }
  ];

  const result = diffProtocols(current, previous);
  const starsDiff = result.find(d => d.id === "x" && d.change === "stars");

  assert.ok(starsDiff);
  assert.strictEqual(starsDiff.from, 21700);
  assert.strictEqual(starsDiff.to, 22000);
  assert.strictEqual(starsDiff.delta, 300);
});

test("diffProtocols: no diff for unchanged protocols", () => {
  const protocols = [
    { id: "x", status: "emerging", stars: 1000 }
  ];

  const result = diffProtocols(protocols, protocols);

  assert.strictEqual(result.length, 0);
});

// Test diffVitals
test("diffVitals: computes deltas for all vitals fields", () => {
  const current = {
    totalSpaces: 28,
    activeSpaces: 12,
    totalAgentsClaimed: 1000
  };
  const previous = {
    totalSpaces: 25,
    activeSpaces: 10,
    totalAgentsClaimed: 900
  };

  const result = diffVitals(current, previous);

  assert.strictEqual(result.totalSpaces.value, 28);
  assert.strictEqual(result.totalSpaces.delta, 3);
  assert.strictEqual(result.activeSpaces.value, 12);
  assert.strictEqual(result.activeSpaces.delta, 2);
  assert.strictEqual(result.totalAgentsClaimed.value, 1000);
  assert.strictEqual(result.totalAgentsClaimed.delta, 100);
});

test("diffVitals: computes security alert deltas", () => {
  const current = {
    securityAlerts: { critical: 3, high: 5, medium: 2, low: 1 }
  };
  const previous = {
    securityAlerts: { critical: 2, high: 5, medium: 1, low: 0 }
  };

  const result = diffVitals(current, previous);

  assert.strictEqual(result.securityAlerts.critical.value, 3);
  assert.strictEqual(result.securityAlerts.critical.delta, 1);
  assert.strictEqual(result.securityAlerts.high.value, 5);
  assert.strictEqual(result.securityAlerts.high.delta, 0);
  assert.strictEqual(result.securityAlerts.medium.value, 2);
  assert.strictEqual(result.securityAlerts.medium.delta, 1);
});

test("diffVitals: handles missing previous (first snapshot)", () => {
  const current = {
    totalSpaces: 28,
    activeSpaces: 12,
    securityAlerts: { critical: 3, high: 5, medium: 2, low: 1 }
  };

  const result = diffVitals(current, null);

  assert.strictEqual(result.totalSpaces.value, 28);
  assert.strictEqual(result.totalSpaces.delta, null);
  assert.strictEqual(result.activeSpaces.value, 12);
  assert.strictEqual(result.activeSpaces.delta, null);
  assert.strictEqual(result.securityAlerts.critical.value, 3);
  assert.strictEqual(result.securityAlerts.critical.delta, null);
});

// Test diffSnapshots (integration)
test("diffSnapshots: produces complete diff structure", () => {
  const current = {
    spaces: [
      { id: "a", status: "active", agents: 100 },
      { id: "b", status: "warning", agents: 50 }
    ],
    security: [
      { id: "alert1", severity: "critical" }
    ],
    protocols: [
      { id: "proto1", status: "growing", stars: 1000 }
    ],
    vitals: {
      totalSpaces: 2,
      activeSpaces: 1,
      securityAlerts: { critical: 1, high: 0, medium: 0, low: 0 }
    }
  };

  const previous = {
    spaces: [
      { id: "a", status: "steady", agents: 90 }
    ],
    security: [],
    protocols: [
      { id: "proto1", status: "emerging", stars: 900 }
    ],
    vitals: {
      totalSpaces: 1,
      activeSpaces: 0,
      securityAlerts: { critical: 0, high: 0, medium: 0, low: 0 }
    }
  };

  const result = diffSnapshots(current, previous);

  assert.ok(result.spaces.length > 0);
  assert.ok(result.security.length > 0);
  assert.ok(result.protocols.length > 0);
  assert.ok(result.vitals);
  assert.strictEqual(result.vitals.totalSpaces.delta, 1);
});

test("diffSnapshots: handles null previous (first snapshot)", () => {
  const current = {
    spaces: [
      { id: "a", status: "active", agents: 100 }
    ],
    security: [
      { id: "alert1", severity: "critical" }
    ],
    protocols: [
      { id: "proto1", status: "emerging" }
    ],
    vitals: {
      totalSpaces: 1,
      securityAlerts: { critical: 1, high: 0, medium: 0, low: 0 }
    }
  };

  const result = diffSnapshots(current, null);

  assert.strictEqual(result.spaces.length, 1);
  assert.strictEqual(result.spaces[0].change, "added");
  assert.strictEqual(result.security.length, 1);
  assert.strictEqual(result.security[0].isNew, true);
  assert.strictEqual(result.vitals.totalSpaces.delta, null);
});

test("diffSnapshots: identical snapshots produce zero diffs", () => {
  const snapshot = {
    spaces: [
      { id: "a", status: "active", agents: 100 }
    ],
    security: [
      { id: "alert1", severity: "critical" }
    ],
    protocols: [
      { id: "proto1", status: "emerging" }
    ],
    vitals: {
      totalSpaces: 1,
      securityAlerts: { critical: 1, high: 0, medium: 0, low: 0 }
    }
  };

  const result = diffSnapshots(snapshot, snapshot);

  assert.strictEqual(result.spaces.length, 0);
  assert.strictEqual(result.security.length, 0);
  assert.strictEqual(result.protocols.length, 0);
  assert.strictEqual(result.vitals.totalSpaces.delta, 0);
});
