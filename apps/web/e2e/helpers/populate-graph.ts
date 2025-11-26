/**
 * E2E test helper to populate graph store with test relationship data
 * Used by relationship visualization E2E tests (spec 016)
 *
 * @module populate-graph
 */

import type { GraphNode, GraphEdge } from '@academic-explorer/types';
import type { Page } from '@playwright/test';

/**
 * Populate graph with citation relationships for work W2741809807
 * Creates 3 citing works (incoming REFERENCE edges)
 */
export async function populateWorkCitations(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Access the global graph store actions (exposed in development/test mode)
    const graphStore = (window as any).graphStoreActions;

    console.log('[E2E] graphStoreActions available:', !!graphStore);
    console.log('[E2E] Available methods:', graphStore ? Object.keys(graphStore) : 'none');

    if (!graphStore) {
      throw new Error('Graph store actions not available - ensure test environment is configured');
    }

    // Create target work node
    const workNode: GraphNode = {
      id: 'W2741809807',
      label: 'Test Work with Citations',
      entityType: 'works',
      entityData: {
        id: 'W2741809807',
        display_name: 'Test Work with Citations',
        type: 'article',
      },
      position: { x: 0, y: 0 },
      depth: 0,
    };

    // Create 3 citing works
    const citingWorks: GraphNode[] = [
      {
        id: 'W100',
        label: 'Citing Work 1',
        entityType: 'works',
        entityData: {
          id: 'W100',
          display_name: 'Citing Work 1',
          type: 'article',
        },
        position: { x: 100, y: 0 },
        depth: 1,
      },
      {
        id: 'W101',
        label: 'Citing Work 2',
        entityType: 'works',
        entityData: {
          id: 'W101',
          display_name: 'Citing Work 2',
          type: 'article',
        },
        position: { x: 100, y: 100 },
        depth: 1,
      },
      {
        id: 'W102',
        label: 'Citing Work 3',
        entityType: 'works',
        entityData: {
          id: 'W102',
          display_name: 'Citing Work 3',
          type: 'article',
        },
        position: { x: 100, y: 200 },
        depth: 1,
      },
    ];

    // Create citation edges (citing work → cited work)
    const citationEdges: GraphEdge[] = [
      {
        id: 'E1',
        source: 'W100',
        target: 'W2741809807',
        type: 'reference' as any, // RelationType.REFERENCE
        direction: 'inbound',
      },
      {
        id: 'E2',
        source: 'W101',
        target: 'W2741809807',
        type: 'reference' as any,
        direction: 'inbound',
      },
      {
        id: 'E3',
        source: 'W102',
        target: 'W2741809807',
        type: 'reference' as any,
        direction: 'inbound',
      },
    ];

    // Add nodes and edges to graph store
    graphStore.addNode(workNode);
    graphStore.addNodes(citingWorks);
    graphStore.addEdges(citationEdges);
  });
}

/**
 * Populate graph with authorship relationships for author A123
 * Creates 2 authored works (incoming AUTHORSHIP edges from works to author)
 */
export async function populateAuthorWorks(page: Page, authorId: string = 'A123'): Promise<void> {
  await page.evaluate((aid) => {
    const graphStore = (window as any).graphStoreActions;
    if (!graphStore) throw new Error('Graph store actions not available');

    const authorNode: GraphNode = {
      id: aid,
      label: 'Test Author',
      entityType: 'authors',
      entityData: { id: aid, display_name: 'Test Author' },
      position: { x: 0, y: 0 },
      depth: 0,
    };

    const works: GraphNode[] = [
      {
        id: 'W200',
        label: 'Authored Work 1',
        entityType: 'works',
        entityData: { id: 'W200', display_name: 'Authored Work 1' },
        position: { x: 100, y: 0 },
        depth: 1,
      },
      {
        id: 'W201',
        label: 'Authored Work 2',
        entityType: 'works',
        entityData: { id: 'W201', display_name: 'Authored Work 2' },
        position: { x: 100, y: 100 },
        depth: 1,
      },
    ];

    const authorshipEdges: GraphEdge[] = [
      {
        id: 'E10',
        source: 'W200',
        target: aid,
        type: 'authorship' as any,
        direction: 'inbound',
      },
      {
        id: 'E11',
        source: 'W201',
        target: aid,
        type: 'authorship' as any,
        direction: 'inbound',
      },
    ];

    graphStore.addNode(authorNode);
    graphStore.addNodes(works);
    graphStore.addEdges(authorshipEdges);
  }, authorId);
}

/**
 * Clear all graph data (useful for test isolation)
 */
export async function clearGraph(page: Page): Promise<void> {
  await page.evaluate(() => {
    const graphStoreActions = (window as any).graphStoreActions;
    if (graphStoreActions) {
      graphStoreActions.clear();
    }
  });
}
