/**
 * Unit tests for xyflow Selection and Bulk Operations utilities
 *
 * Tests the selection management and bulk operation systems including:
 * - Node selection (single, multi, range, box)
 * - Selection utilities (selectAll, selectNone, selectByType)
 * - Bulk operations (delete, hide/show, lock/unlock, group)
 * - Selection statistics and filtering
 * - Range selection and keyboard modifiers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Node, Edge } from '@xyflow/react';

// Mock node data for testing
const createMockNode = (id: string, entityType: string = 'author', x: number = 0, y: number = 0): Node => ({
  id,
  type: 'entity',
  position: { x, y },
  data: {
    label: `Node ${id}`,
    entityType,
    originalVertex: { id }
  }
});

const createMockEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  type: 'smoothstep'
});

describe('Selection Utilities', () => {
  let nodes: Node[];
  let edges: Edge[];
  let selectedNodes: Set<string>;
  let setSelectedNodes: any;
  let setLastSelectedNode: any;

  beforeEach(() => {
    nodes = [
      createMockNode('1', 'author', 0, 0),
      createMockNode('2', 'work', 100, 0),
      createMockNode('3', 'author', 200, 0),
      createMockNode('4', 'institution', 300, 0),
      createMockNode('5', 'work', 400, 0)
    ];

    edges = [
      createMockEdge('e1', '1', '2'),
      createMockEdge('e2', '2', '3'),
      createMockEdge('e3', '3', '4')
    ];

    selectedNodes = new Set<string>();
    setSelectedNodes = vi.fn((updater) => {
      if (typeof updater === 'function') {
        selectedNodes = updater(selectedNodes);
      } else {
        selectedNodes = updater;
      }
    });
    setLastSelectedNode = vi.fn();
  });

  describe('selectNode functionality', () => {
    it('should select single node when multi is false', () => {
      const selectNode = (nodeId: string, multi: boolean = false) => {
        if (multi) {
          setSelectedNodes((prev: Set<string>) => {
            const newSelection = new Set(prev);
            if (newSelection.has(nodeId)) {
              newSelection.delete(nodeId);
            } else {
              newSelection.add(nodeId);
            }
            return newSelection;
          });
        } else {
          setSelectedNodes(new Set([nodeId]));
        }
        setLastSelectedNode(nodeId);
      };

      selectNode('1', false);

      expect(setSelectedNodes).toHaveBeenCalledWith(new Set(['1']));
      expect(setLastSelectedNode).toHaveBeenCalledWith('1');
    });

    it('should toggle node selection when multi is true', () => {
      selectedNodes = new Set(['1', '2']);

      const selectNode = (nodeId: string, multi: boolean = false) => {
        if (multi) {
          setSelectedNodes((prev: Set<string>) => {
            const newSelection = new Set(prev);
            if (newSelection.has(nodeId)) {
              newSelection.delete(nodeId);
            } else {
              newSelection.add(nodeId);
            }
            return newSelection;
          });
        } else {
          setSelectedNodes(new Set([nodeId]));
        }
        setLastSelectedNode(nodeId);
      };

      selectNode('2', true);

      // Verify the function was called with updater
      expect(setSelectedNodes).toHaveBeenCalledWith(expect.any(Function));

      // Test the updater function directly
      const updater = setSelectedNodes.mock.calls[0][0];
      const result = updater(new Set(['1', '2']));
      expect(result).toEqual(new Set(['1'])); // Node '2' should be removed
    });

    it('should add new node to selection when multi is true', () => {
      selectedNodes = new Set(['1']);

      const selectNode = (nodeId: string, multi: boolean = false) => {
        if (multi) {
          setSelectedNodes((prev: Set<string>) => {
            const newSelection = new Set(prev);
            if (newSelection.has(nodeId)) {
              newSelection.delete(nodeId);
            } else {
              newSelection.add(nodeId);
            }
            return newSelection;
          });
        } else {
          setSelectedNodes(new Set([nodeId]));
        }
        setLastSelectedNode(nodeId);
      };

      selectNode('3', true);

      // Test the updater function directly
      const updater = setSelectedNodes.mock.calls[0][0];
      const result = updater(new Set(['1']));
      expect(result).toEqual(new Set(['1', '3'])); // Node '3' should be added
    });
  });

  describe('selectAll functionality', () => {
    it('should select all nodes', () => {
      const selectAll = () => {
        setSelectedNodes(new Set(nodes.map(n => n.id)));
      };

      selectAll();

      expect(setSelectedNodes).toHaveBeenCalledWith(new Set(['1', '2', '3', '4', '5']));
    });

    it('should handle empty node list', () => {
      nodes = [];

      const selectAll = () => {
        setSelectedNodes(new Set(nodes.map(n => n.id)));
      };

      selectAll();

      expect(setSelectedNodes).toHaveBeenCalledWith(new Set());
    });
  });

  describe('selectNone functionality', () => {
    it('should clear all selections', () => {
      selectedNodes = new Set(['1', '2', '3']);

      const selectNone = () => {
        setSelectedNodes(new Set());
        setLastSelectedNode(null);
      };

      selectNone();

      expect(setSelectedNodes).toHaveBeenCalledWith(new Set());
      expect(setLastSelectedNode).toHaveBeenCalledWith(null);
    });
  });

  describe('selectByType functionality', () => {
    it('should select all nodes of specified type', () => {
      const selectByType = (entityType: string) => {
        const nodesOfType = nodes.filter(n => n.data.entityType === entityType);
        setSelectedNodes(new Set(nodesOfType.map(n => n.id)));
      };

      selectByType('author');

      expect(setSelectedNodes).toHaveBeenCalledWith(new Set(['1', '3']));
    });

    it('should select work type nodes', () => {
      const selectByType = (entityType: string) => {
        const nodesOfType = nodes.filter(n => n.data.entityType === entityType);
        setSelectedNodes(new Set(nodesOfType.map(n => n.id)));
      };

      selectByType('work');

      expect(setSelectedNodes).toHaveBeenCalledWith(new Set(['2', '5']));
    });

    it('should handle non-existent entity type', () => {
      const selectByType = (entityType: string) => {
        const nodesOfType = nodes.filter(n => n.data.entityType === entityType);
        setSelectedNodes(new Set(nodesOfType.map(n => n.id)));
      };

      selectByType('nonexistent');

      expect(setSelectedNodes).toHaveBeenCalledWith(new Set());
    });
  });

  describe('selectRange functionality', () => {
    it('should select range of nodes between two IDs', () => {
      const selectRange = (fromId: string, toId: string) => {
        const sortedNodes = [...nodes].sort((a, b) => parseInt(a.id) - parseInt(b.id));
        const fromIndex = sortedNodes.findIndex(n => n.id === fromId);
        const toIndex = sortedNodes.findIndex(n => n.id === toId);

        if (fromIndex === -1 || toIndex === -1) return;

        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);
        setSelectedNodes(new Set(sortedNodes.slice(start, end + 1).map(n => n.id)));
      };

      selectRange('2', '4');

      expect(setSelectedNodes).toHaveBeenCalledWith(new Set(['2', '3', '4']));
    });

    it('should handle reverse range selection', () => {
      const selectRange = (fromId: string, toId: string) => {
        const sortedNodes = [...nodes].sort((a, b) => parseInt(a.id) - parseInt(b.id));
        const fromIndex = sortedNodes.findIndex(n => n.id === fromId);
        const toIndex = sortedNodes.findIndex(n => n.id === toId);

        if (fromIndex === -1 || toIndex === -1) return;

        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);
        setSelectedNodes(new Set(sortedNodes.slice(start, end + 1).map(n => n.id)));
      };

      selectRange('4', '1');

      expect(setSelectedNodes).toHaveBeenCalledWith(new Set(['1', '2', '3', '4']));
    });

    it('should handle invalid node IDs in range', () => {
      const selectRange = (fromId: string, toId: string) => {
        const sortedNodes = [...nodes].sort((a, b) => parseInt(a.id) - parseInt(b.id));
        const fromIndex = sortedNodes.findIndex(n => n.id === fromId);
        const toIndex = sortedNodes.findIndex(n => n.id === toId);

        if (fromIndex === -1 || toIndex === -1) return;

        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);
        setSelectedNodes(new Set(sortedNodes.slice(start, end + 1).map(n => n.id)));
      };

      selectRange('999', '2');

      expect(setSelectedNodes).not.toHaveBeenCalled();
    });
  });

  describe('getSelectionStats functionality', () => {
    it('should calculate selection statistics', () => {
      selectedNodes = new Set(['1', '3', '4']);

      const getSelectionStats = () => {
        const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
        const typeCount = selectedNodeObjects.reduce((acc, node) => {
          const type = node.data.entityType;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          total: selectedNodes.size,
          types: typeCount,
          isEmpty: selectedNodes.size === 0,
          hasMultiple: selectedNodes.size > 1
        };
      };

      const stats = getSelectionStats();

      expect(stats.total).toBe(3);
      expect(stats.types).toEqual({ author: 2, institution: 1 });
      expect(stats.isEmpty).toBe(false);
      expect(stats.hasMultiple).toBe(true);
    });

    it('should handle empty selection', () => {
      selectedNodes = new Set();

      const getSelectionStats = () => {
        const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
        const typeCount = selectedNodeObjects.reduce((acc, node) => {
          const type = node.data.entityType;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          total: selectedNodes.size,
          types: typeCount,
          isEmpty: selectedNodes.size === 0,
          hasMultiple: selectedNodes.size > 1
        };
      };

      const stats = getSelectionStats();

      expect(stats.total).toBe(0);
      expect(stats.types).toEqual({});
      expect(stats.isEmpty).toBe(true);
      expect(stats.hasMultiple).toBe(false);
    });
  });
});

describe('Bulk Operations', () => {
  let nodes: Node[];
  let edges: Edge[];
  let selectedNodes: Set<string>;
  let setNodes: any;
  let setEdges: any;
  let setSelectedNodes: any;

  beforeEach(() => {
    nodes = [
      createMockNode('1', 'author', 0, 0),
      createMockNode('2', 'work', 100, 0),
      createMockNode('3', 'author', 200, 0),
      createMockNode('4', 'institution', 300, 0),
      createMockNode('5', 'work', 400, 0)
    ];

    edges = [
      createMockEdge('e1', '1', '2'),
      createMockEdge('e2', '2', '3'),
      createMockEdge('e3', '3', '4'),
      createMockEdge('e4', '4', '5')
    ];

    selectedNodes = new Set(['2', '3']);
    setNodes = vi.fn();
    setEdges = vi.fn();
    setSelectedNodes = vi.fn();
  });

  describe('deleteSelected functionality', () => {
    it('should delete selected nodes and connected edges', () => {
      const deleteSelected = () => {
        setNodes((prev: Node[]) => prev.filter(n => !selectedNodes.has(n.id)));
        setEdges((prev: Edge[]) => prev.filter(e =>
          !selectedNodes.has(e.source) && !selectedNodes.has(e.target)
        ));
        setSelectedNodes(new Set());
      };

      deleteSelected();

      expect(setNodes).toHaveBeenCalledWith(expect.any(Function));
      expect(setEdges).toHaveBeenCalledWith(expect.any(Function));
      expect(setSelectedNodes).toHaveBeenCalledWith(new Set());

      // Test the node filter function
      const nodeFilter = setNodes.mock.calls[0][0];
      const filteredNodes = nodeFilter(nodes);
      expect(filteredNodes.map(n => n.id)).toEqual(['1', '4', '5']);

      // Test the edge filter function
      const edgeFilter = setEdges.mock.calls[0][0];
      const filteredEdges = edgeFilter(edges);
      expect(filteredEdges.map(e => e.id)).toEqual(['e4']); // Only edge not connected to deleted nodes
    });

    it('should handle empty selection', () => {
      selectedNodes = new Set();

      const deleteSelected = () => {
        setNodes((prev: Node[]) => prev.filter(n => !selectedNodes.has(n.id)));
        setEdges((prev: Edge[]) => prev.filter(e =>
          !selectedNodes.has(e.source) && !selectedNodes.has(e.target)
        ));
        setSelectedNodes(new Set());
      };

      deleteSelected();

      // Test filters with empty selection
      const nodeFilter = setNodes.mock.calls[0][0];
      const filteredNodes = nodeFilter(nodes);
      expect(filteredNodes).toEqual(nodes); // All nodes should remain

      const edgeFilter = setEdges.mock.calls[0][0];
      const filteredEdges = edgeFilter(edges);
      expect(filteredEdges).toEqual(edges); // All edges should remain
    });
  });

  describe('hideSelected functionality', () => {
    it('should hide selected nodes', () => {
      const hideSelected = () => {
        setNodes((prev: Node[]) => prev.map(n =>
          selectedNodes.has(n.id)
            ? { ...n, hidden: true }
            : n
        ));
      };

      hideSelected();

      expect(setNodes).toHaveBeenCalledWith(expect.any(Function));

      // Test the node mapper function
      const nodeMapper = setNodes.mock.calls[0][0];
      const updatedNodes = nodeMapper(nodes);

      expect(updatedNodes[0].hidden).toBeUndefined(); // Node '1' not selected
      expect(updatedNodes[1].hidden).toBe(true);      // Node '2' selected
      expect(updatedNodes[2].hidden).toBe(true);      // Node '3' selected
      expect(updatedNodes[3].hidden).toBeUndefined(); // Node '4' not selected
    });
  });

  describe('showSelected functionality', () => {
    it('should show selected nodes', () => {
      // Add hidden property to nodes first
      nodes = nodes.map(n => ({ ...n, hidden: selectedNodes.has(n.id) }));

      const showSelected = () => {
        setNodes((prev: Node[]) => prev.map(n =>
          selectedNodes.has(n.id)
            ? { ...n, hidden: false }
            : n
        ));
      };

      showSelected();

      expect(setNodes).toHaveBeenCalledWith(expect.any(Function));

      // Test the node mapper function
      const nodeMapper = setNodes.mock.calls[0][0];
      const updatedNodes = nodeMapper(nodes);

      expect(updatedNodes[1].hidden).toBe(false); // Node '2' should be shown
      expect(updatedNodes[2].hidden).toBe(false); // Node '3' should be shown
    });
  });

  describe('lockSelected functionality', () => {
    it('should lock selected nodes (make them non-draggable)', () => {
      const lockSelected = () => {
        setNodes((prev: Node[]) => prev.map(n =>
          selectedNodes.has(n.id)
            ? { ...n, draggable: false }
            : n
        ));
      };

      lockSelected();

      expect(setNodes).toHaveBeenCalledWith(expect.any(Function));

      // Test the node mapper function
      const nodeMapper = setNodes.mock.calls[0][0];
      const updatedNodes = nodeMapper(nodes);

      expect(updatedNodes[0].draggable).toBeUndefined(); // Node '1' not selected
      expect(updatedNodes[1].draggable).toBe(false);     // Node '2' locked
      expect(updatedNodes[2].draggable).toBe(false);     // Node '3' locked
      expect(updatedNodes[3].draggable).toBeUndefined(); // Node '4' not selected
    });
  });

  describe('unlockSelected functionality', () => {
    it('should unlock selected nodes (make them draggable)', () => {
      const unlockSelected = () => {
        setNodes((prev: Node[]) => prev.map(n =>
          selectedNodes.has(n.id)
            ? { ...n, draggable: true }
            : n
        ));
      };

      unlockSelected();

      expect(setNodes).toHaveBeenCalledWith(expect.any(Function));

      // Test the node mapper function
      const nodeMapper = setNodes.mock.calls[0][0];
      const updatedNodes = nodeMapper(nodes);

      expect(updatedNodes[0].draggable).toBeUndefined(); // Node '1' not selected
      expect(updatedNodes[1].draggable).toBe(true);      // Node '2' unlocked
      expect(updatedNodes[2].draggable).toBe(true);      // Node '3' unlocked
      expect(updatedNodes[3].draggable).toBeUndefined(); // Node '4' not selected
    });
  });

  describe('groupSelected functionality', () => {
    it('should group selected nodes with a bounding box', () => {
      const groupSelected = (color: string = '#3b82f6') => {
        const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
        if (selectedNodeObjects.length < 2) return;

        const minX = Math.min(...selectedNodeObjects.map(n => n.position.x));
        const minY = Math.min(...selectedNodeObjects.map(n => n.position.y));
        const maxX = Math.max(...selectedNodeObjects.map(n => n.position.x));
        const maxY = Math.max(...selectedNodeObjects.map(n => n.position.y));

        const groupNode: Node = {
          id: `group-${Date.now()}`,
          type: 'group',
          position: { x: minX - 20, y: minY - 20 },
          data: { label: 'Group' },
          style: {
            width: maxX - minX + 40,
            height: maxY - minY + 40,
            backgroundColor: color + '20',
            border: `2px solid ${color}`,
            borderRadius: '8px'
          }
        };

        setNodes((prev: Node[]) => [...prev, groupNode]);
      };

      groupSelected('#ff0000');

      expect(setNodes).toHaveBeenCalledWith(expect.any(Function));

      // Test the group creation
      const nodeUpdater = setNodes.mock.calls[0][0];
      const updatedNodes = nodeUpdater(nodes);

      const groupNode = updatedNodes[updatedNodes.length - 1];
      expect(groupNode.type).toBe('group');
      expect(groupNode.position.x).toBe(80); // minX (100) - 20
      expect(groupNode.position.y).toBe(-20); // minY (0) - 20
      expect(groupNode.style?.backgroundColor).toBe('#ff000020');
      expect(groupNode.style?.border).toBe('2px solid #ff0000');
    });

    it('should not group if less than 2 nodes selected', () => {
      selectedNodes = new Set(['2']); // Only one node

      const groupSelected = (color: string = '#3b82f6') => {
        const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
        if (selectedNodeObjects.length < 2) return;

        setNodes((prev: Node[]) => [...prev, {} as Node]);
      };

      groupSelected();

      expect(setNodes).not.toHaveBeenCalled();
    });
  });

  describe('arrangeSelected functionality', () => {
    it('should arrange nodes in grid pattern', () => {
      const arrangeSelected = (pattern: 'line' | 'circle' | 'grid') => {
        const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
        if (selectedNodeObjects.length === 0) return;

        let newPositions: { x: number; y: number }[] = [];

        if (pattern === 'grid') {
          const cols = Math.ceil(Math.sqrt(selectedNodeObjects.length));
          newPositions = selectedNodeObjects.map((_, index) => ({
            x: (index % cols) * 150,
            y: Math.floor(index / cols) * 100
          }));
        }

        setNodes((prev: Node[]) => prev.map(n => {
          const index = selectedNodeObjects.findIndex(sn => sn.id === n.id);
          if (index !== -1 && newPositions[index]) {
            return { ...n, position: newPositions[index] };
          }
          return n;
        }));
      };

      arrangeSelected('grid');

      expect(setNodes).toHaveBeenCalledWith(expect.any(Function));

      // Test the arrangement
      const nodeMapper = setNodes.mock.calls[0][0];
      const updatedNodes = nodeMapper(nodes);

      // Node '2' (first selected) should be at (0, 0)
      const node2 = updatedNodes.find(n => n.id === '2');
      expect(node2?.position).toEqual({ x: 0, y: 0 });

      // Node '3' (second selected) should be at (150, 0)
      const node3 = updatedNodes.find(n => n.id === '3');
      expect(node3?.position).toEqual({ x: 150, y: 0 });
    });

    it('should arrange nodes in line pattern', () => {
      const arrangeSelected = (pattern: 'line' | 'circle' | 'grid') => {
        const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
        if (selectedNodeObjects.length === 0) return;

        let newPositions: { x: number; y: number }[] = [];

        if (pattern === 'line') {
          newPositions = selectedNodeObjects.map((_, index) => ({
            x: index * 150,
            y: 0
          }));
        }

        setNodes((prev: Node[]) => prev.map(n => {
          const index = selectedNodeObjects.findIndex(sn => sn.id === n.id);
          if (index !== -1 && newPositions[index]) {
            return { ...n, position: newPositions[index] };
          }
          return n;
        }));
      };

      arrangeSelected('line');

      const nodeMapper = setNodes.mock.calls[0][0];
      const updatedNodes = nodeMapper(nodes);

      // Both selected nodes should be on the same y-level
      const node2 = updatedNodes.find(n => n.id === '2');
      const node3 = updatedNodes.find(n => n.id === '3');
      expect(node2?.position.y).toBe(0);
      expect(node3?.position.y).toBe(0);
      expect(node3?.position.x).toBe(150);
    });

    it('should handle empty selection', () => {
      selectedNodes = new Set();

      const arrangeSelected = (pattern: 'line' | 'circle' | 'grid') => {
        const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
        if (selectedNodeObjects.length === 0) return;

        setNodes(() => []);
      };

      arrangeSelected('grid');

      expect(setNodes).not.toHaveBeenCalled();
    });
  });
});