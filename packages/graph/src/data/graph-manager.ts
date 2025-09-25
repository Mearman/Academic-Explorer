/**
 * Core graph state management (UI-agnostic)
 * Provides CRUD operations, querying, and statistics for graph data
 */

import { EventEmitter } from 'events';
import type { GraphNode, GraphEdge, EntityType } from '../types/core';
import type { GraphStats, Community } from '../types/core';
import type { GraphSnapshot } from './graph-repository';
import { RelationType } from '../types/core';

export interface GraphManagerOptions {
  maxNodes?: number;
  maxEdges?: number;
  enableStatistics?: boolean;
  enableCommunityDetection?: boolean;
}

export interface GraphChangeEvent {
  type: 'node:added' | 'node:removed' | 'edge:added' | 'edge:removed' | 'graph:cleared';
  nodeId?: string;
  edgeId?: string;
  node?: GraphNode;
  edge?: GraphEdge;
}

export class GraphManager {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private eventEmitter = new EventEmitter();
  private options: Required<GraphManagerOptions>;

  // Adjacency lists for efficient neighbor lookups
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();

  constructor(options: GraphManagerOptions = {}) {
    this.options = {
      maxNodes: options.maxNodes ?? 10000,
      maxEdges: options.maxEdges ?? 50000,
      enableStatistics: options.enableStatistics ?? true,
      enableCommunityDetection: options.enableCommunityDetection ?? false,
    };
  }

  // ========== CRUD Operations ==========

  /**
   * Add a node to the graph
   */
  addNode(node: GraphNode): void {
    if (this.nodes.size >= this.options.maxNodes) {
      throw new Error(`Maximum node limit reached (${this.options.maxNodes})`);
    }

    this.nodes.set(node.entityId, node);

    // Initialize adjacency list
    if (!this.adjacencyList.has(node.entityId)) {
      this.adjacencyList.set(node.entityId, new Set());
      this.reverseAdjacencyList.set(node.entityId, new Set());
    }

    this.eventEmitter.emit('node:added', {
      type: 'node:added',
      nodeId: node.entityId,
      node,
    } as GraphChangeEvent);
  }

  /**
   * Remove a node and all connected edges
   */
  removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    // Remove all edges connected to this node
    const connectedEdges = this.getNodeEdges(nodeId);
    connectedEdges.forEach(edge => this.removeEdge(edge.id));

    // Remove from adjacency lists
    this.adjacencyList.delete(nodeId);
    this.reverseAdjacencyList.delete(nodeId);

    // Clean up references in other adjacency lists
    this.adjacencyList.forEach(neighbors => neighbors.delete(nodeId));
    this.reverseAdjacencyList.forEach(neighbors => neighbors.delete(nodeId));

    // Remove the node
    this.nodes.delete(nodeId);

    this.eventEmitter.emit('node:removed', {
      type: 'node:removed',
      nodeId,
      node,
    } as GraphChangeEvent);

    return true;
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edge: GraphEdge): void {
    if (this.edges.size >= this.options.maxEdges) {
      throw new Error(`Maximum edge limit reached (${this.options.maxEdges})`);
    }

    // Validate that source and target nodes exist
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      throw new Error(`Cannot add edge: source or target node does not exist (${edge.source} -> ${edge.target})`);
    }

    this.edges.set(edge.id, edge);

    // Update adjacency lists
    this.adjacencyList.get(edge.source)?.add(edge.target);
    this.reverseAdjacencyList.get(edge.target)?.add(edge.source);

    this.eventEmitter.emit('edge:added', {
      type: 'edge:added',
      edgeId: edge.id,
      edge,
    } as GraphChangeEvent);
  }

  /**
   * Remove an edge from the graph
   */
  removeEdge(edgeId: string): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;

    // Update adjacency lists
    this.adjacencyList.get(edge.source)?.delete(edge.target);
    this.reverseAdjacencyList.get(edge.target)?.delete(edge.source);

    this.edges.delete(edgeId);

    this.eventEmitter.emit('edge:removed', {
      type: 'edge:removed',
      edgeId,
      edge,
    } as GraphChangeEvent);

    return true;
  }

  // ========== Query Methods ==========

  /**
   * Get a node by ID
   */
  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) || null;
  }

  /**
   * Get all nodes
   */
  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  getEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get neighbors of a node
   */
  getNeighbors(nodeId: string): GraphNode[] {
    const neighborIds = this.adjacencyList.get(nodeId);
    if (!neighborIds) return [];

    return Array.from(neighborIds)
      .map(id => this.nodes.get(id))
      .filter((node): node is GraphNode => node !== undefined);
  }

  /**
   * Get incoming neighbors (nodes that point to this node)
   */
  getIncomingNeighbors(nodeId: string): GraphNode[] {
    const neighborIds = this.reverseAdjacencyList.get(nodeId);
    if (!neighborIds) return [];

    return Array.from(neighborIds)
      .map(id => this.nodes.get(id))
      .filter((node): node is GraphNode => node !== undefined);
  }

  /**
   * Get all edges connected to a node
   */
  getNodeEdges(nodeId: string): GraphEdge[] {
    return this.getEdges().filter(
      edge => edge.source === nodeId || edge.target === nodeId
    );
  }

  /**
   * Find shortest path between two nodes using BFS
   */
  getPath(from: string, to: string): GraphNode[] {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      return [];
    }

    if (from === to) {
      const node = this.nodes.get(from);
      return node ? [node] : [];
    }

    const queue: string[] = [from];
    const visited = new Set<string>([from]);
    const parent = new Map<string, string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.adjacencyList.get(current) || new Set();

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, current);
          queue.push(neighbor);

          if (neighbor === to) {
            // Reconstruct path
            const path: string[] = [];
            let node = to;
            while (node !== from) {
              path.unshift(node);
              node = parent.get(node)!;
            }
            path.unshift(from);

            return path.map(id => this.nodes.get(id)!);
          }
        }
      }
    }

    return []; // No path found
  }

  /**
   * Get nodes by entity type
   */
  getNodesByType(entityType: EntityType): GraphNode[] {
    return this.getNodes().filter(node => node.entityType === entityType);
  }

  /**
   * Get edges by relation type
   */
  getEdgesByType(relationType: RelationType): GraphEdge[] {
    return this.getEdges().filter(edge => edge.type === relationType);
  }

  // ========== Statistics and Analysis ==========

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    if (!this.options.enableStatistics) {
      throw new Error('Statistics are disabled. Enable them in GraphManagerOptions.');
    }

    const nodes = this.getNodes();
    const edges = this.getEdges();

    // Count by entity type
    const nodesByType = nodes.reduce((acc, node) => {
      acc[node.entityType] = (acc[node.entityType] || 0) + 1;
      return acc;
    }, {} as Record<EntityType, number>);

    // Count by relation type
    const edgesByType = edges.reduce((acc, edge) => {
      acc[edge.type] = (acc[edge.type] || 0) + 1;
      return acc;
    }, {} as Record<RelationType, number>);

    // Calculate degree statistics
    const degrees = nodes.map(node =>
      (this.adjacencyList.get(node.entityId)?.size || 0) +
      (this.reverseAdjacencyList.get(node.entityId)?.size || 0)
    );

    const avgDegree = degrees.length > 0 ? degrees.reduce((sum, d) => sum + d, 0) / degrees.length : 0;
    const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;

    // Calculate density
    const maxPossibleEdges = nodes.length * (nodes.length - 1) / 2;
    const density = maxPossibleEdges > 0 ? edges.length / maxPossibleEdges : 0;

    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodesByType,
      edgesByType,
      avgDegree,
      maxDegree,
      density,
      connectedComponents: this.getConnectedComponents().length,
    };
  }

  /**
   * Get connected components
   */
  getConnectedComponents(): GraphNode[][] {
    const visited = new Set<string>();
    const components: GraphNode[][] = [];

    for (const node of this.nodes.values()) {
      if (!visited.has(node.entityId)) {
        const component = this.dfsComponent(node.entityId, visited);
        components.push(component);
      }
    }

    return components;
  }

  /**
   * DFS to find connected component
   */
  private dfsComponent(startId: string, visited: Set<string>): GraphNode[] {
    const component: GraphNode[] = [];
    const stack = [startId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      const node = this.nodes.get(nodeId);
      if (node) {
        component.push(node);

        // Add all neighbors to stack
        const neighbors = this.adjacencyList.get(nodeId) || new Set();
        const incomingNeighbors = this.reverseAdjacencyList.get(nodeId) || new Set();

        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) stack.push(neighborId);
        }
        for (const neighborId of incomingNeighbors) {
          if (!visited.has(neighborId)) stack.push(neighborId);
        }
      }
    }

    return component;
  }

  /**
   * Detect communities (basic implementation)
   */
  detectCommunities(): Community[] {
    if (!this.options.enableCommunityDetection) {
      throw new Error('Community detection is disabled. Enable it in GraphManagerOptions.');
    }

    // Simple community detection based on connected components
    // In a real implementation, you might use more sophisticated algorithms
    // like Louvain, Leiden, or modularity optimization

    const components = this.getConnectedComponents();
    return components.map((nodes, index) => ({
      id: `community_${index}`,
      nodes: nodes.map(n => n.entityId),
      size: nodes.length,
      density: this.calculateComponentDensity(nodes),
    }));
  }

  /**
   * Calculate density of a component
   */
  private calculateComponentDensity(nodes: GraphNode[]): number {
    if (nodes.length <= 1) return 0;

    const nodeIds = new Set(nodes.map(n => n.entityId));
    const edgesInComponent = this.getEdges().filter(
      edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    const maxPossibleEdges = nodes.length * (nodes.length - 1) / 2;
    return maxPossibleEdges > 0 ? edgesInComponent.length / maxPossibleEdges : 0;
  }

  // ========== Bulk Operations ==========

  /**
   * Add multiple nodes and edges
   */
  addGraphData(nodes: GraphNode[], edges: GraphEdge[]): void {
    // Add nodes first
    for (const node of nodes) {
      this.addNode(node);
    }

    // Then add edges
    for (const edge of edges) {
      this.addEdge(edge);
    }
  }

  /**
   * Clear all graph data
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();

    this.eventEmitter.emit('graph:cleared', {
      type: 'graph:cleared',
    } as GraphChangeEvent);
  }

  /**
   * Create a snapshot of the current graph state
   */
  createSnapshot(): GraphSnapshot {
    const stats = this.options.enableStatistics ? this.getStats() : undefined;
    return {
      id: `snapshot-${Date.now()}`,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      timestamp: Date.now(),
      version: '1.0.0',
      metadata: {
        nodeCount: this.nodes.size,
        edgeCount: this.edges.size,
        stats,
      },
    };
  }

  /**
   * Load graph data from a snapshot
   */
  loadFromSnapshot(snapshot: GraphSnapshot): void {
    this.clear();
    this.addGraphData(snapshot.nodes, snapshot.edges);
  }

  // ========== Event System ==========

  /**
   * Subscribe to graph changes
   */
  on(event: string, listener: (data: GraphChangeEvent) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from graph changes
   */
  off(event: string, listener: (data: GraphChangeEvent) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Get current node and edge counts
   */
  getSize(): { nodes: number; edges: number } {
    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
    };
  }

  /**
   * Check if graph is empty
   */
  isEmpty(): boolean {
    return this.nodes.size === 0 && this.edges.size === 0;
  }
}