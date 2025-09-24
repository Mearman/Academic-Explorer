# @academic-explorer/simulation

Pure force-directed graph simulation engine for Academic Explorer. Framework-agnostic APIs for graph layout with D3-force integration.

## Features

- **Pure Algorithm APIs**: No React/UI dependencies, works with any framework
- **Deterministic Simulation**: Seeded random number generation for consistent layouts
- **Event-Driven Architecture**: Framework-agnostic event system for progress tracking
- **D3-Force Integration**: Built on industry-standard D3-force simulation
- **TypeScript**: Full type safety with comprehensive type definitions
- **Configurable Forces**: Complete control over link, charge, center, and collision forces

## Installation

```bash
# In workspace projects
pnpm add @academic-explorer/simulation

# External projects
npm install @academic-explorer/simulation
```

## Quick Start

```typescript
import { ForceSimulationEngine, DEFAULT_FORCE_PARAMS } from '@academic-explorer/simulation';

// Create simulation engine with event handlers
const engine = new ForceSimulationEngine({
  config: DEFAULT_FORCE_PARAMS
});

// Listen to simulation events
engine.on('progress', (event) => {
  console.log('Simulation progress:', event.positions);
});

engine.on('complete', (event) => {
  console.log('Simulation complete:', event.reason);
});

// Start simulation with nodes and links
engine.start({
  nodes: [
    { id: 'node1', x: 0, y: 0 },
    { id: 'node2', x: 100, y: 100 }
  ],
  links: [
    { id: 'link1', source: 'node1', target: 'node2' }
  ]
});
```

## API Reference

### Types

#### `SimulationNode`
```typescript
interface SimulationNode {
  id: string;
  type?: string;
  x?: number;
  y?: number;
  fx?: number | null; // Fixed position
  fy?: number | null;
  vx?: number; // Velocity
  vy?: number;
}
```

#### `SimulationLink`
```typescript
interface SimulationLink {
  id: string;
  source: string | SimulationNode;
  target: string | SimulationNode;
}
```

#### `ForceSimulationConfig`
```typescript
interface ForceSimulationConfig {
  // Simulation parameters
  targetFPS?: number;
  maxIterations?: number;
  alphaDecay?: number;
  velocityDecay?: number;
  seed?: number;

  // Force parameters
  linkDistance?: number;
  linkStrength?: number;
  chargeStrength?: number;
  centerStrength?: number;
  collisionRadius?: number;
  collisionStrength?: number;
}
```

### Classes

#### `ForceSimulationEngine`

Main simulation engine class with event-driven API.

**Constructor Options:**
```typescript
interface ForceSimulationEngineOptions {
  logger?: Logger;
  config?: ForceSimulationConfig;
  progressThrottleMs?: number;
  fpsIntervalMs?: number;
}
```

**Methods:**
- `start(params)` - Start simulation with nodes and links
- `stop()` - Stop simulation
- `pause()` - Pause simulation
- `resume()` - Resume simulation
- `updateParameters(config)` - Update force parameters
- `updateNodes(nodes, pinnedNodes?, alpha?)` - Update node positions
- `updateLinks(links, alpha?)` - Update link connections
- `on(eventType, handler)` - Subscribe to events
- `getPositions()` - Get current node positions

#### `AutoSimulationManager`

Intelligent simulation triggering based on graph state.

```typescript
const manager = new AutoSimulationManager({
  minNodeThreshold: 5,
  logger: myLogger
});

const decision = manager.update({
  nodeCount: 10,
  isWorkerReady: true,
  useAnimation: true,
  isRunning: false
});

if (decision.shouldApplyLayout) {
  // Start simulation
}
```

### Events

#### `SimulationProgressEvent`
```typescript
interface SimulationProgressEvent {
  type: "progress";
  messageType: "started" | "tick" | "paused" | "resumed" | "parameters_updated";
  positions?: NodePosition[];
  alpha?: number;
  iteration?: number;
  fps?: number;
  nodeCount?: number;
  linkCount?: number;
}
```

#### `SimulationCompleteEvent`
```typescript
interface SimulationCompleteEvent {
  type: "complete";
  reason: "converged" | "max-iterations" | "stopped";
  positions: NodePosition[];
  totalIterations: number;
  finalAlpha: number;
}
```

### Utilities

#### D3 Force Utils
```typescript
import { setForceStrength, setForceDistance, hasStrength } from '@academic-explorer/simulation';

// Safe force manipulation without type assertions
if (hasStrength(force)) {
  setForceStrength({ force, strength: 0.5 });
}
```

## Configuration

### Default Parameters
```typescript
export const DEFAULT_FORCE_PARAMS = {
  linkDistance: 200,
  linkStrength: 0.05,
  chargeStrength: -1000,
  centerStrength: 0.01,
  collisionRadius: 120,
  collisionStrength: 1.0,
  velocityDecay: 0.1,
  alphaDecay: 0.03,
  maxIterations: 1000,
  seed: 0x12345678,
  targetFPS: 60,
  sendEveryNTicks: 1,
  enableOptimizations: true,
  batchUpdates: true,
};
```

### Force Parameters

- **linkDistance**: Target distance between connected nodes (10-300)
- **linkStrength**: Strength of link forces (0-1)
- **chargeStrength**: Node repulsion strength (-3000 to 0)
- **centerStrength**: Centering force strength (0-0.1)
- **collisionRadius**: Minimum distance between nodes (10-200)
- **collisionStrength**: Collision detection strength (0-2)
- **velocityDecay**: Friction coefficient (0-1)
- **alphaDecay**: Simulation cooling rate (0.001-0.1)

## Integration Examples

### React Integration
```typescript
import { useEffect, useState } from 'react';
import { ForceSimulationEngine } from '@academic-explorer/simulation';

function useForceSimulation(nodes, links) {
  const [positions, setPositions] = useState([]);
  const [engine] = useState(() => new ForceSimulationEngine());

  useEffect(() => {
    const unsubscribe = engine.on('progress', (event) => {
      if (event.positions) {
        setPositions(event.positions);
      }
    });

    return unsubscribe.unsubscribe;
  }, [engine]);

  useEffect(() => {
    if (nodes.length > 0) {
      engine.start({ nodes, links });
    }
  }, [nodes, links, engine]);

  return positions;
}
```

### Web Worker Integration
```typescript
// worker.ts
import { ForceSimulationEngine } from '@academic-explorer/simulation';

const engine = new ForceSimulationEngine();

engine.on('progress', (event) => {
  self.postMessage({
    type: 'SIMULATION_PROGRESS',
    payload: event
  });
});

self.addEventListener('message', (e) => {
  if (e.data.type === 'START_SIMULATION') {
    engine.start(e.data.payload);
  }
});
```

## Architecture

This package is designed with the following principles:

1. **Framework Agnostic**: No React or UI framework dependencies
2. **Pure Functions**: Deterministic algorithms with predictable outputs
3. **Event-Driven**: Observable pattern for real-time updates
4. **Type Safety**: Comprehensive TypeScript definitions
5. **Testable**: Isolated logic that can be unit tested
6. **Performant**: Optimized for large graphs with throttling controls

## License

MIT - See LICENSE file for details.

## Contributing

This package is part of the Academic Explorer monorepo. See the main README for contribution guidelines.