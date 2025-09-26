# @academic-explorer/simulation

Force-directed graph simulation engine for Academic Explorer. Pure algorithmic APIs for deterministic graph layout with D3-force integration and web worker support.

## Main Exports

- `ForceSimulationEngine` - Core D3-force simulation wrapper with seeded random
- `AutoSimulationManager` - Intelligent simulation triggering based on graph state
- Types: `SimulationNode`, `SimulationLink`, `ForceSimulationConfig`
- Events: `SimulationEvent`, `SimulationProgressEvent`

## Usage

```typescript
import { ForceSimulationEngine } from '@academic-explorer/simulation';

const engine = new ForceSimulationEngine({ seed: 0x12345678 });
engine.setData(nodes, links);
engine.start();
```

Web worker: `import('@academic-explorer/simulation/worker')`