/**
 * User interactions database using Dexie
 * Unified tracking of page visits and bookmarks with URL normalization
 */

import Dexie, { type Table } from "dexie";
import { GenericLogger } from "../logger.js";
import { normalizeQueryForCaching } from "../static-data/cache-utilities.js";

// Database schema interfaces
export type BookmarkType = "entity" | "search" | "list";

export interface BookmarkRecord {
  id?: number;
  bookmarkType: BookmarkType;
  // Entity bookmarks
  entityId?: string;
  entityType?: string;
  // Search/list bookmarks
  searchQuery?: string;
  filters?: Record<string, any>;
  resultCount?: number;
  // Common fields
  timestamp: Date;
  title: string;
  notes?: string;
  tags?: string[];
  url: string;
  queryParams?: Record<string, string>;
}

export interface PageVisitRecord {
  id?: number;
  normalizedUrl: string; // Normalized URL similar to caching
  originalUrl: string; // Original URL as visited
  pageType: "search" | "list" | "entity" | "unknown";
  timestamp: Date;
  sessionId?: string;
  referrer?: string;
  // Additional metadata based on page type
  searchQuery?: string;
  filters?: Record<string, any>;
  entityId?: string;
  entityType?: string;
  resultCount?: number;
}

// Page type detection utilities
export function detectPageType(url: string): {
  pageType: PageVisitRecord["pageType"];
  entityId?: string;
  entityType?: string;
  searchQuery?: string;
  filters?: Record<string, any>;
} {
  const urlObj = new URL(
    url.startsWith("http") ? url : `https://example.com${url}`,
  );
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // Entity pages: /works/:id, /authors/:id, /institutions/:id, /topics/:id, /funders/:id, /sources/:id
  const entityMatch = pathname.match(
    /^\/(works|authors|institutions|topics|funders|sources)\/([^/?]+)/,
  );
  if (entityMatch) {
    const [, entityType, entityId] = entityMatch;
    return {
      pageType: "entity",
      entityId,
      entityType,
    };
  }

  // Search page: /search
  if (pathname === "/search") {
    const query = searchParams.get("q") || "";
    const filters: Record<string, any> = {};

    // Extract common filter parameters
    for (const [key, value] of searchParams.entries()) {
      if (key !== "q") {
        filters[key] = value;
      }
    }

    return {
      pageType: "search",
      searchQuery: query,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  // List pages: /works, /authors, /institutions, /topics, /funders, /sources, /publishers (without specific ID)
  const listMatch = pathname.match(
    /^\/(works|authors|institutions|topics|funders|sources|publishers)(?:\/)?$/,
  );
  if (listMatch) {
    const [, entityType] = listMatch;
    const filters: Record<string, any> = {};

    // Extract filter parameters
    for (const [key, value] of searchParams.entries()) {
      filters[key] = value;
    }

    return {
      pageType: "list",
      entityType,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  return { pageType: "unknown" };
}

// Dexie database class
class UserInteractionsDB extends Dexie {
  bookmarks!: Table<BookmarkRecord>;
  pageVisits!: Table<PageVisitRecord>;

  constructor() {
    super("user-interactions");

    // Unified schema with only bookmarks and pageVisits tables
    this.version(2).stores({
      bookmarks:
        "++id, bookmarkType, entityId, entityType, searchQuery, timestamp, title, url, *tags",
      pageVisits: "++id, normalizedUrl, pageType, timestamp",
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
 * Service for managing user page visits and bookmarks
 */
export class UserInteractionsService {
  private db: UserInteractionsDB;
  private logger?: GenericLogger;

  constructor(logger?: GenericLogger) {
    this.db = getDB();
    this.logger = logger;
  }

  /**
   * Record a page visit with automatic type detection and URL normalization
   */
  async recordPageVisit(
    url: string,
    metadata?: {
      searchQuery?: string;
      filters?: Record<string, any>;
      entityId?: string;
      entityType?: string;
      resultCount?: number;
    },
    sessionId?: string,
    referrer?: string,
  ): Promise<void> {
    try {
      // Detect page type and extract metadata
      const detection = detectPageType(url);

      // Normalize the URL similar to how caching works
      const urlObj = new URL(
        url.startsWith("http") ? url : `https://example.com${url}`,
      );
      const normalizedQuery = normalizeQueryForCaching(urlObj.search);
      const normalizedUrl = `${urlObj.pathname}${normalizedQuery}`;

      const pageVisit: PageVisitRecord = {
        normalizedUrl,
        originalUrl: url,
        timestamp: new Date(),
        sessionId,
        referrer,
        // Merge detected metadata with provided metadata
        ...detection,
        ...metadata,
      };

      await this.db.pageVisits.add(pageVisit);

      this.logger?.debug("user-interactions", "Page visit recorded", {
        normalizedUrl,
        pageType: detection.pageType,
        hasMetadata: !!metadata && Object.keys(metadata).length > 0,
      });
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to record page visit", {
        url,
        error,
      });
    }
  }

  /**
   * Get recent page visits across all pages
   */
  async getRecentPageVisits(limit = 50): Promise<PageVisitRecord[]> {
    try {
      return await this.db.pageVisits
        .orderBy("timestamp")
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to get recent page visits",
        {
          error,
        },
      );
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
        "Failed to check entity bookmark status",
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
   * Check if a search is bookmarked
   */
  async isSearchBookmarked(
    searchQuery: string,
    filters?: Record<string, any>,
  ): Promise<boolean> {
    try {
      let query = this.db.bookmarks
        .where("bookmarkType")
        .equals("search")
        .filter((bookmark) => bookmark.searchQuery === searchQuery);

      if (filters) {
        query = query.filter((bookmark) => {
          if (!bookmark.filters) return false;
          return JSON.stringify(bookmark.filters) === JSON.stringify(filters);
        });
      }

      const count = await query.count();
      return count > 0;
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to check search bookmark status",
        {
          searchQuery,
          filters,
          error,
        },
      );
      return false;
    }
  }

  /**
   * Check if a list is bookmarked
   */
  async isListBookmarked(url: string): Promise<boolean> {
    try {
      const count = await this.db.bookmarks
        .where("bookmarkType")
        .equals("list")
        .filter((bookmark) => bookmark.url === url)
        .count();

      return count > 0;
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to check list bookmark status",
        {
          url,
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
   * Get bookmark for a search
   */
  async getSearchBookmark(
    searchQuery: string,
    filters?: Record<string, any>,
  ): Promise<BookmarkRecord | null> {
    try {
      let query = this.db.bookmarks
        .where("bookmarkType")
        .equals("search")
        .filter((bookmark) => bookmark.searchQuery === searchQuery);

      if (filters) {
        query = query.filter((bookmark) => {
          if (!bookmark.filters) return false;
          return JSON.stringify(bookmark.filters) === JSON.stringify(filters);
        });
      }

      const bookmark = await query.first();
      return bookmark ?? null;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to get search bookmark", {
        searchQuery,
        filters,
        error,
      });
      return null;
    }
  }

  /**
   * Get bookmark for a list
   */
  async getListBookmark(url: string): Promise<BookmarkRecord | null> {
    try {
      const bookmark = await this.db.bookmarks
        .where("bookmarkType")
        .equals("list")
        .filter((bookmark) => bookmark.url === url)
        .first();

      return bookmark ?? null;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to get list bookmark", {
        url,
        error,
      });
      return null;
    }
  }

  /**
   * Add a bookmark (entity, search, or list)
   */
  async addBookmark(
    bookmark: Omit<BookmarkRecord, "id" | "timestamp">,
  ): Promise<number> {
    try {
      const bookmarkWithTimestamp: BookmarkRecord = {
        ...bookmark,
        timestamp: new Date(),
      };

      const id = await this.db.bookmarks.add(bookmarkWithTimestamp);

      this.logger?.debug("user-interactions", "Bookmark added", {
        id,
        bookmarkType: bookmark.bookmarkType,
        entityId: bookmark.entityId,
        entityType: bookmark.entityType,
        searchQuery: bookmark.searchQuery,
        title: bookmark.title,
      });

      return id;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to add bookmark", {
        bookmarkType: bookmark.bookmarkType,
        entityId: bookmark.entityId,
        entityType: bookmark.entityType,
        searchQuery: bookmark.searchQuery,
        error,
      });
      throw error;
    }
  }

  /**
   * Add an entity bookmark
   */
  async addEntityBookmark(
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
        bookmarkType: "entity",
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
   * Add a search bookmark
   */
  async addSearchBookmark(
    searchQuery: string,
    filters: Record<string, any> | undefined,
    title: string,
    url: string,
    queryParams?: Record<string, string>,
    notes?: string,
    tags?: string[],
  ): Promise<number> {
    try {
      const bookmark: BookmarkRecord = {
        bookmarkType: "search",
        searchQuery,
        filters,
        timestamp: new Date(),
        title,
        url,
        queryParams,
        notes,
        tags,
      };

      const id = await this.db.bookmarks.add(bookmark);

      this.logger?.debug("user-interactions", "Search bookmark added", {
        searchQuery,
        title,
        bookmarkId: id,
      });

      return id;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to add search bookmark", {
        searchQuery,
        title,
        error,
      });
      throw error;
    }
  }

  /**
   * Add a list bookmark
   */
  async addListBookmark(
    title: string,
    url: string,
    queryParams?: Record<string, string>,
    notes?: string,
    tags?: string[],
  ): Promise<number> {
    try {
      const bookmark: BookmarkRecord = {
        bookmarkType: "list",
        timestamp: new Date(),
        title,
        url,
        queryParams,
        notes,
        tags,
      };

      const id = await this.db.bookmarks.add(bookmark);

      this.logger?.debug("user-interactions", "List bookmark added", {
        title,
        url,
        bookmarkId: id,
      });

      return id;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to add list bookmark", {
        title,
        url,
        error,
      });
      throw error;
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
   * Get page visit statistics
   */
  async getPageVisitStats(): Promise<{
    totalVisits: number;
    uniqueUrls: number;
    byType: Record<string, number>;
    mostVisitedUrl: {
      normalizedUrl: string;
      count: number;
    } | null;
  }> {
    try {
      const visits = await this.db.pageVisits.toArray();

      const totalVisits = visits.length;

      const urlCounts = new Map<string, number>();
      const typeCounts: Record<string, number> = {};

      visits.forEach((visit) => {
        // Count by URL
        const count = urlCounts.get(visit.normalizedUrl) || 0;
        urlCounts.set(visit.normalizedUrl, count + 1);

        // Count by type
        typeCounts[visit.pageType] = (typeCounts[visit.pageType] || 0) + 1;
      });

      const uniqueUrls = urlCounts.size;

      let mostVisitedUrl: {
        normalizedUrl: string;
        count: number;
      } | null = null;
      for (const [url, count] of urlCounts) {
        if (!mostVisitedUrl || count > mostVisitedUrl.count) {
          mostVisitedUrl = { normalizedUrl: url, count };
        }
      }

      return {
        totalVisits,
        uniqueUrls,
        byType: typeCounts,
        mostVisitedUrl,
      };
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to get page visit stats",
        {
          error,
        },
      );
      return {
        totalVisits: 0,
        uniqueUrls: 0,
        byType: {},
        mostVisitedUrl: null,
      };
    }
  }

  /**
   * Get page visits by type
   */
  async getPageVisitsByType(
    pageType: string,
    limit = 20,
  ): Promise<PageVisitRecord[]> {
    try {
      return await this.db.pageVisits
        .where("pageType")
        .equals(pageType)
        .reverse()
        .sortBy("timestamp")
        .then((results) => results.slice(0, limit));
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to get page visits by type",
        {
          pageType,
          error,
        },
      );
      return [];
    }
  }

  /**
   * Get popular search queries from page visits
   */
  async getPopularSearches(
    limit = 10,
  ): Promise<{ query: string; count: number }[]> {
    try {
      const searchVisits = await this.db.pageVisits
        .where("pageType")
        .equals("search")
        .toArray();

      const queryCounts = new Map<string, number>();
      searchVisits.forEach((visit) => {
        if (visit.searchQuery) {
          const count = queryCounts.get(visit.searchQuery) || 0;
          queryCounts.set(visit.searchQuery, count + 1);
        }
      });

      return Array.from(queryCounts.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to get popular searches",
        {
          error,
        },
      );
      return [];
    }
  }
}

// Export singleton instance
export const userInteractionsService: UserInteractionsService =
  new UserInteractionsService();
