import React from 'react';

import type { EntityGraphVertex, EntityGraphEdge, EntityType } from '@/types/entity-graph';

import * as styles from '../entity-graph-visualization.css';
import type { PositionedVertex } from '../graph-layout/force-simulation';

// Helper components for SVG rendering
function GraphEdges({ 
  edges, 
  vertices, 
  connectedEdges, 
  layoutConfig 
}: {
  edges: EntityGraphEdge[];
  vertices: PositionedVertex[];
  connectedEdges: Set<string>;
  layoutConfig: { weightEdgesByStrength?: boolean; sizeByVisitCount?: boolean };
}) {
  return (
    <>
      {edges.map(edge => {
        const source = vertices.find(v => v.id === edge.sourceId);
        const target = vertices.find(v => v.id === edge.targetId);
        
        if (!source || !target) return null;
        
        const isHighlighted = connectedEdges.has(edge.id);
        
        return (
          <line
            key={edge.id}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            className={`${styles.edge} ${isHighlighted ? styles.edgeHighlighted : ''}`}
            strokeWidth={layoutConfig.weightEdgesByStrength ? edge.weight * 2 : 1}
            markerEnd="url(#arrowhead)"
          />
        );
      })}
    </>
  );
}

function GraphVertices({ 
  vertices, 
  selectedVertexId, 
  hoveredVertexId, 
  getEntityColor, 
  getVertexRadius, 
  onVertexClick, 
  onVertexMouseEnter, 
  onVertexMouseLeave 
}: {
  vertices: PositionedVertex[];
  selectedVertexId: string | null;
  hoveredVertexId: string | null;
  getEntityColor: (entityType: EntityType) => string;
  getVertexRadius: (vertex: EntityGraphVertex) => number;
  onVertexClick: (event: React.MouseEvent, vertex: EntityGraphVertex) => void;
  onVertexMouseEnter: (event: React.MouseEvent, vertex: EntityGraphVertex) => void;
  onVertexMouseLeave: () => void;
}) {
  return (
    <>
      {vertices.map(vertex => {
        const radius = getVertexRadius(vertex);
        const isSelected = vertex.id === selectedVertexId;
        const isHovered = vertex.id === hoveredVertexId;
        
        let vertexClasses = styles.vertex;
        if (vertex.directlyVisited) vertexClasses += ` ${styles.vertexDirectlyVisited}`;
        else vertexClasses += ` ${styles.vertexDiscovered}`;
        if (isSelected) vertexClasses += ` ${styles.vertexSelected}`;
        if (isHovered) vertexClasses += ` ${styles.vertexHovered}`;
        
        return (
          <g key={vertex.id} className={vertexClasses}>
            <circle
              cx={vertex.x}
              cy={vertex.y}
              r={radius}
              fill={getEntityColor(vertex.entityType)}
              onClick={(e) => onVertexClick(e, vertex)}
              onMouseEnter={(e) => onVertexMouseEnter(e, vertex)}
              onMouseLeave={onVertexMouseLeave}
            />
            
            {/* Vertex label */}
            <text
              x={vertex.x}
              y={vertex.y + radius + 12}
              className={styles.vertexLabel}
            >
              {vertex.displayName.length > 20 
                ? `${vertex.displayName.slice(0, 17)}...` 
                : vertex.displayName
              }
            </text>
            
            {/* Visit count for directly visited entities */}
            {vertex.directlyVisited && vertex.visitCount > 1 && (
              <text
                x={vertex.x}
                y={vertex.y + 3}
                className={styles.visitCount}
              >
                {vertex.visitCount}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

function GraphMarkerDefs() {
  return (
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          fill={styles.entityColors.work}
          opacity="0.6"
        />
      </marker>
    </defs>
  );
}

interface GraphSVGProps {
  width: number;
  height: number;
  zoom: number;
  pan: { x: number; y: number };
  vertices: PositionedVertex[];
  edges: EntityGraphEdge[];
  selectedVertexId: string | null;
  hoveredVertexId: string | null;
  connectedEdges: Set<string>;
  layoutConfig: { weightEdgesByStrength?: boolean; sizeByVisitCount?: boolean };
  getEntityColor: (entityType: EntityType) => string;
  getVertexRadius: (vertex: EntityGraphVertex) => number;
  onVertexClick: (event: React.MouseEvent, vertex: EntityGraphVertex) => void;
  onVertexMouseEnter: (event: React.MouseEvent, vertex: EntityGraphVertex) => void;
  onVertexMouseLeave: () => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: () => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export function GraphSVG({
  width,
  height,
  zoom,
  pan,
  vertices,
  edges,
  selectedVertexId,
  hoveredVertexId,
  connectedEdges,
  layoutConfig,
  getEntityColor,
  getVertexRadius,
  onVertexClick,
  onVertexMouseEnter,
  onVertexMouseLeave,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  svgRef,
}: GraphSVGProps) {
  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className={styles.svg}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
        <GraphEdges 
          edges={edges}
          vertices={vertices}
          connectedEdges={connectedEdges}
          layoutConfig={layoutConfig}
        />

        <GraphVertices 
          vertices={vertices}
          selectedVertexId={selectedVertexId}
          hoveredVertexId={hoveredVertexId}
          getEntityColor={getEntityColor}
          getVertexRadius={getVertexRadius}
          onVertexClick={onVertexClick}
          onVertexMouseEnter={onVertexMouseEnter}
          onVertexMouseLeave={onVertexMouseLeave}
        />

        <GraphMarkerDefs />
      </g>
    </svg>
  );
}