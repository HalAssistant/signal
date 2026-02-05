// Force-directed graph layout engine for SIGNAL dashboard
// Pure math, no canvas — produces (x, y) coordinates
// ES module exports only, zero dependencies

const MIN_RADIUS = 8;
const MAX_RADIUS = 40;

// Physics constants
const COULOMB_CONSTANT = 5000; // Repulsion strength
const SPRING_CONSTANT = 0.01; // Attraction strength
const SPRING_LENGTH = 100; // Ideal edge length
const DAMPING = 0.85; // Velocity damping (friction)
const GRAVITY_STRENGTH = 0.5; // Base gravity toward center
const ENERGY_THRESHOLD = 0.1; // Convergence threshold

/**
 * Calculate node radius based on agent count (logarithmic scale)
 * @param {number|null} agents - Agent count
 * @returns {number} Radius in pixels
 */
export function getNodeRadius(agents) {
  if (agents === null || agents === undefined || agents <= 0) {
    return MIN_RADIUS;
  }

  // Logarithmic scale: log(agents + 1)
  const logValue = Math.log(agents + 1);
  const logMin = Math.log(1); // 0
  const logMax = Math.log(546001); // ~13.2

  // Map to radius range
  const normalized = (logValue - logMin) / (logMax - logMin);
  const radius = MIN_RADIUS + normalized * (MAX_RADIUS - MIN_RADIUS);

  // Clamp to max
  return Math.min(radius, MAX_RADIUS);
}

/**
 * Get gravity strength toward center based on trust tier
 * @param {string} trust - Trust tier
 * @returns {number} Gravity multiplier (0.0 to 1.0)
 */
export function getTrustGravity(trust) {
  const gravityMap = {
    high: 1.0,
    "medium-high": 0.8,
    medium: 0.5,
    low: 0.2,
    critical: 0.1,
    avoid: 0.0
  };

  return gravityMap[trust] !== undefined ? gravityMap[trust] : 0.5;
}

/**
 * Create initial graph state
 * @param {Array} spaces - Space objects from parser
 * @param {Array} edges - Array of { source, target, type }
 * @param {Object} options - { width, height }
 * @returns {Object} GraphState
 */
export function createGraph(spaces, edges, options = {}) {
  const width = options.width || 800;
  const height = options.height || 600;
  const centerX = width / 2;
  const centerY = height / 2;

  // Create nodes with random initial positions
  const nodes = spaces.map(space => ({
    id: space.id,
    x: centerX + (Math.random() - 0.5) * 200, // Random near center
    y: centerY + (Math.random() - 0.5) * 200,
    vx: 0,
    vy: 0,
    radius: getNodeRadius(space.agents),
    trust: space.trust,
    status: space.status,
    agents: space.agents,
    // Copy other space properties
    ...space
  }));

  return {
    nodes,
    edges,
    width,
    height,
    energy: Infinity
  };
}

/**
 * Run one simulation step
 * @param {Object} state - Current GraphState
 * @returns {Object} Updated GraphState
 */
export function stepSimulation(state) {
  const { nodes, edges, width, height } = state;
  const centerX = width / 2;
  const centerY = height / 2;

  // Create new nodes array (immutable update)
  const newNodes = nodes.map(node => ({ ...node }));

  // Reset forces
  newNodes.forEach(node => {
    node.fx = 0;
    node.fy = 0;
  });

  // Apply Coulomb repulsion between all nodes
  for (let i = 0; i < newNodes.length; i++) {
    for (let j = i + 1; j < newNodes.length; j++) {
      const n1 = newNodes[i];
      const n2 = newNodes[j];

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq) || 0.1; // Avoid division by zero

      // Coulomb force: F = k / r^2
      const force = COULOMB_CONSTANT / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      n1.fx -= fx;
      n1.fy -= fy;
      n2.fx += fx;
      n2.fy += fy;
    }
  }

  // Apply spring attraction along edges
  const nodeMap = new Map(newNodes.map(n => [n.id, n]));

  edges.forEach(edge => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);

    if (!source || !target) return;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;

    // Spring force: F = k * (dist - idealLength)
    const displacement = dist - SPRING_LENGTH;
    const force = SPRING_CONSTANT * displacement;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    source.fx += fx;
    source.fy += fy;
    target.fx -= fx;
    target.fy -= fy;
  });

  // Apply gravity toward center (modulated by trust)
  newNodes.forEach(node => {
    const dx = centerX - node.x;
    const dy = centerY - node.y;
    const trustGravity = getTrustGravity(node.trust);
    const gravity = GRAVITY_STRENGTH * trustGravity;

    node.fx += dx * gravity * 0.01;
    node.fy += dy * gravity * 0.01;
  });

  // Update velocities and positions
  let totalEnergy = 0;

  newNodes.forEach(node => {
    // Update velocity
    node.vx = (node.vx + node.fx) * DAMPING;
    node.vy = (node.vy + node.fy) * DAMPING;

    // Update position
    node.x += node.vx;
    node.y += node.vy;

    // Enforce boundaries
    const padding = node.radius;
    node.x = Math.max(padding, Math.min(width - padding, node.x));
    node.y = Math.max(padding, Math.min(height - padding, node.y));

    // Calculate kinetic energy
    totalEnergy += node.vx * node.vx + node.vy * node.vy;
  });

  return {
    ...state,
    nodes: newNodes,
    energy: totalEnergy
  };
}

/**
 * Run simulation until convergence or max iterations
 * @param {Object} state - Initial GraphState
 * @param {number} maxIterations - Max steps (default 200)
 * @returns {Object} Final GraphState
 */
export function runSimulation(state, maxIterations = 200) {
  let currentState = state;

  for (let i = 0; i < maxIterations; i++) {
    currentState = stepSimulation(currentState);

    // Check for convergence
    if (currentState.energy < ENERGY_THRESHOLD) {
      break;
    }
  }

  return currentState;
}

/**
 * Find node at given point
 * @param {Object} state - GraphState
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object|null} Node at point or null
 */
export function hitTest(state, x, y) {
  let closestNode = null;
  let closestDist = Infinity;

  for (const node of state.nodes) {
    const dx = x - node.x;
    const dy = y - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if point is within node's radius
    if (dist <= node.radius) {
      if (dist < closestDist) {
        closestDist = dist;
        closestNode = node;
      }
    }
  }

  return closestNode;
}
