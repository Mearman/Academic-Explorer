/**
 * Unit tests for decoupled graph navigation system
 * Tests the provider abstraction and graph store functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGraphProvider, isProviderSupported } from './provider-factory';
import { XYFlowProvider } from './providers/xyflow/xyflow-provider';
import type { GraphNode, GraphEdge, EntityType } from './types';
import { RelationType } from './types';

describe('Graph Navigation System', () => {
  describe('Provider Factory', () => {
    it('should create XYFlow provider', () => {
      const provider = createGraphProvider('xyflow');
      expect(provider).toBeInstanceOf(XYFlowProvider);
    });

    it('should throw error for unsupported providers', () => {
      expect(() => createGraphProvider('d3' as never)).toThrow('D3 provider not yet implemented');
      expect(() => createGraphProvider('cytoscape' as never)).toThrow('Cytoscape provider not yet implemented');
    });

    it('should correctly identify supported providers', () => {
      expect(isProviderSupported('xyflow')).toBe(true);
      expect(isProviderSupported('d3')).toBe(false);
      expect(isProviderSupported('cytoscape')).toBe(false);
      expect(isProviderSupported('invalid')).toBe(false);
    });
  });

  describe('XYFlow Provider', () => {
    let provider: XYFlowProvider;
    let mockContainer: HTMLElement;

    beforeEach(() => {
      provider = createGraphProvider('xyflow') as XYFlowProvider;
      mockContainer = document.createElement('div');
    });

    it('should initialize without error', async () => {
      await expect(provider.initialize(mockContainer)).resolves.toBeUndefined();
    });

    it('should manage nodes correctly', () => {
      const testNode: GraphNode = {
        id: 'test1',
        type: 'authors' as EntityType,
        label: 'Test Author',
        entityId: 'A123456789',
        position: { x: 100, y: 100 },
        externalIds: [
          {
            type: 'orcid',
            value: '0000-0000-0000-0000',
            url: 'https://orcid.org/0000-0000-0000-0000'
          }
        ]
      };

      // Add node
      provider.addNode(testNode);
      const xyData = provider.getXYFlowData();
      expect(xyData.nodes).toHaveLength(1);
      expect(xyData.nodes[0].id).toBe('test1');
      expect(xyData.nodes[0].data.label).toBe('Test Author');

      // Remove node
      provider.removeNode('test1');
      const xyDataAfterRemoval = provider.getXYFlowData();
      expect(xyDataAfterRemoval.nodes).toHaveLength(0);
    });

    it('should manage edges correctly', () => {
      const testNodes: GraphNode[] = [
        {
          id: 'author1',
          type: 'authors' as EntityType,
          label: 'Author 1',
          entityId: 'A123456789',
          position: { x: 100, y: 100 },
          externalIds: []
        },
        {
          id: 'work1',
          type: 'works' as EntityType,
          label: 'Work 1',
          entityId: 'W123456789',
          position: { x: 200, y: 100 },
          externalIds: []
        }
      ];

      const testEdge: GraphEdge = {
        id: 'edge1',
        source: 'author1',
        target: 'work1',
        type: RelationType.AUTHORED,
        label: 'authored',
        weight: 1.0
      };

      // Add nodes and edge
      provider.setNodes(testNodes);
      provider.addEdge(testEdge);

      const xyData = provider.getXYFlowData();
      expect(xyData.edges).toHaveLength(1);
      expect(xyData.edges[0].id).toBe('edge1');
      expect(xyData.edges[0].source).toBe('author1');
      expect(xyData.edges[0].target).toBe('work1');

      // Remove edge
      provider.removeEdge('edge1');
      const xyDataAfterRemoval = provider.getXYFlowData();
      expect(xyDataAfterRemoval.edges).toHaveLength(0);
    });

    it('should handle events correctly', () => {
      const mockOnNodeClick = vi.fn();
      const mockOnNodeHover = vi.fn();

      provider.setEvents({
        onNodeClick: mockOnNodeClick,
        onNodeHover: mockOnNodeHover,
      });

      const testNode: GraphNode = {
        id: 'test1',
        type: 'authors' as EntityType,
        label: 'Test Author',
        entityId: 'A123456789',
        position: { x: 100, y: 100 },
        externalIds: []
      };

      provider.addNode(testNode);
      const xyData = provider.getXYFlowData();

      // Simulate node click
      const mockEvent = {} as React.MouseEvent;
      provider.handleNodeClick(mockEvent, xyData.nodes[0]);
      expect(mockOnNodeClick).toHaveBeenCalledWith(testNode);

      // Simulate node hover
      provider.handleNodeHover(mockEvent, xyData.nodes[0]);
      expect(mockOnNodeHover).toHaveBeenCalledWith(testNode);
    });

    it('should create snapshots correctly', () => {
      const testNodes: GraphNode[] = [
        {
          id: 'author1',
          type: 'authors' as EntityType,
          label: 'Author 1',
          entityId: 'A123456789',
          position: { x: 100, y: 100 },
          externalIds: []
        }
      ];

      const testEdges: GraphEdge[] = [
        {
          id: 'edge1',
          source: 'author1',
          target: 'work1',
          type: RelationType.AUTHORED
        }
      ];

      provider.setNodes(testNodes);
      provider.setEdges(testEdges);

      const snapshot = provider.getSnapshot();
      expect(snapshot.nodes).toHaveLength(1);
      expect(snapshot.edges).toHaveLength(1);
      expect(snapshot.nodes[0].id).toBe('author1');
      expect(snapshot.edges[0].id).toBe('edge1');
    });

    it('should clear all data correctly', () => {
      const testNode: GraphNode = {
        id: 'test1',
        type: 'authors' as EntityType,
        label: 'Test Author',
        entityId: 'A123456789',
        position: { x: 100, y: 100 },
        externalIds: []
      };

      provider.addNode(testNode);
      expect(provider.getXYFlowData().nodes).toHaveLength(1);

      provider.clear();
      expect(provider.getXYFlowData().nodes).toHaveLength(0);
      expect(provider.getXYFlowData().edges).toHaveLength(0);
    });
  });
});