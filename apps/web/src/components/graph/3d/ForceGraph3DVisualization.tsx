/**
 * 3D Force-directed graph visualization component
 *
 * Renders a graph using react-force-graph-3d with customizable styling.
 * Presentation logic (colors, highlights, filters) is passed in as props,
 * keeping this component focused on rendering.
 *
 * Features:
 * - Camera state persistence (position, zoom saved to localStorage)
 * - Performance monitoring (FPS, frame time, jank detection)
 * - Level of Detail (LOD) system for adaptive quality
 * - Frustum culling optimization for large graphs
 */

import type { EntityType,GraphEdge, GraphNode } from '@bibgraph/types';
import { detectWebGLCapabilities, GraphLODManager, LODLevel } from '@bibgraph/utils';
import { Badge, Box, Group, LoadingOverlay, Stack, Text, useComputedColorScheme } from '@mantine/core';
import { IconActivity,IconAlertTriangle } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

import { useCameraPersistence } from '../../../hooks/useCameraPersistence';
import {
  getPerformanceLevelColor,
  useGraph3DPerformance,
} from '../../../hooks/useGraph3DPerformance';
import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '../../../styles/hash-colors';
import {
  ANIMATION_3D,
  CAMERA_3D,
  COLORS_3D,
  CONTAINER,
  GEOMETRY_3D,
  LABEL_3D,
  LINK,
  MATERIAL_3D,
  NODE,
  OVERLAY_3D,
  PERFORMANCE_3D,
  SIMULATION,
  TIMING,
} from '../constants';
import { getEdgeStyle } from '../edge-styles';

// Entity type colors using hash-based generation for deterministic, consistent coloring
const ENTITY_TYPE_COLORS: Record<EntityType, string> = HASH_BASED_ENTITY_COLORS;

// Default prop values extracted as constants to prevent infinite render loops
const DEFAULT_HIGHLIGHTED_NODE_IDS = new Set<string>();
const DEFAULT_HIGHLIGHTED_PATH: string[] = [];
const DEFAULT_EXPANDING_NODE_IDS = new Set<string>();

// Node for the force graph (extends NodeObject)
interface ForceGraphNode {
  id: string;
  entityType: EntityType;
  label: string;
  entityId: string;
  // Position managed by force simulation
  x?: number;
  y?: number;
  z?: number;
  fx?: number; // Fixed x position
  fy?: number; // Fixed y position
  fz?: number; // Fixed z position
  // Original data
  originalNode: GraphNode;
}

// Link for the force graph
interface ForceGraphLink {
  id: string;
  type: string;
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  // Original data
  originalEdge: GraphEdge;
}

// Import and re-export shared types from parent directory
import type { DisplayMode, LinkStyle,NodeStyle } from '../types';

export interface ForceGraph3DVisualizationProps {
  /** Graph nodes */
  nodes: GraphNode[];
  /** Graph edges */
  edges: GraphEdge[];
  /** Whether to show the graph (for controlled visibility) */
  visible?: boolean;
  /** Width of the visualization (defaults to container width) */
  width?: number;
  /** Height of the visualization */
  height?: number;
  /** Display mode: highlight dims non-selected, filter hides non-selected */
  displayMode?: DisplayMode;
  /** Set of highlighted node IDs */
  highlightedNodeIds?: Set<string>;
  /** Path to highlight (ordered array of node IDs) */
  highlightedPath?: string[];
  /** Community assignments: nodeId -> communityId */
  communityAssignments?: Map<string, number>;
  /** Community colors: communityId -> color */
  communityColors?: Map<number, string>;
  /** Node IDs currently being expanded (loading relationships) */
  expandingNodeIds?: Set<string>;
  /** Loading state */
  loading?: boolean;
  /** Custom node style override */
  getNodeStyle?: (node: GraphNode, isHighlighted: boolean, communityId?: number) => NodeStyle;
  /** Custom link style override */
  getLinkStyle?: (edge: GraphEdge, isHighlighted: boolean) => LinkStyle;
  /** Node click handler */
  onNodeClick?: (node: GraphNode) => void;
  /** Node right-click handler (for context menu) */
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
  /** Node hover handler */
  onNodeHover?: (node: GraphNode | null) => void;
  /** Background click handler */
  onBackgroundClick?: () => void;
  /** Enable/disable force simulation */
  enableSimulation?: boolean;
  /** Seed for deterministic initial positions (defaults to 42 for reproducibility) */
  seed?: number;
  /** Callback when WebGL is unavailable */
  onWebGLUnavailable?: (reason: string) => void;

  // === New Performance Features ===

  /** Enable camera state persistence (position saved to localStorage) */
  enableCameraPersistence?: boolean;
  /** Storage key for camera persistence (default: 'graph3d-camera') */
  cameraStorageKey?: string;
  /** Enable performance monitoring overlay */
  showPerformanceOverlay?: boolean;
  /** Enable adaptive LOD (Level of Detail) based on distance and performance */
  enableAdaptiveLOD?: boolean;
  /** Callback when performance drops below threshold */
  onPerformanceDrop?: (fps: number) => void;
  /** Callback when graph methods become available (for external control like zoomToFit) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGraphReady?: (methods: any) => void;
  /** Enable cursor-centered zoom (zoom toward cursor position instead of orbit center) */
  enableCursorCenteredZoom?: boolean;
}

/**
 * Simple seeded random number generator for deterministic layouts
 * @param seed
 */
const seededRandom = (seed: number): () => number => () => {
    seed = (seed * 1_103_515_245 + 12_345) & 0x7F_FF_FF_FF;
    return seed / 0x7F_FF_FF_FF;
  };

/**
 * WebGL unavailable fallback component
 * @param root0
 * @param root0.reason
 */
const WebGLUnavailable = ({ reason }: { reason: string }) => <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 'var(--mantine-spacing-xl)',
        textAlign: 'center',
        color: 'var(--mantine-color-dimmed)',
      }}
    >
      <IconAlertTriangle size={48} style={{ marginBottom: 'var(--mantine-spacing-md)' }} />
      <Box style={{ fontWeight: 500, marginBottom: 'var(--mantine-spacing-xs)' }}>
        3D Visualization Unavailable
      </Box>
      <Box style={{ fontSize: 'var(--mantine-font-size-sm)' }}>
        {reason}
      </Box>
    </Box>;

export const ForceGraph3DVisualization = ({
  nodes,
  edges,
  visible = true,
  width,
  height = 500,
  displayMode = 'highlight',
  highlightedNodeIds = DEFAULT_HIGHLIGHTED_NODE_IDS,
  highlightedPath = DEFAULT_HIGHLIGHTED_PATH,
  communityAssignments,
  communityColors,
  expandingNodeIds = DEFAULT_EXPANDING_NODE_IDS,
  loading = false,
  getNodeStyle,
  getLinkStyle,
  onNodeClick,
  onNodeRightClick,
  onNodeHover,
  onBackgroundClick,
  enableSimulation = true,
  seed,
  onWebGLUnavailable,
  // New performance features
  enableCameraPersistence = false,
  cameraStorageKey = 'graph3d-camera',
  showPerformanceOverlay = false,
  enableAdaptiveLOD = false,
  onPerformanceDrop,
  onGraphReady,
  enableCursorCenteredZoom = true,
}: ForceGraph3DVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Use any for the ref type to avoid complex generic type issues with react-force-graph-3d
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(undefined);
  const colorScheme = useComputedColorScheme('light');

  // Compute WebGL status once on mount - derived from WebGL capabilities
  const webglStatus = useMemo(() => {
    const result = detectWebGLCapabilities();
    return { available: result.available, reason: result.reason };
  }, []);

  // Notify parent when WebGL is unavailable
  useEffect(() => {
    if (!webglStatus.available && onWebGLUnavailable) {
      onWebGLUnavailable(webglStatus.reason ?? 'WebGL not available');
    }
  }, [webglStatus.available, webglStatus.reason, onWebGLUnavailable]);

  // Notify parent when graph methods become available
  useEffect(() => {
    // Use a short delay to ensure the ref is populated after render
    const checkRef = () => {
      if (graphRef.current && onGraphReady) {
        onGraphReady(graphRef.current);
      }
    };
    // Check immediately and after a short delay (for initial mount)
    checkRef();
    const timeoutId = setTimeout(checkRef, 100);
    return () => clearTimeout(timeoutId);
  }, [onGraphReady]);

  // === Performance Features Hooks ===

  // Camera persistence - saves camera position to localStorage
  const {
    cameraState: savedCameraState,
    updateCameraState,
  } = useCameraPersistence({
    enabled: enableCameraPersistence,
    storageKey: cameraStorageKey,
    debounceMs: CAMERA_3D.PERSISTENCE_DEBOUNCE_MS,
  });

  // Performance monitoring - tracks FPS, frame times, jank
  const {
    stats: performanceStats,
    frameStart,
    frameEnd,
    updateVisibleCounts,
  } = useGraph3DPerformance({
    enabled: showPerformanceOverlay || enableAdaptiveLOD,
    onPerformanceDrop: onPerformanceDrop
      ? (stats) => onPerformanceDrop(stats.fps)
      : undefined,
    fpsThreshold: PERFORMANCE_3D.FPS_THRESHOLD,
  });

  // LOD Manager - adjusts detail based on distance and performance
  const lodManager = useMemo(() => {
    if (!enableAdaptiveLOD) return null;
    return new GraphLODManager({
      adaptiveMode: true,
      targetFps: PERFORMANCE_3D.TARGET_FPS,
      minFps: PERFORMANCE_3D.MIN_FPS,
    });
  }, [enableAdaptiveLOD]);

  // Track camera position for LOD calculations
  const cameraPositionRef = useRef({ x: 0, y: 0, z: CAMERA_3D.INITIAL_Z_POSITION });

  // Enable cursor-centered zoom on OrbitControls (built-in Three.js feature)
  // Requires controlType="orbit" on ForceGraph3D component
  useEffect(() => {
    if (!enableCursorCenteredZoom) return;

    const enableZoomToCursor = () => {
      const controls = graphRef.current?.controls?.();
      if (controls && 'zoomToCursor' in controls) {
        controls.zoomToCursor = true;
      }
    };

    // Try immediately and after a short delay (for initial mount)
    enableZoomToCursor();
    const timeoutId = setTimeout(enableZoomToCursor, TIMING.GRAPH_REF_CHECK_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
      const controls = graphRef.current?.controls?.();
      if (controls && 'zoomToCursor' in controls) {
        controls.zoomToCursor = false;
      }
    };
  }, [enableCursorCenteredZoom]);

  // Track container width for responsive sizing
  const [containerWidth, setContainerWidth] = useState(width ?? CONTAINER.DEFAULT_WIDTH);

  useEffect(() => {
    if (!containerRef.current || width) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [width]);

  // Create highlighted path edge set for quick lookup
  const highlightedPathEdges = useMemo(() => {
    const edgeSet = new Set<string>();
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      const source = highlightedPath[i];
      const target = highlightedPath[i + 1];
      // Add both directions since graph might be undirected
      edgeSet.add(`${source}-${target}`);
      edgeSet.add(`${target}-${source}`);
    }
    return edgeSet;
  }, [highlightedPath]);

  // Only use highlightedNodeIds for filtering if in filter mode
  const filterNodeIds = displayMode === 'filter' ? highlightedNodeIds : undefined;

  // Transform nodes for force graph with 3D positions
  const graphData = useMemo(() => {
    // Always use deterministic seeding for reproducible layouts
    const random = seededRandom(seed ?? SIMULATION.DEFAULT_SEED);

    // Deduplicate nodes by ID (safety net - upstream should already deduplicate)
    const seenNodeIds = new Set<string>();
    const deduplicatedNodes = nodes.filter(n => {
      if (seenNodeIds.has(n.id)) {
        return false;
      }
      seenNodeIds.add(n.id);
      return true;
    });

    // Filter nodes if in filter mode
    const filteredNodes = filterNodeIds && filterNodeIds.size > 0
      ? deduplicatedNodes.filter(n => filterNodeIds.has(n.id))
      : deduplicatedNodes;

    const nodeIdSet = new Set(filteredNodes.map(n => n.id));

    // Filter edges to only include those between visible nodes
    const filteredEdges = edges.filter(e =>
      nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    const forceNodes: ForceGraphNode[] = filteredNodes.map((node) => ({
      id: node.id,
      entityType: node.entityType,
      label: node.label,
      entityId: node.entityId,
      // Use existing positions or generate random ones in 3D space
      x: node.x ?? (random() - 0.5) * SIMULATION.INITIAL_POSITION_SPREAD,
      y: node.y ?? (random() - 0.5) * SIMULATION.INITIAL_POSITION_SPREAD,
      z: (random() - 0.5) * SIMULATION.INITIAL_POSITION_SPREAD, // Add Z dimension
      originalNode: node,
    }));

    const forceLinks: ForceGraphLink[] = filteredEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      originalEdge: edge,
    }));

    return { nodes: forceNodes, links: forceLinks };
  }, [nodes, edges, filterNodeIds, seed]);

  // Determine if a node is highlighted
  const isNodeHighlighted = useCallback((nodeId: string): boolean => {
    if (highlightedNodeIds.size === 0 && highlightedPath.length === 0) {
      return true; // No highlighting active, all nodes are "highlighted"
    }
    return highlightedNodeIds.has(nodeId) || highlightedPath.includes(nodeId);
  }, [highlightedNodeIds, highlightedPath]);

  // Determine if an edge is highlighted
  const isEdgeHighlighted = useCallback((edge: GraphEdge): boolean => {
    if (highlightedPath.length > 0) {
      return highlightedPathEdges.has(`${edge.source}-${edge.target}`);
    }
    if (highlightedNodeIds.size === 0) {
      return true; // No highlighting active
    }
    return highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target);
  }, [highlightedNodeIds, highlightedPath, highlightedPathEdges]);

  // 3D node rendering - return a Three.js object with depth-based visual effects
  // Uses LOD (Level of Detail) to adjust quality based on camera distance
  const nodeThreeObject = useCallback((node: ForceGraphNode) => {
    const isHighlighted = isNodeHighlighted(node.id);
    const isExpanding = expandingNodeIds.has(node.id);
    const communityId = communityAssignments?.get(node.id);

    // Get style from custom function or defaults
    const style = getNodeStyle
      ? getNodeStyle(node.originalNode, isHighlighted, communityId)
      : getDefaultNodeStyle(node, isHighlighted, communityId, communityColors);

    const color = style.color ?? ENTITY_TYPE_COLORS[node.entityType] ?? COLORS_3D.DEFAULT_FALLBACK;
    const baseSize = style.size ?? NODE.DEFAULT_SIZE;
    const opacity = isHighlighted ? (style.opacity ?? NODE.FULL_OPACITY) : MATERIAL_3D.DIMMED_NODE_OPACITY;

    // Calculate LOD based on distance to camera
    let lodLevel = LODLevel.HIGH;
    let lodSettings: { segments: number; showLabel: boolean; materialType: 'basic' | 'phong'; useRing: boolean } = {
      segments: GEOMETRY_3D.HIGH_LOD_SEGMENTS,
      showLabel: true,
      materialType: 'phong',
      useRing: true,
    };

    if (lodManager && node.x !== undefined && node.y !== undefined && node.z !== undefined) {
      lodLevel = lodManager.getEffectiveLOD(
        { x: node.x, y: node.y, z: node.z ?? 0 },
        cameraPositionRef.current
      );
      lodSettings = lodManager.getNodeRenderSettings(lodLevel);
    }

    // Create a group to hold both sphere and label
    const group = new THREE.Group();

    // Create sphere geometry with LOD-adjusted segments
    const geometry = new THREE.SphereGeometry(baseSize, lodSettings.segments, lodSettings.segments);

    // Use LOD-appropriate material
    let material: THREE.Material;
    if (lodSettings.materialType === 'phong') {
      // High quality: MeshPhongMaterial for better lighting and depth perception
      material = new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity,
        emissive: new THREE.Color(color).multiplyScalar(MATERIAL_3D.EMISSIVE_MULTIPLIER),
        emissiveIntensity: isHighlighted ? MATERIAL_3D.EMISSIVE_INTENSITY_HIGHLIGHTED : MATERIAL_3D.EMISSIVE_INTENSITY_NORMAL,
        shininess: MATERIAL_3D.SHININESS,
      });
    } else {
      // Low quality: MeshBasicMaterial (faster, no lighting calculations)
      material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
      });
    }

    const sphere = new THREE.Mesh(geometry, material);

    // Add subtle ring for highlighted nodes (only at high LOD)
    if (isHighlighted && lodSettings.useRing && !isExpanding) {
      const ringGeometry = new THREE.RingGeometry(
        baseSize * GEOMETRY_3D.RING_INNER_RADIUS_MULTIPLIER,
        baseSize * GEOMETRY_3D.RING_OUTER_RADIUS_MULTIPLIER,
        lodSettings.segments * 2
      );
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: COLORS_3D.RING_ACCENT,
        transparent: true,
        opacity: MATERIAL_3D.RING_OPACITY,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2; // Face camera
      group.add(ring);
    }

    // Add spinning ring for expanding nodes (loading indicator)
    if (isExpanding) {
      const spinningRingGeometry = new THREE.TorusGeometry(
        baseSize * GEOMETRY_3D.TORUS_RADIUS_MULTIPLIER,
        baseSize * GEOMETRY_3D.TORUS_TUBE_MULTIPLIER,
        GEOMETRY_3D.TORUS_TUBE_SEGMENTS,
        GEOMETRY_3D.TORUS_RADIAL_SEGMENTS
      );
      const spinningRingMaterial = new THREE.MeshBasicMaterial({
        color: COLORS_3D.LOADING_INDICATOR,
        transparent: true,
        opacity: MATERIAL_3D.SPINNING_RING_OPACITY,
      });
      const spinningRing = new THREE.Mesh(spinningRingGeometry, spinningRingMaterial);
      spinningRing.rotation.x = Math.PI / 2; // Start horizontal
      // Tag for animation loop to find and rotate
      spinningRing.userData.isSpinningRing = true;
      group.add(spinningRing);

      // Add a second partial ring for visual interest (loading arc effect)
      const arcGeometry = new THREE.TorusGeometry(
        baseSize * GEOMETRY_3D.TORUS_RADIUS_MULTIPLIER,
        baseSize * GEOMETRY_3D.ARC_TUBE_MULTIPLIER,
        GEOMETRY_3D.TORUS_TUBE_SEGMENTS,
        GEOMETRY_3D.ARC_RADIAL_SEGMENTS,
        GEOMETRY_3D.ARC_ANGLE
      );
      const arcMaterial = new THREE.MeshBasicMaterial({
        color: COLORS_3D.RING_ACCENT,
        transparent: true,
        opacity: MATERIAL_3D.ARC_OPACITY,
      });
      const arc = new THREE.Mesh(arcGeometry, arcMaterial);
      arc.rotation.x = Math.PI / 2;
      arc.userData.isSpinningRing = true;
      arc.userData.spinSpeed = ANIMATION_3D.SECONDARY_SPIN_MULTIPLIER;
      group.add(arc);
    }

    group.add(sphere);

    // Add label as sprite text (only if LOD allows labels)
    if (lodSettings.showLabel) {
      const sprite = new SpriteText(node.label);
      sprite.color = isHighlighted ? LABEL_3D.HIGHLIGHTED_COLOR : LABEL_3D.NORMAL_COLOR;
      sprite.textHeight = LABEL_3D.TEXT_HEIGHT;
      sprite.position.y = baseSize + LABEL_3D.VERTICAL_OFFSET;
      sprite.backgroundColor = isHighlighted ? LABEL_3D.HIGHLIGHTED_BACKGROUND : LABEL_3D.NORMAL_BACKGROUND;
      sprite.padding = LABEL_3D.PADDING;
      sprite.borderRadius = LABEL_3D.BORDER_RADIUS;
      group.add(sprite);
    }

    return group;
  }, [isNodeHighlighted, expandingNodeIds, communityAssignments, communityColors, getNodeStyle, lodManager]);

  // Link color based on highlighting
  const linkColor = useCallback((link: ForceGraphLink) => {
    const isHighlighted = isEdgeHighlighted(link.originalEdge);

    if (highlightedPath.length > 0 && isHighlighted) {
      return COLORS_3D.PATH_HIGHLIGHT;
    }

    const style = getLinkStyle
      ? getLinkStyle(link.originalEdge, isHighlighted)
      : getDefaultLinkStyle(link, isHighlighted, highlightedPath.length > 0);

    return isHighlighted
      ? (style.color ?? COLORS_3D.DEFAULT_LINK)
      : COLORS_3D.DIMMED_LINK;
  }, [isEdgeHighlighted, getLinkStyle, highlightedPath.length]);

  // Link width based on highlighting
  const linkWidth = useCallback((link: ForceGraphLink) => {
    const isHighlighted = isEdgeHighlighted(link.originalEdge);
    const style = getLinkStyle
      ? getLinkStyle(link.originalEdge, isHighlighted)
      : getDefaultLinkStyle(link, isHighlighted, highlightedPath.length > 0);

    return isHighlighted ? (style.width ?? 1.5) : 0.5;
  }, [isEdgeHighlighted, getLinkStyle, highlightedPath.length]);

  // Handle node click
  const handleNodeClick = useCallback((node: ForceGraphNode | null) => {
    if (node) {
      onNodeClick?.(node.originalNode);
    }
  }, [onNodeClick]);

  // Handle node right-click (context menu)
  const handleNodeRightClick = useCallback((node: ForceGraphNode | null, event: MouseEvent) => {
    if (node) {
      event.preventDefault();
      onNodeRightClick?.(node.originalNode, event);
    }
  }, [onNodeRightClick]);

  // Handle node hover
  const handleNodeHover = useCallback((node: ForceGraphNode | null) => {
    if (node) {
      onNodeHover?.(node.originalNode);
    } else {
      onNodeHover?.(null);
    }
  }, [onNodeHover]);

  // Handle background click
  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Keyboard navigation for accessibility (T045)
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!graphRef.current) return;

    const graph = graphRef.current;
    const cameraPosition = graph.cameraPosition();
    const panDistance = CAMERA_3D.KEYBOARD_PAN_DISTANCE;

    switch (event.key) {
      case 'ArrowUp':
        // Move camera forward (zoom in) or pan up with Shift
        if (event.shiftKey) {
          graph.cameraPosition({ y: cameraPosition.y + panDistance });
        } else {
          const newZ = cameraPosition.z - panDistance;
          graph.cameraPosition({ z: Math.max(newZ, CAMERA_3D.MIN_Z_POSITION) });
        }
        event.preventDefault();
        break;
      case 'ArrowDown':
        // Move camera backward (zoom out) or pan down with Shift
        if (event.shiftKey) {
          graph.cameraPosition({ y: cameraPosition.y - panDistance });
        } else {
          graph.cameraPosition({ z: cameraPosition.z + panDistance });
        }
        event.preventDefault();
        break;
      case 'ArrowLeft':
        // Pan camera left
        graph.cameraPosition({ x: cameraPosition.x - panDistance });
        event.preventDefault();
        break;
      case 'ArrowRight':
        // Pan camera right
        graph.cameraPosition({ x: cameraPosition.x + panDistance });
        event.preventDefault();
        break;
      case 'Home':
      case 'r':
      case 'R':
        // Reset camera to fit graph
        graph.zoomToFit(TIMING.ZOOM_TO_FIT_DURATION_MS, TIMING.ZOOM_TO_FIT_PADDING);
        event.preventDefault();
        break;
      case '+':
      case '=':
        // Zoom in
        graph.cameraPosition({ z: Math.max(cameraPosition.z - CAMERA_3D.ZOOM_STEP, CAMERA_3D.MIN_Z_POSITION) });
        event.preventDefault();
        break;
      case '-':
      case '_':
        // Zoom out
        graph.cameraPosition({ z: cameraPosition.z + CAMERA_3D.ZOOM_STEP });
        event.preventDefault();
        break;
      default:
        break;
    }
  }, []);

  // Pause/resume simulation
  useEffect(() => {
    if (graphRef.current) {
      if (enableSimulation) {
        graphRef.current.resumeAnimation();
      } else {
        graphRef.current.pauseAnimation();
      }
    }
  }, [enableSimulation]);

  // Fit graph to view on data change (or restore saved camera position)
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      // Small delay to let simulation settle
      setTimeout(() => {
        // If we have a saved camera state and persistence is enabled, restore it
        if (enableCameraPersistence && savedCameraState) {
          graphRef.current?.cameraPosition(
            savedCameraState.position,
            savedCameraState.lookAt,
            0 // Instant transition
          );
        } else {
          graphRef.current?.zoomToFit(TIMING.ZOOM_TO_FIT_DURATION_MS, TIMING.ZOOM_TO_FIT_PADDING);
        }
      }, TIMING.AUTO_FIT_DELAY_MS);
    }
  }, [graphData.nodes.length, enableCameraPersistence, savedCameraState]);

  // Track camera position changes for persistence and LOD
  useEffect(() => {
    if (!graphRef.current) return;

    const graph = graphRef.current;

    // Set up a render loop callback to track camera and performance
    const onFrame = () => {
      if (!graph.camera) return;

      const camera = graph.camera();
      if (camera) {
        const pos = camera.position;
        cameraPositionRef.current = { x: pos.x, y: pos.y, z: pos.z };

        // Save camera state for persistence
        if (enableCameraPersistence) {
          const controls = graph.controls?.();
          const lookAt = controls?.target
            ? { x: controls.target.x, y: controls.target.y, z: controls.target.z }
            : { x: 0, y: 0, z: 0 };

          updateCameraState({
            position: { x: pos.x, y: pos.y, z: pos.z },
            lookAt,
            zoom: pos.z,
          });
        }

        // Record frame time for LOD manager
        if (lodManager) {
          lodManager.recordFrameTime();
        }
      }

      // Performance monitoring frame callbacks
      if (showPerformanceOverlay || enableAdaptiveLOD) {
        frameEnd();
        frameStart();
        updateVisibleCounts(graphData.nodes.length, graphData.links.length);
      }

      // Rotate spinning rings for expanding nodes
      const scene = graph.scene?.();
      if (scene) {
        scene.traverse((object: THREE.Object3D) => {
          if (object.userData.isSpinningRing) {
            const spinSpeed = object.userData.spinSpeed ?? 1;
            object.rotation.z += ANIMATION_3D.SPIN_SPEED * spinSpeed; // Rotate around Z axis
          }
        });
      }
    };

    // Hook into the render loop via requestAnimationFrame
    let animationFrameId: number;
    const animate = () => {
      onFrame();
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    enableCameraPersistence,
    updateCameraState,
    showPerformanceOverlay,
    enableAdaptiveLOD,
    lodManager,
    frameStart,
    frameEnd,
    updateVisibleCounts,
    graphData.nodes.length,
    graphData.links.length,
  ]);

  if (!visible) {
    return null;
  }

  // Show fallback if WebGL unavailable
  if (!webglStatus.available) {
    return (
      <Box
        ref={containerRef}
        pos="relative"
        style={{
          width: width ?? '100%',
          height,
          border: `1px solid ${colorScheme === 'dark' ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
          backgroundColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
        }}
      >
        <WebGLUnavailable reason={webglStatus.reason ?? 'WebGL not available'} />
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      pos="relative"
      tabIndex={0}
      role="application"
      aria-label="3D Graph Visualization. Use arrow keys to pan, +/- to zoom, R to reset view."
      onKeyDown={handleKeyDown}
      style={{
        width: width ?? '100%',
        height,
        border: `1px solid ${colorScheme === 'dark' ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
        backgroundColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
        outline: 'none',
      }}
    >
      <LoadingOverlay visible={loading} />
      <ForceGraph3D
        ref={graphRef}
        width={width ?? containerWidth}
        height={height}
        graphData={graphData}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={LINK.DEFAULT_OPACITY}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
        cooldownTime={enableSimulation ? SIMULATION.COOLDOWN_TIME_MS : 0}
        d3AlphaDecay={SIMULATION.ALPHA_DECAY}
        d3VelocityDecay={SIMULATION.VELOCITY_DECAY}
        backgroundColor="rgba(0,0,0,0)"
        // Performance optimizations for large graphs
        warmupTicks={graphData.nodes.length > PERFORMANCE_3D.WARMUP_NODE_THRESHOLD ? PERFORMANCE_3D.LARGE_GRAPH_WARMUP_TICKS : PERFORMANCE_3D.SMALL_GRAPH_WARMUP_TICKS}
        cooldownTicks={graphData.nodes.length > PERFORMANCE_3D.COOLDOWN_NODE_THRESHOLD ? PERFORMANCE_3D.LARGE_GRAPH_COOLDOWN_TICKS : PERFORMANCE_3D.NORMAL_COOLDOWN_TICKS}
        numDimensions={3}
        // Reduce physics complexity for large graphs
        d3AlphaMin={graphData.nodes.length > PERFORMANCE_3D.COOLDOWN_NODE_THRESHOLD ? PERFORMANCE_3D.LARGE_GRAPH_ALPHA_MIN : PERFORMANCE_3D.NORMAL_ALPHA_MIN}
        // Use OrbitControls instead of TrackballControls for zoomToCursor support
        controlType="orbit"
      />

      {/* Performance Overlay */}
      {showPerformanceOverlay && performanceStats.isMonitoring && (
        <Box
          style={{
            position: 'absolute',
            top: OVERLAY_3D.POSITION_OFFSET,
            right: OVERLAY_3D.POSITION_OFFSET,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            borderRadius: 'var(--mantine-radius-sm)',
            padding: '8px 12px',
            color: '#fff',
            fontSize: 'var(--mantine-font-size-xs)',
            fontFamily: 'monospace',
            zIndex: 10,
            minWidth: OVERLAY_3D.MIN_WIDTH,
          }}
        >
          <Stack gap={4}>
            <Group gap={8} justify="space-between">
              <Group gap={4}>
                <IconActivity size={14} />
                <Text size="xs" fw={500}>Performance</Text>
              </Group>
              <Badge
                size="xs"
                color={
                  performanceStats.performanceLevel === 'good'
                    ? 'green'
                    : (performanceStats.performanceLevel === 'ok'
                      ? 'yellow'
                      : 'red')
                }
              >
                {performanceStats.performanceLevel.toUpperCase()}
              </Badge>
            </Group>
            <Group gap={8} justify="space-between">
              <Text size="xs" c="dimmed">FPS:</Text>
              <Text
                size="xs"
                fw={500}
                style={{ color: getPerformanceLevelColor(performanceStats.performanceLevel) }}
              >
                {performanceStats.fps}
              </Text>
            </Group>
            <Group gap={8} justify="space-between">
              <Text size="xs" c="dimmed">Frame:</Text>
              <Text size="xs">{performanceStats.avgFrameTime.toFixed(1)}ms</Text>
            </Group>
            <Group gap={8} justify="space-between">
              <Text size="xs" c="dimmed">Nodes:</Text>
              <Text size="xs">{performanceStats.visibleNodes}</Text>
            </Group>
            <Group gap={8} justify="space-between">
              <Text size="xs" c="dimmed">Edges:</Text>
              <Text size="xs">{performanceStats.visibleEdges}</Text>
            </Group>
            {performanceStats.jankScore > PERFORMANCE_3D.JANK_DISPLAY_THRESHOLD && (
              <Group gap={8} justify="space-between">
                <Text size="xs" c="dimmed">Jank:</Text>
                <Text size="xs" c="red">{performanceStats.jankScore}%</Text>
              </Group>
            )}
            {performanceStats.memoryMB !== null && (
              <Group gap={8} justify="space-between">
                <Text size="xs" c="dimmed">Memory:</Text>
                <Text size="xs">{performanceStats.memoryMB}MB</Text>
              </Group>
            )}
            {enableAdaptiveLOD && lodManager && (
              <Group gap={8} justify="space-between">
                <Text size="xs" c="dimmed">LOD:</Text>
                <Text size="xs">
                  {lodManager.getGlobalLOD() === LODLevel.HIGH
                    ? 'HIGH'
                    : (lodManager.getGlobalLOD() === LODLevel.MEDIUM
                      ? 'MED'
                      : 'LOW')}
                </Text>
              </Group>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

/**
 * Default node styling based on entity type and highlighting
 * @param node
 * @param isHighlighted
 * @param communityId
 * @param communityColors
 */
const getDefaultNodeStyle = (node: ForceGraphNode, isHighlighted: boolean, communityId?: number, communityColors?: Map<number, string>): NodeStyle => {
  let color = ENTITY_TYPE_COLORS[node.entityType] ?? COLORS_3D.DEFAULT_FALLBACK;

  // Use community color if available
  if (communityId !== undefined && communityColors?.has(communityId)) {
    color = communityColors.get(communityId) ?? color;
  }

  return {
    color,
    size: isHighlighted ? NODE.HIGHLIGHTED_SIZE : NODE.DEFAULT_SIZE,
    opacity: NODE.FULL_OPACITY,
  };
};

/**
 * Default link styling based on edge type and highlighting
 * @param link
 * @param isHighlighted
 * @param isPathHighlightMode
 */
const getDefaultLinkStyle = (link: ForceGraphLink, isHighlighted: boolean, isPathHighlightMode: boolean): LinkStyle => {
  const edge = link.originalEdge;
  const edgeStyle = getEdgeStyle(edge);

  // Path highlight mode overrides edge type colors
  if (isHighlighted && isPathHighlightMode) {
    return {
      color: COLORS_3D.PATH_HIGHLIGHT,
      width: LINK.HIGHLIGHTED_WIDTH,
      opacity: LINK.HIGHLIGHTED_OPACITY,
      dashed: false,
    };
  }

  return {
    color: edgeStyle.stroke ?? COLORS_3D.DEFAULT_LINK,
    width: edgeStyle.strokeWidth ?? LINK.DEFAULT_WIDTH,
    opacity: edgeStyle.strokeOpacity ?? LINK.DEFAULT_OPACITY,
    dashed: edgeStyle.strokeDasharray !== undefined,
  };
};
