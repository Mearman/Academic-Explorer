/**
 * Algorithms Page - Graph algorithms demonstration and analysis
 */

import type { GraphNode, GraphEdge, EntityType } from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import {
  ActionIcon,
  Container,
  Title,
  Text,
  Stack,
  Grid,
  Card,
  Group,
  Badge,
  Button,
  Paper,
  Box,
  Alert,
  SegmentedControl,
  Switch,
  NumberInput,
  Slider,
  RangeSlider,
  Divider,
  Tooltip,
} from '@mantine/core';
import {
  IconGraph,
  IconRefresh,
  IconInfoCircle,
  IconLock,
  IconLockOpen,
  IconFocusCentered,
  IconFocus2,
} from '@tabler/icons-react';
import { createLazyFileRoute } from '@tanstack/react-router';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { AlgorithmTabs, type CommunityResult } from '@/components/algorithms';
import { ForceGraph3DVisualization } from '@/components/graph/3d/ForceGraph3DVisualization';
import { ForceGraphVisualization, type DisplayMode } from '@/components/graph/ForceGraphVisualization';
import { ViewModeToggle } from '@/components/ui/ViewModeToggle';
import { useViewModePreference } from '@/hooks/useViewModePreference';
import { sprinkles } from '@/styles/sprinkles';

/**
 * Node with simulation coordinates (added by force layout)
 * Extends GraphNode with optional z for 3D mode
 */
interface SimulationNode extends GraphNode {
  z?: number;
}

/**
 * Minimal node type for filter functions (what the library actually passes)
 */
interface FilterNode {
  id?: string | number;
  x?: number;
  y?: number;
  z?: number;
}

/**
 * Graph methods from react-force-graph-2d/3d
 * The library's type definitions are incomplete, so we define the full interface
 */
interface GraphMethods {
  // Core methods (2D and 3D)
  zoomToFit(duration?: number, padding?: number, nodeFilter?: (node: FilterNode) => boolean): void;
  centerAt?(x: number, y: number, duration?: number): void;
  graphData?(): { nodes: SimulationNode[]; links: unknown[] };
  zoom?(scale?: number, duration?: number): number | void;

  // 2D-specific methods for viewport dimensions
  width?(): number;
  height?(): number;

  // 3D-specific methods
  cameraPosition?(
    position: { x: number; y: number; z: number },
    lookAt?: { x: number; y: number; z: number },
    duration?: number
  ): void;
  camera?(): {
    position: { x: number; y: number; z: number; set?(x: number, y: number, z: number): void };
    lookAt?(x: number, y: number, z: number): void;
    up?: { x: number; y: number; z: number; set?(x: number, y: number, z: number): void };
  } | undefined;
  controls?(): {
    target: { x: number; y: number; z: number; set?(x: number, y: number, z: number): void };
    update?(): void;
  } | undefined;
  // Renderer dimensions for aspect ratio calculation
  renderer?(): { domElement?: { clientWidth?: number; clientHeight?: number } } | undefined;
}

/**
 * Configuration for sample graph generation
 * Node counts are derived from totalNodeCountRange and percentage distribution
 */
interface SampleGraphConfig {
  /** Random seed for reproducible graphs (null = use Math.random) */
  seed: number | null;
  /** Number of disconnected graph components */
  componentCount: number;
  /** Range for edges per node [min, max] - each node gets a random value in range */
  edgesPerNodeRange: [number, number];
  /** Range for total node count [min, max] */
  totalNodeCountRange: [number, number];
  /** Percentage distribution for each entity type (should sum to 100) */
  entityPercentages: Record<EntityType, number>;
}

/** All entity types in display order (by weight descending) */
const ENTITY_TYPES_ORDERED: EntityType[] = [
  'works', 'authors', 'sources', 'institutions', 'concepts', 'keywords',
  'funders', 'publishers', 'topics', 'subfields', 'fields', 'domains',
];

/** Display names for entity types */
const ENTITY_DISPLAY_NAMES: Record<EntityType, string> = {
  works: 'Works',
  authors: 'Authors',
  sources: 'Sources',
  institutions: 'Institutions',
  concepts: 'Concepts',
  keywords: 'Keywords',
  funders: 'Funders',
  publishers: 'Publishers',
  topics: 'Topics',
  subfields: 'Subfields',
  fields: 'Fields',
  domains: 'Domains',
};

// Log scale constants for total nodes slider (5 to 10000)
const LOG_MIN = Math.log10(5);
const LOG_MAX = Math.log10(10000);

/**
 * Convert a linear slider position (0-100) to a log-scale node count
 */
function linearToLogNodes(linear: number): number {
  const logValue = LOG_MIN + (linear / 100) * (LOG_MAX - LOG_MIN);
  return Math.round(Math.pow(10, logValue));
}

/**
 * Convert a log-scale node count to a linear slider position (0-100)
 */
function logNodesToLinear(nodes: number): number {
  const clampedNodes = Math.max(5, Math.min(10000, nodes));
  const logValue = Math.log10(clampedNodes);
  return ((logValue - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
}

type BiasMode = 'position' | 'value';

/**
 * Generate a random node count range with bias towards lower values.
 *
 * @param bias - Power to apply (higher = more bias towards low values). 1 = no bias.
 * @param mode - Where to apply the bias:
 *   - 'position': Bias operates on slider position (0-100) before log transformation.
 *                 This clusters values towards the left of the slider.
 *                 With bias=2: 50% of values ≤ ~35 nodes, 71% ≤ ~158 nodes
 *   - 'value': Bias operates on the final node count (5-10000) directly.
 *              This scales proportionally with actual node count.
 *              With bias=2: 50% of values ≤ ~2500 nodes, 71% ≤ ~5000 nodes
 */
function randomLogNodeRange(bias: number, mode: BiasMode): [number, number] {
  // Default safe values in case of any calculation issues
  const DEFAULT_MIN = 5;
  const DEFAULT_MAX = 200;

  try {
    if (mode === 'position') {
      // Bias on slider position - clusters at left of slider (very low node counts)
      const a = Math.pow(Math.random(), bias) * 100;
      const b = Math.pow(Math.random(), bias) * 100;
      const [minPos, maxPos] = a <= b ? [a, b] : [b, a];
      const minVal = linearToLogNodes(minPos);
      const maxVal = linearToLogNodes(maxPos);
      // Validate results are finite and in valid range
      const safeMin = Number.isFinite(minVal) && minVal >= 5 && minVal <= 10000 ? minVal : DEFAULT_MIN;
      const safeMax = Number.isFinite(maxVal) && maxVal >= 5 && maxVal <= 10000 ? maxVal : DEFAULT_MAX;
      return [Math.min(safeMin, safeMax), Math.max(safeMin, safeMax)];
    } else {
      // Bias on node count value - scales with actual node count
      const minNodes = 5;
      const maxNodes = 10000;
      const biasedA = Math.pow(Math.random(), bias);
      const biasedB = Math.pow(Math.random(), bias);
      const nodeA = Math.round(minNodes + biasedA * (maxNodes - minNodes));
      const nodeB = Math.round(minNodes + biasedB * (maxNodes - minNodes));
      const safeA = Number.isFinite(nodeA) ? Math.max(5, Math.min(10000, nodeA)) : DEFAULT_MIN;
      const safeB = Number.isFinite(nodeB) ? Math.max(5, Math.min(10000, nodeB)) : DEFAULT_MAX;
      return safeA <= safeB ? [safeA, safeB] : [safeB, safeA];
    }
  } catch {
    // Fallback to safe defaults if any error occurs
    return [DEFAULT_MIN, DEFAULT_MAX];
  }
}

/**
 * Simple seeded pseudo-random number generator (Mulberry32)
 * Returns values in [0, 1) like Math.random()
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Distribute items into N buckets as evenly as possible
 */
function distributeToComponents<T>(items: T[], componentCount: number): T[][] {
  const components: T[][] = Array.from({ length: componentCount }, () => []);
  items.forEach((item, index) => {
    components[index % componentCount].push(item);
  });
  return components;
}

/**
 * Get a random integer within a range [min, max] inclusive
 */
function randomInRange(range: [number, number], random: () => number): number {
  const [min, max] = range;
  if (min === max) return min;
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Raw entity counts from OpenAlex API (2025-11-28)
 * Source: https://api.openalex.org/{entity}?select=id&per_page=1 → meta.count
 */
const OPENALEX_ENTITY_COUNTS: Record<EntityType, number> = {
  works: 271_584_856,
  authors: 115_794_830,
  sources: 276_184,
  institutions: 115_781,
  concepts: 65_026,
  keywords: 65_004,
  funders: 32_437,
  publishers: 10_420,
  topics: 4_516,
  subfields: 252,
  fields: 26,
  domains: 4,
};

/**
 * Entity metadata for sample graph generation
 */
const ENTITY_METADATA: Record<EntityType, { prefix: string; labelFn: (i: number) => string }> = {
  works: { prefix: 'W', labelFn: (i) => `Paper ${i + 1}` },
  authors: { prefix: 'A', labelFn: (i) => `Author ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}` },
  sources: { prefix: 'S', labelFn: (i) => `Journal ${i + 1}` },
  institutions: { prefix: 'I', labelFn: (i) => `University ${i + 1}` },
  concepts: { prefix: 'C', labelFn: (i) => `Concept ${i + 1}` },
  keywords: { prefix: 'K', labelFn: (i) => `Keyword ${i + 1}` },
  funders: { prefix: 'F', labelFn: (i) => `Funder ${i + 1}` },
  publishers: { prefix: 'P', labelFn: (i) => `Publisher ${i + 1}` },
  topics: { prefix: 'T', labelFn: (i) => `Topic ${i + 1}` },
  subfields: { prefix: 'SF', labelFn: (i) => `Subfield ${i + 1}` },
  fields: { prefix: 'FI', labelFn: (i) => `Field ${i + 1}` },
  domains: { prefix: 'D', labelFn: (i) => `Domain ${i + 1}` },
};

/**
 * Calculate log-scaled weights from raw counts
 * Compresses extreme range (works:domains = 68M:1) while preserving relative ordering
 * and ensuring all entity types appear in sample graphs.
 */
function calculateLogScaledWeights(counts: Record<EntityType, number>): Record<EntityType, number> {
  const minCount = Math.min(...Object.values(counts));
  const minLog = Math.log10(minCount);

  // Calculate raw log-scaled weights
  const rawWeights: Record<string, number> = {};
  for (const [entity, count] of Object.entries(counts)) {
    // Scale factor of 6 with 0.5 offset gives good distribution
    rawWeights[entity] = Math.max(0.5, (Math.log10(count) - minLog + 0.5) * 6);
  }

  // Normalize to sum to 100
  const totalWeight = Object.values(rawWeights).reduce((sum, w) => sum + w, 0);
  const normalized: Record<string, number> = {};
  for (const [entity, weight] of Object.entries(rawWeights)) {
    normalized[entity] = Math.round((weight / totalWeight) * 100);
  }

  // Adjust largest to ensure exact sum of 100
  const sum = Object.values(normalized).reduce((s, w) => s + w, 0);
  if (sum !== 100) {
    normalized.works += 100 - sum;
  }

  return normalized as Record<EntityType, number>;
}

// Pre-calculate weights at module load
const ENTITY_WEIGHTS = calculateLogScaledWeights(OPENALEX_ENTITY_COUNTS);

/** Default configuration using OpenAlex-derived entity weights */
const DEFAULT_CONFIG: SampleGraphConfig = {
  seed: 42,
  componentCount: 3,
  edgesPerNodeRange: [1, 4],
  totalNodeCountRange: [50, 200],
  entityPercentages: { ...ENTITY_WEIGHTS },
};

/**
 * Combined entity distribution for sample graphs
 */
const ENTITY_DISTRIBUTION: Record<EntityType, { weight: number; prefix: string; labelFn: (i: number) => string }> =
  Object.fromEntries(
    (Object.keys(ENTITY_METADATA) as EntityType[]).map((type) => [
      type,
      { weight: ENTITY_WEIGHTS[type], ...ENTITY_METADATA[type] },
    ])
  ) as Record<EntityType, { weight: number; prefix: string; labelFn: (i: number) => string }>;

/**
 * Relationship type definitions with source/target entity types
 */
const RELATIONSHIP_DEFINITIONS: Array<{
  type: RelationType;
  sourceTypes: EntityType[];
  targetTypes: EntityType[];
  probability: number; // Probability of creating this edge type (0-1)
}> = [
  { type: RelationType.AUTHORSHIP, sourceTypes: ['works'], targetTypes: ['authors'], probability: 0.8 },
  { type: RelationType.AFFILIATION, sourceTypes: ['authors'], targetTypes: ['institutions'], probability: 0.7 },
  { type: RelationType.PUBLICATION, sourceTypes: ['works'], targetTypes: ['sources'], probability: 0.6 },
  { type: RelationType.REFERENCE, sourceTypes: ['works'], targetTypes: ['works'], probability: 0.5 },
  { type: RelationType.TOPIC, sourceTypes: ['works'], targetTypes: ['topics'], probability: 0.6 },
  { type: RelationType.HOST_ORGANIZATION, sourceTypes: ['sources'], targetTypes: ['publishers'], probability: 0.7 },
  { type: RelationType.LINEAGE, sourceTypes: ['institutions'], targetTypes: ['institutions'], probability: 0.3 },
  { type: RelationType.FUNDED_BY, sourceTypes: ['works'], targetTypes: ['funders'], probability: 0.4 },
  { type: RelationType.AUTHOR_RESEARCHES, sourceTypes: ['authors'], targetTypes: ['topics'], probability: 0.5 },
  { type: RelationType.TOPIC_PART_OF_FIELD, sourceTypes: ['topics'], targetTypes: ['fields'], probability: 0.8 },
  { type: RelationType.TOPIC_PART_OF_SUBFIELD, sourceTypes: ['topics'], targetTypes: ['subfields'], probability: 0.6 },
  { type: RelationType.FIELD_PART_OF_DOMAIN, sourceTypes: ['fields'], targetTypes: ['domains'], probability: 0.9 },
  { type: RelationType.WORK_HAS_KEYWORD, sourceTypes: ['works'], targetTypes: ['keywords'], probability: 0.5 },
  { type: RelationType.CONCEPT, sourceTypes: ['works'], targetTypes: ['concepts'], probability: 0.4 },
  { type: RelationType.TOPIC_SIBLING, sourceTypes: ['topics'], targetTypes: ['topics'], probability: 0.3 },
];

/**
 * Generate sample academic graph data for demonstration
 * Includes all 12 entity types and all relationship types
 */
function generateSampleGraph(config: SampleGraphConfig = DEFAULT_CONFIG): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const {
    seed,
    componentCount,
    edgesPerNodeRange,
    totalNodeCountRange,
    entityPercentages,
  } = config;

  // Use seeded random if seed is provided, otherwise use Math.random
  const random = seed !== null ? createSeededRandom(seed) : Math.random;

  // Get total node count from range
  const totalNodes = randomInRange(totalNodeCountRange, random);

  // Calculate node counts per entity type, ensuring at least 1 of each type for small graphs
  const nodesByType = new Map<EntityType, string[]>();
  const allEntityTypes = Object.keys(ENTITY_DISTRIBUTION) as EntityType[];

  // Use entity percentages directly from config
  const adjustedWeights = { ...ENTITY_DISTRIBUTION };
  allEntityTypes.forEach((type) => {
    adjustedWeights[type] = { ...adjustedWeights[type], weight: entityPercentages[type] };
  });

  const adjustedTotalWeight = Object.values(adjustedWeights).reduce((sum, e) => sum + e.weight, 0);

  // Track all generated node IDs to ensure uniqueness
  const allGeneratedIds = new Set<string>();

  allEntityTypes.forEach((type) => {
    const weight = adjustedWeights[type].weight;
    // Guard against division by zero or NaN - default to at least 1 node per type
    const rawCount = adjustedTotalWeight > 0
      ? Math.round((totalNodes * weight) / adjustedTotalWeight)
      : 0;
    const count = Math.max(1, Number.isFinite(rawCount) ? rawCount : 1);
    const prefix = ENTITY_DISTRIBUTION[type].prefix;
    const ids: string[] = [];
    let idCounter = 1;
    // Generate unique IDs, incrementing counter until we have enough unique ones
    while (ids.length < count) {
      const candidateId = `${prefix}${idCounter}`;
      if (!allGeneratedIds.has(candidateId)) {
        ids.push(candidateId);
        allGeneratedIds.add(candidateId);
      }
      idCounter++;
      // Safety limit to prevent infinite loop
      if (idCounter > count * 2 + 100) break;
    }
    nodesByType.set(type, ids);
  });

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeCounts = new Map<string, number>();
  const nodeEdgeTargets = new Map<string, number>();

  const getEdgeCount = (nodeId: string) => edgeCounts.get(nodeId) || 0;
  const incrementEdgeCount = (nodeId: string) => edgeCounts.set(nodeId, getEdgeCount(nodeId) + 1);
  const getNodeEdgeTarget = (nodeId: string) => nodeEdgeTargets.get(nodeId) || edgesPerNodeRange[1];
  const canAddEdge = (nodeId: string) => getEdgeCount(nodeId) < getNodeEdgeTarget(nodeId);

  const initNodeEdgeTarget = (nodeId: string) => {
    const target = randomInRange(edgesPerNodeRange, random);
    nodeEdgeTargets.set(nodeId, target);
  };

  // Distribute nodes across components
  const nodesByTypeAndComponent = new Map<EntityType, string[][]>();
  allEntityTypes.forEach((type) => {
    const ids = nodesByType.get(type) || [];
    nodesByTypeAndComponent.set(type, distributeToComponents(ids, componentCount));
  });

  // Calculate component positioning for visual separation
  const componentOffsets = Array.from({ length: componentCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / componentCount;
    const radius = componentCount > 1 ? 300 : 0;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

  // Add all nodes with component-based positioning
  allEntityTypes.forEach((type) => {
    const ids = nodesByType.get(type) || [];
    const { labelFn } = ENTITY_DISTRIBUTION[type];

    ids.forEach((id, index) => {
      const componentIndex = index % componentCount;
      const offset = componentOffsets[componentIndex];
      nodes.push({
        id,
        entityType: type,
        label: labelFn(index),
        entityId: id,
        x: offset.x + (random() * 200 - 100),
        y: offset.y + (random() * 150 - 75),
        externalIds: [],
      });
      edgeCounts.set(id, 0);
      initNodeEdgeTarget(id);
    });
  });

  let edgeId = 1;
  const existingEdges = new Set<string>();

  const tryAddEdge = (source: string, target: string, type: RelationType): boolean => {
    const edgeKey = `${source}-${target}`;
    const reverseKey = `${target}-${source}`;
    if (existingEdges.has(edgeKey) || existingEdges.has(reverseKey)) return false;
    if (!canAddEdge(source) || !canAddEdge(target)) return false;
    if (source === target) return false;

    edges.push({ id: `E${edgeId++}`, source, target, type, direction: 'outbound' });
    existingEdges.add(edgeKey);
    incrementEdgeCount(source);
    incrementEdgeCount(target);
    return true;
  };

  // Create edges for each relationship type within each component
  for (let c = 0; c < componentCount; c++) {
    RELATIONSHIP_DEFINITIONS.forEach(({ type, sourceTypes, targetTypes, probability }) => {
      sourceTypes.forEach((sourceType) => {
        const sourceNodes = nodesByTypeAndComponent.get(sourceType)?.[c] || [];

        targetTypes.forEach((targetType) => {
          const targetNodes = nodesByTypeAndComponent.get(targetType)?.[c] || [];
          if (targetNodes.length === 0) return;

          sourceNodes.forEach((sourceId) => {
            // Skip based on probability
            if (random() > probability) return;

            // Determine number of edges to create
            const numEdges = Math.min(
              randomInRange([1, Math.max(1, edgesPerNodeRange[1])], random),
              targetNodes.length
            );

            // Shuffle targets and try to add edges
            const shuffledTargets = [...targetNodes].sort(() => random() - 0.5);
            for (let i = 0; i < numEdges && i < shuffledTargets.length; i++) {
              tryAddEdge(sourceId, shuffledTargets[i], type);
            }
          });
        });
      });
    });
  }

  // Second pass: ensure minimum edges (best effort within component)
  const minEdgesTarget = edgesPerNodeRange[0];
  for (let c = 0; c < componentCount; c++) {
    const compNodes: string[] = [];
    allEntityTypes.forEach((type) => {
      const typeNodes = nodesByTypeAndComponent.get(type)?.[c] || [];
      compNodes.push(...typeNodes);
    });

    compNodes.forEach((nodeId) => {
      let attempts = 0;
      while (getEdgeCount(nodeId) < minEdgesTarget && attempts < 20) {
        const otherNodes = compNodes.filter(n => n !== nodeId && canAddEdge(n));
        if (otherNodes.length === 0) break;
        const target = otherNodes[Math.floor(random() * otherNodes.length)];
        tryAddEdge(nodeId, target, RelationType.RELATED_TO);
        attempts++;
      }
    });
  }

  return { nodes, edges };
}

/**
 * Algorithms demonstration page
 */
function AlgorithmsPage() {
  // Sample graph configuration
  const [graphConfig, setGraphConfig] = useState<SampleGraphConfig>(DEFAULT_CONFIG);

  // Lock preferences - when locked, randomize preserves the value
  const [seedLocked, setSeedLocked] = useState(true);
  const [componentsLocked, setComponentsLocked] = useState(false);
  const [edgesLocked, setEdgesLocked] = useState(false);
  const [totalNodesLocked, setTotalNodesLocked] = useState(true);
  const [percentagesLocked, setPercentagesLocked] = useState(true);

  // Individual entity type locks - controls which types participate in redistribution
  const [lockedEntityTypes, setLockedEntityTypes] = useState<Set<EntityType>>(new Set());

  // Sample graph state
  const [graphData, setGraphData] = useState(() => generateSampleGraph(graphConfig));
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);

  // Display mode: highlight dims non-selected nodes, filter hides them
  const [displayMode, setDisplayMode] = useState<DisplayMode>('highlight');

  // Community assignments from algorithm results
  const [communityAssignments, setCommunityAssignments] = useState<Map<string, number>>(new Map());
  const [communityColors, setCommunityColors] = useState<Map<number, string>>(new Map());

  // Enable/disable force simulation
  const [enableSimulation, setEnableSimulation] = useState(true);

  // View mode: 2D or 3D visualization (persisted to localStorage)
  const { viewMode, setViewMode } = useViewModePreference('2D');

  // Graph methods ref for external control (zoomToFit, etc.)
  const graphMethodsRef = useRef<GraphMethods | null>(null);

  // Handler for when graph methods become available
  const handleGraphReady = useCallback(
    (methods: GraphMethods) => {
      graphMethodsRef.current = methods;
    },
    []
  );

  // Fit all nodes to view with proper centering
  const fitToViewAll = useCallback(() => {
    const graph = graphMethodsRef.current;
    if (!graph?.zoomToFit) return;

    // Get actual node positions from the graph
    const graphNodes = graph.graphData?.()?.nodes ?? [];

    if (viewMode === '2D') {
      // For 2D: calculate bounding box center, then use centerAt and zoomToFit
      if (graph.centerAt && graphNodes.length > 0) {
        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        graphNodes.forEach((n) => {
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Center on the bounding box center, then fit
        graph.centerAt(centerX, centerY, 200);
        setTimeout(() => {
          graph.zoomToFit(300, 100);
        }, 250);
      } else {
        graph.zoomToFit(300, 100);
      }
    } else {
      // 3D mode: use manual camera positioning since zoomToFit is unreliable
      if (graph.cameraPosition && graphNodes.length > 0) {
        // Calculate bounding box of all nodes
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        graphNodes.forEach((n) => {
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          const z = n.z ?? 0;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        });

        // Calculate center and dimensions
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const width = maxX - minX;
        const height = maxY - minY;
        const depth = maxZ - minZ;

        // Use the largest dimension for camera distance calculation
        // Account for FOV (~75 degrees) - distance = size / (2 * tan(FOV/2))
        const maxDimension = Math.max(width, height, depth, 100);
        const fovFactor = 1.5; // Approximates 1 / tan(37.5°) with padding
        const cameraDistance = maxDimension * fovFactor + 100;

        // Directly set camera position and controls target
        const camera = graph.camera?.();
        const controls = graph.controls?.();

        if (camera && controls) {
          // Set the controls target (orbit center) to the bounding box center
          if (controls.target?.set) {
            controls.target.set(centerX, centerY, centerZ);
          } else if (controls.target) {
            controls.target.x = centerX;
            controls.target.y = centerY;
            controls.target.z = centerZ;
          }
          // Position camera along z-axis from center
          if (camera.position?.set) {
            camera.position.set(centerX, centerY, centerZ + cameraDistance);
          }
          // Make camera look at the target
          if (camera.lookAt) {
            camera.lookAt(centerX, centerY, centerZ);
          }
          // Update controls
          if (controls.update) {
            controls.update();
          }
        } else {
          // Fallback to cameraPosition method with lookAt
          graph.cameraPosition(
            { x: centerX, y: centerY, z: centerZ + cameraDistance },
            { x: centerX, y: centerY, z: centerZ },
            0 // instant
          );
        }
      } else {
        // Fallback to zoomToFit
        graph.zoomToFit(400, 50);
      }
    }
  }, [viewMode]);

  // Fit selected nodes to view (or all if none selected)
  const fitToViewSelected = useCallback(() => {
    const graph = graphMethodsRef.current;
    if (!graph?.zoomToFit) return;

    if (highlightedNodes.size === 0) {
      // No selection - use fit all behavior
      fitToViewAll();
      return;
    }

    if (viewMode === '2D') {
      // 2D mode: use zoomToFit with filter
      graph.zoomToFit(
        400,
        50,
        (node: FilterNode) => {
          if (node.id == null) return false;
          const nodeIdStr = String(node.id);
          return highlightedNodes.has(nodeIdStr);
        }
      );
    } else {
      // 3D mode: use zoomToFit to get node positions, then manually position camera
      // First, collect node positions via the filter callback
      const matchedPositions: Array<{ x: number; y: number; z: number }> = [];

      // Call zoomToFit just to trigger the filter and collect positions
      graph.zoomToFit(
        0, // instant (we'll override anyway)
        0,
        (node: FilterNode) => {
          if (node.id == null) return false;
          const nodeIdStr = String(node.id);
          const matches = highlightedNodes.has(nodeIdStr);
          if (matches) {
            matchedPositions.push({
              x: node.x ?? 0,
              y: node.y ?? 0,
              z: node.z ?? 0,
            });
          }
          return matches;
        }
      );

      if (matchedPositions.length === 0) {
        console.log('[fitToViewSelected] No matched positions, falling back to fitToViewAll');
        fitToViewAll();
        return;
      }

      // Calculate bounding box
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      matchedPositions.forEach((pos) => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        minZ = Math.min(minZ, pos.z);
        maxZ = Math.max(maxZ, pos.z);
      });

      // Calculate centroid
      const n = matchedPositions.length;
      let centerX = 0, centerY = 0, centerZ = 0;
      matchedPositions.forEach((pos) => {
        centerX += pos.x;
        centerY += pos.y;
        centerZ += pos.z;
      });
      centerX /= n;
      centerY /= n;
      centerZ /= n;

      // Calculate dimensions for distance
      const width = maxX - minX;
      const height = maxY - minY;
      const depth = maxZ - minZ;
      const maxDimension = Math.max(width, height, depth, 50);
      const cameraDistance = maxDimension * 1.5 + 100;

      // Find optimal viewing direction using PCA
      // Compute covariance matrix
      let cxx = 0, cxy = 0, cxz = 0, cyy = 0, cyz = 0, czz = 0;
      matchedPositions.forEach((pos) => {
        const dx = pos.x - centerX;
        const dy = pos.y - centerY;
        const dz = pos.z - centerZ;
        cxx += dx * dx;
        cxy += dx * dy;
        cxz += dx * dz;
        cyy += dy * dy;
        cyz += dy * dz;
        czz += dz * dz;
      });
      cxx /= n; cxy /= n; cxz /= n; cyy /= n; cyz /= n; czz /= n;

      // Find the eigenvector with smallest eigenvalue using power iteration
      // This gives us the direction of least variance (the "thin" axis)
      // We want to view from this direction to see the largest cross-section
      let viewDir = { x: 0, y: 0, z: 1 }; // Default to z-axis

      // Store eigenvectors for up-vector calculation
      let v1 = { x: 1, y: 0, z: 0 }; // Largest eigenvector (most spread)
      let v2 = { x: 0, y: 1, z: 0 }; // Second largest eigenvector

      if (n >= 3) {
        // Use power iteration to find the two largest eigenvectors of the covariance matrix
        // The cross product gives us the direction of least variance (smallest eigenvector)
        // This is the optimal viewing direction to see the largest cross-sectional area

        // Power iteration for largest eigenvector (direction of most spread)
        let vx = 1, vy = 0.5, vz = 0.3;
        for (let iter = 0; iter < 20; iter++) {
          const newX = cxx * vx + cxy * vy + cxz * vz;
          const newY = cxy * vx + cyy * vy + cyz * vz;
          const newZ = cxz * vx + cyz * vy + czz * vz;
          const mag = Math.sqrt(newX * newX + newY * newY + newZ * newZ);
          if (mag > 0.0001) {
            vx = newX / mag;
            vy = newY / mag;
            vz = newZ / mag;
          }
        }
        v1 = { x: vx, y: vy, z: vz };

        // vx, vy, vz is now the direction of maximum variance
        // For a second eigenvector, we deflate and iterate again
        let ux = 0.3, uy = 1, uz = 0.5;
        // Make orthogonal to first
        const dot1 = ux * vx + uy * vy + uz * vz;
        ux -= dot1 * vx;
        uy -= dot1 * vy;
        uz -= dot1 * vz;
        let mag = Math.sqrt(ux * ux + uy * uy + uz * uz);
        if (mag > 0.0001) {
          ux /= mag; uy /= mag; uz /= mag;
        }

        for (let iter = 0; iter < 20; iter++) {
          let newX = cxx * ux + cxy * uy + cxz * uz;
          let newY = cxy * ux + cyy * uy + cyz * uz;
          let newZ = cxz * ux + cyz * uy + czz * uz;
          // Project out first eigenvector
          const dot = newX * vx + newY * vy + newZ * vz;
          newX -= dot * vx;
          newY -= dot * vy;
          newZ -= dot * vz;
          mag = Math.sqrt(newX * newX + newY * newY + newZ * newZ);
          if (mag > 0.0001) {
            ux = newX / mag;
            uy = newY / mag;
            uz = newZ / mag;
          }
        }
        v2 = { x: ux, y: uy, z: uz };

        // The third eigenvector (smallest variance) is the cross product of the first two
        viewDir = {
          x: vy * uz - vz * uy,
          y: vz * ux - vx * uz,
          z: vx * uy - vy * ux,
        };

        // Normalize
        mag = Math.sqrt(viewDir.x ** 2 + viewDir.y ** 2 + viewDir.z ** 2);
        if (mag > 0.0001) {
          viewDir.x /= mag;
          viewDir.y /= mag;
          viewDir.z /= mag;
        }

        // Prefer camera to be "above" (positive y component) for intuitive viewing
        if (viewDir.y < 0) {
          viewDir.x = -viewDir.x;
          viewDir.y = -viewDir.y;
          viewDir.z = -viewDir.z;
        }
      }

      // Get viewport aspect ratio to orient the view optimally
      // For landscape: largest spread should be horizontal
      // For portrait: largest spread should be vertical
      let aspectRatio = 16 / 9; // Default landscape
      const renderer = graph.renderer?.();
      if (renderer?.domElement) {
        const w = renderer.domElement.clientWidth ?? 0;
        const h = renderer.domElement.clientHeight ?? 0;
        if (w > 0 && h > 0) {
          aspectRatio = w / h;
        }
      }

      // Determine the camera's "up" vector based on aspect ratio
      // Landscape (aspectRatio > 1): v2 should be up (so v1/largest spread is horizontal)
      // Portrait (aspectRatio < 1): v1 should be up (so v1/largest spread is vertical)
      const upVector = aspectRatio >= 1 ? v2 : v1;

      console.log('[fitToViewSelected] 3D centroid:', { centerX, centerY, centerZ });
      console.log('[fitToViewSelected] 3D viewDir:', viewDir);
      console.log('[fitToViewSelected] 3D aspectRatio:', aspectRatio);
      console.log('[fitToViewSelected] 3D upVector:', upVector);
      console.log('[fitToViewSelected] 3D cameraDistance:', cameraDistance);

      // Position camera along the optimal viewing direction
      const camX = centerX + viewDir.x * cameraDistance;
      const camY = centerY + viewDir.y * cameraDistance;
      const camZ = centerZ + viewDir.z * cameraDistance;

      // Use cameraPosition for smooth animation
      if (graph.cameraPosition) {
        graph.cameraPosition(
          { x: camX, y: camY, z: camZ },
          { x: centerX, y: centerY, z: centerZ },
          400
        );

        // Set the camera's up vector to align spread with viewport
        const camera = graph.camera?.();
        if (camera?.up?.set) {
          camera.up.set(upVector.x, upVector.y, upVector.z);
        } else if (camera?.up) {
          camera.up.x = upVector.x;
          camera.up.y = upVector.y;
          camera.up.z = upVector.z;
        }

        // Update controls to apply the new up vector
        const controls = graph.controls?.();
        if (controls?.update) {
          controls.update();
        }

        console.log('[fitToViewSelected] Called cameraPosition with up vector');
      }
    }
  }, [highlightedNodes, viewMode, fitToViewAll]);

  // Shortest path node selections (synced with panel and node clicks)
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);

  // Auto-regenerate graph when configuration changes
  useEffect(() => {
    setGraphData(generateSampleGraph(graphConfig));
    setHighlightedNodes(new Set());
    setHighlightedPath([]);
    setCommunityAssignments(new Map());
    setCommunityColors(new Map());
    setPathSource(null);
    setPathTarget(null);
  }, [graphConfig]);

  // Config update helper
  const updateConfig = useCallback(<K extends keyof SampleGraphConfig>(
    key: K,
    value: SampleGraphConfig[K]
  ) => {
    setGraphConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Toggle individual entity type lock
  const toggleEntityLock = useCallback((entityType: EntityType) => {
    setLockedEntityTypes(prev => {
      const next = new Set(prev);
      if (next.has(entityType)) {
        next.delete(entityType);
      } else {
        next.add(entityType);
      }
      return next;
    });
  }, []);

  // Update a percentage slider while proportionally adjusting others to maintain 100% total
  // Only unlocked types participate in redistribution
  const updatePercentage = useCallback((
    changedType: EntityType,
    newValue: number
  ) => {
    setGraphConfig((prev) => {
      // Only redistribute among UNLOCKED types (excluding the changed type)
      const otherTypes = ENTITY_TYPES_ORDERED.filter(
        t => t !== changedType && !lockedEntityTypes.has(t)
      );

      const oldValue = prev.entityPercentages[changedType];
      const delta = newValue - oldValue;

      // Calculate sum of other (unlocked) percentages
      const otherSum = otherTypes.reduce((sum, t) => sum + prev.entityPercentages[t], 0);

      // If no unlocked types to adjust, constrain the change
      if (otherSum === 0 && delta > 0) {
        return prev; // Can't increase if unlocked others are all 0
      }

      // Clamp new value to valid range
      const clampedValue = Math.max(0, Math.min(100, newValue));
      const actualDelta = clampedValue - oldValue;

      // Build new percentages object
      const newPercentages = { ...prev.entityPercentages, [changedType]: clampedValue };

      if (actualDelta !== 0 && otherSum > 0) {
        let remaining = -actualDelta;
        otherTypes.forEach((type, index) => {
          if (index === otherTypes.length - 1) {
            // Last one takes whatever's remaining to ensure exact 100%
            newPercentages[type] = Math.max(0, Math.min(100, prev.entityPercentages[type] + remaining));
          } else {
            const proportion = prev.entityPercentages[type] / otherSum;
            const adjustment = Math.round(-actualDelta * proportion);
            newPercentages[type] = Math.max(0, Math.min(100, prev.entityPercentages[type] + adjustment));
            remaining -= adjustment;
          }
        });
      } else if (actualDelta !== 0 && otherSum === 0 && otherTypes.length > 0) {
        // Edge case: unlocked others are 0, can only decrease this one
        // Split the freed percentage evenly among unlocked others
        const splitAmount = Math.floor(-actualDelta / otherTypes.length);
        const extraAmount = -actualDelta - splitAmount * otherTypes.length;
        otherTypes.forEach((type, index) => {
          newPercentages[type] = splitAmount + (index === 0 ? extraAmount : 0);
        });
      }

      return { ...prev, entityPercentages: newPercentages };
    });
  }, [lockedEntityTypes]);

  // Randomize unlocked slider values
  const handleRandomize = useCallback(() => {
    // Helper to generate a random range [min, max] within bounds
    const randomRange = (minBound: number, maxBound: number): [number, number] => {
      const a = Math.floor(Math.random() * (maxBound - minBound + 1)) + minBound;
      const b = Math.floor(Math.random() * (maxBound - minBound + 1)) + minBound;
      return a <= b ? [a, b] : [b, a];
    };

    // Generate random percentages for all 12 entity types that sum to 100
    const randomEntityPercentages = (): Record<EntityType, number> => {
      const n = ENTITY_TYPES_ORDERED.length;
      // Generate n-1 cut points, sort them, then derive n segments
      const cuts = Array.from({ length: n - 1 }, () => Math.floor(Math.random() * 101));
      const sorted = [0, ...cuts, 100].sort((a, b) => a - b);
      const percentages: Partial<Record<EntityType, number>> = {};
      let totalAssigned = 0;
      ENTITY_TYPES_ORDERED.forEach((type, i) => {
        const value = sorted[i + 1] - sorted[i];
        // Ensure each percentage is a valid non-negative finite number
        const safeValue = Number.isFinite(value) && value >= 0 ? value : 0;
        percentages[type] = safeValue;
        totalAssigned += safeValue;
      });
      // Safety check: if total doesn't equal 100, adjust the largest category
      if (totalAssigned !== 100 && totalAssigned > 0) {
        const adjustment = 100 - totalAssigned;
        // Find the type with highest percentage and adjust it
        const maxType = ENTITY_TYPES_ORDERED.reduce((max, type) =>
          (percentages[type] || 0) > (percentages[max] || 0) ? type : max
        );
        percentages[maxType] = Math.max(0, (percentages[maxType] || 0) + adjustment);
      } else if (totalAssigned === 0) {
        // Fallback: give 100% to works if all are 0
        percentages['works'] = 100;
      }
      return percentages as Record<EntityType, number>;
    };

    // Node count bias settings
    const nodeBias = 2;
    const nodeBiasMode: BiasMode = 'position'; // 'position' or 'value'

    setGraphConfig((prev) => ({
      ...prev,
      seed: seedLocked ? prev.seed : Math.floor(Math.random() * 10000),
      componentCount: componentsLocked ? prev.componentCount : Math.floor(Math.random() * 6) + 1,
      edgesPerNodeRange: edgesLocked ? prev.edgesPerNodeRange : randomRange(0, 10),
      totalNodeCountRange: totalNodesLocked ? prev.totalNodeCountRange : randomLogNodeRange(nodeBias, nodeBiasMode),
      entityPercentages: percentagesLocked ? prev.entityPercentages : randomEntityPercentages(),
    }));
  }, [seedLocked, componentsLocked, edgesLocked, totalNodesLocked, percentagesLocked]);

  // Regenerate sample data with current config
  const handleRegenerateGraph = useCallback(() => {
    let configToUse = graphConfig;

    // When seed is unlocked, generate a new random seed on each regeneration
    if (!seedLocked) {
      const newSeed = Math.floor(Math.random() * 10000);
      configToUse = { ...graphConfig, seed: newSeed };
      setGraphConfig(configToUse);
    }

    setGraphData(generateSampleGraph(configToUse));
    setHighlightedNodes(new Set());
    setHighlightedPath([]);
    setCommunityAssignments(new Map());
    setCommunityColors(new Map());
    setPathSource(null);
    setPathTarget(null);
  }, [graphConfig, seedLocked]);

  // Handle node highlighting from algorithm results
  const handleHighlightNodes = useCallback((nodeIds: string[]) => {
    setHighlightedNodes(new Set(nodeIds));
    setHighlightedPath([]);
  }, []);

  // Handle path highlighting
  const handleHighlightPath = useCallback((path: string[]) => {
    setHighlightedPath(path);
    setHighlightedNodes(new Set(path));
  }, []);

  // Handle community selection - updates both highlighting and community coloring
  const handleSelectCommunity = useCallback((communityId: number, nodeIds: string[]) => {
    setHighlightedNodes(new Set(nodeIds));
    setHighlightedPath([]);
  }, []);

  // Handle node click in the visualization
  // Clicking nodes sets them as source/target for shortest path
  const handleNodeClick = useCallback((node: GraphNode) => {
    // Update path source/target selection
    if (pathSource === node.id) {
      // Clicking source again clears it
      setPathSource(null);
      setHighlightedNodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(node.id);
        return newSet;
      });
    } else if (pathTarget === node.id) {
      // Clicking target again clears it
      setPathTarget(null);
      setHighlightedNodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(node.id);
        return newSet;
      });
    } else if (pathSource === null) {
      // No source set - this becomes the source
      setPathSource(node.id);
      setHighlightedNodes(new Set([node.id]));
      setHighlightedPath([]);
    } else if (pathTarget === null) {
      // Source set but no target - this becomes the target
      setPathTarget(node.id);
      setHighlightedNodes(new Set([pathSource, node.id]));
      setHighlightedPath([]);
    } else {
      // Both set - start over with this as new source
      setPathSource(node.id);
      setPathTarget(null);
      setHighlightedNodes(new Set([node.id]));
      setHighlightedPath([]);
    }
  }, [pathSource, pathTarget]);

  // Clear all highlights when clicking background
  const handleBackgroundClick = useCallback(() => {
    setHighlightedNodes(new Set());
    setHighlightedPath([]);
    setPathSource(null);
    setPathTarget(null);
  }, []);

  // Handle community detection results - update node coloring
  const handleCommunitiesDetected = useCallback((communities: CommunityResult[], colors: Map<number, string>) => {
    // Build node -> community assignment map
    const assignments = new Map<string, number>();
    communities.forEach((community) => {
      community.nodeIds.forEach((nodeId) => {
        assignments.set(nodeId, community.id);
      });
    });
    setCommunityAssignments(assignments);
    setCommunityColors(colors);
  }, []);

  // Calculate node type counts
  const nodeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    graphData.nodes.forEach((node) => {
      counts[node.entityType] = (counts[node.entityType] || 0) + 1;
    });
    return counts;
  }, [graphData.nodes]);

  // Calculate edge type counts
  const edgeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    graphData.edges.forEach((edge) => {
      counts[edge.type] = (counts[edge.type] || 0) + 1;
    });
    return counts;
  }, [graphData.edges]);

  return (
    <Container size="xl" py="md">
        <Stack gap="lg">
          {/* Page Header */}
          <Group justify="space-between" align="flex-start">
            <Box>
              <Title order={2}>
                <Group gap="xs">
                  <IconGraph size={28} />
                  Graph Algorithms
                </Group>
              </Title>
              <Text c="dimmed" mt="xs">
                Analyze graph structure using community detection, pathfinding, and more.
              </Text>
            </Box>
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={handleRegenerateGraph}
            >
              Regenerate Sample Data
            </Button>
          </Group>

          {/* Info Alert */}
          <Alert icon={<IconInfoCircle size={16} />} title="Demo Mode" color="blue">
            This page demonstrates the graph algorithms package with sample academic data.
            Click "Regenerate Sample Data" to create a new random graph.
            The algorithms can analyze community structure, find paths, and detect graph properties.
          </Alert>

          {/* Graph Visualization */}
          <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="md">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <Title order={5}>Graph Visualization</Title>
                <ViewModeToggle
                  value={viewMode}
                  onChange={setViewMode}
                  size="xs"
                />
              </Group>
              <Group gap="md">
                <Group gap="xs">
                  <Tooltip label="Fit all nodes to view">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={fitToViewAll}
                      aria-label="Fit all to view"
                    >
                      <IconFocusCentered size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={highlightedNodes.size > 0 ? "Fit selected nodes to view" : "Fit all to view (no selection)"}>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={fitToViewSelected}
                      aria-label="Fit selected to view"
                      disabled={highlightedNodes.size === 0}
                    >
                      <IconFocus2 size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Switch
                  label="Simulation"
                  checked={enableSimulation}
                  onChange={(e) => setEnableSimulation(e.currentTarget.checked)}
                  size="sm"
                />
                <SegmentedControl
                  size="xs"
                  value={displayMode}
                  onChange={(value) => setDisplayMode(value as DisplayMode)}
                  data={[
                    { label: 'Highlight', value: 'highlight' },
                    { label: 'Filter', value: 'filter' },
                  ]}
                />
              </Group>
            </Group>
            {viewMode === '2D' ? (
              <ForceGraphVisualization
                nodes={graphData.nodes}
                edges={graphData.edges}
                height={450}
                displayMode={displayMode}
                highlightedNodeIds={highlightedNodes}
                highlightedPath={highlightedPath}
                communityAssignments={communityAssignments}
                communityColors={communityColors}
                enableSimulation={enableSimulation}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                onGraphReady={handleGraphReady}
              />
            ) : (
              <ForceGraph3DVisualization
                nodes={graphData.nodes}
                edges={graphData.edges}
                height={450}
                displayMode={displayMode}
                highlightedNodeIds={highlightedNodes}
                highlightedPath={highlightedPath}
                communityAssignments={communityAssignments}
                communityColors={communityColors}
                enableSimulation={enableSimulation}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                onGraphReady={handleGraphReady}
              />
            )}
            {highlightedNodes.size > 0 && (
              <Group mt="sm" gap="xs">
                <Text size="sm" c="dimmed">
                  {highlightedNodes.size} nodes selected
                </Text>
                {highlightedPath.length > 0 && (
                  <Text size="sm" c="blue">
                    Path: {highlightedPath.join(' → ')}
                  </Text>
                )}
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setHighlightedNodes(new Set());
                    setHighlightedPath([]);
                  }}
                >
                  Clear
                </Button>
              </Group>
            )}
          </Card>

          {/* Main Content Grid */}
          <Grid>
            {/* Left: Graph Data Summary + Configuration */}
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Stack gap="md">
                {/* Configuration Card */}
                <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="md">
                  <Title order={5} mb="sm">Graph Configuration</Title>

                  <Stack gap="sm">
                    {/* Seed */}
                    <Group gap="xs" align="flex-end">
                      <NumberInput
                        label="Seed"
                        description={seedLocked ? "Locked - preserved on randomize" : "Unlocked - included in randomize"}
                        value={graphConfig.seed ?? ''}
                        onChange={(val) => updateConfig('seed', typeof val === 'number' ? val : null)}
                        placeholder="Random"
                        allowNegative={false}
                        style={sprinkles({ flex: '1' })}
                        size="xs"
                      />
                      <Button
                        variant={seedLocked ? "light" : "subtle"}
                        size="xs"
                        onClick={() => setSeedLocked(!seedLocked)}
                        title={seedLocked ? "Seed locked - click to unlock" : "Seed unlocked - click to lock"}
                        px="xs"
                      >
                        {seedLocked ? <IconLock size={14} /> : <IconLockOpen size={14} />}
                      </Button>
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={handleRandomize}
                        title={seedLocked ? "Randomize all values (seed locked)" : "Randomize all values including seed"}
                      >
                        Randomize
                      </Button>
                    </Group>

                    <Divider />

                    {/* Components */}
                    <Box>
                      <Group justify="space-between" mb={4}>
                        <Text size="xs" fw={500}>Components</Text>
                        <Button
                          variant={componentsLocked ? "light" : "subtle"}
                          size="compact-xs"
                          onClick={() => setComponentsLocked(!componentsLocked)}
                          title={componentsLocked ? "Locked - click to unlock" : "Unlocked - click to lock"}
                          px="xs"
                        >
                          {componentsLocked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
                        </Button>
                      </Group>
                      <Group gap="xs" align="center">
                        <Slider
                          value={graphConfig.componentCount}
                          onChange={(val) => updateConfig('componentCount', val)}
                          min={1}
                          max={6}
                          step={1}
                          marks={[
                            { value: 1, label: '1' },
                            { value: 3, label: '3' },
                            { value: 6, label: '6' },
                          ]}
                          size="sm"
                          style={sprinkles({ flex: '1' })}
                        />
                        <NumberInput
                          value={graphConfig.componentCount}
                          onChange={(val) => updateConfig('componentCount', typeof val === 'number' ? Math.max(1, Math.min(6, val)) : 1)}
                          min={1}
                          max={6}
                          size="xs"
                          w={60}
                          hideControls
                        />
                      </Group>
                    </Box>

                    <Divider />

                    {/* Edges per Node */}
                    <Box>
                      <Group justify="space-between" mb={4}>
                        <Text size="xs" fw={500}>Edges per Node</Text>
                        <Button
                          variant={edgesLocked ? "light" : "subtle"}
                          size="compact-xs"
                          onClick={() => setEdgesLocked(!edgesLocked)}
                          title={edgesLocked ? "Locked - click to unlock" : "Unlocked - click to lock"}
                          px="xs"
                        >
                          {edgesLocked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
                        </Button>
                      </Group>
                      <Group gap="xs" align="center">
                        <NumberInput
                          value={graphConfig.edgesPerNodeRange[0]}
                          onChange={(val) => {
                            const newMin = typeof val === 'number' ? Math.max(0, Math.min(10, val)) : 0;
                            updateConfig('edgesPerNodeRange', [newMin, Math.max(newMin, graphConfig.edgesPerNodeRange[1])]);
                          }}
                          min={0}
                          max={10}
                          size="xs"
                          w={50}
                          hideControls
                        />
                        <RangeSlider
                          value={graphConfig.edgesPerNodeRange}
                          onChange={(val) => updateConfig('edgesPerNodeRange', val)}
                          min={0}
                          max={10}
                          step={1}
                          minRange={0}
                          marks={[
                            { value: 0, label: '0' },
                            { value: 5, label: '5' },
                            { value: 10, label: '10' },
                          ]}
                          size="sm"
                          style={sprinkles({ flex: '1' })}
                        />
                        <NumberInput
                          value={graphConfig.edgesPerNodeRange[1]}
                          onChange={(val) => {
                            const newMax = typeof val === 'number' ? Math.max(0, Math.min(10, val)) : 10;
                            updateConfig('edgesPerNodeRange', [Math.min(graphConfig.edgesPerNodeRange[0], newMax), newMax]);
                          }}
                          min={0}
                          max={10}
                          size="xs"
                          w={50}
                          hideControls
                        />
                      </Group>
                    </Box>

                    <Divider />

                    {/* Total Nodes (Log Scale) */}
                    <Box>
                      <Group justify="space-between" mb={4}>
                        <Text size="xs" fw={500}>Total Nodes</Text>
                        <Button
                          variant={totalNodesLocked ? "light" : "subtle"}
                          size="compact-xs"
                          onClick={() => setTotalNodesLocked(!totalNodesLocked)}
                          title={totalNodesLocked ? "Locked - click to unlock" : "Unlocked - click to lock"}
                          px="xs"
                        >
                          {totalNodesLocked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
                        </Button>
                      </Group>
                      <Group gap="xs" align="center">
                        <NumberInput
                          value={graphConfig.totalNodeCountRange[0]}
                          onChange={(val) => {
                            const newMin = typeof val === 'number' ? Math.max(5, Math.min(10000, val)) : 5;
                            updateConfig('totalNodeCountRange', [newMin, Math.max(newMin, graphConfig.totalNodeCountRange[1])]);
                          }}
                          min={5}
                          max={10000}
                          size="xs"
                          w={70}
                          hideControls
                          thousandSeparator
                        />
                        <RangeSlider
                          value={[
                            // Ensure valid finite values for the slider
                            Math.max(0, Math.min(100, Number.isFinite(logNodesToLinear(graphConfig.totalNodeCountRange[0])) ? logNodesToLinear(graphConfig.totalNodeCountRange[0]) : 0)),
                            Math.max(0, Math.min(100, Number.isFinite(logNodesToLinear(graphConfig.totalNodeCountRange[1])) ? logNodesToLinear(graphConfig.totalNodeCountRange[1]) : 100))
                          ]}
                          onChange={(val) => {
                            const min = linearToLogNodes(val[0]);
                            const max = linearToLogNodes(val[1]);
                            // Only update if values are valid
                            if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
                              updateConfig('totalNodeCountRange', [min, max]);
                            }
                          }}
                          min={0}
                          max={100}
                          step={0.5}
                          minRange={0}
                          marks={[
                            { value: logNodesToLinear(5), label: '5' },
                            { value: logNodesToLinear(50), label: '50' },
                            { value: logNodesToLinear(500), label: '500' },
                            { value: logNodesToLinear(5000), label: '5k' },
                            { value: logNodesToLinear(10000), label: '10k' },
                          ]}
                          label={(val) => linearToLogNodes(val).toLocaleString()}
                          size="sm"
                          style={sprinkles({ flex: '1' })}
                        />
                        <NumberInput
                          value={graphConfig.totalNodeCountRange[1]}
                          onChange={(val) => {
                            const newMax = typeof val === 'number' ? Math.max(5, Math.min(10000, val)) : 10000;
                            updateConfig('totalNodeCountRange', [Math.min(graphConfig.totalNodeCountRange[0], newMax), newMax]);
                          }}
                          min={5}
                          max={10000}
                          size="xs"
                          w={70}
                          hideControls
                          thousandSeparator
                        />
                      </Group>
                    </Box>

                    <Divider />

                    {/* Node Type Distribution */}
                    <Group justify="space-between">
                      <Text size="xs" fw={500}>Node Type Distribution</Text>
                      <Button
                        variant={percentagesLocked ? "light" : "subtle"}
                        size="compact-xs"
                        onClick={() => setPercentagesLocked(!percentagesLocked)}
                        title={percentagesLocked ? "Distributions locked from randomization" : "Distributions included in randomization"}
                        px="xs"
                      >
                        {percentagesLocked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
                      </Button>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {percentagesLocked
                        ? "Randomize won't affect distributions. Lock individual types to exclude from redistribution."
                        : "Randomize will affect unlocked distributions. Lock individual types to exclude from redistribution."}
                    </Text>
                    <Stack gap="xs">
                      {ENTITY_TYPES_ORDERED.map((entityType) => (
                        <Box key={entityType}>
                          <Group gap="xs" align="center">
                            <ActionIcon
                              variant={lockedEntityTypes.has(entityType) ? "light" : "subtle"}
                              size="xs"
                              onClick={() => toggleEntityLock(entityType)}
                              title={lockedEntityTypes.has(entityType)
                                ? "Locked - excluded from redistribution"
                                : "Unlocked - included in redistribution"}
                            >
                              {lockedEntityTypes.has(entityType) ? <IconLock size={12} /> : <IconLockOpen size={12} />}
                            </ActionIcon>
                            <Text size="xs" c="dimmed" w={80}>{ENTITY_DISPLAY_NAMES[entityType]}</Text>
                            <Slider
                              value={graphConfig.entityPercentages[entityType]}
                              onChange={(val) => updatePercentage(entityType, val)}
                              min={0}
                              max={100}
                              step={1}
                              size="xs"
                              style={sprinkles({ flex: '1' })}
                            />
                            <NumberInput
                              value={graphConfig.entityPercentages[entityType]}
                              onChange={(val) => updatePercentage(entityType, typeof val === 'number' ? val : 0)}
                              min={0}
                              max={100}
                              size="xs"
                              w={50}
                              hideControls
                              suffix="%"
                            />
                          </Group>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </Card>

                {/* Graph Summary Card */}
                <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="md">
                  <Title order={5} mb="sm">Current Graph Stats</Title>

                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Nodes by Type ({graphData.nodes.length} total)</Text>
                    <Group gap="xs" wrap="wrap">
                      {Object.entries(nodeTypeCounts).map(([type, count]) => (
                        <Badge key={type} variant="light" size="sm">
                          {type}: {count}
                        </Badge>
                      ))}
                    </Group>

                    <Text size="sm" fw={500} mt="sm">Edges by Type ({graphData.edges.length} total)</Text>
                    <Group gap="xs" wrap="wrap">
                      {Object.entries(edgeTypeCounts).map(([type, count]) => (
                        <Badge key={type} variant="outline" size="sm">
                          {type}: {count}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>

            {/* Right: Algorithms Panel with Category Tabs */}
            <Grid.Col span={{ base: 12, md: 9 }}>
              <Paper style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="md">
                <AlgorithmTabs
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  onHighlightNodes={handleHighlightNodes}
                  onHighlightPath={handleHighlightPath}
                  onSelectCommunity={handleSelectCommunity}
                  onCommunitiesDetected={handleCommunitiesDetected}
                  pathSource={pathSource}
                  pathTarget={pathTarget}
                  onPathSourceChange={setPathSource}
                  onPathTargetChange={setPathTarget}
                />
              </Paper>
            </Grid.Col>
          </Grid>
        </Stack>
    </Container>
  );
}

export const Route = createLazyFileRoute('/algorithms')({
  component: AlgorithmsPage,
});

export default AlgorithmsPage;
