/**
 * Database testing utilities
 * Provides mock implementations for database testing
 */

import type { IDBPDatabase, openDB } from 'idb';
import { vi } from 'vitest';

export interface MockDatabase {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  getAllKeys: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  objectStoreNames: {
    contains: ReturnType<typeof vi.fn>;
  };
  createObjectStore: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

export interface MockTransaction {
  objectStore: ReturnType<typeof vi.fn>;
  done: Promise<void>;
}

export interface MockObjectStore {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  getAllKeys: ReturnType<typeof vi.fn>;
}

export function createMockDatabase(): MockDatabase {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getAllKeys: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
    objectStoreNames: {
      contains: vi.fn().mockReturnValue(false),
    },
    createObjectStore: vi.fn(),
    close: vi.fn(),
  };
}

export function createMockTransaction(): MockTransaction {
  return {
    objectStore: vi.fn(),
    done: Promise.resolve(),
  };
}

export function createMockObjectStore(): MockObjectStore {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getAllKeys: vi.fn().mockResolvedValue([]),
  };
}

interface CreateMockOpenDBOptions {
  mockDB: MockDatabase;
  mockTransaction: MockTransaction;
}

export function createMockOpenDB(options: CreateMockOpenDBOptions): typeof openDB {
  const { mockDB, mockTransaction } = options;
  
  return vi.fn().mockImplementation((
    name: string, 
    version?: number, 
    config?: { 
      upgrade?: (db: unknown, oldVersion: number, newVersion: number | null, transaction: unknown, event: IDBVersionChangeEvent) => void,
      blocked?: () => void,
      blocking?: () => void,
      terminated?: () => void
    }
  ) => {
    if (config && config.upgrade && version !== undefined) {
      config.upgrade(mockDB, 0, version, mockTransaction, {} as IDBVersionChangeEvent);
    }
    return Promise.resolve(mockDB as unknown as IDBPDatabase);
  }) as typeof openDB;
}