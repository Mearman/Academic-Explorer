/**
 * Hook for persisting and restoring graph sessions
 * Enables researchers to save their work and continue later
 */

import { useCallback } from 'react'
import { useGraphStore } from '@/stores/graph-store'
import type { GraphSnapshot } from '@/lib/graph/types'

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

const STORAGE_KEY = 'academic-explorer-sessions'
const MAX_SESSIONS = 10 // Limit to prevent localStorage bloat

export function useGraphPersistence() {
  // Load all saved sessions
  const loadSessions = useCallback((): GraphSession[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []

      const sessions = JSON.parse(stored) as GraphSession[]
      return sessions.map(session => ({
        ...session,
        createdAt: new Date(session.createdAt),
        lastModified: new Date(session.lastModified)
      }))
    } catch (error) {
      console.error('Failed to load sessions:', error)
      return []
    }
  }, [])

  // Save current graph as new session
  const saveSession = useCallback((name: string, description?: string): string => {
    const store = useGraphStore.getState()

    if (store.nodes.size === 0) {
      throw new Error('Cannot save empty graph')
    }

    const sessionId = `session_${Date.now()}`
    const snapshot: GraphSnapshot = {
      nodes: Array.from(store.nodes.values()),
      edges: Array.from(store.edges.values()),
      viewport: {
        zoom: 1, // TODO: Get actual viewport state from provider
        center: { x: 0, y: 0 }
      }
    }

    // Calculate metadata
    const entityCounts = {
      works: snapshot.nodes.filter(n => n.type === 'works').length,
      authors: snapshot.nodes.filter(n => n.type === 'authors').length,
      sources: snapshot.nodes.filter(n => n.type === 'sources').length,
      institutions: snapshot.nodes.filter(n => n.type === 'institutions').length,
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
      console.error('Failed to save session:', error)
      throw new Error('Failed to save session. Storage might be full.')
    }
  }, [loadSessions])

  // Load a session by ID
  const loadSession = useCallback((sessionId: string): boolean => {
    try {
      const sessions = loadSessions()
      const session = sessions.find(s => s.id === sessionId)

      if (!session) {
        throw new Error('Session not found')
      }

      const store = useGraphStore.getState()

      // Clear existing graph
      store.clear()

      // Load nodes and edges
      store.addNodes(session.snapshot.nodes)
      store.addEdges(session.snapshot.edges)

      // Apply layout and fit view
      if (store.provider) {
        store.provider.applyLayout({ type: 'force' })
        store.provider.fitView()
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
      console.error('Failed to load session:', error)
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
      console.error('Failed to delete session:', error)
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
      console.error('Failed to update session:', error)
      return false
    }
  }, [loadSessions])

  // Auto-save current session (debounced)
  const autoSave = useCallback((sessionName: string = 'Auto-saved Session') => {
    // Simple auto-save that creates a new session
    // In a production app, you might want to update an existing auto-save session
    try {
      saveSession(sessionName, 'Automatically saved')
    } catch (error) {
      // Silently fail for auto-save
      console.warn('Auto-save failed:', error)
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