// Tests for filters.js
import { test } from "node:test";
import assert from "node:assert";
import { filterAffectsUs, filterChangesOnly, sortBySeverity, sortSignalsByDate, isRelevantToUs } from "../src/filters.js";

// Test isRelevantToUs
test("isRelevantToUs: returns true for security alerts where affectsUs === true", () => {
  const alert = { id: "alert1", severity: "critical", affectsUs: true };
  assert.strictEqual(isRelevantToUs(alert), true);
});

test("isRelevantToUs: returns false for security alerts where affectsUs === false", () => {
  const alert = { id: "alert1", severity: "critical", affectsUs: false };
  assert.strictEqual(isRelevantToUs(alert), false);
});

test("isRelevantToUs: returns true for protocols with relevanceToUs high", () => {
  const protocol = { id: "proto1", relevanceToUs: "high" };
  assert.strictEqual(isRelevantToUs(protocol), true);
});

test("isRelevantToUs: returns false for protocols with relevanceToUs low", () => {
  const protocol = { id: "proto1", relevanceToUs: "low" };
  assert.strictEqual(isRelevantToUs(protocol), false);
});

test("isRelevantToUs: returns true for defined OpenClaw spaces", () => {
  const space1 = { id: "clawnews.org", status: "active" };
  const space2 = { id: "shipyard.bot", status: "active" };

  assert.strictEqual(isRelevantToUs(space1), true);
  assert.strictEqual(isRelevantToUs(space2), true);
});

test("isRelevantToUs: returns false for non-OpenClaw spaces", () => {
  const space = { id: "random-space.com", status: "active" };
  assert.strictEqual(isRelevantToUs(space), false);
});

// Test filterAffectsUs
test("filterAffectsUs: includes security alerts where affectsUs === true", () => {
  const security = [
    { id: "alert1", affectsUs: true },
    { id: "alert2", affectsUs: false },
    { id: "alert3", affectsUs: true }
  ];

  const result = filterAffectsUs([], security, []);

  assert.strictEqual(result.security.length, 2);
  assert.strictEqual(result.security[0].id, "alert1");
  assert.strictEqual(result.security[1].id, "alert3");
});

test("filterAffectsUs: includes protocols with relevanceToUs high", () => {
  const protocols = [
    { id: "proto1", relevanceToUs: "high" },
    { id: "proto2", relevanceToUs: "low" },
    { id: "proto3", relevanceToUs: "high" }
  ];

  const result = filterAffectsUs([], [], protocols);

  assert.strictEqual(result.protocols.length, 2);
  assert.strictEqual(result.protocols[0].id, "proto1");
  assert.strictEqual(result.protocols[1].id, "proto3");
});

test("filterAffectsUs: includes only defined OpenClaw spaces", () => {
  const spaces = [
    { id: "clawnews.org", status: "active" },
    { id: "random-space.com", status: "active" },
    { id: "shipyard.bot", status: "surging" },
    { id: "another-random.io", status: "down" }
  ];

  const result = filterAffectsUs(spaces, [], []);

  assert.strictEqual(result.spaces.length, 2);
  assert.strictEqual(result.spaces[0].id, "clawnews.org");
  assert.strictEqual(result.spaces[1].id, "shipyard.bot");
});

test("filterAffectsUs: returns empty arrays when nothing matches", () => {
  const spaces = [{ id: "random.com", status: "active" }];
  const security = [{ id: "alert1", affectsUs: false }];
  const protocols = [{ id: "proto1", relevanceToUs: "low" }];

  const result = filterAffectsUs(spaces, security, protocols);

  assert.strictEqual(result.spaces.length, 0);
  assert.strictEqual(result.security.length, 0);
  assert.strictEqual(result.protocols.length, 0);
});

// Test filterChangesOnly
test("filterChangesOnly: returns only items that appear in diff", () => {
  const data = [
    { id: "a", status: "active" },
    { id: "b", status: "active" },
    { id: "c", status: "active" },
    { id: "d", status: "active" },
    { id: "e", status: "active" }
  ];

  const diff = [
    { id: "a", change: "status" },
    { id: "c", change: "agents" }
  ];

  const result = filterChangesOnly(data, diff);

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "a");
  assert.strictEqual(result[1].id, "c");
});

test("filterChangesOnly: returns empty array when no changes", () => {
  const data = [
    { id: "a", status: "active" },
    { id: "b", status: "active" }
  ];

  const diff = [];

  const result = filterChangesOnly(data, diff);

  assert.strictEqual(result.length, 0);
});

test("filterChangesOnly: includes both added and modified items", () => {
  const data = [
    { id: "new", status: "active" },
    { id: "modified", status: "warning" },
    { id: "unchanged", status: "active" }
  ];

  const diff = [
    { id: "new", change: "added" },
    { id: "modified", change: "status" }
  ];

  const result = filterChangesOnly(data, diff);

  assert.strictEqual(result.length, 2);
  assert.ok(result.find(r => r.id === "new"));
  assert.ok(result.find(r => r.id === "modified"));
  assert.ok(!result.find(r => r.id === "unchanged"));
});

// Test sortBySeverity
test("sortBySeverity: sorts critical before high before medium before low before info", () => {
  const alerts = [
    { id: "a", severity: "low" },
    { id: "b", severity: "critical" },
    { id: "c", severity: "high" },
    { id: "d", severity: "info" },
    { id: "e", severity: "medium" }
  ];

  const result = sortBySeverity(alerts);

  assert.strictEqual(result[0].severity, "critical");
  assert.strictEqual(result[1].severity, "high");
  assert.strictEqual(result[2].severity, "medium");
  assert.strictEqual(result[3].severity, "low");
  assert.strictEqual(result[4].severity, "info");
});

test("sortBySeverity: stable sort - items with same severity maintain order", () => {
  const alerts = [
    { id: "a", severity: "high" },
    { id: "b", severity: "high" },
    { id: "c", severity: "high" }
  ];

  const result = sortBySeverity(alerts);

  // All should remain in same order
  assert.strictEqual(result[0].id, "a");
  assert.strictEqual(result[1].id, "b");
  assert.strictEqual(result[2].id, "c");
});

test("sortBySeverity: pins affectsUs=true before same-severity alerts without", () => {
  const alerts = [
    { id: "a", severity: "high", affectsUs: false },
    { id: "b", severity: "high", affectsUs: true },
    { id: "c", severity: "high", affectsUs: false }
  ];

  const result = sortBySeverity(alerts);

  // affectsUs=true should be first
  assert.strictEqual(result[0].id, "b");
  assert.strictEqual(result[0].affectsUs, true);
});

test("sortBySeverity: does not mutate original array", () => {
  const alerts = [
    { id: "a", severity: "low" },
    { id: "b", severity: "critical" }
  ];

  const original = [...alerts];
  sortBySeverity(alerts);

  assert.deepStrictEqual(alerts, original);
});

// Test sortSignalsByDate
test("sortSignalsByDate: sorts newest first", () => {
  const signals = [
    { id: "a", date: "2026-02-03" },
    { id: "b", date: "2026-02-04" },
    { id: "c", date: "2026-02-02" }
  ];

  const result = sortSignalsByDate(signals);

  assert.strictEqual(result[0].date, "2026-02-04");
  assert.strictEqual(result[1].date, "2026-02-03");
  assert.strictEqual(result[2].date, "2026-02-02");
});

test("sortSignalsByDate: handles signals without dates (pushed to end)", () => {
  const signals = [
    { id: "a", date: "2026-02-03" },
    { id: "b", date: null },
    { id: "c", date: "2026-02-04" },
    { id: "d", date: undefined }
  ];

  const result = sortSignalsByDate(signals);

  assert.strictEqual(result[0].date, "2026-02-04");
  assert.strictEqual(result[1].date, "2026-02-03");
  assert.ok(!result[2].date);
  assert.ok(!result[3].date);
});

test("sortSignalsByDate: does not mutate original array", () => {
  const signals = [
    { id: "a", date: "2026-02-03" },
    { id: "b", date: "2026-02-04" }
  ];

  const original = [...signals];
  sortSignalsByDate(signals);

  assert.deepStrictEqual(signals, original);
});
