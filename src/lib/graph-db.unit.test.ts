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
import { VertexType, GraphEdgeType, EncounterType } from '@/types/graph-storage';

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
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('encounters');
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('events');
    });
  });

  describe('Vertex Management', () => {
    beforeEach(async () => {
      await graphDb.init();
    });

    it('should create entity vertex', async () => {
      const mockVertex = {
        id: 'entity_A123456789',
        type: 'entity' as const,
        entityType: 'author' as const,
        entityId: 'A123456789',
        attributes: { name: 'Test Author' },
        metadata: {
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          version: 1,
        },
      };

      await graphDb.createVertex(mockVertex);

      expect(mockDB.transaction).toHaveBeenCalledWith(['vertices', 'verticesByType', 'verticesByEntityType'], 'readwrite');
    });

    it('should create query vertex', async () => {
      const mockVertex = {
        id: 'query_machine_learning',
        type: 'query' as const,
        queryText: 'machine learning',
        queryParameters: { filter: 'authors' },
        attributes: {},
        metadata: {
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          version: 1,
        },
      };

      await graphDb.createVertex(mockVertex);

      expect(mockDB.transaction).toHaveBeenCalledWith(['vertices', 'verticesByType'], 'readwrite');
    });

    it('should get vertex by id', async () => {
      const vertexId = 'test_vertex';

      await graphDb.getVertex(vertexId);

      expect(mockDB.transaction).toHaveBeenCalledWith(['vertices'], 'readonly');
    });
  });

  describe('Edge Management', () => {
    beforeEach(async () => {
      await graphDb.init();
    });

    it('should create entity relationship edge', async () => {
      const mockEdge = {
        id: 'edge_A123456789_W987654321',
        type: 'relationship' as const,
        sourceId: 'A123456789',
        targetId: 'W987654321',
        relationshipType: 'authored',
        weight: 0.8,
        confidence: 0.9,
        attributes: { strength: 0.8 },
        metadata: {
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          version: 1,
        },
      };

      await graphDb.createEdge(mockEdge);

      expect(mockDB.transaction).toHaveBeenCalledWith(['edges', 'edgesBySource', 'edgesByTarget', 'edgesByType'], 'readwrite');
    });

    it('should create query execution edge', async () => {
      const mockEdge = {
        id: 'edge_query_123_A123456789',
        type: 'execution' as const,
        sourceId: 'query_123',
        targetId: 'A123456789',
        weight: 0.95,
        confidence: 0.9,
        attributes: { score: 0.95 },
        metadata: {
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          version: 1,
        },
      };

      await graphDb.createEdge(mockEdge);

      expect(mockDB.transaction).toHaveBeenCalledWith(['edges', 'edgesBySource', 'edgesByTarget', 'edgesByType'], 'readwrite');
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await graphDb.init();
    });

    it('should record entity visit event', async () => {
      const entityVisitEvent = {
        entityId: 'A123456789',
        entityType: 'author' as const,
        sessionId: 'session_123',
        source: 'search_results',
        timestamp: Date.now(),
      };

      await graphDb.recordEntityVisit(entityVisitEvent);

      expect(mockDB.transaction).toHaveBeenCalledWith(['vertices', 'verticesByType', 'verticesByEntityType'], 'readwrite');
    });

    it('should record query execution event', async () => {
      const queryExecutionEvent = {
        queryText: 'machine learning',
        queryParameters: {},
        entityIds: ['A123456789'],
        sessionId: 'session_123',
        timestamp: Date.now(),
        resultCount: 42,
      };

      await graphDb.recordQueryExecution(queryExecutionEvent);

      expect(mockDB.transaction).toHaveBeenCalledWith(['vertices', 'verticesByType', 'edges', 'edgesBySource', 'edgesByTarget', 'edgesByType'], 'readwrite');
    });
  });

  describe('Encounter Management', () => {
    beforeEach(async () => {
      await graphDb.init();
    });

    it('should record entity encounter', async () => {
      const entityEncounterEvent = {
        entityId: 'A123456789',
        entityType: 'author' as const,
        encounterType: EncounterType.DIRECT_VISIT,
        sessionId: 'session_123',
        timestamp: Date.now(),
        contextVertexId: 'query_123',
        metadata: { source: 'search' },
      };

      await graphDb.recordEntityEncounter(entityEncounterEvent);

      expect(mockDB.transaction).toHaveBeenCalledWith(['vertices', 'verticesByType', 'verticesByEntityType'], 'readwrite');
    });

    it('should get vertex by id', async () => {
      const vertexId = 'A123456789';

      await graphDb.getVertex(vertexId);

      expect(mockDB.transaction).toHaveBeenCalledWith(['vertices'], 'readonly');
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization errors', async () => {
      mockOpenDB.mockRejectedValueOnce(new Error('Database error'));

      await expect(graphDb.init()).rejects.toThrow('Database error');
    });

    it('should handle transaction errors gracefully', async () => {
      await graphDb.init();
      
      mockDB.transaction.mockImplementationOnce(() => {
        throw new Error('Transaction error');
      });

      const mockVertex = {
        id: 'entity_test',
        type: 'entity' as const,
        entityType: 'author' as const,
        entityId: 'test',
        attributes: {},
        metadata: {
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          version: 1,
        },
      };
      await expect(graphDb.createVertex(mockVertex)).rejects.toThrow('Transaction error');
    });
  });
});