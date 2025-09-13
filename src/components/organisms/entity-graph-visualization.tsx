import React, { useState, useMemo, useCallback } from 'react';

import { Icon, LoadingSkeleton } from '@/components';
import { useGraphKeyboardShortcuts } from '@/hooks/use-graph-keyboard-shortcuts';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import type { 
  EntityGraphVertex, 
  EntityGraphEdge, 
  EntityType, 
  GraphLayoutConfig 
} from '@/types/entity-graph';

import * as styles from './entity-graph-visualization.css';
import { GraphControls } from './graph-controls/GraphControls';
import { ZoomControls } from './graph-controls/ZoomControls';
import { GraphInfoPanel } from './graph-info/GraphInfoPanel';
import { createForceSimulation, createCircularLayout } from './graph-layout/force-simulation';
import { GraphLegend } from './graph-legend/GraphLegend';
import { GraphSearch } from './graph-search/GraphSearch';
import { GraphSVG } from './graph-svg/GraphSVG';
import { GraphTooltip } from './graph-tooltip/GraphTooltip';
import { 
  exportGraphAsPNG, 
  exportGraphAsSVG, 
  generateExportFilename, 
  getOptimalExportDimensions 
} from './graph-utils/graph-export';
import { useGraphInteractions } from './hooks/use-graph-interactions';
// Import new decoupled graph system
import { OpenAlexEntityGraph as _OpenAlexEntityGraph } from './openalex-entity-graph';

// Utility functions for entity graph calculations
function getEntityColor(entityType: EntityType): string {
  return (styles.entityColors as Record<string, string>)[entityType] || styles.entityColors.work;
}

function calculateVertexRadius(vertex: EntityGraphVertex, sizeByVisitCount: boolean): number {
  const baseRadius = 8;
  const maxRadius = 20;
  
  if (sizeByVisitCount && vertex.visitCount > 0) {
    return Math.min(maxRadius, baseRadius + Math.sqrt(vertex.visitCount) * 3);
  }
  
  if (vertex.metadata.citedByCount) {
    const citationScale = Math.log(vertex.metadata.citedByCount + 1) / Math.log(1000);
    return Math.min(maxRadius, baseRadius + citationScale * 8);
  }
  
  return baseRadius;
}

function generatePositionedVertices(
  filteredVertices: EntityGraphVertex[],
  filteredEdges: EntityGraphEdge[],
  layoutConfig: GraphLayoutConfig,
  isSimulating: boolean,
  width: number,
  height: number
) {
  if (isSimulating || filteredVertices.length === 0) return [];
  
  if (layoutConfig.algorithm === 'circular') {
    return createCircularLayout(filteredVertices, width, height);
  }
  
  return createForceSimulation(filteredVertices, filteredEdges, {
    width,
    height,
  });
}

function calculateConnectedEdges(selectedVertexId: string | null, filteredEdges: EntityGraphEdge[]): Set<string> {
  if (!selectedVertexId) return new Set<string>();
  return new Set(filteredEdges
    .filter(edge => edge.sourceId === selectedVertexId || edge.targetId === selectedVertexId)
    .map(edge => edge.id)
  );
}

function EmptyGraphState({ isFullscreen, className }: { isFullscreen: boolean; className?: string }) {
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
  width: _width = 800,
  height: _height = 400,
  className,
  showControls = true,
  showLegend = true,
  onVertexClick,
  onVertexHover,
}: EntityGraphVisualizationProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [, setHighlightedVertices] = useState<string[]>([]);
  
  const {
    selectedVertexId,
    hoveredVertexId,
    isFullscreen,
    isHydrated,
    isLoading,
    layoutConfig,
    graph: _graph,
    filterOptions: _filterOptions,
    getFilteredVertices,
    getFilteredEdges,
    selectVertex,
    hoverVertex,
    toggleFullscreen,
  } = useEntityGraphStore();

  const {
    svgRef,
    zoom,
    pan,
    tooltip,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    showTooltip,
    hideTooltip,
  } = useGraphInteractions();

  // FIXED: Use stable selectors instead of functions that create new arrays
  const rawVerticesMap = useEntityGraphStore((state) => state.graph.vertices);
  const rawEdgesMap = useEntityGraphStore((state) => state.graph.edges);
  const filterOptions = useEntityGraphStore((state) => state.filterOptions);

  const filteredVertices = useMemo(() => {
    const vertices = Array.from(rawVerticesMap.values());

    // Apply basic filtering without complex dependencies
    if (filterOptions.directlyVisitedOnly) {
      return vertices.filter(v => v.directlyVisited);
    }

    if (filterOptions.entityTypes && filterOptions.entityTypes.length > 0) {
      return vertices.filter(v => filterOptions.entityTypes!.includes(v.entityType));
    }

    return vertices;
  }, [rawVerticesMap, filterOptions.directlyVisitedOnly, filterOptions.entityTypes]);

  const filteredEdges = useMemo(() => {
    return Array.from(rawEdgesMap.values());
  }, [rawEdgesMap]);

  const positionedVertices = useMemo(() => {
    return generatePositionedVertices(
      filteredVertices, 
      filteredEdges, 
      layoutConfig, 
      isSimulating, 
      _width, 
      _height
    );
  }, [filteredVertices, filteredEdges, layoutConfig, isSimulating, _width, _height]);

  // Handle vertex interactions
  const handleVertexClick = useCallback((event: React.MouseEvent, vertex: EntityGraphVertex) => {
    event.stopPropagation();
    selectVertex(vertex.id === selectedVertexId ? null : vertex.id);
    onVertexClick?.(vertex);
  }, [selectedVertexId, selectVertex, onVertexClick]);

  const handleVertexMouseEnter = useCallback((event: React.MouseEvent, vertex: EntityGraphVertex) => {
    hoverVertex(vertex.id);
    onVertexHover?.(vertex);
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      showTooltip(vertex, event.clientX - rect.left, event.clientY - rect.top);
    }
  }, [hoverVertex, onVertexHover, svgRef, showTooltip]);

  const handleVertexMouseLeave = useCallback(() => {
    hoverVertex(null);
    onVertexHover?.(null);
    hideTooltip();
  }, [hoverVertex, onVertexHover, hideTooltip]);

  // Handle layout regeneration
  const handleRegenerateLayout = useCallback(() => {
    setIsSimulating(!isSimulating);
  }, [isSimulating]);

  // Handle export functions
  const handleExportPNG = useCallback(async () => {
    if (!svgRef.current) return;
    
    try {
      const dimensions = getOptimalExportDimensions(svgRef.current);
      const filename = generateExportFilename('graph', 'png');
      
      await exportGraphAsPNG(svgRef.current, {
        filename,
        ...dimensions,
        backgroundColor: '#ffffff',
        scale: 2,
      });
    } catch (error) {
      // Failed to export PNG - error handling removed
      // Could show a toast notification here
    }
  }, [svgRef]);

  const handleExportSVG = useCallback(() => {
    if (!svgRef.current) return;
    
    try {
      const dimensions = getOptimalExportDimensions(svgRef.current);
      const filename = generateExportFilename('graph', 'svg');
      
      exportGraphAsSVG(svgRef.current, {
        filename,
        ...dimensions,
      });
    } catch (error) {
      // Failed to export SVG - error handling removed
      // Could show a toast notification here
    }
  }, [svgRef]);

  // Handle search functionality
  const handleToggleSearch = useCallback(() => {
    setShowSearch(prev => !prev);
    if (showSearch) {
      setHighlightedVertices([]);
    }
  }, [showSearch]);

  const handleSearchVertexSelect = useCallback((vertex: EntityGraphVertex | null) => {
    if (vertex) {
      selectVertex(vertex.id);
      onVertexClick?.(vertex);
    }
  }, [selectVertex, onVertexClick]);

  const handleHighlightVertices = useCallback((vertexIds: string[]) => {
    setHighlightedVertices(vertexIds);
  }, []);

  const handleEscapeKey = useCallback(() => {
    if (showSearch) {
      setShowSearch(false);
      setHighlightedVertices([]);
    } else if (isFullscreen) {
      toggleFullscreen();
    }
  }, [showSearch, isFullscreen, toggleFullscreen]);

  // Get connected edges for highlighting
  const connectedEdges = useMemo(() => {
    return calculateConnectedEdges(selectedVertexId, filteredEdges);
  }, [selectedVertexId, filteredEdges]);

  // Callback versions of utility functions
  const getEntityColorCallback = useCallback(getEntityColor, []);
  const getVertexRadius = useCallback((vertex: EntityGraphVertex) => 
    calculateVertexRadius(vertex, layoutConfig.sizeByVisitCount), 
    [layoutConfig.sizeByVisitCount]
  );

  const handleToggleEngineSelector = useCallback(() => {
    // Focus the engine selector if it exists
    const engineSelector = document.querySelector('.graph-engine-selector') as HTMLSelectElement;
    if (engineSelector) {
      engineSelector.focus();
    }
  }, []);

  const handleCycleEngine = useCallback(() => {
    // This will be handled by the CompactGraphEngineSettings component
    // when the selector is focused and Tab is pressed
  }, []);

  // Setup keyboard shortcuts
  useGraphKeyboardShortcuts({
    onToggleFullscreen: toggleFullscreen,
    onExportPNG: handleExportPNG,
    onExportSVG: handleExportSVG,
    onToggleSearch: handleToggleSearch,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onZoomReset: handleZoomReset,
    onEscape: handleEscapeKey,
    onToggleEngineSelector: handleToggleEngineSelector,
    onCycleEngine: handleCycleEngine,
  });

  // Show loading state if still hydrating from IndexedDB
  if (!isHydrated || isLoading) {
    return (
      <div className={`${styles.container} ${isFullscreen ? styles.fullscreenContainer : ''} ${className || ''}`}>
        <LoadingSkeleton height="100%" />
      </div>
    );
  }

  if (filteredVertices.length === 0) {
    const emptyStateProps: { isFullscreen: boolean; className?: string } = { isFullscreen };
    if (className) {
      emptyStateProps.className = className;
    }
    return <EmptyGraphState {...emptyStateProps} />;
  }

  return (
    <div 
      className={`${styles.container} ${isFullscreen ? styles.fullscreenContainer : ''} ${className || ''}`}
      role="application"
      aria-label="Interactive entity graph visualization"
      aria-describedby="graph-description"
    >
      {/* Screen reader description */}
      <div id="graph-description" className="sr-only">
        Graph showing {filteredVertices.length} entities and {filteredEdges.length} relationships. 
        Use keyboard shortcuts: F11 for fullscreen, Cmd+E to export, Cmd+F to search, E to focus engine selector.
      </div>

      {/* Controls */}
      {showControls && (
        <GraphControls
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onRegenerateLayout={handleRegenerateLayout}
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onToggleSearch={handleToggleSearch}
          showSearch={showSearch}
        />
      )}

      {/* Search overlay */}
      <GraphSearch
        vertices={filteredVertices}
        onVertexSelect={handleSearchVertexSelect}
        selectedVertexId={selectedVertexId}
        isVisible={showSearch}
        onClose={handleToggleSearch}
        onHighlightVertices={handleHighlightVertices}
      />

      {/* Main SVG */}
      <GraphSVG
        width={_width}
        height={_height}
        zoom={zoom}
        pan={pan}
        vertices={positionedVertices}
        edges={filteredEdges}
        selectedVertexId={selectedVertexId}
        hoveredVertexId={hoveredVertexId}
        connectedEdges={connectedEdges}
        layoutConfig={layoutConfig}
        getEntityColor={getEntityColorCallback}
        getVertexRadius={getVertexRadius}
        onVertexClick={handleVertexClick}
        onVertexMouseEnter={handleVertexMouseEnter}
        onVertexMouseLeave={handleVertexMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        svgRef={svgRef}
      />

      {/* Zoom controls */}
      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        zoom={zoom}
        showZoomLevel={true}
      />

      {/* Legend */}
      {showLegend && (
        <GraphLegend
          vertices={filteredVertices}
          getEntityColor={getEntityColorCallback}
        />
      )}

      {/* Tooltip */}
      {tooltip && (
        <GraphTooltip
          vertex={tooltip.vertex}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}

      {/* Info panel */}
      <GraphInfoPanel
        vertices={filteredVertices}
        edges={filteredEdges}
      />
    </div>
  );
}

// Loading component for when the graph is being computed
export function EntityGraphVisualizationSkeleton({
  width: _width = 800,
  height: _height = 400,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  // Silence unused parameter warnings
  void _width;
  void _height;
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.loadingState}>
        <LoadingSkeleton preset="title" width="200px" />
        <p style={{ marginTop: '8px' }}>Building entity graph...</p>
      </div>
    </div>
  );
}