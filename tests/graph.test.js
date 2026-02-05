// Tests for graph.js
import { test } from "node:test";
import assert from "node:assert";
import { createGraph, stepSimulation, runSimulation, getNodeRadius, getTrustGravity, hitTest } from "../src/graph.js";

// Test getNodeRadius
test("getNodeRadius: scales logarithmically with agent count", () => {
  const r10 = getNodeRadius(10);
  const r100 = getNodeRadius(100);
  const r1000 = getNodeRadius(1000);

  assert.ok(r10 < r100);
  assert.ok(r100 < r1000);
});

test("getNodeRadius: log scale compresses large values", () => {
  const r100 = getNodeRadius(100);
  const r10000 = getNodeRadius(10000);
  const r100000 = getNodeRadius(100000);

  const diff1 = r10000 - r100;
  const diff2 = r100000 - r10000;

  // Difference should decrease (log compression)
  assert.ok(diff2 < diff1);
});

test("getNodeRadius: null agent count returns minimum radius", () => {
  const radius = getNodeRadius(null);
  assert.strictEqual(radius, 8); // MIN_RADIUS
});

test("getNodeRadius: zero agents returns minimum radius", () => {
  const radius = getNodeRadius(0);
  assert.strictEqual(radius, 8); // MIN_RADIUS
});

test("getNodeRadius: very large count does not exceed max radius", () => {
  const radius = getNodeRadius(546000);
  assert.ok(radius <= 40); // MAX_RADIUS
});

// Test getTrustGravity
test("getTrustGravity: HIGH trust has strongest center gravity", () => {
  const highGravity = getTrustGravity("high");
  const mediumGravity = getTrustGravity("medium");
  const avoidGravity = getTrustGravity("avoid");

  assert.ok(highGravity > mediumGravity);
  assert.ok(highGravity > avoidGravity);
  assert.strictEqual(highGravity, 1.0);
});

test("getTrustGravity: AVOID trust has weakest center gravity", () => {
  const avoidGravity = getTrustGravity("avoid");
  assert.strictEqual(avoidGravity, 0.0);
});

test("getTrustGravity: correct ordering of trust tiers", () => {
  const high = getTrustGravity("high");
  const mediumHigh = getTrustGravity("medium-high");
  const medium = getTrustGravity("medium");
  const low = getTrustGravity("low");
  const critical = getTrustGravity("critical");
  const avoid = getTrustGravity("avoid");

  assert.ok(high > mediumHigh);
  assert.ok(mediumHigh > medium);
  assert.ok(medium > low);
  assert.ok(low > critical);
  assert.ok(critical > avoid);
});

// Test createGraph
test("createGraph: places nodes with initial positions", () => {
  const spaces = [
    { id: "a", trust: "high", status: "active", agents: 100 },
    { id: "b", trust: "medium", status: "active", agents: 200 },
    { id: "c", trust: "low", status: "warning", agents: 50 }
  ];

  const edges = [
    { source: "a", target: "b", type: "related" },
    { source: "b", target: "c", type: "related" }
  ];

  const state = createGraph(spaces, edges);

  assert.strictEqual(state.nodes.length, 3);
  assert.ok(state.nodes[0].x !== undefined);
  assert.ok(state.nodes[0].y !== undefined);
  assert.ok(state.nodes[0].vx !== undefined);
  assert.ok(state.nodes[0].vy !== undefined);
});

test("createGraph: initial positions are randomized", () => {
  const spaces = [
    { id: "a", trust: "high", status: "active", agents: 100 },
    { id: "b", trust: "medium", status: "active", agents: 200 },
    { id: "c", trust: "low", status: "warning", agents: 50 }
  ];

  const state = createGraph(spaces, []);

  // Check that not all nodes are at the same position
  const positions = state.nodes.map(n => `${n.x},${n.y}`);
  const uniquePositions = new Set(positions);

  assert.ok(uniquePositions.size > 1);
});

test("createGraph: uses default dimensions when not specified", () => {
  const spaces = [{ id: "a", trust: "high", status: "active", agents: 100 }];
  const state = createGraph(spaces, []);

  assert.strictEqual(state.width, 800);
  assert.strictEqual(state.height, 600);
});

test("createGraph: respects custom dimensions", () => {
  const spaces = [{ id: "a", trust: "high", status: "active", agents: 100 }];
  const state = createGraph(spaces, [], { width: 1000, height: 800 });

  assert.strictEqual(state.width, 1000);
  assert.strictEqual(state.height, 800);
});

// Test stepSimulation
test("stepSimulation: one step moves nodes", () => {
  const spaces = [
    { id: "a", trust: "high", status: "active", agents: 100 },
    { id: "b", trust: "medium", status: "active", agents: 200 }
  ];

  const edges = [
    { source: "a", target: "b", type: "related" }
  ];

  const state0 = createGraph(spaces, edges);
  const state1 = stepSimulation(state0);

  // Check that at least some velocities are non-zero
  const hasMovement = state1.nodes.some(n => Math.abs(n.vx) > 0.001 || Math.abs(n.vy) > 0.001);
  assert.ok(hasMovement);
});

test("stepSimulation: overlapping nodes repel each other", () => {
  const spaces = [
    { id: "a", trust: "high", status: "active", agents: 100 },
    { id: "b", trust: "medium", status: "active", agents: 200 }
  ];

  // Create state with nodes very close together
  const state = createGraph(spaces, []);
  state.nodes[0].x = 400;
  state.nodes[0].y = 300;
  state.nodes[1].x = 402; // Very close
  state.nodes[1].y = 300;
  state.nodes[0].vx = 0;
  state.nodes[0].vy = 0;
  state.nodes[1].vx = 0;
  state.nodes[1].vy = 0;

  const dist0 = Math.sqrt(
    Math.pow(state.nodes[1].x - state.nodes[0].x, 2) +
    Math.pow(state.nodes[1].y - state.nodes[0].y, 2)
  );

  // Run several steps to see clear repulsion
  let currentState = state;
  for (let i = 0; i < 5; i++) {
    currentState = stepSimulation(currentState);
  }

  const dist1 = Math.sqrt(
    Math.pow(currentState.nodes[1].x - currentState.nodes[0].x, 2) +
    Math.pow(currentState.nodes[1].y - currentState.nodes[0].y, 2)
  );

  // Distance should increase significantly (repulsion)
  assert.ok(dist1 > dist0 + 5);
});

test("stepSimulation: connected nodes attract each other", () => {
  const spaces = [
    { id: "a", trust: "high", status: "active", agents: 100 },
    { id: "b", trust: "medium", status: "active", agents: 200 }
  ];

  const edges = [
    { source: "a", target: "b", type: "related" }
  ];

  // Create state with nodes far apart
  const state = createGraph(spaces, edges);
  state.nodes[0].x = 100;
  state.nodes[0].y = 300;
  state.nodes[1].x = 700;
  state.nodes[1].y = 300;

  const dist0 = Math.sqrt(
    Math.pow(state.nodes[1].x - state.nodes[0].x, 2) +
    Math.pow(state.nodes[1].y - state.nodes[0].y, 2)
  );

  // Run a few steps to see attraction
  let currentState = state;
  for (let i = 0; i < 5; i++) {
    currentState = stepSimulation(currentState);
  }

  const dist1 = Math.sqrt(
    Math.pow(currentState.nodes[1].x - currentState.nodes[0].x, 2) +
    Math.pow(currentState.nodes[1].y - currentState.nodes[0].y, 2)
  );

  // Distance should decrease (attraction)
  assert.ok(dist1 < dist0);
});

test("stepSimulation: high-trust nodes gravitate toward center", () => {
  const spaces = [
    { id: "a", trust: "high", status: "active", agents: 100 }
  ];

  // Place node at bottom-right corner
  const state = createGraph(spaces, []);
  state.nodes[0].x = 700;
  state.nodes[0].y = 500;
  state.nodes[0].vx = 0;
  state.nodes[0].vy = 0;

  const centerX = state.width / 2;
  const centerY = state.height / 2;

  const distFromCenter0 = Math.sqrt(
    Math.pow(state.nodes[0].x - centerX, 2) +
    Math.pow(state.nodes[0].y - centerY, 2)
  );

  // Run several steps
  let currentState = state;
  for (let i = 0; i < 10; i++) {
    currentState = stepSimulation(currentState);
  }

  const distFromCenter1 = Math.sqrt(
    Math.pow(currentState.nodes[0].x - centerX, 2) +
    Math.pow(currentState.nodes[0].y - centerY, 2)
  );

  // Should move toward center
  assert.ok(distFromCenter1 < distFromCenter0);
});

test("stepSimulation: avoid-tier nodes drift toward periphery (weak gravity)", () => {
  const spaces = [
    { id: "a", trust: "avoid", status: "active", agents: 100 },
    { id: "b", trust: "high", status: "active", agents: 100 }
  ];

  // Place both at center
  const state = createGraph(spaces, []);
  state.nodes[0].x = 400;
  state.nodes[0].y = 300;
  state.nodes[1].x = 410;
  state.nodes[1].y = 300;

  const centerX = state.width / 2;
  const centerY = state.height / 2;

  const avoidDist0 = Math.sqrt(
    Math.pow(state.nodes[0].x - centerX, 2) +
    Math.pow(state.nodes[0].y - centerY, 2)
  );

  const highDist0 = Math.sqrt(
    Math.pow(state.nodes[1].x - centerX, 2) +
    Math.pow(state.nodes[1].y - centerY, 2)
  );

  // Run several steps
  let currentState = state;
  for (let i = 0; i < 20; i++) {
    currentState = stepSimulation(currentState);
  }

  const avoidDist1 = Math.sqrt(
    Math.pow(currentState.nodes[0].x - centerX, 2) +
    Math.pow(currentState.nodes[0].y - centerY, 2)
  );

  const highDist1 = Math.sqrt(
    Math.pow(currentState.nodes[1].x - centerX, 2) +
    Math.pow(currentState.nodes[1].y - centerY, 2)
  );

  // Avoid node should be farther from center than high-trust node
  assert.ok(avoidDist1 > highDist1);
});

// Test runSimulation
test("runSimulation: converges to low energy state", () => {
  const spaces = [
    { id: "a", trust: "high", status: "active", agents: 100 },
    { id: "b", trust: "medium", status: "active", agents: 200 },
    { id: "c", trust: "low", status: "warning", agents: 50 },
    { id: "d", trust: "medium-high", status: "active", agents: 150 },
    { id: "e", trust: "avoid", status: "down", agents: 25 }
  ];

  const edges = [
    { source: "a", target: "b", type: "related" },
    { source: "b", target: "c", type: "related" },
    { source: "c", target: "d", type: "related" }
  ];

  const state0 = createGraph(spaces, edges);
  const finalState = runSimulation(state0);

  // Check that velocities are near zero
  const maxVelocity = Math.max(
    ...finalState.nodes.map(n => Math.sqrt(n.vx * n.vx + n.vy * n.vy))
  );

  assert.ok(maxVelocity < 1.0);
});

test("runSimulation: converges within 200 iterations for 30 nodes", () => {
  // Create 30 nodes
  const spaces = Array.from({ length: 30 }, (_, i) => ({
    id: `node${i}`,
    trust: ["high", "medium", "low"][i % 3],
    status: "active",
    agents: (i + 1) * 10 // Deterministic agent counts
  }));

  // Create some edges
  const edges = [];
  for (let i = 0; i < 25; i++) {
    edges.push({
      source: `node${i}`,
      target: `node${i + 1}`,
      type: "related"
    });
  }

  const state0 = createGraph(spaces, edges);
  const finalState = runSimulation(state0, 200);

  // Should converge (energy should be much lower than initial)
  // With 30 nodes, we expect energy to drop significantly
  assert.ok(finalState.energy < 100);

  // Also check that it actually reduced from initial
  assert.ok(finalState.energy < state0.energy);
});

test("runSimulation: final positions are within bounds", () => {
  const spaces = [
    { id: "a", trust: "high", status: "active", agents: 100 },
    { id: "b", trust: "medium", status: "active", agents: 200 },
    { id: "c", trust: "low", status: "warning", agents: 50 }
  ];

  const edges = [
    { source: "a", target: "b", type: "related" },
    { source: "b", target: "c", type: "related" }
  ];

  const state0 = createGraph(spaces, edges);
  const finalState = runSimulation(state0);

  // Check all nodes are within bounds
  finalState.nodes.forEach(node => {
    assert.ok(node.x >= 0);
    assert.ok(node.x <= finalState.width);
    assert.ok(node.y >= 0);
    assert.ok(node.y <= finalState.height);
  });
});

// Test hitTest
test("hitTest: returns node when point is within radius", () => {
  const spaces = [
    { id: "test-node", trust: "high", status: "active", agents: 100 }
  ];

  const state = createGraph(spaces, []);
  state.nodes[0].x = 100;
  state.nodes[0].y = 100;
  state.nodes[0].radius = 15;

  // Test point inside radius
  const result = hitTest(state, 108, 108);

  assert.ok(result !== null);
  assert.strictEqual(result.id, "test-node");
});

test("hitTest: returns null when point is outside all nodes", () => {
  const spaces = [
    { id: "test-node", trust: "high", status: "active", agents: 100 }
  ];

  const state = createGraph(spaces, []);
  state.nodes[0].x = 100;
  state.nodes[0].y = 100;
  state.nodes[0].radius = 15;

  // Test point far away
  const result = hitTest(state, 999, 999);

  assert.strictEqual(result, null);
});

test("hitTest: returns closest node when overlapping", () => {
  const spaces = [
    { id: "node1", trust: "high", status: "active", agents: 100 },
    { id: "node2", trust: "medium", status: "active", agents: 200 }
  ];

  const state = createGraph(spaces, []);
  state.nodes[0].x = 100;
  state.nodes[0].y = 100;
  state.nodes[0].radius = 20;
  state.nodes[1].x = 130;
  state.nodes[1].y = 100;
  state.nodes[1].radius = 20;

  // Test point between nodes, closer to node1
  const result = hitTest(state, 110, 100);

  assert.ok(result !== null);
  assert.strictEqual(result.id, "node1");
});
