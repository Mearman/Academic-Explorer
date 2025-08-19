# Graph Engine System - Academic Explorer

A fully decoupled graph visualization system that allows runtime switching between different rendering engines (CustomSVG, Cytoscape, D3 Force, WebGL, etc.).

## 🚀 Quick Start

### Basic Usage

```tsx
import { GraphEngineProvider, UniversalGraphContainer } from '@/components';

function MyApp() {
  return (
    <GraphEngineProvider>
      <UniversalGraphContainer
        width={800}
        height={600}
        showControls={true}
        showLegend={true}
        onVertexClick={(vertex) => console.log('Clicked:', vertex)}
      />
    </GraphEngineProvider>
  );
}
```

### Engine Selection

```tsx
import { GraphEngineSelector, useGraphEngine } from '@/components';

function GraphControls() {
  const { currentEngine, switchEngine, switchToOptimalEngine } = useGraphEngine();
  
  return (
    <div>
      <GraphEngineSelector
        value={currentEngine}
        onChange={switchEngine}
        showCapabilities={true}
      />
      
      <button onClick={switchToOptimalEngine}>
        Auto-Optimize
      </button>
    </div>
  );
}
```

## 🎛️ Available Engines

| Engine | Status | Max Vertices | Hardware Accelerated | Best For |
|--------|--------|-------------|---------------------|----------|
| **Custom SVG** | ✅ Ready | 1,000 | No | Small graphs, exports |
| **Canvas 2D** | 🔜 Coming Soon | 5,000 | No | Balanced performance |
| **WebGL** | 🔜 Coming Soon | 100,000+ | Yes | Large graphs |
| **D3 Force** | 🔜 Coming Soon | 2,000 | No | Physics simulation |
| **Cytoscape** | 🔜 Coming Soon | 10,000 | No | Analysis features |
| **vis-network** | 🔜 Coming Soon | 3,000 | No | Interactive networks |

## 📊 Performance Monitoring

```tsx
import { EnginePerformanceIndicator } from '@/components';

function PerformanceMonitor() {
  return (
    <EnginePerformanceIndicator
      autoHide={false}
      showHistory={true}
      position="top-right"
    />
  );
}
```

## ⚙️ Engine Configuration

```tsx
import { EngineConfigPanel } from '@/components';

function Settings() {
  return (
    <EngineConfigPanel
      compact={false}
      showAdvanced={true}
      showPreview={true}
      onChange={(config) => console.log('Config:', config)}
    />
  );
}
```

## 🔧 Engine Comparison

```tsx
import { EngineComparisonModal } from '@/components';

function CompareEngines() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Compare Engines
      </button>
      
      <EngineComparisonModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onEngineSelect={(engineId) => console.log('Selected:', engineId)}
      />
    </>
  );
}
```

## 🎯 Integration with Existing Components

The system is designed to be a drop-in replacement for existing graph components:

### GraphSection Update

```tsx
// Before
<EntityGraphVisualization
  height={600}
  onVertexClick={handleClick}
  showControls={true}
  showLegend={true}
/>

// After - with engine switching
<UniversalGraphContainer
  height={600}
  onVertexClick={handleClick}
  showControls={true}
  showLegend={true}
  showEngineSelector={true}  // New feature
/>
```

## 🧪 Demo Component

Try out the complete demo:

```tsx
import { GraphEngineDemo } from '@/components/organisms/graph-core/examples/GraphEngineDemo';

function App() {
  return <GraphEngineDemo />;
}
```

## 🏗️ Architecture

```
Graph Data Store (EntityGraphStore)
         ↓
    GraphEngineProvider (React Context)
         ↓
    Engine Registry & Selection
         ↓
┌─────────────────────────────────────┐
│  IGraphEngine Interface             │
├─────────────────────────────────────┤
│  • CustomSVGEngine (✅ Ready)      │
│  • CytoscapeEngine (🔜 Planned)   │
│  • D3ForceEngine (🔜 Planned)     │
│  • WebGLEngine (🔜 Planned)       │
│  • CanvasEngine (🔜 Planned)      │
└─────────────────────────────────────┘
         ↓
    UniversalGraphContainer
         ↓
    Rendered Graph Visualization
```

## 🚀 Features

### ✅ Completed
- **Runtime Engine Switching** - Switch between engines without losing data
- **Performance Monitoring** - Real-time FPS, memory, and render time tracking
- **Smart Recommendations** - Automatic engine selection based on graph characteristics
- **Capability Detection** - Visual indicators of engine features and limitations
- **Smooth Transitions** - Animated engine switches with data preservation
- **Configuration Management** - Engine-specific settings and presets
- **Custom SVG Engine** - Full implementation wrapping existing SVG components
- **Error Boundaries** - Graceful handling of engine failures with fallbacks

### 🔜 Planned
- **Cytoscape.js Integration** - Professional graph analysis with advanced algorithms
- **D3 Force Simulation** - Physics-based layouts with WebGL acceleration  
- **WebGL Renderer** - High-performance rendering for large graphs (100k+ nodes)
- **Canvas 2D Engine** - Balanced performance for medium-sized graphs
- **vis-network Engine** - Interactive networks with built-in clustering

## 📝 API Reference

### GraphEngineProvider Props
```typescript
interface GraphEngineProviderProps {
  children: React.ReactNode;
  defaultEngine?: string;           // Default engine ID
  preloadEngines?: string[];        // Engines to preload
  onEngineChange?: (engineId: string) => void;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
}
```

### UniversalGraphContainer Props
```typescript
interface UniversalGraphContainerProps {
  width?: number;
  height?: number;
  showControls?: boolean;
  showLegend?: boolean;
  showEngineSelector?: boolean;     // Show engine dropdown
  defaultEngine?: string;           // Override provider default
  onVertexClick?: (vertex: EntityGraphVertex) => void;
  onEngineChange?: (engineId: string) => void;
  className?: string;
}
```

### useGraphEngine Hook
```typescript
interface GraphEngineHook {
  currentEngine: string;
  availableEngines: GraphEngine[];
  switchEngine: (engineId: string) => Promise<void>;
  switchToOptimalEngine: () => Promise<void>;
  isTransitioning: boolean;
  performanceMetrics: PerformanceMetrics;
  getEngineById: (id: string) => GraphEngine | undefined;
}
```

## 🎨 Styling

All components use the existing Vanilla Extract design system with consistent:
- Color schemes and entity colors
- Typography and spacing tokens
- Responsive breakpoints
- Dark/light theme support

## 🧪 Testing

The system includes comprehensive testing utilities:

```tsx
import { createMockGraphEngine, simulateEngineInteraction } from '@/components/organisms/graph-core/testing';

// Test engine implementations
const mockEngine = createMockGraphEngine('test-engine');

// Simulate user interactions
simulateEngineInteraction(mockEngine, 'click', { x: 100, y: 100 });
```

## 📱 Mobile Support

All components are fully responsive and include:
- Touch-optimized interactions
- Mobile-specific layouts  
- Responsive grid systems
- Accessible touch targets

This system provides a foundation for expanding graph visualization capabilities while maintaining backward compatibility with existing Academic Explorer components.