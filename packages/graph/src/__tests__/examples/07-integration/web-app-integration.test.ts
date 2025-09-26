/**
 * Example: Web Application Integration
 *
 * Demonstrates: Integration patterns for React/web applications
 * Use cases: React hooks, state management, UI integration, real-time updates
 * Prerequisites: Understanding of React patterns and web application architecture
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenAlexGraphProvider, ProviderRegistry } from '../../../providers';
import type { GraphNode, GraphEdge } from '../../../types/core';

// Mock React-like hooks and state management
interface WebAppState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  loading: boolean;
  error: string | null;
  searchResults: GraphNode[];
}

class MockWebAppStateManager {
  private state: WebAppState = {
    nodes: [],
    edges: [],
    selectedNode: null,
    loading: false,
    error: null,
    searchResults: []
  };

  private listeners = new Set<(state: WebAppState) => void>();

  getState(): WebAppState {
    return { ...this.state };
  }

  setState(updates: Partial<WebAppState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener: (state: WebAppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

// Mock React hook-like interface
class MockGraphDataHook {
  constructor(
    private provider: OpenAlexGraphProvider,
    private stateManager: MockWebAppStateManager
  ) {}

  async fetchEntity(entityId: string): Promise<void> {
    this.stateManager.setState({ loading: true, error: null });

    try {
      const node = await this.provider.fetchEntity(entityId);
      const currentState = this.stateManager.getState();

      // Add node if not already present
      const existingNodeIndex = currentState.nodes.findIndex(n => n.id === node.id);
      const updatedNodes = existingNodeIndex >= 0
        ? currentState.nodes.map((n, i) => i === existingNodeIndex ? node : n)
        : [...currentState.nodes, node];

      this.stateManager.setState({
        nodes: updatedNodes,
        loading: false,
        selectedNode: node
      });
    } catch (error) {
      this.stateManager.setState({
        loading: false,
        error: (error as Error).message
      });
    }
  }

  async expandEntity(entityId: string, options = { limit: 10 }): Promise<void> {
    this.stateManager.setState({ loading: true, error: null });

    try {
      const expansion = await this.provider.expandEntity(entityId, options);
      const currentState = this.stateManager.getState();

      // Merge new nodes and edges
      const nodeMap = new Map(currentState.nodes.map(n => [n.id, n]));
      expansion.nodes.forEach(node => nodeMap.set(node.id, node));

      const edgeMap = new Map(currentState.edges.map(e => [e.id, e]));
      expansion.edges.forEach(edge => edgeMap.set(edge.id, edge));

      this.stateManager.setState({
        nodes: Array.from(nodeMap.values()),
        edges: Array.from(edgeMap.values()),
        loading: false
      });
    } catch (error) {
      this.stateManager.setState({
        loading: false,
        error: (error as Error).message
      });
    }
  }

  async searchEntities(query: string, entityTypes: string[] = ['works', 'authors']): Promise<void> {
    this.stateManager.setState({ loading: true, error: null });

    try {
      const results = await this.provider.searchEntities({
        query,
        entityTypes: entityTypes as any,
        limit: 20
      });

      this.stateManager.setState({
        searchResults: results,
        loading: false
      });
    } catch (error) {
      this.stateManager.setState({
        loading: false,
        error: (error as Error).message
      });
    }
  }

  clearGraph(): void {
    this.stateManager.setState({
      nodes: [],
      edges: [],
      selectedNode: null,
      error: null
    });
  }

  setSelectedNode(nodeId: string | null): void {
    const currentState = this.stateManager.getState();
    const selectedNode = nodeId
      ? currentState.nodes.find(n => n.id === nodeId) || null
      : null;

    this.stateManager.setState({ selectedNode });
  }
}

// Mock URL router integration
class MockRouter {
  private currentRoute = '/';
  private listeners = new Set<(route: string) => void>();

  navigate(route: string): void {
    this.currentRoute = route;
    this.listeners.forEach(listener => listener(route));
  }

  getCurrentRoute(): string {
    return this.currentRoute;
  }

  onRouteChange(listener: (route: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  parseEntityRoute(route: string): { entityType: string; entityId: string } | null {
    const match = route.match(/^\/(\w+)\/([A-Za-z0-9]+)$/);
    return match ? { entityType: match[1], entityId: match[2] } : null;
  }
}

// Mock client for testing
class WebAppMockClient {
  async getAuthor(id: string): Promise<Record<string, unknown>> {
    return {
      id,
      display_name: `Author ${id.slice(-3)}`,
      ids: { openalex: id },
      works_count: 25,
      cited_by_count: 890
    };
  }

  async getWork(id: string): Promise<Record<string, unknown>> {
    return {
      id,
      title: `Research Paper ${id.slice(-3)}`,
      display_name: `Research Paper ${id.slice(-3)}`,
      publication_year: 2023,
      cited_by_count: 145,
      authorships: [
        {
          author: { id: 'A5017898742', display_name: 'Dr. Test Author' },
          institutions: [{ id: 'I27837315', display_name: 'Test University' }]
        }
      ]
    };
  }

  async getSource(): Promise<Record<string, unknown>> { return {}; }
  async getInstitution(): Promise<Record<string, unknown>> { return {}; }
  async get(): Promise<Record<string, unknown>> { return {}; }

  // Search methods required for searchEntities functionality
  async works(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    const limit = (params.per_page as number) || 10;
    const query = (params.search as string) || '';

    // Generate enough results for pagination testing
    const results = Array.from({ length: limit }, (_, i) => ({
      id: `W${2000000000 + i}`,
      display_name: `${query} Research Paper ${i + 1}`,
      publication_year: 2023 - (i % 5),
      cited_by_count: Math.floor(Math.random() * 1000),
      authorships: [
        {
          author: { id: 'A5017898742', display_name: 'Test Author' },
          institutions: [{ id: 'I27837315', display_name: 'Test University' }]
        }
      ]
    }));

    return { results };
  }

  async authors(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    const limit = (params.per_page as number) || 10;
    const query = (params.search as string) || '';

    const results = Array.from({ length: limit }, (_, i) => ({
      id: `A${3000000000 + i}`,
      display_name: `${query} Author ${i + 1}`,
      ids: { openalex: `A${3000000000 + i}` },
      works_count: 15 + i,
      cited_by_count: 500 + i * 50
    }));

    return { results };
  }

  async sources(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    const limit = (params.per_page as number) || 10;
    const query = (params.search as string) || '';

    const results = Array.from({ length: limit }, (_, i) => ({
      id: `S${4000000000 + i}`,
      display_name: `${query} Journal ${i + 1}`,
      issn_l: `1234-567${i}`,
      works_count: 1000 + i * 100
    }));

    return { results };
  }

  async institutions(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    const limit = (params.per_page as number) || 10;
    const query = (params.search as string) || '';

    const results = Array.from({ length: limit }, (_, i) => ({
      id: `I${5000000000 + i}`,
      display_name: `${query} University ${i + 1}`,
      country_code: 'US',
      works_count: 5000 + i * 500,
      cited_by_count: 10000 + i * 1000
    }));

    return { results };
  }
}

describe('Example: Web Application Integration', () => {
  let provider: OpenAlexGraphProvider;
  let registry: ProviderRegistry;
  let stateManager: MockWebAppStateManager;
  let graphHook: MockGraphDataHook;
  let router: MockRouter;
  let mockClient: WebAppMockClient;

  beforeEach(async () => {
    mockClient = new WebAppMockClient();
    provider = new OpenAlexGraphProvider(mockClient, {
      name: 'web-app-test'
    });

    registry = new ProviderRegistry();
    registry.register(provider);

    stateManager = new MockWebAppStateManager();
    graphHook = new MockGraphDataHook(provider, stateManager);
    router = new MockRouter();
  });

  afterEach(() => {
    provider.destroy();
    registry.destroy();
  });

  describe('React Hook Integration Patterns', () => {
    it('demonstrates entity loading and state management', async () => {
      // Given: Initial empty state
      expect(stateManager.getState().nodes).toHaveLength(0);
      expect(stateManager.getState().loading).toBe(false);

      // When: Loading an entity
      const loadPromise = graphHook.fetchEntity('A5017898742');
      expect(stateManager.getState().loading).toBe(true);

      await loadPromise;

      // Then: State should be updated with entity
      const state = stateManager.getState();
      expect(state.loading).toBe(false);
      expect(state.nodes).toHaveLength(1);
      expect(state.selectedNode).toMatchObject({
        id: 'A5017898742',
        entityType: 'authors',
        label: 'Author 742'
      });
      expect(state.error).toBeNull();
    });

    it('demonstrates graph expansion with state merging', async () => {
      // Given: Initial entity in state
      await graphHook.fetchEntity('A5017898742');
      const initialState = stateManager.getState();
      expect(initialState.nodes).toHaveLength(1);

      // When: Expanding the entity
      await graphHook.expandEntity('A5017898742', { limit: 5 });

      // Then: State should include expanded nodes and edges
      const expandedState = stateManager.getState();
      expect(expandedState.nodes.length).toBeGreaterThan(1);
      expect(expandedState.edges.length).toBeGreaterThan(0);

      // Best Practice: Original node should still be present
      expect(expandedState.nodes.some(n => n.id === 'A5017898742')).toBe(true);
    });

    it('demonstrates search functionality with results management', async () => {
      // Given: Empty search results
      expect(stateManager.getState().searchResults).toHaveLength(0);

      // When: Searching for entities
      await graphHook.searchEntities('machine learning', ['works', 'authors']);

      // Then: Search results should be populated
      const state = stateManager.getState();
      expect(state.searchResults.length).toBeGreaterThan(0);
      expect(state.loading).toBe(false);

      // Best Practice: Results should include both entity types
      const entityTypes = new Set(state.searchResults.map(r => r.entityType));
      expect(entityTypes.size).toBeGreaterThan(0);
    });

    it('demonstrates error handling in UI context', async () => {
      // Given: Provider that will throw errors
      const errorProvider = new OpenAlexGraphProvider({
        ...mockClient,
        getAuthor: () => Promise.reject(new Error('API temporarily unavailable'))
      } as any, { name: 'error-test' });

      const errorGraphHook = new MockGraphDataHook(errorProvider, stateManager);

      // When: Attempting to load entity that will fail
      await errorGraphHook.fetchEntity('A5017898742');

      // Then: Error should be captured in state
      const state = stateManager.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('API temporarily unavailable');
      expect(state.nodes).toHaveLength(0);

      // Best Practice: Error state should be clearable
      graphHook.clearGraph();
      expect(stateManager.getState().error).toBeNull();

      errorProvider.destroy();
    });

    it('demonstrates reactive state updates', async () => {
      // Given: State listener to track updates
      const stateUpdates: WebAppState[] = [];
      const unsubscribe = stateManager.subscribe(state => {
        stateUpdates.push({ ...state });
      });

      // When: Performing multiple operations
      await graphHook.fetchEntity('A5017898742');
      await graphHook.searchEntities('AI');
      graphHook.setSelectedNode('A5017898742');

      // Then: Should track all state changes
      expect(stateUpdates.length).toBeGreaterThan(3);

      // Best Practice: State updates should be sequential and logical
      expect(stateUpdates.some(s => s.loading === true)).toBe(true);
      expect(stateUpdates[stateUpdates.length - 1].selectedNode?.id).toBe('A5017898742');

      unsubscribe();
    });
  });

  describe('URL Routing Integration', () => {
    it('demonstrates entity-based routing', async () => {
      // Given: Router integration with entity loading
      const routeHandler = async (route: string) => {
        const entityRoute = router.parseEntityRoute(route);
        if (entityRoute) {
          await graphHook.fetchEntity(entityRoute.entityId);
        }
      };

      router.onRouteChange(routeHandler);

      // When: Navigating to entity routes
      router.navigate('/authors/A5017898742');
      await new Promise(resolve => setTimeout(resolve, 10)); // Allow async handling

      // Then: Entity should be loaded
      const state = stateManager.getState();
      expect(state.selectedNode?.id).toBe('A5017898742');
      expect(state.selectedNode?.entityType).toBe('authors');

      // When: Navigating to work route
      router.navigate('/works/W2741809807');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Then: Work should be loaded and selected
      const updatedState = stateManager.getState();
      expect(updatedState.selectedNode?.id).toBe('W2741809807');
      expect(updatedState.selectedNode?.entityType).toBe('works');
    });

    it('demonstrates deep linking with graph state', async () => {
      // Given: URL that represents specific graph state
      const deepLinkUrl = '/authors/A5017898742?expand=true&depth=2';

      // When: Processing deep link
      const urlParams = new URL(`http://localhost${deepLinkUrl}`);
      const entityPath = urlParams.pathname;
      const shouldExpand = urlParams.searchParams.get('expand') === 'true';
      const depth = parseInt(urlParams.searchParams.get('depth') || '1');

      const entityRoute = router.parseEntityRoute(entityPath);
      if (entityRoute) {
        await graphHook.fetchEntity(entityRoute.entityId);

        if (shouldExpand) {
          await graphHook.expandEntity(entityRoute.entityId, { limit: depth * 5 });
        }
      }

      // Then: Graph should reflect deep link state
      const state = stateManager.getState();
      expect(state.selectedNode?.id).toBe('A5017898742');
      expect(state.nodes.length).toBeGreaterThan(1); // Expanded
      expect(state.edges.length).toBeGreaterThan(0);
    });

    it('demonstrates route synchronization with graph state', async () => {
      // Given: Graph operations that should update URL
      const routeUpdates: string[] = [];
      router.onRouteChange(route => routeUpdates.push(route));

      // When: Selecting different entities
      await graphHook.fetchEntity('A5017898742');
      router.navigate(`/authors/${stateManager.getState().selectedNode!.id}`);

      await graphHook.fetchEntity('W2741809807');
      router.navigate(`/works/${stateManager.getState().selectedNode!.id}`);

      // Then: Routes should reflect selections
      expect(routeUpdates).toContain('/authors/A5017898742');
      expect(routeUpdates).toContain('/works/W2741809807');
      expect(router.getCurrentRoute()).toBe('/works/W2741809807');
    });
  });

  describe('Real-time Updates and Caching', () => {
    it('demonstrates cache integration with UI updates', async () => {
      // Given: Entity loaded with caching
      await graphHook.fetchEntity('A5017898742');
      const firstLoadTime = Date.now();

      // When: Loading same entity again (should use cache)
      await graphHook.fetchEntity('A5017898742');
      const secondLoadTime = Date.now();

      // Then: Second load should be faster (cached)
      const timeDifference = secondLoadTime - firstLoadTime;
      expect(timeDifference).toBeLessThan(100); // Should be nearly instantaneous

      // Best Practice: UI should handle cached vs fresh data
      const state = stateManager.getState();
      expect(state.selectedNode?.id).toBe('A5017898742');
      expect(state.error).toBeNull();
    });

    it('demonstrates background data refresh', async () => {
      // Given: Initial data load
      await graphHook.fetchEntity('A5017898742');
      const initialState = stateManager.getState();

      // When: Simulating background refresh
      const backgroundRefresh = async () => {
        try {
          const freshNode = await provider.fetchEntity('A5017898742');
          const currentState = stateManager.getState();

          // Update node data while preserving UI state
          const updatedNodes = currentState.nodes.map(node =>
            node.id === freshNode.id ? { ...node, ...freshNode } : node
          );

          stateManager.setState({ nodes: updatedNodes });
        } catch (error) {
          console.warn('Background refresh failed:', error);
        }
      };

      await backgroundRefresh();

      // Then: Data should be refreshed without disrupting UI
      const refreshedState = stateManager.getState();
      expect(refreshedState.nodes.length).toBe(initialState.nodes.length);
      expect(refreshedState.selectedNode?.id).toBe(initialState.selectedNode?.id);
    });

    it('demonstrates optimistic UI updates', async () => {
      // Given: Operation that might take time
      const slowProvider = new OpenAlexGraphProvider({
        ...mockClient,
        getWork: async (id: string) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return mockClient.getWork(id);
        }
      } as any, { name: 'slow-test' });

      const slowGraphHook = new MockGraphDataHook(slowProvider, stateManager);

      // When: Making optimistic update
      const optimisticNode: GraphNode = {
        id: 'W123456789',
        entityType: 'works',
        entityId: 'W123456789',
        label: 'Loading...',
        x: 0,
        y: 0,
        externalIds: []
      };

      // Add optimistic node immediately
      stateManager.setState({
        nodes: [...stateManager.getState().nodes, optimisticNode],
        loading: true
      });

      expect(stateManager.getState().nodes.some(n => n.label === 'Loading...')).toBe(true);

      // Then fetch real data
      await slowGraphHook.fetchEntity('W123456789');

      // Then: Optimistic node should be replaced with real data
      const finalState = stateManager.getState();
      expect(finalState.nodes.some(n => n.label === 'Loading...')).toBe(false);
      expect(finalState.nodes.some(n => n.id === 'W123456789' && n.label !== 'Loading...')).toBe(true);

      slowProvider.destroy();
    });
  });

  describe('Performance and User Experience', () => {
    it('demonstrates pagination and infinite scrolling', async () => {
      // Given: Large search results that need pagination
      const searchPagination = async (query: string, page = 1, pageSize = 10) => {
        // Simulate pagination by limiting results
        const allResults = await provider.searchEntities({
          query,
          entityTypes: ['works'],
          limit: pageSize * 3 // Simulate larger dataset
        });

        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageResults = allResults.slice(startIndex, endIndex);

        return {
          results: pageResults,
          hasMore: endIndex < allResults.length,
          totalCount: allResults.length,
          currentPage: page
        };
      };

      // When: Loading first page
      const firstPage = await searchPagination('AI', 1, 2);

      // Then: Should provide pagination info
      expect(firstPage.results.length).toBeLessThanOrEqual(2);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.totalCount).toBeGreaterThan(2);

      // When: Loading second page
      const secondPage = await searchPagination('AI', 2, 2);

      // Then: Should provide different results
      expect(secondPage.results.length).toBeLessThanOrEqual(2);
      expect(secondPage.currentPage).toBe(2);
    });

    it('demonstrates debounced search', async () => {
      // Given: Debounced search implementation
      let searchTimeout: NodeJS.Timeout;
      let resolveCallback: (() => void) | null = null;

      const debouncedSearch = (query: string, delay = 50) => {
        clearTimeout(searchTimeout);

        // Cancel previous promise if it hasn't resolved
        if (resolveCallback) {
          resolveCallback();
          resolveCallback = null;
        }

        return new Promise<void>((resolve) => {
          resolveCallback = resolve;
          searchTimeout = setTimeout(async () => {
            if (resolveCallback === resolve) {
              await graphHook.searchEntities(query);
              resolveCallback = null;
              resolve();
            }
          }, delay);
        });
      };

      // When: Rapid search queries (simulating user typing)
      let lastSearchPromise: Promise<void>;

      // Execute searches sequentially with small delays to simulate typing
      lastSearchPromise = debouncedSearch('m');
      await new Promise(resolve => setTimeout(resolve, 10));

      lastSearchPromise = debouncedSearch('ma');
      await new Promise(resolve => setTimeout(resolve, 10));

      lastSearchPromise = debouncedSearch('mac');
      await new Promise(resolve => setTimeout(resolve, 10));

      lastSearchPromise = debouncedSearch('machine');
      await new Promise(resolve => setTimeout(resolve, 10));

      lastSearchPromise = debouncedSearch('machine learning');

      // Wait for the final search to complete
      await lastSearchPromise;

      // Then: Should only execute final search
      const state = stateManager.getState();
      expect(state.searchResults.length).toBeGreaterThan(0);
      expect(state.searchResults[0].label).toContain('machine learning');
    });

    it('demonstrates loading states and progress indicators', async () => {
      // Given: Operation tracking for progress indication
      const progressStates: Array<{ operation: string; loading: boolean; progress?: number }> = [];

      stateManager.subscribe(state => {
        progressStates.push({
          operation: 'general',
          loading: state.loading
        });
      });

      // When: Performing complex multi-step operation
      const complexOperation = async () => {
        // Step 1: Load entity
        await graphHook.fetchEntity('A5017898742');

        // Step 2: Expand entity
        await graphHook.expandEntity('A5017898742', { limit: 10 });

        // Step 3: Search related entities
        await graphHook.searchEntities('related research');
      };

      await complexOperation();

      // Then: Should show appropriate loading states
      expect(progressStates.length).toBeGreaterThan(4);
      expect(progressStates.some(s => s.loading === true)).toBe(true);
      expect(progressStates[progressStates.length - 1].loading).toBe(false);
    });

    it('demonstrates memory management and cleanup', async () => {
      // Given: Large graph operations
      for (let i = 0; i < 20; i++) {
        await graphHook.fetchEntity(`A${50000000 + i}`);
      }

      let initialNodeCount = stateManager.getState().nodes.length;
      expect(initialNodeCount).toBe(20);

      // When: Implementing cleanup strategy
      const cleanupOldNodes = (maxNodes = 10) => {
        const state = stateManager.getState();
        if (state.nodes.length > maxNodes) {
          // Keep only the most recently selected/accessed nodes
          const recentNodes = state.nodes.slice(-maxNodes);
          const recentNodeIds = new Set(recentNodes.map(n => n.id));

          // Filter edges to only include recent nodes
          const recentEdges = state.edges.filter(edge =>
            recentNodeIds.has(edge.source) && recentNodeIds.has(edge.target)
          );

          stateManager.setState({
            nodes: recentNodes,
            edges: recentEdges
          });
        }
      };

      cleanupOldNodes(10);

      // Then: Graph should be cleaned up
      const cleanedState = stateManager.getState();
      expect(cleanedState.nodes.length).toBe(10);
      expect(cleanedState.nodes.length).toBeLessThan(initialNodeCount);
    });
  });

  describe('Multi-Provider Web Integration', () => {
    it('demonstrates provider switching in UI', async () => {
      // Given: Multiple providers in registry
      const secondProvider = new OpenAlexGraphProvider({
        ...mockClient,
        getAuthor: async (id: string) => ({
          id,
          display_name: `Enhanced Author ${id.slice(-3)}`,
          ids: { openalex: id },
          works_count: 35
        })
      } as any, { name: 'enhanced-provider' });

      registry.register(secondProvider);

      // When: Creating hooks for different providers
      const standardHook = new MockGraphDataHook(provider, stateManager);
      const enhancedHook = new MockGraphDataHook(secondProvider, stateManager);

      // Load same entity with different providers
      graphHook.clearGraph();
      await standardHook.fetchEntity('A5017898742');
      const standardResult = stateManager.getState().selectedNode;

      graphHook.clearGraph();
      await enhancedHook.fetchEntity('A5017898742');
      const enhancedResult = stateManager.getState().selectedNode;

      // Then: Should show different provider results
      expect(standardResult?.label).toBe('Author 742');
      expect(enhancedResult?.label).toBe('Enhanced Author 742');

      secondProvider.destroy();
    });

    it('demonstrates provider health monitoring in UI', async () => {
      // Given: Health monitoring for UI feedback
      const healthStates: Record<string, boolean> = {};

      const checkProviderHealth = async () => {
        const health = await registry.healthCheck();
        Object.assign(healthStates, health);
        return health;
      };

      // When: Monitoring provider health
      const initialHealth = await checkProviderHealth();

      // Then: Should provide health status for UI indicators
      expect(initialHealth).toHaveProperty('web-app-test');
      expect(initialHealth['web-app-test']).toBe(true);

      // When: Simulating provider issues
      const unhealthyProvider = new OpenAlexGraphProvider({
        ...mockClient,
        getAuthor: () => Promise.reject(new Error('Service unavailable'))
      } as any, { name: 'unhealthy-provider' });

      registry.register(unhealthyProvider);
      const updatedHealth = await checkProviderHealth();

      // Then: UI should be able to show health status
      expect(updatedHealth['unhealthy-provider']).toBe(false);
      expect(updatedHealth['web-app-test']).toBe(true);

      unhealthyProvider.destroy();
    });
  });
});