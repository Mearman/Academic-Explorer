/**
 * Unit tests for xyflow Layout Persistence System
 *
 * Tests the layout persistence functionality including:
 * - Layout saving and loading
 * - Auto-save functionality
 * - Layout history management
 * - Import/export operations
 * - Layout statistics calculation
 * - LocalStorage integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const mockStorage = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage.get(key) || null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
  clear: vi.fn(() => mockStorage.clear())
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock DOM APIs for file operations
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn()
} as any;

global.Blob = vi.fn((content, options) => ({
  type: options?.type || 'application/octet-stream',
  size: content?.[0]?.length || 0
})) as any;

// Create a simplified layout persistence system for testing
interface LayoutData {
  id: string;
  name: string;
  timestamp: number;
  layout: {
    nodes: any[];
    edges: any[];
    viewport: { x: number; y: number; zoom: number };
  };
  metadata: {
    nodeCount: number;
    edgeCount: number;
    algorithm: string;
    description?: string;
  };
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  snapshot: { nodes: any[]; edges: any[]; viewport: any };
}

class LayoutPersistenceTest {
  private savedLayouts: Record<string, LayoutData> = {};
  private layoutHistory: HistoryEntry[] = [];
  private currentNodes: any[] = [];
  private currentEdges: any[] = [];
  private currentViewport = { x: 0, y: 0, zoom: 1 };

  constructor() {
    this.loadFromStorage();
  }

  saveLayout(name: string, description?: string): string | null {
    if (!name.trim()) return null;

    const layoutId = `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const layoutData: LayoutData = {
      id: layoutId,
      name: name.trim(),
      timestamp: Date.now(),
      layout: {
        nodes: [...this.currentNodes],
        edges: [...this.currentEdges],
        viewport: { ...this.currentViewport }
      },
      metadata: {
        nodeCount: this.currentNodes.length,
        edgeCount: this.currentEdges.length,
        algorithm: 'test-algorithm',
        description: description?.trim()
      }
    };

    this.savedLayouts[layoutId] = layoutData;
    this.saveToStorage();

    return layoutId;
  }

  loadLayout(layoutId: string): boolean {
    const layoutData = this.savedLayouts[layoutId] || this.loadLayoutFromStorage(layoutId);

    if (!layoutData) return false;

    try {
      // Create history entry before applying layout
      const currentSnapshot = {
        nodes: [...this.currentNodes],
        edges: [...this.currentEdges],
        viewport: { ...this.currentViewport }
      };

      this.layoutHistory = [
        ...this.layoutHistory.slice(-9), // Keep last 10 entries
        {
          id: `history_${Date.now()}`,
          timestamp: Date.now(),
          action: `Applied layout: ${layoutData.name}`,
          snapshot: currentSnapshot
        }
      ];

      // Apply the layout
      this.currentNodes = [...layoutData.layout.nodes];
      this.currentEdges = [...layoutData.layout.edges];
      this.currentViewport = { ...layoutData.layout.viewport };

      return true;
    } catch (error) {
      return false;
    }
  }

  deleteLayout(layoutId: string): void {
    delete this.savedLayouts[layoutId];
    this.saveToStorage();

    // Remove from localStorage
    try {
      const allLayouts = JSON.parse(localStorage.getItem('xyflow_saved_layouts') || '{}');
      delete allLayouts[layoutId];
      localStorage.setItem('xyflow_saved_layouts', JSON.stringify(allLayouts));
    } catch (error) {
      // Ignore storage errors
    }
  }

  autoSave(): void {
    const autoSaveData: LayoutData = {
      id: 'autosave_current',
      name: 'Auto-saved',
      timestamp: Date.now(),
      layout: {
        nodes: [...this.currentNodes],
        edges: [...this.currentEdges],
        viewport: { ...this.currentViewport }
      },
      metadata: {
        nodeCount: this.currentNodes.length,
        edgeCount: this.currentEdges.length,
        algorithm: 'auto',
        description: 'Automatically saved layout'
      }
    };

    try {
      localStorage.setItem('xyflow_autosave', JSON.stringify(autoSaveData));
    } catch (error) {
      // Ignore storage errors
    }
  }

  restoreAutoSave(): boolean {
    try {
      const autoSaveData = JSON.parse(localStorage.getItem('xyflow_autosave') || 'null');
      if (autoSaveData) {
        this.currentNodes = [...autoSaveData.layout.nodes];
        this.currentEdges = [...autoSaveData.layout.edges];
        this.currentViewport = { ...autoSaveData.layout.viewport };
        return true;
      }
    } catch (error) {
      // Ignore storage errors
    }
    return false;
  }

  createSnapshot(action: string): void {
    const snapshot: HistoryEntry = {
      id: `snapshot_${Date.now()}`,
      timestamp: Date.now(),
      action,
      snapshot: {
        nodes: [...this.currentNodes],
        edges: [...this.currentEdges],
        viewport: { ...this.currentViewport }
      }
    };

    this.layoutHistory = [
      ...this.layoutHistory.slice(-9), // Keep last 10 entries
      snapshot
    ];
  }

  undo(): boolean {
    if (this.layoutHistory.length === 0) return false;

    const previousState = this.layoutHistory[this.layoutHistory.length - 1];
    this.layoutHistory = this.layoutHistory.slice(0, -1);

    try {
      this.currentNodes = [...previousState.snapshot.nodes];
      this.currentEdges = [...previousState.snapshot.edges];
      this.currentViewport = { ...previousState.snapshot.viewport };
      return true;
    } catch (error) {
      return false;
    }
  }

  exportLayout(layoutId?: string): any {
    const layoutData = layoutId ? this.savedLayouts[layoutId] : {
      id: `export_${Date.now()}`,
      name: 'Current Layout',
      timestamp: Date.now(),
      layout: {
        nodes: [...this.currentNodes],
        edges: [...this.currentEdges],
        viewport: { ...this.currentViewport }
      },
      metadata: {
        nodeCount: this.currentNodes.length,
        edgeCount: this.currentEdges.length,
        algorithm: 'current'
      }
    };

    if (!layoutData) return null;

    const exportData = {
      version: '1.0',
      exported: new Date().toISOString(),
      layout: layoutData
    };

    return exportData;
  }

  async importLayout(fileContent: string): Promise<string | null> {
    try {
      const importData = JSON.parse(fileContent);

      if (importData.version && importData.layout) {
        const layoutData = importData.layout;
        const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const finalLayoutData: LayoutData = {
          ...layoutData,
          id: importId,
          name: `${layoutData.name} (Imported)`,
          timestamp: Date.now()
        };

        this.savedLayouts[importId] = finalLayoutData;
        this.saveToStorage();

        return importId;
      }
    } catch (error) {
      // Import failed
    }
    return null;
  }

  getLayoutStats() {
    const layouts = Object.values(this.savedLayouts);
    return {
      totalLayouts: layouts.length,
      totalNodes: layouts.reduce((sum, layout) => sum + layout.metadata.nodeCount, 0),
      totalEdges: layouts.reduce((sum, layout) => sum + layout.metadata.edgeCount, 0),
      algorithms: [...new Set(layouts.map(layout => layout.metadata.algorithm))],
      oldestLayout: layouts.length > 0 ? Math.min(...layouts.map(layout => layout.timestamp)) : null,
      newestLayout: layouts.length > 0 ? Math.max(...layouts.map(layout => layout.timestamp)) : null,
      historyEntries: this.layoutHistory.length
    };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('xyflow_saved_layouts', JSON.stringify(this.savedLayouts));
    } catch (error) {
      // Ignore storage errors
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('xyflow_saved_layouts');
      if (stored) {
        this.savedLayouts = JSON.parse(stored);
      }
    } catch (error) {
      this.savedLayouts = {};
    }
  }

  private loadLayoutFromStorage(layoutId: string): LayoutData | null {
    try {
      const allLayouts = JSON.parse(localStorage.getItem('xyflow_saved_layouts') || '{}');
      return allLayouts[layoutId] || null;
    } catch (error) {
      return null;
    }
  }

  // Test utilities
  setCurrentGraph(nodes: any[], edges: any[], viewport: any): void {
    this.currentNodes = [...nodes];
    this.currentEdges = [...edges];
    this.currentViewport = { ...viewport };
  }

  getCurrentGraph() {
    return {
      nodes: [...this.currentNodes],
      edges: [...this.currentEdges],
      viewport: { ...this.currentViewport }
    };
  }

  getSavedLayouts() {
    return { ...this.savedLayouts };
  }

  getLayoutHistory() {
    return [...this.layoutHistory];
  }

  reset(): void {
    this.savedLayouts = {};
    this.layoutHistory = [];
    this.currentNodes = [];
    this.currentEdges = [];
    this.currentViewport = { x: 0, y: 0, zoom: 1 };
    mockStorage.clear();
  }
}

describe('Layout Persistence System', () => {
  let layoutPersistence: LayoutPersistenceTest;

  beforeEach(() => {
    layoutPersistence = new LayoutPersistenceTest();
    vi.clearAllMocks();
    mockStorage.clear();
  });

  afterEach(() => {
    layoutPersistence.reset();
  });

  describe('layout saving', () => {
    it('should save layout with valid name', () => {
      const nodes = [{ id: '1', data: { label: 'Node 1' } }];
      const edges = [{ id: 'e1', source: '1', target: '2' }];
      const viewport = { x: 100, y: 200, zoom: 1.5 };

      layoutPersistence.setCurrentGraph(nodes, edges, viewport);

      const layoutId = layoutPersistence.saveLayout('Test Layout', 'Test description');

      expect(layoutId).toBeTruthy();
      expect(layoutId).toMatch(/^layout_\d+_/);

      const savedLayouts = layoutPersistence.getSavedLayouts();
      expect(savedLayouts[layoutId!]).toBeDefined();
      expect(savedLayouts[layoutId!].name).toBe('Test Layout');
      expect(savedLayouts[layoutId!].metadata.description).toBe('Test description');
    });

    it('should not save layout with empty name', () => {
      const layoutId = layoutPersistence.saveLayout('   ');

      expect(layoutId).toBeNull();
      expect(Object.keys(layoutPersistence.getSavedLayouts())).toHaveLength(0);
    });

    it('should trim layout name and description', () => {
      const nodes = [{ id: '1', data: { label: 'Node 1' } }];
      layoutPersistence.setCurrentGraph(nodes, [], { x: 0, y: 0, zoom: 1 });

      const layoutId = layoutPersistence.saveLayout('  Test Layout  ', '  Test description  ');

      const savedLayouts = layoutPersistence.getSavedLayouts();
      expect(savedLayouts[layoutId!].name).toBe('Test Layout');
      expect(savedLayouts[layoutId!].metadata.description).toBe('Test description');
    });

    it('should save layout metadata correctly', () => {
      const nodes = [
        { id: '1', data: { label: 'Node 1' } },
        { id: '2', data: { label: 'Node 2' } }
      ];
      const edges = [{ id: 'e1', source: '1', target: '2' }];
      const viewport = { x: 50, y: 100, zoom: 0.8 };

      layoutPersistence.setCurrentGraph(nodes, edges, viewport);

      const layoutId = layoutPersistence.saveLayout('Test Layout');

      const savedLayouts = layoutPersistence.getSavedLayouts();
      const layout = savedLayouts[layoutId!];

      expect(layout.metadata.nodeCount).toBe(2);
      expect(layout.metadata.edgeCount).toBe(1);
      expect(layout.metadata.algorithm).toBe('test-algorithm');
      expect(layout.timestamp).toBeGreaterThan(0);
    });

    it('should save layout to localStorage', () => {
      const nodes = [{ id: '1', data: { label: 'Node 1' } }];
      layoutPersistence.setCurrentGraph(nodes, [], { x: 0, y: 0, zoom: 1 });

      layoutPersistence.saveLayout('Test Layout');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'xyflow_saved_layouts',
        expect.any(String)
      );
    });
  });

  describe('layout loading', () => {
    it('should load existing layout successfully', () => {
      const originalNodes = [{ id: '1', data: { label: 'Node 1' } }];
      const originalEdges = [{ id: 'e1', source: '1', target: '2' }];
      const originalViewport = { x: 100, y: 200, zoom: 1.5 };

      layoutPersistence.setCurrentGraph(originalNodes, originalEdges, originalViewport);
      const layoutId = layoutPersistence.saveLayout('Test Layout');

      // Change current graph
      layoutPersistence.setCurrentGraph([], [], { x: 0, y: 0, zoom: 1 });

      // Load the saved layout
      const success = layoutPersistence.loadLayout(layoutId!);

      expect(success).toBe(true);

      const currentGraph = layoutPersistence.getCurrentGraph();
      expect(currentGraph.nodes).toEqual(originalNodes);
      expect(currentGraph.edges).toEqual(originalEdges);
      expect(currentGraph.viewport).toEqual(originalViewport);
    });

    it('should return false for non-existent layout', () => {
      const success = layoutPersistence.loadLayout('non-existent-id');

      expect(success).toBe(false);
    });

    it('should create history entry when loading layout', () => {
      const originalNodes = [{ id: '1', data: { label: 'Node 1' } }];
      layoutPersistence.setCurrentGraph(originalNodes, [], { x: 0, y: 0, zoom: 1 });
      const layoutId = layoutPersistence.saveLayout('Test Layout');

      // Change current graph
      const newNodes = [{ id: '2', data: { label: 'Node 2' } }];
      layoutPersistence.setCurrentGraph(newNodes, [], { x: 10, y: 20, zoom: 1.2 });

      const historyBefore = layoutPersistence.getLayoutHistory().length;

      layoutPersistence.loadLayout(layoutId!);

      const historyAfter = layoutPersistence.getLayoutHistory();
      expect(historyAfter.length).toBe(historyBefore + 1);
      expect(historyAfter[historyAfter.length - 1].action).toContain('Applied layout: Test Layout');
      expect(historyAfter[historyAfter.length - 1].snapshot.nodes).toEqual(newNodes);
    });
  });

  describe('layout deletion', () => {
    it('should delete layout from memory', () => {
      const nodes = [{ id: '1', data: { label: 'Node 1' } }];
      layoutPersistence.setCurrentGraph(nodes, [], { x: 0, y: 0, zoom: 1 });
      const layoutId = layoutPersistence.saveLayout('Test Layout');

      layoutPersistence.deleteLayout(layoutId!);

      const savedLayouts = layoutPersistence.getSavedLayouts();
      expect(savedLayouts[layoutId!]).toBeUndefined();
    });

    it('should update localStorage when deleting layout', () => {
      const nodes = [{ id: '1', data: { label: 'Node 1' } }];
      layoutPersistence.setCurrentGraph(nodes, [], { x: 0, y: 0, zoom: 1 });
      const layoutId = layoutPersistence.saveLayout('Test Layout');

      layoutPersistence.deleteLayout(layoutId!);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'xyflow_saved_layouts',
        expect.any(String)
      );
    });
  });

  describe('auto-save functionality', () => {
    it('should save current state to auto-save slot', () => {
      const nodes = [{ id: '1', data: { label: 'Node 1' } }];
      const edges = [{ id: 'e1', source: '1', target: '2' }];
      const viewport = { x: 50, y: 100, zoom: 1.2 };

      layoutPersistence.setCurrentGraph(nodes, edges, viewport);
      layoutPersistence.autoSave();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'xyflow_autosave',
        expect.any(String)
      );

      const autoSaveCall = mockLocalStorage.setItem.mock.calls.find(
        call => call[0] === 'xyflow_autosave'
      );
      const autoSaveData = JSON.parse(autoSaveCall![1]);

      expect(autoSaveData.name).toBe('Auto-saved');
      expect(autoSaveData.layout.nodes).toEqual(nodes);
      expect(autoSaveData.layout.edges).toEqual(edges);
      expect(autoSaveData.layout.viewport).toEqual(viewport);
    });

    it('should restore from auto-save when data exists', () => {
      const autoSaveData = {
        id: 'autosave_current',
        name: 'Auto-saved',
        timestamp: Date.now(),
        layout: {
          nodes: [{ id: '1', data: { label: 'Auto Node' } }],
          edges: [{ id: 'e1', source: '1', target: '2' }],
          viewport: { x: 25, y: 50, zoom: 0.9 }
        },
        metadata: {
          nodeCount: 1,
          edgeCount: 1,
          algorithm: 'auto',
          description: 'Automatically saved layout'
        }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(autoSaveData));

      const success = layoutPersistence.restoreAutoSave();

      expect(success).toBe(true);

      const currentGraph = layoutPersistence.getCurrentGraph();
      expect(currentGraph.nodes).toEqual(autoSaveData.layout.nodes);
      expect(currentGraph.edges).toEqual(autoSaveData.layout.edges);
      expect(currentGraph.viewport).toEqual(autoSaveData.layout.viewport);
    });

    it('should return false when no auto-save data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const success = layoutPersistence.restoreAutoSave();

      expect(success).toBe(false);
    });
  });

  describe('layout history management', () => {
    it('should create history snapshots', () => {
      const nodes = [{ id: '1', data: { label: 'Node 1' } }];
      const edges = [{ id: 'e1', source: '1', target: '2' }];
      const viewport = { x: 10, y: 20, zoom: 1.1 };

      layoutPersistence.setCurrentGraph(nodes, edges, viewport);
      layoutPersistence.createSnapshot('Test action');

      const history = layoutPersistence.getLayoutHistory();
      expect(history.length).toBe(1);
      expect(history[0].action).toBe('Test action');
      expect(history[0].snapshot.nodes).toEqual(nodes);
      expect(history[0].snapshot.edges).toEqual(edges);
      expect(history[0].snapshot.viewport).toEqual(viewport);
    });

    it('should limit history to 10 entries', () => {
      // Create 15 snapshots
      for (let i = 0; i < 15; i++) {
        layoutPersistence.createSnapshot(`Action ${i}`);
      }

      const history = layoutPersistence.getLayoutHistory();
      expect(history.length).toBe(10);
      expect(history[0].action).toBe('Action 5'); // First 5 should be removed
      expect(history[9].action).toBe('Action 14');
    });

    it('should undo to previous state', () => {
      const initialNodes = [{ id: '1', data: { label: 'Initial' } }];
      const initialViewport = { x: 0, y: 0, zoom: 1 };

      layoutPersistence.setCurrentGraph(initialNodes, [], initialViewport);
      layoutPersistence.createSnapshot('Initial state');

      // Change state
      const newNodes = [{ id: '2', data: { label: 'Changed' } }];
      const newViewport = { x: 100, y: 200, zoom: 1.5 };
      layoutPersistence.setCurrentGraph(newNodes, [], newViewport);

      // Undo
      const success = layoutPersistence.undo();

      expect(success).toBe(true);

      const currentGraph = layoutPersistence.getCurrentGraph();
      expect(currentGraph.nodes).toEqual(initialNodes);
      expect(currentGraph.viewport).toEqual(initialViewport);

      // History should be reduced by one
      expect(layoutPersistence.getLayoutHistory().length).toBe(0);
    });

    it('should return false when no history to undo', () => {
      const success = layoutPersistence.undo();

      expect(success).toBe(false);
    });
  });

  describe('import/export functionality', () => {
    it('should export layout as valid JSON structure', () => {
      const nodes = [{ id: '1', data: { label: 'Node 1' } }];
      const edges = [{ id: 'e1', source: '1', target: '2' }];
      const viewport = { x: 50, y: 100, zoom: 1.2 };

      layoutPersistence.setCurrentGraph(nodes, edges, viewport);

      const exportData = layoutPersistence.exportLayout();

      expect(exportData).toHaveProperty('version', '1.0');
      expect(exportData).toHaveProperty('exported');
      expect(exportData).toHaveProperty('layout');
      expect(exportData.layout.layout.nodes).toEqual(nodes);
      expect(exportData.layout.layout.edges).toEqual(edges);
      expect(exportData.layout.layout.viewport).toEqual(viewport);
    });

    it('should export specific saved layout', () => {
      const nodes = [{ id: '1', data: { label: 'Node 1' } }];
      layoutPersistence.setCurrentGraph(nodes, [], { x: 0, y: 0, zoom: 1 });
      const layoutId = layoutPersistence.saveLayout('Saved Layout');

      const exportData = layoutPersistence.exportLayout(layoutId!);

      expect(exportData.layout.name).toBe('Saved Layout');
      expect(exportData.layout.layout.nodes).toEqual(nodes);
    });

    it('should import layout from valid JSON', async () => {
      const importData = {
        version: '1.0',
        exported: new Date().toISOString(),
        layout: {
          id: 'test-id',
          name: 'Imported Layout',
          timestamp: Date.now(),
          layout: {
            nodes: [{ id: '1', data: { label: 'Imported Node' } }],
            edges: [],
            viewport: { x: 75, y: 150, zoom: 1.3 }
          },
          metadata: {
            nodeCount: 1,
            edgeCount: 0,
            algorithm: 'imported'
          }
        }
      };

      const importId = await layoutPersistence.importLayout(JSON.stringify(importData));

      expect(importId).toBeTruthy();
      expect(importId).toMatch(/^import_\d+_/);

      const savedLayouts = layoutPersistence.getSavedLayouts();
      expect(savedLayouts[importId!]).toBeDefined();
      expect(savedLayouts[importId!].name).toBe('Imported Layout (Imported)');
      expect(savedLayouts[importId!].layout.nodes).toEqual(importData.layout.layout.nodes);
    });

    it('should return null for invalid import data', async () => {
      const invalidJson = '{ invalid json';
      const importId = await layoutPersistence.importLayout(invalidJson);

      expect(importId).toBeNull();
    });

    it('should return null for import data without required fields', async () => {
      const invalidData = { someField: 'value' };
      const importId = await layoutPersistence.importLayout(JSON.stringify(invalidData));

      expect(importId).toBeNull();
    });
  });

  describe('layout statistics', () => {
    beforeEach(() => {
      // Create some test layouts
      layoutPersistence.setCurrentGraph([{ id: '1' }], [{ id: 'e1' }], { x: 0, y: 0, zoom: 1 });
      layoutPersistence.saveLayout('Layout 1');

      layoutPersistence.setCurrentGraph([{ id: '1' }, { id: '2' }], [], { x: 0, y: 0, zoom: 1 });
      layoutPersistence.saveLayout('Layout 2');

      layoutPersistence.createSnapshot('Test snapshot');
    });

    it('should calculate layout statistics correctly', () => {
      const stats = layoutPersistence.getLayoutStats();

      expect(stats.totalLayouts).toBe(2);
      expect(stats.totalNodes).toBe(3); // 1 + 2
      expect(stats.totalEdges).toBe(1); // 1 + 0
      expect(stats.algorithms).toEqual(['test-algorithm']);
      expect(stats.historyEntries).toBe(1);
      expect(stats.oldestLayout).toBeGreaterThan(0);
      expect(stats.newestLayout).toBeGreaterThanOrEqual(stats.oldestLayout);
    });

    it('should handle empty statistics', () => {
      layoutPersistence.reset();

      const stats = layoutPersistence.getLayoutStats();

      expect(stats.totalLayouts).toBe(0);
      expect(stats.totalNodes).toBe(0);
      expect(stats.totalEdges).toBe(0);
      expect(stats.algorithms).toEqual([]);
      expect(stats.oldestLayout).toBeNull();
      expect(stats.newestLayout).toBeNull();
      expect(stats.historyEntries).toBe(0);
    });
  });

  describe('localStorage integration', () => {
    it('should load layouts from localStorage on initialization', () => {
      const savedData = {
        'layout_1': {
          id: 'layout_1',
          name: 'Stored Layout',
          timestamp: Date.now(),
          layout: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
          metadata: { nodeCount: 0, edgeCount: 0, algorithm: 'stored' }
        }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedData));

      const newPersistence = new LayoutPersistenceTest();
      const layouts = newPersistence.getSavedLayouts();

      expect(layouts['layout_1']).toBeDefined();
      expect(layouts['layout_1'].name).toBe('Stored Layout');
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => new LayoutPersistenceTest()).not.toThrow();

      const persistence = new LayoutPersistenceTest();
      expect(Object.keys(persistence.getSavedLayouts())).toHaveLength(0);
    });
  });
});