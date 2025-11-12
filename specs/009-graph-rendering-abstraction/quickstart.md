# Quickstart Guide: Graph Rendering Abstraction

**Feature**: Graph Rendering Abstraction
**Date**: 2025-01-12
**Purpose**: Developer journey from installation to first graph rendering

## Overview

This guide walks through creating your first force-directed graph visualization using the graph rendering abstraction. You'll learn how to:
1. Install the package
2. Define custom node and edge types
3. Create and populate a graph
4. Configure force simulation
5. Attach a renderer
6. Handle lifecycle events

**Time to First Render**: ~5 minutes

---

## Installation

```bash
# Install from npm (when published)
npm install @academic-explorer/graph-renderer

# Or use from monorepo (development)
# Already available via workspace dependency
```

**TypeScript Version**: Requires TypeScript 4.5+ with strict mode enabled.

---

## Basic Example: Social Network Graph

Let's create a simple social network visualization with three types of nodes (person, group, event) and two types of edges (friendship, membership).

### Step 1: Define Node and Edge Types

```typescript
import type { Node, Edge } from '@academic-explorer/graph-renderer';

// Define custom node data types
interface PersonData {
  name: string;
  age: number;
  friends: number; // Friend count affects repulsion force
}

interface GroupData {
  name: string;
  memberCount: number;
}

interface EventData {
  name: string;
  date: string;
  attendees: number;
}

// Union type for all node data
type SocialNodeData = PersonData | GroupData | EventData;

// Define custom edge data types
interface FriendshipData {
  since: string;
  strength: number; // How close the friendship
}

interface MembershipData {
  role: 'admin' | 'member' | 'guest';
  joinDate: string;
}

// Union type for all edge data
type SocialEdgeData = FriendshipData | MembershipData;

// Create typed aliases
type SocialNode = Node<SocialNodeData>;
type SocialEdge = Edge<SocialEdgeData>;
```

### Step 2: Create Graph and Add Nodes

```typescript
import { Graph } from '@academic-explorer/graph-renderer';

// Create typed graph
const graph = new Graph<SocialNode, SocialEdge>();

// Add person nodes
graph.addNode({
  id: 'alice',
  type: 'person',
  x: 0, // Initial position (will be randomized by simulation)
  y: 0,
  data: {
    name: 'Alice',
    age: 28,
    friends: 15
  }
});

graph.addNode({
  id: 'bob',
  type: 'person',
  x: 0,
  y: 0,
  data: {
    name: 'Bob',
    age: 32,
    friends: 8
  }
});

graph.addNode({
  id: 'charlie',
  type: 'person',
  x: 0,
  y: 0,
  data: {
    name: 'Charlie',
    age: 24,
    friends: 22
  }
});

// Add group node
graph.addNode({
  id: 'js-meetup',
  type: 'group',
  x: 0,
  y: 0,
  data: {
    name: 'JavaScript Meetup',
    memberCount: 150
  }
});

// Add event node
graph.addNode({
  id: 'conference',
  type: 'event',
  x: 0,
  y: 0,
  data: {
    name: 'Tech Conference 2025',
    date: '2025-03-15',
    attendees: 500
  }
});
```

### Step 3: Add Edges

```typescript
// Add friendship edges (undirected)
graph.addEdge({
  id: 'alice-bob',
  type: 'friendship',
  source: 'alice',
  target: 'bob',
  directed: false, // Friendship is bidirectional
  data: {
    since: '2020-01-15',
    strength: 0.9
  }
});

graph.addEdge({
  id: 'bob-charlie',
  type: 'friendship',
  source: 'bob',
  target: 'charlie',
  directed: false,
  data: {
    since: '2019-06-22',
    strength: 0.7
  }
});

// Add membership edges (directed)
graph.addEdge({
  id: 'alice-meetup',
  type: 'membership',
  source: 'alice',
  target: 'js-meetup',
  directed: true, // Person ’ Group
  data: {
    role: 'admin',
    joinDate: '2023-01-01'
  }
});

graph.addEdge({
  id: 'bob-meetup',
  type: 'membership',
  source: 'bob',
  target: 'js-meetup',
  directed: true,
  data: {
    role: 'member',
    joinDate: '2023-06-15'
  }
});
```

### Step 4: Configure Force Simulation

```typescript
import {
  Simulation,
  createRepulsionForce,
  createAttractionForce,
  createCenteringForce
} from '@academic-explorer/graph-renderer';

// Create simulation with graph data
const simulation = new Simulation<SocialNode, SocialEdge>(
  Array.from(graph.nodes.values()),
  Array.from(graph.edges.values()),
  {
    alpha: 1.0,        // Initial cooling (1.0 = hot start)
    alphaMin: 0.001,   // Stop when alpha drops below this
    alphaDecay: 0.0228, // ~300 iterations to converge
    velocityDecay: 0.6  // Friction coefficient
  }
);

// Add repulsion force (nodes push each other away)
simulation.addForce(
  createRepulsionForce<SocialNode, SocialEdge>({
    strength: -30,    // Negative = repulsive
    theta: 0.9,       // Barnes-Hut accuracy
    distanceMin: 1,   // Avoid singularities
    distanceMax: Infinity
  })
);

// Add attraction force (edges pull connected nodes together)
simulation.addForce(
  createAttractionForce<SocialNode, SocialEdge>({
    strength: 0.1,     // Spring constant
    distance: 30,      // Ideal edge length
    iterations: 1      // Relaxation iterations per tick
  })
);

// Add centering force (prevent graph from drifting)
simulation.addForce(
  createCenteringForce<SocialNode, SocialEdge>({
    strength: 0.05,    // Weak pull to center
    x: 400,            // Center at canvas midpoint
    y: 300
  })
);
```

### Step 5: Attach Canvas Renderer

```typescript
import { CanvasRenderer } from '@academic-explorer/graph-renderer';

// Get canvas element
const canvas = document.getElementById('graph-canvas') as HTMLCanvasElement;

// Create renderer with visual configuration
const renderer = new CanvasRenderer<SocialNode, SocialEdge>(canvas, {
  node: {
    // Person nodes: large circles, colored by friend count
    person: {
      size: (node) => 5 + Math.sqrt(node.data.friends),
      color: (node) => {
        const friends = node.data.friends;
        return friends > 20 ? '#ff6b6b' : friends > 10 ? '#4ecdc4' : '#95e1d3';
      },
      shape: 'circle',
      label: (node) => node.data.name
    },
    // Group nodes: squares, fixed size
    group: {
      size: 15,
      color: '#feca57',
      shape: 'square',
      label: (node) => node.data.name
    },
    // Event nodes: triangles, colored by attendee count
    event: {
      size: (node) => 10 + Math.log10(node.data.attendees) * 3,
      color: '#ee5a6f',
      shape: 'triangle',
      label: (node) => node.data.name
    }
  },
  edge: {
    // Friendship edges: thick, green
    friendship: {
      color: '#48bb78',
      width: (edge) => edge.data.strength * 3, // Thicker = stronger friendship
      style: 'solid'
    },
    // Membership edges: thin, dashed, with arrow
    membership: {
      color: '#4299e1',
      width: 1,
      style: 'dashed',
      arrowStyle: 'triangle' // Shows direction
    }
  }
});

// Initialize renderer
renderer.init(canvas, 800, 600);
```

### Step 6: Start Simulation and Render Loop

```typescript
// Connect simulation to renderer
simulation.on('tick', () => {
  renderer.render(graph); // Redraw with updated positions
});

simulation.on('end', () => {
  console.log('Simulation converged!');
});

// Start simulation
simulation.start();

// Render loop (60fps)
function animate(timestamp: number): void {
  simulation.tick(1 / 60); // 60fps = 16.67ms per frame
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

### Step 7: Handle User Interaction

```typescript
// Click handler
renderer.on('click', (target) => {
  if ('type' in target && target.type === 'person') {
    console.log(`Clicked on ${target.data.name}`);
    // Pin node to current position
    target.fixed = true;
  }
});

// Hover handler
renderer.on('hover', (target) => {
  if (target) {
    canvas.style.cursor = 'pointer';
  } else {
    canvas.style.cursor = 'default';
  }
});

// Drag handler
let dragTarget: SocialNode | null = null;

renderer.on('drag', (event) => {
  if (event.type === 'start') {
    dragTarget = event.target;
    dragTarget.fixed = true;
  } else if (event.type === 'move' && dragTarget) {
    dragTarget.x = event.x;
    dragTarget.y = event.y;
  } else if (event.type === 'end' && dragTarget) {
    dragTarget.fixed = false;
    dragTarget = null;
  }
});
```

---

## Advanced Example: Custom Force Based on Node Properties

Let's add a custom force that makes popular nodes (high friend count) repel more strongly:

```typescript
import type { ForceFunction } from '@academic-explorer/graph-renderer';

// Custom force: popularity-based repulsion
function createPopularityForce(strength: number): ForceFunction<SocialNode, SocialEdge> {
  return (nodes, edges, alpha) => {
    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i];

      // Only apply to person nodes
      if (nodeA.type !== 'person') continue;

      const friendsA = nodeA.data.friends;
      const popularityA = Math.sqrt(friendsA); // Sqrt for diminishing returns

      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j];

        if (nodeB.type !== 'person') continue;

        const friendsB = nodeB.data.friends;
        const popularityB = Math.sqrt(friendsB);

        // Calculate repulsion based on combined popularity
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = (strength * popularityA * popularityB * alpha) / (distance * distance);

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        // Apply equal and opposite forces
        nodeA.fx -= fx;
        nodeA.fy -= fy;
        nodeB.fx += fx;
        nodeB.fy += fy;
      }
    }
  };
}

// Add to simulation
simulation.addForce(createPopularityForce(-50));
```

---

## Hidden Edge Influence Example

Sometimes you want edge relationships to influence layout without cluttering the visualization. For example, common friends between people:

```typescript
// Add hidden edges for common friend connections
function addCommonFriendEdges(graph: Graph<SocialNode, SocialEdge>): void {
  const people = Array.from(graph.nodes.values()).filter(n => n.type === 'person');

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const personA = people[i];
      const personB = people[j];

      // Calculate common friends (simplified)
      const commonFriends = Math.min(personA.data.friends, personB.data.friends) / 2;

      if (commonFriends > 3) {
        // Add hidden edge with attraction proportional to common friends
        graph.addEdge({
          id: `hidden-${personA.id}-${personB.id}`,
          type: 'common-friends',
          source: personA.id,
          target: personB.id,
          directed: false,
          hidden: true, // Not rendered but affects forces
          strength: commonFriends * 0.02, // Subtle attraction
          distance: 50 // Keep some distance
        });
      }
    }
  }
}

addCommonFriendEdges(graph);
```

---

## Swapping Renderers

One of the key features is renderer independence. Here's how to swap from Canvas to SVG:

```typescript
import { SVGRenderer } from '@academic-explorer/graph-renderer';

// Cleanup old renderer
renderer.destroy();

// Create SVG renderer with same visual config
const svgRenderer = new SVGRenderer<SocialNode, SocialEdge>(
  document.getElementById('graph-container')!,
  {
    node: { /* same config as before */ },
    edge: { /* same config as before */ }
  }
);

svgRenderer.init(800, 600);

// Update simulation to use new renderer
simulation.off('tick'); // Remove old handler
simulation.on('tick', () => {
  svgRenderer.render(graph); // Now renders to SVG
});
```

The simulation continues running with identical physicsonly the visualization changes!

---

## Performance Monitoring

Monitor frame rate and adapt if performance degrades:

```typescript
import { PerformanceMonitor } from '@academic-explorer/graph-renderer';

const monitor = new PerformanceMonitor();

simulation.on('tick', () => {
  monitor.measureFrame(() => {
    renderer.render(graph);
  });

  const fps = monitor.getCurrentFPS();

  if (fps < 30) {
    console.warn(`Low FPS: ${fps.toFixed(1)}`);
    // Adapt: reduce simulation quality
    simulation.setAlphaDecay(0.05); // Faster convergence
  }
});
```

---

## Deterministic Layouts for Testing

For tests or reproducible visualizations, use a fixed seed:

```typescript
import { SeededRandom } from '@academic-explorer/graph-renderer';

// Initialize with fixed seed
const rng = new SeededRandom(0x12345678);

for (const node of graph.nodes.values()) {
  node.x = rng.range(-100, 100);
  node.y = rng.range(-100, 100);
}

// Same seed ’ identical layout every time
```

---

## Common Patterns

### Pattern 1: Pause/Resume Simulation

```typescript
// Pause button
document.getElementById('pause')!.addEventListener('click', () => {
  if (simulation.state === 'running') {
    simulation.pause();
  } else {
    simulation.resume();
  }
});
```

### Pattern 2: Restart Simulation

```typescript
document.getElementById('restart')!.addEventListener('click', () => {
  simulation.stop(); // Resets alpha to 1.0

  // Randomize positions
  for (const node of graph.nodes.values()) {
    node.x = Math.random() * 800;
    node.y = Math.random() * 600;
  }

  simulation.start();
});
```

### Pattern 3: Dynamic Graph Updates

```typescript
// Add new node during simulation
function addNode(id: string, type: string, data: SocialNodeData): void {
  const node: SocialNode = {
    id,
    type,
    x: 400, // Center of canvas
    y: 300,
    data
  };

  graph.addNode(node);

  // Update simulation
  simulation.updateNodes(Array.from(graph.nodes.values()));

  // Reheat simulation to accommodate new node
  simulation.setAlpha(0.3);
}
```

### Pattern 4: Filter Edges by Type

```typescript
// Show only friendship edges
function filterEdges(visibleTypes: string[]): void {
  for (const edge of graph.edges.values()) {
    edge.hidden = !visibleTypes.includes(edge.type);
  }

  renderer.render(graph); // Re-render with updated visibility
}

filterEdges(['friendship']); // Hide membership edges
```

---

## Next Steps

1. **Explore Force Parameters**: Tune strength, distance, and decay values for your use case
2. **Create Custom Forces**: Implement domain-specific force functions (see data-model.md Section 4)
3. **Integrate Web Workers**: Offload simulation to worker for larger graphs (>1000 nodes)
4. **Add Visual Effects**: Implement hover highlights, selection states, animations
5. **Performance Profiling**: Use built-in performance monitoring to optimize for your graph size

---

## API Reference

For detailed API documentation, see:
- **Core Types**: [`contracts/core-types.ts`](./contracts/core-types.ts)
- **Simulation**: [`contracts/simulation.ts`](./contracts/simulation.ts)
- **Renderers**: [`contracts/renderer.ts`](./contracts/renderer.ts)
- **Forces**: [`contracts/forces.ts`](./contracts/forces.ts)

For implementation details, see:
- **Data Model**: [`data-model.md`](./data-model.md)
- **Research Decisions**: [`research.md`](./research.md)

---

## Troubleshooting

**Q: Simulation converges too quickly**
A: Increase `alphaDecay` (smaller value = slower convergence) or increase initial `alpha`.

**Q: Nodes overlap too much**
A: Increase repulsion force strength (more negative) or add collision detection force.

**Q: Graph drifts off screen**
A: Add centering force with `strength: 0.1` or higher.

**Q: Performance issues with large graphs**
A: Enable Web Worker offloading, increase Barnes-Hut `theta` (0.95 for speed), or reduce render frequency.

**Q: TypeScript errors with custom data types**
A: Ensure your data types extend the base `Node<T>` or `Edge<T>` interfaces correctly.
