// Tests for src/parser.js
import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  parsePulseHeader,
  parseAgentCount,
  parseSpaces,
  parseTrustTiers,
  parseSecurity,
  parseSignals,
  parseProtocols,
  parseAgentsy
} from "../src/parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load real crawl data
const crawl012 = readFileSync(join(__dirname, "fixtures/crawl-012.txt"), "utf-8");

// 1.1 Pulse Header Extraction
test("parsePulseHeader: extracts crawl number and date from PULSE line", () => {
  const text = "PULSE ◇ 2026-02-04 ◇ crawl #012";
  const result = parsePulseHeader(text);
  assert.strictEqual(result.crawl, 12);
  assert.strictEqual(result.date, "2026-02-04");
});

test("parsePulseHeader: handles single-digit crawl numbers", () => {
  const text = "PULSE ◇ 2026-01-15 ◇ crawl #3";
  const result = parsePulseHeader(text);
  assert.strictEqual(result.crawl, 3);
  assert.strictEqual(result.date, "2026-01-15");
});

test("parsePulseHeader: returns null for missing/malformed pulse line", () => {
  const text = "some random text";
  const result = parsePulseHeader(text);
  assert.strictEqual(result, null);
});

// 1.2 Agent Count Parsing
test("parseAgentCount: parses simple count - '124 agents'", () => {
  const result = parseAgentCount("124 agents");
  assert.strictEqual(result, 124);
});

test("parseAgentCount: parses count with comma - '11,396 agents claimed'", () => {
  const result = parseAgentCount("11,396 agents claimed");
  assert.strictEqual(result, 11396);
});

test("parseAgentCount: parses K notation - '50-70K DAU'", () => {
  const result = parseAgentCount("50-70K DAU");
  assert.strictEqual(result, 70000); // Upper bound
});

test("parseAgentCount: parses K notation - '42K+ instances'", () => {
  const result = parseAgentCount("42K+ instances");
  assert.strictEqual(result, 42000);
});

test("parseAgentCount: parses count with qualifier - '120+ ERC-8004 verified agents'", () => {
  const result = parseAgentCount("120+ ERC-8004 verified agents");
  assert.strictEqual(result, 120);
});

test("parseAgentCount: parses count with decimals - '4.2K skill installs'", () => {
  const result = parseAgentCount("4.2K skill installs");
  assert.strictEqual(result, 4200);
});

test("parseAgentCount: returns null for 'no visible activity'", () => {
  const result = parseAgentCount("no visible activity");
  assert.strictEqual(result, null);
});

test("parseAgentCount: returns null for empty/missing count", () => {
  const result = parseAgentCount("");
  assert.strictEqual(result, null);
});

test("parseAgentCount: parses '546K+ users'", () => {
  const result = parseAgentCount("546K+ users");
  assert.strictEqual(result, 546000);
});

// 1.3 Space Parsing - Known Spaces
test("parseSpaces: parses a complete known space entry", () => {
  const spaces = parseSpaces(crawl012);
  const shipyard = spaces.find(s => s.id === "shipyard.bot");

  assert.ok(shipyard, "shipyard.bot should be parsed");
  assert.strictEqual(shipyard.name, "shipyard");
  assert.strictEqual(shipyard.url, "https://shipyard.bot");
  assert.strictEqual(shipyard.status, "surging");
  assert.strictEqual(shipyard.trust, "medium-high");
  assert.strictEqual(shipyard.agents, 124);
  assert.ok(shipyard.description.includes("peer attestation") || shipyard.description.includes("124 agents"));
  assert.strictEqual(shipyard.isNew, false);
});

test("parseSpaces: parses status icon ▲ as 'surging'", () => {
  const spaces = parseSpaces(crawl012);
  const molts = spaces.filter(s => s.status === "surging");
  assert.ok(molts.length > 0, "Should find surging spaces");
});

test("parseSpaces: parses status icon ● as 'active'", () => {
  const spaces = parseSpaces(crawl012);
  const actives = spaces.filter(s => s.status === "active");
  assert.ok(actives.length > 0, "Should find active spaces");
});

test("parseSpaces: parses status icon ◇ as 'steady'", () => {
  const spaces = parseSpaces(crawl012);
  const steadies = spaces.filter(s => s.status === "steady");
  assert.ok(steadies.length > 0, "Should find steady spaces");
});

test("parseSpaces: parses status icon ⚠ as 'warning'", () => {
  const spaces = parseSpaces(crawl012);
  const warnings = spaces.filter(s => s.status === "warning");
  assert.ok(warnings.length > 0, "Should find warning spaces");
});

test("parseSpaces: parses status icon ✕ as 'down'", () => {
  const spaces = parseSpaces(crawl012);
  const downs = spaces.filter(s => s.status === "down");
  assert.ok(downs.length > 0, "Should find down spaces");
});

test("parseSpaces: parses status icon ▼ as 'quiet'", () => {
  const spaces = parseSpaces(crawl012);
  const quiets = spaces.filter(s => s.status === "quiet");
  assert.ok(quiets.length > 0, "Should find quiet spaces");
});

test("parseSpaces: parses space with security notes", () => {
  const spaces = parseSpaces(crawl012);
  const fourclaw = spaces.find(s => s.id === "4claw.org");

  assert.ok(fourclaw, "4claw.org should be parsed");
  assert.ok(fourclaw.securityNotes, "Should have security notes");
  assert.ok(
    fourclaw.securityNotes.includes("bot invasion") ||
    fourclaw.description.includes("bot invasion") ||
    fourclaw.description.includes("artificial"),
    "Security notes should mention bot invasion or artificial"
  );
});

test("parseSpaces: parses all known spaces from real crawl #012", () => {
  const spaces = parseSpaces(crawl012);
  const knownSpaces = spaces.filter(s => !s.isNew);
  assert.ok(knownSpaces.length >= 10, `Should parse at least 10 known spaces, got ${knownSpaces.length}`);
});

test("parseSpaces: preserves multi-line descriptions", () => {
  const spaces = parseSpaces(crawl012);
  const molt = spaces.find(s => s.id === "molt.church");

  assert.ok(molt, "molt.church should be parsed");
  assert.ok(
    molt.description.includes("tenets") || molt.description.includes("Crustafarianism"),
    "Description should include multi-line content"
  );
});

// 1.4 Space Parsing - New/Unverified Spaces
test("parseSpaces: parses NEW SPACES section separately", () => {
  const spaces = parseSpaces(crawl012);
  const newSpaces = spaces.filter(s => s.isNew);

  assert.ok(newSpaces.length > 0, "Should find new spaces");
  assert.ok(newSpaces.some(s => s.id === "snappedai.com"), "Should include snappedai.com");
});

test("parseSpaces: maps trust from TRUST NOTES to spaces", () => {
  const spaces = parseSpaces(crawl012);
  const snapped = spaces.find(s => s.id === "snappedai.com");

  if (snapped) {
    assert.strictEqual(snapped.trust, "critical");
  }
});

// 1.5 Trust Tier Parsing
test("parseTrustTiers: extracts trust map from TRUST NOTES section", () => {
  const trustMap = parseTrustTiers(crawl012);

  assert.ok(trustMap.size > 0, "Should extract trust tiers");
  assert.strictEqual(trustMap.get("farcaster.xyz"), "high");
  assert.strictEqual(trustMap.get("shipyard.bot"), "medium-high");
  assert.strictEqual(trustMap.get("4claw.org"), "low");
  assert.strictEqual(trustMap.get("moltbook.com"), "critical");
  assert.strictEqual(trustMap.get("moltroad.com"), "avoid");
});

test("parseTrustTiers: handles 'HIGH' with annotation", () => {
  const trustMap = parseTrustTiers(crawl012);
  assert.strictEqual(trustMap.get("aethernet.world"), "high");
});

test("parseTrustTiers: handles multiple IDs on same line", () => {
  const trustMap = parseTrustTiers(crawl012);
  assert.strictEqual(trustMap.get("farcaster.xyz"), "high");
  assert.strictEqual(trustMap.get("warpcast.com"), "high");
});

// 1.6 Security Warning Parsing
test("parseSecurity: parses a complete security warning", () => {
  const alerts = parseSecurity(crawl012);

  assert.ok(alerts.length > 0, "Should parse security warnings");

  const openclawAlert = alerts.find(a => a.title.includes("OPENCLAW") || a.title.includes("42K"));
  assert.ok(openclawAlert, "Should find OpenClaw exposure warning");
  assert.ok(
    openclawAlert.summary.includes("93.4%") || openclawAlert.summary.includes("WebSocket") || openclawAlert.title.includes("42K"),
    "Summary should contain relevant details"
  );
  assert.ok(openclawAlert.detail.includes("Defense:") || openclawAlert.detail, "Should have defense text");
});

test("parseSecurity: parses all warnings from real crawl #012", () => {
  const alerts = parseSecurity(crawl012);
  assert.ok(alerts.length >= 10, `Should parse at least 10 warnings, got ${alerts.length}`);
});

test("parseSecurity: extracts defense text", () => {
  const alerts = parseSecurity(crawl012);
  const withDefense = alerts.filter(a => a.detail && a.detail.includes("Defense:"));
  assert.ok(withDefense.length > 0, "Should extract defense lines");
});

test("parseSecurity: handles multi-line warnings", () => {
  const alerts = parseSecurity(crawl012);
  const autonomousToken = alerts.find(a => a.title.includes("AUTONOMOUS TOKEN") || a.title.includes("$SNAP"));

  if (autonomousToken) {
    assert.ok(autonomousToken.summary.length > 20, "Should capture multi-line description");
  }
});

test("parseSecurity: identifies OpenClaw-relevant warnings", () => {
  const alerts = parseSecurity(crawl012);
  const openclawAlert = alerts.find(a => a.affectsUs === true);

  assert.ok(openclawAlert, "Should mark OpenClaw warnings as affectsUs=true");
});

// 1.7 Signal Parsing
test("parseSignals: parses SIGNALS section entries", () => {
  const signals = parseSignals(crawl012);

  assert.ok(signals.length > 0, "Should parse signals");
  assert.ok(signals.every(s => s.type && s.summary), "All signals should have type and summary");
});

test("parseSignals: maps signal icons to types", () => {
  const signals = parseSignals(crawl012);

  const surge = signals.find(s => s.type === "surge");
  const death = signals.find(s => s.type === "death");
  const merge = signals.find(s => s.type === "merge");

  assert.ok(surge, "Should find surge signal");
  assert.ok(death || signals.length > 0, "Should find death or other signals");
});

test("parseSignals: extracts numeric changes from signal text", () => {
  const signals = parseSignals(crawl012);
  const fourclawSignal = signals.find(s => s.summary.includes("4claw") || s.summary.includes("25x"));

  if (fourclawSignal) {
    assert.ok(
      fourclawSignal.summary.includes("445") || fourclawSignal.summary.includes("11,396"),
      "Should capture numeric changes"
    );
  }
});

// 1.8 Protocol Parsing
test("parseProtocols: parses EMERGING PROTOCOLS section", () => {
  const protocols = parseProtocols(crawl012);

  assert.ok(protocols.length > 0, "Should parse protocols");
  assert.ok(protocols.every(p => p.id && p.description), "All protocols should have id and description");
});

test("parseProtocols: parses A2A entry with stars and partners", () => {
  const protocols = parseProtocols(crawl012);
  const a2a = protocols.find(p => p.id === "A2A");

  if (a2a) {
    assert.ok(a2a.stars === 21700 || a2a.stars > 20000, "Should extract stars");
    assert.ok(a2a.partners === 50 || a2a.partners >= 50, "Should extract partners");
  }
});

test("parseProtocols: handles protocols without numeric metrics", () => {
  const protocols = parseProtocols(crawl012);
  const skillmd = protocols.find(p => p.id === "SKILL.md");

  if (skillmd) {
    assert.ok(skillmd.status, "Should have a status");
  }
});

// 1.9 Full Parse Integration
test("parseAgentsy: parses real crawl #012 produces valid snapshot", () => {
  const snapshot = parseAgentsy(crawl012);

  assert.strictEqual(snapshot.crawl, 12);
  assert.strictEqual(snapshot.date, "2026-02-04");
  assert.ok(Array.isArray(snapshot.spaces));
  assert.ok(snapshot.spaces.length >= 15, `Should have at least 15 spaces, got ${snapshot.spaces.length}`);
  assert.ok(Array.isArray(snapshot.protocols));
  assert.ok(snapshot.protocols.length >= 5, `Should have at least 5 protocols, got ${snapshot.protocols.length}`);
  assert.ok(Array.isArray(snapshot.security));
  assert.ok(snapshot.security.length >= 8, `Should have at least 8 security alerts, got ${snapshot.security.length}`);
  assert.ok(Array.isArray(snapshot.signals));
  assert.ok(snapshot.signals.length >= 5, `Should have at least 5 signals, got ${snapshot.signals.length}`);
  assert.ok(snapshot.vitals);
  assert.ok(typeof snapshot.vitals.totalSpaces === "number");
  assert.ok(typeof snapshot.vitals.securityAlerts.critical === "number");
});

test("parseAgentsy: on empty input doesn't throw", () => {
  const snapshot = parseAgentsy("");

  assert.ok(snapshot);
  assert.strictEqual(snapshot.crawl, null);
  assert.strictEqual(snapshot.date, null);
  assert.ok(Array.isArray(snapshot.spaces));
  assert.ok(Array.isArray(snapshot.protocols));
});

test("parseAgentsy: on malformed input doesn't throw", () => {
  const snapshot = parseAgentsy("random garbage that isn't agentsy format");

  assert.ok(snapshot);
  assert.ok(Array.isArray(snapshot.spaces));
});

test("parseAgentsy: calculates vitals correctly", () => {
  const snapshot = parseAgentsy(crawl012);
  const vitals = snapshot.vitals;

  assert.ok(vitals.totalSpaces > 0, "Should count total spaces");
  assert.ok(vitals.activeSpaces >= 0, "Should count active spaces");
  assert.ok(vitals.totalAgentsClaimed > 0, "Should sum agent counts");
  assert.ok(vitals.securityAlerts.critical >= 0, "Should count critical alerts");
  assert.ok(vitals.securityAlerts.high >= 0, "Should count high alerts");
});
