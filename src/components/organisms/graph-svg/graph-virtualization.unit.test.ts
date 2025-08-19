/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { EntityGraphVertex, EntityGraphEdge } from '@/types/entity-graph';
import { EdgeType } from '@/types/entity-graph';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

import {
  GraphVirtualizer,
  ViewportBounds,
  VirtualizationConfig,
  calculateViewportBounds,
  getVisibleVertices,
  getVisibleEdges,
  createLevelOfDetail,
  optimizeVertexRendering,
  createSpatialIndex,
  SpatialIndex,
  updateVirtualization,
} from './graph-virtualization';

// Mock positioned vertices
function createMockVertices(count: number): Array<EntityGraphVertex & { x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => ({
    id: `vertex-${i}`,
    displayName: `Vertex ${i}`,
    entityType: EntityType.WORK,
    directlyVisited: i % 3 === 0,
    firstSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    visitCount: Math.floor(Math.random() * 10),
    encounters: [],
    encounterStats: {
      totalEncounters: Math.floor(Math.random() * 5),
      searchResultCount: Math.floor(Math.random() * 3),
      relatedEntityCount: Math.floor(Math.random() * 2),
    },
    metadata: {
      citedByCount: Math.floor(Math.random() * 1000),
      url: `https://example.com/work/${i}`,
    },
    x: Math.random() * 2000,
    y: Math.random() * 1500,
  }));
}

function createMockEdges(vertices: Array<{ id: string; x: number; y: number }>, count: number): EntityGraphEdge[] {
  const edges: EntityGraphEdge[] = [];
  
  for (let i = 0; i < count; i++) {
    const sourceIndex = Math.floor(Math.random() * vertices.length);
    const targetIndex = Math.floor(Math.random() * vertices.length);
    
    if (sourceIndex !== targetIndex) {
      edges.push({
        id: `edge-${i}`,
        sourceId: vertices[sourceIndex].id,
        targetId: vertices[targetIndex].id,
        source: vertices[sourceIndex].id,
        target: vertices[targetIndex].id,
        edgeType: EdgeType.CITES,
        type: EdgeType.CITES,
        weight: Math.random() * 0.5 + 0.5,
        discoveredFromDirectVisit: Math.random() > 0.5,
        discoveredAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        metadata: {
          source: 'openalex' as const,
          confidence: Math.random(),
        },
      });
    }
  }
  
  return edges;
}

describe('Graph Virtualization', () => {
  describe('Viewport Bounds Calculation', () => {
    it('should calculate viewport bounds correctly', () => {
      const bounds = calculateViewportBounds({
        zoom: 1.5,
        pan: { x: 100, y: 50 },
        width: 800,
        height: 600,
      });

      expect(bounds.left).toBeCloseTo(-66.67, 1); // (0 - 100) / 1.5
      expect(bounds.right).toBeCloseTo(466.67, 1); // (800 - 100) / 1.5
      expect(bounds.top).toBeCloseTo(-33.33, 1);   // (0 - 50) / 1.5
      expect(bounds.bottom).toBeCloseTo(366.67, 1); // (600 - 50) / 1.5
    });

    it('should handle different zoom levels', () => {
      const zoomedIn = calculateViewportBounds({
        zoom: 2.0,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      });

      const zoomedOut = calculateViewportBounds({
        zoom: 0.5,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      });

      expect(zoomedIn.right - zoomedIn.left).toBe(400); // 800 / 2
      expect(zoomedOut.right - zoomedOut.left).toBe(1600); // 800 / 0.5
    });

    it('should add buffer margin to viewport', () => {
      const bounds = calculateViewportBounds({
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
        bufferMargin: 100,
      });

      expect(bounds.left).toBe(-100);
      expect(bounds.right).toBe(900);
      expect(bounds.top).toBe(-100);
      expect(bounds.bottom).toBe(700);
    });
  });

  describe('Visible Elements Filtering', () => {
    let vertices: Array<EntityGraphVertex & { x: number; y: number }>;
    let edges: EntityGraphEdge[];

    beforeEach(() => {
      vertices = [
        { ...createMockVertices(1)[0], id: 'v1', x: 100, y: 100 },
        { ...createMockVertices(1)[0], id: 'v2', x: 500, y: 300 },
        { ...createMockVertices(1)[0], id: 'v3', x: 1000, y: 800 }, // Outside viewport
        { ...createMockVertices(1)[0], id: 'v4', x: 200, y: 200 },
      ];

      edges = [
        { 
          id: 'e1', 
          sourceId: 'v1', 
          targetId: 'v2', 
          source: 'v1',
          target: 'v2',
          edgeType: EdgeType.CITES, 
          type: EdgeType.CITES,
          weight: 1,
          discoveredFromDirectVisit: true,
          discoveredAt: new Date().toISOString(),
          metadata: { source: 'openalex' as const }
        },
        { 
          id: 'e2', 
          sourceId: 'v1', 
          targetId: 'v3', 
          source: 'v1',
          target: 'v3',
          edgeType: EdgeType.CITES, 
          type: EdgeType.CITES,
          weight: 1,
          discoveredFromDirectVisit: true,
          discoveredAt: new Date().toISOString(),
          metadata: { source: 'openalex' as const }
        },
        { 
          id: 'e3', 
          sourceId: 'v2', 
          targetId: 'v4', 
          source: 'v2',
          target: 'v4',
          edgeType: EdgeType.CITES, 
          type: EdgeType.CITES,
          weight: 1,
          discoveredFromDirectVisit: true,
          discoveredAt: new Date().toISOString(),
          metadata: { source: 'openalex' as const }
        },
      ];
    });

    it('should filter vertices within viewport', () => {
      const viewport: ViewportBounds = {
        left: 0,
        right: 600,
        top: 0,
        bottom: 400,
      };

      const visible = getVisibleVertices(vertices, viewport);

      expect(visible).toHaveLength(3);
      expect(visible.map(v => v.id)).toEqual(['v1', 'v2', 'v4']);
      expect(visible.map(v => v.id)).not.toContain('v3');
    });

    it('should filter edges with visible endpoints', () => {
      const viewport: ViewportBounds = {
        left: 0,
        right: 600,
        top: 0,
        bottom: 400,
      };

      const visibleVertices = getVisibleVertices(vertices, viewport);
      const visibleEdges = getVisibleEdges(edges, visibleVertices);

      expect(visibleEdges).toHaveLength(2);
      expect(visibleEdges.map(e => e.id)).toEqual(['e1', 'e3']);
      expect(visibleEdges.map(e => e.id)).not.toContain('e2'); // v3 is not visible
    });

    it('should include edges with one endpoint visible', () => {
      const viewport: ViewportBounds = {
        left: 0,
        right: 300,
        top: 0,
        bottom: 250,
      };

      const visibleVertices = getVisibleVertices(vertices, viewport); // Only v1, v4
      const visibleEdges = getVisibleEdges(edges, visibleVertices, { includePartiallyVisible: true });

      expect(visibleVertices.map(v => v.id)).toEqual(['v1', 'v4']);
      expect(visibleEdges.length).toBeGreaterThan(0);
    });
  });

  describe('Level of Detail (LOD)', () => {
    it('should create appropriate LOD for different zoom levels', () => {
      const vertices = createMockVertices(1000);

      const highDetailLOD = createLevelOfDetail(vertices, {
        zoom: 2.0,
        maxVertices: 500,
        simplificationThreshold: 0.5,
      });

      const lowDetailLOD = createLevelOfDetail(vertices, {
        zoom: 0.3,
        maxVertices: 100,
        simplificationThreshold: 0.8,
      });

      expect(highDetailLOD.vertices.length).toBeGreaterThan(lowDetailLOD.vertices.length);
      expect(highDetailLOD.renderLabels).toBe(true);
      expect(lowDetailLOD.renderLabels).toBe(false);
    });

    it('should prioritize important vertices in LOD', () => {
      const vertices = createMockVertices(100);
      // Make some vertices more important (higher citation count)
      vertices[0].metadata.citedByCount = 1000;
      vertices[1].metadata.citedByCount = 500;
      vertices[2].metadata.citedByCount = 10;

      const lod = createLevelOfDetail(vertices, {
        zoom: 0.5,
        maxVertices: 50,
        simplificationThreshold: 0.7,
      });

      // Important vertices should be preserved
      expect(lod.vertices.some(v => v.id === vertices[0].id)).toBe(true);
      expect(lod.vertices.some(v => v.id === vertices[1].id)).toBe(true);
    });

    it('should adjust rendering quality based on zoom', () => {
      const vertices = createMockVertices(10);

      const highZoomLOD = createLevelOfDetail(vertices, { zoom: 3.0 });
      const lowZoomLOD = createLevelOfDetail(vertices, { zoom: 0.2 });

      expect(highZoomLOD.renderLabels).toBe(true);
      expect(highZoomLOD.renderDetails).toBe(true);
      expect(lowZoomLOD.renderLabels).toBe(false);
      expect(lowZoomLOD.renderDetails).toBe(false);
    });
  });

  describe('Vertex Rendering Optimization', () => {
    it('should optimize vertex rendering based on importance and size', () => {
      const vertices = createMockVertices(500);
      
      const optimized = optimizeVertexRendering(vertices, {
        maxRenderCount: 200,
        importanceWeight: 0.7,
        sizeWeight: 0.3,
      });

      expect(optimized.length).toBeLessThanOrEqual(200);
      
      // Should prioritize vertices with higher importance scores
      const avgCitationCount = optimized.reduce((sum, v) => sum + (v.metadata.citedByCount || 0), 0) / optimized.length;
      const allAvgCitationCount = vertices.reduce((sum, v) => sum + (v.metadata.citedByCount || 0), 0) / vertices.length;
      
      expect(avgCitationCount).toBeGreaterThanOrEqual(allAvgCitationCount);
    });

    it('should consider visit status in optimization', () => {
      const vertices = createMockVertices(100);
      // Ensure some vertices are visited
      vertices.slice(0, 10).forEach(v => {
        v.directlyVisited = true;
        v.visitCount = 5;
      });

      const optimized = optimizeVertexRendering(vertices, {
        maxRenderCount: 50,
        prioritizeVisited: true,
      });

      const visitedCount = optimized.filter(v => v.directlyVisited).length;
      expect(visitedCount).toBeGreaterThan(0);
    });
  });

  describe('Spatial Index', () => {
    let spatialIndex: SpatialIndex;
    let vertices: Array<EntityGraphVertex & { x: number; y: number }>;

    beforeEach(() => {
      vertices = [
        { ...createMockVertices(1)[0], id: 'v1', x: 100, y: 100 },
        { ...createMockVertices(1)[0], id: 'v2', x: 150, y: 120 },
        { ...createMockVertices(1)[0], id: 'v3', x: 500, y: 300 },
        { ...createMockVertices(1)[0], id: 'v4', x: 800, y: 600 },
      ];

      spatialIndex = createSpatialIndex(vertices, {
        cellSize: 100,
        bounds: { left: 0, right: 1000, top: 0, bottom: 700 },
      });
    });

    it('should create spatial index with correct structure', () => {
      expect(spatialIndex.cells.size).toBeGreaterThan(0);
      expect(spatialIndex.cellSize).toBe(100);
    });

    it('should find vertices in spatial range efficiently', () => {
      const viewport: ViewportBounds = {
        left: 80,
        right: 180,
        top: 80,
        bottom: 180,
      };

      const found = spatialIndex.queryRange(viewport);

      expect(found.length).toBe(2); // v1 and v2
      expect(found.map(v => v.id)).toContain('v1');
      expect(found.map(v => v.id)).toContain('v2');
    });

    it('should update spatial index when vertices move', () => {
      // Move vertex v1 to a new position
      vertices[0].x = 600;
      vertices[0].y = 400;

      spatialIndex.updateVertex(vertices[0]);

      const newViewport: ViewportBounds = {
        left: 580,
        right: 620,
        top: 380,
        bottom: 420,
      };

      const found = spatialIndex.queryRange(newViewport);
      expect(found.some(v => v.id === 'v1')).toBe(true);
    });
  });

  describe('GraphVirtualizer Class', () => {
    let virtualizer: GraphVirtualizer;
    let vertices: Array<EntityGraphVertex & { x: number; y: number }>;
    let edges: EntityGraphEdge[];

    beforeEach(() => {
      vertices = createMockVertices(1000);
      edges = createMockEdges(vertices, 500);

      const config: VirtualizationConfig = {
        maxVertices: 200,
        maxEdges: 300,
        lodLevels: 3,
        enableSpatialIndex: true,
        bufferMargin: 50,
      };

      virtualizer = new GraphVirtualizer(config);
      virtualizer.updateData(vertices, edges);
    });

    it('should initialize with correct configuration', () => {
      expect(virtualizer.getConfig().maxVertices).toBe(200);
      expect(virtualizer.getConfig().maxEdges).toBe(300);
    });

    it('should update viewport and return visible elements', () => {
      const viewport = {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      };

      const result = virtualizer.updateViewport(viewport);

      expect(result.vertices.length).toBeLessThanOrEqual(200);
      expect(result.edges.length).toBeLessThanOrEqual(300);
      expect(result.stats.totalVertices).toBe(1000);
      expect(result.stats.totalEdges).toBe(500);
    });

    it('should adapt LOD based on zoom level', () => {
      const zoomedInResult = virtualizer.updateViewport({
        zoom: 2.0,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      });

      const zoomedOutResult = virtualizer.updateViewport({
        zoom: 0.3,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      });

      expect(zoomedInResult.lod.renderLabels).toBe(true);
      expect(zoomedOutResult.lod.renderLabels).toBe(false);
    });

    it('should provide performance statistics', () => {
      const viewport = {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      };

      const result = virtualizer.updateViewport(viewport);

      expect(result.stats.visibleVertices).toBeTypeOf('number');
      expect(result.stats.visibleEdges).toBeTypeOf('number');
      expect(result.stats.renderTime).toBeTypeOf('number');
      expect(result.stats.culledVertices).toBeTypeOf('number');
    });

    it('should handle dynamic data updates', () => {
      const newVertices = createMockVertices(500);
      const newEdges = createMockEdges(newVertices, 250);

      virtualizer.updateData(newVertices, newEdges);

      const viewport = {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      };

      const result = virtualizer.updateViewport(viewport);

      expect(result.stats.totalVertices).toBe(500);
      expect(result.stats.totalEdges).toBe(250);
    });
  });

  describe('Performance Optimization', () => {
    it('should maintain target frame rate under heavy load', async () => {
      const largeVertices = createMockVertices(5000);
      const largeEdges = createMockEdges(largeVertices, 2500);

      const config: VirtualizationConfig = {
        maxVertices: 500,
        maxEdges: 500,
        targetFrameRate: 30,
        adaptiveQuality: true,
      };

      const virtualizer = new GraphVirtualizer(config);
      virtualizer.updateData(largeVertices, largeEdges);

      const viewport = {
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        width: 1200,
        height: 800,
      };

      const start = performance.now();
      const result = virtualizer.updateViewport(viewport);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(33); // Should complete within one frame (30 FPS)
      expect(result.vertices.length).toBeLessThanOrEqual(500);
    });

    it('should adapt quality based on performance', () => {
      const virtualizer = new GraphVirtualizer({
        maxVertices: 1000,
        maxEdges: 1000,
        adaptiveQuality: true,
        targetFrameRate: 60,
      });

      // Simulate performance pressure
      const mockPerformance = vi.spyOn(performance, 'now');
      mockPerformance.mockReturnValueOnce(0).mockReturnValueOnce(50); // 50ms frame time

      const vertices = createMockVertices(2000);
      virtualizer.updateData(vertices, []);

      const result = virtualizer.updateViewport({
        zoom: 1.0,
        pan: { x: 0, y: 0 },
        width: 800,
        height: 600,
      });

      // Should reduce quality due to poor performance
      expect(result.vertices.length).toBeLessThan(1000);

      mockPerformance.mockRestore();
    });
  });
});