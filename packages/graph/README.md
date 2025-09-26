# @academic-explorer/graph

Core graph data structures and services for Academic Explorer. Provides UI-agnostic graph logic that can be shared across CLI, SDK, and web applications.

## Main Exports

- **GraphManager** - Central graph state management with change events
- **EntityResolver** - Entity expansion and relationship resolution
- **SmartEntityCache** - Intelligent caching with field-level granularity
- **GraphRepository** - Persistent storage with IndexedDB/localStorage adapters
- **EntityDetectionService** - Auto-detection of OpenAlex entity types from IDs

## Usage

```typescript
import { GraphManager, EntityResolver, SmartEntityCache } from '@academic-explorer/graph';

const graphManager = new GraphManager();
const entityCache = new SmartEntityCache(provider);
const resolver = new EntityResolver(entityCache);

// Add entities and expand relationships
await graphManager.addEntity('A5017898742'); // OpenAlex author ID
await resolver.expandEntity('A5017898742', { depth: 2 });
```