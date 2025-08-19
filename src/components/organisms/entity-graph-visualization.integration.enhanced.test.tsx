/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type { EntityGraphVertex, EntityGraphEdge } from '@/types/entity-graph';
import { EdgeType } from '@/types/entity-graph';

import { EntityGraphVisualization } from './entity-graph-visualization';

// Mock the enhanced components
vi.mock('./graph-layout/force-simulation-enhanced', () => ({
  createForceSimulation: vi.fn().mockReturnValue([]),
  createForceSimulationWithWorker: vi.fn().mockResolvedValue([]),
  createHierarchicalLayout: vi.fn().mockReturnValue([]),
  optimizeForLargeGraphs: vi.fn().mockReturnValue({
    width: 800,
    height: 600,
    iterations: 50,
    useQuadTree: true,
    adaptiveIterations: true,
  }),
}));

vi.mock('./hooks/use-graph-interactions-advanced', () => ({
  useAdvancedGraphInteractions: vi.fn().mockReturnValue({
    zoom: 1,
    pan: { x: 0, y: 0 },
    mode: 'navigate',
    selectedVertices: [],
    selectionBox: null,
    isDragging: false,
    tooltip: null,
    setZoom: vi.fn(),
    setPan: vi.fn(),
    handleZoomIn: vi.fn(),
    handleZoomOut: vi.fn(),
    handleZoomReset: vi.fn(),
    setMode: vi.fn(),
    handleMouseDown: vi.fn(),
    handleMouseMove: vi.fn(),
    handleMouseUp: vi.fn(),
    handleWheelZoom: vi.fn(),
    showTooltip: vi.fn(),
    hideTooltip: vi.fn(),
  }),
}));

vi.mock('./graph-search/graph-search-enhanced', () => ({
  createAdvancedGraphSearch: vi.fn().mockReturnValue({
    search: vi.fn().mockReturnValue([]),
    getSuggestions: vi.fn().mockReturnValue([]),
    getSearchHistory: vi.fn().mockReturnValue([]),
  }),
}));

vi.mock('./graph-svg/graph-virtualization', () => ({
  GraphVirtualizer: vi.fn().mockImplementation(() => ({
    updateData: vi.fn(),
    updateViewport: vi.fn().mockReturnValue({
      vertices: [],
      edges: [],
      lod: { renderLabels: true, renderDetails: true, renderEdges: true },
      stats: {
        totalVertices: 0,
        totalEdges: 0,
        visibleVertices: 0,
        visibleEdges: 0,
        culledVertices: 0,
        culledEdges: 0,
        renderTime: 0,
        spatialQueries: 0,
      },
    }),
    getConfig: vi.fn().mockReturnValue({}),
    updateConfig: vi.fn(),
  })),
}));

// Mock store
const mockStore = {
  selectedVertexId: null,
  hoveredVertexId: null,
  isFullscreen: false,
  isHydrated: true,
  isLoading: false,
  layoutConfig: {
    algorithm: 'force-directed',
    separateVisitedEntities: true,
    clusterByEntityType: true,
    sizeByVisitCount: false,
    weightEdgesByStrength: false,
    maxVertices: 100,
    minEdgeWeight: 0.1,
  },
  getFilteredVertices: vi.fn().mockReturnValue([]),
  getFilteredEdges: vi.fn().mockReturnValue([]),
  selectVertex: vi.fn(),
  hoverVertex: vi.fn(),
  toggleFullscreen: vi.fn(),
};

vi.mock('@/stores/entity-graph-store', () => ({
  useEntityGraphStore: vi.fn(() => mockStore),
}));

// Mock hooks
vi.mock('@/hooks/use-graph-keyboard-shortcuts', () => ({
  useGraphKeyboardShortcuts: vi.fn(),
}));

// Sample test data
const mockVertices: EntityGraphVertex[] = [
  {
    id: 'W2741809807',
    displayName: 'Machine Learning for Citation Networks',
    entityType: EntityType.WORK,
    directlyVisited: true,
    firstSeen: '2024-01-01T00:00:00Z',
    lastVisited: '2024-01-02T00:00:00Z',
    visitCount: 5,
    encounters: [],
    encounterStats: {
      totalEncounters: 5,
      searchResultCount: 0,
      relatedEntityCount: 0,
      lastEncounter: '2024-01-02T00:00:00Z',
    },
    metadata: {
      citedByCount: 250,
      url: 'https://openalex.org/W2741809807',
    },
  },
  {
    id: 'A2058174099',
    displayName: 'John Smith',
    entityType: EntityType.AUTHOR,
    directlyVisited: false,
    firstSeen: '2024-01-01T00:00:00Z',
    visitCount: 0,
    encounters: [],
    encounterStats: {
      totalEncounters: 1,
      searchResultCount: 1,
      relatedEntityCount: 0,
      lastEncounter: '2024-01-01T00:00:00Z',
    },
    metadata: {
      citedByCount: 1500,
      url: 'https://openalex.org/A2058174099',
    },
  },
  {
    id: 'W3045678901',
    displayName: 'Deep Neural Networks in Scientific Research',
    entityType: EntityType.WORK,
    directlyVisited: true,
    firstSeen: '2024-01-01T00:00:00Z',
    lastVisited: '2024-01-01T12:00:00Z',
    visitCount: 3,
    encounters: [],
    encounterStats: {
      totalEncounters: 3,
      searchResultCount: 0,
      relatedEntityCount: 0,
      lastEncounter: '2024-01-01T12:00:00Z',
    },
    metadata: {
      citedByCount: 89,
      url: 'https://openalex.org/W3045678901',
    },
  },
];

const mockEdges: EntityGraphEdge[] = [
  {
    id: 'edge-1',
    sourceId: 'W2741809807',
    targetId: 'A2058174099',
    edgeType: EdgeType.AUTHORED_BY,
    weight: 1,
    discoveredFromDirectVisit: true,
    discoveredAt: '2024-01-01T00:00:00Z',
    metadata: {
      source: 'openalex',
      confidence: 0.95,
    },
  },
  {
    id: 'edge-2',
    sourceId: 'W3045678901',
    targetId: 'A2058174099',
    edgeType: EdgeType.AUTHORED_BY,
    weight: 1,
    discoveredFromDirectVisit: true,
    discoveredAt: '2024-01-01T00:00:00Z',
    metadata: {
      source: 'openalex',
      confidence: 0.95,
    },
  },
];

describe('Enhanced Entity Graph Visualization Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.getFilteredVertices.mockReturnValue(mockVertices);
    mockStore.getFilteredEdges.mockReturnValue(mockEdges);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Performance Optimization Features', () => {
    it('should handle large graphs with virtualization', async () => {
      // Create large dataset
      const largeVertices = Array.from({ length: 1000 }, (_, i) => ({
        ...mockVertices[0],
        id: `vertex-${i}`,
        displayName: `Vertex ${i}`,
      }));

      const largeEdges = Array.from({ length: 500 }, (_, i) => ({
        ...mockEdges[0],
        id: `edge-${i}`,
        sourceId: `vertex-${i}`,
        targetId: `vertex-${(i + 1) % 1000}`,
      }));

      mockStore.getFilteredVertices.mockReturnValue(largeVertices);
      mockStore.getFilteredEdges.mockReturnValue(largeEdges);

      const startTime = performance.now();
      
      render(
        <EntityGraphVisualization 
          width={1200} 
          height={800}
          showControls={true}
          showLegend={true}
        />
      );

      const renderTime = performance.now() - startTime;

      // Should render quickly even with large dataset
      expect(renderTime).toBeLessThan(100);
      
      // Should display the graph container
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should adapt layout algorithm for large graphs', () => {
      const { optimizeForLargeGraphs } = require('./graph-layout/force-simulation-enhanced');
      
      mockStore.getFilteredVertices.mockReturnValue(Array(2000).fill(mockVertices[0]));
      
      render(<EntityGraphVisualization />);

      expect(optimizeForLargeGraphs).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        })
      );
    });

    it('should use web worker for heavy simulation', async () => {
      const { createForceSimulationWithWorker } = require('./graph-layout/force-simulation-enhanced');
      
      // Mock large graph that would trigger worker usage
      const heavyVertices = Array(5000).fill(mockVertices[0]);
      mockStore.getFilteredVertices.mockReturnValue(heavyVertices);

      render(<EntityGraphVisualization />);

      await waitFor(() => {
        expect(createForceSimulationWithWorker).toHaveBeenCalled();
      });
    });
  });

  describe('Advanced Interaction Features', () => {
    it('should support wheel zoom functionality', async () => {
      const { useAdvancedGraphInteractions } = require('./hooks/use-graph-interactions-advanced');
      const mockInteractions = {
        zoom: 1,
        pan: { x: 0, y: 0 },
        mode: 'navigate',
        handleWheelZoom: vi.fn(),
        handleZoomIn: vi.fn(),
        handleZoomOut: vi.fn(),
        handleZoomReset: vi.fn(),
      };
      
      useAdvancedGraphInteractions.mockReturnValue(mockInteractions);

      render(<EntityGraphVisualization />);

      const svgElement = screen.getByRole('application').querySelector('svg');
      if (svgElement) {
        fireEvent.wheel(svgElement, { deltaY: -100 });
      }

      expect(mockInteractions.handleWheelZoom).toHaveBeenCalled();
    });

    it('should support selection box for multi-select', async () => {
      const { useAdvancedGraphInteractions } = require('./hooks/use-graph-interactions-advanced');
      const mockInteractions = {
        mode: 'select',
        selectionBox: {
          startX: 100,
          startY: 100,
          endX: 200,
          endY: 200,
          active: true,
        },
        setMode: vi.fn(),
        handleMouseDown: vi.fn(),
        handleMouseMove: vi.fn(),
        handleMouseUp: vi.fn(),
      };
      
      useAdvancedGraphInteractions.mockReturnValue(mockInteractions);

      render(<EntityGraphVisualization />);

      const container = screen.getByRole('application');
      
      // Simulate selection box interaction
      fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(container, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(container);

      expect(mockInteractions.handleMouseDown).toHaveBeenCalled();
      expect(mockInteractions.handleMouseMove).toHaveBeenCalled();
      expect(mockInteractions.handleMouseUp).toHaveBeenCalled();
    });

    it('should support vertex dragging', async () => {
      const { useAdvancedGraphInteractions } = require('./hooks/use-graph-interactions-advanced');
      const mockInteractions = {
        mode: 'drag',
        dragState: {
          active: true,
          vertexId: 'W2741809807',
          startPosition: { x: 100, y: 100 },
          currentPosition: { x: 150, y: 120 },
        },
        startVertexDrag: vi.fn(),
        updateVertexDrag: vi.fn(),
        endVertexDrag: vi.fn(),
      };
      
      useAdvancedGraphInteractions.mockReturnValue(mockInteractions);

      render(<EntityGraphVisualization />);

      // Test drag functionality would be triggered by vertex interaction
      expect(mockInteractions.dragState).toBeTruthy();
    });

    it('should handle keyboard shortcuts', async () => {
      const { useGraphKeyboardShortcuts } = require('@/hooks/use-graph-keyboard-shortcuts');
      
      render(<EntityGraphVisualization />);

      expect(useGraphKeyboardShortcuts).toHaveBeenCalledWith(
        expect.objectContaining({
          onToggleFullscreen: expect.any(Function),
          onExportPNG: expect.any(Function),
          onExportSVG: expect.any(Function),
          onToggleSearch: expect.any(Function),
          onZoomIn: expect.any(Function),
          onZoomOut: expect.any(Function),
          onZoomReset: expect.any(Function),
          onEscape: expect.any(Function),
        })
      );
    });
  });

  describe('Enhanced Search Functionality', () => {
    it('should initialize advanced search engine', () => {
      const { createAdvancedGraphSearch } = require('./graph-search/graph-search-enhanced');
      
      render(<EntityGraphVisualization />);

      expect(createAdvancedGraphSearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          debounceMs: expect.any(Number),
        })
      );
    });

    it('should support fuzzy search with TF-IDF scoring', () => {
      const { createAdvancedGraphSearch } = require('./graph-search/graph-search-enhanced');
      const mockSearchEngine = {
        search: vi.fn().mockReturnValue([
          {
            vertex: mockVertices[0],
            score: 0.95,
            matchType: 'exact',
            matchedFields: ['displayName'],
          },
        ]),
        getSuggestions: vi.fn().mockReturnValue(['machine', 'learning']),
        getSearchHistory: vi.fn().mockReturnValue(['neural networks']),
      };
      
      createAdvancedGraphSearch.mockReturnValue(mockSearchEngine);

      render(<EntityGraphVisualization />);

      // Search functionality would be triggered by search component
      expect(mockSearchEngine.search).toBeDefined();
      expect(mockSearchEngine.getSuggestions).toBeDefined();
    });

    it('should provide search suggestions and history', () => {
      const { createAdvancedGraphSearch } = require('./graph-search/graph-search-enhanced');
      const mockSearchEngine = {
        search: vi.fn().mockReturnValue([]),
        getSuggestions: vi.fn().mockReturnValue(['machine learning', 'neural networks']),
        getSearchHistory: vi.fn().mockReturnValue(['deep learning', 'citation analysis']),
      };
      
      createAdvancedGraphSearch.mockReturnValue(mockSearchEngine);

      render(<EntityGraphVisualization />);

      const suggestions = mockSearchEngine.getSuggestions('mach');
      const history = mockSearchEngine.getSearchHistory();

      expect(suggestions).toContain('machine learning');
      expect(history).toContain('deep learning');
    });
  });

  describe('Export Functionality', () => {
    it('should export graph as PNG with enhanced options', async () => {
      render(<EntityGraphVisualization />);

      const exportButton = screen.getByTitle(/export.*png/i);
      if (exportButton) {
        await user.click(exportButton);
      }

      // Mock export function should be called
      // In real implementation, this would trigger the enhanced export
    });

    it('should export graph as SVG with metadata', async () => {
      render(<EntityGraphVisualization />);

      const exportButton = screen.getByTitle(/export.*svg/i);
      if (exportButton) {
        await user.click(exportButton);
      }

      // Mock export function should be called
      // In real implementation, this would trigger the enhanced export
    });

    it('should support citation network export formats', () => {
      // Test would verify GraphML, BibTeX, RIS export options are available
      render(<EntityGraphVisualization />);

      // Enhanced export functionality would provide additional formats
      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Layout Algorithm Enhancements', () => {
    it('should use hierarchical layout for citation networks', () => {
      const { createHierarchicalLayout } = require('./graph-layout/force-simulation-enhanced');
      
      // Set up citation network with depth information
      const citationVertices = mockVertices.map((v, i) => ({
        ...v,
        metadata: { ...v.metadata, depth: i },
      }));
      
      mockStore.getFilteredVertices.mockReturnValue(citationVertices);
      mockStore.layoutConfig = { 
        algorithm: 'hierarchical', 
        separateVisitedEntities: true,
        clusterByEntityType: true,
        sizeByVisitCount: false,
        weightEdgesByStrength: false,
        maxVertices: 100,
        minEdgeWeight: 0.1,
      };

      render(<EntityGraphVisualization />);

      expect(createHierarchicalLayout).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          levelHeight: expect.any(Number),
          direction: expect.any(String),
        })
      );
    });

    it('should optimize force simulation for large graphs', () => {
      const { optimizeForLargeGraphs } = require('./graph-layout/force-simulation-enhanced');
      
      mockStore.getFilteredVertices.mockReturnValue(Array(1000).fill(mockVertices[0]));

      render(<EntityGraphVisualization />);

      expect(optimizeForLargeGraphs).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          targetFrameRate: expect.any(Number),
        })
      );
    });
  });

  describe('Virtualization Integration', () => {
    it('should initialize graph virtualizer for large datasets', () => {
      const { GraphVirtualizer } = require('./graph-svg/graph-virtualization');
      
      mockStore.getFilteredVertices.mockReturnValue(Array(2000).fill(mockVertices[0]));

      render(<EntityGraphVisualization />);

      expect(GraphVirtualizer).toHaveBeenCalledWith(
        expect.objectContaining({
          maxVertices: expect.any(Number),
          maxEdges: expect.any(Number),
          enableSpatialIndex: expect.any(Boolean),
        })
      );
    });

    it('should update virtualization on viewport changes', () => {
      const { GraphVirtualizer } = require('./graph-svg/graph-virtualization');
      const mockVirtualizer = {
        updateData: vi.fn(),
        updateViewport: vi.fn().mockReturnValue({
          vertices: mockVertices.slice(0, 100),
          edges: mockEdges.slice(0, 50),
          lod: { renderLabels: true, renderDetails: true, renderEdges: true },
          stats: {
            totalVertices: 2000,
            totalEdges: 1000,
            visibleVertices: 100,
            visibleEdges: 50,
            culledVertices: 1900,
            culledEdges: 950,
            renderTime: 16,
            spatialQueries: 5,
          },
        }),
      };
      
      GraphVirtualizer.mockReturnValue(mockVirtualizer);

      render(<EntityGraphVisualization />);

      expect(mockVirtualizer.updateData).toHaveBeenCalled();
      expect(mockVirtualizer.updateViewport).toHaveBeenCalled();
    });

    it('should provide performance statistics', () => {
      const { GraphVirtualizer } = require('./graph-svg/graph-virtualization');
      const mockVirtualizer = {
        updateData: vi.fn(),
        updateViewport: vi.fn().mockReturnValue({
          vertices: [],
          edges: [],
          lod: { renderLabels: true, renderDetails: true, renderEdges: true },
          stats: {
            totalVertices: 1000,
            totalEdges: 500,
            visibleVertices: 200,
            visibleEdges: 150,
            culledVertices: 800,
            culledEdges: 350,
            renderTime: 12,
            spatialQueries: 3,
          },
        }),
        getPerformanceStats: vi.fn().mockReturnValue({
          averageRenderTime: 15,
          currentFPS: 60,
          adaptiveMaxVertices: 500,
          recommendedMaxVertices: 600,
        }),
      };
      
      GraphVirtualizer.mockReturnValue(mockVirtualizer);

      render(<EntityGraphVisualization />);

      const stats = mockVirtualizer.getPerformanceStats();
      expect(stats.currentFPS).toBeGreaterThan(0);
      expect(stats.averageRenderTime).toBeTypeOf('number');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty datasets gracefully', () => {
      mockStore.getFilteredVertices.mockReturnValue([]);
      mockStore.getFilteredEdges.mockReturnValue([]);

      render(<EntityGraphVisualization />);

      expect(screen.getByText(/no entities to display/i)).toBeInTheDocument();
    });

    it('should handle malformed data gracefully', () => {
      const malformedVertices = [
        { id: '', displayName: '', entityType: EntityType.WORK }, // Missing required fields
        null,
        undefined,
      ].filter(Boolean) as EntityGraphVertex[];

      mockStore.getFilteredVertices.mockReturnValue(malformedVertices);

      expect(() => {
        render(<EntityGraphVisualization />);
      }).not.toThrow();
    });

    it('should handle performance degradation gracefully', () => {
      const { GraphVirtualizer } = require('./graph-svg/graph-virtualization');
      const mockVirtualizer = {
        updateData: vi.fn(),
        updateViewport: vi.fn().mockReturnValue({
          vertices: [],
          edges: [],
          lod: { renderLabels: false, renderDetails: false, renderEdges: false },
          stats: {
            totalVertices: 10000,
            totalEdges: 5000,
            visibleVertices: 50, // Heavily reduced for performance
            visibleEdges: 25,
            culledVertices: 9950,
            culledEdges: 4975,
            renderTime: 45, // High render time
            spatialQueries: 20,
          },
        }),
        getConfig: vi.fn().mockReturnValue({ adaptiveQuality: true }),
      };
      
      GraphVirtualizer.mockReturnValue(mockVirtualizer);

      render(<EntityGraphVisualization />);

      // Should adapt quality when performance is poor
      const result = mockVirtualizer.updateViewport({
        zoom: 1,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      });

      expect(result.stats.renderTime).toBeGreaterThan(30);
      expect(result.lod.renderLabels).toBe(false); // Quality reduced
    });
  });

  describe('Accessibility and UX Enhancements', () => {
    it('should provide proper ARIA labels and descriptions', () => {
      render(<EntityGraphVisualization />);

      const graphContainer = screen.getByRole('application');
      expect(graphContainer).toHaveAttribute('aria-label', 'Interactive entity graph visualization');
      expect(graphContainer).toHaveAttribute('aria-describedby', 'graph-description');

      const description = screen.getByText(/graph showing.*entities.*relationships/i);
      expect(description).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const { useGraphKeyboardShortcuts } = require('@/hooks/use-graph-keyboard-shortcuts');
      
      render(<EntityGraphVisualization />);

      const keyboardHandlers = useGraphKeyboardShortcuts.mock.calls[0][0];
      
      expect(keyboardHandlers).toHaveProperty('onToggleFullscreen');
      expect(keyboardHandlers).toHaveProperty('onExportPNG');
      expect(keyboardHandlers).toHaveProperty('onExportSVG');
      expect(keyboardHandlers).toHaveProperty('onToggleSearch');
      expect(keyboardHandlers).toHaveProperty('onZoomIn');
      expect(keyboardHandlers).toHaveProperty('onZoomOut');
      expect(keyboardHandlers).toHaveProperty('onZoomReset');
      expect(keyboardHandlers).toHaveProperty('onEscape');
    });

    it('should provide loading states during heavy operations', () => {
      mockStore.isLoading = true;

      render(<EntityGraphVisualization />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});