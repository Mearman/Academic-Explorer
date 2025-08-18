/**
 * Integration test for entity history persistence
 * Tests that entity visits are correctly persisted to simple storage
 * and can be loaded back into the Zustand store.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import type { EntityVisitEvent, EntityType } from '@/types/entity-graph';
import { EncounterType } from '@/types/entity-graph';

// Mock localStorage
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockLocalStorage.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => mockLocalStorage.store.set(key, value)),
  removeItem: vi.fn((key: string) => mockLocalStorage.store.delete(key)),
  clear: vi.fn(() => mockLocalStorage.store.clear()),
};

// Mock the simple graph storage
vi.mock('@/lib/simple-graph-storage', () => {
  return {
    simpleGraphStorage: {
      load: vi.fn(() => ({
        entities: {},
        edges: {},
        visitedEntityIds: [],
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalVisits: 0,
          uniqueEntitiesVisited: 0,
        },
      })),
      save: vi.fn(),
      upsertEntity: vi.fn(),
      markEntityVisited: vi.fn(),
      addEdge: vi.fn(),
      removeEntity: vi.fn(),
      clear: vi.fn(),
    },
  };
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Entity History Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.store.clear();
  });

  afterEach(async () => {
    // Clean up any test data
    mockLocalStorage.store.clear();
  });

  it('should hydrate store from simple storage on initialization', async () => {
    const { result } = renderHook(() => useEntityGraphStore());
    
    expect(result.current.isHydrated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    
    await act(async () => {
      await result.current.hydrateFromIndexedDB();
    });
    
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should persist entity visits to simple storage', async () => {
    const { result } = renderHook(() => useEntityGraphStore());
    
    const visitEvent: EntityVisitEvent = {
      entityId: 'A123456789',
      entityType: 'author' as EntityType,
      displayName: 'Test Author',
      timestamp: new Date().toISOString(),
      source: 'direct',
      metadata: {
        url: 'http://localhost:3000/authors/A123456789',
      },
    };
    
    await act(async () => {
      await result.current.visitEntity(visitEvent);
    });
    
    // Should update in-memory store
    expect(result.current.graph.vertices.has('A123456789')).toBe(true);
    expect(result.current.graph.directlyVisitedVertices.has('A123456789')).toBe(true);
    
    // Should persist minimal data to simple storage
    const { simpleGraphStorage } = await import('@/lib/simple-graph-storage');
    expect(simpleGraphStorage.upsertEntity).toHaveBeenCalledWith('A123456789', 'author', 'Test Author');
    expect(simpleGraphStorage.markEntityVisited).toHaveBeenCalledWith('A123456789');
  });

  it('should load existing entities from simple storage', async () => {
    // Mock existing data in simple storage
    const { simpleGraphStorage } = await import('@/lib/simple-graph-storage');
    (simpleGraphStorage.load as any).mockResolvedValue({
      entities: {
        'A987654321': {
          id: 'A987654321',
          entityType: 'author',
          displayName: 'Existing Author',
        },
      },
      edges: {},
      visitedEntityIds: ['A987654321'],
      metadata: {
        lastUpdated: '2024-01-01T10:00:00Z',
        totalVisits: 2,
        uniqueEntitiesVisited: 1,
      },
    });
    
    const { result } = renderHook(() => useEntityGraphStore());
    
    await act(async () => {
      await result.current.hydrateFromIndexedDB();
    });
    
    // Should load existing entity into memory with generated encounter data
    expect(result.current.graph.vertices.has('A987654321')).toBe(true);
    expect(result.current.graph.directlyVisitedVertices.has('A987654321')).toBe(true);
    
    const loadedVertex = result.current.graph.vertices.get('A987654321');
    expect(loadedVertex).toBeDefined();
    expect(loadedVertex?.displayName).toBe('Existing Author');
    expect(loadedVertex?.directlyVisited).toBe(true);
    expect(loadedVertex?.visitCount).toBe(1); // Generated from visited status
  });

  it('should handle hydration errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { simpleGraphStorage } = await import('@/lib/simple-graph-storage');
    (simpleGraphStorage.load as any).mockRejectedValue(new Error('Storage error'));
    
    const { result } = renderHook(() => useEntityGraphStore());
    
    await act(async () => {
      await result.current.hydrateFromIndexedDB();
    });
    
    // Should still mark as hydrated to prevent retry loops
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  it('should handle entity visit persistence errors gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { simpleGraphStorage } = await import('@/lib/simple-graph-storage');
    (simpleGraphStorage.upsertEntity as any).mockRejectedValue(new Error('Persistence error'));
    
    const { result } = renderHook(() => useEntityGraphStore());
    
    const visitEvent: EntityVisitEvent = {
      entityId: 'A123456789',
      entityType: 'author' as EntityType,
      displayName: 'Test Author',
      timestamp: new Date().toISOString(),
      source: 'direct',
      metadata: {},
    };
    
    await act(async () => {
      await result.current.visitEntity(visitEvent);
    });
    
    // Should still update in-memory store even if persistence fails
    expect(result.current.graph.vertices.has('A123456789')).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to persist entity visit to simple storage'),
      expect.any(Error)
    );
    
    consoleWarnSpy.mockRestore();
  });
});