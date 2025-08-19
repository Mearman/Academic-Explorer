/**
 * CustomSVG Engine Usage Example
 * 
 * Demonstrates how to use the CustomSVG engine as a drop-in replacement
 * for existing SVG graph components while gaining access to advanced
 * features like standardized interfaces, performance monitoring,
 * and multiple export formats.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

import type { IGraph, IVertex, IEdge } from '../../interfaces';
import {
  createCustomSVGEngine,
  createOptimizedEngineConfig,
  getPerformanceRecommendations,
  type IGraphEngine,
  type IEngineEvent,
} from '../index';

// ============================================================================
// Sample Data Generation
// ============================================================================

/**
 * Generate sample academic collaboration graph
 */
function generateSampleGraph(nodeCount: number, edgeCount: number): IGraph {
  const entityTypes = ['author', 'work', 'source', 'institution'] as const;
  
  // Generate vertices
  const vertices: IVertex[] = Array.from({ length: nodeCount }, (_, i) => {
    const entityType = entityTypes[i % entityTypes.length];
    return {
      id: `${entityType[0]}${i}`,
      label: `${entityType} ${i}`,
      data: {
        entityType,
        displayName: `${entityType} ${i}`,
        visitCount: Math.floor(Math.random() * 10) + 1,
        directlyVisited: Math.random() > 0.7,
        url: `https://openalex.org/${entityType[0]}${i}`,
      },
      metadata: {
        entityType,
        position: Math.random() > 0.5 ? {
          x: Math.random() * 800,
          y: Math.random() * 600,
        } : undefined,
      },
    };
  });
  
  // Generate edges
  const edges: IEdge[] = Array.from({ length: edgeCount }, (_, i) => {
    const sourceIdx = Math.floor(Math.random() * nodeCount);
    let targetIdx = Math.floor(Math.random() * nodeCount);
    
    // Avoid self-loops
    while (targetIdx === sourceIdx) {
      targetIdx = Math.floor(Math.random() * nodeCount);
    }
    
    return {
      id: `e${i}`,
      sourceId: vertices[sourceIdx].id,
      targetId: vertices[targetIdx].id,
      weight: Math.random() * 2 + 0.5,
      label: `Relation ${i}`,
      directed: true,
      data: {
        relationType: 'collaboration',
        strength: Math.random(),
      },
    };
  });
  
  return { vertices, edges };
}

// ============================================================================
// Engine Control Panel Component
// ============================================================================

interface EngineControlsProps {
  engine?: IGraphEngine;
  onLayoutChange: (layoutId: string) => void;
  onExport: (format: string) => void;
  onFitToViewport: () => void;
  onClearSelection: () => void;
}

function EngineControls({
  engine,
  onLayoutChange,
  onExport,
  onFitToViewport,
  onClearSelection,
}: EngineControlsProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Update metrics periodically
  useEffect(() => {
    if (!engine) return;
    
    const updateMetrics = () => {
      setMetrics(engine.getMetrics());
      setDebugInfo(engine.getDebugInfo());
    };
    
    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);
    
    return () => clearInterval(interval);
  }, [engine]);
  
  const layouts = [
    { id: 'force-directed', name: 'Force-Directed' },
    { id: 'circular', name: 'Circular' },
    { id: 'grid', name: 'Grid' },
    { id: 'hierarchical', name: 'Hierarchical' },
  ];
  
  const exportFormats = [
    { id: 'png', name: 'PNG Image' },
    { id: 'svg', name: 'SVG Vector' },
    { id: 'jpeg', name: 'JPEG Image' },
    { id: 'json', name: 'JSON Data' },
  ];
  
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      right: '10px',
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      fontSize: '14px',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Layout Controls */}
        <div>
          <label style={{ marginRight: '8px', fontWeight: 'bold' }}>Layout:</label>
          <select
            onChange={(e) => onLayoutChange(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            {layouts.map(layout => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Export Controls */}
        <div>
          <label style={{ marginRight: '8px', fontWeight: 'bold' }}>Export:</label>
          <select
            onChange={(e) => e.target.value && onExport(e.target.value)}
            value=""
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">Select format...</option>
            {exportFormats.map(format => (
              <option key={format.id} value={format.id}>
                {format.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onFitToViewport}
            style={{
              padding: '6px 12px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Fit to View
          </button>
          <button
            onClick={onClearSelection}
            style={{
              padding: '6px 12px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear Selection
          </button>
        </div>
        
        {/* Performance Metrics */}
        {metrics && (
          <div style={{
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
            color: '#666',
            alignItems: 'center',
          }}>
            <span>FPS: {metrics.fps.toFixed(1)}</span>
            <span>Render: {metrics.renderTime.toFixed(1)}ms</span>
            <span>Nodes: {metrics.vertexCount}</span>
            <span>Edges: {metrics.edgeCount}</span>
            {metrics.culledVertices > 0 && (
              <span>Culled: {metrics.culledVertices}v, {metrics.culledEdges}e</span>
            )}
          </div>
        )}
        
        {/* Debug Info Toggle */}
        <div>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#666' }}>
              Debug Info
            </summary>
            {debugInfo && (
              <pre style={{
                fontSize: '10px',
                background: '#f8f9fa',
                padding: '8px',
                borderRadius: '4px',
                marginTop: '8px',
                maxWidth: '400px',
                overflow: 'auto',
              }}>
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </details>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Example Component
// ============================================================================

interface CustomSVGExampleProps {
  /** Number of vertices to generate */
  nodeCount?: number;
  /** Number of edges to generate */
  edgeCount?: number;
  /** Container width */
  width?: number;
  /** Container height */
  height?: number;
  /** Whether to show performance recommendations */
  showRecommendations?: boolean;
}

export function CustomSVGExample({
  nodeCount = 50,
  edgeCount = 100,
  width = 800,
  height = 600,
  showRecommendations = true,
}: CustomSVGExampleProps) {
  
  // ============================================================================
  // State and Refs
  // ============================================================================
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<IGraphEngine | undefined>(undefined);
  const [graph, setGraph] = useState<IGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ vertices: Set<string>; edges: Set<string> }>({
    vertices: new Set(),
    edges: new Set(),
  });
  const [recommendations, setRecommendations] = useState<any>(null);
  
  // ============================================================================
  // Engine Initialization
  // ============================================================================
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    let mounted = true;
    
    const initializeEngine = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Generate sample data
        const sampleGraph = generateSampleGraph(nodeCount, edgeCount);
        setGraph(sampleGraph);
        
        // Get performance recommendations
        if (showRecommendations) {
          const recs = getPerformanceRecommendations(nodeCount, edgeCount);
          setRecommendations(recs);
        }
        
        // Create optimized configuration
        const config = createOptimizedEngineConfig(
          nodeCount,
          edgeCount,
          { width, height },
          {
            prioritizeQuality: nodeCount < 100,
            prioritizePerformance: nodeCount > 500,
            enableAnimations: nodeCount < 200,
          }
        );
        
        // Create engine instance
        const newEngine = createCustomSVGEngine();
        
        // Set up event handlers
        await newEngine.initialize(containerRef.current!, config, {
          onVertexClick: (vertex: any, event: IEngineEvent) => {
            console.log('Vertex clicked:', vertex.label, event.modifiers);
          },
          onVertexHover: (vertex: any, event: IEngineEvent) => {
            // Optional: Show tooltip or highlight
          },
          onSelectionChange: (vertices: ReadonlySet<string>, edges: ReadonlySet<string>) => {
            setSelection({ vertices: new Set(vertices), edges: new Set(edges) });
            console.log('Selection changed:', vertices.size, 'vertices,', edges.size, 'edges');
          },
          onViewportChange: (zoom: number, pan: any) => {
            console.log('Viewport changed:', { zoom, pan });
          },
          onLayoutStart: (layoutId: string) => {
            console.log('Layout started:', layoutId);
          },
          onLayoutComplete: (layoutId: string, positions: any) => {
            console.log('Layout completed:', layoutId, positions.size, 'positions');
          },
          onPerformanceUpdate: (metrics: any) => {
            // Performance metrics are handled by the control panel
          },
          onError: (error: Error, context?: string) => {
            console.error('Engine error:', error, context);
            if (mounted) {
              setError(`Engine error: ${error.message}`);
            }
          },
        });
        
        // Load the graph
        await newEngine.loadGraph(sampleGraph);
        
        if (mounted) {
          setEngine(newEngine);
        }
        
      } catch (err: any) {
        console.error('Failed to initialize engine:', err);
        if (mounted) {
          setError(err.message || 'Failed to initialize graph engine');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    initializeEngine();
    
    return () => {
      mounted = false;
      if (engine) {
        engine.dispose();
      }
    };
  }, [nodeCount, edgeCount, width, height]); // Re-initialize when props change
  
  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handleLayoutChange = useCallback(async (layoutId: string) => {
    if (!engine) return;
    
    try {
      await engine.setLayout(layoutId, undefined, true);
    } catch (err: any) {
      console.error('Failed to change layout:', err);
      setError(`Failed to change layout: ${err.message}`);
    }
  }, [engine]);
  
  const handleExport = useCallback(async (format: string) => {
    if (!engine) return;
    
    try {
      const result = await engine.export(format as any, {
        scale: format === 'png' ? 2.0 : 1.0,
        backgroundColor: '#ffffff',
        includeLabels: true,
        includeMetadata: format === 'json',
      });
      
      // Download the result
      const blob = typeof result === 'string' ? 
        new Blob([result], { type: format === 'json' ? 'application/json' : 'text/plain' }) :
        result;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `graph.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error('Failed to export:', err);
      setError(`Failed to export: ${err.message}`);
    }
  }, [engine]);
  
  const handleFitToViewport = useCallback(() => {
    if (!engine) return;
    engine.fitToViewport(50, true);
  }, [engine]);
  
  const handleClearSelection = useCallback(() => {
    if (!engine) return;
    engine.clearSelection();
  }, [engine]);
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div style={{ position: 'relative' }}>
      {/* Performance Recommendations */}
      {showRecommendations && recommendations && !recommendations.recommended && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '10px',
          right: '10px',
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '14px',
          zIndex: 999,
        }}>
          <div style={{ fontWeight: 'bold', color: '#856404' }}>Performance Recommendations:</div>
          {recommendations.warnings.map((warning: string, i: number) => (
            <div key={i} style={{ color: '#856404', marginTop: '4px' }}>⚠️ {warning}</div>
          ))}
          {recommendations.optimizations.map((opt: string, i: number) => (
            <div key={i} style={{ color: '#155724', marginTop: '4px' }}>💡 {opt}</div>
          ))}
        </div>
      )}
      
      {/* Control Panel */}
      <EngineControls
        engine={engine}
        onLayoutChange={handleLayoutChange}
        onExport={handleExport}
        onFitToViewport={handleFitToViewport}
        onClearSelection={handleClearSelection}
      />
      
      {/* Error Display */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#f8d7da',
          color: '#721c24',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #f5c6cb',
          zIndex: 1001,
          maxWidth: '400px',
        }}>
          <div style={{ fontWeight: 'bold' }}>Error:</div>
          <div>{error}</div>
          <button
            onClick={() => setError(null)}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              background: '#721c24',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Loading Indicator */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: 1001,
          textAlign: 'center',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e9ecef',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <div>Initializing Graph Engine...</div>
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      )}
      
      {/* Selection Info */}
      {(selection.vertices.size > 0 || selection.edges.size > 0) && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0, 123, 255, 0.1)',
          border: '1px solid #007bff',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          color: '#004085',
          zIndex: 1000,
        }}>
          Selected: {selection.vertices.size} vertices, {selection.edges.size} edges
        </div>
      )}
      
      {/* Graph Container */}
      <div
        ref={containerRef}
        style={{
          width,
          height,
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      />
      
      {/* Stats Display */}
      {graph && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          color: '#666',
          zIndex: 1000,
        }}>
          {graph.vertices.length} vertices • {graph.edges.length} edges
        </div>
      )}
    </div>
  );
}

export default CustomSVGExample;