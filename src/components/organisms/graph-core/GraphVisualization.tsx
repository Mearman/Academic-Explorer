/**
 * Generic Graph Visualization Component
 * 
 * Main orchestration component that coordinates all decoupled graph systems:
 * - Data store for graph access
 * - Layout algorithms for positioning
 * - Renderers for visual representation  
 * - Interaction handlers for user input
 * 
 * This component is completely domain-agnostic and works with any data types
 * through generic type parameters and pluggable implementations.
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';

import { ErrorBoundary } from '@/components/templates/enhanced-error-boundary';

import { GraphCanvas } from './GraphCanvas';
import { GraphSVGRenderer } from './GraphSVGRenderer';
import { useGraphLifecycle } from './hooks/useGraphLifecycle';
import type {
  IGraphDataStore,
  ILayoutAlgorithm,
  IRendererRegistry,
  IInteractionRegistry,
  ISelectionState,
  IGraphConfig,
  IGraph,
  IDimensions
} from './interfaces';


// ============================================================================
// Component Props Interface
// ============================================================================

export interface GraphVisualizationProps<TVertexData = unknown, TEdgeData = unknown> {
  /** Data store providing graph data access */
  dataStore: IGraphDataStore<TVertexData, TEdgeData>;
  
  /** Layout algorithm for positioning vertices */
  layoutAlgorithm: ILayoutAlgorithm<TVertexData, TEdgeData>;
  
  /** Registry of available renderers */
  rendererRegistry: IRendererRegistry<TVertexData, TEdgeData>;
  
  /** Registry of interaction handlers */
  interactionRegistry: IInteractionRegistry<TVertexData, TEdgeData>;
  
  /** Selection state manager */
  selectionState: ISelectionState<TVertexData, TEdgeData>;
  
  /** Graph visualization configuration */
  config: IGraphConfig<TVertexData, TEdgeData>;
  
  /** Canvas dimensions */
  dimensions: IDimensions;
  
  /** Optional initial graph data (if not provided, loads from store) */
  initialGraph?: IGraph<TVertexData, TEdgeData>;
  
  /** Vertex renderer ID to use (defaults to first available) */
  vertexRendererId?: string;
  
  /** Edge renderer ID to use (defaults to first available) */
  edgeRendererId?: string;
  
  /** Whether to enable SVG export functionality */
  enableExport?: boolean;
  
  /** Callback for export completion */
  onExportComplete?: (dataUrl: string, format: 'png' | 'svg') => void;
  
  /** Callback for graph load completion */
  onGraphLoaded?: (graph: IGraph<TVertexData, TEdgeData>) => void;
  
  /** Callback for layout completion */
  onLayoutComplete?: () => void;
  
  /** Callback for rendering errors */
  onRenderingError?: (error: Error) => void;
  
  /** Loading state override */
  isLoading?: boolean;
  
  /** Error state override */
  error?: Error;
  
  /** Additional CSS class name */
  className?: string;
  
  /** Additional inline styles */
  style?: React.CSSProperties;
}

// ============================================================================
// Loading and Error Components
// ============================================================================

const LoadingState: React.FC<{ dimensions: IDimensions }> = ({ dimensions }) => (
  <div 
    style={{
      width: dimensions.width,
      height: dimensions.height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '4px'
    }}
  >
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      color: '#6c757d'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e9ecef',
        borderTop: '3px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <span>Loading graph...</span>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

const ErrorState: React.FC<{ 
  error: Error; 
  dimensions: IDimensions; 
  onRetry?: () => void; 
}> = ({ error, dimensions, onRetry }) => (
  <div 
    style={{
      width: dimensions.width,
      height: dimensions.height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff5f5',
      border: '1px solid #fed7d7',
      borderRadius: '4px'
    }}
  >
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      color: '#e53e3e',
      textAlign: 'center',
      maxWidth: '400px',
      padding: '16px'
    }}>
      <div style={{ fontSize: '24px' }}>⚠️</div>
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          Graph Visualization Error
        </div>
        <div style={{ fontSize: '14px', color: '#718096' }}>
          {error.message}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            backgroundColor: '#e53e3e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

// ============================================================================
// Main Graph Visualization Component
// ============================================================================

export function GraphVisualization<TVertexData = unknown, TEdgeData = unknown>({
  dataStore,
  layoutAlgorithm,
  rendererRegistry,
  interactionRegistry,
  selectionState,
  config,
  dimensions,
  initialGraph,
  vertexRendererId,
  edgeRendererId,
  enableExport = false,
  onExportComplete,
  onGraphLoaded,
  onLayoutComplete,
  onRenderingError,
  isLoading: externalLoading,
  error: externalError,
  className,
  style,
}: GraphVisualizationProps<TVertexData, TEdgeData>) {
  
  // ============================================================================
  // Refs and State
  // ============================================================================
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRendererRef = useRef<React.ComponentRef<typeof GraphSVGRenderer>>(null);
  
  // ============================================================================
  // Renderer Selection
  // ============================================================================
  
  const selectedVertexRenderer = useMemo(() => {
    if (vertexRendererId) {
      return rendererRegistry.getVertexRenderer(vertexRendererId);
    }
    const renderers = rendererRegistry.getVertexRenderers();
    return renderers[0];
  }, [rendererRegistry, vertexRendererId]);
  
  const selectedEdgeRenderer = useMemo(() => {
    if (edgeRendererId) {
      return rendererRegistry.getEdgeRenderer(edgeRendererId);
    }
    const renderers = rendererRegistry.getEdgeRenderers();
    return renderers[0];
  }, [rendererRegistry, edgeRendererId]);
  
  // ============================================================================
  // Lifecycle Management
  // ============================================================================
  
  // Lifecycle hook will be called after renderer validation
  const graphLifecycle = selectedVertexRenderer && selectedEdgeRenderer ? useGraphLifecycle({
    dataStore,
    layoutAlgorithm,
    selectionState,
    config,
    dimensions,
    vertexRenderer: selectedVertexRenderer,
    edgeRenderer: selectedEdgeRenderer,
    canvasRef,
    onGraphLoaded,
    onLayoutComplete,
    onRenderingError,
  }) : null;
  
  // ============================================================================
  // State Resolution
  // ============================================================================
  
  const isLoading = externalLoading ?? graphLifecycle?.isLoading ?? false;
  const error = externalError ?? graphLifecycle?.error ?? null;
  
  // ============================================================================
  // Initial Graph Loading
  // ============================================================================
  
  useEffect(() => {
    if (graphLifecycle) {
      if (initialGraph) {
        graphLifecycle.loadGraph(initialGraph);
      } else {
        graphLifecycle.loadGraph();
      }
    }
  }, [initialGraph, graphLifecycle]);
  
  // ============================================================================
  // Export Handlers
  // ============================================================================
  
  const handleExportPNG = useCallback(async () => {
    if (!graphLifecycle) return;
    try {
      const dataUrl = await graphLifecycle.exportAsPNG();
      onExportComplete?.(dataUrl, 'png');
    } catch (exportError) {
      onRenderingError?.(exportError as Error);
    }
  }, [graphLifecycle, onExportComplete, onRenderingError]);
  
  const handleExportSVG = useCallback(async () => {
    if (!graphLifecycle) {
      return;
    }
    
    try {
      const dataUrl = await graphLifecycle.exportAsSVG();
      onExportComplete?.(dataUrl, 'svg');
    } catch (exportError) {
      onRenderingError?.(exportError as Error);
    }
  }, [graphLifecycle, onExportComplete, onRenderingError]);
  
  // ============================================================================
  // Configuration Updates
  // ============================================================================
  
  useEffect(() => {
    if (graphLifecycle && !isLoading && !error && graphLifecycle.graph && graphLifecycle.positionedVertices.length > 0) {
      graphLifecycle.updateLayout();
    }
  }, [config, isLoading, error, graphLifecycle]);
  
  // ============================================================================
  // Retry Handler
  // ============================================================================
  
  const handleRetry = useCallback(() => {
    if (graphLifecycle) {
      if (initialGraph) {
        graphLifecycle.loadGraph(initialGraph);
      } else {
        graphLifecycle.loadGraph();
      }
    }
  }, [initialGraph, graphLifecycle]);
  
  // ============================================================================
  // Render
  // ============================================================================
  
  // Show loading state
  if (isLoading) {
    return (
      <div 
        ref={containerRef}
        className={className}
        style={style}
      >
        <LoadingState dimensions={dimensions} />
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div 
        ref={containerRef}
        className={className}
        style={style}
      >
        <ErrorState 
          error={error} 
          dimensions={dimensions} 
          onRetry={handleRetry}
        />
      </div>
    );
  }
  
  // Show missing renderers error
  if (!selectedVertexRenderer || !selectedEdgeRenderer) {
    const missingRenderers = [];
    if (!selectedVertexRenderer) missingRenderers.push('vertex');
    if (!selectedEdgeRenderer) missingRenderers.push('edge');
    
    return (
      <div 
        ref={containerRef}
        className={className}
        style={style}
      >
        <ErrorState 
          error={new Error(`Missing ${missingRenderers.join(' and ')} renderer(s)`)}
          dimensions={dimensions}
        />
      </div>
    );
  }

  // At this point, TypeScript should know the renderers are not undefined
  const vertexRenderer = selectedVertexRenderer;
  const edgeRenderer = selectedEdgeRenderer;
  
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <ErrorState 
          error={error}
          dimensions={dimensions}
          onRetry={resetErrorBoundary}
        />
      )}
    >
      <div 
        ref={containerRef}
        className={className}
        style={{
          position: 'relative',
          width: dimensions.width,
          height: dimensions.height,
          ...style,
        }}
      >
        <GraphCanvas
          ref={canvasRef}
          graph={graphLifecycle?.graph}
          positionedVertices={graphLifecycle?.positionedVertices || []}
          vertexRenderer={vertexRenderer}
          edgeRenderer={edgeRenderer}
          interactionRegistry={interactionRegistry}
          selectionState={selectionState}
          config={config}
          dimensions={dimensions}
        />
        
        {enableExport && (
          <GraphSVGRenderer
            ref={svgRendererRef}
            graph={graphLifecycle?.graph}
            positionedVertices={graphLifecycle?.positionedVertices || []}
            vertexRenderer={vertexRenderer}
            edgeRenderer={edgeRenderer}
            config={config}
            dimensions={dimensions}
          />
        )}
        
        {enableExport && (
          <div 
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              gap: '8px',
            }}
          >
            <button
              onClick={handleExportPNG}
              style={{
                padding: '8px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Export PNG
            </button>
            <button
              onClick={handleExportSVG}
              style={{
                padding: '8px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Export SVG
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

// ============================================================================
// Default Props and Display Name
// ============================================================================

GraphVisualization.displayName = 'GraphVisualization';

export default GraphVisualization;