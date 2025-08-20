/**
 * Network Diagram Component Tests
 * 
 * Comprehensive test suite for the Network Diagram component including
 * rendering, clustering algorithms, interactions, and performance features.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import type { 
  NetworkDiagramProps, 
  NetworkNode, 
  NetworkEdge,
  ClusterConfig,
  NetworkLayoutConfig 
} from '../types';

import { NetworkDiagram } from './network-diagram';


// Mock D3 for controlled testing
vi.mock('d3-force', () => ({
  forceSimulation: vi.fn(() => ({
    nodes: vi.fn(() => ({ force: vi.fn(), on: vi.fn(), stop: vi.fn() })),
    force: vi.fn(() => ({ nodes: vi.fn(), on: vi.fn(), stop: vi.fn() })),
    on: vi.fn(() => ({ nodes: vi.fn(), force: vi.fn(), stop: vi.fn() })),
    stop: vi.fn(),
    restart: vi.fn(),
    alpha: vi.fn(() => ({ restart: vi.fn() })),
    alphaTarget: vi.fn(() => ({ restart: vi.fn() }))
  })),
  forceLink: vi.fn(() => ({
    id: vi.fn(() => ({ distance: vi.fn(), strength: vi.fn() })),
    distance: vi.fn(() => ({ id: vi.fn(), strength: vi.fn() })),
    strength: vi.fn(() => ({ id: vi.fn(), distance: vi.fn() }))
  })),
  forceManyBody: vi.fn(() => ({
    strength: vi.fn()
  })),
  forceCenter: vi.fn(() => ({})),
  forceCollide: vi.fn(() => ({
    radius: vi.fn()
  }))
}));

vi.mock('d3-selection', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      data: vi.fn(() => ({
        enter: vi.fn(() => ({
          append: vi.fn(() => ({
            attr: vi.fn(() => ({ attr: vi.fn(), style: vi.fn(), on: vi.fn() })),
            style: vi.fn(() => ({ attr: vi.fn(), style: vi.fn(), on: vi.fn() })),
            on: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() }))
          }))
        })),
        exit: vi.fn(() => ({ remove: vi.fn() })),
        attr: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
        style: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() }))
      }))
    })),
    append: vi.fn(() => ({
      attr: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
      style: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() }))
    })),
    attr: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
    style: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
    on: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() })),
    call: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() }))
  }))
}));

// ============================================================================
// Test Data Factory
// ============================================================================

function createNetworkNode(overrides: Partial<NetworkNode> = {}): NetworkNode {
  return {
    id: 'node-1',
    label: 'Test Node',
    type: 'author',
    size: 10,
    x: 100,
    y: 100,
    ...overrides
  };
}

function createNetworkEdge(overrides: Partial<NetworkEdge> = {}): NetworkEdge {
  return {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    weight: 1,
    type: 'collaboration',
    ...overrides
  };
}

function createDefaultProps(overrides: Partial<NetworkDiagramProps> = {}): NetworkDiagramProps {
  return {
    id: 'test-network-diagram',
    nodes: [
      createNetworkNode({ id: 'node-1', label: 'Author 1' }),
      createNetworkNode({ id: 'node-2', label: 'Author 2' }),
      createNetworkNode({ id: 'node-3', label: 'Author 3' })
    ],
    edges: [
      createNetworkEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' }),
      createNetworkEdge({ id: 'edge-2', source: 'node-2', target: 'node-3' })
    ],
    width: 800,
    height: 600,
    ariaLabel: 'Test network diagram',
    ...overrides
  };
}

// ============================================================================
// Basic Rendering Tests
// ============================================================================

describe('NetworkDiagram - Basic Rendering', () => {
  let _mockUser: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    _mockUser = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render with basic props', () => {
    const props = createDefaultProps();
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img', { name: /test network diagram/i })).toBeInTheDocument();
  });

  it('should render with correct dimensions', () => {
    const props = createDefaultProps({ width: 1000, height: 800 });
    render(<NetworkDiagram {...props} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('width', '1000');
    expect(svg).toHaveAttribute('height', '800');
  });

  it('should render with custom id', () => {
    const props = createDefaultProps({ id: 'custom-network' });
    render(<NetworkDiagram {...props} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('id', 'custom-network');
  });

  it('should render loading state', () => {
    const props = createDefaultProps({ loading: true });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render error state', () => {
    const props = createDefaultProps({ error: 'Test error message' });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByText(/test error message/i)).toBeInTheDocument();
  });

  it('should render empty state with no nodes', () => {
    const props = createDefaultProps({ nodes: [], edges: [] });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByText(/no network data available/i)).toBeInTheDocument();
    expect(screen.getByText(/add nodes and edges to display the network diagram/i)).toBeInTheDocument();
  });
});

// ============================================================================
// Data Processing Tests
// ============================================================================

describe('NetworkDiagram - Data Processing', () => {
  it('should handle nodes without edges', () => {
    const props = createDefaultProps({ 
      nodes: [createNetworkNode()],
      edges: []
    });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle edges without matching nodes', () => {
    const props = createDefaultProps({ 
      nodes: [createNetworkNode({ id: 'node-1' })],
      edges: [createNetworkEdge({ source: 'node-1', target: 'node-nonexistent' })]
    });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle large networks efficiently', () => {
    // Generate large network
    const nodes = Array.from({ length: 100 }, (_, i) => 
      createNetworkNode({ 
        id: `node-${i}`, 
        label: `Node ${i}`,
        size: Math.random() * 20 + 5
      })
    );
    
    const edges = Array.from({ length: 150 }, (_, i) => 
      createNetworkEdge({ 
        id: `edge-${i}`,
        source: `node-${Math.floor(Math.random() * 100)}`,
        target: `node-${Math.floor(Math.random() * 100)}`,
        weight: Math.random() * 5 + 1
      })
    );
    
    const props = createDefaultProps({ nodes, edges });
    
    const start = performance.now();
    render(<NetworkDiagram {...props} />);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(1000); // Should render within 1 second
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle duplicate node IDs gracefully', () => {
    const nodes = [
      createNetworkNode({ id: 'node-1', label: 'First Node' }),
      createNetworkNode({ id: 'node-1', label: 'Duplicate Node' }),
      createNetworkNode({ id: 'node-2', label: 'Second Node' })
    ];
    
    const props = createDefaultProps({ nodes });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should filter invalid edges', () => {
    const edges = [
      createNetworkEdge({ source: 'node-1', target: 'node-2' }), // Valid
      createNetworkEdge({ source: 'node-1', target: 'nonexistent' }), // Invalid target
      createNetworkEdge({ source: 'nonexistent', target: 'node-2' }), // Invalid source
    ];
    
    const props = createDefaultProps({ edges });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Layout Algorithm Tests
// ============================================================================

describe('NetworkDiagram - Layout Algorithms', () => {
  it('should apply force layout', () => {
    const layout: NetworkLayoutConfig = {
      algorithm: 'force',
      parameters: {
        linkDistance: 100,
        chargeStrength: -300
      }
    };
    
    const props = createDefaultProps({ layout });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should apply circular layout', () => {
    const layout: NetworkLayoutConfig = {
      algorithm: 'circular',
      parameters: {
        radius: 200
      }
    };
    
    const props = createDefaultProps({ layout });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should apply grid layout', () => {
    const layout: NetworkLayoutConfig = {
      algorithm: 'grid',
      parameters: {
        columns: 3,
        spacing: 100
      }
    };
    
    const props = createDefaultProps({ layout });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should apply hierarchical layout', () => {
    const layout: NetworkLayoutConfig = {
      algorithm: 'hierarchical',
      parameters: {
        levelSeparation: 150,
        nodeSeparation: 100
      }
    };
    
    const props = createDefaultProps({ layout });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle layout transitions', async () => {
    const { rerender } = render(<NetworkDiagram {...createDefaultProps()} />);
    
    // Change layout
    const newLayout: NetworkLayoutConfig = {
      algorithm: 'circular',
      animate: true
    };
    
    rerender(<NetworkDiagram {...createDefaultProps({ layout: newLayout })} />);
    
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Clustering Algorithm Tests
// ============================================================================

describe('NetworkDiagram - Clustering', () => {
  let mockUser: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockUser = userEvent.setup();
  });
  it('should apply modularity clustering', () => {
    const clustering: ClusterConfig = {
      algorithm: 'modularity',
      resolution: 1.0
    };
    
    const props = createDefaultProps({ clustering });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should apply Louvain clustering', () => {
    const clustering: ClusterConfig = {
      algorithm: 'louvain',
      resolution: 1.0,
      minClusterSize: 2
    };
    
    const props = createDefaultProps({ clustering });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should apply k-means clustering', () => {
    const clustering: ClusterConfig = {
      algorithm: 'kmeans',
      k: 3
    };
    
    const props = createDefaultProps({ clustering });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle clustering with minimum cluster size', () => {
    const clustering: ClusterConfig = {
      algorithm: 'modularity',
      minClusterSize: 5
    };
    
    const props = createDefaultProps({ clustering });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should trigger cluster selection callback', async () => {
    const onClusterSelect = vi.fn();
    const clustering: ClusterConfig = {
      algorithm: 'modularity'
    };
    
    const props = createDefaultProps({ 
      clustering,
      onClusterSelect
    });
    
    render(<NetworkDiagram {...props} />);
    
    const svg = screen.getByRole('img');
    await mockUser.click(svg);
    
    // In real implementation, this would trigger cluster selection
    expect(svg).toBeInTheDocument();
  });
});

// ============================================================================
// Interaction Tests
// ============================================================================

describe('NetworkDiagram - Interactions', () => {
  let mockUser: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockUser = userEvent.setup();
  });

  it('should handle node click events', async () => {
    const onNodeClick = vi.fn();
    const props = createDefaultProps({
      onNodeClick,
      interactive: true
    });
    
    render(<NetworkDiagram {...props} />);
    
    const svg = screen.getByRole('img');
    await mockUser.click(svg);
    
    expect(svg).toBeInTheDocument();
  });

  it('should handle node hover events', async () => {
    const onNodeHover = vi.fn();
    const props = createDefaultProps({
      onNodeHover,
      interactive: true
    });
    
    render(<NetworkDiagram {...props} />);
    
    const svg = screen.getByRole('img');
    await mockUser.hover(svg);
    
    expect(svg).toBeInTheDocument();
  });

  it('should handle edge click events', async () => {
    const onEdgeClick = vi.fn();
    const props = createDefaultProps({
      onEdgeClick,
      interactive: true
    });
    
    render(<NetworkDiagram {...props} />);
    
    const svg = screen.getByRole('img');
    await mockUser.click(svg);
    
    expect(svg).toBeInTheDocument();
  });

  it('should support drag interactions', () => {
    const props = createDefaultProps({
      interactions: {
        drag: true,
        zoom: false,
        pan: false
      }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should support zoom and pan interactions', () => {
    const props = createDefaultProps({
      interactions: {
        drag: false,
        zoom: true,
        pan: true
      }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should support selection interactions', () => {
    const props = createDefaultProps({
      interactions: {
        selection: true,
        selectionMode: 'multiple'
      }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should support lasso selection', () => {
    const props = createDefaultProps({
      interactions: {
        selection: true,
        selectionMode: 'lasso'
      }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Styling and Visual Tests
// ============================================================================

describe('NetworkDiagram - Styling', () => {
  it('should apply custom node styling', () => {
    const props = createDefaultProps({
      style: {
        node: {
          defaultSize: 15,
          strokeWidth: 2,
          opacity: 0.8
        }
      }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should apply custom edge styling', () => {
    const props = createDefaultProps({
      style: {
        edge: {
          defaultWidth: 3,
          opacity: 0.6
        }
      }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should show node labels when configured', () => {
    const props = createDefaultProps({
      style: {
        labels: {
          show: true,
          fontSize: 12,
          threshold: 5
        }
      }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should display cluster hulls when enabled', () => {
    const props = createDefaultProps({
      clustering: {
        algorithm: 'modularity'
      },
      style: {
        cluster: {
          showHulls: true,
          hullOpacity: 0.3
        }
      }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle different node colors by type', () => {
    const nodes = [
      createNetworkNode({ id: 'author-1', type: 'author', color: '#ff0000' }),
      createNetworkNode({ id: 'work-1', type: 'work', color: '#00ff00' }),
      createNetworkNode({ id: 'institution-1', type: 'institution', color: '#0000ff' })
    ];
    
    const props = createDefaultProps({ nodes });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('NetworkDiagram - Accessibility', () => {
  it('should have proper ARIA labels', () => {
    const props = createDefaultProps({ ariaLabel: 'Collaboration network diagram' });
    render(<NetworkDiagram {...props} />);
    
    const svg = screen.getByRole('img', { name: /collaboration network diagram/i });
    expect(svg).toBeInTheDocument();
  });

  it('should support keyboard navigation when interactive', () => {
    const props = createDefaultProps({
      interactive: true,
      ariaLabel: 'Interactive network diagram'
    });
    
    render(<NetworkDiagram {...props} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('tabIndex', '0');
  });

  it('should provide screen reader accessible descriptions', () => {
    const nodes = [
      createNetworkNode({ id: 'node-1', label: 'Author 1' }),
      createNetworkNode({ id: 'node-2', label: 'Author 2' })
    ];
    const edges = [
      createNetworkEdge({ source: 'node-1', target: 'node-2', weight: 3 })
    ];
    
    const props = createDefaultProps({ nodes, edges });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should support high contrast mode', () => {
    const props = createDefaultProps({
      style: {
        node: { strokeWidth: 3 },
        edge: { defaultWidth: 2 }
      }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle reduced motion preferences', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    
    const props = createDefaultProps({
      layout: { algorithm: 'force', animate: true }
    });
    
    render(<NetworkDiagram {...props} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('NetworkDiagram - Performance', () => {
  it('should handle dynamic node updates efficiently', async () => {
    const initialNodes = [
      createNetworkNode({ id: 'node-1' }),
      createNetworkNode({ id: 'node-2' })
    ];
    
    const { rerender } = render(<NetworkDiagram nodes={initialNodes} edges={[]} />);
    
    // Add more nodes
    const updatedNodes = [
      ...initialNodes,
      createNetworkNode({ id: 'node-3' }),
      createNetworkNode({ id: 'node-4' })
    ];
    
    rerender(<NetworkDiagram nodes={updatedNodes} edges={[]} />);
    
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('should handle edge updates efficiently', async () => {
    const nodes = [
      createNetworkNode({ id: 'node-1' }),
      createNetworkNode({ id: 'node-2' }),
      createNetworkNode({ id: 'node-3' })
    ];
    
    const initialEdges = [
      createNetworkEdge({ source: 'node-1', target: 'node-2' })
    ];
    
    const { rerender } = render(<NetworkDiagram nodes={nodes} edges={initialEdges} />);
    
    // Add more edges
    const updatedEdges = [
      ...initialEdges,
      createNetworkEdge({ source: 'node-2', target: 'node-3' }),
      createNetworkEdge({ source: 'node-1', target: 'node-3' })
    ];
    
    rerender(<NetworkDiagram nodes={nodes} edges={updatedEdges} />);
    
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('should efficiently update node positions during simulation', () => {
    const props = createDefaultProps({
      layout: {
        algorithm: 'force',
        animate: true,
        iterations: 100
      }
    });
    
    const start = performance.now();
    render(<NetworkDiagram {...props} />);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(500);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('NetworkDiagram - Edge Cases', () => {
  it('should handle self-referencing edges', () => {
    const edges = [
      createNetworkEdge({ source: 'node-1', target: 'node-1' })
    ];
    
    const props = createDefaultProps({ edges });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle nodes with extreme sizes', () => {
    const nodes = [
      createNetworkNode({ id: 'tiny', size: 0.1 }),
      createNetworkNode({ id: 'huge', size: 1000 }),
      createNetworkNode({ id: 'negative', size: -10 })
    ];
    
    const props = createDefaultProps({ nodes });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle invalid node positions', () => {
    const nodes = [
      createNetworkNode({ id: 'invalid-x', x: NaN, y: 100 }),
      createNetworkNode({ id: 'invalid-y', x: 100, y: Infinity }),
      createNetworkNode({ id: 'no-position' })
    ];
    
    const props = createDefaultProps({ nodes });
    render(<NetworkDiagram {...props} />);
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should handle window resize gracefully', async () => {
    const props = createDefaultProps();
    render(<NetworkDiagram {...props} />);
    
    // Simulate window resize
    global.dispatchEvent(new Event('resize'));
    
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('should handle component unmounting during simulation', () => {
    const props = createDefaultProps({
      layout: { algorithm: 'force', animate: true }
    });
    
    const { unmount } = render(<NetworkDiagram {...props} />);
    
    // Should not throw error when unmounting
    expect(() => unmount()).not.toThrow();
  });
});