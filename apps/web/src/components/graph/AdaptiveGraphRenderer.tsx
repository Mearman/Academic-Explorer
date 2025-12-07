/**
 * Adaptive Graph Renderer
 *
 * Automatically adjusts rendering quality and performance based on device capabilities,
 * screen size, and graph complexity. Provides smooth experience across mobile and desktop.
 */

import type { EntityType, GraphEdge, GraphNode } from '@bibgraph/types';
import { Box, Group, LoadingOverlay, Stack, Text, useMantineTheme } from '@mantine/core';
import { IconActivity, IconAlertTriangle, IconDeviceMobile, IconDeviceDesktop } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

import { ICON_SIZE } from '@/config/style-constants';
import { announceToScreenReader } from '@/utils/accessibility';

import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '../../styles/hash-colors';
import {
  CONTAINER,
  LABEL,
  LINK,
  NODE,
  SIMULATION,
  TIMING,
} from './constants';
import { getEdgeStyle } from './edge-styles';

// Performance detection utilities
const detectDeviceCapabilities = () => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
  const isLowEnd = !gl ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) ||
    (navigator as any).deviceMemory < 4;

  return {
    isLowEnd,
    cores: navigator.hardwareConcurrency || 4,
    memory: (navigator as any).deviceMemory || 8,
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
  onGraphReady?: (methods: any) => void;
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < (parseInt(theme.breakpoints.sm.replace('px', ''))));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [theme.breakpoints.sm]);
  const graphRef = useRef<any>(undefined);
  const [deviceCapabilities, setDeviceCapabilities] = useState(detectDeviceCapabilities());
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
      let detectedProfile: 'low' | 'medium' | 'high' = 'medium';

      if (deviceCapabilities.isLowEnd || deviceCapabilities.isMobile) {
        detectedProfile = 'low';
      } else if (deviceCapabilities.cores >= 8 && deviceCapabilities.memory >= 8) {
        detectedProfile = 'high';
      }

      setCurrentPerformanceProfile(detectedProfile);
    }
  }, [performanceProfile, deviceCapabilities]);

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

  // Simplified node rendering based on performance settings
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = renderSettings.nodeDetail === 'high' ? 8 : renderSettings.nodeDetail === 'medium' ? 6 : 4;
    const opacity = renderSettings.animationEnabled ? 1 : 0.8;

    ctx.globalAlpha = opacity;

    // Draw node
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = HASH_BASED_ENTITY_COLORS[node.entityType] || 'var(--mantine-color-gray-5)';
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

  // Simplified link rendering
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
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

  // Event handlers
  const handleNodeClick = useCallback((node: any) => {
    onNodeClick?.(node);
  }, [onNodeClick]);

  const handleNodeRightClick = useCallback((node: any, event: MouseEvent) => {
    event.preventDefault();
    onNodeRightClick?.(node, event);
  }, [onNodeRightClick]);

  const handleNodeHover = useCallback((node: any | null) => {
    onNodeHover?.(node);
  }, [onNodeHover]);

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Notify parent when graph is ready
  useEffect(() => {
    const checkRef = () => {
      if (graphRef.current && onGraphReady) {
        onGraphReady(graphRef.current);
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
    >
      <LoadingOverlay visible={false} />

      <ForceGraph2D
        ref={graphRef}
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
        enableZoomInteraction={true}
        enablePanInteraction={true}
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
        {deviceCapabilities.isMobile ? (
          <IconDeviceMobile size={12} />
        ) : (
          <IconDeviceDesktop size={12} />
        )}
        <span>{currentPerformanceProfile.toUpperCase()}</span>
      </Group>

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
            • Pinch to zoom<br/>
            • Drag to pan<br/>
            • Tap nodes to select
          </Text>
        ) : (
          <Text size="xs" c="white">
            • Scroll to zoom<br/>
            • Drag to pan<br/>
            • Click nodes to select
          </Text>
        )}
      </Box>
    </Box>
  );
};