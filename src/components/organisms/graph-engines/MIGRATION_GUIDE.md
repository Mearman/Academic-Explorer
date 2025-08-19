# Graph Engine Migration Guide

A comprehensive guide for migrating from the legacy EntityGraphVisualization to the new decoupled graph engine architecture.

---

## 🎯 Overview

This guide helps you migrate from the monolithic `EntityGraphVisualization` component to the new flexible graph engine system that supports multiple rendering backends (Cytoscape.js, D3 Force, WebGL, Canvas).

### Migration Benefits

- **Pluggable Architecture**: Switch between different rendering engines based on needs
- **Performance Optimisation**: Choose engines optimised for your graph size and requirements
- **Future-Proof**: Easy to add new engines and capabilities
- **Testing**: Better isolated testing with engine-specific test utilities
- **Maintenance**: Cleaner separation of concerns and reduced coupling

---

## 📋 Pre-Migration Checklist

Before starting your migration, ensure you understand:

- [ ] Current graph data structure and types
- [ ] Required engine capabilities (performance, features)
- [ ] Browser support requirements
- [ ] Testing coverage needs
- [ ] Performance benchmarking requirements

---

## 🔄 Migration Strategies

### Strategy 1: Gradual Migration (Recommended)

Use the compatibility adapter to migrate incrementally whilst maintaining existing functionality.

**When to Use:**
- Large codebase with extensive EntityGraphVisualization usage
- Need to maintain backward compatibility during transition
- Want to test new system before full commitment

### Strategy 2: Complete Migration

Replace EntityGraphVisualization with new engine system entirely.

**When to Use:**
- New projects or features
- Small codebase with limited usage
- Can afford breaking changes
- Want immediate access to all new features

### Strategy 3: Feature-Specific Migration

Migrate specific features to new engines whilst keeping others on legacy system.

**When to Use:**
- Different parts of app have different performance requirements
- Want to test specific engines for particular use cases
- Complex migration with multiple stakeholders

---

## 📖 Step-by-Step Migration

### Phase 1: Install Dependencies and Compatibility Layer

#### 1.1 Install New Dependencies

```bash
# Core graph engine system
pnpm add @types/d3-force d3-force d3-selection d3-drag d3-zoom

# Optional: Engine-specific dependencies (install as needed)
pnpm add cytoscape @types/cytoscape
pnpm add cytoscape-cose-bilkent cytoscape-dagre  # Layout algorithms
pnpm add three gl-matrix                         # WebGL engine
```

#### 1.2 Import Compatibility Adapter

```typescript
// Before: Direct EntityGraphVisualization usage
import { EntityGraphVisualization } from '@/components/organisms/entity-graph-visualization';

// After: Use compatibility adapter
import { EntityGraphAdapter } from '@/components/organisms/graph-engines/compatibility/EntityGraphAdapter';
```

### Phase 2: Identify Current Usage Patterns

#### 2.1 Analyse Current Props

**Legacy EntityGraphVisualization Props:**
```typescript
interface EntityGraphVisualizationProps {
  vertices: EntityGraphVertex[];
  edges: EntityGraphEdge[];
  onVertexClick?: (vertex: EntityGraphVertex) => void;
  onVertexDoubleClick?: (vertex: EntityGraphVertex) => void;
  layout?: GraphLayoutConfig;
  width?: number;
  height?: number;
  className?: string;
  sizeByVisitCount?: boolean;
  showTooltips?: boolean;
  enableSearch?: boolean;
  enableExport?: boolean;
}
```

#### 2.2 Map to New Engine System

The new system separates concerns into:
- **Graph Data** (`IGraph<TVertexData, TEdgeData>`)
- **Engine Configuration** (`IEngineConfig`)
- **Layout Configuration** (`IGraphConfig`)
- **Interaction Handlers** (Events and callbacks)

### Phase 3: Choose Target Engine

#### 3.1 Analyse Your Requirements

```typescript
import { getEngineRecommendations } from '@/components/organisms/graph-engines';

// Analyse your typical graph sizes
const vertexCount = vertices.length;  // e.g., 500
const edgeCount = edges.length;       // e.g., 1200

// Get engine recommendations
const recommendations = getEngineRecommendations(vertexCount, edgeCount);
console.log('Recommended engines:', recommendations);

/*
Example output:
{
  primary: 'cytoscape',      // Best overall choice
  alternatives: ['canvas'],   // Fallback options
  warnings: [],              // Any performance concerns
  reasons: [
    'Cytoscape handles 500 vertices efficiently',
    'Good balance of features and performance',
    'Canvas recommended for older browsers'
  ]
}
*/
```

#### 3.2 Engine Selection Guide

| Current Usage | Recommended Engine | Reason |
|---------------|-------------------|---------|
| `< 1,000 vertices` | **Canvas** | Universal compatibility, low overhead |
| `1,000 - 5,000 vertices` | **Cytoscape** | Rich features, good performance |
| `5,000 - 10,000 vertices` | **D3 Force** | Smooth animations, custom physics |
| `> 10,000 vertices` | **WebGL** | GPU acceleration, high performance |
| **Mobile users** | **Canvas** | Low battery impact |
| **Network analysis** | **Cytoscape** | Built-in graph algorithms |
| **Beautiful animations** | **D3 Force** | Physics-based movement |
| **Research/scientific** | **WebGL** | Handle massive datasets |

### Phase 4: Migrate Component Usage

#### 4.1 Using Compatibility Adapter (Zero Breaking Changes)

```typescript
// BEFORE: Legacy component
function MyGraphComponent() {
  const vertices = useEntityGraphStore(state => state.vertices);
  const edges = useEntityGraphStore(state => state.edges);
  
  return (
    <EntityGraphVisualization
      vertices={vertices}
      edges={edges}
      onVertexClick={handleVertexClick}
      layout={{ algorithm: 'force-directed' }}
      width={800}
      height={600}
      sizeByVisitCount={true}
      showTooltips={true}
      enableSearch={true}
    />
  );
}

// AFTER: Using compatibility adapter (no breaking changes!)
function MyGraphComponent() {
  const vertices = useEntityGraphStore(state => state.vertices);
  const edges = useEntityGraphStore(state => state.edges);
  
  return (
    <EntityGraphAdapter
      vertices={vertices}
      edges={edges}
      onVertexClick={handleVertexClick}
      layout={{ algorithm: 'force-directed' }}
      width={800}
      height={600}
      sizeByVisitCount={true}
      showTooltips={true}
      enableSearch={true}
      // NEW: Specify which engine to use
      preferredEngine="cytoscape"
      // NEW: Engine-specific configurations
      engineConfig={{
        cytoscapeOptions: {
          layout: {
            name: 'cose-bilkent',
            idealEdgeLength: 100
          }
        }
      }}
    />
  );
}
```

#### 4.2 Migrating to Native Engine System

```typescript
// AFTER: Full migration to new system
import { 
  GraphEngineProvider, 
  GraphVisualization 
} from '@/components/organisms/graph-core';
import { createCytoscapeEngine } from '@/components/organisms/graph-engines';

function MyGraphComponent() {
  const vertices = useEntityGraphStore(state => state.vertices);
  const edges = useEntityGraphStore(state => state.edges);
  
  // Convert legacy data to new graph structure
  const graphData = useMemo(() => ({
    vertices: vertices.map(v => ({
      id: v.id,
      data: v.metadata,
      position: v.position
    })),
    edges: edges.map(e => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      data: e.metadata
    }))
  }), [vertices, edges]);
  
  // Create engine instance
  const engine = useMemo(() => createCytoscapeEngine(), []);
  
  return (
    <GraphEngineProvider engine={engine}>
      <GraphVisualization
        graph={graphData}
        dimensions={{ width: 800, height: 600 }}
        config={{
          layout: {
            algorithm: 'cose-bilkent',
            parameters: {
              idealEdgeLength: 100,
              nodeOverlap: 20
            }
          },
          styling: {
            vertex: {
              size: (vertex) => calculateVertexRadius(vertex, true),
              color: (vertex) => getEntityColor(vertex.data.entityType),
              label: (vertex) => vertex.data.displayName
            },
            edge: {
              width: 2,
              color: '#e0e0e0',
              opacity: 0.6
            }
          }
        }}
        onVertexClick={handleVertexClick}
        onVertexDoubleClick={handleVertexDoubleClick}
      />
    </GraphEngineProvider>
  );
}
```

### Phase 5: Advanced Migration Patterns

#### 5.1 Dynamic Engine Switching

```typescript
function AdaptiveGraphComponent() {
  const vertices = useEntityGraphStore(state => state.vertices);
  const edges = useEntityGraphStore(state => state.edges);
  
  // Choose engine based on graph size and user preferences
  const engine = useMemo(() => {
    const vertexCount = vertices.length;
    const userPreference = useUserPreferences(state => state.graphEngine);
    
    if (vertexCount > 10000) {
      return createWebGLEngine();
    } else if (vertexCount > 1000 || userPreference === 'interactive') {
      return createCytoscapeEngine();
    } else if (userPreference === 'animated') {
      return createD3ForceEngine();
    } else {
      return createCanvasEngine(); // Default fallback
    }
  }, [vertices.length]);
  
  return (
    <GraphEngineProvider engine={engine}>
      <GraphVisualization
        graph={{ vertices, edges }}
        // ... rest of configuration
      />
    </GraphEngineProvider>
  );
}
```

#### 5.2 Progressive Enhancement Migration

```typescript
function ProgressiveGraphComponent() {
  const [engineReady, setEngineReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  
  // Start with compatibility adapter
  if (!engineReady || fallbackMode) {
    return (
      <EntityGraphAdapter
        vertices={vertices}
        edges={edges}
        onEngineReady={() => setEngineReady(true)}
        onError={() => setFallbackMode(true)}
        // ... other props
      />
    );
  }
  
  // Upgrade to new engine system when ready
  return (
    <NewGraphVisualizationSystem
      vertices={vertices}
      edges={edges}
      // ... new system props
    />
  );
}
```

#### 5.3 A/B Testing Migration

```typescript
function ABTestGraphComponent() {
  const abVariant = useABTest('graph-engine-migration');
  
  if (abVariant === 'new-system') {
    return (
      <NewGraphEngineSystem
        vertices={vertices}
        edges={edges}
        onInteraction={trackNewSystemUsage}
      />
    );
  }
  
  return (
    <EntityGraphVisualization
      vertices={vertices}
      edges={edges}
      onInteraction={trackLegacySystemUsage}
    />
  );
}
```

---

## 🔧 Configuration Migration

### Legacy Configuration Mapping

```typescript
// BEFORE: Legacy configuration
const legacyConfig = {
  layout: {
    algorithm: 'force-directed',
    linkDistance: 80,
    chargeStrength: -300
  },
  styling: {
    vertexColors: {
      work: '#4CAF50',
      author: '#2196F3',
      source: '#FF9800'
    }
  },
  interactions: {
    enableZoom: true,
    enablePan: true,
    enableSelection: true
  }
};

// AFTER: New engine configuration
const newEngineConfig: IGraphConfig = {
  layout: {
    algorithm: 'force-directed',
    parameters: {
      linkDistance: 80,
      chargeStrength: -300,
      centerStrength: 0.1
    }
  },
  styling: {
    vertex: {
      color: (vertex) => {
        const colors = {
          work: '#4CAF50',
          author: '#2196F3',
          source: '#FF9800'
        };
        return colors[vertex.data.entityType] || '#666';
      },
      size: (vertex) => calculateSize(vertex),
      label: (vertex) => vertex.data.displayName
    },
    edge: {
      width: 2,
      color: '#e0e0e0',
      opacity: 0.6
    }
  },
  interactions: {
    zoom: { enabled: true, min: 0.1, max: 3 },
    pan: { enabled: true },
    selection: { enabled: true, multiple: true }
  }
};
```

### Configuration Migration Utility

Use the built-in configuration migration utility:

```typescript
import { migrateLegacyConfig } from '@/components/organisms/graph-engines/compatibility';

// Automatically convert legacy configuration
const legacyConfig = { /* your existing config */ };
const migratedConfig = migrateLegacyConfig(legacyConfig);

// Use with new engine
<GraphVisualization config={migratedConfig} />
```

---

## 🧪 Testing Your Migration

### 1. Unit Testing with Engine Test Utils

```typescript
import { 
  createMockEngine,
  createTestGraph,
  engineTestUtils
} from '@/components/organisms/graph-engines/testing';

describe('Graph Migration Tests', () => {
  it('should render same graph with both systems', async () => {
    const testGraph = createTestGraph(100, 200);
    
    // Test legacy system
    const legacyComponent = render(
      <EntityGraphVisualization vertices={testGraph.vertices} edges={testGraph.edges} />
    );
    
    // Test new system  
    const newComponent = render(
      <GraphVisualization graph={testGraph} engine={createMockEngine()} />
    );
    
    // Compare rendered output
    expect(legacyComponent).toHaveGraphStructure(newComponent);
  });
  
  it('should handle same interactions in both systems', async () => {
    const mockEngine = createMockEngine();
    const onVertexClick = vi.fn();
    
    // Test interaction parity
    await engineTestUtils.simulateVertexClick(mockEngine, 'vertex-1');
    await engineTestUtils.verifyInteractionConsistency(mockEngine, onVertexClick);
  });
});
```

### 2. Performance Testing

```typescript
import { benchmarkEngine } from '@/components/organisms/graph-engines/benchmarks';

describe('Migration Performance Tests', () => {
  it('should meet performance requirements', async () => {
    const testSizes = [100, 500, 1000, 2000];
    
    for (const size of testSizes) {
      const results = await benchmarkEngine('cytoscape', { 
        vertices: size, 
        edges: size * 2 
      });
      
      expect(results.renderTime).toBeLessThan(1000); // 1 second max
      expect(results.memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB max
    }
  });
});
```

### 3. Visual Regression Testing

```typescript
import { takeEngineScreenshot } from '@/components/organisms/graph-engines/testing';

describe('Visual Regression Tests', () => {
  it('should maintain visual consistency', async () => {
    const engine = createCytoscapeEngine();
    const testGraph = createTestGraph(50, 100);
    
    // Take screenshot
    const screenshot = await takeEngineScreenshot(engine, testGraph);
    
    // Compare with baseline
    expect(screenshot).toMatchImageSnapshot({
      threshold: 0.1,
      customDiffConfig: {
        includeAA: false
      }
    });
  });
});
```

---

## 🚀 Performance Optimisation During Migration

### 1. Lazy Loading Engines

```typescript
// Lazy load engines to reduce initial bundle size
const CytoscapeEngine = lazy(() => 
  import('@/components/organisms/graph-engines/cytoscape').then(m => ({ 
    default: m.createCytoscapeEngine 
  }))
);

function LazyGraphComponent() {
  return (
    <Suspense fallback={<GraphSkeleton />}>
      <CytoscapeEngine />
    </Suspense>
  );
}
```

### 2. Memory Management

```typescript
function MemoryEfficientGraph() {
  const engineRef = useRef<IGraphEngine>();
  
  useEffect(() => {
    return () => {
      // Proper cleanup during migration
      engineRef.current?.destroy();
    };
  }, []);
  
  // Use memory-efficient patterns
  const throttledUpdate = useCallback(
    throttle((graph) => {
      engineRef.current?.updateGraph(graph);
    }, 16), // 60fps max
    []
  );
  
  return (
    <GraphVisualization
      ref={engineRef}
      onGraphChange={throttledUpdate}
    />
  );
}
```

### 3. Progressive Data Loading

```typescript
function ProgressiveGraphLoader() {
  const [loadedVertices, setLoadedVertices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Load graph data in chunks during migration
    const loadChunks = async () => {
      const allVertices = await fetchGraphVertices();
      const chunkSize = 100;
      
      for (let i = 0; i < allVertices.length; i += chunkSize) {
        const chunk = allVertices.slice(i, i + chunkSize);
        setLoadedVertices(prev => [...prev, ...chunk]);
        
        // Allow render between chunks
        await new Promise(resolve => setTimeout(resolve, 16));
      }
      
      setIsLoading(false);
    };
    
    loadChunks();
  }, []);
  
  return (
    <GraphVisualization
      vertices={loadedVertices}
      loading={isLoading}
    />
  );
}
```

---

## 🔍 Troubleshooting Common Migration Issues

### Issue 1: Engine Not Loading

**Problem:** Engine fails to initialise or shows placeholder.

```typescript
// Check engine availability
import { createEngineRegistry } from '@/components/organisms/graph-engines';

const registry = createEngineRegistry();
const engine = registry.getEngine('cytoscape');

if (!engine?.isImplemented) {
  console.warn('Cytoscape engine not implemented, using fallback');
  // Use fallback strategy
}
```

**Solution:** Verify dependencies are installed and engine is properly implemented.

### Issue 2: Performance Degradation

**Problem:** New system is slower than legacy system.

```typescript
// Profile performance during migration
import { ProfiledGraphVisualization } from '@/components/organisms/graph-engines/debugging';

function PerformanceAwareGraph() {
  return (
    <ProfiledGraphVisualization
      graph={graphData}
      onPerformanceWarning={(metrics) => {
        console.warn('Performance issue:', metrics);
        // Switch to more efficient engine
        switchToCanvasEngine();
      }}
    />
  );
}
```

**Solution:** Use performance benchmarking tools to identify bottlenecks and switch engines.

### Issue 3: Data Format Mismatches

**Problem:** Legacy data doesn't work with new engine system.

```typescript
// Use data transformation utilities
import { transformLegacyGraphData } from '@/components/organisms/graph-engines/compatibility';

const legacyData = { vertices: [...], edges: [...] };
const transformedData = transformLegacyGraphData(legacyData);

<GraphVisualization graph={transformedData} />
```

### Issue 4: Missing Features

**Problem:** New engine doesn't support required legacy features.

```typescript
// Check engine capabilities before migration
const engine = createCytoscapeEngine();
const requiredCapabilities = {
  supportsClustering: true,
  supportsCustomShapes: true
};

const canMigrate = Object.entries(requiredCapabilities).every(
  ([key, required]) => !required || engine.capabilities[key]
);

if (!canMigrate) {
  // Stay on legacy system or find alternative engine
  console.warn('Cannot migrate: missing required capabilities');
}
```

---

## ✅ Migration Validation Checklist

After completing your migration, verify:

### Functional Validation
- [ ] All graph interactions work identically
- [ ] Data displays correctly in new engine
- [ ] Performance meets requirements
- [ ] Error handling works properly
- [ ] Export functionality preserved

### Technical Validation  
- [ ] TypeScript types are correct
- [ ] No console errors or warnings
- [ ] Memory usage is reasonable
- [ ] Bundle size hasn't increased significantly
- [ ] Tests pass with new system

### User Experience Validation
- [ ] Visual appearance matches expectations
- [ ] Animation and transitions are smooth
- [ ] Loading states are appropriate
- [ ] Mobile experience is maintained
- [ ] Accessibility features preserved

---

## 📈 Migration Success Metrics

Track these metrics to measure migration success:

```typescript
// Migration metrics tracking
const migrationMetrics = {
  performance: {
    renderTime: 'Time to first render',
    interactionLatency: 'Click response time',
    memoryUsage: 'Peak memory consumption',
    bundleSize: 'JavaScript bundle size'
  },
  reliability: {
    errorRate: 'Percentage of failed renders',
    crashFrequency: 'App crashes per session',
    fallbackUsage: 'Fallback engine usage rate'
  },
  usability: {
    userSatisfaction: 'User feedback scores',
    taskCompletion: 'Graph interaction success rate',
    learningCurve: 'Time to productive use'
  }
};
```

---

## 🎉 Next Steps After Migration

1. **Monitor Performance**: Use built-in performance monitoring to track system health
2. **Gather Feedback**: Collect user feedback on new engine experience  
3. **Optimise Configuration**: Fine-tune engine settings based on actual usage
4. **Implement Advanced Features**: Take advantage of new engine capabilities
5. **Documentation**: Update internal documentation with new patterns
6. **Training**: Train team members on new architecture

---

## 📚 Additional Resources

- [Engine API Reference](./docs/API_REFERENCE.md) - Complete TypeScript API documentation
- [Performance Benchmarks](./benchmarks/performance-tests.ts) - Performance comparison tools
- [Testing Utilities](./testing/engine-test-utils.ts) - Testing helpers and mocks
- [Compatibility Layer](./compatibility/EntityGraphAdapter.tsx) - Backward compatibility adapter
- [Migration Examples](./examples/) - Complete migration examples

---

*Migration support: For complex migration scenarios or performance issues, consult the [debugging and troubleshooting documentation](./docs/TROUBLESHOOTING.md) or reach out to the development team.*