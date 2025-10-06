/**
 * Integration test setup file
 * Provides mocks for dependencies used in integration tests that run in Node environment
 */

import { vi } from 'vitest';

// Mock createFileRoute for TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    createFileRoute: vi.fn(() => vi.fn(() => ({
      useParams: vi.fn(() => ({})),
      useSearch: vi.fn(() => ({})),
    }))),
    // Include other mocks from router-mocks if needed
    ...require('./utils/router-mocks').mockRouterHooks,
  };
});

// Mock stores/graph-store
vi.mock('@/stores/graph-store', () => ({
  useGraphStore: vi.fn(() => ({
    // Provide minimal implementation for integration tests
    totalNodeCount: 0,
    nodes: {},
    edges: {},
    isLoading: false,
    error: null,
    addNode: vi.fn(),
    addNodes: vi.fn(),
    removeNode: vi.fn(),
    updateNode: vi.fn(),
    getNode: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    clear: vi.fn(),
    setGraphData: vi.fn(),
    selectNode: vi.fn(),
    addToSelection: vi.fn(),
    removeFromSelection: vi.fn(),
    clearSelection: vi.fn(),
    pinNode: vi.fn(),
    unpinNode: vi.fn(),
    clearAllPinnedNodes: vi.fn(),
    isPinned: vi.fn(),
    setLayout: vi.fn(),
    toggleEntityTypeVisibility: vi.fn(),
    toggleEdgeTypeVisibility: vi.fn(),
    setEntityTypeVisibility: vi.fn(),
    setEdgeTypeVisibility: vi.fn(),
    setAllEntityTypesVisible: vi.fn(),
    resetEntityTypesToDefaults: vi.fn(),
    getEntityTypeStats: vi.fn(),
    getVisibleNodes: vi.fn(),
    setShowAllCachedNodes: vi.fn(),
    setTraversalDepth: vi.fn(),
    updateSearchStats: vi.fn(),
    markNodeAsLoading: vi.fn(),
    markNodeAsLoaded: vi.fn(),
    markNodeAsError: vi.fn(),
    calculateNodeDepths: vi.fn(),
    getNodesWithinDepth: vi.fn(),
    nodeDepths: {},
    getNeighbors: vi.fn(),
    getConnectedEdges: vi.fn(),
    findShortestPath: vi.fn(),
    getConnectedComponent: vi.fn(),
    cachedVisibleNodes: [],
    provider: null,
    providerType: null,
    setProvider: vi.fn(),
    setProviderType: vi.fn(),
    hasPlaceholderOrLoadingNodes: vi.fn(() => false),
  })),
}));