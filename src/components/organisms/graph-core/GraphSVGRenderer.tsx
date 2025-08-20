/**
 * GraphSVGRenderer Component - Minimal Working Implementation
 * 
 * SVG-based graph renderer for export functionality.
 * This is a simplified implementation that focuses on compilation compatibility.
 */

import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

import type {
  IGraph,
  IDimensions,
  IPositionedVertex,
  IGraphConfig,
  IVertexRenderer,
  IEdgeRenderer,
} from './interfaces';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface GraphSVGRendererProps<TVertexData = unknown, TEdgeData = unknown> {
  /** Graph data to render */
  graph?: IGraph<TVertexData, TEdgeData>;
  
  /** Positioned vertices with layout coordinates */
  positionedVertices: IPositionedVertex<TVertexData>[];
  
  /** Vertex renderer implementation */
  vertexRenderer: IVertexRenderer<TVertexData>;
  
  /** Edge renderer implementation */
  edgeRenderer: IEdgeRenderer<TEdgeData>;
  
  /** Graph visualization configuration */
  config: IGraphConfig<TVertexData, TEdgeData>;
  
  /** SVG dimensions */
  dimensions: IDimensions;
  
  /** Optional CSS class name */
  className?: string;
  
  /** Optional inline styles */
  style?: React.CSSProperties;
}

// ============================================================================
// Imperative Handle Interface
// ============================================================================

export interface GraphSVGRendererHandle {
  /** Export the SVG as a data URL */
  exportAsSVG(): Promise<string>;
  
  /** Get the SVG element reference */
  getSVGElement(): SVGSVGElement | null;
}

// ============================================================================
// GraphSVGRenderer Component Implementation
// ============================================================================

export const GraphSVGRenderer = forwardRef<
  GraphSVGRendererHandle,
  GraphSVGRendererProps
>(function GraphSVGRenderer<TVertexData = unknown, TEdgeData = unknown>({
  graph,
  positionedVertices,
  vertexRenderer: _vertexRenderer,
  edgeRenderer: _edgeRenderer,
  config: _config,
  dimensions,
  className,
  style,
}: GraphSVGRendererProps<TVertexData, TEdgeData>, ref: React.Ref<GraphSVGRendererHandle>) {
  
  // ============================================================================
  // Refs
  // ============================================================================
  
  const svgRef = useRef<SVGSVGElement>(null);
  
  // ============================================================================
  // Imperative Handle
  // ============================================================================
  
  useImperativeHandle(ref, () => ({
    exportAsSVG: async (): Promise<string> => {
      const svgElement = svgRef.current;
      if (!svgElement) {
        throw new Error('SVG element not found');
      }
      
      // Simple SVG export
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      return URL.createObjectURL(blob);
    },
    
    getSVGElement: (): SVGSVGElement | null => svgRef.current,
  }), []);
  
  // ============================================================================
  // Render Elements
  // ============================================================================
  
  const renderElements = useCallback(() => {
    return {
      edges: graph?.edges?.map(edge => {
        const sourceVertex = positionedVertices.find(pv => pv.id === edge.sourceId);
        const targetVertex = positionedVertices.find(pv => pv.id === edge.targetId);
        
        if (!sourceVertex || !targetVertex) return null;
        
        return (
          <line
            key={edge.id}
            x1={sourceVertex.position.x}
            y1={sourceVertex.position.y}
            x2={targetVertex.position.x}
            y2={targetVertex.position.y}
            stroke="#999"
            strokeWidth={1}
            strokeOpacity={0.6}
          />
        );
      }).filter(Boolean) || [],
      
      vertices: positionedVertices.map(positionedVertex => (
        <g key={positionedVertex.id}>
          <circle
            cx={positionedVertex.position.x}
            cy={positionedVertex.position.y}
            r={8}
            fill="#4285f4"
            stroke="#ffffff"
            strokeWidth={2}
          />
          {positionedVertex.label && (
            <text
              x={positionedVertex.position.x}
              y={positionedVertex.position.y + 20}
              textAnchor="middle"
              fontSize={12}
              fontFamily="sans-serif"
              fill="#333"
            >
              {positionedVertex.label}
            </text>
          )}
        </g>
      ))
    };
  }, [graph, positionedVertices]);
  
  // ============================================================================
  // Effects
  // ============================================================================
  
  const elements = renderElements();
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div 
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: dimensions.width,
        height: dimensions.height,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Render edges first (behind vertices) */}
        <g className="edges">
          {elements.edges}
        </g>
        
        {/* Render vertices on top */}
        <g className="vertices">
          {elements.vertices}
        </g>
      </svg>
    </div>
  );
});

GraphSVGRenderer.displayName = 'GraphSVGRenderer';

// Named export only - no default export