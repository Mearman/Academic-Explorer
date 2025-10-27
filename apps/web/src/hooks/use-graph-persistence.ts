/**
 * Hook for persisting and restoring graph sessions
 * Enables researchers to save their work and continue later
 */

import { useCallback } from "react";
import { graphStore } from "@/stores/graph-store";
import { logError, logger } from "@academic-explorer/utils/logger";
import type { GraphSnapshot } from "@academic-explorer/graph";

interface GraphSession {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  snapshot: GraphSnapshot;
  metadata?: {
    entityCounts: {
      works: number;
      authors: number;
      sources: number;
      institutions: number;
      total: number;
    };
    description?: string | undefined;
  };
}

const STORAGE_KEY = "academic-explorer-sessions";
const MAX_SESSIONS = 10; // Limit to prevent localStorage bloat

// Type guard for Record<string, unknown>
function isRecord(obj: unknown): obj is Record<string, unknown> {
  return obj !== null && typeof obj === "object";
}

// Helper function for safe property access
function hasProperty({ obj, prop }: { obj: unknown; prop: string }): boolean {
  return isRecord(obj) && Object.prototype.hasOwnProperty.call(obj, prop);
}

// Helper function for safe property value extraction
function getProperty({ obj, prop }: { obj: unknown; prop: string }): unknown {
  if (!hasProperty({ obj, prop }) || !isRecord(obj)) return undefined;
  return obj[prop];
}

// Type guard for GraphSession objects
function isValidGraphSession(obj: unknown): obj is GraphSession {
  if (!obj || typeof obj !== "object") return false;

  // Check required properties exist
  if (
    !hasProperty({ obj, prop: "id" }) ||
    !hasProperty({ obj, prop: "name" }) ||
    !hasProperty({ obj, prop: "snapshot" })
  )
    return false;

  // Validate property types
  const id = getProperty({ obj, prop: "id" });
  const name = getProperty({ obj, prop: "name" });
  if (typeof id !== "string" || typeof name !== "string") return false;

  // Validate optional date properties
  const createdAt = getProperty({ obj, prop: "createdAt" });
  const lastModified = getProperty({ obj, prop: "lastModified" });

  const createdAtValid =
    createdAt === undefined ||
    typeof createdAt === "string" ||
    createdAt instanceof Date;
  const lastModifiedValid =
    lastModified === undefined ||
    typeof lastModified === "string" ||
    lastModified instanceof Date;

  if (!createdAtValid || !lastModifiedValid) return false;

  // Validate snapshot structure
  const snapshot = getProperty({ obj, prop: "snapshot" });
  if (!snapshot || typeof snapshot !== "object") return false;

  // Check snapshot has required array properties
  const nodes = getProperty({ obj: snapshot, prop: "nodes" });
  const edges = getProperty({ obj: snapshot, prop: "edges" });

  return Array.isArray(nodes) && Array.isArray(edges);
}

export function useGraphPersistence() {
  // Load all saved sessions
  const loadSessions = useCallback((): GraphSession[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        logger.warn(
          "storage",
          "Invalid sessions data format, expected array",
          { parsed: String(parsed) },
          "useGraphPersistence",
        );
        return [];
      }
      const sessions = parsed.filter(isValidGraphSession);
      return sessions.map((session) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        lastModified: new Date(session.lastModified),
      }));
    } catch (error) {
      logError(
        logger,
        "Failed to load graph sessions from storage",
        error,
        "useGraphPersistence",
        "storage",
      );
      return [];
    }
  }, []);

  // Save current graph as new session
  const saveSession = useCallback(
    ({ name, description }: { name: string; description?: string }): string => {
      const store = graphStore.getState();

      if (Object.keys(store.nodes).length === 0) {
        throw new Error("Cannot save empty graph");
      }

      const sessionId = `session_${Date.now().toString()}`;

      // Create base snapshot from store data
      const baseSnapshot: GraphSnapshot = {
        id: sessionId,
        name,
        description,
        nodes: Object.values(store.nodes),
        edges: Object.values(store.edges),
        timestamp: Date.now(),
        version: "1.0.0",
        metadata: {
          nodeCount: Object.values(store.nodes).length,
          edgeCount: Object.values(store.edges).length,
        },
      };

      // Add default viewport (provider snapshot functionality not yet implemented)
      const snapshot: GraphSnapshot & {
        viewport?: { zoom: number; center: { x: number; y: number } };
      } = {
        ...baseSnapshot,
        viewport: {
          zoom: 1,
          center: { x: 0, y: 0 },
        },
      };

      // Calculate metadata
      const entityCounts = {
        works: snapshot.nodes.filter((n) => n.entityType === "works").length,
        authors: snapshot.nodes.filter((n) => n.entityType === "authors")
          .length,
        sources: snapshot.nodes.filter((n) => n.entityType === "sources")
          .length,
        institutions: snapshot.nodes.filter(
          (n) => n.entityType === "institutions",
        ).length,
        total: snapshot.nodes.length,
      };

      const session: GraphSession = {
        id: sessionId,
        name,
        createdAt: new Date(),
        lastModified: new Date(),
        snapshot,
        metadata: {
          entityCounts,
          description,
        },
      };

      try {
        const sessions = loadSessions();
        const updatedSessions = [session, ...sessions].slice(0, MAX_SESSIONS); // Keep most recent
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
        return sessionId;
      } catch (error) {
        logError(
          logger,
          "Failed to save graph session to storage",
          error,
          "useGraphPersistence",
          "storage",
        );
        throw new Error("Failed to save session. Storage might be full.");
      }
    },
    [loadSessions],
  );

  // Type guard for snapshot with viewport
  const hasViewport = (
    snapshot: unknown,
  ): snapshot is GraphSnapshot & {
    viewport: { zoom: number; center: { x: number; y: number } };
  } => {
    if (!snapshot || typeof snapshot !== "object") return false;
    const viewportProp = getProperty({ obj: snapshot, prop: "viewport" });
    if (!viewportProp || typeof viewportProp !== "object") return false;

    const zoom = getProperty({ obj: viewportProp, prop: "zoom" });
    const center = getProperty({ obj: viewportProp, prop: "center" });

    if (typeof zoom !== "number" || !center || typeof center !== "object")
      return false;

    const x = getProperty({ obj: center, prop: "x" });
    const y = getProperty({ obj: center, prop: "y" });

    return typeof x === "number" && typeof y === "number";
  };

  // Load a session by ID
  const loadSession = useCallback(
    (sessionId: string): boolean => {
      try {
        const sessions = loadSessions();
        const session = sessions.find((s) => s.id === sessionId);

        if (!session) {
          throw new Error("Session not found");
        }

        // Clear existing graph
        graphStore.clear();

        // Load nodes and edges
        graphStore.addNodes(session.snapshot.nodes);
        graphStore.addEdges(session.snapshot.edges);

        // Layout and view state restoration not yet implemented
        // Future implementation will apply layout based on store.currentLayout
        // and restore viewport if available in session.snapshot

        // Update last modified
        session.lastModified = new Date();
        const allSessions = loadSessions();
        const updatedSessions = allSessions.map((s) =>
          s.id === sessionId ? session : s,
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));

        return true;
      } catch (error) {
        logError(
          logger,
          "Failed to load graph session from storage",
          error,
          "useGraphPersistence",
          "storage",
        );
        return false;
      }
    },
    [loadSessions],
  );

  // Delete a session
  const deleteSession = useCallback(
    (sessionId: string): boolean => {
      try {
        const sessions = loadSessions();
        const filteredSessions = sessions.filter((s) => s.id !== sessionId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions));
        return true;
      } catch (error) {
        logError(
          logger,
          "Failed to delete graph session from storage",
          error,
          "useGraphPersistence",
          "storage",
        );
        return false;
      }
    },
    [loadSessions],
  );

  // Update session name/description
  const updateSession = useCallback(
    (
      sessionId: string,
      updates: { name?: string; description?: string },
    ): boolean => {
      try {
        const sessions = loadSessions();
        const updatedSessions = sessions.map((session) => {
          if (session.id === sessionId) {
            return {
              ...session,
              name: updates.name ?? session.name,
              lastModified: new Date(),
              metadata: {
                ...session.metadata,
                description:
                  updates.description ?? session.metadata?.description,
              },
            };
          }
          return session;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
        return true;
      } catch (error) {
        logError(
          logger,
          "Failed to update graph session in storage",
          error,
          "useGraphPersistence",
          "storage",
        );
        return false;
      }
    },
    [loadSessions],
  );

  // Auto-save current session (debounced)
  const autoSave = useCallback(
    (sessionName: string = "Auto-saved Session") => {
      // Simple auto-save that creates a new session
      // In a production app, you might want to update an existing auto-save session
      try {
        saveSession({ name: sessionName, description: "Automatically saved" });
      } catch (error) {
        // Silently fail for auto-save
        logger.warn(
          "storage",
          "Auto-save failed",
          { error },
          "useGraphPersistence",
        );
      }
    },
    [saveSession],
  );

  return {
    loadSessions,
    saveSession,
    loadSession,
    deleteSession,
    updateSession,
    autoSave,
  };
}
