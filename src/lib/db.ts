import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface AcademicExplorerDB extends DBSchema {
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
}

export class DatabaseService {
  private db: IDBPDatabase<AcademicExplorerDB> | null = null;
  private readonly DB_NAME = 'academic-explorer';
  private readonly DB_VERSION = 1;
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