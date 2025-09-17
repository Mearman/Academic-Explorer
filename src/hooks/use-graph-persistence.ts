/**
 * Hook for persisting and restoring graph sessions
 * Enables researchers to save their work and continue later
 */

import { useCallback } from "react"
import { useGraphStore } from "@/stores/graph-store"
import { logError, logger } from "@/lib/logger"
import type { GraphSnapshot } from "@/lib/graph/types"

interface GraphSession {
  id: string
  name: string
  createdAt: Date
  lastModified: Date
  snapshot: GraphSnapshot
  metadata?: {
    entityCounts: {
      works: number
      authors: number
      sources: number
      institutions: number
      total: number
    }
    description?: string
  }
}

const STORAGE_KEY = "academic-explorer-sessions"
const MAX_SESSIONS = 10 // Limit to prevent localStorage bloat

// Helper function for safe property access
function hasProperty(obj: unknown, prop: string): boolean {
	return obj !== null && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, prop)
}

// Helper function for safe property value extraction
function getProperty(obj: unknown, prop: string): unknown {
	if (!hasProperty(obj, prop)) return undefined
	// Safe cast: hasProperty already verified obj is a non-null object with the property
	return (obj as Record<string, unknown>)[prop]
}

// Type guard for GraphSession objects
function isValidGraphSession(obj: unknown): obj is GraphSession {
	if (!obj || typeof obj !== "object") return false

	// Check required properties exist
	if (!hasProperty(obj, "id") || !hasProperty(obj, "name") || !hasProperty(obj, "snapshot")) return false

	// Validate property types
	const id = getProperty(obj, "id")
	const name = getProperty(obj, "name")
	if (typeof id !== "string" || typeof name !== "string") return false

	// Validate optional date properties
	const createdAt = getProperty(obj, "createdAt")
	const lastModified = getProperty(obj, "lastModified")

	const createdAtValid = createdAt === undefined || typeof createdAt === "string" || createdAt instanceof Date
	const lastModifiedValid = lastModified === undefined || typeof lastModified === "string" || lastModified instanceof Date

	if (!createdAtValid || !lastModifiedValid) return false

	// Validate snapshot structure
	const snapshot = getProperty(obj, "snapshot")
	if (!snapshot || typeof snapshot !== "object") return false

	// Check snapshot has required array properties
	const nodes = getProperty(snapshot, "nodes")
	const edges = getProperty(snapshot, "edges")

	return Array.isArray(nodes) && Array.isArray(edges)
}

export function useGraphPersistence() {
	// Load all saved sessions
	const loadSessions = useCallback((): GraphSession[] => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (!stored) return []

			const parsed: unknown = JSON.parse(stored)
			if (!Array.isArray(parsed)) {
				logger.warn("storage", "Invalid sessions data format, expected array", { parsed: String(parsed) }, "useGraphPersistence")
				return []
			}
			const sessions = (parsed as GraphSession[]).filter(isValidGraphSession)
			return sessions.map(session => ({
				...session,
				createdAt: new Date(session.createdAt),
				lastModified: new Date(session.lastModified)
			}))
		} catch (error) {
			logError("Failed to load graph sessions from storage", error, "useGraphPersistence", "storage")
			return []
		}
	}, [])

	// Save current graph as new session
	const saveSession = useCallback((name: string, description?: string): string => {
		const store = useGraphStore.getState()

		if (Object.keys(store.nodes).length === 0) {
			throw new Error("Cannot save empty graph")
		}

		const sessionId = `session_${Date.now().toString()}`
		const snapshot: GraphSnapshot = {
			nodes: Object.values(store.nodes).filter((node): node is NonNullable<typeof node> => node != null),
			edges: Object.values(store.edges).filter((edge): edge is NonNullable<typeof edge> => edge != null),
			viewport: store.provider?.getSnapshot().viewport || {
				zoom: 1,
				center: { x: 0, y: 0 }
			}
		}

		// Calculate metadata
		const entityCounts = {
			works: snapshot.nodes.filter(n => n.type === "works").length,
			authors: snapshot.nodes.filter(n => n.type === "authors").length,
			sources: snapshot.nodes.filter(n => n.type === "sources").length,
			institutions: snapshot.nodes.filter(n => n.type === "institutions").length,
			total: snapshot.nodes.length
		}

		const session: GraphSession = {
			id: sessionId,
			name,
			createdAt: new Date(),
			lastModified: new Date(),
			snapshot,
			metadata: {
				entityCounts,
				description
			}
		}

		try {
			const sessions = loadSessions()
			const updatedSessions = [session, ...sessions].slice(0, MAX_SESSIONS) // Keep most recent
			localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions))
			return sessionId
		} catch (error) {
			logError("Failed to save graph session to storage", error, "useGraphPersistence", "storage")
			throw new Error("Failed to save session. Storage might be full.")
		}
	}, [loadSessions])

	// Load a session by ID
	const loadSession = useCallback((sessionId: string): boolean => {
		try {
			const sessions = loadSessions()
			const session = sessions.find(s => s.id === sessionId)

			if (!session) {
				throw new Error("Session not found")
			}

			const store = useGraphStore.getState()

			// Clear existing graph
			store.clear()

			// Load nodes and edges
			store.addNodes(session.snapshot.nodes)
			store.addEdges(session.snapshot.edges)

			// Apply layout and fit view
			if (store.provider) {
				store.provider.applyLayout(store.currentLayout)

				// Restore viewport state if available, otherwise fit view
				if (session.snapshot.viewport) {
					store.provider.loadSnapshot(session.snapshot)
				} else {
					store.provider.fitView()
				}
			}

			// Update last modified
			session.lastModified = new Date()
			const allSessions = loadSessions()
			const updatedSessions = allSessions.map(s =>
				s.id === sessionId ? session : s
			)
			localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions))

			return true
		} catch (error) {
			logError("Failed to load graph session from storage", error, "useGraphPersistence", "storage")
			return false
		}
	}, [loadSessions])

	// Delete a session
	const deleteSession = useCallback((sessionId: string): boolean => {
		try {
			const sessions = loadSessions()
			const filteredSessions = sessions.filter(s => s.id !== sessionId)
			localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions))
			return true
		} catch (error) {
			logError("Failed to delete graph session from storage", error, "useGraphPersistence", "storage")
			return false
		}
	}, [loadSessions])

	// Update session name/description
	const updateSession = useCallback((sessionId: string, updates: { name?: string; description?: string }): boolean => {
		try {
			const sessions = loadSessions()
			const updatedSessions = sessions.map(session => {
				if (session.id === sessionId) {
					return {
						...session,
						name: updates.name || session.name,
						lastModified: new Date(),
						metadata: {
							...session.metadata,
							description: updates.description !== undefined ? updates.description : session.metadata?.description
						}
					}
				}
				return session
			})
			localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions))
			return true
		} catch (error) {
			logError("Failed to update graph session in storage", error, "useGraphPersistence", "storage")
			return false
		}
	}, [loadSessions])

	// Auto-save current session (debounced)
	const autoSave = useCallback((sessionName: string = "Auto-saved Session") => {
		// Simple auto-save that creates a new session
		// In a production app, you might want to update an existing auto-save session
		try {
			saveSession(sessionName, "Automatically saved")
		} catch (error) {
			// Silently fail for auto-save
			logger.warn("storage", "Auto-save failed", { error }, "useGraphPersistence")
		}
	}, [saveSession])

	return {
		loadSessions,
		saveSession,
		loadSession,
		deleteSession,
		updateSession,
		autoSave
	}
}