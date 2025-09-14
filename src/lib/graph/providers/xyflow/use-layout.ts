/**
 * Unified Layout Hook for ReactFlow
 * Handles all layout algorithms (D3 force, hierarchical, circular, grid) through a consistent interface
 */

import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum
} from 'd3-force';
import { randomLcg } from 'd3-random';

import type { GraphLayout, EntityType } from '../../types';
import { logger } from '@/lib/logger';

// Extended node interface for D3 simulation
interface D3Node extends SimulationNodeDatum {
  id: string;
  type?: EntityType;
  [key: string]: unknown;
}

interface D3Link extends SimulationLinkDatum<D3Node> {
  id: string;
  source: string | D3Node;
  target: string | D3Node;
}

interface UseLayoutOptions {
  enabled?: boolean;
  onLayoutChange?: () => void;
  fitViewAfterLayout?: boolean;
}

export function useLayout(
  layout: GraphLayout | null,
  options: UseLayoutOptions = {}
) {
  const { enabled = true, onLayoutChange, fitViewAfterLayout = true } = options;
  const { getNodes, getEdges, setNodes } = useReactFlow();
  const simulationRef = useRef<Simulation<D3Node, D3Link> | null>(null);
  const isRunningRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  // Stop any existing simulation or timeout
  const stopLayout = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
      isRunningRef.current = false;
      logger.info('graph', 'Layout simulation stopped', undefined, 'useLayout');
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Apply static layouts (grid, circular, hierarchical)
  const applyStaticLayout = useCallback((layoutType: string, nodes: ReturnType<typeof getNodes>, layoutOptions?: Record<string, unknown>) => {
    if (nodes.length === 0) return;

    logger.info('graph', 'Applying static layout', { type: layoutType, nodeCount: nodes.length }, 'useLayout');

    const updatedNodes = [...nodes];

    switch (layoutType) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const spacing = 200;
        updatedNodes.forEach((node, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          node.position = {
            x: col * spacing + 100,
            y: row * spacing + 100,
          };
        });
        break;
      }

      case 'circular': {
        const centerX = 400;
        const centerY = 300;
        const radius = Math.max(150, nodes.length * 20);
        updatedNodes.forEach((node, index) => {
          const angle = (index / nodes.length) * 2 * Math.PI;
          node.position = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
          };
        });
        break;
      }

      case 'hierarchical': {
        // Group by entity type for hierarchical layout
        const levels = new Map<string, Array<typeof nodes[0]>>();
        updatedNodes.forEach(node => {
          let level = 0;
          const entityType = node.data?.entityType || node.type || 'unknown';
          switch (entityType) {
            case 'authors':
              level = 0;
              break;
            case 'works':
              level = 1;
              break;
            case 'sources':
              level = 2;
              break;
            case 'institutions':
              level = 3;
              break;
            default:
              level = 4;
          }

          const levelKey = level.toString();
          if (!levels.has(levelKey)) {
            levels.set(levelKey, []);
          }
          levels.get(levelKey)!.push(node);
        });

        // Position nodes by level
        levels.forEach((levelNodes, level) => {
          const y = parseInt(level) * 150 + 100;
          levelNodes.forEach((node, index) => {
            node.position = {
              x: (index - levelNodes.length / 2) * 200 + 400,
              y,
            };
          });
        });
        break;
      }

      case 'force':
      case 'force-deterministic': {
        // Simple force layout (non-D3, just circular with jitter)
        const centerX = 400;
        const centerY = 300;
        const radius = 200;
        const seed = (layoutOptions?.seed as number) || 42;

        let seedValue = seed;
        const seededRandom = () => {
          seedValue = (seedValue * 9301 + 49297) % 233280;
          return seedValue / 233280;
        };

        updatedNodes.forEach((node, index) => {
          const angle = (index / nodes.length) * 2 * Math.PI;
          node.position = {
            x: centerX + Math.cos(angle) * radius + (seededRandom() - 0.5) * 100,
            y: centerY + Math.sin(angle) * radius + (seededRandom() - 0.5) * 100,
          };
        });
        break;
      }
    }

    setNodes(updatedNodes);
    onLayoutChange?.();

    logger.info('graph', 'Static layout applied', {
      type: layoutType,
      samplePositions: updatedNodes.slice(0, 3).map(n => ({ id: n.id, position: n.position }))
    }, 'useLayout');
  }, [setNodes, onLayoutChange]);

  // Apply D3 force simulation layout
  const applyD3ForceLayout = useCallback(() => {
    if (!layout || layout.type !== 'd3-force') return;

    const nodes = getNodes();
    const edges = getEdges();

    if (nodes.length === 0) {
      logger.info('graph', 'No nodes to layout with D3 force', undefined, 'useLayout');
      return;
    }

    // Stop existing simulation
    stopLayout();

    // Extract layout options
    const {
      seed = 42,
      linkDistance = 220,
      linkStrength = 0.7,
      chargeStrength = -600,
      centerStrength = 0.03,
      collisionRadius = 100,
      collisionStrength = 1.0,
      velocityDecay = 0.2,
      alpha = 1,
      alphaDecay = 0.015
    } = layout.options || {};

    logger.info('graph', 'Starting D3 Force simulation', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      linkDistance,
      chargeStrength,
      collisionRadius,
      collisionStrength
    }, 'useLayout');

    // Create deterministic random source
    const random = randomLcg(seed);

    // Convert ReactFlow nodes to D3 nodes
    const d3Nodes: D3Node[] = nodes.map((node, index) => {
      // Initialize positions for new nodes (those at origin)
      if (node.position.x === 0 && node.position.y === 0) {
        const angle = (index / nodes.length) * 2 * Math.PI;
        const radius = Math.min(150 + (index % 3) * 50, 300);
        return {
          id: node.id,
          x: Math.cos(angle) * radius + 400,
          y: Math.sin(angle) * radius + 300,
          ...node.data,
        };
      } else {
        // Keep existing positions with small jitter for stability
        const nodeHash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const jitterX = ((nodeHash % 21) - 10) * 2; // -20 to 20
        const jitterY = (((nodeHash * 17) % 21) - 10) * 2;
        return {
          id: node.id,
          x: node.position.x + jitterX,
          y: node.position.y + jitterY,
          ...node.data,
        };
      }
    });

    // Convert ReactFlow edges to D3 links
    const d3Links: D3Link[] = edges
      .filter(edge => {
        const sourceExists = d3Nodes.find(n => n.id === edge.source);
        const targetExists = d3Nodes.find(n => n.id === edge.target);
        return sourceExists && targetExists;
      })
      .map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      }));

    // Create simulation
    simulationRef.current = forceSimulation<D3Node>(d3Nodes)
      .randomSource(random)
      .velocityDecay(velocityDecay)
      .alpha(alpha)
      .alphaDecay(alphaDecay);

    // Configure forces
    simulationRef.current
      .force('link', forceLink<D3Node, D3Link>(d3Links)
        .id(d => d.id)
        .distance(linkDistance)
        .strength(linkStrength))
      .force('charge', forceManyBody<D3Node>()
        .strength(chargeStrength))
      .force('center', forceCenter<D3Node>(400, 300)
        .strength(centerStrength))
      .force('collision', forceCollide<D3Node>()
        .radius(collisionRadius)
        .strength(collisionStrength));

    isRunningRef.current = true;

    // Set up tick handler for continuous position updates
    simulationRef.current.on('tick', () => {
      setNodes(currentNodes =>
        currentNodes.map(node => {
          const d3Node = d3Nodes.find(d => d.id === node.id);
          if (d3Node && typeof d3Node.x === 'number' && typeof d3Node.y === 'number') {
            return {
              ...node,
              position: { x: d3Node.x, y: d3Node.y }
            };
          }
          return node;
        })
      );

      onLayoutChange?.();
    });

    // Set up end handler
    simulationRef.current.on('end', () => {
      logger.info('graph', 'D3 Force simulation completed', {
        samplePositions: d3Nodes.slice(0, 3).map(n => ({
          id: n.id,
          x: Math.round(n.x || 0),
          y: Math.round(n.y || 0)
        }))
      }, 'useLayout');
      isRunningRef.current = false;
    });

  }, [layout, getNodes, getEdges, setNodes, onLayoutChange, stopLayout]);

  // Main layout application function
  const applyLayout = useCallback(() => {
    if (!enabled || !layout) {
      return;
    }

    const nodes = getNodes();
    if (nodes.length === 0) {
      return;
    }

    if (layout.type === 'd3-force') {
      applyD3ForceLayout();
    } else {
      stopLayout(); // Stop any running simulation
      applyStaticLayout(layout.type, nodes, layout.options);

      // For static layouts, optionally fit view after a short delay
      if (fitViewAfterLayout) {
        timeoutRef.current = window.setTimeout(() => {
          onLayoutChange?.();
        }, 100);
      }
    }
  }, [enabled, layout, getNodes, applyD3ForceLayout, stopLayout, applyStaticLayout, fitViewAfterLayout, onLayoutChange]);

  // Apply layout when layout changes
  useEffect(() => {
    if (enabled && layout) {
      applyLayout();
    } else {
      stopLayout();
    }

    // Cleanup on unmount
    return stopLayout;
  }, [enabled, layout, applyLayout, stopLayout]);

  // Manual restart function
  const restartLayout = useCallback(() => {
    applyLayout();
  }, [applyLayout]);

  // Reheat simulation (useful when adding new nodes to D3 force)
  const reheatLayout = useCallback((alpha = 0.3) => {
    if (simulationRef.current && isRunningRef.current && layout?.type === 'd3-force') {
      simulationRef.current.alpha(alpha).restart();
      logger.info('graph', 'D3 Force simulation reheated', { alpha }, 'useLayout');
    } else {
      // If not running or not D3 force, just restart
      restartLayout();
    }
  }, [layout, restartLayout]);

  return {
    isRunning: isRunningRef.current,
    applyLayout,
    restartLayout,
    reheatLayout,
    stopLayout,
  };
}