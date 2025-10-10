/**
 * User interactions database using Dexie
 * Manages visits and bookmarks for entity pages
 */

import Dexie, { type Table } from "dexie";
import { GenericLogger } from "../logger.js";

// Database schema interfaces
export interface VisitRecord {
  id?: number;
  entityId: string;
  entityType: string;
  timestamp: Date;
  url: string;
  queryParams?: Record<string, string>;
  referrer?: string;
  sessionId?: string;
}

export interface BookmarkRecord {
  id?: number;
  entityId: string;
  entityType: string;
  timestamp: Date;
  title: string;
  notes?: string;
  tags?: string[];
  url: string;
  queryParams?: Record<string, string>;
}

// Dexie database class
class UserInteractionsDB extends Dexie {
  visits!: Table<VisitRecord>;
  bookmarks!: Table<BookmarkRecord>;

  constructor() {
    super("user-interactions");

    this.version(1).stores({
      visits: "++id, entityId, entityType, timestamp, url",
      bookmarks: "++id, entityId, entityType, timestamp, title, url, *tags",
    });
  }
}

// Singleton instance
let dbInstance: UserInteractionsDB | null = null;

const getDB = (): UserInteractionsDB => {
  if (!dbInstance) {
    dbInstance = new UserInteractionsDB();
  }
  return dbInstance;
};

/**
 * Service for managing user visits and bookmarks
 */
export class UserInteractionsService {
  private db: UserInteractionsDB;
  private logger?: GenericLogger;

  constructor(logger?: GenericLogger) {
    this.db = getDB();
    this.logger = logger;
  }

  /**
   * Record a visit to an entity page
   */
  async recordVisit(
    entityId: string,
    entityType: string,
    url: string,
    queryParams?: Record<string, string>,
    referrer?: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const visit: VisitRecord = {
        entityId,
        entityType,
        timestamp: new Date(),
        url,
        queryParams,
        referrer,
        sessionId,
      };

      await this.db.visits.add(visit);

      this.logger?.debug("user-interactions", "Visit recorded", {
        entityId,
        entityType,
        url,
        hasQueryParams: !!queryParams && Object.keys(queryParams).length > 0,
      });
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to record visit", {
        entityId,
        entityType,
        error,
      });
    }
  }

  /**
   * Get visit history for an entity
   */
  async getEntityVisits(
    entityId: string,
    entityType: string,
  ): Promise<VisitRecord[]> {
    try {
      return await this.db.visits
        .where("[entityId+entityType]")
        .equals([entityId, entityType])
        .reverse()
        .sortBy("timestamp");
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to get entity visits", {
        entityId,
        entityType,
        error,
      });
      return [];
    }
  }

  /**
   * Get recent visits across all entities
   */
  async getRecentVisits(limit = 50): Promise<VisitRecord[]> {
    try {
      return await this.db.visits
        .orderBy("timestamp")
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to get recent visits", {
        error,
      });
      return [];
    }
  }

  /**
   * Check if an entity is bookmarked
   */
  async isEntityBookmarked(
    entityId: string,
    entityType: string,
  ): Promise<boolean> {
    try {
      const count = await this.db.bookmarks
        .where("[entityId+entityType]")
        .equals([entityId, entityType])
        .count();

      return count > 0;
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to check bookmark status",
        {
          entityId,
          entityType,
          error,
        },
      );
      return false;
    }
  }

  /**
   * Get bookmark for an entity
   */
  async getEntityBookmark(
    entityId: string,
    entityType: string,
  ): Promise<BookmarkRecord | null> {
    try {
      const bookmark = await this.db.bookmarks
        .where("[entityId+entityType]")
        .equals([entityId, entityType])
        .first();

      return bookmark ?? null;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to get entity bookmark", {
        entityId,
        entityType,
        error,
      });
      return null;
    }
  }

  /**
   * Get all bookmarks
   */
  async getAllBookmarks(): Promise<BookmarkRecord[]> {
    try {
      return await this.db.bookmarks.orderBy("timestamp").reverse().toArray();
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to get all bookmarks", {
        error,
      });
      return [];
    }
  }

  /**
   * Add a bookmark
   */
  async addBookmark(
    entityId: string,
    entityType: string,
    title: string,
    url: string,
    queryParams?: Record<string, string>,
    notes?: string,
    tags?: string[],
  ): Promise<number> {
    try {
      const bookmark: BookmarkRecord = {
        entityId,
        entityType,
        timestamp: new Date(),
        title,
        url,
        queryParams,
        notes,
        tags,
      };

      const id = await this.db.bookmarks.add(bookmark);

      this.logger?.debug("user-interactions", "Bookmark added", {
        entityId,
        entityType,
        title,
        bookmarkId: id,
      });

      return id;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to add bookmark", {
        entityId,
        entityType,
        title,
        error,
      });
      throw error;
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(bookmarkId: number): Promise<void> {
    try {
      await this.db.bookmarks.delete(bookmarkId);

      this.logger?.debug("user-interactions", "Bookmark removed", {
        bookmarkId,
      });
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to remove bookmark", {
        bookmarkId,
        error,
      });
      throw error;
    }
  }

  /**
   * Update a bookmark
   */
  async updateBookmark(
    bookmarkId: number,
    updates: Partial<Pick<BookmarkRecord, "title" | "notes" | "tags">>,
  ): Promise<void> {
    try {
      await this.db.bookmarks.update(bookmarkId, updates);

      this.logger?.debug("user-interactions", "Bookmark updated", {
        bookmarkId,
        updates,
      });
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to update bookmark", {
        bookmarkId,
        updates,
        error,
      });
      throw error;
    }
  }

  /**
   * Search bookmarks by title, notes, or tags
   */
  async searchBookmarks(query: string): Promise<BookmarkRecord[]> {
    try {
      const bookmarks = await this.db.bookmarks.toArray();

      const lowercaseQuery = query.toLowerCase();

      return bookmarks.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(lowercaseQuery) ||
          bookmark.notes?.toLowerCase().includes(lowercaseQuery) ||
          bookmark.tags?.some((tag) =>
            tag.toLowerCase().includes(lowercaseQuery),
          ),
      );
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to search bookmarks", {
        query,
        error,
      });
      return [];
    }
  }

  /**
   * Clear old visit records (older than specified days)
   */
  async clearOldVisits(olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const deletedCount = await this.db.visits
        .where("timestamp")
        .below(cutoffDate)
        .delete();

      this.logger?.debug("user-interactions", "Old visits cleared", {
        deletedCount,
        olderThanDays,
      });

      return deletedCount;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to clear old visits", {
        olderThanDays,
        error,
      });
      return 0;
    }
  }

  /**
   * Get visit statistics
   */
  async getVisitStats(): Promise<{
    totalVisits: number;
    uniqueEntities: number;
    mostVisitedEntity: {
      entityId: string;
      entityType: string;
      count: number;
    } | null;
  }> {
    try {
      const visits = await this.db.visits.toArray();

      const totalVisits = visits.length;

      const entityCounts = new Map<
        string,
        { entityId: string; entityType: string; count: number }
      >();
      visits.forEach((visit) => {
        const key = `${visit.entityType}:${visit.entityId}`;
        const existing = entityCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          entityCounts.set(key, {
            entityId: visit.entityId,
            entityType: visit.entityType,
            count: 1,
          });
        }
      });

      const uniqueEntities = entityCounts.size;

      let mostVisitedEntity: {
        entityId: string;
        entityType: string;
        count: number;
      } | null = null;
      for (const [, stats] of entityCounts) {
        if (!mostVisitedEntity || stats.count > mostVisitedEntity.count) {
          mostVisitedEntity = stats;
        }
      }

      return {
        totalVisits,
        uniqueEntities,
        mostVisitedEntity,
      };
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to get visit stats", {
        error,
      });
      return {
        totalVisits: 0,
        uniqueEntities: 0,
        mostVisitedEntity: null,
      };
    }
  }
}

// Export singleton instance
export const userInteractionsService = new UserInteractionsService();
