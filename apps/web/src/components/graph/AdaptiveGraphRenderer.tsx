/**
 * Adaptive Graph Renderer
 *
 * Automatically adjusts rendering quality and performance based on device capabilities,
 * screen size, and graph complexity. Provides smooth experience across mobile and desktop.
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { Box, Group, LoadingOverlay, Stack, Text, useMantineTheme } from '@mantine/core';
import { IconActivity, IconAlertTriangle, IconDeviceDesktop, IconDeviceMobile, IconMaximize, IconRotateClockwise,IconZoomIn, IconZoomOut } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d';

import { ICON_SIZE } from '@/config/style-constants';
import { useTouchGestures } from '@/hooks/use-touch-gestures';
import { announceToScreenReader } from '@/utils/accessibility';

import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '../../styles/hash-colors';

// Performance detection utilities
const detectDeviceCapabilities = () => {
  // eslint-disable-next-line custom/no-deprecated -- Canvas creation requires createElement for WebGL context
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

  // Type guard for device memory
  const hasDeviceMemory = (nav: Navigator): nav is Navigator & { deviceMemory: number } => {
    return 'deviceMemory' in nav && typeof (nav as Record<string, unknown>).deviceMemory === 'number';
  };

  const isLowEnd = !gl ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) ||
    (hasDeviceMemory(navigator) && navigator.deviceMemory < 4);

  return {
    isLowEnd,
    cores: navigator.hardwareConcurrency || 4,
    memory: hasDeviceMemory(navigator) ? navigator.deviceMemory : 8,
    supportsWebGL: !!gl,
    maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) || 2048,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  };
};

interface AdaptiveGraphRendererProps {
  /** Graph nodes */
  nodes: GraphNode[];
  /** Graph edges */
  edges: GraphEdge[];
  /** Whether to show the graph */
  visible?: boolean;
  /** Width of the visualization */
  width?: number;
  /** Height of the visualization */
  height?: number;
  /** Node click handler */
  onNodeClick?: (node: GraphNode) => void;
  /** Node right-click handler */
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
  /** Node hover handler */
  onNodeHover?: (node: GraphNode | null) => void;
  /** Background click handler */
  onBackgroundClick?: () => void;
  /** Enable/disable force simulation */
  enableSimulation?: boolean;
  /** Show performance overlay */
  showPerformanceOverlay?: boolean;
  /** Callback when graph methods become available */
  onGraphReady?: (methods: unknown) => void;
  /** Custom performance profile (auto-detected if not provided) */
  performanceProfile?: 'low' | 'medium' | 'high';
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage?: number;
  nodeCount: number;
  edgeCount: number;
  performanceLevel: 'good' | 'ok' | 'poor';
}

interface RenderSettings {
  nodeDetail: 'low' | 'medium' | 'high';
  linkDetail: 'low' | 'medium' | 'high';
  animationEnabled: boolean;
  labelEnabled: boolean;
  simulationCooldown: number;
  maxNodes: number;
  renderMode: 'canvas' | 'webgl';
}

const getPerformanceSettings = (profile: 'low' | 'medium' | 'high', nodeCount: number): RenderSettings => {
  const settings: Record<'low' | 'medium' | 'high', RenderSettings> = {
    low: {
      nodeDetail: 'low',
      linkDetail: 'low',
      animationEnabled: nodeCount < 50,
      labelEnabled: false,
      simulationCooldown: 5000,
      maxNodes: 100,
      renderMode: 'canvas',
    },
    medium: {
      nodeDetail: 'medium',
      linkDetail: 'medium',
      animationEnabled: nodeCount < 200,
      labelEnabled: nodeCount < 100,
      simulationCooldown: 2000,
      maxNodes: 500,
      renderMode: 'canvas',
    },
    high: {
      nodeDetail: 'high',
      linkDetail: 'high',
      animationEnabled: true,
      labelEnabled: true,
      simulationCooldown: 1000,
      maxNodes: 1000,
      renderMode: 'canvas',
    },
  };

  return settings[profile];
};

const getPerformanceLevelColor = (level: PerformanceMetrics['performanceLevel']) => {
  switch (level) {
    case 'good': return 'var(--mantine-color-green-6)';
    case 'ok': return 'var(--mantine-color-yellow-6)';
    case 'poor': return 'var(--mantine-color-red-6)';
    default: return 'var(--mantine-color-gray-6)';
  }
};

export const AdaptiveGraphRenderer = ({
  nodes,
  edges,
  visible = true,
  width,
  height = 400,
  onNodeClick,
  onNodeRightClick,
  onNodeHover,
  onBackgroundClick,
  enableSimulation = true,
  showPerformanceOverlay = false,
  onGraphReady,
  performanceProfile,
}: AdaptiveGraphRendererProps) => {
  const theme = useMantineTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < (Number.parseInt(theme.breakpoints.sm.replace('px', ''))));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [theme.breakpoints.sm]);
  const graphRef = useRef<ForceGraphMethods<NodeObject, LinkObject<NodeObject>> | null>(null);
  const [currentPerformanceProfile, setCurrentPerformanceProfile] = useState<'low' | 'medium' | 'high'>('medium');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    performanceLevel: 'good',
  });
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(
    getPerformanceSettings('medium', nodes.length)
  );

  // Auto-detect performance profile if not provided
  useEffect(() => {
    if (performanceProfile) {
      setCurrentPerformanceProfile(performanceProfile);
    } else {
      const capabilities = detectDeviceCapabilities();
      let detectedProfile: 'low' | 'medium' | 'high' = 'medium';

      if (capabilities.isLowEnd || capabilities.isMobile) {
        detectedProfile = 'low';
      } else if (capabilities.cores >= 8 && capabilities.memory >= 8) {
        detectedProfile = 'high';
      }

      setCurrentPerformanceProfile(detectedProfile);
    }
  }, [performanceProfile]);

  // Adjust render settings based on profile and graph size
  useEffect(() => {
    const adjustedProfile = nodes.length > renderSettings.maxNodes ? 'low' : currentPerformanceProfile;
    const settings = getPerformanceSettings(adjustedProfile, nodes.length);
    setRenderSettings(settings);

    // Announce to screen readers if performance is adjusted
    if (nodes.length > renderSettings.maxNodes) {
      announceToScreenReader(`Performance adjusted to low quality mode for ${nodes.length} nodes`);
    }
  }, [currentPerformanceProfile, nodes.length]);

  // Performance monitoring
  useEffect(() => {
    if (!showPerformanceOverlay) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measurePerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        const frameTime = deltaTime / frameCount;
        const performanceLevel = fps >= 50 ? 'good' : fps >= 30 ? 'ok' : 'poor';

        setPerformanceMetrics({
          fps,
          frameTime,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          performanceLevel,
        });

        // Auto-adjust quality if performance is poor
        if (performanceLevel === 'poor' && currentPerformanceProfile !== 'low') {
          setCurrentPerformanceProfile('low');
          announceToScreenReader('Performance automatically adjusted to maintain smooth interaction');
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measurePerformance);
    };

    animationFrameId = requestAnimationFrame(measurePerformance);

    return () => cancelAnimationFrame(animationFrameId);
  }, [showPerformanceOverlay, currentPerformanceProfile, nodes.length, edges.length]);

  // Type guard for force graph node
  const isForceGraphNode = (node: unknown): node is {
    x: number;
    y: number;
    entityType: string;
    label: string;
  } => {
    return typeof node === 'object' && node !== null &&
           'x' in node && typeof (node as Record<string, unknown>).x === 'number' &&
           'y' in node && typeof (node as Record<string, unknown>).y === 'number' &&
           'entityType' in node && typeof (node as Record<string, unknown>).entityType === 'string' &&
           'label' in node && typeof (node as Record<string, unknown>).label === 'string';
  };

  // Simplified node rendering based on performance settings
  const nodeCanvasObject = useCallback((node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!isForceGraphNode(node)) return;

    const size = renderSettings.nodeDetail === 'high' ? 8 : renderSettings.nodeDetail === 'medium' ? 6 : 4;
    const opacity = renderSettings.animationEnabled ? 1 : 0.8;

    ctx.globalAlpha = opacity;

    // Draw node
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = HASH_BASED_ENTITY_COLORS[node.entityType as keyof typeof HASH_BASED_ENTITY_COLORS] || 'var(--mantine-color-gray-5)';
    ctx.fill();

    // Draw border in high detail mode
    if (renderSettings.nodeDetail === 'high' && globalScale > 1.5) {
      ctx.strokeStyle = 'var(--mantine-color-body)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw labels in medium/high detail mode when zoomed in
    if (renderSettings.labelEnabled && globalScale > 2) {
      const fontSize = Math.max(10 / globalScale, 8);
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'var(--mantine-color-text)';
      ctx.fillText(node.label, node.x, node.y + size + 2);
    }

    ctx.globalAlpha = 1;
  }, [renderSettings]);

  // Type guard for force graph link
  const isForceGraphLink = (link: unknown): link is {
    source: { x: number; y: number };
    target: { x: number; y: number };
  } => {
    if (typeof link !== 'object' || link === null) return false;
    const linkObj = link as Record<string, unknown>;

    if (!('source' in linkObj) || !('target' in linkObj)) return false;
    const source = linkObj.source;
    const target = linkObj.target;

    if (typeof source !== 'object' || source === null || typeof target !== 'object' || target === null) return false;
    const sourceObj = source as Record<string, unknown>;
    const targetObj = target as Record<string, unknown>;

    return 'x' in sourceObj && typeof sourceObj.x === 'number' &&
           'y' in sourceObj && typeof sourceObj.y === 'number' &&
           'x' in targetObj && typeof targetObj.x === 'number' &&
           'y' in targetObj && typeof targetObj.y === 'number';
  };

  // Simplified link rendering
  const linkCanvasObject = useCallback((link: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!isForceGraphLink(link)) return;

    const width = renderSettings.linkDetail === 'high' ? 2 : renderSettings.linkDetail === 'medium' ? 1.5 : 1;
    const opacity = renderSettings.animationEnabled ? 0.6 : 0.4;

    ctx.globalAlpha = opacity;
    ctx.strokeStyle = 'var(--mantine-color-gray-5)';
    ctx.lineWidth = width / globalScale;

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }, [renderSettings]);

  // Type guard for graph node with originalNode property
  const isGraphCallbackNode = (node: unknown): node is GraphNode => {
    return typeof node === 'object' && node !== null &&
           'id' in node && typeof (node as Record<string, unknown>).id === 'string' &&
           'entityType' in node && typeof (node as Record<string, unknown>).entityType === 'string' &&
           'label' in node && typeof (node as Record<string, unknown>).label === 'string' &&
           'entityId' in node && typeof (node as Record<string, unknown>).entityId === 'string';
  };

  // Event handlers
  const handleNodeClick = useCallback((node: unknown) => {
    if (isGraphCallbackNode(node)) {
      onNodeClick?.(node);
    }
  }, [onNodeClick]);

  const handleNodeRightClick = useCallback((node: unknown, event: MouseEvent) => {
    if (isGraphCallbackNode(node)) {
      event.preventDefault();
      onNodeRightClick?.(node, event);
    }
  }, [onNodeRightClick]);

  const handleNodeHover = useCallback((node: unknown | null) => {
    if (node === null || isGraphCallbackNode(node)) {
      onNodeHover?.(node);
    }
  }, [onNodeHover]);

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Type guard for force graph methods with zoom
  const hasZoomMethod = (obj: ForceGraphMethods<NodeObject, LinkObject<NodeObject>> | null): obj is ForceGraphMethods<NodeObject, LinkObject<NodeObject>> => {
    return obj !== null;
  };

  // Touch gesture handlers for mobile interactions
  const touchHandlers = useTouchGestures({
    onSwipe: (direction: string, _velocity: unknown) => {
      if (!hasZoomMethod(graphRef.current)) return;

      const currentZoom = graphRef.current.zoom();
      const newZoom = direction === 'up' || direction === 'left'
        ? Math.min(currentZoom * 1.1, 3)
        : Math.max(currentZoom * 0.9, 0.1);

      graphRef.current.zoom(newZoom, 400);
      setZoomLevel(newZoom);
      announceToScreenReader(`Zoom ${direction === 'up' || direction === 'left' ? 'in' : 'out'} to ${Math.round(newZoom * 100)}%`);
    },
    onDoubleTap: (_x: unknown, _y: unknown) => {
      if (hasZoomMethod(graphRef.current)) {
        const currentZoom = graphRef.current.zoom();
        const newZoom = currentZoom === 1 ? 2 : 1;
        graphRef.current.zoom(newZoom, 400);
        setZoomLevel(newZoom);
        announceToScreenReader(`Zoom ${newZoom === 1 ? 'out to fit' : 'in to 200%'}`);
      }
    },
    onPinch: (scale: number, _centerX: unknown, _centerY: unknown) => {
      if (hasZoomMethod(graphRef.current)) {
        const currentZoom = graphRef.current.zoom();
        const newZoom = Math.max(0.1, Math.min(3, currentZoom * scale));
        graphRef.current.zoom(newZoom, 0);
        setZoomLevel(newZoom);
      }
    },
    onLongPress: (_x: unknown, _y: unknown) => {
      setShowControls(prev => !prev);
      announceToScreenReader(`Controls ${showControls ? 'hidden' : 'shown'}`);
    },
  }, {
    swipeThreshold: 50,
    pinchThreshold: 0.1,
    doubleTapDelay: 300,
    longPressDelay: 800,
    preventDefault: false,
  });

  // Notify parent when graph is ready
  useEffect(() => {
    const checkRef = () => {
      if (graphRef.current && onGraphReady) {
        onGraphReady(graphRef.current as unknown);
      }
    };

    checkRef();
    const timeoutId = setTimeout(checkRef, 100);
    return () => clearTimeout(timeoutId);
  }, [onGraphReady]);

  // Pause/resume simulation based on settings
  useEffect(() => {
    if (graphRef.current) {
      if (enableSimulation && renderSettings.animationEnabled) {
        graphRef.current.resumeAnimation();
      } else {
        graphRef.current.pauseAnimation();
      }
    }
  }, [enableSimulation, renderSettings.animationEnabled]);

  // Transform data for force graph
  const graphData = useMemo(() => {
    const forceNodes = nodes.map((node) => ({
      id: node.id,
      entityType: node.entityType,
      label: node.label,
      entityId: node.entityId,
      x: node.x,
      y: node.y,
      originalNode: node,
    }));

    const forceLinks = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      originalEdge: edge,
    }));

    return { nodes: forceNodes, links: forceLinks };
  }, [nodes, edges]);

  if (!visible) {
    return null;
  }

  // Show warning if graph is too large for device
  if (nodes.length > renderSettings.maxNodes) {
    return (
      <Box
        ref={containerRef}
        pos="relative"
        style={{
          width: width ?? '100%',
          height,
          border: '1px solid var(--mantine-color-yellow-6)',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'var(--mantine-color-yellow-0)',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <Stack align="center" gap="md">
          <IconAlertTriangle size={ICON_SIZE.EMPTY_STATE} style={{ color: 'var(--mantine-color-yellow-6)' }} />
          <div>
            <Text size="lg" fw={600} c="var(--mantine-color-yellow-8)">
              Graph Too Large for Device
            </Text>
            <Text size="sm" c="var(--mantine-color-yellow-7)" mt="xs">
              This graph contains {nodes.length} nodes and {edges.length} edges,
              which exceeds the recommended limit of {renderSettings.maxNodes} for your device.
            </Text>
            <Text size="sm" c="var(--mantine-color-yellow-7)">
              Consider using filters to reduce the graph size or view on a more powerful device.
            </Text>
          </div>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      pos="relative"
      style={{
        width: width ?? '100%',
        height,
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-body)',
      }}
      role="application"
      aria-label={`Interactive graph with ${nodes.length} nodes and ${edges.length} edges. ${renderSettings.animationEnabled ? 'Animation enabled' : 'Animation disabled for performance'}.`}
      {...(isMobile ? touchHandlers.handlers : {})}
    >
      <LoadingOverlay visible={false} />

      <ForceGraph2D
        ref={graphRef as React.RefObject<ForceGraphMethods<NodeObject, LinkObject<NodeObject>>>}
        width={width}
        height={height}
        graphData={graphData}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        enableZoomInteraction={!isMobile}
        enablePanInteraction={!isMobile}
        cooldownTime={renderSettings.simulationCooldown}
        d3AlphaDecay={renderSettings.animationEnabled ? 0.0228 : 0.1}
        d3VelocityDecay={renderSettings.animationEnabled ? 0.4 : 0.8}
      />

      {/* Device and performance indicators */}
      <Group
        gap="xs"
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '4px',
          padding: '4px 8px',
          color: '#fff',
          fontSize: '10px',
          zIndex: 10,
        }}
      >
        {isMobile ? (
          <IconDeviceMobile size={12} />
        ) : (
          <IconDeviceDesktop size={12} />
        )}
        <span>{currentPerformanceProfile.toUpperCase()}</span>
        <span>•</span>
        <span>{Math.round(zoomLevel * 100)}%</span>
      </Group>

      {/* Mobile controls */}
      {isMobile && showControls && (
        <Group
          gap="xs"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '4px',
            padding: '4px',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => {
              if (hasZoomMethod(graphRef.current)) {
                const currentZoom = graphRef.current.zoom();
                const newZoom = Math.max(0.1, currentZoom - 0.2);
                graphRef.current.zoom(newZoom, 200);
                setZoomLevel(newZoom);
                announceToScreenReader(`Zoom out to ${Math.round(newZoom * 100)}%`);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '4px',
            }}
            aria-label="Zoom out"
          >
            <IconZoomOut size={16} />
          </button>

          <button
            onClick={() => {
              if (hasZoomMethod(graphRef.current)) {
                const currentZoom = graphRef.current.zoom();
                const newZoom = Math.min(3, currentZoom + 0.2);
                graphRef.current.zoom(newZoom, 200);
                setZoomLevel(newZoom);
                announceToScreenReader(`Zoom in to ${Math.round(newZoom * 100)}%`);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '4px',
            }}
            aria-label="Zoom in"
          >
            <IconZoomIn size={16} />
          </button>

          <button
            onClick={() => {
              if (graphRef.current) {
                graphRef.current.zoomToFit(200);
                setZoomLevel(1);
                announceToScreenReader('Zoom to fit');
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '4px',
            }}
            aria-label="Zoom to fit"
          >
            <IconMaximize size={16} />
          </button>

          <button
            onClick={() => {
              announceToScreenReader('Rotate graph 45 degrees');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '4px',
            }}
            aria-label="Rotate graph"
          >
            <IconRotateClockwise size={16} />
          </button>
        </Group>
      )}

      {/* Performance overlay */}
      {showPerformanceOverlay && (
        <Box
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '4px',
            padding: '8px',
            color: '#fff',
            fontSize: '10px',
            fontFamily: 'monospace',
            zIndex: 10,
            minWidth: '120px',
          }}
        >
          <Stack gap={2}>
            <Group gap={4} justify="space-between">
              <Group gap={2}>
                <IconActivity size={10} />
                <Text size="xs" fw={500} c="white">Perf</Text>
              </Group>
              <Text
                size="xs"
                fw={500}
                c={getPerformanceLevelColor(performanceMetrics.performanceLevel)}
              >
                {performanceMetrics.performanceLevel.toUpperCase()}
              </Text>
            </Group>
            <Group gap={4} justify="space-between">
              <Text size="xs" c="var(--mantine-color-gray-4)">FPS:</Text>
              <Text size="xs" c="white">{performanceMetrics.fps}</Text>
            </Group>
            <Group gap={4} justify="space-between">
              <Text size="xs" c="var(--mantine-color-gray-4)">Nodes:</Text>
              <Text size="xs" c="white">{performanceMetrics.nodeCount}</Text>
            </Group>
            <Group gap={4} justify="space-between">
              <Text size="xs" c="var(--mantine-color-gray-4)">Edges:</Text>
              <Text size="xs" c="white">{performanceMetrics.edgeCount}</Text>
            </Group>
            {renderSettings.animationEnabled && (
              <Text size="xs" c="var(--mantine-color-green-4)">✓ Anim</Text>
            )}
            {renderSettings.labelEnabled && (
              <Text size="xs" c="var(--mantine-color-blue-4)">✓ Labels</Text>
            )}
          </Stack>
        </Box>
      )}

      {/* Accessibility instructions */}
      <Box
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '4px',
          padding: '4px 8px',
          color: '#fff',
          fontSize: '10px',
          zIndex: 10,
          maxWidth: '200px',
        }}
      >
        {isMobile ? (
          <Text size="xs" c="white">
            <div>• Swipe up/down to zoom</div>
            <div>• Double-tap to toggle zoom</div>
            <div>• Long-press to show controls</div>
            <div>• Pinch to zoom precisely</div>
            <div>• Drag nodes to reposition</div>
            <div>• Tap nodes for details</div>
          </Text>
        ) : (
          <Text size="xs" c="white">
            <div>• Scroll to zoom in/out</div>
            <div>• Drag to pan around</div>
            <div>• Click nodes for details</div>
            <div>• Right-click for context menu</div>
            <div>• Use Tab + Enter for keyboard nav</div>
          </Text>
        )}
      </Box>
    </Box>
  );
};