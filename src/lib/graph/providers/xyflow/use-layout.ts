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


  // Apply D3 force simulation layout
  const applyD3ForceLayout = useCallback(() => {
    logger.info('graph', 'applyD3ForceLayout called', {
      hasLayout: !!layout,
      enabled: true
    }, 'useLayout');

    const nodes = getNodes();
    const edges = getEdges();

    logger.info('graph', 'applyD3ForceLayout proceeding', {
      nodeCount: nodes.length,
      edgeCount: edges.length
    }, 'useLayout');

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

    // Using fixed D3 force parameters

    // Fixed D3 force parameters for optimal node separation - stronger forces to prevent overlap
    const seed = 42;
    const linkDistance = 600; // Increased from 400 for more spacing
    const linkStrength = 0.5; // Reduced from 0.7 to allow more flexibility
    const chargeStrength = -2000; // Increased from -1200 for stronger repulsion
    const centerStrength = 0.01; // Reduced from 0.03 to allow more spreading
    const collisionRadius = 180; // Increased from 120 for larger collision zones
    const collisionStrength = 1.2; // Increased from 0.9 for stronger collision avoidance
    const velocityDecay = 0.3; // Reduced from 0.4 for more movement freedom
    const alpha = 1;
    const alphaDecay = 0.02; // Reduced from 0.03 for longer simulation

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
      calculatedMinSpacing: collisionRadius * 2.5,
      calculatedBaseRadius: Math.max(300, Math.sqrt(nodes.length) * (collisionRadius * 2.5) / 2)
    }, 'useLayout');

    // Create deterministic random source
    const random = randomLcg(seed);

    // Convert ReactFlow nodes to D3 nodes
    const d3Nodes: D3Node[] = nodes.map((node, index) => {
      // Initialize positions for new nodes (those at origin)
      if (node.position.x === 0 && node.position.y === 0) {
        const angle = (index / nodes.length) * 2 * Math.PI;
        // Ensure minimum spacing based on collision radius * 2.5 for better safety margin
        const minSpacing = collisionRadius * 2.5;
        const baseRadius = Math.max(300, Math.sqrt(nodes.length) * minSpacing / 2);
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
        // Keep existing positions with larger jitter to help separate overlapping nodes
        const nodeHash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const jitterX = ((nodeHash % 41) - 20) * 5; // -100 to 100
        const jitterY = (((nodeHash * 17) % 41) - 20) * 5;
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
      .alphaTarget(0); // Standard D3 target for proper stopping

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
        const currentAlpha = simulationRef.current?.alpha() ?? 0;
        logger.info('graph', 'D3 Force simulation progress', {
          tick: tickCount,
          alpha: currentAlpha,
          alphaTarget: 0,
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

  // Main layout application function - D3 force only
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

    // Always apply D3 force layout
    logger.info('graph', 'Applying D3 force layout', { nodeCount: nodes.length }, 'useLayout');
    applyD3ForceLayout();
  }, [enabled, layout, applyD3ForceLayout]);

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