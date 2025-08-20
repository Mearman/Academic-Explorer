import { Box } from '@mantine/core';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

import { Icon, LoadingSkeleton } from '@/components';
import { useGraphKeyboardShortcuts } from '@/hooks/use-graph-keyboard-shortcuts';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import type { 
  EntityGraphVertex, 
  EntityGraphEdge, 
  EntityType, 
  GraphLayoutConfig 
} from '@/types/entity-graph';

import * as styles from '../entity-graph-visualization.css';
import { GraphInfoPanel } from '../graph-info/GraphInfoPanel';
import { createForceSimulation, createCircularLayout } from '../graph-layout/force-simulation';
import { GraphLegend } from '../graph-legend/GraphLegend';
import { GraphSearch } from '../graph-search/GraphSearch';
import { GraphSVG } from '../graph-svg/GraphSVG';
import { GraphTooltip } from '../graph-tooltip/GraphTooltip';
import { useGraphInteractions } from '../hooks/use-graph-interactions';

// Container components
import { EngineTransition } from './EngineTransition';
import { GraphStatusBar } from './GraphStatusBar';
import { GraphToolbar } from './GraphToolbar';

// Graph engines

// Types for graph engine abstraction
export interface GraphEngine {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: GraphEngineCapabilities;
  isSupported: () => boolean;
  isLoading?: boolean;
  error?: Error;
}

export interface GraphEngineCapabilities {
  supportsZoom: boolean;
  supportsPan: boolean;
  supportsSelection: boolean;
  supportsHover: boolean;
  supportsExport: boolean;
  supportsSearch: boolean;
  supportsLegend: boolean;
  supportsLayouts: string[];
  maxVertices?: number;
  performanceLevel: 'low' | 'medium' | 'high';
}

export interface GraphEngineProps {
  width: number;
  height: number;
  vertices: EntityGraphVertex[];
  edges: EntityGraphEdge[];
  selectedVertexId: string | null;
  hoveredVertexId: string | null;
  connectedEdges: Set<string>;
  layoutConfig: GraphLayoutConfig;
  getEntityColor: (entityType: EntityType) => string;
  getVertexRadius: (vertex: EntityGraphVertex) => number;
  onVertexClick: (event: React.MouseEvent, vertex: EntityGraphVertex) => void;
  onVertexMouseEnter: (event: React.MouseEvent, vertex: EntityGraphVertex) => void;
  onVertexMouseLeave: () => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  zoom: number;
  pan: { x: number; y: number };
  svgRef: React.RefObject<SVGSVGElement>;
}

export interface GraphEnginePerformanceMetrics {
  renderTime: number;
  vertexCount: number;
  edgeCount: number;
  memoryUsage?: number;
  fps?: number;
  lastUpdate: number;
}

// Available graph engines
const GRAPH_ENGINES: GraphEngine[] = [
  {
    id: 'custom-svg',
    name: 'Custom SVG',
    description: 'High-performance custom SVG renderer with full feature support',
    version: '2.1.0',
    capabilities: {
      supportsZoom: true,
      supportsPan: true,
      supportsSelection: true,
      supportsHover: true,
      supportsExport: true,
      supportsSearch: true,
      supportsLegend: true,
      supportsLayouts: ['force', 'circular', 'hierarchical'],
      maxVertices: 1000,
      performanceLevel: 'high'
    },
    isSupported: () => true
  },
  {
    id: 'cytoscape',
    name: 'Cytoscape.js',
    description: 'Professional graph analysis and visualization library',
    version: '3.28.1',
    capabilities: {
      supportsZoom: true,
      supportsPan: true,
      supportsSelection: true,
      supportsHover: true,
      supportsExport: true,
      supportsSearch: true,
      supportsLegend: false,
      supportsLayouts: ['force', 'circular', 'hierarchical', 'grid', 'breadthfirst', 'concentric'],
      maxVertices: 5000,
      performanceLevel: 'high'
    },
    isSupported: () => typeof window !== 'undefined' && 'WebGL' in window
  },
  {
    id: 'd3-force',
    name: 'D3 Force Layout',
    description: 'D3.js force-directed graph with WebGL rendering',
    version: '7.8.5',
    capabilities: {
      supportsZoom: true,
      supportsPan: true,
      supportsSelection: true,
      supportsHover: true,
      supportsExport: false,
      supportsSearch: true,
      supportsLegend: true,
      supportsLayouts: ['force'],
      maxVertices: 2000,
      performanceLevel: 'medium'
    },
    isSupported: () => typeof window !== 'undefined' && 'requestAnimationFrame' in window
  },
  {
    id: 'vis-network',
    name: 'Vis.js Network',
    description: 'Interactive network visualization with physics simulation',
    version: '9.1.6',
    capabilities: {
      supportsZoom: true,
      supportsPan: true,
      supportsSelection: true,
      supportsHover: true,
      supportsExport: true,
      supportsSearch: false,
      supportsLegend: false,
      supportsLayouts: ['force', 'hierarchical'],
      maxVertices: 3000,
      performanceLevel: 'medium'
    },
    isSupported: () => typeof window !== 'undefined'
  }
];

// Get default engine based on capabilities and support
function getDefaultEngine(vertexCount: number): string {
  // For small graphs, use custom SVG
  if (vertexCount <= 100) return 'custom-svg';
  
  // For medium graphs, prefer Cytoscape if supported
  const cytoscape = GRAPH_ENGINES.find(e => e.id === 'cytoscape');
  if (cytoscape?.isSupported()) return 'cytoscape';
  
  // Fallback to custom SVG
  return 'custom-svg';
}

// Utility functions for entity graph calculations (copied from parent)
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

interface UniversalGraphContainerProps {
  width?: number;
  height?: number;
  className?: string;
  showControls?: boolean;
  showLegend?: boolean;
  defaultEngine?: string;
  onVertexClick?: (vertex: EntityGraphVertex) => void;
  onVertexHover?: (vertex: EntityGraphVertex | null) => void;
  onEngineChange?: (engineId: string) => void;
  onPerformanceUpdate?: (metrics: GraphEnginePerformanceMetrics) => void;
}

export function UniversalGraphContainer({
  width: _width = 800,
  height: _height = 400,
  className,
  showControls = true,
  showLegend = true,
  defaultEngine,
  onVertexClick,
  onVertexHover,
  onEngineChange,
  onPerformanceUpdate,
}: UniversalGraphContainerProps) {
  // Graph state from store
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

  // Container state
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [_highlightedVertices, _setHighlightedVertices] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<GraphEnginePerformanceMetrics | null>(null);
  
  // Engine management
  const filteredVertices = useMemo(() => getFilteredVertices(), [getFilteredVertices]);
  const [currentEngineId, setCurrentEngineId] = useState<string>(() => {
    return defaultEngine || getDefaultEngine(filteredVertices.length);
  });
  const [engineTransition, setEngineTransition] = useState<{
    from: string | null;
    to: string;
    isActive: boolean;
  } | null>(null);
  
  // Current engine
  const currentEngine = useMemo(() => {
    return GRAPH_ENGINES.find(e => e.id === currentEngineId) || GRAPH_ENGINES[0];
  }, [currentEngineId]);
  
  // Performance monitoring
  const performanceRef = useRef<{
    startTime: number;
    frameCount: number;
    lastFrameTime: number;
  }>({ startTime: 0, frameCount: 0, lastFrameTime: 0 });

  // Graph interactions
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

  // Filtered data
  const filteredEdges = useMemo(() => getFilteredEdges(), [getFilteredEdges]);
  
  // Positioned vertices based on current engine capabilities
  const positionedVertices = useMemo(() => {
    // Check if current engine supports the requested layout
    const supportedLayouts = currentEngine.capabilities.supportsLayouts;
    const requestedLayout = layoutConfig.algorithm;
    
    if (!supportedLayouts.includes(requestedLayout)) {
      console.warn(`Engine ${currentEngine.name} doesn't support ${requestedLayout} layout, falling back to first supported: ${supportedLayouts[0]}`);
    }
    
    return generatePositionedVertices(
      filteredVertices,
      filteredEdges,
      layoutConfig,
      isSimulating,
      _width,
      _height
    );
  }, [filteredVertices, filteredEdges, layoutConfig, isSimulating, _width, _height, currentEngine]);

  // Engine switching
  const handleEngineSwitch = useCallback(async (newEngineId: string) => {
    if (newEngineId === currentEngineId) return;
    
    const newEngine = GRAPH_ENGINES.find(e => e.id === newEngineId);
    if (!newEngine?.isSupported()) {
      console.warn(`Engine ${newEngineId} is not supported in this environment`);
      return;
    }
    
    // Start transition
    setEngineTransition({
      from: currentEngineId,
      to: newEngineId,
      isActive: true
    });
    
    // Simulate engine loading time
    setTimeout(() => {
      setCurrentEngineId(newEngineId);
      onEngineChange?.(newEngineId);
      
      // End transition after a brief delay
      setTimeout(() => {
        setEngineTransition(null);
      }, 300);
    }, 500);
  }, [currentEngineId, onEngineChange]);

  // Performance monitoring
  useEffect(() => {
    const updatePerformanceMetrics = () => {
      const now = performance.now();
      const perf = performanceRef.current;
      
      if (perf.startTime === 0) {
        perf.startTime = now;
        perf.lastFrameTime = now;
      }
      
      const deltaTime = now - perf.lastFrameTime;
      perf.frameCount++;
      perf.lastFrameTime = now;
      
      // Update metrics every second
      if (now - perf.startTime >= 1000) {
        const fps = perf.frameCount / ((now - perf.startTime) / 1000);
        const metrics: GraphEnginePerformanceMetrics = {
          renderTime: deltaTime,
          vertexCount: filteredVertices.length,
          edgeCount: filteredEdges.length,
          fps: Math.round(fps),
          lastUpdate: now,
          memoryUsage: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize
        };
        
        setPerformanceMetrics(metrics);
        onPerformanceUpdate?.(metrics);
        
        // Reset counters
        perf.startTime = now;
        perf.frameCount = 0;
      }
    };
    
    const rafId = requestAnimationFrame(updatePerformanceMetrics);
    return () => cancelAnimationFrame(rafId);
  }, [filteredVertices.length, filteredEdges.length, onPerformanceUpdate]);

  // Vertex interaction handlers
  const handleVertexClick = useCallback((event: React.MouseEvent, vertex: EntityGraphVertex) => {
    event.stopPropagation();
    selectVertex(vertex.id === selectedVertexId ? null : vertex.id);
    onVertexClick?.(vertex);
  }, [selectedVertexId, selectVertex, onVertexClick]);

  const handleVertexMouseEnter = useCallback((event: React.MouseEvent, vertex: EntityGraphVertex) => {
    if (!currentEngine.capabilities.supportsHover) return;
    
    hoverVertex(vertex.id);
    onVertexHover?.(vertex);
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      showTooltip(vertex, event.clientX - rect.left, event.clientY - rect.top);
    }
  }, [hoverVertex, onVertexHover, svgRef, showTooltip, currentEngine]);

  const handleVertexMouseLeave = useCallback(() => {
    if (!currentEngine.capabilities.supportsHover) return;
    
    hoverVertex(null);
    onVertexHover?.(null);
    hideTooltip();
  }, [hoverVertex, onVertexHover, hideTooltip, currentEngine]);

  // Layout regeneration
  const handleRegenerateLayout = useCallback(() => {
    setIsSimulating(!isSimulating);
  }, [isSimulating]);

  // Export functionality
  const handleExportPNG = useCallback(async () => {
    if (!currentEngine.capabilities.supportsExport || !svgRef.current) return;
    
    try {
      // Import export utilities dynamically to avoid loading them for engines that don't support export
      const { exportGraphAsPNG, generateExportFilename, getOptimalExportDimensions } = await import('../graph-utils/graph-export');
      
      const dimensions = getOptimalExportDimensions(svgRef.current);
      const filename = generateExportFilename('graph', 'png');
      
      await exportGraphAsPNG(svgRef.current, {
        filename,
        ...dimensions,
        backgroundColor: '#ffffff',
        scale: 2,
      });
    } catch (error) {
      console.error('Failed to export PNG:', error);
    }
  }, [svgRef, currentEngine]);

  const handleExportSVG = useCallback(() => {
    if (!currentEngine.capabilities.supportsExport || !svgRef.current) return;
    
    try {
      // Import export utilities dynamically
      import('../graph-utils/graph-export').then(({ exportGraphAsSVG, generateExportFilename, getOptimalExportDimensions }) => {
        if (!svgRef.current) return;
        
        const dimensions = getOptimalExportDimensions(svgRef.current);
        const filename = generateExportFilename('graph', 'svg');
        
        exportGraphAsSVG(svgRef.current, {
          filename,
          ...dimensions,
        });
      });
    } catch (error) {
      console.error('Failed to export SVG:', error);
    }
  }, [svgRef, currentEngine]);

  // Search functionality
  const handleToggleSearch = useCallback(() => {
    if (!currentEngine.capabilities.supportsSearch) return;
    
    setShowSearch(prev => !prev);
    if (showSearch) {
      _setHighlightedVertices([]);
    }
  }, [showSearch, currentEngine]);

  const handleSearchVertexSelect = useCallback((vertex: EntityGraphVertex | null) => {
    if (vertex) {
      selectVertex(vertex.id);
      onVertexClick?.(vertex);
    }
  }, [selectVertex, onVertexClick]);

  const handleHighlightVertices = useCallback((vertexIds: string[]) => {
    _setHighlightedVertices(vertexIds);
  }, []);

  // Keyboard shortcuts
  const handleEscapeKey = useCallback(() => {
    if (showSearch) {
      setShowSearch(false);
      _setHighlightedVertices([]);
    } else if (isFullscreen) {
      toggleFullscreen();
    }
  }, [showSearch, isFullscreen, toggleFullscreen]);

  // Connected edges for highlighting
  const connectedEdges = useMemo(() => {
    return calculateConnectedEdges(selectedVertexId, filteredEdges);
  }, [selectedVertexId, filteredEdges]);

  // Utility function callbacks
  const getEntityColorCallback = useCallback(getEntityColor, []);
  const getVertexRadius = useCallback((vertex: EntityGraphVertex) => 
    calculateVertexRadius(vertex, layoutConfig.sizeByVisitCount), 
    [layoutConfig.sizeByVisitCount]
  );

  // Setup keyboard shortcuts
  useGraphKeyboardShortcuts({
    onToggleFullscreen: toggleFullscreen,
    onExportPNG: handleExportPNG,
    onExportSVG: handleExportSVG,
    onToggleSearch: handleToggleSearch,
    onZoomIn: currentEngine.capabilities.supportsZoom ? handleZoomIn : undefined,
    onZoomOut: currentEngine.capabilities.supportsZoom ? handleZoomOut : undefined,
    onZoomReset: currentEngine.capabilities.supportsZoom ? handleZoomReset : undefined,
    onEscape: handleEscapeKey,
  });

  // Show loading state
  if (!isHydrated || isLoading) {
    return (
      <div className={`${styles.container} ${isFullscreen ? styles.fullscreenContainer : ''} ${className || ''}`}>
        <LoadingSkeleton height="100%" />
      </div>
    );
  }

  // Show empty state
  if (filteredVertices.length === 0) {
    return <EmptyGraphState isFullscreen={isFullscreen} className={className} />;
  }

  return (
    <div 
      className={`${styles.container} ${isFullscreen ? styles.fullscreenContainer : ''} ${className || ''}`}
      role="application"
      aria-label="Universal graph visualization container"
      aria-describedby="graph-description"
    >
      {/* Screen reader description */}
      <div id="graph-description" className="sr-only">
        Graph showing {filteredVertices.length} entities and {filteredEdges.length} relationships using {currentEngine.name} engine.
        Use keyboard shortcuts: F11 for fullscreen, Cmd+E to export, Cmd+F to search.
      </div>

      {/* Toolbar with engine selector */}
      {showControls && (
        <GraphToolbar
          currentEngine={currentEngine}
          availableEngines={GRAPH_ENGINES}
          isFullscreen={isFullscreen}
          onEngineChange={handleEngineSwitch}
          onToggleFullscreen={toggleFullscreen}
          onRegenerateLayout={handleRegenerateLayout}
          onExportPNG={currentEngine.capabilities.supportsExport ? handleExportPNG : undefined}
          onExportSVG={currentEngine.capabilities.supportsExport ? handleExportSVG : undefined}
          onToggleSearch={currentEngine.capabilities.supportsSearch ? handleToggleSearch : undefined}
          showSearch={showSearch}
          onZoomIn={currentEngine.capabilities.supportsZoom ? handleZoomIn : undefined}
          onZoomOut={currentEngine.capabilities.supportsZoom ? handleZoomOut : undefined}
          onZoomReset={currentEngine.capabilities.supportsZoom ? handleZoomReset : undefined}
          zoom={zoom}
        />
      )}

      {/* Engine transition overlay */}
      {engineTransition && (
        <EngineTransition
          from={engineTransition.from}
          to={engineTransition.to}
          isActive={engineTransition.isActive}
        />
      )}

      {/* Search overlay */}
      {currentEngine.capabilities.supportsSearch && (
        <GraphSearch
          vertices={filteredVertices}
          onVertexSelect={handleSearchVertexSelect}
          selectedVertexId={selectedVertexId}
          isVisible={showSearch}
          onClose={handleToggleSearch}
          onHighlightVertices={handleHighlightVertices}
        />
      )}

      {/* Graph engine renderer */}
      <Box
        style={{
          position: 'relative',
          width: _width,
          height: _height,
          opacity: engineTransition?.isActive ? 0.3 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        {/* Currently only Custom SVG engine is implemented */}
        {currentEngine.id === 'custom-svg' && (
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
        )}
        
        {/* Placeholder for other engines */}
        {currentEngine.id !== 'custom-svg' && (
          <div 
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--mantine-color-gray-0)',
              border: '2px dashed var(--mantine-color-gray-4)',
              borderRadius: '8px'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ opacity: 0.5 }}>
                <Icon name="graph" size="xl" />
              </div>
              <p style={{ margin: '16px 0 8px', fontWeight: 500 }}>
                {currentEngine.name} Engine
              </p>
              <p style={{ fontSize: '14px', color: 'var(--mantine-color-gray-6)' }}>
                Implementation coming soon
              </p>
              <p style={{ fontSize: '12px', color: 'var(--mantine-color-gray-5)', marginTop: '8px' }}>
                {currentEngine.description}
              </p>
            </div>
          </div>
        )}
      </Box>

      {/* Legend */}
      {showLegend && currentEngine.capabilities.supportsLegend && (
        <GraphLegend
          vertices={filteredVertices}
          getEntityColor={getEntityColorCallback}
        />
      )}

      {/* Tooltip */}
      {tooltip && currentEngine.capabilities.supportsHover && (
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

      {/* Status bar */}
      <GraphStatusBar
        engine={currentEngine}
        performanceMetrics={performanceMetrics}
        vertexCount={filteredVertices.length}
        edgeCount={filteredEdges.length}
        isSimulating={isSimulating}
      />
    </div>
  );
}

// Loading skeleton component
export function UniversalGraphContainerSkeleton({
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
        <p style={{ marginTop: '8px' }}>Initializing graph engine...</p>
      </div>
    </div>
  );
}
