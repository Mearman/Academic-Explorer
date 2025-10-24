/**
 * Graph Repository
 * Persistence layer abstraction for graph data with multiple storage backends
 */

import type { GraphNode, GraphEdge, GraphStats } from "../types/core"

export interface GraphSnapshot {
	id: string
	name?: string
	description?: string
	nodes: GraphNode[]
	edges: GraphEdge[]
	timestamp: number
	version: string
	metadata: {
		nodeCount: number
		edgeCount: number
		createdBy?: string
		tags?: string[]
		stats?: GraphStats
	}
}

export interface GraphHistoryEntry {
	snapshotId: string
	timestamp: number
	operation: "create" | "update" | "delete" | "merge"
	changes: {
		nodesAdded: number
		nodesRemoved: number
		edgesAdded: number
		edgesRemoved: number
	}
	description?: string
}

export interface StorageAdapter {
	// Core CRUD operations
	save(key: string, data: unknown): Promise<void>
	load(key: string): Promise<unknown>
	remove(key: string): Promise<void>
	exists(key: string): Promise<boolean>

	// Listing and search
	list(prefix?: string): Promise<string[]>

	// Bulk operations
	saveMany(entries: Array<{ key: string; data: unknown }>): Promise<void>
	loadMany(keys: string[]): Promise<Array<{ key: string; data: unknown }>>

	// Storage info
	getStorageSize(): Promise<number>
	clear(): Promise<void>
}

export class IndexedDBAdapter implements StorageAdapter {
	private dbName: string
	private version: number
	private db: IDBDatabase | null = null

	constructor(dbName: string = "academic-explorer-graphs", version: number = 1) {
		this.dbName = dbName
		this.version = version
	}

	private async getDB(): Promise<IDBDatabase> {
		if (this.db) return this.db

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version)

			request.onerror = () => {
				reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
			}
			request.onsuccess = () => {
				this.db = request.result
				resolve(this.db)
			}

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result

				// Create object store for graphs
				if (!db.objectStoreNames.contains("graphs")) {
					db.createObjectStore("graphs", { keyPath: "id" })
				}

				// Create object store for metadata
				if (!db.objectStoreNames.contains("metadata")) {
					db.createObjectStore("metadata", { keyPath: "key" })
				}
			}
		})
	}

	async save(key: string, data: unknown): Promise<void> {
		const db = await this.getDB()
		const transaction = db.transaction(["graphs"], "readwrite")
		const store = transaction.objectStore("graphs")

		await new Promise<void>((resolve, reject) => {
			const request = store.put({ id: key, data, timestamp: Date.now() })
			request.onsuccess = () => {
				resolve()
			}
			request.onerror = () => {
				reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
			}
		})
	}

	async load(key: string): Promise<unknown> {
		const db = await this.getDB()
		const transaction = db.transaction(["graphs"], "readonly")
		const store = transaction.objectStore("graphs")

		return new Promise<unknown>((resolve, reject) => {
			const request = store.get(key)
			request.onsuccess = () => {
				const { result } = request
				resolve(result ? result.data : null)
			}
			request.onerror = () => {
				reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
			}
		})
	}

	async remove(key: string): Promise<void> {
		const db = await this.getDB()
		const transaction = db.transaction(["graphs"], "readwrite")
		const store = transaction.objectStore("graphs")

		await new Promise<void>((resolve, reject) => {
			const request = store.delete(key)
			request.onsuccess = () => {
				resolve()
			}
			request.onerror = () => {
				reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
			}
		})
	}

	async exists(key: string): Promise<boolean> {
		const db = await this.getDB()
		const transaction = db.transaction(["graphs"], "readonly")
		const store = transaction.objectStore("graphs")

		return new Promise<boolean>((resolve, reject) => {
			const request = store.count(key)
			request.onsuccess = () => {
				resolve(request.result > 0)
			}
			request.onerror = () => {
				reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
			}
		})
	}

	async list(prefix?: string): Promise<string[]> {
		const db = await this.getDB()
		const transaction = db.transaction(["graphs"], "readonly")
		const store = transaction.objectStore("graphs")

		return new Promise<string[]>((resolve, reject) => {
			const request = store.getAllKeys()
			request.onsuccess = () => {
				let keys = request.result as string[]
				if (prefix) {
					keys = keys.filter((key) => key.startsWith(prefix))
				}
				resolve(keys)
			}
			request.onerror = () => {
				reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
			}
		})
	}

	async saveMany(entries: Array<{ key: string; data: unknown }>): Promise<void> {
		const db = await this.getDB()
		const transaction = db.transaction(["graphs"], "readwrite")
		const store = transaction.objectStore("graphs")

		await Promise.all(
			entries.map(
				({ key, data }) =>
					new Promise<void>((resolve, reject) => {
						const request = store.put({ id: key, data, timestamp: Date.now() })
						request.onsuccess = () => {
							resolve()
						}
						request.onerror = () => {
							reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
						}
					})
			)
		)
	}

	async loadMany(keys: string[]): Promise<Array<{ key: string; data: unknown }>> {
		const db = await this.getDB()
		const transaction = db.transaction(["graphs"], "readonly")
		const store = transaction.objectStore("graphs")

		return Promise.all(
			keys.map(
				(key) =>
					new Promise<{ key: string; data: unknown }>((resolve, reject) => {
						const request = store.get(key)
						request.onsuccess = () => {
							const { result } = request
							resolve({ key, data: result ? result.data : null })
						}
						request.onerror = () => {
							reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
						}
					})
			)
		)
	}

	async getStorageSize(): Promise<number> {
		// IndexedDB doesn't have direct size API, estimate based on entries
		const db = await this.getDB()
		const transaction = db.transaction(["graphs"], "readonly")
		const store = transaction.objectStore("graphs")

		return new Promise<number>((resolve, reject) => {
			let size = 0
			const request = store.openCursor()

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest).result
				if (cursor) {
					size += JSON.stringify(cursor.value).length
					cursor.continue()
				} else {
					resolve(size)
				}
			}

			request.onerror = () => {
				reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
			}
		})
	}

	async clear(): Promise<void> {
		const db = await this.getDB()
		const transaction = db.transaction(["graphs"], "readwrite")
		const store = transaction.objectStore("graphs")

		await new Promise<void>((resolve, reject) => {
			const request = store.clear()
			request.onsuccess = () => {
				resolve()
			}
			request.onerror = () => {
				reject(new Error(request.error?.message ?? "Failed to open IndexedDB"))
			}
		})
	}
}

export class LocalStorageAdapter implements StorageAdapter {
	private prefix: string

	constructor(prefix: string = "ae-graph:") {
		this.prefix = prefix
	}

	private getKey(key: string): string {
		return `${this.prefix}${key}`
	}

	async save(key: string, data: unknown): Promise<void> {
		try {
			const serialized = JSON.stringify({
				data,
				timestamp: Date.now(),
			})
			localStorage.setItem(this.getKey(key), serialized)
			return await Promise.resolve()
		} catch (error) {
			return Promise.reject(new Error(`Failed to save to localStorage: ${error}`))
		}
	}

	async load(key: string): Promise<unknown> {
		try {
			const item = localStorage.getItem(this.getKey(key))
			if (!item) return await Promise.resolve(null)

			const parsed = JSON.parse(item)
			return await Promise.resolve(parsed.data)
		} catch {
			// Failed to load from localStorage - return null
			return Promise.resolve(null)
		}
	}

	async remove(key: string): Promise<void> {
		localStorage.removeItem(this.getKey(key))
		return Promise.resolve()
	}

	async exists(key: string): Promise<boolean> {
		return Promise.resolve(localStorage.getItem(this.getKey(key)) !== null)
	}

	async list(prefix?: string): Promise<string[]> {
		const keys: string[] = []

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if (key && key.startsWith(this.prefix)) {
				const cleanKey = key.substring(this.prefix.length)
				if (!prefix || cleanKey.startsWith(prefix)) {
					keys.push(cleanKey)
				}
			}
		}

		return Promise.resolve(keys)
	}

	async saveMany(entries: Array<{ key: string; data: unknown }>): Promise<void> {
		for (const { key, data } of entries) {
			await this.save(key, data)
		}
	}

	async loadMany(keys: string[]): Promise<Array<{ key: string; data: unknown }>> {
		return await Promise.all(
			keys.map(async (key) => ({
				key,
				data: await this.load(key),
			}))
		)
	}

	async getStorageSize(): Promise<number> {
		let size = 0
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if (key && key.startsWith(this.prefix)) {
				const value = localStorage.getItem(key)
				if (value) {
					size += key.length + value.length
				}
			}
		}
		return Promise.resolve(size)
	}

	async clear(): Promise<void> {
		const keysToRemove: string[] = []

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if (key && key.startsWith(this.prefix)) {
				keysToRemove.push(key)
			}
		}

		for (const key of keysToRemove) {
			localStorage.removeItem(key)
		}

		return Promise.resolve()
	}
}

export class GraphRepository {
	private storage: StorageAdapter

	constructor(storage: StorageAdapter) {
		this.storage = storage
	}

	// Core snapshot operations

	async save(snapshot: GraphSnapshot): Promise<void> {
		await this.storage.save(`snapshot:${snapshot.id}`, snapshot)

		// Update history
		const historyEntry: GraphHistoryEntry = {
			snapshotId: snapshot.id,
			timestamp: snapshot.timestamp,
			operation: (await this.exists(snapshot.id)) ? "update" : "create",
			changes: {
				nodesAdded: snapshot.nodes.length,
				nodesRemoved: 0,
				edgesAdded: snapshot.edges.length,
				edgesRemoved: 0,
			},
			description: snapshot.description,
		}

		await this.addHistoryEntry(snapshot.id, historyEntry)
	}

	async load(snapshotId: string): Promise<GraphSnapshot | null> {
		const data = await this.storage.load(`snapshot:${snapshotId}`)
		return data as GraphSnapshot | null
	}

	async exists(snapshotId: string): Promise<boolean> {
		return await this.storage.exists(`snapshot:${snapshotId}`)
	}

	async remove(snapshotId: string): Promise<void> {
		await this.storage.remove(`snapshot:${snapshotId}`)
		await this.storage.remove(`history:${snapshotId}`)
	}

	async list(): Promise<GraphSnapshot[]> {
		const snapshotKeys = await this.storage.list("snapshot:")
		const snapshots = await this.storage.loadMany(snapshotKeys)

		return snapshots
			.filter(({ data }) => data !== null)
			.map(({ data }) => data as GraphSnapshot)
			.sort((a, b) => b.timestamp - a.timestamp) // Most recent first
	}

	// History operations

	async getHistory(snapshotId: string): Promise<GraphHistoryEntry[]> {
		const data = await this.storage.load(`history:${snapshotId}`)
		return data ? (data as GraphHistoryEntry[]) : []
	}

	private async addHistoryEntry(snapshotId: string, entry: GraphHistoryEntry): Promise<void> {
		const history = await this.getHistory(snapshotId)
		history.push(entry)

		// Keep only last 50 entries
		const limitedHistory = history.slice(-50)

		await this.storage.save(`history:${snapshotId}`, limitedHistory)
	}

	// Search and filtering

	async findByName(name: string): Promise<GraphSnapshot[]> {
		const allSnapshots = await this.list()
		return allSnapshots.filter((snapshot) =>
			snapshot.name?.toLowerCase().includes(name.toLowerCase())
		)
	}

	async findByTags(tags: string[]): Promise<GraphSnapshot[]> {
		const allSnapshots = await this.list()
		return allSnapshots.filter((snapshot) =>
			snapshot.metadata.tags?.some((tag) => tags.includes(tag))
		)
	}

	async findByDateRange(startDate: number, endDate: number): Promise<GraphSnapshot[]> {
		const allSnapshots = await this.list()
		return allSnapshots.filter(
			(snapshot) => snapshot.timestamp >= startDate && snapshot.timestamp <= endDate
		)
	}

	// Utility operations

	async createSnapshot(
		nodes: GraphNode[],
		edges: GraphEdge[],
		options: {
			name?: string
			description?: string
			tags?: string[]
			stats?: GraphStats
		} = {}
	): Promise<GraphSnapshot> {
		const snapshot: GraphSnapshot = {
			id: `graph-${Date.now()}-${Math.random().toString(36).substring(2)}`,
			name: options.name,
			description: options.description,
			nodes: [...nodes], // Create copies
			edges: [...edges],
			timestamp: Date.now(),
			version: "1.0.0",
			metadata: {
				nodeCount: nodes.length,
				edgeCount: edges.length,
				tags: options.tags || [],
				stats: options.stats,
			},
		}

		await this.save(snapshot)
		return snapshot
	}

	async clone(snapshotId: string, newName?: string): Promise<GraphSnapshot | null> {
		const original = await this.load(snapshotId)
		if (!original) return null

		const cloned: GraphSnapshot = {
			...original,
			id: `graph-${Date.now()}-${Math.random().toString(36).substring(2)}`,
			name: newName || `${original.name || "Graph"} (Copy)`,
			timestamp: Date.now(),
		}

		await this.save(cloned)
		return cloned
	}

	async merge(snapshotIds: string[], name?: string): Promise<GraphSnapshot | null> {
		const snapshots = await Promise.all(snapshotIds.map((id) => this.load(id)))
		const validSnapshots = snapshots.filter((s): s is GraphSnapshot => s !== null)

		if (validSnapshots.length === 0) return null

		// Merge nodes and edges, removing duplicates
		const nodeMap = new Map<string, GraphNode>()
		const edgeMap = new Map<string, GraphEdge>()

		for (const snapshot of validSnapshots) {
			for (const node of snapshot.nodes) {
				nodeMap.set(node.entityId, node)
			}
			for (const edge of snapshot.edges) {
				edgeMap.set(edge.id, edge)
			}
		}

		return await this.createSnapshot(Array.from(nodeMap.values()), Array.from(edgeMap.values()), {
			name: name || `Merged Graph (${validSnapshots.length} sources)`,
			description: `Merged from: ${validSnapshots.map((s) => s.name || s.id).join(", ")}`,
			tags: ["merged"],
		})
	}

	// Storage management

	async getStorageInfo(): Promise<{
		totalSize: number
		snapshotCount: number
		oldestSnapshot?: number
		newestSnapshot?: number
	}> {
		const totalSize = await this.storage.getStorageSize()
		const snapshots = await this.list()

		return {
			totalSize,
			snapshotCount: snapshots.length,
			oldestSnapshot:
				snapshots.length > 0 ? Math.min(...snapshots.map((s) => s.timestamp)) : undefined,
			newestSnapshot:
				snapshots.length > 0 ? Math.max(...snapshots.map((s) => s.timestamp)) : undefined,
		}
	}

	async cleanup(
		options: {
			maxAge?: number // milliseconds
			maxCount?: number
			minCount?: number // Don't delete below this number
		} = {}
	): Promise<void> {
		const { maxAge, maxCount, minCount = 5 } = options
		const snapshots = await this.list() // Already sorted by timestamp desc

		const toDelete: string[] = []

		// Delete by age
		if (maxAge) {
			const cutoffTime = Date.now() - maxAge
			const oldSnapshots = snapshots.filter((s) => s.timestamp < cutoffTime)
			toDelete.push(...oldSnapshots.map((s) => s.id))
		}

		// Delete by count (keeping newest)
		if (maxCount && snapshots.length > maxCount) {
			const excess = snapshots.slice(maxCount)
			toDelete.push(...excess.map((s) => s.id))
		}

		// Apply minimum count protection
		const unique = [...new Set(toDelete)]
		if (snapshots.length - unique.length < minCount) {
			const keepCount = minCount - (snapshots.length - unique.length)
			unique.splice(-keepCount) // Remove last N from deletion list
		}

		// Delete snapshots
		for (const snapshotId of unique) {
			await this.remove(snapshotId)
		}
	}

	async clear(): Promise<void> {
		await this.storage.clear()
	}
}

// Factory function for creating repository with appropriate storage
export function createGraphRepository(
	storageType: "indexeddb" | "localstorage" = "indexeddb"
): GraphRepository {
	const storage = storageType === "indexeddb" ? new IndexedDBAdapter() : new LocalStorageAdapter()

	return new GraphRepository(storage)
}
