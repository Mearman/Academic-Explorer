/**
 * useGraphLifecycle Hook - Minimal Working Implementation
 * 
 * Manages basic graph visualization lifecycle with simplified functionality
 * that focuses on compilation compatibility.
 */

import { useState, useCallback } from 'react';

import type {
  IGraph,
  IPositionedVertex,
  IDimensions,
  IGraphDataStore,
  ILayoutAlgorithm,
  ISelectionState,
  IGraphConfig,
  IVertexRenderer,
  IEdgeRenderer,
} from '../interfaces';

// ============================================================================
// Hook Configuration Interface
// ============================================================================

export interface UseGraphLifecycleConfig<TVertexData = unknown, TEdgeData = unknown> {
  /** Data store providing graph data access */
  dataStore: IGraphDataStore<TVertexData, TEdgeData>;
  
  /** Layout algorithm for positioning vertices */
  layoutAlgorithm: ILayoutAlgorithm<TVertexData, TEdgeData>;
  
  /** Selection state manager */
  selectionState: ISelectionState<TVertexData, TEdgeData>;
  
  /** Graph visualization configuration */
  config: IGraphConfig<TVertexData, TEdgeData>;
  
  /** Canvas dimensions */
  dimensions: IDimensions;
  
  /** Vertex renderer implementation */
  vertexRenderer: IVertexRenderer<TVertexData>;
  
  /** Edge renderer implementation */
  edgeRenderer: IEdgeRenderer<TEdgeData>;
  
  /** Canvas reference for rendering */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  
  /** Callback for graph load completion */
  onGraphLoaded?: (graph: IGraph<TVertexData, TEdgeData>) => void;
  
  /** Callback for layout completion */
  onLayoutComplete?: () => void;
  
  /** Callback for rendering errors */
  onRenderingError?: (error: Error) => void;
}

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseGraphLifecycleReturn<TVertexData = unknown, TEdgeData = unknown> {
  /** Current graph data */
  graph: IGraph<TVertexData, TEdgeData> | undefined;
  
  /** Positioned vertices after layout */
  positionedVertices: IPositionedVertex<TVertexData>[];
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Load graph data */
  loadGraph: (initialGraph?: IGraph<TVertexData, TEdgeData>) => Promise<void>;
  
  /** Update layout with current configuration */
  updateLayout: () => Promise<void>;
  
  /** Render the graph to canvas */
  render: () => void;
  
  /** Export graph as PNG */
  exportAsPNG: () => Promise<string>;
  
  /** Export graph as SVG */
  exportAsSVG: () => Promise<string>;
}

// ============================================================================
// useGraphLifecycle Hook Implementation
// ============================================================================

export function useGraphLifecycle<TVertexData = unknown, TEdgeData = unknown>({
  dataStore,
  layoutAlgorithm,
  selectionState: _selectionState,
  config,
  dimensions,
  vertexRenderer: _vertexRenderer,
  edgeRenderer: _edgeRenderer,
  canvasRef,
  onGraphLoaded,
  onLayoutComplete,
  onRenderingError,
}: UseGraphLifecycleConfig<TVertexData, TEdgeData>): UseGraphLifecycleReturn<TVertexData, TEdgeData> {
  
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [graph, setGraph] = useState<IGraph<TVertexData, TEdgeData> | undefined>(undefined);
  const [positionedVertices, setPositionedVertices] = useState<IPositionedVertex<TVertexData>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // ============================================================================
  // Graph Loading
  // ============================================================================
  
  const loadGraph = useCallback(async (initialGraph?: IGraph<TVertexData, TEdgeData>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let loadedGraph: IGraph<TVertexData, TEdgeData>;
      
      if (initialGraph) {
        loadedGraph = initialGraph;
      } else {
        // Load from data store
        loadedGraph = await dataStore.getGraph();
      }
      
      setGraph(loadedGraph);
      onGraphLoaded?.(loadedGraph);
      
      // Execute layout algorithm
      const layoutPositions = await layoutAlgorithm.layout(loadedGraph, config.layout);
      setPositionedVertices([...layoutPositions]);
      onLayoutComplete?.();
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onRenderingError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [dataStore, layoutAlgorithm, config.layout, onGraphLoaded, onLayoutComplete, onRenderingError]);
  
  // ============================================================================
  // Layout Management
  // ============================================================================
  
  const updateLayout = useCallback(async () => {
    if (!graph) return;
    
    setIsLoading(true);
    try {
      const layoutPositions = await layoutAlgorithm.layout(graph, config.layout);
      setPositionedVertices([...layoutPositions]);
      onLayoutComplete?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onRenderingError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [graph, layoutAlgorithm, config.layout, onLayoutComplete, onRenderingError]);
  
  // ============================================================================
  // Rendering
  // ============================================================================
  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph || positionedVertices.length === 0) return;
    
    try {
      const context = canvas.getContext('2d');
      if (!context) return;
      
      const { width, height } = canvas;
      
      // Clear canvas
      context.clearRect(0, 0, width, height);
      
      // Apply background
      if (config.styling?.backgroundColor) {
        context.fillStyle = config.styling.backgroundColor;
        context.fillRect(0, 0, width, height);
      }
      
      // Simple rendering implementation
      const positionMap = new Map(
        positionedVertices.map(pv => [pv.id, pv.position])
      );
      
      // Render edges first
      if (graph.edges) {
        graph.edges.forEach(edge => {
          const sourcePos = positionMap.get(edge.sourceId);
          const targetPos = positionMap.get(edge.targetId);
          
          if (sourcePos && targetPos) {
            context.beginPath();
            context.moveTo(sourcePos.x, sourcePos.y);
            context.lineTo(targetPos.x, targetPos.y);
            context.strokeStyle = '#999';
            context.lineWidth = 1;
            context.globalAlpha = 0.6;
            context.stroke();
            context.globalAlpha = 1;
          }
        });
      }
      
      // Render vertices on top
      positionedVertices.forEach(positionedVertex => {
        context.beginPath();
        context.arc(positionedVertex.position.x, positionedVertex.position.y, 8, 0, 2 * Math.PI);
        context.fillStyle = '#4285f4';
        context.fill();
        
        context.strokeStyle = '#ffffff';
        context.lineWidth = 2;
        context.stroke();
        
        // Add label
        if (positionedVertex.label) {
          context.fillStyle = '#333';
          context.font = '12px sans-serif';
          context.textAlign = 'center';
          context.fillText(
            positionedVertex.label,
            positionedVertex.position.x,
            positionedVertex.position.y + 20
          );
        }
      });
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onRenderingError?.(error);
    }
  }, [canvasRef, graph, positionedVertices, config.styling?.backgroundColor, onRenderingError]);
  
  // ============================================================================
  // Export Functions
  // ============================================================================
  
  const exportAsPNG = useCallback(async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('Canvas not available for export');
    }
    
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    });
  }, [canvasRef]);
  
  const exportAsSVG = useCallback(async (): Promise<string> => {
    if (!graph || positionedVertices.length === 0) {
      throw new Error('No graph data available for export');
    }
    
    // Create simple SVG string
    const svgContent = `
      <svg width="${dimensions.width}" height="${dimensions.height}" 
           viewBox="0 0 ${dimensions.width} ${dimensions.height}"
           xmlns="http://www.w3.org/2000/svg">
        
        ${graph.edges?.map(edge => {
          const sourcePos = positionedVertices.find(pv => pv.id === edge.sourceId)?.position;
          const targetPos = positionedVertices.find(pv => pv.id === edge.targetId)?.position;
          
          if (!sourcePos || !targetPos) return '';
          
          return `<line x1="${sourcePos.x}" y1="${sourcePos.y}" 
                       x2="${targetPos.x}" y2="${targetPos.y}"
                       stroke="#999" stroke-width="1" stroke-opacity="0.6" />`;
        }).join('') || ''}
        
        ${positionedVertices.map(pv => `
          <circle cx="${pv.position.x}" cy="${pv.position.y}" 
                 r="8" fill="#4285f4" stroke="#ffffff" stroke-width="2" />
          ${pv.label ? 
            `<text x="${pv.position.x}" y="${pv.position.y + 20}"
                   text-anchor="middle" font-size="12" fill="#333">${pv.label}</text>` : ''
          }
        `).join('')}
      </svg>
    `.trim();
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  }, [graph, positionedVertices, dimensions]);
  
  // ============================================================================
  // Return Hook Interface
  // ============================================================================
  
  return {
    graph,
    positionedVertices,
    isLoading,
    error,
    loadGraph,
    updateLayout,
    render,
    exportAsPNG,
    exportAsSVG,
  };
}

// Named export only - no default export