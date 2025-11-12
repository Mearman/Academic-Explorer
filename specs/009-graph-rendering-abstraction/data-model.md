# Data Model: Graph Rendering Abstraction

**Feature**: Graph Rendering Abstraction
**Date**: 2025-01-12
**Purpose**: Define entity schemas, relationships, and validation rules

## Overview

This document defines the core data entities for the graph rendering abstraction. All entities use generic type parameters to maintain domain independence per FR-017 and FR-020.

## Entity Definitions

### 1. Node<TData>

Represents a graph vertex with position, velocity, and custom metadata.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | `string` | Yes | Unique node identifier | Non-empty string; unique within graph |
| `type` | `string` | Yes | Type discriminator for visual mapping | Non-empty string |
| `x` | `number` | Yes | X-coordinate position | Finite number; no NaN/Infinity |
| `y` | `number` | Yes | Y-coordinate position | Finite number; no NaN/Infinity |
| `vx` | `number` | No | X-axis velocity (simulation) | Finite number; default 0 |
| `vy` | `number` | No | Y-axis velocity (simulation) | Finite number; default 0 |
| `fx` | `number` | No | X-axis force accumulator | Finite number; default 0 |
| `fy` | `number` | No | Y-axis force accumulator | Finite number; default 0 |
| `fixed` | `boolean` | No | Pin node to current position | Default false |
| `data` | `TData` | No | Domain-specific metadata (generic) | Any valid JSON-serializable type |

**Relationships**:
- **Source Node**: Referenced by 0+ edges as source
- **Target Node**: Referenced by 0+ edges as target

**State Transitions**:
1. **Created** í Initialized with id, type, position (x, y)
2. **Simulating** í Velocity (vx, vy) updated by forces; position updated by integrator
3. **Fixed** í Position locked, velocity zeroed, forces ignored
4. **Removed** í Deleted from graph; orphan edges become invalid

**Validation Rules**:
```typescript
function validateNode<T>(node: Node<T>): ValidationResult {
  if (!node.id || typeof node.id !== 'string') {
    return { valid: false, error: 'Node id must be non-empty string' };
  }
  if (!node.type || typeof node.type !== 'string') {
    return { valid: false, error: 'Node type must be non-empty string' };
  }
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
    return { valid: false, error: 'Node position (x, y) must be finite numbers' };
  }
  if (node.vx !== undefined && !Number.isFinite(node.vx)) {
    return { valid: false, error: 'Node velocity vx must be finite number' };
  }
  if (node.vy !== undefined && !Number.isFinite(node.vy)) {
    return { valid: false, error: 'Node velocity vy must be finite number' };
  }
  return { valid: true };
}
```

---

### 2. Edge<TData>

Represents a connection between two nodes with directionality and custom metadata.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | `string` | Yes | Unique edge identifier | Non-empty string; unique within graph |
| `type` | `string` | Yes | Type discriminator for visual mapping | Non-empty string |
| `source` | `string` | Yes | Source node ID | Must reference existing node |
| `target` | `string` | Yes | Target node ID | Must reference existing node |
| `directed` | `boolean` | No | Directionality flag (true = directed) | Default true |
| `strength` | `number` | No | Spring strength for attraction force | Finite positive number; default 1.0 |
| `distance` | `number` | No | Ideal length for spring force | Finite positive number; default 30 |
| `hidden` | `boolean` | No | Exclude from rendering but include in forces | Default false |
| `data` | `TData` | No | Domain-specific metadata (generic) | Any valid JSON-serializable type |

**Relationships**:
- **Source Node**: References one node (must exist in graph)
- **Target Node**: References one node (must exist in graph)

**State Transitions**:
1. **Created** í Initialized with id, type, source, target node references
2. **Active** í Participates in force calculations and rendering
3. **Hidden** í Participates in forces but excluded from rendering
4. **Orphaned** í Source or target node removed; edge becomes invalid
5. **Removed** í Deleted from graph

**Validation Rules** (FR-016):
```typescript
function validateEdge<T>(edge: Edge<T>, graph: Graph<any, any>): ValidationResult {
  if (!edge.id || typeof edge.id !== 'string') {
    return { valid: false, error: 'Edge id must be non-empty string' };
  }
  if (!edge.type || typeof edge.type !== 'string') {
    return { valid: false, error: 'Edge type must be non-empty string' };
  }
  if (!graph.hasNode(edge.source)) {
    return { valid: false, error: `Edge source node '${edge.source}' does not exist` };
  }
  if (!graph.hasNode(edge.target)) {
    return { valid: false, error: `Edge target node '${edge.target}' does not exist` };
  }
  if (edge.strength !== undefined && (!Number.isFinite(edge.strength) || edge.strength < 0)) {
    return { valid: false, error: 'Edge strength must be non-negative finite number' };
  }
  if (edge.distance !== undefined && (!Number.isFinite(edge.distance) || edge.distance < 0)) {
    return { valid: false, error: 'Edge distance must be non-negative finite number' };
  }
  return { valid: true };
}
```

---

### 3. Graph<TNode extends Node, TEdge extends Edge>

Container for nodes and edges with CRUD operations and validation.

**Fields**:
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `nodes` | `Map<string, TNode>` | Yes | Node storage (id í node) | Unique IDs |
| `edges` | `Map<string, TEdge>` | Yes | Edge storage (id í edge) | Unique IDs; valid references |

**Operations**:
```typescript
interface Graph<TNode extends Node, TEdge extends Edge> {
  // Node operations
  addNode(node: TNode): void;
  removeNode(id: string): void;
  getNode(id: string): TNode | undefined;
  hasNode(id: string): boolean;

  // Edge operations
  addEdge(edge: TEdge): void;
  removeEdge(id: string): void;
  getEdge(id: string): TEdge | undefined;
  hasEdge(id: string): boolean;

  // Query operations
  getNeighbors(nodeId: string): TNode[];
  getIncidentEdges(nodeId: string): TEdge[];
  getDegree(nodeId: string): number;

  // Validation
  validate(): ValidationResult;
}
```

**Invariants**:
1. **Unique IDs**: No duplicate node IDs; no duplicate edge IDs
2. **Valid References** (FR-016): All edge.source and edge.target must reference existing nodes
3. **No Self-Loops** (optional constraint): edge.source !== edge.target unless explicitly allowed
4. **No Orphan Edges**: Removing a node removes all incident edges

**Validation Rules**:
```typescript
function validateGraph<TN extends Node, TE extends Edge>(
  graph: Graph<TN, TE>
): ValidationResult {
  const errors: string[] = [];

  // Check node uniqueness
  const nodeIds = new Set<string>();
  for (const [id, node] of graph.nodes) {
    if (nodeIds.has(id)) {
      errors.push(`Duplicate node ID: ${id}`);
    }
    nodeIds.add(id);

    const nodeResult = validateNode(node);
    if (!nodeResult.valid) {
      errors.push(`Node ${id}: ${nodeResult.error}`);
    }
  }

  // Check edge uniqueness and references
  const edgeIds = new Set<string>();
  for (const [id, edge] of graph.edges) {
    if (edgeIds.has(id)) {
      errors.push(`Duplicate edge ID: ${id}`);
    }
    edgeIds.add(id);

    const edgeResult = validateEdge(edge, graph);
    if (!edgeResult.valid) {
      errors.push(`Edge ${id}: ${edgeResult.error}`);
    }
  }

  return errors.length === 0
    ? { valid: true }
    : { valid: false, error: errors.join('; ') };
}
```

---

### 4. Force<TNode, TEdge>

Function signature for applying forces to nodes based on graph structure.

**Signature**:
```typescript
type ForceFunction<TNode extends Node, TEdge extends Edge> = (
  nodes: TNode[],
  edges: TEdge[],
  alpha: number // Cooling parameter [0, 1]
) => void; // Mutates node.fx, node.fy accumulators
```

**Properties**:
| Property | Type | Description |
|----------|------|-------------|
| `strength` | `number` | Force magnitude multiplier |
| `enabled` | `boolean` | Toggle force on/off |

**Standard Forces**:
1. **Repulsion (Many-Body)**:
   - Type: Node-node interaction
   - Formula: `F = k * (qÅ * qÇ) / r≤` (Coulomb-like)
   - Use Case: Prevent node overlap
   - Strength: Negative for repulsion (e.g., -30)

2. **Attraction (Link/Spring)**:
   - Type: Edge-based interaction
   - Formula: `F = k * (d - dÄ)` (Hooke's law)
   - Use Case: Pull connected nodes together
   - Strength: Positive (e.g., 0.1)

3. **Centering**:
   - Type: Global force
   - Formula: `F = k * (center - position)`
   - Use Case: Prevent graph from drifting
   - Strength: Weak (e.g., 0.05)

4. **Collision**:
   - Type: Node-node constraint
   - Formula: `F = radius collision detection`
   - Use Case: Hard node separation
   - Strength: 1.0 (binary constraint)

**Custom Force Example** (Node-Based):
```typescript
function createCitationForce(strength: number): ForceFunction<AcademicNode, Edge> {
  return (nodes, edges, alpha) => {
    for (const node of nodes) {
      // Apply force based on citation count (domain-specific property)
      const citationCount = node.data.citations || 0;
      const repulsion = strength * Math.sqrt(citationCount) * alpha;

      // Push node away from center based on importance
      const dx = node.x - 0; // Assume center at (0, 0)
      const dy = node.y - 0;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      node.fx += (dx / distance) * repulsion;
      node.fy += (dy / distance) * repulsion;
    }
  };
}
```

---

### 5. Simulation<TNode, TEdge>

Physics engine that applies forces and updates node positions over time.

**Fields**:
| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `state` | `'running' \| 'paused' \| 'stopped'` | Yes | Simulation lifecycle state | 'stopped' |
| `alpha` | `number` | Yes | Cooling parameter [0, 1] | 1.0 |
| `alphaMin` | `number` | Yes | Target alpha value | 0.001 |
| `alphaDecay` | `number` | Yes | Alpha decay rate per tick | 0.0228 (~300 iterations) |
| `velocityDecay` | `number` | Yes | Velocity friction coefficient | 0.6 |
| `forces` | `Force[]` | Yes | Active force functions | [] |
| `nodes` | `TNode[]` | Yes | Reference to graph nodes | [] |
| `edges` | `TEdge[]` | Yes | Reference to graph edges | [] |

**State Transitions**:
```
       start()
stopped         > running
   ë                 
    stop()     pause() 
                    ì
                paused
           resume()
```

**Lifecycle Methods**:
```typescript
interface Simulation<TNode extends Node, TEdge extends Edge> {
  // Lifecycle
  start(): void;   // Begin simulation loop
  stop(): void;    // Halt and reset alpha to 1.0
  pause(): void;   // Suspend without reset
  resume(): void;  // Continue from paused state

  // Tick loop (called by RAF or worker)
  tick(dt?: number): void; // dt in seconds

  // Force management
  addForce(force: ForceFunction<TNode, TEdge>): void;
  removeForce(force: ForceFunction<TNode, TEdge>): void;

  // Configuration
  setAlphaDecay(value: number): void;
  setVelocityDecay(value: number): void;

  // Events
  on(event: 'tick' | 'end', handler: () => void): void;
}
```

**Alpha Cooling Schedule**:
```typescript
function updateAlpha(sim: Simulation): void {
  sim.alpha += (sim.alphaMin - sim.alpha) * sim.alphaDecay;

  // Stop when converged
  if (sim.alpha < sim.alphaMin) {
    sim.state = 'stopped';
    sim.emit('end');
  }
}
```

---

### 6. RendererAdapter<TNode, TEdge>

Interface for pluggable visualization implementations (Canvas, SVG, WebGL, etc.).

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `element` | `HTMLElement` | Container or canvas element |
| `visualConfig` | `VisualConfigMap<TNode, TEdge>` | Type í visual property mapping |

**Methods**:
```typescript
interface RendererAdapter<TNode extends Node, TEdge extends Edge> {
  // Lifecycle
  init(container: HTMLElement, width: number, height: number): void;
  destroy(): void;
  resize(width: number, height: number): void;

  // Rendering
  render(graph: Graph<TNode, TEdge>): void;
  clear(): void;

  // Event delegation
  on(event: 'click' | 'hover' | 'drag', handler: (target: TNode | TEdge) => void): void;
}
```

**VisualConfigMap**:
```typescript
interface NodeVisualConfig {
  size?: number;
  color?: string;
  shape?: 'circle' | 'square' | 'triangle';
  label?: (node: TNode) => string;
}

interface EdgeVisualConfig {
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  arrowStyle?: 'triangle' | 'arrow' | 'diamond';
}

interface VisualConfigMap<TNode extends Node, TEdge extends Edge> {
  node: Record<string, NodeVisualConfig>; // node.type í config
  edge: Record<string, EdgeVisualConfig>; // edge.type í config
}
```

---

## Entity Relationships

```
Graph
    nodes: Map<id, Node<TData>>
        has many: Edge (as source or target)
    edges: Map<id, Edge<TData>>
         references: Node (source)
         references: Node (target)

Simulation
    owns: Force[] (composition)
    references: Node[] (from Graph)
    references: Edge[] (from Graph)

RendererAdapter
    consumes: Graph<TNode, TEdge>
    emits: UI Events (click, hover, drag)
```

## Validation Summary

**Node Validation** (per node):
-  Non-empty id and type
-  Finite position (x, y)
-  Finite velocity/force accumulators (if present)

**Edge Validation** (per edge, FR-016):
-  Non-empty id and type
-  Source node exists in graph
-  Target node exists in graph
-  Non-negative strength and distance (if present)

**Graph Validation** (global):
-  Unique node IDs
-  Unique edge IDs
-  No orphan edges (all references valid)

**Simulation Validation**:
-  Alpha in [0, 1] range
-  AlphaDecay and velocityDecay in (0, 1) range

---

## Type Examples

### Basic Usage
```typescript
// Simple node with no custom data
type BasicNode = Node<Record<string, never>>;

// Custom node with academic metadata
interface AcademicNodeData {
  title: string;
  citations: number;
  year: number;
}
type AcademicNode = Node<AcademicNodeData>;

// Custom edge with relationship metadata
interface CollaborationEdgeData {
  coAuthorCount: number;
  firstYear: number;
}
type CollaborationEdge = Edge<CollaborationEdgeData>;

// Type-safe graph
const graph = new Graph<AcademicNode, CollaborationEdge>();
```

### Advanced Constraints
```typescript
// Constrain node data to have specific properties
interface RequiredNodeData {
  weight: number; // Required for weight-based forces
}

function createWeightedSimulation<T extends RequiredNodeData>(
  graph: Graph<Node<T>, Edge>
): Simulation<Node<T>, Edge> {
  const weightForce: ForceFunction<Node<T>, Edge> = (nodes, edges, alpha) => {
    for (const node of nodes) {
      const weight = node.data.weight;
      // Safe: TypeScript guarantees weight exists
      node.fx += weight * alpha;
    }
  };

  const sim = new Simulation(graph.nodes, graph.edges);
  sim.addForce(weightForce);
  return sim;
}
```

---

## Next Steps

1. **Implement Core Types** (Phase 1): Create TypeScript interfaces in `contracts/core-types.ts`
2. **Implement Simulation** (Phase 2): Create Simulation class in `src/simulation/engine.ts`
3. **Implement Renderers** (Phase 3): Create Canvas and SVG adapters in `src/renderers/`
4. **Add Validation** (Phase 4): Implement validation functions for all entities
5. **Add Tests** (Phase 5): Unit tests for validation, integration tests for graph operations
