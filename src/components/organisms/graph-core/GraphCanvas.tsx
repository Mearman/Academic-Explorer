/**
 * GraphCanvas Component - Minimal Working Implementation
 * 
 * Canvas-based graph renderer that provides basic graph visualization.
 * This is a simplified implementation that focuses on compilation compatibility.
 */

import React, { useRef, useEffect, useCallback, forwardRef } from 'react';

import type {
  IGraph,
  IDimensions,
  IPositionedVertex,
  IGraphConfig,
  IVertexRenderer,
  IEdgeRenderer,
  ISelectionState,
  IInteractionRegistry,
} from './interfaces';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface GraphCanvasProps<TVertexData = unknown, TEdgeData = unknown> {
  /** Graph data to render */
  graph?: IGraph<TVertexData, TEdgeData>;
  
  /** Positioned vertices with layout coordinates */
  positionedVertices: IPositionedVertex<TVertexData>[];
  
  /** Vertex renderer implementation */
  vertexRenderer: IVertexRenderer<TVertexData>;
  
  /** Edge renderer implementation */
  edgeRenderer: IEdgeRenderer<TEdgeData>;
  
  /** Interaction registry for handling user input */
  interactionRegistry: IInteractionRegistry<TVertexData, TEdgeData>;
  
  /** Selection state manager */
  selectionState: ISelectionState<TVertexData, TEdgeData>;
  
  /** Graph visualization configuration */
  config: IGraphConfig<TVertexData, TEdgeData>;
  
  /** Canvas dimensions */
  dimensions: IDimensions;
  
  /** Optional CSS class name */
  className?: string;
  
  /** Optional inline styles */
  style?: React.CSSProperties;
}

// ============================================================================
// GraphCanvas Component Implementation
// ============================================================================

export const GraphCanvas = forwardRef<
  HTMLCanvasElement,
  GraphCanvasProps
>(function GraphCanvas<TVertexData = unknown, TEdgeData = unknown>({
  graph,
  positionedVertices,
  vertexRenderer: _vertexRenderer,
  edgeRenderer: _edgeRenderer,
  interactionRegistry: _interactionRegistry,
  selectionState,
  config,
  dimensions,
  className,
  style,
}: GraphCanvasProps<TVertexData, TEdgeData>, ref: React.Ref<HTMLCanvasElement>) {
  
  // ============================================================================
  // Refs and State
  // ============================================================================
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  
  // ============================================================================
  // Canvas Setup
  // ============================================================================
  
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    // Setup high-DPI canvas
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Set actual canvas size in pixels
    canvas.width = dimensions.width * pixelRatio;
    canvas.height = dimensions.height * pixelRatio;
    
    // Set display size via CSS
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    
    // Scale the context for high-DPI displays
    context.scale(pixelRatio, pixelRatio);
    
    // Store context reference
    contextRef.current = context;
    
    return context;
  }, [dimensions]);
  
  // ============================================================================
  // Simple Rendering Implementation
  // ============================================================================
  
  const render = useCallback(() => {
    const context = setupCanvas();
    if (!context) return;
    
    // Clear canvas
    context.clearRect(0, 0, dimensions.width, dimensions.height);
    
    // Apply background color if configured
    if (config.styling?.backgroundColor) {
      context.fillStyle = config.styling.backgroundColor;
      context.fillRect(0, 0, dimensions.width, dimensions.height);
    }
    
    // Simple edge rendering
    if (graph?.edges) {
      const positionMap = new Map(
        positionedVertices.map(pv => [pv.id, pv.position])
      );
      
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
    
    // Simple vertex rendering
    positionedVertices.forEach(positionedVertex => {
      const isSelected = selectionState.selectedVertices.has(positionedVertex.id);
      const isHovered = selectionState.hoveredVertex === positionedVertex.id;
      
      // Basic circle rendering
      context.beginPath();
      context.arc(positionedVertex.position.x, positionedVertex.position.y, 8, 0, 2 * Math.PI);
      context.fillStyle = isSelected ? '#ff4444' : isHovered ? '#4444ff' : '#4285f4';
      context.fill();
      
      // Basic border
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();
      
      // Basic label
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
  }, [setupCanvas, dimensions, config.styling?.backgroundColor, graph, positionedVertices, selectionState]);
  
  // ============================================================================
  // Basic Interaction Handling
  // ============================================================================
  
  const getCanvasPosition = useCallback((event: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);
  
  const handleClick = useCallback((event: React.MouseEvent) => {
    const position = getCanvasPosition(event);
    
    // Basic hit testing for vertices
    const hitVertex = positionedVertices.find(pv => {
      const dx = position.x - pv.position.x;
      const dy = position.y - pv.position.y;
      return Math.sqrt(dx * dx + dy * dy) <= 8; // 8px radius
    });
    
    if (hitVertex) {
      if (event.ctrlKey || event.metaKey) {
        // Multi-select logic would go here
        // For now, just select single vertex
        selectionState.selectVertices([hitVertex.id]);
      } else {
        selectionState.selectVertices([hitVertex.id]);
      }
      render(); // Re-render to show selection
    } else {
      // Clear selection if clicking empty space
      selectionState.selectVertices([]);
      render();
    }
  }, [getCanvasPosition, positionedVertices, selectionState, render]);
  
  // ============================================================================
  // Effects
  // ============================================================================
  
  // Set up canvas and initial render
  useEffect(() => {
    render();
  }, [render]);
  
  // Forward ref
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(canvasRef.current);
    } else if (ref) {
      ref.current = canvasRef.current;
    }
  }, [ref]);
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: 'block',
        ...style,
      }}
      onClick={handleClick}
    />
  );
});

GraphCanvas.displayName = 'GraphCanvas';

// Named export only - no default export