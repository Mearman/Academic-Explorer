/**
 * User interactions database using Dexie
 * Unified tracking of page visits and bookmarks with normalized OpenAlex requests
 */

import Dexie from "dexie"
import type { Table } from "dexie"
import { GenericLogger } from "../logger.js"

// Constants for logging and database operations
const _EXAMPLE_URL_PREFIX = "https://api.openalex.org"
const LOG_CATEGORY = "user-interactions"
const DB_NAME = "user-interactions"
const _SEARCH_ENDPOINT = "/search"

// Database schema version constants
const DB_VERSION_UNIFIED_REQUEST_SCHEMA = 3

// Database schema interfaces

export interface BookmarkRecord {
	id?: number
	/** The normalized OpenAlex request that this bookmark represents */
	request: StoredNormalizedRequest
	/** User-provided title for the bookmark */
	title: string
	/** Optional user notes */
	notes?: string
	/** User-defined tags for organization */
	tags?: string[]
	/** When the bookmark was created */
	timestamp: Date
}

/**
 * Normalized OpenAlex request stored with visit
 * This matches the structure from @academic-explorer/client
 */
export interface StoredNormalizedRequest {
	/** Cache key for lookups */
	cacheKey: string
	/** Request hash for deduplication */
	hash: string
	/** Original endpoint */
	endpoint: string
	/** Normalized params as JSON string (for storage) */
	params: string
}

export interface PageVisitRecord {
	id?: number
	/** Normalized OpenAlex request that generated this visit */
	request: StoredNormalizedRequest
	/** Visit timestamp */
	timestamp: Date
	/** Session identifier (optional) */
	sessionId?: string
	/** Referrer URL (optional) */
	referrer?: string
	/** Response duration in ms (optional) */
	duration?: number
	/** Whether the response was cached */
	cached: boolean
	/** Bytes saved via caching (optional) */
	bytesSaved?: number
}

// Dexie database class
class UserInteractionsDB extends Dexie {
	bookmarks!: Table<BookmarkRecord>
	pageVisits!: Table<PageVisitRecord>

	constructor() {
		super(DB_NAME)

		// V2: Legacy schema (entity/search/list based)
		this.version(2).stores({
			bookmarks: "++id, bookmarkType, entityId, entityType, searchQuery, timestamp, title, url, *tags",
			pageVisits: "++id, normalizedUrl, pageType, timestamp",
		})

		// V3: Unified request-based schema
		this.version(DB_VERSION_UNIFIED_REQUEST_SCHEMA).stores({
			bookmarks: "++id, request.cacheKey, request.hash, request.endpoint, timestamp, *tags",
			pageVisits: "++id, request.cacheKey, request.hash, request.endpoint, timestamp, cached",
		})
	}
}

// Singleton instance
let dbInstance: UserInteractionsDB | null = null

const getDB = (): UserInteractionsDB => {
	dbInstance ??= new UserInteractionsDB()
	return dbInstance
}

/**
 * Service for managing user page visits and bookmarks
 */
export class UserInteractionsService {
	private db: UserInteractionsDB
	private logger?: GenericLogger

	constructor(logger?: GenericLogger) {
		this.db = getDB()
		this.logger = logger
	}

	/**
	 * Record a page visit with normalized OpenAlex request
	 * @param request - The normalized request from @academic-explorer/client
	 */
	async recordPageVisit({
		request,
		metadata,
	}: {
		request: {
			cacheKey: string
			hash: string
			endpoint: string
			params: Record<string, unknown>
		}
		metadata?: {
			sessionId?: string
			referrer?: string
			duration?: number
			cached?: boolean
			bytesSaved?: number
		}
	}): Promise<void> {
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
			}

			await this.db.pageVisits.add(pageVisit)

			this.logger?.debug(LOG_CATEGORY, "Page visit recorded", {
				cacheKey: request.cacheKey,
				cached: pageVisit.cached,
				duration: pageVisit.duration,
			})
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to record page visit", {
				cacheKey: request.cacheKey,
				error,
			})
		}
	}

	/**
	 * Get recent page visits across all pages
	 */
	async getRecentPageVisits(limit = 50): Promise<PageVisitRecord[]> {
		try {
			return await this.db.pageVisits.orderBy("timestamp").reverse().limit(limit).toArray()
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get recent page visits", {
				error,
			})
			return []
		}
	}

	/**
	 * Check if a request is bookmarked
	 * @param cacheKey - The cache key from the normalized request
	 */
	async isRequestBookmarked(cacheKey: string): Promise<boolean> {
		try {
			const count = await this.db.bookmarks.where("request.cacheKey").equals(cacheKey).count()

			return count > 0
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to check bookmark status", {
				cacheKey,
				error,
			})
			return false
		}
	}

	/**
	 * Check if a request is bookmarked by hash
	 * @param hash - The hash from the normalized request
	 */
	async isRequestBookmarkedByHash(hash: string): Promise<boolean> {
		try {
			const count = await this.db.bookmarks.where("request.hash").equals(hash).count()

			return count > 0
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to check bookmark status by hash", {
				hash,
				error,
			})
			return false
		}
	}

	/**
	 * Get bookmark by cache key
	 */
	async getBookmark(cacheKey: string): Promise<BookmarkRecord | null> {
		try {
			const bookmark = await this.db.bookmarks.where("request.cacheKey").equals(cacheKey).first()

			return bookmark ?? null
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get bookmark by cache key", {
				cacheKey,
				error: error instanceof Error ? error : new Error(String(error)),
			})
			return null
		}
	}

	/**
	 * Get bookmark by hash
	 */
	async getBookmarkByHash(hash: string): Promise<BookmarkRecord | null> {
		try {
			const bookmark = await this.db.bookmarks.where("request.hash").equals(hash).first()

			return bookmark ?? null
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get bookmark by hash", {
				hash,
				error,
			})
			return null
		}
	}

	/**
	 * Add a bookmark for a normalized request
	 */
	async addBookmark({
		request,
		title,
		notes,
		tags,
	}: {
		request: {
			cacheKey: string
			hash: string
			endpoint: string
			params: Record<string, unknown>
		}
		title: string
		notes?: string
		tags?: string[]
	}): Promise<number> {
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
			}

			const id: number = await this.db.bookmarks.add(bookmark)

			this.logger?.debug(LOG_CATEGORY, "Bookmark added", {
				id,
				cacheKey: request.cacheKey,
				title,
			})

			return id
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to add bookmark", {
				cacheKey: request.cacheKey,
				title,
				error,
			})
			throw error
		}
	}

	/**
	 * Get all bookmarks
	 */
	async getAllBookmarks(): Promise<BookmarkRecord[]> {
		try {
			return await this.db.bookmarks.orderBy("timestamp").reverse().toArray()
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get all bookmarks", {
				error,
			})
			return []
		}
	}

	/**
	 * Remove a bookmark
	 */
	async removeBookmark(bookmarkId: number): Promise<void> {
		try {
			await this.db.bookmarks.delete(bookmarkId)

			this.logger?.debug(LOG_CATEGORY, "Bookmark removed", {
				bookmarkId,
			})
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to remove bookmark", {
				bookmarkId,
				error,
			})
			throw error
		}
	}

	/**
	 * Update a bookmark
	 */
	async updateBookmark({
		bookmarkId,
		updates,
	}: {
		bookmarkId: number
		updates: Partial<Pick<BookmarkRecord, "title" | "notes" | "tags">>
	}): Promise<void> {
		try {
			await this.db.bookmarks.update(bookmarkId, updates)

			this.logger?.debug(LOG_CATEGORY, "Bookmark updated", {
				bookmarkId,
				updates,
			})
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to update bookmark", {
				bookmarkId,
				updates,
				error,
			})
			throw error
		}
	}

	/**
	 * Search bookmarks by title, notes, or tags
	 */
	async searchBookmarks(query: string): Promise<BookmarkRecord[]> {
		try {
			const bookmarks = await this.db.bookmarks.toArray()

			const lowercaseQuery = query.toLowerCase()

			return bookmarks.filter(
				(bookmark) =>
					bookmark.title.toLowerCase().includes(lowercaseQuery) ||
					Boolean(bookmark.notes?.toLowerCase().includes(lowercaseQuery)) ||
					bookmark.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
			)
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to search bookmarks", {
				query,
				error,
			})
			return []
		}
	}

	/**
	 * Check if an entity is bookmarked
	 */
	async isEntityBookmarked({
		entityId,
		entityType,
	}: {
		entityId: string
		entityType: string
	}): Promise<boolean> {
		const cacheKey = `/${entityType}/${entityId}`
		return this.isRequestBookmarked(cacheKey)
	}

	/**
	 * Check if a search is bookmarked
	 */
	async isSearchBookmarked({
		searchQuery,
		filters: _filters,
	}: {
		searchQuery: string
		filters?: Record<string, unknown>
	}): Promise<boolean> {
		const cacheKey = `/search?q=${searchQuery}`
		return this.isRequestBookmarked(cacheKey)
	}

	/**
	 * Check if a list is bookmarked
	 * @param url - The list URL
	 */
	async isListBookmarked(url: string): Promise<boolean> {
		return this.isRequestBookmarked(url)
	}

	/**
	 * Get entity bookmark
	 */
	async getEntityBookmark({
		entityId,
		entityType,
	}: {
		entityId: string
		entityType: string
	}): Promise<BookmarkRecord | null> {
		const cacheKey = `/${entityType}/${entityId}`
		return this.getBookmark(cacheKey)
	}

	/**
	 * Get search bookmark
	 */
	async getSearchBookmark({
		searchQuery,
		filters: _filters,
	}: {
		searchQuery: string
		filters?: Record<string, unknown>
	}): Promise<BookmarkRecord | null> {
		const cacheKey = `/search?q=${searchQuery}`
		return this.getBookmark(cacheKey)
	}

	/**
	 * Get list bookmark
	 * @param url - The list URL
	 */
	async getListBookmark(url: string): Promise<BookmarkRecord | null> {
		return this.getBookmark(url)
	}

	/**
	 * Add list bookmark
	 * @param url - The list URL
	 * @param title - The bookmark title
	 * @param notes - Optional notes
	 * @param tags - Optional tags
	 */
	async addListBookmark(
		url: string,
		title: string,
		notes?: string,
		tags?: string[]
	): Promise<number> {
		const request = {
			cacheKey: url,
			hash: url.slice(0, 16),
			endpoint: url,
			params: {},
		}

		return this.addBookmark({
			request,
			title,
			notes,
			tags,
		})
	}

	/**
	 * Get page visit statistics (legacy format for compatibility)
	 */
	async getPageVisitStatsLegacy(): Promise<{
		totalVisits: number
		uniqueRequests: number
		byEndpoint: Record<string, number>
	}> {
		const stats = await this.getPageVisitStats()
		return {
			totalVisits: stats.totalVisits,
			uniqueRequests: stats.uniqueRequests,
			byEndpoint: stats.byEndpoint,
		}
	}

	/**
	 * Record page visit (legacy format for compatibility)
	 */
	async recordPageVisitLegacy({
		cacheKey,
		metadata,
	}: {
		cacheKey: string
		metadata?: {
			sessionId?: string
			referrer?: string
			duration?: number
			cached?: boolean
			bytesSaved?: number
		}
	}): Promise<void> {
		const request = {
			cacheKey,
			hash: cacheKey.slice(0, 16),
			endpoint: cacheKey,
			params: {},
		}

		return this.recordPageVisit({ request, metadata })
	}

	/**
	 * Get page visit statistics
	 */
	async getPageVisitStats(): Promise<{
		totalVisits: number
		uniqueRequests: number
		byEndpoint: Record<string, number>
		mostVisitedRequest: {
			cacheKey: string
			count: number
		} | null
		cacheHitRate: number
	}> {
		try {
			const visits = await this.db.pageVisits.toArray()

			const totalVisits = visits.length

			const requestCounts = new Map<string, number>()
			const endpointCounts: Record<string, number> = {}
			let cachedCount = 0

			visits.forEach((visit) => {
				// Count by cache key
				const count = requestCounts.get(visit.request.cacheKey) ?? 0
				requestCounts.set(visit.request.cacheKey, count + 1)

				// Count by endpoint
				const { endpoint } = visit.request
				endpointCounts[endpoint] = (endpointCounts[endpoint] ?? 0) + 1

				// Count cached visits
				if (visit.cached) {
					cachedCount++
				}
			})

			const uniqueRequests = requestCounts.size

			let mostVisitedRequest: {
				cacheKey: string
				count: number
			} | null = null
			for (const [cacheKey, count] of requestCounts) {
				if (!mostVisitedRequest || count > mostVisitedRequest.count) {
					mostVisitedRequest = { cacheKey, count }
				}
			}

			const cacheHitRate = totalVisits > 0 ? cachedCount / totalVisits : 0

			return {
				totalVisits,
				uniqueRequests,
				byEndpoint: endpointCounts,
				mostVisitedRequest,
				cacheHitRate,
			}
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get page visit stats", {
				error,
			})
			return {
				totalVisits: 0,
				uniqueRequests: 0,
				byEndpoint: {},
				mostVisitedRequest: null,
				cacheHitRate: 0,
			}
		}
	}

	/**
	 * Get page visits by endpoint pattern
	 */
	async getPageVisitsByEndpoint(endpointPattern: string, limit = 20): Promise<PageVisitRecord[]> {
		try {
			const allVisits = await this.db.pageVisits.orderBy("timestamp").reverse().toArray()

			return allVisits
				.filter((visit) => visit.request.endpoint.includes(endpointPattern))
				.slice(0, limit)
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get page visits by endpoint", {
				endpointPattern,
				error,
			})
			return []
		}
	}

	/**
	 * Get popular requests from page visits
	 */
	async getPopularRequests(
		limit = 10
	): Promise<{ cacheKey: string; endpoint: string; count: number }[]> {
		try {
			const visits = await this.db.pageVisits.toArray()

			const requestCounts = new Map<string, { cacheKey: string; endpoint: string; count: number }>()

			visits.forEach((visit) => {
				const { cacheKey, endpoint } = visit.request
				const existing = requestCounts.get(cacheKey)

				if (existing) {
					existing.count++
				} else {
					requestCounts.set(cacheKey, { cacheKey, endpoint, count: 1 })
				}
			})

			return Array.from(requestCounts.values())
				.sort((a, b) => b.count - a.count)
				.slice(0, limit)
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get popular requests", {
				error,
			})
			return []
		}
	}
}

// Export singleton instance
export const userInteractionsService: UserInteractionsService = new UserInteractionsService()
