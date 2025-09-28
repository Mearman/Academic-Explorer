/**
 * Static data provider for OpenAlex client
 * Implements multi-tier caching with environment detection and automatic fallback
 */

import type { StaticEntityType } from './static-data-utils';
import { logger } from '@academic-explorer/utils';

export interface StaticDataResult {
	found: boolean;
	data?: unknown;
	cacheHit?: boolean;
	tier?: CacheTier;
	loadTime?: number;
}

export interface CacheStatistics {
	totalRequests: number;
	hits: number;
	misses: number;
	hitRate: number;
	tierStats: Record<CacheTier, {
		requests: number;
		hits: number;
		averageLoadTime: number;
	}>;
	bandwidthSaved: number;
	lastUpdated: number;
}

export enum CacheTier {
	MEMORY = 'memory',
	LOCAL_DISK = 'local_disk',
	GITHUB_PAGES = 'github_pages',
	API = 'api'
}

export enum Environment {
	BROWSER = 'browser',
	NODE = 'node',
	WORKER = 'worker'
}

interface CacheTierInterface {
	get(entityType: StaticEntityType, id: string): Promise<StaticDataResult>;
	has(entityType: StaticEntityType, id: string): Promise<boolean>;
	set?(entityType: StaticEntityType, id: string, data: unknown): Promise<void>;
	clear?(): Promise<void>;
	getStats(): Promise<{ requests: number; hits: number; averageLoadTime: number }>;
}

/**
 * Memory cache implementation with LRU eviction
 */
class MemoryCacheTier implements CacheTierInterface {
	private cache = new Map<string, { data: unknown; timestamp: number; accessCount: number }>();
	private maxSize = 1000;
	private stats = { requests: 0, hits: 0, totalLoadTime: 0 };

	private getKey(entityType: StaticEntityType, id: string): string {
		return `${entityType}:${id}`;
	}

	private evictLRU(): void {
		if (this.cache.size <= this.maxSize) return;

		let oldestKey: string | null = null;
		let oldestTime = Date.now();

		for (const [key, entry] of this.cache.entries()) {
			if (entry.timestamp < oldestTime) {
				oldestTime = entry.timestamp;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			logger.debug('static-cache', 'Evicted LRU entry from memory cache', { key: oldestKey });
		}
	}

	async get(entityType: StaticEntityType, id: string): Promise<StaticDataResult> {
		const startTime = Date.now();
		this.stats.requests++;

		const key = this.getKey(entityType, id);
		const entry = this.cache.get(key);

		if (entry) {
			// Update access info for LRU
			entry.timestamp = Date.now();
			entry.accessCount++;
			this.cache.set(key, entry);

			this.stats.hits++;
			const loadTime = Date.now() - startTime;
			this.stats.totalLoadTime += loadTime;

			return {
				found: true,
				data: entry.data,
				cacheHit: true,
				tier: CacheTier.MEMORY,
				loadTime
			};
		}

		return { found: false };
	}

	async has(entityType: StaticEntityType, id: string): Promise<boolean> {
		const key = this.getKey(entityType, id);
		return this.cache.has(key);
	}

	async set(entityType: StaticEntityType, id: string, data: unknown): Promise<void> {
		const key = this.getKey(entityType, id);
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			accessCount: 1
		});

		this.evictLRU();
	}

	async clear(): Promise<void> {
		this.cache.clear();
		this.stats = { requests: 0, hits: 0, totalLoadTime: 0 };
	}

	async getStats(): Promise<{ requests: number; hits: number; averageLoadTime: number }> {
		return {
			requests: this.stats.requests,
			hits: this.stats.hits,
			averageLoadTime: this.stats.requests > 0 ? this.stats.totalLoadTime / this.stats.requests : 0
		};
	}
}

/**
 * Local disk cache implementation (Node.js only)
 */
class LocalDiskCacheTier implements CacheTierInterface {
	private stats = { requests: 0, hits: 0, totalLoadTime: 0 };
	private cacheDir = './cache/static-data';

	private getFilePath(entityType: StaticEntityType, id: string): string {
		// Sanitize ID for filesystem
		const sanitizedId = id.replace(/[^a-zA-Z0-9-_]/g, '_');
		return `${this.cacheDir}/${entityType}/${sanitizedId}.json`;
	}

	async get(entityType: StaticEntityType, id: string): Promise<StaticDataResult> {
		const startTime = Date.now();
		this.stats.requests++;

		try {
			// In browser environment, this will fail gracefully
			if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
				return { found: false };
			}

			const filePath = this.getFilePath(entityType, id);

			// Dynamic import for Node.js fs module
			const fs = await import('fs');

			if (!fs.existsSync(filePath)) {
				return { found: false };
			}

			const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;

			this.stats.hits++;
			const loadTime = Date.now() - startTime;
			this.stats.totalLoadTime += loadTime;

			return {
				found: true,
				data,
				cacheHit: true,
				tier: CacheTier.LOCAL_DISK,
				loadTime
			};
		} catch (error: unknown) {
			logger.debug('static-cache', 'Local disk cache miss', { entityType, id, error });
			return { found: false };
		}
	}

	async has(entityType: StaticEntityType, id: string): Promise<boolean> {
		try {
			if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
				return false;
			}

			const filePath = this.getFilePath(entityType, id);
			const fs = await import('fs');
			return fs.existsSync(filePath);
		} catch {
			return false;
		}
	}

	async set(entityType: StaticEntityType, id: string, data: unknown): Promise<void> {
		try {
			if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
				return; // Skip in browser
			}

			const filePath = this.getFilePath(entityType, id);
			const fs = await import('fs');
			const path = await import('path');

			// Ensure directory exists
			fs.mkdirSync(path.dirname(filePath), { recursive: true });

			// Write data
			fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
		} catch (error: unknown) {
			logger.warn('static-cache', 'Failed to write to local disk cache', { entityType, id, error });
		}
	}

	async clear(): Promise<void> {
		try {
			if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
				return;
			}

			const fs = await import('fs');
			if (fs.existsSync(this.cacheDir)) {
				fs.rmSync(this.cacheDir, { recursive: true, force: true });
			}
			this.stats = { requests: 0, hits: 0, totalLoadTime: 0 };
		} catch (error: unknown) {
			logger.warn('static-cache', 'Failed to clear local disk cache', { error });
		}
	}

	async getStats(): Promise<{ requests: number; hits: number; averageLoadTime: number }> {
		return {
			requests: this.stats.requests,
			hits: this.stats.hits,
			averageLoadTime: this.stats.requests > 0 ? this.stats.totalLoadTime / this.stats.requests : 0
		};
	}
}

/**
 * GitHub Pages cache implementation for static data
 */
class GitHubPagesCacheTier implements CacheTierInterface {
	private stats = { requests: 0, hits: 0, totalLoadTime: 0 };
	private baseUrl = 'https://username.github.io/academic-explorer-cache/'; // Configure as needed

	private getUrl(entityType: StaticEntityType, id: string): string {
		// Sanitize ID for URL
		const sanitizedId = encodeURIComponent(id);
		return `${this.baseUrl}${entityType}/${sanitizedId}.json`;
	}

	async get(entityType: StaticEntityType, id: string): Promise<StaticDataResult> {
		const startTime = Date.now();
		this.stats.requests++;

		try {
			const url = this.getUrl(entityType, id);
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Cache-Control': 'max-age=3600' // 1 hour cache
				},
				signal: AbortSignal.timeout(10000) // 10 second timeout
			});

			if (!response.ok) {
				if (response.status === 404) {
					return { found: false };
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();

			this.stats.hits++;
			const loadTime = Date.now() - startTime;
			this.stats.totalLoadTime += loadTime;

			return {
				found: true,
				data,
				cacheHit: true,
				tier: CacheTier.GITHUB_PAGES,
				loadTime
			};
		} catch (error: unknown) {
			logger.debug('static-cache', 'GitHub Pages cache miss', { entityType, id, error });
			return { found: false };
		}
	}

	async has(entityType: StaticEntityType, id: string): Promise<boolean> {
		try {
			const url = this.getUrl(entityType, id);
			const response = await fetch(url, {
				method: 'HEAD',
				signal: AbortSignal.timeout(5000) // 5 second timeout for HEAD request
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	async getStats(): Promise<{ requests: number; hits: number; averageLoadTime: number }> {
		return {
			requests: this.stats.requests,
			hits: this.stats.hits,
			averageLoadTime: this.stats.requests > 0 ? this.stats.totalLoadTime / this.stats.requests : 0
		};
	}
}

/**
 * Multi-tier static data provider with automatic fallback and environment detection
 */
class StaticDataProvider {
	private memoryCacheTier: MemoryCacheTier;
	private localDiskCacheTier: LocalDiskCacheTier;
	private gitHubPagesCacheTier: GitHubPagesCacheTier;
	private environment: Environment;
	private globalStats: CacheStatistics;

	constructor() {
		this.memoryCacheTier = new MemoryCacheTier();
		this.localDiskCacheTier = new LocalDiskCacheTier();
		this.gitHubPagesCacheTier = new GitHubPagesCacheTier();
		this.environment = this.detectEnvironment();

		this.globalStats = {
			totalRequests: 0,
			hits: 0,
			misses: 0,
			hitRate: 0,
			tierStats: {
				[CacheTier.MEMORY]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.LOCAL_DISK]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.GITHUB_PAGES]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.API]: { requests: 0, hits: 0, averageLoadTime: 0 }
			},
			bandwidthSaved: 0,
			lastUpdated: Date.now()
		};
	}

	private detectEnvironment(): Environment {
		if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
			return Environment.BROWSER;
		}
		if (typeof globalThis !== 'undefined' && 'WorkerGlobalScope' in globalThis) {
			return Environment.WORKER;
		}
		return Environment.NODE;
	}

	private getAvailableTiers(): CacheTierInterface[] {
		const tiers: CacheTierInterface[] = [this.memoryCacheTier];

		// Add local disk tier for Node.js environment
		if (this.environment === Environment.NODE) {
			tiers.push(this.localDiskCacheTier);
		}

		// Add GitHub Pages tier for all environments
		tiers.push(this.gitHubPagesCacheTier);

		return tiers;
	}

	private updateGlobalStats(tier: CacheTier, hit: boolean, loadTime: number): void {
		this.globalStats.totalRequests++;
		this.globalStats.tierStats[tier].requests++;

		if (hit) {
			this.globalStats.hits++;
			this.globalStats.tierStats[tier].hits++;
		} else {
			this.globalStats.misses++;
		}

		this.globalStats.tierStats[tier].averageLoadTime = (
			(this.globalStats.tierStats[tier].averageLoadTime * (this.globalStats.tierStats[tier].requests - 1) + loadTime) /
			this.globalStats.tierStats[tier].requests
		);

		this.globalStats.hitRate = this.globalStats.hits / this.globalStats.totalRequests;
		this.globalStats.lastUpdated = Date.now();

		// Estimate bandwidth saved (approximate 50KB per entity)
		if (hit) {
			this.globalStats.bandwidthSaved += 50000;
		}
	}

	async getStaticData(entityType: StaticEntityType, id: string): Promise<StaticDataResult> {
		const startTime = Date.now();
		const tiers = this.getAvailableTiers();

		// Try each tier in order
		for (const tier of tiers) {
			try {
				const result = await tier.get(entityType, id);
				const loadTime = Date.now() - startTime;

				if (result.found) {
					// Cache the result in higher-priority tiers
					await this.promoteToHigherTiers(entityType, id, result.data, tier);

					this.updateGlobalStats(result.tier || CacheTier.MEMORY, true, loadTime);
					return result;
				}
			} catch (error: unknown) {
				logger.debug('static-cache', 'Cache tier error', { tier: tier.constructor.name, error });
			}
		}

		const loadTime = Date.now() - startTime;
		this.updateGlobalStats(CacheTier.API, false, loadTime);
		return { found: false };
	}

	private async promoteToHigherTiers(entityType: StaticEntityType, id: string, data: unknown, sourceTier: CacheTierInterface): Promise<void> {
		const tiers = this.getAvailableTiers();
		const sourceTierIndex = tiers.indexOf(sourceTier);

		// Promote to all higher-priority tiers
		for (let i = 0; i < sourceTierIndex; i++) {
			const tier = tiers[i];
			if (tier.set) {
				try {
					await tier.set(entityType, id, data);
				} catch (error: unknown) {
					logger.debug('static-cache', 'Failed to promote to higher tier', { tier: tier.constructor.name, error });
				}
			}
		}
	}

	async hasStaticData(entityType: StaticEntityType, id: string): Promise<boolean> {
		const tiers = this.getAvailableTiers();

		for (const tier of tiers) {
			try {
				if (await tier.has(entityType, id)) {
					return true;
				}
			} catch (error: unknown) {
				logger.debug('static-cache', 'Cache tier has() error', { tier: tier.constructor.name, error });
			}
		}

		return false;
	}

	async getCacheStatistics(): Promise<CacheStatistics> {
		// Update individual tier stats
		for (const [tier, tierInterface] of [
			[CacheTier.MEMORY, this.memoryCacheTier],
			[CacheTier.LOCAL_DISK, this.localDiskCacheTier],
			[CacheTier.GITHUB_PAGES, this.gitHubPagesCacheTier]
		] as const) {
			try {
				const stats = await tierInterface.getStats();
				this.globalStats.tierStats[tier] = stats;
			} catch (error: unknown) {
				logger.debug('static-cache', 'Failed to get tier stats', { tier, error });
			}
		}

		return { ...this.globalStats };
	}

	async clearCache(): Promise<void> {
		const tiers = this.getAvailableTiers();

		for (const tier of tiers) {
			if (tier.clear) {
				try {
					await tier.clear();
				} catch (error) {
					logger.warn('static-cache', 'Failed to clear cache tier', { tier: tier.constructor.name, error });
				}
			}
		}

		// Reset global stats
		this.globalStats = {
			totalRequests: 0,
			hits: 0,
			misses: 0,
			hitRate: 0,
			tierStats: {
				[CacheTier.MEMORY]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.LOCAL_DISK]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.GITHUB_PAGES]: { requests: 0, hits: 0, averageLoadTime: 0 },
				[CacheTier.API]: { requests: 0, hits: 0, averageLoadTime: 0 }
			},
			bandwidthSaved: 0,
			lastUpdated: Date.now()
		};
	}

	getEnvironment(): Environment {
		return this.environment;
	}
}

export const staticDataProvider = new StaticDataProvider();