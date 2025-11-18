/**
 * Graph repository service for managing graph operations
 * Handles edge deduplication and graph data persistence
 */

import type { GraphEdge } from '../types/core'

/**
 * Add or update an edge with deduplication logic using edge.id as primary key
 *
 * Edge deduplication using edge.id as primary key (FR-004)
 *
 * When an edge already exists:
 * - If directions differ, the outbound version is preferred (higher data quality)
 * - Otherwise, the existing edge is kept
 *
 * @param edge - The edge to add or update
 * @param existingEdges - Map of existing edges keyed by edge.id
 */
export function addEdgeWithDeduplication(
	edge: GraphEdge,
	existingEdges: Map<string, GraphEdge>
): void {
	// Check if edge already exists by edge.id
	if (existingEdges.has(edge.id)) {
		const existing = existingEdges.get(edge.id)!

		// If directions differ, keep outbound version (higher data quality)
		if (existing.direction === 'inbound' && edge.direction === 'outbound') {
			existingEdges.set(edge.id, edge) // Replace with outbound version
		}
		// Otherwise skip (already have outbound or both are same direction)
		return
	}

	// New edge - add to map
	existingEdges.set(edge.id, edge)
}
