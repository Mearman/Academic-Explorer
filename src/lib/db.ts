import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
export interface AcademicExplorerDB extends DBSchema {
  searchResults: {
    key: string; // query hash
    value: {
      query: string;
      results: unknown[];
      timestamp: number;
      totalCount: number;
      filters?: Record<string, unknown>;
    };
  };
  papers: {
    key: string; // paper ID
    value: {
      id: string;
      title: string;
      authors: string[];
      abstract?: string;
      year?: number;
      doi?: string;
      citations?: number;
      savedAt: number;
      tags?: string[];
      notes?: string;
    };
  };
  citations: {
    key: string; // citation ID
    value: {
      id: string;
      paperId: string;
      citingPaperId: string;
      context?: string;
      timestamp: number;
    };
  };
  collections: {
    key: string; // collection ID
    value: {
      id: string;
      name: string;
      description?: string;
      paperIds: string[];
      createdAt: number;
      updatedAt: number;
    };
  };
  searchFilters: {
    key: string; // filter key (e.g., 'default', 'saved-search-1')
    value: Record<string, unknown>; // Flexible object to store any filter data
  };
  keyValue: {
    key: string; // arbitrary key for key-value storage
    value: {
      key: string;
      value: string;
      timestamp: number;
    };
  };
}

export class DatabaseService {
  private db: IDBPDatabase<AcademicExplorerDB> | null = null;
  private readonly DB_NAME = 'academic-explorer';
  private readonly DB_VERSION = 2;
  private openDBFn: typeof openDB;

  constructor(openDBFn: typeof openDB = openDB) {
    this.openDBFn = openDBFn;
  }

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await this.openDBFn<AcademicExplorerDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create object stores
        if (!db.objectStoreNames.contains('searchResults')) {
          db.createObjectStore('searchResults');
        }

        if (!db.objectStoreNames.contains('papers')) {
          db.createObjectStore('papers');
        }

        if (!db.objectStoreNames.contains('citations')) {
          db.createObjectStore('citations');
        }

        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections');
        }

        if (!db.objectStoreNames.contains('searchFilters')) {
          db.createObjectStore('searchFilters');
        }

        if (!db.objectStoreNames.contains('keyValue')) {
          db.createObjectStore('keyValue');
        }
      },
    });
  }

  private async ensureDB(): Promise<IDBPDatabase<AcademicExplorerDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialise database');
    }
    return this.db;
  }

  // Search Results Cache
  async cacheSearchResults(
    query: string,
    results: unknown[],
    totalCount: number,
    filters?: Record<string, unknown>
  ): Promise<void> {
    const db = await this.ensureDB();
    const key = this.hashQuery(query, filters);
    
    await db.put('searchResults', {
      query,
      results,
      totalCount,
      filters,
      timestamp: Date.now(),
    }, key);
  }

  async getSearchResults(
    query: string,
    filters?: Record<string, unknown>,
    maxAge = 24 * 60 * 60 * 1000 // 24 hours
  ) {
    const db = await this.ensureDB();
    const key = this.hashQuery(query, filters);
    const cached = await db.get('searchResults', key);

    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached;
    }
    return null;
  }

  // Papers Management
  async savePaper(paper: AcademicExplorerDB['papers']['value']): Promise<void> {
    const db = await this.ensureDB();
    await db.put('papers', {
      ...paper,
      savedAt: paper.savedAt || Date.now(),
    });
  }

  async getPaper(id: string) {
    const db = await this.ensureDB();
    return db.get('papers', id);
  }

  async getAllPapers() {
    const db = await this.ensureDB();
    return db.getAll('papers');
  }

  async deletePaper(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('papers', id);
  }

  // Collections Management
  async createCollection(name: string, description?: string) {
    const db = await this.ensureDB();
    const id = this.generateId();
    const now = Date.now();
    
    await db.put('collections', {
      id,
      name,
      description,
      paperIds: [],
      createdAt: now,
      updatedAt: now,
    });
    
    return id;
  }

  async addToCollection(collectionId: string, paperId: string): Promise<void> {
    const db = await this.ensureDB();
    const collection = await db.get('collections', collectionId);
    
    if (collection) {
      if (!collection.paperIds.includes(paperId)) {
        collection.paperIds.push(paperId);
        collection.updatedAt = Date.now();
        await db.put('collections', collection);
      }
    }
  }

  async getCollections() {
    const db = await this.ensureDB();
    return db.getAll('collections');
  }

  // Search Filters Management
  async saveSearchFilters(key: string, filters: Record<string, unknown>): Promise<void> {
    const db = await this.ensureDB();
    await db.put('searchFilters', filters, key);
  }

  async getSearchFilters(key: string): Promise<Record<string, unknown> | null> {
    const db = await this.ensureDB();
    const result = await db.get('searchFilters', key);
    return result || null;
  }

  async deleteSearchFilters(key: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('searchFilters', key);
  }

  async getAllSearchFilters(): Promise<Record<string, Record<string, unknown>>> {
    const db = await this.ensureDB();
    const keys = await db.getAllKeys('searchFilters');
    const values = await db.getAll('searchFilters');
    
    const result: Record<string, Record<string, unknown>> = {};
    keys.forEach((key, index) => {
      if (typeof key === 'string' && values[index]) {
        result[key] = values[index];
      }
    });
    
    return result;
  }

  // Cleanup utilities
  async cleanOldSearchResults(daysOld = 30): Promise<number> {
    const db = await this.ensureDB();
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deleted = 0;

    const keys = await db.getAllKeys('searchResults');
    
    for (const key of keys) {
      const value = await db.get('searchResults', key);
      if (value && value.timestamp < cutoff) {
        await db.delete('searchResults', key);
        deleted++;
      }
    }
    
    return deleted;
  }

  async cleanOldSearchFilters(daysOld = 90): Promise<number> {
    const db = await this.ensureDB();
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deleted = 0;

    const keys = await db.getAllKeys('searchFilters');
    
    for (const key of keys) {
      const value = await db.get('searchFilters', key);
      if (value && typeof value === 'object' && value !== null) {
        const filters = value as Record<string, unknown>;
        const savedAt = filters.savedAt;
        
        if (typeof savedAt === 'number' && savedAt < cutoff) {
          await db.delete('searchFilters', key);
          deleted++;
        }
      }
    }
    
    return deleted;
  }

  async clearAllStores(): Promise<void> {
    const db = await this.ensureDB();
    
    // Clear all object stores
    const stores = ['searchResults', 'papers', 'citations', 'collections', 'searchFilters', 'keyValue'] as const;
    
    for (const storeName of stores) {
      try {
        const keys = await db.getAllKeys(storeName);
        for (const key of keys) {
          await db.delete(storeName, key);
        }
      } catch (error) {
        console.error(`Failed to clear store ${storeName}:`, error);
      }
    }
  }

  async getStorageEstimate(): Promise<{ usage?: number; quota?: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
      };
    }
    return {};
  }

  // Key-Value storage methods for hybrid storage interface
  async getKeyValue(key: string): Promise<string | null> {
    const db = await this.ensureDB();
    const result = await db.get('keyValue', key);
    return result?.value ?? null;
  }

  async setKeyValue(key: string, value: string): Promise<void> {
    const db = await this.ensureDB();
    await db.put('keyValue', {
      key,
      value,
      timestamp: Date.now(),
    }, key);
  }

  async deleteKeyValue(key: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('keyValue', key);
  }

  // Helper methods
  private hashQuery(query: string, filters?: Record<string, unknown>): string {
    const str = JSON.stringify({ query, filters });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const db = new DatabaseService();