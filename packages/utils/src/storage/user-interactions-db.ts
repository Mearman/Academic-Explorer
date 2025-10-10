/**
 * User interactions database using Dexie
 * Unified tracking of page visits and bookmarks with normalized OpenAlex requests
 */

import Dexie, { type Table } from "dexie";
import { GenericLogger } from "../logger.js";

// Database schema interfaces

export interface BookmarkRecord {
  id?: number;
  /** The normalized OpenAlex request that this bookmark represents */
  request: StoredNormalizedRequest;
  /** User-provided title for the bookmark */
  title: string;
  /** Optional user notes */
  notes?: string;
  /** User-defined tags for organization */
  tags?: string[];
  /** When the bookmark was created */
  timestamp: Date;
}

/**
 * Normalized OpenAlex request stored with visit
 * This matches the structure from @academic-explorer/client
 */
export interface StoredNormalizedRequest {
  /** Cache key for lookups */
  cacheKey: string;
  /** Request hash for deduplication */
  hash: string;
  /** Original endpoint */
  endpoint: string;
  /** Normalized params as JSON string (for storage) */
  params: string;
}

export interface PageVisitRecord {
  id?: number;
  /** Normalized OpenAlex request that generated this visit */
  request: StoredNormalizedRequest;
  /** Visit timestamp */
  timestamp: Date;
  /** Session identifier (optional) */
  sessionId?: string;
  /** Referrer URL (optional) */
  referrer?: string;
  /** Response duration in ms (optional) */
  duration?: number;
  /** Whether the response was cached */
  cached: boolean;
  /** Bytes saved via caching (optional) */
  bytesSaved?: number;
}

// Dexie database class
class UserInteractionsDB extends Dexie {
  bookmarks!: Table<BookmarkRecord>;
  pageVisits!: Table<PageVisitRecord>;

  constructor() {
    super("user-interactions");

    // V2: Legacy schema (entity/search/list based)
    this.version(2).stores({
      bookmarks:
        "++id, bookmarkType, entityId, entityType, searchQuery, timestamp, title, url, *tags",
      pageVisits: "++id, normalizedUrl, pageType, timestamp",
    });

    // V3: Unified request-based schema
    this.version(3).stores({
      bookmarks:
        "++id, request.cacheKey, request.hash, request.endpoint, timestamp, *tags",
      pageVisits: "++id, request.cacheKey, request.hash, request.endpoint, timestamp, cached",
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
   * Record a page visit with normalized OpenAlex request
   * @param request - The normalized request from @academic-explorer/client
   */
  async recordPageVisit(
    request: {
      cacheKey: string;
      hash: string;
      endpoint: string;
      params: Record<string, unknown>;
    },
    metadata?: {
      sessionId?: string;
      referrer?: string;
      duration?: number;
      cached?: boolean;
      bytesSaved?: number;
    },
  ): Promise<void> {
    try {
      const pageVisit: PageVisitRecord = {
        request: {
          cacheKey: request.cacheKey,
          hash: request.hash,
          endpoint: request.endpoint,
          params: JSON.stringify(request.params),
        },
        timestamp: new Date(),
        sessionId: metadata?.sessionId,
        referrer: metadata?.referrer,
        duration: metadata?.duration,
        cached: metadata?.cached ?? false,
        bytesSaved: metadata?.bytesSaved,
      };

      await this.db.pageVisits.add(pageVisit);

      this.logger?.debug("user-interactions", "Page visit recorded", {
        cacheKey: request.cacheKey,
        cached: pageVisit.cached,
        duration: pageVisit.duration,
      });
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to record page visit", {
        cacheKey: request.cacheKey,
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
   * Check if a request is bookmarked
   * @param cacheKey - The cache key from the normalized request
   */
  async isRequestBookmarked(cacheKey: string): Promise<boolean> {
    try {
      const count = await this.db.bookmarks
        .where("request.cacheKey")
        .equals(cacheKey)
        .count();

      return count > 0;
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to check bookmark status",
        {
          cacheKey,
          error,
        },
      );
      return false;
    }
  }

  /**
   * Check if a request is bookmarked by hash
   * @param hash - The hash from the normalized request
   */
  async isRequestBookmarkedByHash(hash: string): Promise<boolean> {
    try {
      const count = await this.db.bookmarks
        .where("request.hash")
        .equals(hash)
        .count();

      return count > 0;
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to check bookmark status by hash",
        {
          hash,
          error,
        },
      );
      return false;
    }
  }

  /**
   * Get bookmark by cache key
   */
  async getBookmark(cacheKey: string): Promise<BookmarkRecord | null> {
    try {
      const bookmark = await this.db.bookmarks
        .where("request.cacheKey")
        .equals(cacheKey)
        .first();

      return bookmark ?? null;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to get bookmark", {
        cacheKey,
        error,
      });
      return null;
    }
  }

  /**
   * Get bookmark by hash
   */
  async getBookmarkByHash(hash: string): Promise<BookmarkRecord | null> {
    try {
      const bookmark = await this.db.bookmarks
        .where("request.hash")
        .equals(hash)
        .first();

      return bookmark ?? null;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to get bookmark by hash", {
        hash,
        error,
      });
      return null;
    }
  }

  /**
   * Add a bookmark for a normalized request
   */
  async addBookmark(
    request: {
      cacheKey: string;
      hash: string;
      endpoint: string;
      params: Record<string, unknown>;
    },
    title: string,
    notes?: string,
    tags?: string[],
  ): Promise<number> {
    try {
      const bookmark: BookmarkRecord = {
        request: {
          cacheKey: request.cacheKey,
          hash: request.hash,
          endpoint: request.endpoint,
          params: JSON.stringify(request.params),
        },
        title,
        notes,
        tags,
        timestamp: new Date(),
      };

      const id = (await this.db.bookmarks.add(bookmark)) as number;

      this.logger?.debug("user-interactions", "Bookmark added", {
        id,
        cacheKey: request.cacheKey,
        title,
      });

      return id;
    } catch (error) {
      this.logger?.error("user-interactions", "Failed to add bookmark", {
        cacheKey: request.cacheKey,
        title,
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
    uniqueRequests: number;
    byEndpoint: Record<string, number>;
    mostVisitedRequest: {
      cacheKey: string;
      count: number;
    } | null;
    cacheHitRate: number;
  }> {
    try {
      const visits = await this.db.pageVisits.toArray();

      const totalVisits = visits.length;

      const requestCounts = new Map<string, number>();
      const endpointCounts: Record<string, number> = {};
      let cachedCount = 0;

      visits.forEach((visit) => {
        // Count by cache key
        const count = requestCounts.get(visit.request.cacheKey) || 0;
        requestCounts.set(visit.request.cacheKey, count + 1);

        // Count by endpoint
        const { endpoint } = visit.request;
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;

        // Count cached visits
        if (visit.cached) {
          cachedCount++;
        }
      });

      const uniqueRequests = requestCounts.size;

      let mostVisitedRequest: {
        cacheKey: string;
        count: number;
      } | null = null;
      for (const [cacheKey, count] of requestCounts) {
        if (!mostVisitedRequest || count > mostVisitedRequest.count) {
          mostVisitedRequest = { cacheKey, count };
        }
      }

      const cacheHitRate = totalVisits > 0 ? cachedCount / totalVisits : 0;

      return {
        totalVisits,
        uniqueRequests,
        byEndpoint: endpointCounts,
        mostVisitedRequest,
        cacheHitRate,
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
        uniqueRequests: 0,
        byEndpoint: {},
        mostVisitedRequest: null,
        cacheHitRate: 0,
      };
    }
  }

  /**
   * Get page visits by endpoint pattern
   */
  async getPageVisitsByEndpoint(
    endpointPattern: string,
    limit = 20,
  ): Promise<PageVisitRecord[]> {
    try {
      const allVisits = await this.db.pageVisits
        .orderBy("timestamp")
        .reverse()
        .toArray();

      return allVisits
        .filter((visit) => visit.request.endpoint.includes(endpointPattern))
        .slice(0, limit);
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to get page visits by endpoint",
        {
          endpointPattern,
          error,
        },
      );
      return [];
    }
  }

  /**
   * Get popular requests from page visits
   */
  async getPopularRequests(
    limit = 10,
  ): Promise<{ cacheKey: string; endpoint: string; count: number }[]> {
    try {
      const visits = await this.db.pageVisits.toArray();

      const requestCounts = new Map<
        string,
        { cacheKey: string; endpoint: string; count: number }
      >();

      visits.forEach((visit) => {
        const { cacheKey, endpoint } = visit.request;
        const existing = requestCounts.get(cacheKey);

        if (existing) {
          existing.count++;
        } else {
          requestCounts.set(cacheKey, { cacheKey, endpoint, count: 1 });
        }
      });

      return Array.from(requestCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      this.logger?.error(
        "user-interactions",
        "Failed to get popular requests",
        {
          error,
        },
      );
      return [];
    }
  }

  // ==================== BACKWARD COMPATIBILITY WRAPPERS ====================
  // These methods provide compatibility with the old API for gradual migration

  /**
   * @deprecated Use recordPageVisit with normalized request instead
   */
  async recordPageVisitLegacy(
    url: string,
    metadata?: {
      searchQuery?: string;
      filters?: Record<string, unknown>;
      entityId?: string;
      entityType?: string;
      resultCount?: number;
    },
    sessionId?: string,
    referrer?: string,
  ): Promise<void> {
    // Convert URL to a simple request representation
    const urlObj = new URL(
      url.startsWith("http") ? url : `https://example.com${url}`,
    );
    
    const params: Record<string, unknown> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const request = {
      cacheKey: url,
      hash: url.slice(0, 16),
      endpoint: urlObj.pathname,
      params,
    };

    await this.recordPageVisit(request, {
      sessionId,
      referrer,
      cached: false,
    });
  }

  /**
   * @deprecated Use isRequestBookmarked with cache key instead
   */
  async isEntityBookmarked(
    entityId: string,
    entityType: string,
  ): Promise<boolean> {
    // Try to find a bookmark with matching endpoint pattern
    try {
      const bookmarks = await this.db.bookmarks.toArray();
      return bookmarks.some(
        (b) => b.request.endpoint === `/${entityType}/${entityId}`,
      );
    } catch {
      return false;
    }
  }

  /**
   * @deprecated Use isRequestBookmarked with cache key instead
   */
  async isSearchBookmarked(
    _searchQuery: string,
    _filters?: Record<string, unknown>,
  ): Promise<boolean> {
    // Simplified: check for /search endpoints
    try {
      const bookmarks = await this.db.bookmarks.toArray();
      return bookmarks.some((b) => b.request.endpoint.includes("/search"));
    } catch {
      return false;
    }
  }

  /**
   * @deprecated Use isRequestBookmarked with cache key instead
   */
  async isListBookmarked(_url: string): Promise<boolean> {
    // Simplified: check for list-like endpoints
    try {
      const bookmarks = await this.db.bookmarks.toArray();
      return bookmarks.some(
        (b) =>
          !b.request.endpoint.includes("/search") &&
          !b.request.endpoint.match(/\/[^/]+\/[A-Z0-9]+$/),
      );
    } catch {
      return false;
    }
  }

  /**
   * @deprecated Use addBookmark with normalized request instead
   */
  async addEntityBookmark(
    entityId: string,
    entityType: string,
    title: string,
    _url: string,
    _queryParams?: Record<string, string>,
    notes?: string,
    tags?: string[],
  ): Promise<number> {
    const request = {
      cacheKey: `/${entityType}/${entityId}`,
      hash: `${entityType}-${entityId}`.slice(0, 16),
      endpoint: `/${entityType}/${entityId}`,
      params: {},
    };

    return this.addBookmark(request, title, notes, tags);
  }

  /**
   * @deprecated Use addBookmark with normalized request instead
   */
  async addSearchBookmark(
    searchQuery: string,
    filters: Record<string, unknown> | undefined,
    title: string,
    _url: string,
    _queryParams?: Record<string, string>,
    notes?: string,
    tags?: string[],
  ): Promise<number> {
    const params: Record<string, unknown> = { search: searchQuery };
    if (filters) {
      Object.assign(params, filters);
    }

    const request = {
      cacheKey: `/search?q=${searchQuery}`,
      hash: `search-${searchQuery}`.slice(0, 16),
      endpoint: "/search",
      params,
    };

    return this.addBookmark(request, title, notes, tags);
  }

  /**
   * @deprecated Use addBookmark with normalized request instead
   */
  async addListBookmark(
    title: string,
    url: string,
    _queryParams?: Record<string, string>,
    notes?: string,
    tags?: string[],
  ): Promise<number> {
    const urlObj = new URL(
      url.startsWith("http") ? url : `https://example.com${url}`,
    );

    const request = {
      cacheKey: url,
      hash: url.slice(0, 16),
      endpoint: urlObj.pathname,
      params: {},
    };

    return this.addBookmark(request, title, notes, tags);
  }

  /**
   * @deprecated Use getBookmark with cache key instead
   */
  async getEntityBookmark(
    entityId: string,
    entityType: string,
  ): Promise<BookmarkRecord | null> {
    try {
      const bookmarks = await this.db.bookmarks.toArray();
      return (
        bookmarks.find(
          (b) => b.request.endpoint === `/${entityType}/${entityId}`,
        ) ?? null
      );
    } catch {
      return null;
    }
  }

  /**
   * @deprecated Use getBookmark with cache key instead
   */
  async getSearchBookmark(
    _searchQuery: string,
    _filters?: Record<string, unknown>,
  ): Promise<BookmarkRecord | null> {
    try {
      const bookmarks = await this.db.bookmarks.toArray();
      return bookmarks.find((b) => b.request.endpoint.includes("/search")) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * @deprecated Use getBookmark with cache key instead
   */
  async getListBookmark(_url: string): Promise<BookmarkRecord | null> {
    try {
      const bookmarks = await this.db.bookmarks.toArray();
      return (
        bookmarks.find(
          (b) =>
            !b.request.endpoint.includes("/search") &&
            !b.request.endpoint.match(/\/[^/]+\/[A-Z0-9]+$/),
        ) ?? null
      );
    } catch {
      return null;
    }
  }

  /**
   * Helper to get page visit stats in old format
   * @deprecated Use getPageVisitStats instead
   */
  async getPageVisitStatsLegacy(): Promise<{
    totalVisits: number;
    uniqueUrls: number;
    byType: Record<string, number>;
    mostVisitedUrl: {
      normalizedUrl: string;
      count: number;
    } | null;
  }> {
    const stats = await this.getPageVisitStats();
    
    // Convert endpoint-based stats to legacy "type" format
    const byType: Record<string, number> = {};
    for (const [endpoint, count] of Object.entries(stats.byEndpoint)) {
      if (endpoint.includes("/search")) {
        byType.search = (byType.search || 0) + count;
      } else if (endpoint.match(/\/[^/]+\/[A-Z0-9]+$/)) {
        byType.entity = (byType.entity || 0) + count;
      } else {
        byType.list = (byType.list || 0) + count;
      }
    }

    return {
      totalVisits: stats.totalVisits,
      uniqueUrls: stats.uniqueRequests,
      byType,
      mostVisitedUrl: stats.mostVisitedRequest
        ? {
            normalizedUrl: stats.mostVisitedRequest.cacheKey,
            count: stats.mostVisitedRequest.count,
          }
        : null,
    };
  }
}

// Export singleton instance
export const userInteractionsService: UserInteractionsService =
  new UserInteractionsService();
