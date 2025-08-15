import React, { useRef, useState, useMemo, useCallback } from 'react';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import { Icon, LoadingSkeleton, EntityBadge } from '@/components';
import type { EntityGraphVertex, EntityType } from '@/types/entity-graph';
import * as styles from './entity-graph-visualization.css';

interface PositionedVertex extends EntityGraphVertex {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

interface EntityGraphVisualizationProps {
  width?: number;
  height?: number;
  className?: string;
  showControls?: boolean;
  showLegend?: boolean;
  onVertexClick?: (vertex: EntityGraphVertex) => void;
  onVertexHover?: (vertex: EntityGraphVertex | null) => void;
}

export function EntityGraphVisualization({
  className,
  showControls = true,
  showLegend = true,
  onVertexClick,
  onVertexHover,
}: EntityGraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<{
    vertex: EntityGraphVertex;
    x: number;
    y: number;
  } | null>(null);

  const {
    selectedVertexId,
    hoveredVertexId,
    isFullscreen,
    layoutConfig,
    getFilteredVertices,
    getFilteredEdges,
    selectVertex,
    hoverVertex,
    toggleFullscreen,
  } = useEntityGraphStore();

  const filteredVertices = useMemo(() => getFilteredVertices(), [getFilteredVertices]);
  const filteredEdges = useMemo(() => getFilteredEdges(), [getFilteredEdges]);

  // Simple force simulation without D3
  const simulateLayout = useCallback((vertices: EntityGraphVertex[]): PositionedVertex[] => {
    if (vertices.length === 0) return [];

    const centerX = width / 2;
    const centerY = height / 2;
    const iterations = 150;
    const repulsionStrength = 1000;
    const attractionStrength = 0.1;
    const damping = 0.9;

    // Initialize positions
    const positionedVertices: PositionedVertex[] = vertices.map((vertex, index) => {
      // Use saved position if available, otherwise start with circular layout
      if (vertex.position) {
        return {
          ...vertex,
          x: vertex.position.x,
          y: vertex.position.y,
          vx: 0,
          vy: 0,
        };
      }

      const angle = (index / vertices.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...vertex,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    // Simulation loop
    for (let iteration = 0; iteration < iterations; iteration++) {
      // Reset forces
      positionedVertices.forEach(vertex => {
        vertex.vx = vertex.vx || 0;
        vertex.vy = vertex.vy || 0;
      });

      // Repulsion between all vertices
      for (let i = 0; i < positionedVertices.length; i++) {
        for (let j = i + 1; j < positionedVertices.length; j++) {
          const v1 = positionedVertices[i];
          const v2 = positionedVertices[j];
          
          const dx = v1.x - v2.x;
          const dy = v1.y - v2.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = repulsionStrength / (distance * distance);
          const forceX = (dx / distance) * force;
          const forceY = (dy / distance) * force;
          
          v1.vx! += forceX;
          v1.vy! += forceY;
          v2.vx! -= forceX;
          v2.vy! -= forceY;
        }
      }

      // Attraction along edges
      filteredEdges.forEach(edge => {
        const source = positionedVertices.find(v => v.id === edge.sourceId);
        const target = positionedVertices.find(v => v.id === edge.targetId);
        
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = distance * attractionStrength * edge.weight;
          const forceX = (dx / distance) * force;
          const forceY = (dy / distance) * force;
          
          source.vx! += forceX;
          source.vy! += forceY;
          target.vx! -= forceX;
          target.vy! -= forceY;
        }
      });

      // Apply forces and damping
      positionedVertices.forEach(vertex => {
        vertex.vx! *= damping;
        vertex.vy! *= damping;
        vertex.x += vertex.vx!;
        vertex.y += vertex.vy!;

        // Keep vertices within bounds
        const margin = 50;
        vertex.x = Math.max(margin, Math.min(width - margin, vertex.x));
        vertex.y = Math.max(margin, Math.min(height - margin, vertex.y));
      });
    }

    return positionedVertices;
  }, [width, height, filteredEdges]);

  const positionedVertices = useMemo(() => {
    if (isSimulating || filteredVertices.length === 0) return [];
    
    if (layoutConfig.algorithm === 'circular') {
      // Simple circular layout
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;
      
      return filteredVertices.map((vertex, index) => {
        const angle = (index / filteredVertices.length) * 2 * Math.PI;
        return {
          ...vertex,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        };
      });
    }
    
    return simulateLayout(filteredVertices);
  }, [filteredVertices, layoutConfig.algorithm, simulateLayout, isSimulating, width, height]);

  // Get entity color
  const getEntityColor = (entityType: EntityType): string => {
    return (styles.entityColors as Record<string, string>)[entityType] || styles.entityColors.work;
  };

  // Calculate vertex radius based on visit count and configuration
  const getVertexRadius = (vertex: EntityGraphVertex): number => {
    const baseRadius = 8;
    const maxRadius = 20;
    
    if (layoutConfig.sizeByVisitCount && vertex.visitCount > 0) {
      return Math.min(maxRadius, baseRadius + Math.sqrt(vertex.visitCount) * 3);
    }
    
    if (vertex.metadata.citedByCount) {
      const citationScale = Math.log(vertex.metadata.citedByCount + 1) / Math.log(1000);
      return Math.min(maxRadius, baseRadius + citationScale * 8);
    }
    
    return baseRadius;
  };

  // Handle vertex interactions
  const handleVertexClick = (event: React.MouseEvent, vertex: EntityGraphVertex) => {
    event.stopPropagation();
    selectVertex(vertex.id === selectedVertexId ? null : vertex.id);
    onVertexClick?.(vertex);
  };

  const handleVertexMouseEnter = (event: React.MouseEvent, vertex: EntityGraphVertex) => {
    hoverVertex(vertex.id);
    onVertexHover?.(vertex);
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        vertex,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  };

  const handleVertexMouseLeave = () => {
    hoverVertex(null);
    onVertexHover?.(null);
    setTooltip(null);
  };

  // Handle zoom and pan
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev * 1.2));
  const handleZoomOut = () => setZoom(prev => Math.max(0.3, prev / 1.2));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle drag for panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Get connected edges for highlighting
  const getConnectedEdges = (vertexId: string): Set<string> => {
    return new Set(filteredEdges
      .filter(edge => edge.sourceId === vertexId || edge.targetId === vertexId)
      .map(edge => edge.id)
    );
  };

  const connectedEdges = selectedVertexId ? getConnectedEdges(selectedVertexId) : new Set();

  if (filteredVertices.length === 0) {
    return (
      <div className={`${styles.container} ${isFullscreen ? styles.fullscreenContainer : ''} ${className || ''}`}>
        <div className={styles.emptyState}>
          <Icon name="graph" size="xl" />
          <p>No entities to display</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            Visit some entities to see them appear in the graph
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${isFullscreen ? styles.fullscreenContainer : ''} ${className || ''}`}>
      {/* Controls */}
      {showControls && (
        <div className={styles.controls}>
          <button
            className={styles.controlButton}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <Icon name={isFullscreen ? 'minimize' : 'maximize'} size="sm" />
          </button>
          <button
            className={styles.controlButton}
            onClick={() => setIsSimulating(!isSimulating)}
            title="Regenerate layout"
          >
            <Icon name="refresh" size="sm" />
          </button>
        </div>
      )}

      {/* Main SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={styles.svg}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {filteredEdges.map(edge => {
            const source = positionedVertices.find(v => v.id === edge.sourceId);
            const target = positionedVertices.find(v => v.id === edge.targetId);
            
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

          {/* Vertices */}
          {positionedVertices.map(vertex => {
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
                  onClick={(e) => handleVertexClick(e, vertex)}
                  onMouseEnter={(e) => handleVertexMouseEnter(e, vertex)}
                  onMouseLeave={handleVertexMouseLeave}
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

          {/* Arrow marker definition */}
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
        </g>
      </svg>

      {/* Zoom controls */}
      <div className={styles.zoomControls}>
        <button className={styles.zoomButton} onClick={handleZoomOut} title="Zoom out">
          <Icon name="minus" size="sm" />
        </button>
        <button className={styles.zoomButton} onClick={handleZoomReset} title="Reset zoom">
          <Icon name="target" size="sm" />
        </button>
        <button className={styles.zoomButton} onClick={handleZoomIn} title="Zoom in">
          <Icon name="plus" size="sm" />
        </button>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className={styles.legend}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600' }}>
            Entity Types
          </h4>
          {Array.from(new Set(filteredVertices.map(v => v.entityType))).map(entityType => (
            <div key={entityType} className={styles.legendItem}>
              <div
                className={styles.legendColor}
                style={{ backgroundColor: getEntityColor(entityType) }}
              />
              <EntityBadge entityType={entityType} size="xs" />
            </div>
          ))}
          
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${styles.entityColors.work}` }}>
            <div className={styles.legendItem}>
              <div
                className={styles.legendColor}
                style={{ 
                  backgroundColor: 'transparent',
                  border: `2px solid ${styles.entityColors.work}`,
                }}
              />
              <span style={{ fontSize: '10px' }}>Directly visited</span>
            </div>
            <div className={styles.legendItem}>
              <div
                className={styles.legendColor}
                style={{ 
                  backgroundColor: 'transparent',
                  border: `1px solid ${styles.entityColors.work}`,
                  opacity: 0.6,
                }}
              />
              <span style={{ fontSize: '10px' }}>Related entity</span>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
          }}
        >
          <div className={styles.tooltipTitle}>{tooltip.vertex.displayName}</div>
          <div className={styles.tooltipDetail}>
            Type: <EntityBadge entityType={tooltip.vertex.entityType} size="xs" />
          </div>
          {tooltip.vertex.directlyVisited && (
            <div className={styles.tooltipDetail}>
              Visits: {tooltip.vertex.visitCount}
            </div>
          )}
          {tooltip.vertex.metadata.citedByCount && (
            <div className={styles.tooltipDetail}>
              Citations: {tooltip.vertex.metadata.citedByCount.toLocaleString()}
            </div>
          )}
          {tooltip.vertex.metadata.publicationYear && (
            <div className={styles.tooltipDetail}>
              Year: {tooltip.vertex.metadata.publicationYear}
            </div>
          )}
          <div className={styles.tooltipDetail}>
            First seen: {new Date(tooltip.vertex.firstSeen).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Info panel */}
      <div className={styles.infoPanel}>
        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
          Graph Statistics
        </div>
        <div style={{ fontSize: '10px', color: styles.entityColors.work }}>
          Entities: {filteredVertices.length} | 
          Connections: {filteredEdges.length} |
          Visited: {filteredVertices.filter(v => v.directlyVisited).length}
        </div>
      </div>
    </div>
  );
}

// Loading component for when the graph is being computed
export function EntityGraphVisualizationSkeleton({
  width = 800,
  height = 400,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.loadingState}>
        <LoadingSkeleton preset="title" width="200px" />
        <p style={{ marginTop: '8px' }}>Building entity graph...</p>
      </div>
    </div>
  );
}