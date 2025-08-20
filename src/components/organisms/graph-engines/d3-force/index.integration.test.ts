/**
 * D3 Force Engine Integration Tests
 * 
 * Comprehensive integration tests for the D3.js Force Simulation graph engine.
 * Tests the engine's ability to handle academic graph data, interactions, 
 * performance characteristics, and integration with the graph visualization system.
 * 
 * Test Categories:
 * - Basic functionality and lifecycle management
 * - Academic graph data handling and integration
 * - Performance and memory management
 * - Interaction capabilities and user events
 * - Export functionality and data serialization
 * - Error handling and edge cases
 * - Integration with graph system architecture
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { D3ForceEngine, createD3ForceEngine, getDefaultD3ForceConfig, getHighPerformanceD3ForceConfig } from './index';
import { createTestGraph, createMockEngine } from '../testing/engine-test-utils';
import type { 
  IGraph, 
  IVertex, 
  IEdge, 
  IDimensions, 
  IPositionedVertex 
} from '../../graph-core/interfaces';
import type { IEngineConfig } from '../types';

// ============================================================================
// Test Utilities - Academic Graph Data Generation
// ============================================================================

/**
 * Academic entity types for test data
 */
interface AcademicVertexData {
  entityType: 'author' | 'work' | 'institution' | 'topic' | 'source' | 'funder';
  name: string;
  metadata: {
    citationCount?: number;
    hIndex?: number;
    publicationYear?: number;
    discipline?: string;
    country?: string;
    impact?: number;
  };
}

interface AcademicEdgeData {
  relationshipType: 'authorship' | 'citation' | 'collaboration' | 'affiliation' | 'funding';
  strength: number;
  metadata: {
    year?: number;
    duration?: number;
    citations?: number;
  };
}

/**
 * Create academic graph data for testing
 */
function createAcademicTestGraph(size: 'small' | 'medium' | 'large' = 'small'): IGraph<AcademicVertexData, AcademicEdgeData> {
  const sizes = {
    small: { vertices: 10, edges: 15 },
    medium: { vertices: 50, edges: 100 },
    large: { vertices: 200, edges: 500 }
  };
  
  const { vertices: vertexCount, edges: edgeCount } = sizes[size];
  
  // Generate academic vertices
  const vertices: IVertex<AcademicVertexData>[] = [];
  const entityTypes: AcademicVertexData['entityType'][] = ['author', 'work', 'institution', 'topic'];
  
  for (let i = 0; i < vertexCount; i++) {
    const entityType = entityTypes[i % entityTypes.length];
    vertices.push({
      id: `${entityType}-${i}`,
      data: {
        entityType,
        name: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${i}`,
        metadata: {
          citationCount: Math.floor(Math.random() * 1000),
          hIndex: Math.floor(Math.random() * 50),
          publicationYear: 2010 + Math.floor(Math.random() * 14),
          discipline: ['Computer Science', 'Physics', 'Biology', 'Mathematics'][Math.floor(Math.random() * 4)],
          country: ['USA', 'UK', 'Germany', 'China', 'Japan'][Math.floor(Math.random() * 5)],
          impact: Math.random() * 10
        }
      },
      label: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${i}`,
      metadata: {
        type: entityType,
        weight: Math.floor(Math.random() * 100),
        importance: Math.random()
      }
    });
  }
  
  // Generate academic edges
  const edges: IEdge<AcademicEdgeData>[] = [];
  const relationshipTypes: AcademicEdgeData['relationshipType'][] = 
    ['authorship', 'citation', 'collaboration', 'affiliation'];
  
  for (let i = 0; i < edgeCount; i++) {
    const sourceIndex = Math.floor(Math.random() * vertexCount);
    const targetIndex = Math.floor(Math.random() * vertexCount);
    
    if (sourceIndex !== targetIndex) {
      const relationshipType = relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)];
      edges.push({
        id: `edge-${i}`,
        sourceId: vertices[sourceIndex].id,
        targetId: vertices[targetIndex].id,
        data: {
          relationshipType,
          strength: Math.random() * 10,
          metadata: {
            year: 2010 + Math.floor(Math.random() * 14),
            duration: Math.floor(Math.random() * 5),
            citations: Math.floor(Math.random() * 100)
          }
        },
        label: `${relationshipType} (${Math.floor(Math.random() * 100)})`,
        weight: Math.random(),
        metadata: {
          type: relationshipType,
          strength: Math.random() * 10
        }
      });
    }
  }
  
  return { vertices, edges };
}

/**
 * Create DOM container for engine testing
 */
function createTestContainer(): HTMLElement {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  container.style.position = 'relative';
  document.body.appendChild(container);
  return container;
}

/**
 * Clean up DOM container after testing
 */
function cleanupContainer(container: HTMLElement): void {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

// ============================================================================
// Test Suite - D3 Force Engine Integration
// ============================================================================

describe('D3 Force Engine Integration', () => {
  let engine: D3ForceEngine<AcademicVertexData, AcademicEdgeData>;
  let container: HTMLElement;
  let testDimensions: IDimensions;
  
  beforeEach(() => {
    engine = new D3ForceEngine<AcademicVertexData, AcademicEdgeData>();
    container = createTestContainer();
    testDimensions = { width: 800, height: 600 };
  });
  
  afterEach(() => {
    if (engine) {
      engine.destroy();
    }
    if (container) {
      cleanupContainer(container);
    }
  });

  // ========================================================================
  // Basic Functionality Tests
  // ========================================================================

  describe('Engine Identification and Metadata', () => {
    it('should have correct engine identification', () => {
      expect(engine.id).toBe('d3-force');
      expect(engine.name).toBe('D3.js Force Simulation');
      expect(engine.description).toContain('Physics-based');
      expect(engine.version).toBe('1.0.0');
      expect(engine.isImplemented).toBe(true);
    });

    it('should have appropriate capabilities for interactive graphs', () => {
      const { capabilities } = engine;
      
      expect(capabilities.maxVertices).toBe(5000);
      expect(capabilities.maxEdges).toBe(20000);
      expect(capabilities.supportsHardwareAcceleration).toBe(false);
      expect(capabilities.supportsInteractiveLayout).toBe(true);
      expect(capabilities.supportsPhysicsSimulation).toBe(true);
      expect(capabilities.supportsCustomShapes).toBe(true);
      expect(capabilities.exportFormats).toContain('png');
      expect(capabilities.exportFormats).toContain('svg');
      expect(capabilities.memoryUsage).toBe('low');
      expect(capabilities.cpuUsage).toBe('high'); // Physics calculations
    });

    it('should have proper requirements and dependencies', () => {
      const { requirements } = engine;
      
      expect(requirements.dependencies).toContainEqual(
        expect.objectContaining({ name: 'd3-force' })
      );
      expect(requirements.dependencies).toContainEqual(
        expect.objectContaining({ name: 'd3-selection' })
      );
      expect(requirements.browserSupport.chrome).toBeGreaterThanOrEqual(45);
      expect(requirements.requiredFeatures).toContain('SVG');
      expect(requirements.setupInstructions).toContain('npm install');
    });
  });

  describe('Engine Lifecycle Management', () => {
    it('should initialize successfully with valid container and dimensions', async () => {
      expect(engine.status.isInitialised).toBe(false);
      
      await engine.initialise(container, testDimensions);
      
      expect(engine.status.isInitialised).toBe(true);
      expect(engine.status.isRendering).toBe(false);
      expect(engine.status.lastError).toBeUndefined();
      
      // Verify DOM structure was created
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('width')).toBe('800');
      expect(svg?.getAttribute('height')).toBe('600');
      
      const mainGroup = container.querySelector('svg g.graph-container');
      expect(mainGroup).toBeTruthy();
    });

    it('should handle initialization with custom configuration', async () => {
      const config: IEngineConfig = {
        performanceLevel: 'performance',
        debug: true,
        parameters: {
          forceOptions: {
            linkDistance: 100,
            chargeStrength: -400,
            centerStrength: 0.2
          }
        }
      };
      
      await engine.initialise(container, testDimensions, config);
      
      expect(engine.status.isInitialised).toBe(true);
      
      // Verify DOM creation with custom config
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should handle resize operations correctly', async () => {
      await engine.initialise(container, testDimensions);
      
      const newDimensions: IDimensions = { width: 1200, height: 800 };
      engine.resize(newDimensions);
      
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('1200');
      expect(svg?.getAttribute('height')).toBe('800');
    });

    it('should clean up resources on destroy', async () => {
      await engine.initialise(container, testDimensions);
      expect(engine.status.isInitialised).toBe(true);
      
      engine.destroy();
      
      expect(engine.status.isInitialised).toBe(false);
      expect(engine.status.isRendering).toBe(false);
      expect(container.children.length).toBe(0); // DOM cleaned up
    });
  });

  // ========================================================================
  // Academic Graph Data Integration Tests
  // ========================================================================

  describe('Academic Graph Data Loading', () => {
    it('should load small academic graph successfully', async () => {
      await engine.initialise(container, testDimensions);
      
      const academicGraph = createAcademicTestGraph('small');
      expect(academicGraph.vertices).toHaveLength(10);
      expect(academicGraph.edges).toHaveLength(15);
      
      await engine.loadGraph(academicGraph);
      
      expect(engine.status.isInitialised).toBe(true);
      expect(engine.status.isRendering).toBe(false); // Rendering should complete
      
      const positions = engine.getPositions();
      expect(positions).toHaveLength(10);
      
      // Verify academic data preservation
      positions.forEach(pos => {
        expect(pos.data.entityType).toBeDefined();
        expect(pos.data.name).toBeDefined();
        expect(pos.data.metadata).toBeDefined();
        expect(pos.position.x).toBeGreaterThanOrEqual(0);
        expect(pos.position.y).toBeGreaterThanOrEqual(0);
      });
      
      // Verify DOM rendering
      const circles = container.querySelectorAll('circle.node');
      expect(circles).toHaveLength(10);
      
      const lines = container.querySelectorAll('line.link');
      expect(lines).toHaveLength(15);
      
      const labels = container.querySelectorAll('text.label');
      expect(labels).toHaveLength(10);
    });

    it('should handle different academic entity types correctly', async () => {
      await engine.initialise(container, testDimensions);
      
      const mixedGraph = createAcademicTestGraph('small');
      await engine.loadGraph(mixedGraph);
      
      const positions = engine.getPositions();
      const entityTypes = positions.map(p => p.data.entityType);
      
      expect(entityTypes).toContain('author');
      expect(entityTypes).toContain('work');
      expect(entityTypes).toContain('institution');
      expect(entityTypes).toContain('topic');
      
      // Verify each entity type has proper academic metadata
      positions.forEach(pos => {
        if (pos.data.entityType === 'work') {
          expect(pos.data.metadata.publicationYear).toBeGreaterThanOrEqual(2010);
        }
        if (pos.data.entityType === 'author') {
          expect(pos.data.metadata.hIndex).toBeGreaterThanOrEqual(0);
          expect(pos.data.metadata.citationCount).toBeGreaterThanOrEqual(0);
        }
        if (pos.data.entityType === 'institution') {
          expect(pos.data.metadata.country).toBeDefined();
        }
      });
    });

    it('should handle academic relationship types in edges', async () => {
      await engine.initialise(container, testDimensions);
      
      const academicGraph = createAcademicTestGraph('small');
      await engine.loadGraph(academicGraph);
      
      // Verify all academic relationship types are preserved
      const relationships = academicGraph.edges.map(e => e.data.relationshipType);
      expect(relationships).toEqual(expect.arrayContaining(['authorship', 'citation', 'collaboration', 'affiliation']));
      
      // Verify relationship strength and metadata
      academicGraph.edges.forEach(edge => {
        expect(edge.data.strength).toBeGreaterThanOrEqual(0);
        expect(edge.data.strength).toBeLessThanOrEqual(10);
        expect(edge.data.metadata.year).toBeGreaterThanOrEqual(2010);
      });
    });

    it('should handle medium-sized academic graphs efficiently', async () => {
      await engine.initialise(container, testDimensions);
      
      const mediumGraph = createAcademicTestGraph('medium');
      expect(mediumGraph.vertices).toHaveLength(50);
      expect(mediumGraph.edges).toHaveLength(100);
      
      const startTime = performance.now();
      await engine.loadGraph(mediumGraph);
      const loadTime = performance.now() - startTime;
      
      // Should load reasonably quickly (within engine capabilities)
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
      
      const positions = engine.getPositions();
      expect(positions).toHaveLength(50);
      
      // Verify DOM elements created
      const circles = container.querySelectorAll('circle.node');
      const lines = container.querySelectorAll('line.link');
      expect(circles).toHaveLength(50);
      expect(lines).toHaveLength(100);
    });
  });

  describe('Graph Update Operations', () => {
    it('should update graph data maintaining physics state', async () => {
      await engine.initialise(container, testDimensions);
      
      const initialGraph = createAcademicTestGraph('small');
      await engine.loadGraph(initialGraph);
      
      const initialPositions = engine.getPositions();
      expect(initialPositions).toHaveLength(10);
      
      // Create updated graph with additional vertex
      const updatedGraph = createAcademicTestGraph('small');
      const updatedVertices = [...updatedGraph.vertices];
      updatedVertices.push({
        id: 'new-author-10',
        data: {
          entityType: 'author',
          name: 'New Author 10',
          metadata: {
            citationCount: 500,
            hIndex: 25,
            discipline: 'Computer Science'
          }
        },
        label: 'New Author 10'
      });
      
      const updatedGraphWithNewVertex = {
        ...updatedGraph,
        vertices: updatedVertices
      };
      
      await engine.updateGraph(updatedGraphWithNewVertex, true); // With animation
      
      const updatedPositions = engine.getPositions();
      expect(updatedPositions).toHaveLength(11);
      
      // Verify new vertex has position
      const newVertex = updatedPositions.find(p => p.id === 'new-author-10');
      expect(newVertex).toBeDefined();
      expect(newVertex?.data.entityType).toBe('author');
      expect(newVertex?.position.x).toBeGreaterThanOrEqual(0);
      expect(newVertex?.position.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle graph updates without animation', async () => {
      await engine.initialise(container, testDimensions);
      
      const graph = createAcademicTestGraph('small');
      await engine.loadGraph(graph);
      
      // Update without animation
      await engine.updateGraph(graph, false);
      
      expect(engine.status.isRendering).toBe(false);
      const positions = engine.getPositions();
      expect(positions).toHaveLength(10);
    });
  });

  // ========================================================================
  // Position and Layout Management Tests
  // ========================================================================

  describe('Position Management', () => {
    it('should provide accurate vertex positions', async () => {
      await engine.initialise(container, testDimensions);
      
      const graph = createAcademicTestGraph('small');
      await engine.loadGraph(graph);
      
      const positions = engine.getPositions();
      expect(positions).toHaveLength(10);
      
      positions.forEach(pos => {
        expect(pos.id).toBeDefined();
        expect(pos.data).toBeDefined();
        expect(pos.position.x).toBeTypeOf('number');
        expect(pos.position.y).toBeTypeOf('number');
        expect(pos.position.x).toBeGreaterThanOrEqual(0);
        expect(pos.position.y).toBeGreaterThanOrEqual(0);
        expect(pos.position.x).toBeLessThanOrEqual(testDimensions.width);
        expect(pos.position.y).toBeLessThanOrEqual(testDimensions.height);
      });
    });

    it('should set positions programmatically', async () => {
      await engine.initialise(container, testDimensions);
      
      const graph = createAcademicTestGraph('small');
      await engine.loadGraph(graph);
      
      const originalPositions = engine.getPositions();
      
      // Set custom positions
      const customPositions: IPositionedVertex<AcademicVertexData>[] = originalPositions.map(pos => ({
        ...pos,
        position: {
          x: Math.random() * testDimensions.width,
          y: Math.random() * testDimensions.height
        }
      }));
      
      engine.setPositions(customPositions, false); // No animation
      
      const newPositions = engine.getPositions();
      expect(newPositions).toHaveLength(10);
      
      // Verify positions were set (allowing for small physics adjustments)
      newPositions.forEach((newPos, _index) => {
        const customPos = customPositions[_index];
        expect(Math.abs(newPos.position.x - customPos.position.x)).toBeLessThan(50);
        expect(Math.abs(newPos.position.y - customPos.position.y)).toBeLessThan(50);
      });
    });

    it('should fit graph to view correctly', async () => {
      await engine.initialise(container, testDimensions);
      
      const graph = createAcademicTestGraph('small');
      await engine.loadGraph(graph);
      
      // Spread vertices to extreme positions
      const extremePositions = graph.vertices.map((v, i) => ({
        ...v,
        position: {
          x: i % 2 === 0 ? 0 : testDimensions.width,
          y: i % 2 === 0 ? 0 : testDimensions.height
        },
        data: v.data
      }));
      engine.setPositions(extremePositions, false);
      
      // Fit to view
      engine.fitToView(50, false); // 50px padding, no animation
      
      // Allow time for layout to apply
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const fittedPositions = engine.getPositions();
      
      // Verify all positions are within bounds with padding
      fittedPositions.forEach(pos => {
        expect(pos.position.x).toBeGreaterThanOrEqual(0);
        expect(pos.position.y).toBeGreaterThanOrEqual(0);
        expect(pos.position.x).toBeLessThanOrEqual(testDimensions.width);
        expect(pos.position.y).toBeLessThanOrEqual(testDimensions.height);
      });
    });
  });

  // ========================================================================
  // Export Functionality Tests
  // ========================================================================

  describe('Export Capabilities', () => {
    it('should export graph as SVG', async () => {
      await engine.initialise(container, testDimensions);
      
      const graph = createAcademicTestGraph('small');
      await engine.loadGraph(graph);
      
      const svgData = await engine.export('svg');
      expect(typeof svgData).toBe('string');
      expect(svgData).toContain('data:image/svg+xml');
      expect(svgData).toContain('svg');
      
      // Verify SVG contains graph elements
      const svgString = typeof svgData === 'string' ? svgData : '';
      const decodedSvg = decodeURIComponent(svgString.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decodedSvg).toContain('circle');
      expect(decodedSvg).toContain('line');
    });

    it('should export graph as PNG blob', async () => {
      await engine.initialise(container, testDimensions);
      
      const graph = createAcademicTestGraph('small');
      await engine.loadGraph(graph);
      
      const pngBlob = await engine.export('png');
      expect(pngBlob).toBeInstanceOf(Blob);
      expect((pngBlob as Blob).type).toBe('image/png');
      expect((pngBlob as Blob).size).toBeGreaterThan(0);
    });

    it('should export graph as JSON', async () => {
      await engine.initialise(container, testDimensions);
      
      const graph = createAcademicTestGraph('small');
      await engine.loadGraph(graph);
      
      const jsonData = await engine.export('json');
      expect(typeof jsonData).toBe('string');
      
      const parsed = JSON.parse(jsonData as string);
      expect(parsed.nodes).toBeDefined();
      expect(parsed.links).toBeDefined();
      expect(parsed.nodes).toHaveLength(10);
      expect(parsed.links).toHaveLength(15);
      
      // Verify academic data is preserved in export
      parsed.nodes.forEach((node: any) => {
        expect(node.id).toBeDefined();
        expect(node.data).toBeDefined();
        expect(node.data.entityType).toBeDefined();
      });
    });

    it('should handle export errors gracefully', async () => {
      await engine.initialise(container, testDimensions);
      
      // Test unsupported format
      await expect(engine.export('pdf' as any))
        .rejects.toThrow("Export format 'pdf' not supported");
    });
  });

  // ========================================================================
  // Configuration and Performance Tests
  // ========================================================================

  describe('Configuration Management', () => {
    it('should use default D3 force configuration', async () => {
      const defaultConfig = getDefaultD3ForceConfig();
      
      expect(defaultConfig.forceOptions).toBeDefined();
      expect(defaultConfig.forceOptions?.linkDistance).toBe(80);
      expect(defaultConfig.forceOptions?.linkStrength).toBe(0.1);
      expect(defaultConfig.forceOptions?.chargeStrength).toBe(-300);
      expect(defaultConfig.forceOptions?.centerStrength).toBe(0.1);
      expect(defaultConfig.performanceLevel).toBe('balanced');
    });

    it('should use high-performance configuration for large graphs', async () => {
      const perfConfig = getHighPerformanceD3ForceConfig();
      
      expect(perfConfig.forceOptions).toBeDefined();
      expect(perfConfig.forceOptions?.alphaDecay).toBe(0.05); // Faster convergence
      expect(perfConfig.forceOptions?.velocityDecay).toBe(0.6); // More damping
      expect(perfConfig.performanceLevel).toBe('performance');
    });

    it('should create engine instance with factory function', () => {
      const factoryEngine = createD3ForceEngine();
      
      expect(factoryEngine).toBeInstanceOf(D3ForceEngine);
      expect(factoryEngine.id).toBe('d3-force');
      expect(factoryEngine.name).toBe('D3.js Force Simulation');
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle graph loading within performance bounds', async () => {
      await engine.initialise(container, testDimensions);
      
      const mediumGraph = createAcademicTestGraph('medium');
      
      const startTime = performance.now();
      await engine.loadGraph(mediumGraph);
      const loadTime = performance.now() - startTime;
      
      // Should load within reasonable time for medium graph
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
      
      const positions = engine.getPositions();
      expect(positions).toHaveLength(50);
    });

    it('should provide preview component for engine demonstration', () => {
      const PreviewComponent = engine.getPreviewComponent();
      expect(PreviewComponent).toBeDefined();
      
      // Should be a React component function
      expect(typeof PreviewComponent).toBe('function');
    });
  });

  // ========================================================================
  // Error Handling and Edge Cases
  // ========================================================================

  describe('Error Handling', () => {
    it('should handle initialization without container', async () => {
      await expect(engine.initialise(null as any, testDimensions))
        .rejects.toThrow();
    });

    it('should handle loading graph before initialization', async () => {
      const graph = createAcademicTestGraph('small');
      
      await expect(engine.loadGraph(graph))
        .rejects.toThrow('Engine not initialised');
    });

    it('should handle empty graph gracefully', async () => {
      await engine.initialise(container, testDimensions);
      
      const emptyGraph: IGraph<AcademicVertexData, AcademicEdgeData> = {
        vertices: [],
        edges: []
      };
      
      await engine.loadGraph(emptyGraph);
      
      const positions = engine.getPositions();
      expect(positions).toHaveLength(0);
      
      // Verify no DOM elements created
      const circles = container.querySelectorAll('circle.node');
      const lines = container.querySelectorAll('line.link');
      expect(circles).toHaveLength(0);
      expect(lines).toHaveLength(0);
    });

    it('should handle single vertex graph', async () => {
      await engine.initialise(container, testDimensions);
      
      const singleVertexGraph: IGraph<AcademicVertexData, AcademicEdgeData> = {
        vertices: [{
          id: 'single-author',
          data: {
            entityType: 'author',
            name: 'Solo Researcher',
            metadata: {
              citationCount: 100,
              hIndex: 10
            }
          },
          label: 'Solo Researcher'
        }],
        edges: []
      };
      
      await engine.loadGraph(singleVertexGraph);
      
      const positions = engine.getPositions();
      expect(positions).toHaveLength(1);
      expect(positions[0].position.x).toBeTypeOf('number');
      expect(positions[0].position.y).toBeTypeOf('number');
      
      const circles = container.querySelectorAll('circle.node');
      expect(circles).toHaveLength(1);
    });

    it('should handle malformed graph data', async () => {
      await engine.initialise(container, testDimensions);
      
      // Graph with edge referencing non-existent vertex
      const malformedGraph: IGraph<AcademicVertexData, AcademicEdgeData> = {
        vertices: [{
          id: 'author-1',
          data: {
            entityType: 'author',
            name: 'Author 1',
            metadata: { citationCount: 50 }
          }
        }],
        edges: [{
          id: 'edge-1',
          sourceId: 'author-1',
          targetId: 'non-existent-author', // Invalid reference
          data: {
            relationshipType: 'collaboration',
            strength: 5,
            metadata: {}
          }
        }]
      };
      
      // Should handle gracefully (D3 typically ignores invalid edges)
      await expect(engine.loadGraph(malformedGraph)).resolves.not.toThrow();
      
      const positions = engine.getPositions();
      expect(positions).toHaveLength(1);
    });
  });

  // ========================================================================
  // Integration with Graph System Architecture
  // ========================================================================

  describe('Graph System Integration', () => {
    it('should maintain consistency with IGraphEngine interface', () => {
      // Verify all required interface methods are implemented
      expect(typeof engine.initialise).toBe('function');
      expect(typeof engine.loadGraph).toBe('function');
      expect(typeof engine.updateGraph).toBe('function');
      expect(typeof engine.resize).toBe('function');
      expect(typeof engine.export).toBe('function');
      expect(typeof engine.getPositions).toBe('function');
      expect(typeof engine.setPositions).toBe('function');
      expect(typeof engine.fitToView).toBe('function');
      expect(typeof engine.destroy).toBe('function');
      
      // Verify readonly properties
      expect(engine.id).toBe('d3-force');
      expect(engine.capabilities).toBeDefined();
      expect(engine.requirements).toBeDefined();
      expect(engine.status).toBeDefined();
    });

    it('should work with generic graph data types', async () => {
      // Test with different data types
      interface CustomVertexData {
        customField: string;
        value: number;
      }
      
      interface CustomEdgeData {
        customRelation: string;
        weight: number;
      }
      
      const customEngine = new D3ForceEngine<CustomVertexData, CustomEdgeData>();
      await customEngine.initialise(container, testDimensions);
      
      const customGraph: IGraph<CustomVertexData, CustomEdgeData> = {
        vertices: [
          {
            id: 'v1',
            data: { customField: 'test1', value: 10 }
          },
          {
            id: 'v2',
            data: { customField: 'test2', value: 20 }
          }
        ],
        edges: [
          {
            id: 'e1',
            sourceId: 'v1',
            targetId: 'v2',
            data: { customRelation: 'connects', weight: 0.5 }
          }
        ]
      };
      
      await customEngine.loadGraph(customGraph);
      
      const positions = customEngine.getPositions();
      expect(positions).toHaveLength(2);
      expect(positions[0].data.customField).toBeDefined();
      expect(positions[1].data.value).toBeTypeOf('number');
      
      customEngine.destroy();
    });

    it('should handle concurrent operations safely', async () => {
      await engine.initialise(container, testDimensions);
      
      const graph = createAcademicTestGraph('small');
      
      // Start multiple operations concurrently
      const operations = [
        engine.loadGraph(graph),
        engine.resize({ width: 900, height: 700 }),
        engine.getPositions(),
        engine.fitToView(30, false)
      ];
      
      // Should not throw errors or cause race conditions
      await expect(Promise.all(operations)).resolves.not.toThrow();
      
      expect(engine.status.isInitialised).toBe(true);
    });
  });
});