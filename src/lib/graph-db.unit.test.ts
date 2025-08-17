/**
 * Graph Database Service Unit Tests
 * 
 * Tests the core functionality of the graph database service,
 * focusing on vertex creation, edge management, and event tracking.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { IDBPDatabase } from 'idb';

// Mock the idb module
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

// Import after mocking
import { GraphDatabaseService } from './graph-db';
import { openDB } from 'idb';
import { 
  VertexType, 
  GraphEdgeType, 
  EncounterType,
  type GraphVertex,
  type GraphEdge,
  type EntityVisitEvent,
  type EntityEncounterEvent,
  type QueryExecutionEvent,
} from '@/types/graph-storage';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

const mockOpenDB = vi.mocked(openDB);

describe('GraphDatabaseService', () => {
  let graphDb: GraphDatabaseService;
  let mockDB: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock database
    mockDB = {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn(),
      close: vi.fn(),
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
      createObjectStore: vi.fn(),
    };

    // Mock transaction and object store
    const mockTransaction = {
      objectStore: vi.fn().mockReturnValue({
        add: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(undefined),
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockResolvedValue([]),
        }),
      }),
      done: Promise.resolve(),
    };

    mockDB.transaction.mockReturnValue(mockTransaction);

    // Mock initial metadata creation - return undefined first, then the metadata object
    let metadataCallCount = 0;
    mockDB.get.mockImplementation((store: string, key: string) => {
      if (store === 'graphMetadata' && key === 'metadata') {
        metadataCallCount++;
        if (metadataCallCount === 1) {
          return Promise.resolve(undefined); // First call - no metadata exists
        } else {
          return Promise.resolve({
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalVisits: 0,
            uniqueEntitiesVisited: 0,
            totalQueryExecutions: 0,
            uniqueQueryParameters: 0,
            schemaVersion: 1,
          });
        }
      }
      return Promise.resolve(undefined);
    });

    // Mock openDB to call upgrade function and return mock database
    mockOpenDB.mockImplementation(async (name: string, version?: number, config?: any) => {
      if (config && config.upgrade && version !== undefined) {
        config.upgrade(mockDB, 0, version, mockTransaction, {} as IDBVersionChangeEvent);
      }
      return mockDB as unknown as IDBPDatabase;
    });

    graphDb = new GraphDatabaseService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Initialization', () => {
    it('should initialize graph database with correct stores', async () => {
      await graphDb.init();

      expect(mockOpenDB).toHaveBeenCalledWith('academic-explorer-graph', 1, {
        upgrade: expect.any(Function),
      });
    });

    it('should create required object stores during upgrade', async () => {
      await graphDb.init();

      expect(mockDB.createObjectStore).toHaveBeenCalledWith('vertices');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('edges');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('edgesBySource');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('edgesByTarget');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('verticesByType');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('verticesByEntityType');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('edgesByType');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('graphMetadata');
    });
  });

  describe('Vertex Management', () => {
    beforeEach(async () => {
      await graphDb.init();
    });

    it('should create entity vertex', async () => {
      const mockVertex: GraphVertex = {
        id: 'entity_A123456789',
        vertexType: VertexType.ENTITY,
        entityType: EntityType.AUTHOR,
        displayName: 'Test Author',
        directlyVisited: false,
        firstSeen: new Date().toISOString(),
        visitCount: 0,
        encounters: [],
        metadata: {
          additionalInfo: { name: 'Test Author' },
        },
        stats: {
          totalEncounters: 0,
          searchResultCount: 0,
          relatedEntityCount: 0,
          inDegree: 0,
          outDegree: 0,
          totalDegree: 0,
        },
      };

      await graphDb.createVertex(mockVertex);

      expect(mockDB.put).toHaveBeenCalledWith('vertices', mockVertex, mockVertex.id);
    });

    it('should create query vertex', async () => {
      const mockVertex: GraphVertex = {
        id: 'query_machine_learning',
        vertexType: VertexType.QUERY_PARAMETERS,
        displayName: 'Query: machine learning',
        directlyVisited: false,
        firstSeen: new Date().toISOString(),
        visitCount: 0,
        encounters: [],
        metadata: {
          queryString: 'machine learning',
          queryFilters: { filter: 'authors' },
        },
        stats: {
          totalEncounters: 0,
          searchResultCount: 0,
          relatedEntityCount: 0,
          inDegree: 0,
          outDegree: 0,
          totalDegree: 0,
        },
      };

      await graphDb.createVertex(mockVertex);

      expect(mockDB.put).toHaveBeenCalledWith('vertices', mockVertex, mockVertex.id);
    });

    it('should get vertex by id', async () => {
      const vertexId = 'test_vertex';

      await graphDb.getVertex(vertexId);

      expect(mockDB.get).toHaveBeenCalledWith('vertices', vertexId);
    });
  });

  describe('Edge Management', () => {
    beforeEach(async () => {
      await graphDb.init();
    });

    it('should create entity relationship edge', async () => {
      const mockEdge: GraphEdge = {
        id: 'edge_A123456789_W987654321',
        sourceId: 'A123456789',
        targetId: 'W987654321',
        edgeType: GraphEdgeType.AUTHORED,
        weight: 0.8,
        discoveredFromDirectVisit: true,
        discoveredAt: new Date().toISOString(),
        confirmationCount: 1,
        properties: {
          source: 'openalex',
          confidence: 0.9,
          additionalProperties: { strength: 0.8 },
        },
      };

      await graphDb.createEdge(mockEdge);

      expect(mockDB.put).toHaveBeenCalledWith('edges', mockEdge, mockEdge.id);
    });

    it('should create query execution edge', async () => {
      const mockEdge: GraphEdge = {
        id: 'edge_query_123_A123456789',
        sourceId: 'query_123',
        targetId: 'A123456789',
        edgeType: GraphEdgeType.QUERY_RESULT,
        weight: 0.95,
        discoveredFromDirectVisit: false,
        discoveredAt: new Date().toISOString(),
        confirmationCount: 1,
        properties: {
          source: 'derived',
          confidence: 0.9,
          queryInfo: {
            relevanceScore: 0.95,
          },
        },
      };

      await graphDb.createEdge(mockEdge);

      expect(mockDB.put).toHaveBeenCalledWith('edges', mockEdge, mockEdge.id);
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await graphDb.init();
    });

    it('should record entity visit event', async () => {
      // Set up mock metadata to be returned consistently
      mockDB.get.mockImplementation((store: string, key: string) => {
        if (store === 'graphMetadata' && key === 'metadata') {
          return Promise.resolve({
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalVisits: 5,
            uniqueEntitiesVisited: 3,
            totalQueryExecutions: 2,
            uniqueQueryParameters: 1,
            schemaVersion: 1,
          });
        }
        return Promise.resolve(undefined);
      });

      const entityVisitEvent: EntityVisitEvent = {
        entityId: 'A123456789',
        entityType: EntityType.AUTHOR,
        displayName: 'Test Author',
        timestamp: new Date().toISOString(),
        source: 'search',
      };

      const result = await graphDb.recordEntityVisit(entityVisitEvent);

      expect(result.id).toBe('entity:A123456789');
      expect(result.directlyVisited).toBe(true);
      expect(mockDB.put).toHaveBeenCalledWith('vertices', expect.objectContaining({
        id: 'entity:A123456789',
        vertexType: VertexType.ENTITY,
        entityType: EntityType.AUTHOR,
        displayName: 'Test Author',
      }), 'entity:A123456789');
    });

    it('should record query execution event', async () => {
      // Set up mock for existing query vertex and metadata
      mockDB.get.mockImplementation((store: string, key: string) => {
        if (store === 'graphMetadata' && key === 'metadata') {
          return Promise.resolve({
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalVisits: 5,
            uniqueEntitiesVisited: 3,
            totalQueryExecutions: 2,
            uniqueQueryParameters: 1,
            schemaVersion: 1,
          });
        }
        if (store === 'vertices' && key === 'query_parameters_test') {
          return Promise.resolve({
            id: 'query_parameters_test',
            vertexType: VertexType.QUERY_PARAMETERS,
            displayName: 'Test Query',
            directlyVisited: false,
            firstSeen: new Date().toISOString(),
            visitCount: 0,
            encounters: [],
            metadata: {},
            stats: {
              totalEncounters: 0,
              searchResultCount: 0,
              relatedEntityCount: 0,
              inDegree: 0,
              outDegree: 0,
              totalDegree: 0,
            },
          });
        }
        return Promise.resolve(undefined);
      });

      const queryExecutionEvent: QueryExecutionEvent = {
        queryParametersId: 'query_parameters_test',
        timestamp: new Date().toISOString(),
        resultEntityIds: ['A123456789'],
        totalResults: 42,
        pageNumber: 1,
        perPage: 25,
      };

      const result = await graphDb.recordQueryExecution(queryExecutionEvent);

      expect(result.queryVertex.id).toBe('query_parameters_test');
      expect(result.executionVertex.vertexType).toBe(VertexType.QUERY_EXECUTION);
      expect(mockDB.put).toHaveBeenCalledWith('vertices', expect.objectContaining({
        vertexType: VertexType.QUERY_EXECUTION,
      }), expect.any(String));
    });
  });

  describe('Encounter Management', () => {
    beforeEach(async () => {
      await graphDb.init();
    });

    it('should record entity encounter', async () => {
      // Set up mock metadata
      mockDB.get.mockImplementation((store: string, key: string) => {
        if (store === 'graphMetadata' && key === 'metadata') {
          return Promise.resolve({
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalVisits: 5,
            uniqueEntitiesVisited: 3,
            totalQueryExecutions: 2,
            uniqueQueryParameters: 1,
            schemaVersion: 1,
          });
        }
        return Promise.resolve(undefined);
      });

      const entityEncounterEvent: EntityEncounterEvent = {
        entityId: 'A123456789',
        entityType: EntityType.AUTHOR,
        displayName: 'Test Author',
        encounterType: EncounterType.DIRECT_VISIT,
        timestamp: new Date().toISOString(),
        context: {
          sourceEntityId: 'query_123',
        },
        metadata: { source: 'search' },
      };

      const result = await graphDb.recordEntityEncounter(entityEncounterEvent);

      expect(result.id).toBe('entity:A123456789');
      expect(mockDB.put).toHaveBeenCalledWith('vertices', expect.objectContaining({
        id: 'entity:A123456789',
        vertexType: VertexType.ENTITY,
        entityType: EntityType.AUTHOR,
      }), 'entity:A123456789');
    });

    it('should get vertex by id', async () => {
      const vertexId = 'A123456789';

      await graphDb.getVertex(vertexId);

      expect(mockDB.get).toHaveBeenCalledWith('vertices', vertexId);
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization errors', async () => {
      mockOpenDB.mockRejectedValueOnce(new Error('Database error'));

      await expect(graphDb.init()).rejects.toThrow('Database error');
    });

    it('should handle transaction errors gracefully', async () => {
      await graphDb.init();
      
      // Mock the database methods to throw an error
      mockDB.put.mockRejectedValueOnce(new Error('Database error'));

      const mockVertex: GraphVertex = {
        id: 'entity_test',
        vertexType: VertexType.ENTITY,
        entityType: EntityType.AUTHOR,
        displayName: 'Test Author',
        directlyVisited: false,
        firstSeen: new Date().toISOString(),
        visitCount: 0,
        encounters: [],
        metadata: {},
        stats: {
          totalEncounters: 0,
          searchResultCount: 0,
          relatedEntityCount: 0,
          inDegree: 0,
          outDegree: 0,
          totalDegree: 0,
        },
      };
      
      await expect(graphDb.createVertex(mockVertex)).rejects.toThrow('Database error');
    });
  });
});