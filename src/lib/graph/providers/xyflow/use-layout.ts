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
    logger.info('graph', 'About to stop existing simulation before starting D3 force', {
      hadSimulation: !!simulationRef.current,
      currentAlpha: simulationRef.current?.alpha(),
      timestamp: Date.now()
    }, 'useLayout');
    stopLayout();

    // Extract layout options
    logger.info('graph', 'Raw layout options from store', {
      layoutOptions: layout.options,
      layoutType: layout.type
    }, 'useLayout');

    const {
      seed = 42,
      linkDistance = 220,
      linkStrength = 0.7,
      chargeStrength = -600,
      centerStrength = 0.03,
      collisionRadius = 100,
      collisionStrength = 0.8,
      velocityDecay = 0.4,     // Match store config
      alpha = 1,
      alphaDecay = 0.03        // Match store config
    } = layout.options || {};

    logger.info('graph', 'Starting D3 Force simulation', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      linkDistance,
      chargeStrength,
      collisionRadius,
      collisionStrength,
      velocityDecay,
      alphaDecay,
      initialAlpha: alpha,
      calculatedMinSpacing: collisionRadius * 2.2,
      calculatedBaseRadius: Math.max(200, Math.sqrt(nodes.length) * (collisionRadius * 2.2) / 2)
    }, 'useLayout');

    // Create deterministic random source
    const random = randomLcg(seed);

    // Convert ReactFlow nodes to D3 nodes
    const d3Nodes: D3Node[] = nodes.map((node, index) => {
      // Initialize positions for new nodes (those at origin)
      if (node.position.x === 0 && node.position.y === 0) {
        const angle = (index / nodes.length) * 2 * Math.PI;
        // Ensure minimum spacing based on collision radius * 2 for safety
        const minSpacing = collisionRadius * 2.2;
        const baseRadius = Math.max(200, Math.sqrt(nodes.length) * minSpacing / 2);
        const radius = baseRadius + (index % 3) * minSpacing;
        const newPosition = {
          x: Math.cos(angle) * radius + 400,
          y: Math.sin(angle) * radius + 300
        };
        logger.info('graph', 'Initializing new node position', {
          nodeId: node.id,
          wasAtOrigin: true,
          newPosition
        }, 'useLayout');
        return {
          id: node.id,
          x: newPosition.x,
          y: newPosition.y,
          ...node.data,
        };
      } else {
        // Keep existing positions with small jitter for stability
        const nodeHash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const jitterX = ((nodeHash % 21) - 10) * 2; // -20 to 20
        const jitterY = (((nodeHash * 17) % 21) - 10) * 2;
        const existingPosition = {
          originalX: node.position.x,
          originalY: node.position.y,
          withJitterX: node.position.x + jitterX,
          withJitterY: node.position.y + jitterY
        };
        logger.info('graph', 'Keeping existing node position with jitter', {
          nodeId: node.id,
          wasAtOrigin: false,
          positions: existingPosition
        }, 'useLayout');
        return {
          id: node.id,
          x: existingPosition.withJitterX,
          y: existingPosition.withJitterY,
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

    // Create simulation with safety timeout
    simulationRef.current = forceSimulation<D3Node>(d3Nodes)
      .randomSource(random)
      .velocityDecay(velocityDecay)
      .alpha(alpha)
      .alphaDecay(alphaDecay)
      .alphaTarget(0.005); // Lower target for more thorough collision resolution

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
    let tickCount = 0;
    simulationRef.current.on('tick', () => {
      tickCount++;

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

      // Log alpha progression every 10 ticks instead of every tick
      if (tickCount % 10 === 0) {
        const currentAlpha = simulationRef.current?.alpha();
        logger.info('graph', 'D3 Force simulation progress', {
          tick: tickCount,
          alpha: currentAlpha,
          alphaTarget: 0.005,
          isRunning: currentAlpha > 0.005
        }, 'useLayout');
      }

      onLayoutChange?.();
    });

    // Set up end handler
    simulationRef.current.on('end', () => {
      logger.info('graph', 'D3 Force simulation completed', {
        finalAlpha: simulationRef.current?.alpha(),
        samplePositions: d3Nodes.slice(0, 3).map(n => ({
          id: n.id,
          x: Math.round(n.x || 0),
          y: Math.round(n.y || 0)
        }))
      }, 'useLayout');
      isRunningRef.current = false;
    });

  }, [layout, onLayoutChange, stopLayout]);

  // Main layout application function
  const applyLayout = useCallback(() => {
    if (!enabled || !layout) {
      logger.info('graph', 'Layout application skipped', { enabled, hasLayout: !!layout }, 'useLayout');
      return;
    }

    const nodes = getNodes();
    logger.info('graph', 'Layout application started', {
      layoutType: layout.type,
      nodeCount: nodes.length,
      nodeIds: nodes.map(n => n.id),
      nodePositions: nodes.map(n => ({ id: n.id, position: n.position }))
    }, 'useLayout');

    if (nodes.length === 0) {
      logger.info('graph', 'No nodes to layout', undefined, 'useLayout');
      return;
    }

    if (layout.type === 'd3-force') {
      logger.info('graph', 'Applying D3 force layout', { nodeCount: nodes.length }, 'useLayout');
      applyD3ForceLayout();
    } else {
      logger.info('graph', 'Applying static layout', { layoutType: layout.type, nodeCount: nodes.length }, 'useLayout');
      stopLayout(); // Stop any running simulation
      applyStaticLayout(layout.type, nodes, layout.options);

      // For static layouts, optionally fit view after a short delay
      if (fitViewAfterLayout) {
        timeoutRef.current = window.setTimeout(() => {
          onLayoutChange?.();
        }, 100);
      }
    }
  }, [enabled, layout, applyD3ForceLayout, stopLayout, applyStaticLayout, fitViewAfterLayout, onLayoutChange]);

  // Apply layout when layout changes
  useEffect(() => {
    logger.info('graph', 'Layout useEffect triggered', {
      enabled,
      layoutType: layout?.type,
      dependencies: { enabled, layoutType: layout?.type },
      timestamp: Date.now()
    }, 'useLayout');

    if (enabled && layout) {
      logger.info('graph', 'Triggering layout application from useEffect', { layoutType: layout.type }, 'useLayout');
      applyLayout();
    } else {
      logger.info('graph', 'Stopping layout from useEffect', { enabled, hasLayout: !!layout }, 'useLayout');
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
    logger.info('graph', 'Reheat layout called', {
      alpha,
      hasSimulation: !!simulationRef.current,
      isRunning: isRunningRef.current,
      layoutType: layout?.type
    }, 'useLayout');

    if (simulationRef.current && isRunningRef.current && layout?.type === 'd3-force') {
      simulationRef.current.alpha(alpha).restart();
      logger.info('graph', 'D3 Force simulation reheated', { alpha }, 'useLayout');
    } else {
      logger.info('graph', 'Reheating via restart layout', {
        reason: !simulationRef.current ? 'no simulation' : !isRunningRef.current ? 'not running' : 'not d3-force'
      }, 'useLayout');
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