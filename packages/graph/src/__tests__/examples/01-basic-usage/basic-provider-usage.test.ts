/**
 * Example: Basic Provider Usage
 *
 * Demonstrates: Core provider operations (fetch, search, expand)
 * Use cases: Basic entity retrieval and graph building
 * Prerequisites: Understanding of EntityType and GraphNode concepts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenAlexGraphProvider } from '../../../providers/openalex-provider';
import type { EntityType, GraphNode } from '../../../types/core';

// Mock OpenAlex client for testing
class MockOpenAlexClient {
  async getAuthor(id: string): Promise<Record<string, unknown>> {
    // Realistic author data structure from OpenAlex API
    return {
      id,
      display_name: 'Dr. Jane Smith',
      ids: {
        openalex: id,
        orcid: 'https://orcid.org/0000-0000-0000-0000'
      },
      works_count: 42,
      cited_by_count: 1250,
      last_known_institutions: [
        {
          id: 'I123456789',
          display_name: 'University of Example'
        }
      ]
    };
  }

  async getWork(id: string): Promise<Record<string, unknown>> {
    // Realistic work data structure from OpenAlex API
    return {
      id,
      title: 'Machine Learning Applications in Academic Research',
      display_name: 'Machine Learning Applications in Academic Research',
      ids: {
        openalex: id,
        doi: 'https://doi.org/10.1000/example'
      },
      publication_year: 2023,
      authorships: [
        {
          author: {
            id: 'A5017898742',
            display_name: 'Dr. Jane Smith'
          },
          institutions: [
            {
              id: 'I123456789',
              display_name: 'University of Example'
            }
          ]
        }
      ],
      primary_location: {
        source: {
          id: 'S4210184550',
          display_name: 'Nature Machine Intelligence'
        }
      }
    };
  }

  async getSource(id: string): Promise<Record<string, unknown>> {
    return {
      id,
      display_name: 'Nature Machine Intelligence',
      ids: {
        openalex: id,
        issn_l: '2522-5839'
      },
      publisher: 'Springer Nature',
      works_count: 1500
    };
  }

  async getInstitution(id: string): Promise<Record<string, unknown>> {
    return {
      id,
      display_name: 'University of Example',
      ids: {
        openalex: id,
        ror: 'https://ror.org/example123'
      },
      country_code: 'US',
      works_count: 25000
    };
  }

  async get(endpoint: string, id: string): Promise<Record<string, unknown>> {
    // Generic endpoint handler
    switch (endpoint) {
      case 'topics':
        return {
          id,
          display_name: 'Machine Learning',
          works_count: 150000
        };
      default:
        throw new Error(`Unsupported endpoint: ${endpoint}`);
    }
  }

  async works(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    // Mock search results for works
    return {
      results: [
        {
          id: 'W2741809807',
          display_name: 'Deep Learning for Computer Vision',
          publication_year: 2023,
          authorships: [{
            author: {
              id: 'A5017898742',
              display_name: 'Dr. Jane Smith'
            }
          }]
        },
        {
          id: 'W3048589302',
          display_name: 'Natural Language Processing Advances',
          publication_year: 2024,
          authorships: [{
            author: {
              id: 'A5017898742',
              display_name: 'Dr. Jane Smith'
            }
          }]
        }
      ]
    };
  }

  async authors(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    return {
      results: [
        {
          id: 'A5017898742',
          display_name: 'Dr. Jane Smith',
          works_count: 42
        },
        {
          id: 'A9876543210',
          display_name: 'Prof. John Doe',
          works_count: 67
        }
      ]
    };
  }

  async sources(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    return {
      results: [
        {
          id: 'S4210184550',
          display_name: 'Nature Machine Intelligence',
          publisher: 'Springer Nature'
        }
      ]
    };
  }

  async institutions(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    return {
      results: [
        {
          id: 'I123456789',
          display_name: 'University of Example',
          country_code: 'US'
        }
      ]
    };
  }
}

describe('Example: Basic Provider Usage', () => {
  let provider: OpenAlexGraphProvider;
  let mockClient: MockOpenAlexClient;

  beforeEach(async () => {
    // Create fresh instances for each test
    mockClient = new MockOpenAlexClient();
    provider = new OpenAlexGraphProvider(mockClient, {
      name: 'test-provider',
      timeout: 5000,
      retryAttempts: 2
    });
  });

  afterEach(() => {
    // Clean up resources to prevent memory leaks
    provider.destroy();
  });

  describe('Entity Fetching', () => {
    it('demonstrates basic entity fetching', async () => {
      // Given: An author ID from OpenAlex
      const authorId = 'A5017898742';

      // When: Fetching the entity
      const authorNode = await provider.fetchEntity(authorId);

      // Then: Should return a properly structured GraphNode
      expect(authorNode).toMatchObject({
        id: authorId,
        entityType: 'authors',
        entityId: authorId,
        label: 'Dr. Jane Smith',
        x: expect.any(Number),
        y: expect.any(Number),
        externalIds: expect.arrayContaining([
          expect.objectContaining({
            type: 'orcid',
            value: 'https://orcid.org/0000-0000-0000-0000'
          })
        ]),
        entityData: expect.any(Object)
      });

      // Best Practice: Verify entity data structure
      expect(authorNode.entityData).toHaveProperty('display_name');
      expect(authorNode.entityData).toHaveProperty('works_count');
      expect(authorNode.entityData).toHaveProperty('cited_by_count');
    });

    it('demonstrates fetching different entity types', async () => {
      // Given: IDs for different OpenAlex entity types
      const testCases = [
        { id: 'W2741809807', type: 'works' as EntityType, expectedLabel: 'Machine Learning Applications in Academic Research' },
        { id: 'A5017898742', type: 'authors' as EntityType, expectedLabel: 'Dr. Jane Smith' },
        { id: 'S4210184550', type: 'sources' as EntityType, expectedLabel: 'Nature Machine Intelligence' },
        { id: 'I123456789', type: 'institutions' as EntityType, expectedLabel: 'University of Example' }
      ];

      // When: Fetching each entity type
      for (const testCase of testCases) {
        const node = await provider.fetchEntity(testCase.id);

        // Then: Should detect correct entity type and extract proper labels
        expect(node.entityType).toBe(testCase.type);
        expect(node.label).toBe(testCase.expectedLabel);
        expect(node.id).toBe(testCase.id);

        // Best Practice: Verify coordinates are set for visualization
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeGreaterThanOrEqual(0);
      }
    });

    it('demonstrates batch entity fetching', async () => {
      // Given: Multiple entity IDs
      const entityIds = ['A5017898742', 'W2741809807', 'I123456789'];

      // When: Fetching multiple entities at once
      const nodes = await provider.fetchEntities(entityIds);

      // Then: Should return all entities
      expect(nodes).toHaveLength(3);
      expect(nodes.map(n => n.id)).toEqual(expect.arrayContaining(entityIds));

      // Best Practice: Verify each node is properly structured
      nodes.forEach(node => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('entityType');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('entityData');
      });
    });
  });

  describe('Entity Searching', () => {
    it('demonstrates basic entity searching', async () => {
      // Given: A search query for machine learning research
      const searchQuery = {
        query: 'machine learning',
        entityTypes: ['authors' as EntityType, 'works' as EntityType],
        limit: 10
      };

      // When: Searching for entities
      const results = await provider.searchEntities(searchQuery);

      // Then: Should return relevant results
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(10);

      // Best Practice: Verify mixed entity types in results
      const entityTypes = new Set(results.map(r => r.entityType));
      expect(entityTypes.size).toBeGreaterThan(0);

      // Best Practice: Verify result structure
      results.forEach(result => {
        expect(result).toMatchObject({
          id: expect.any(String),
          entityType: expect.stringMatching(/^(authors|works|sources|institutions)$/),
          label: expect.any(String),
          x: expect.any(Number),
          y: expect.any(Number)
        });
      });
    });

    it('demonstrates targeted entity type searching', async () => {
      // Given: Search focused on authors only
      const authorQuery = {
        query: 'machine learning',
        entityTypes: ['authors' as EntityType],
        limit: 5
      };

      // When: Searching for authors specifically
      const authors = await provider.searchEntities(authorQuery);

      // Then: Should return only authors
      expect(authors).toBeInstanceOf(Array);
      authors.forEach(author => {
        expect(author.entityType).toBe('authors');
        expect(author.label).toBeTruthy();
      });

      // Best Practice: Verify author-specific data
      authors.forEach(author => {
        expect(author.entityData).toHaveProperty('display_name');
        // Authors should have work counts
        if (author.entityData?.works_count) {
          expect(typeof author.entityData.works_count).toBe('number');
        }
      });
    });
  });

  describe('Entity Expansion', () => {
    it('demonstrates work expansion (finding authors and venue)', async () => {
      // Given: A work ID to expand
      const workId = 'W2741809807';

      // When: Expanding the work to show its relationships
      const expansion = await provider.expandEntity(workId, {
        limit: 10,
        includeMetadata: true
      });

      // Then: Should return authors and publication venue
      expect(expansion).toMatchObject({
        nodes: expect.any(Array),
        edges: expect.any(Array),
        metadata: {
          expandedFrom: workId,
          depth: 1,
          totalFound: expect.any(Number),
          options: expect.any(Object)
        }
      });

      // Best Practice: Verify expansion contains expected relationships
      const nodeTypes = new Set(expansion.nodes.map(n => n.entityType));
      expect(nodeTypes.has('authors')).toBe(true);

      // Best Practice: Verify edges connect properly
      expansion.edges.forEach(edge => {
        expect(edge).toMatchObject({
          id: expect.any(String),
          source: expect.any(String),
          target: expect.any(String),
          type: expect.any(String)
        });
      });
    });

    it('demonstrates author expansion (finding recent works)', async () => {
      // Given: An author ID to expand
      const authorId = 'A5017898742';

      // When: Expanding the author to show their works
      const expansion = await provider.expandEntity(authorId, {
        limit: 5,
        relationshipTypes: ['authored']
      });

      // Then: Should return the author's recent works
      expect(expansion.nodes).toBeInstanceOf(Array);
      expect(expansion.edges).toBeInstanceOf(Array);

      // Best Practice: Verify work nodes are included
      const workNodes = expansion.nodes.filter(n => n.entityType === 'works');
      expect(workNodes.length).toBeGreaterThan(0);

      // Best Practice: Verify authorship edges
      const authorshipEdges = expansion.edges.filter(e => e.type === 'authored');
      expect(authorshipEdges.length).toEqual(workNodes.length);

      // Best Practice: Verify edge consistency
      authorshipEdges.forEach(edge => {
        expect(edge.source).toBe(authorId);
        expect(workNodes.some(n => n.id === edge.target)).toBe(true);
      });
    });

    it('demonstrates controlled expansion with limits', async () => {
      // Given: An entity and strict expansion limits
      const sourceId = 'S4210184550';
      const strictOptions = {
        limit: 3,
        maxDepth: 1,
        includeMetadata: true
      };

      // When: Expanding with limits
      const expansion = await provider.expandEntity(sourceId, strictOptions);

      // Then: Should respect the limits
      expect(expansion.nodes.length).toBeLessThanOrEqual(3);
      expect(expansion.metadata.depth).toBe(1);

      // Best Practice: Verify metadata tracks options
      expect(expansion.metadata.options).toMatchObject(strictOptions);
      expect(expansion.metadata.totalFound).toBe(expansion.nodes.length);
    });
  });

  describe('Provider Information and Health', () => {
    it('demonstrates provider information access', async () => {
      // When: Getting provider information
      const info = provider.getProviderInfo();

      // Then: Should return provider metadata and stats
      expect(info).toMatchObject({
        name: 'test-provider',
        version: expect.any(String),
        stats: {
          totalRequests: expect.any(Number),
          successfulRequests: expect.any(Number),
          failedRequests: expect.any(Number),
          avgResponseTime: expect.any(Number),
          lastRequestTime: expect.any(Number)
        }
      });

      // Best Practice: Stats should be non-negative
      expect(info.stats.totalRequests).toBeGreaterThanOrEqual(0);
      expect(info.stats.successfulRequests).toBeGreaterThanOrEqual(0);
      expect(info.stats.failedRequests).toBeGreaterThanOrEqual(0);
    });

    it('demonstrates health check functionality', async () => {
      // When: Checking provider health
      const isHealthy = await provider.isHealthy();

      // Then: Should return health status
      expect(typeof isHealthy).toBe('boolean');
      expect(isHealthy).toBe(true); // Mock client should be healthy

      // Best Practice: Health check should be fast and lightweight
      const startTime = Date.now();
      await provider.isHealthy();
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Event System Integration', () => {
    it('demonstrates event listening for entity fetches', async () => {
      // Given: Event listeners for provider events
      const entityFetchedEvents: GraphNode[] = [];
      const requestEvents: unknown[] = [];

      provider.on('entityFetched', (node: GraphNode) => {
        entityFetchedEvents.push(node);
      });

      provider.on('requestSuccess', (event: unknown) => {
        requestEvents.push(event);
      });

      // When: Fetching entities
      const authorId = 'A5017898742';
      const node = await provider.fetchEntity(authorId);

      // Then: Events should be emitted
      expect(entityFetchedEvents).toHaveLength(1);
      expect(entityFetchedEvents[0]).toEqual(node);
      expect(requestEvents).toHaveLength(1);

      // Best Practice: Event data should include timing information
      expect(requestEvents[0]).toMatchObject({
        duration: expect.any(Number)
      });
    });

    it('demonstrates error event handling', async () => {
      // Given: A provider that will encounter errors
      const errorProvider = new OpenAlexGraphProvider({
        ...mockClient,
        getAuthor: () => Promise.reject(new Error('Network error'))
      } as any);

      const errorEvents: Error[] = [];
      errorProvider.on('requestError', ({ error }: { error: Error }) => {
        errorEvents.push(error);
      });

      // When: An operation fails
      try {
        await errorProvider.fetchEntity('A5017898742');
      } catch (error) {
        // Expected to fail
      }

      // Then: Error event should be emitted
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toBeInstanceOf(Error);
      expect(errorEvents[0].message).toBe('Network error');

      // Cleanup
      errorProvider.destroy();
    });
  });
});