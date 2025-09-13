/**
 * Unit tests for Cytoscape.js Graph Engine
 *
 * Tests the complete Cytoscape.js graph rendering engine including:
 * - Core engine initialization and API compliance
 * - Graph data processing and rendering
 * - Layout algorithms (force-directed, hierarchical, etc.)
 * - Interactive features (selection, dragging, grouping)
 * - Export functionality (PNG, SVG, JSON)
 * - Engine lifecycle management
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type cytoscape from 'cytoscape';
import { CytoscapeEngine, createCytoscapeEngine, getDefaultCytoscapeConfig } from './index';
import type { IGraph, IVertex, IEdge } from '../../graph-core/interfaces';

// Mock cytoscape library
vi.mock('cytoscape', () => {
  const mockCy = {
    add: vi.fn(),
    remove: vi.fn(),
    elements: vi.fn(() => ({
      nodes: vi.fn(() => []),
      edges: vi.fn(() => []),
      remove: vi.fn(),
      map: vi.fn(() => []),
      filter: vi.fn(() => []),
      jsons: vi.fn(() => []),
    })),
    nodes: vi.fn(() => {
      const mockNodeCollection = {
        positions: vi.fn(() => ({ v1: { x: 100, y: 100 }, v2: { x: 200, y: 200 } })),
        map: vi.fn(() => []),
        forEach: vi.fn((callback) => {
          // Mock node data
          ['v1', 'v2'].forEach(id => {
            callback({
              position: () => ({ x: 100, y: 100 }),
              data: () => ({ id, label: `Vertex ${id}` }),
            });
          });
        }),
      };
      // Return the collection object with forEach method
      return mockNodeCollection;
    }),
    layout: vi.fn(() => ({
      run: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === 'layoutstop') {
          // Simulate immediate layout completion
          setTimeout(callback, 0);
        }
      }),
    })),
    fit: vi.fn(),
    center: vi.fn(),
    zoom: vi.fn(),
    pan: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
    removeAllListeners: vi.fn(),
    animate: vi.fn(),
    png: vi.fn(() => Promise.resolve('data:image/png;base64,mockdata')),
    svg: vi.fn(() => Promise.resolve('svg-content')),
    json: vi.fn(() => ({})),
    style: vi.fn(() => ({
      json: vi.fn(() => []),
    })),
    on: vi.fn(),
    off: vi.fn(),
    getElementById: vi.fn(),
    ready: vi.fn((callback) => callback()),
    container: null as HTMLElement | null,
  };

  const cytoscapeMock = vi.fn(() => mockCy);
  cytoscapeMock.use = vi.fn();
  cytoscapeMock._mockCy = mockCy; // Store reference for tests

  return {
    default: cytoscapeMock,
  };
});

vi.mock('cytoscape-cose-bilkent', () => ({
  default: vi.fn(),
}));

vi.mock('cytoscape-dagre', () => ({
  default: vi.fn(),
}));

// Mock DOM environment
const mockContainer = {
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  style: {},
  offsetWidth: 800,
  offsetHeight: 600,
} as unknown as HTMLElement;

describe('Cytoscape Graph Engine', () => {
  let engine: CytoscapeEngine;
  let mockGraph: IGraph<{ label: string }, { weight: number }>;
  let cytoscapeMock: any;
  let mockCy: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked cytoscape function
    const cytoscape = (await import('cytoscape')).default as any;
    cytoscapeMock = cytoscape;
    mockCy = cytoscapeMock._mockCy;

    engine = new CytoscapeEngine<{ label: string }, { weight: number }>();

    mockGraph = {
      vertices: [
        { id: 'v1', data: { label: 'Vertex 1' } },
        { id: 'v2', data: { label: 'Vertex 2' } },
        { id: 'v3', data: { label: 'Vertex 3' } },
      ] as IVertex<{ label: string }>[],
      edges: [
        { id: 'e1', source: 'v1', target: 'v2', data: { weight: 1.0 } },
        { id: 'e2', source: 'v2', target: 'v3', data: { weight: 2.0 } },
      ] as IEdge<{ weight: number }>[],
    };

    // Mock console methods to reduce test noise
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (engine) {
      engine.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('Engine Initialization', () => {
    it('should create engine with correct capabilities', () => {
      const capabilities = engine.capabilities;

      expect(capabilities.maxVertices).toBe(10000);
      expect(capabilities.maxEdges).toBe(50000);
      expect(capabilities.supportsHardwareAcceleration).toBe(false);
      expect(capabilities.exportFormats).toContain('png');
      expect(capabilities.exportFormats).toContain('svg');
      expect(capabilities.exportFormats).toContain('json');
      expect(capabilities.memoryUsage).toBe('medium');
    });

    it('should initialize with correct engine metadata', () => {
      expect(engine.id).toBe('cytoscape');
      expect(engine.name).toBe('Cytoscape.js');
      expect(engine.description).toContain('network visualization');
      expect(engine.version).toBe('1.0.0');
      expect(engine.isImplemented).toBe(true);
    });

    it('should initialize status as not initialized', () => {
      const status = engine.status;
      expect(status.isInitialised).toBe(false);
      expect(status.isRendering).toBe(false);
      expect(status.lastError).toBeUndefined();
    });

    it('should initialize with container and dimensions', async () => {
      await engine.initialise(mockContainer, { width: 800, height: 600 });

      const status = engine.status;
      expect(status.isInitialised).toBe(true);
      expect(status.lastError).toBeUndefined();
    });
  });

  describe('Graph Loading and Rendering', () => {
    beforeEach(async () => {
      await engine.initialise(mockContainer, { width: 800, height: 600 });
      // Mock the layout completion to avoid timeout
      vi.spyOn(engine as any, 'waitForLayoutCompletion').mockResolvedValue(undefined);
    });

    it('should load graph data successfully', async () => {
      await engine.loadGraph(mockGraph);

      // Verify cytoscape add was called for vertices and edges
      expect(mockCy.add).toHaveBeenCalled();
      const status = engine.status;
      expect(status.lastError).toBeUndefined();
    });

    it('should handle empty graph', async () => {
      const emptyGraph: IGraph<{ label: string }, { weight: number }> = {
        vertices: [],
        edges: [],
      };

      await engine.loadGraph(emptyGraph);
      expect(mockCy.add).toHaveBeenCalled();
    });

    it('should update existing graph', async () => {
      await engine.loadGraph(mockGraph);

      const updatedGraph: IGraph<{ label: string }, { weight: number }> = {
        vertices: [
          ...mockGraph.vertices,
          { id: 'v4', data: { label: 'Vertex 4' } },
        ],
        edges: mockGraph.edges,
      };

      await engine.updateGraph(updatedGraph);
      expect(mockCy.remove).toHaveBeenCalled();
      expect(mockCy.add).toHaveBeenCalled();
    });
  });

  describe('Layout and Positioning', () => {
    beforeEach(async () => {
      await engine.initialise(mockContainer, { width: 800, height: 600 });
      // Mock the layout completion to avoid timeout
      vi.spyOn(engine as any, 'waitForLayoutCompletion').mockResolvedValue(undefined);
      await engine.loadGraph(mockGraph);
    });

    it('should fit graph to view', () => {
      engine.fitToView(50, true);
      expect(mockCy.fit).toHaveBeenCalled();
    });

    it('should get vertex positions', () => {
      // Mock positions return
      mockCy.nodes.mockReturnValue({
        positions: vi.fn(() => ({ v1: { x: 100, y: 100 }, v2: { x: 200, y: 200 } }))
      });

      const positions = engine.getPositions();
      expect(positions).toBeDefined();
      expect(Array.isArray(positions)).toBe(true);
    });

    it('should handle resize events', () => {
      engine.resize({ width: 1000, height: 800 });
      expect(mockCy.resize).toHaveBeenCalled();
    });
  });

  describe('Export Functionality', () => {
    beforeEach(async () => {
      await engine.initialise(mockContainer, { width: 800, height: 600 });
      // Mock the layout completion to avoid timeout
      vi.spyOn(engine as any, 'waitForLayoutCompletion').mockResolvedValue(undefined);
      await engine.loadGraph(mockGraph);
    });

    it('should export as PNG', async () => {
      const result = await engine.export('png');
      expect(result).toBe('data:image/png;base64,mockdata');
      expect(mockCy.png).toHaveBeenCalled();
    });

    it('should export as SVG', async () => {
      const result = await engine.export('svg');
      expect(result).toBe('svg-content');
      expect(mockCy.svg).toHaveBeenCalled();
    });

    it('should export as JSON', async () => {
      const result = await engine.export('json');
      expect(typeof result).toBe('string');
      expect(mockCy.json).toHaveBeenCalled();
    });

    it('should reject unsupported export format', async () => {
      await expect(engine.export('pdf' as any)).rejects.toThrow('PDF export requires additional dependencies');
    });
  });

  describe('Engine Lifecycle', () => {
    it('should handle initialization before container is set', async () => {
      await expect(engine.initialise(mockContainer, { width: 800, height: 600 }))
        .resolves.not.toThrow();
    });

    it('should handle destroy without initialization', () => {
      expect(() => engine.destroy()).not.toThrow();
    });

    it('should destroy engine and cleanup resources', async () => {
      await engine.initialise(mockContainer, { width: 800, height: 600 });
      engine.destroy();

      expect(mockCy.destroy).toHaveBeenCalled();
      const status = engine.status;
      expect(status.isInitialised).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle loadGraph without initialization', async () => {
      await expect(engine.loadGraph(mockGraph)).rejects.toThrow('Engine not initialised');
    });

    it('should handle fitToView without initialization', () => {
      expect(() => engine.fitToView()).not.toThrow();
    });

    it('should handle getPositions without initialization', () => {
      const positions = engine.getPositions();
      expect(positions).toEqual([]);
    });

    it('should handle export without initialization', async () => {
      await expect(engine.export('png')).rejects.toThrow('Engine not initialised');
    });

    it('should handle cytoscape initialization failure', async () => {
      cytoscapeMock.mockImplementationOnce(() => {
        throw new Error('Cytoscape initialization failed');
      });

      await expect(engine.initialise(mockContainer, { width: 800, height: 600 }))
        .rejects.toThrow('Cytoscape initialization failed');

      const status = engine.status;
      expect(status.isInitialised).toBe(false);
      expect(status.lastError).toContain('Cytoscape initialization failed');
    });
  });

  describe('Factory Functions', () => {
    it('should create engine via factory function', () => {
      const factoryEngine = createCytoscapeEngine();

      expect(factoryEngine).toBeInstanceOf(CytoscapeEngine);
      expect(factoryEngine.id).toBe('cytoscape');

      factoryEngine.destroy();
    });

    it('should provide default configuration', () => {
      const defaultConfig = getDefaultCytoscapeConfig();

      expect(defaultConfig.cytoscapeOptions).toBeDefined();
      expect(defaultConfig.cytoscapeOptions.layout).toBeDefined();
      expect(defaultConfig.cytoscapeOptions.layout.name).toBe('cose-bilkent');
    });
  });

  describe('Configuration Options', () => {
    it('should apply custom layout configuration', async () => {
      // Mock the layout completion to avoid timeout
      vi.spyOn(engine as any, 'waitForLayoutCompletion').mockResolvedValue(undefined);
      const customConfig = {
        cytoscapeOptions: {
          layout: {
            name: 'dagre',
            rankDir: 'TB',
          },
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#ff0000',
              },
            },
          ],
        },
      };

      await engine.initialise(mockContainer, { width: 800, height: 600 });
      await engine.loadGraph(mockGraph, customConfig);

      expect(mockCy.layout).toHaveBeenCalled();
      expect(mockCy.style).toHaveBeenCalled();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large graphs efficiently', async () => {
      // Mock the layout completion to avoid timeout
      vi.spyOn(engine as any, 'waitForLayoutCompletion').mockResolvedValue(undefined);
      const largeGraph: IGraph<{ label: string }, { weight: number }> = {
        vertices: Array.from({ length: 1000 }, (_, i) => ({
          id: `v${i}`,
          data: { label: `Vertex ${i}` },
        })),
        edges: Array.from({ length: 2000 }, (_, i) => ({
          id: `e${i}`,
          source: `v${Math.floor(Math.random() * 1000)}`,
          target: `v${Math.floor(Math.random() * 1000)}`,
          data: { weight: Math.random() },
        })),
      };

      await engine.initialise(mockContainer, { width: 800, height: 600 });
      await engine.loadGraph(largeGraph);

      expect(mockCy.add).toHaveBeenCalled();
      const status = engine.status;
      expect(status.lastError).toBeUndefined();
    });
  });
});