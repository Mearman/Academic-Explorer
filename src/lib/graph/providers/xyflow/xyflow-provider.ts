/**
 * XYFlow implementation of the GraphProvider interface
 * Provides XYFlow-specific rendering while maintaining provider abstraction
 */

import {
  Node as XYNode,
  Edge as XYEdge,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type {
  GraphProvider,
  GraphNode,
  GraphEdge,
  GraphLayout,
  GraphEvents,
  GraphSnapshot,
  GraphOptions,
  EntityType
} from '../../types';

// D3-force imports for physics-based layouts
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
import { logger } from '@/lib/logger';

// D3 simulation interfaces for type safety
interface D3Node extends SimulationNodeDatum {
  id: string;
  type: EntityType;
  label: string;
}

interface D3Link extends SimulationLinkDatum<D3Node> {
  id: string;
  type: string;
}

export class XYFlowProvider implements GraphProvider {
  private container: HTMLElement | null = null;
  private isLayoutInProgress: boolean = false;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private events: GraphEvents = {};
  private reactFlowInstance: ReactFlowInstance | null = null;
  private mounted = false;
  private d3Simulation: Simulation<D3Node, D3Link> | null = null;
  private currentLayout: GraphLayout | null = null;

  // Convert generic GraphNode to XYFlow node
  private toXYNode(node: GraphNode): XYNode {
    return {
      id: node.id,
      type: 'custom',
      position: node.position,
      data: {
        label: node.label,
        entityId: node.entityId,
        entityType: node.type,
        externalIds: node.externalIds,
        metadata: node.metadata,
      },
      style: {
        background: this.getEntityColor(node.type),
        color: 'white',
        borderRadius: '8px',
        border: '2px solid #333',
        padding: '8px',
        fontSize: '11px',
        fontWeight: 'bold',
        minWidth: '120px',
        textAlign: 'center',
      },
    };
  }

  // Convert generic GraphEdge to XYFlow edge
  private toXYEdge(edge: GraphEdge): XYEdge {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'default',
      label: edge.label,
      data: edge.metadata,
      style: {
        stroke: this.getEdgeColor(edge.type),
        strokeWidth: edge.weight ? Math.max(1, edge.weight * 3) : 1,
      },
      animated: edge.type === 'cited',
    };
  }

  // Get color for entity type
  private getEntityColor(entityType: EntityType): string {
    switch (entityType) {
      case 'works':
        return '#e74c3c';
      case 'authors':
        return '#3498db';
      case 'sources':
        return '#2ecc71';
      case 'institutions':
        return '#f39c12';
      case 'topics':
        return '#9b59b6';
      case 'publishers':
        return '#1abc9c';
      case 'funders':
        return '#e67e22';
      default:
        return '#95a5a6';
    }
  }

  // Get color for edge type
  private getEdgeColor(relationType: string): string {
    switch (relationType) {
      case 'authored':
        return '#3498db';
      case 'cited':
        return '#e74c3c';
      case 'affiliated':
        return '#f39c12';
      case 'published_in':
        return '#2ecc71';
      case 'funded_by':
        return '#e67e22';
      default:
        return '#95a5a6';
    }
  }

  async initialize(container: HTMLElement, _options: GraphOptions = {}): Promise<void> {
    this.container = container;
    this.mounted = true;

    // XYFlow will be rendered by the React component
    // This method just sets up the container reference
    return Promise.resolve();
  }

  destroy(): void {
    this.mounted = false;
    this.container = null;
    this.reactFlowInstance = null;
    // Clean up D3 simulation
    if (this.d3Simulation) {
      this.d3Simulation.stop();
      this.d3Simulation = null;
    }
  }

  setNodes(nodes: GraphNode[]): void {
    this.nodes.clear();
    nodes.forEach(node => this.nodes.set(node.id, node));
    this.updateReactFlow();
  }

  setEdges(edges: GraphEdge[]): void {
    this.edges.clear();
    edges.forEach(edge => this.edges.set(edge.id, edge));
    this.updateReactFlow();
  }

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    this.updateReactFlow();

    // If we have a current force-directed layout, automatically re-apply it to include the new node
    if (this.currentLayout && this.isForceDirectedLayout(this.currentLayout.type)) {
      logger.info('graph', 'New node added to force-directed layout, re-applying layout to include it', { nodeId: node.id }, 'XYFlowProvider');
      // Use a small delay to allow React state to update first
      setTimeout(() => {
        if (this.currentLayout) {
          this.applyLayout(this.currentLayout);
        }
      }, 50);
    }
  }

  private isForceDirectedLayout(layoutType: string): boolean {
    return layoutType === 'd3-force' || layoutType === 'force-deterministic' || layoutType === 'force';
  }

  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);
    this.updateReactFlow();

    // If we have a current force-directed layout, automatically re-apply it to include the new edge
    if (this.currentLayout && this.isForceDirectedLayout(this.currentLayout.type)) {
      logger.info('graph', 'New edge added to force-directed layout, re-applying layout to include it', { edgeId: edge.id }, 'XYFlowProvider');
      // Use a small delay to allow React state to update first
      setTimeout(() => {
        if (this.currentLayout) {
          this.applyLayout(this.currentLayout);
        }
      }, 50);
    }
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    // Also remove connected edges
    Array.from(this.edges.values()).forEach(edge => {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.edges.delete(edge.id);
      }
    });
    this.updateReactFlow();
  }

  removeEdge(edgeId: string): void {
    this.edges.delete(edgeId);
    this.updateReactFlow();
  }

  updateNode(nodeId: string, updates: Partial<GraphNode>): void {
    const existingNode = this.nodes.get(nodeId);
    if (existingNode) {
      const updatedNode = { ...existingNode, ...updates };
      this.nodes.set(nodeId, updatedNode);
      this.updateReactFlow();
    }
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.updateReactFlow();
  }

  applyLayout(layout: GraphLayout): void {
    const nodes = Array.from(this.nodes.values());

    if (nodes.length === 0) {
      logger.info('graph', 'No nodes to layout, skipping', undefined, 'XYFlowProvider');
      return;
    }

    // Only block if layout is currently in progress to prevent rapid-fire duplicates
    if (this.isLayoutInProgress) {
      logger.info('graph', 'Layout already in progress, skipping duplicate request', undefined, 'XYFlowProvider');
      return;
    }

    // Store the current layout so we can re-apply it when new nodes are added
    this.currentLayout = layout;

    this.isLayoutInProgress = true;

    // For force-directed layouts, always re-layout all nodes to maintain proper physics
    const isForceLayout = ['force', 'force-deterministic', 'd3-force'].includes(layout.type);
    const isCompleteReLayout = layout.options?.forceReLayout === true;

    let targetNodes: GraphNode[];

    if (isForceLayout || isCompleteReLayout) {
      logger.info('graph', 'Force/Complete layout: Applying layout to all nodes', { layoutType: layout.type, nodeCount: nodes.length }, 'XYFlowProvider');
      targetNodes = nodes; // Always re-layout all nodes for force layouts
    } else {
      // For non-force layouts (grid, circular, hierarchical), preserve existing positions
      const nodesToLayout = nodes.filter(node =>
        !node.position || (node.position.x === 0 && node.position.y === 0)
      );

      if (nodesToLayout.length === 0) {
        logger.info('graph', 'Incremental layout: All nodes already positioned, skipping', undefined, 'XYFlowProvider');
        return;
      }

      logger.info('graph', 'Incremental layout: Processing new nodes', { newNodeCount: nodesToLayout.length, existingNodeCount: nodes.length - nodesToLayout.length }, 'XYFlowProvider');
      targetNodes = nodesToLayout;
    }

    switch (layout.type) {
      case 'force':
        this.applyForceLayout(targetNodes);
        break;
      case 'force-deterministic':
        this.applyDeterministicForceLayout(targetNodes, layout.options);
        break;
      case 'd3-force':
        this.applyD3ForceLayout(targetNodes, layout.options);
        break;
      case 'hierarchical':
        this.applyHierarchicalLayout(targetNodes);
        break;
      case 'circular':
        this.applyCircularLayout(targetNodes);
        break;
      case 'grid':
        this.applyGridLayout(targetNodes);
        break;
    }

    // Update the nodes map with new positions (layout functions modify nodes in place)
    targetNodes.forEach(node => {
      this.nodes.set(node.id, node);
    });

    // Reset layout progress flag
    this.isLayoutInProgress = false;

    this.updateReactFlow();
  }

  fitView(): void {
    if (this.reactFlowInstance) {
      this.reactFlowInstance.fitView({ padding: 0.1 });
    }
  }

  center(nodeId?: string): void {
    if (!this.reactFlowInstance) return;

    if (nodeId && this.nodes.has(nodeId)) {
      const node = this.nodes.get(nodeId)!;
      this.reactFlowInstance.setCenter(node.position.x, node.position.y, { zoom: 1.5 });
    } else {
      this.fitView();
    }
  }

  setEvents(events: GraphEvents): void {
    this.events = events;
  }

  highlightNode(nodeId: string): void {
    // Implementation would update node styling
    const node = this.nodes.get(nodeId);
    if (node && this.reactFlowInstance) {
      // Update node highlight state
      this.updateReactFlow();
    }
  }

  highlightPath(_nodeIds: string[]): void {
    // Implementation would highlight nodes and edges in path
    if (this.reactFlowInstance) {
      // Update highlighting for path
      this.updateReactFlow();
    }
  }

  clearHighlights(): void {
    // Clear all highlights
    if (this.reactFlowInstance) {
      this.updateReactFlow();
    }
  }

  getSnapshot(): GraphSnapshot {
    const viewport = this.reactFlowInstance?.getViewport();

    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      viewport: viewport ? {
        zoom: viewport.zoom,
        center: { x: viewport.x, y: viewport.y }
      } : undefined,
    };
  }

  loadSnapshot(snapshot: GraphSnapshot): void {
    this.setNodes(snapshot.nodes);
    this.setEdges(snapshot.edges);

    if (snapshot.viewport && this.reactFlowInstance) {
      this.reactFlowInstance.setViewport({
        x: snapshot.viewport.center.x,
        y: snapshot.viewport.center.y,
        zoom: snapshot.viewport.zoom,
      });
    }
  }

  // Layout algorithms (simplified implementations)
  private applyForceLayout(nodes: GraphNode[]): void {
    // Simple force-directed layout
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      node.position = {
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 100,
      };
    });
  }

  private applyDeterministicForceLayout(nodes: GraphNode[], options?: GraphLayout['options']): void {
    const {
      iterations = 300,
      strength = 100,
      distance = 150,
      center = { x: 400, y: 300 },
      preventOverlap = true,
      seed = 42
    } = options || {};

    if (nodes.length === 0) return;

    // Seeded random number generator for deterministic behavior
    let seedValue = seed;
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    // Initialize positions deterministically
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = Math.sqrt(nodes.length) * 30;

      node.position = {
        x: center.x + Math.cos(angle) * radius + (seededRandom() - 0.5) * 50,
        y: center.y + Math.sin(angle) * radius + (seededRandom() - 0.5) * 50,
      };
    });

    // Get edges for this layout calculation
    const edges = Array.from(this.edges.values());

    // Create adjacency map for connected nodes
    const adjacencyMap = new Map<string, string[]>();
    edges.forEach(edge => {
      if (!adjacencyMap.has(edge.source)) adjacencyMap.set(edge.source, []);
      if (!adjacencyMap.has(edge.target)) adjacencyMap.set(edge.target, []);
      adjacencyMap.get(edge.source)!.push(edge.target);
      adjacencyMap.get(edge.target)!.push(edge.source);
    });

    // Simulation loop
    for (let iteration = 0; iteration < iterations; iteration++) {
      const forces = new Map<string, { x: number; y: number }>();

      // Initialize forces
      nodes.forEach(node => {
        forces.set(node.id, { x: 0, y: 0 });
      });

      // Repulsion forces (all nodes repel each other)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];

          const dx = node2.position.x - node1.position.x;
          const dy = node2.position.y - node1.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1; // Avoid division by zero

          if (dist < distance * 2) {
            const force = (strength * strength) / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            const force1 = forces.get(node1.id)!;
            const force2 = forces.get(node2.id)!;

            force1.x -= fx;
            force1.y -= fy;
            force2.x += fx;
            force2.y += fy;
          }
        }
      }

      // Attraction forces (connected nodes attract each other)
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.position.x - sourceNode.position.x;
          const dy = targetNode.position.y - sourceNode.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;

          const force = (dist * dist) / (distance * strength);
          const fx = (dx / dist) * force * 0.1;
          const fy = (dy / dist) * force * 0.1;

          const sourceForce = forces.get(sourceNode.id)!;
          const targetForce = forces.get(targetNode.id)!;

          sourceForce.x += fx;
          sourceForce.y += fy;
          targetForce.x -= fx;
          targetForce.y -= fy;
        }
      });

      // Centering force (pull towards center)
      nodes.forEach(node => {
        const force = forces.get(node.id)!;
        force.x += (center.x - node.position.x) * 0.01;
        force.y += (center.y - node.position.y) * 0.01;
      });

      // Apply forces with cooling factor
      const cooling = Math.max(0.01, 1 - (iteration / iterations));
      const maxForce = 10;

      nodes.forEach(node => {
        const force = forces.get(node.id)!;

        // Limit force magnitude
        const forceMagnitude = Math.sqrt(force.x * force.x + force.y * force.y);
        if (forceMagnitude > maxForce) {
          force.x = (force.x / forceMagnitude) * maxForce;
          force.y = (force.y / forceMagnitude) * maxForce;
        }

        // Apply force with cooling
        node.position.x += force.x * cooling;
        node.position.y += force.y * cooling;
      });

      // Overlap prevention (if enabled)
      if (preventOverlap) {
        const minDistance = 120; // Minimum distance between node centers

        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const node1 = nodes[i];
            const node2 = nodes[j];

            const dx = node2.position.x - node1.position.x;
            const dy = node2.position.y - node1.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDistance && dist > 0) {
              const overlap = minDistance - dist;
              const moveX = (dx / dist) * (overlap / 2);
              const moveY = (dy / dist) * (overlap / 2);

              node1.position.x -= moveX;
              node1.position.y -= moveY;
              node2.position.x += moveX;
              node2.position.y += moveY;
            }
          }
        }
      }
    }
  }

  private applyD3ForceLayout(nodes: GraphNode[], options?: GraphLayout['options']): void {
    const {
      seed = 42,
      iterations = 300,
      linkDistance = 150,
      linkStrength = 1,
      chargeStrength = -300,
      centerStrength = 0.1,
      collisionRadius = 60,
      velocityDecay = 0.4,
      alpha = 1,
      alphaDecay = 0.0228
    } = options || {};

    logger.info('graph', 'D3 Force Layout starting', {
      nodeCount: nodes.length,
      iterations,
      linkDistance,
      chargeStrength,
      collisionRadius
    }, 'XYFlowProvider');

    if (nodes.length === 0) {
      logger.info('graph', 'D3 Force Layout: No nodes to layout', undefined, 'XYFlowProvider');
      return;
    }

    // Stop existing simulation if running
    if (this.d3Simulation) {
      this.d3Simulation.stop();
    }

    // Create deterministic random number generator
    const random = randomLcg(seed);

    // Convert GraphNodes to D3 nodes with deterministic positioning for new nodes
    const d3Nodes: D3Node[] = nodes.map((node, index) => {
      // For nodes at origin (new nodes), give them deterministic distributed positions
      if (node.position.x === 0 && node.position.y === 0) {
        // Use index for deterministic positioning around a circle
        const angle = (index / nodes.length) * 2 * Math.PI;
        const radius = 150 + (index % 3) * 50; // Deterministic radius variation
        return {
          id: node.id,
          type: node.type,
          label: node.label,
          x: Math.cos(angle) * radius + 400, // Center around 400,300
          y: Math.sin(angle) * radius + 300,
        };
      } else {
        // For positioned nodes, keep existing position with small deterministic jitter
        const nodeHash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const jitterX = ((nodeHash % 41) - 20); // -20 to 20 range, deterministic
        const jitterY = (((nodeHash * 17) % 41) - 20); // Different but deterministic
        return {
          id: node.id,
          type: node.type,
          label: node.label,
          x: node.position.x + jitterX,
          y: node.position.y + jitterY,
        };
      }
    });

    // Convert GraphEdges to D3 links
    const edges = Array.from(this.edges.values());
    const d3Links: D3Link[] = edges
      .filter(edge => {
        // Only include links where both nodes exist
        const sourceExists = d3Nodes.find(n => n.id === edge.source);
        const targetExists = d3Nodes.find(n => n.id === edge.target);
        return sourceExists && targetExists;
      })
      .map(edge => ({
        id: edge.id,
        type: edge.type,
        source: edge.source,
        target: edge.target,
      }));

    // Create simulation with deterministic random source
    this.d3Simulation = forceSimulation<D3Node>(d3Nodes)
      .randomSource(random)
      .velocityDecay(velocityDecay)
      .alpha(alpha)
      .alphaDecay(alphaDecay);

    // Configure forces
    this.d3Simulation
      .force('link', forceLink<D3Node, D3Link>(d3Links)
        .id(d => d.id)
        .distance(linkDistance)
        .strength(linkStrength))
      .force('charge', forceManyBody<D3Node>()
        .strength(chargeStrength))
      .force('center', forceCenter<D3Node>()
        .strength(centerStrength))
      .force('collision', forceCollide<D3Node>()
        .radius(collisionRadius)
        .strength(0.7));

    // Run simulation for specified iterations
    for (let i = 0; i < iterations; ++i) {
      this.d3Simulation.tick();
    }

    // Stop the simulation
    this.d3Simulation.stop();

    // Update GraphNode positions from D3 simulation
    d3Nodes.forEach(d3Node => {
      const graphNode = nodes.find(n => n.id === d3Node.id);
      if (graphNode && d3Node.x !== undefined && d3Node.y !== undefined) {
        graphNode.position = {
          x: d3Node.x,
          y: d3Node.y,
        };
      }
    });

    logger.info('graph', 'D3 Force Layout completed', {
      samplePositions: d3Nodes.slice(0, 3).map(n => ({ id: n.id, x: Math.round(n.x || 0), y: Math.round(n.y || 0) }))
    }, 'XYFlowProvider');
  }

  private applyHierarchicalLayout(nodes: GraphNode[]): void {
    // Simple hierarchical layout
    const levels = new Map<string, number>();
    const nodesPerLevel = new Map<number, GraphNode[]>();

    // Assign levels based on entity types
    nodes.forEach(node => {
      let level = 0;
      switch (node.type) {
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

      levels.set(node.id, level);
      if (!nodesPerLevel.has(level)) {
        nodesPerLevel.set(level, []);
      }
      nodesPerLevel.get(level)!.push(node);
    });

    // Position nodes
    nodesPerLevel.forEach((levelNodes, level) => {
      const y = level * 150 + 100;
      levelNodes.forEach((node, index) => {
        node.position = {
          x: (index - levelNodes.length / 2) * 200 + 400,
          y,
        };
      });
    });
  }

  private applyCircularLayout(nodes: GraphNode[]): void {
    const centerX = 400;
    const centerY = 300;
    const radius = Math.max(150, nodes.length * 20);

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      node.position = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
  }

  private applyGridLayout(nodes: GraphNode[]): void {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const spacing = 200;

    nodes.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      node.position = {
        x: col * spacing + 100,
        y: row * spacing + 100,
      };
    });
  }

  private updateReactFlow(): void {
    // This will be called by the React component to trigger re-renders
    // The actual update happens through React state management
  }

  // Get current XYFlow-compatible data
  getXYFlowData(): { nodes: XYNode[]; edges: XYEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()).map(node => this.toXYNode(node)),
      edges: Array.from(this.edges.values()).map(edge => this.toXYEdge(edge)),
    };
  }

  // Set ReactFlow instance reference (called by React component)
  setReactFlowInstance(instance: ReactFlowInstance | null): void {
    this.reactFlowInstance = instance;
  }

  // Handle node click (called by React component)
  handleNodeClick = (event: React.MouseEvent, xyNode: XYNode): void => {
    const node = this.nodes.get(xyNode.id);
    if (node && this.events.onNodeClick) {
      this.events.onNodeClick(node);
    }
  };

  // Handle node hover (called by React component)
  handleNodeHover = (event: React.MouseEvent, xyNode: XYNode | null): void => {
    const node = xyNode ? this.nodes.get(xyNode.id) : null;
    if (this.events.onNodeHover) {
      this.events.onNodeHover(node || null);
    }
  };

  // Handle node double click (called by React component)
  handleNodeDoubleClick = (event: React.MouseEvent, xyNode: XYNode): void => {
    const node = this.nodes.get(xyNode.id);
    if (node && this.events.onNodeDoubleClick) {
      this.events.onNodeDoubleClick(node);
    }
  };
}