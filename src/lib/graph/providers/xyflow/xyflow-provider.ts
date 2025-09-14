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

export class XYFlowProvider implements GraphProvider {
  private container: HTMLElement | null = null;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private events: GraphEvents = {};
  private reactFlowInstance: ReactFlowInstance | null = null;
  private mounted = false;

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
  }

  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);
    this.updateReactFlow();
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

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.updateReactFlow();
  }

  applyLayout(layout: GraphLayout): void {
    if (!this.reactFlowInstance) return;

    const nodes = Array.from(this.nodes.values());

    switch (layout.type) {
      case 'force':
        this.applyForceLayout(nodes);
        break;
      case 'force-deterministic':
        this.applyDeterministicForceLayout(nodes, layout.options);
        break;
      case 'hierarchical':
        this.applyHierarchicalLayout(nodes);
        break;
      case 'circular':
        this.applyCircularLayout(nodes);
        break;
      case 'grid':
        this.applyGridLayout(nodes);
        break;
    }

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