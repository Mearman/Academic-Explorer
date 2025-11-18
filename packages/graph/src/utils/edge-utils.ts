/**
 * Edge utility functions for graph edge management
 * Provides canonical edge ID generation and validation
 */

import { RelationType } from '../types/core'
import { logger } from '@academic-explorer/utils'

/**
 * Creates a canonical edge ID for deduplication and consistency
 *
 * Pattern: {sourceId}-{relationshipType}-{targetId}
 *
 * For symmetric relationships (RELATED_TO, TOPIC_SIBLING), IDs are sorted
 * to ensure bidirectional consistency regardless of argument order.
 *
 * @param sourceId - OpenAlex ID of entity that owns the relationship data
 * @param targetId - OpenAlex ID of referenced entity
 * @param relationType - Type of relationship from RelationType enum
 * @returns Canonical edge ID string
 *
 * @example
 * // Work → Author (standard directional)
 * createCanonicalEdgeId('W2741809807', 'A5017898742', RelationType.AUTHORSHIP)
 * // Returns: "W2741809807-AUTHORSHIP-A5017898742"
 *
 * @example
 * // Topic → Topic (symmetric - order independent)
 * createCanonicalEdgeId('T10003', 'T10001', RelationType.TOPIC_SIBLING)
 * // Returns: "T10001-topic_sibling-T10003" (IDs sorted)
 */
export function createCanonicalEdgeId(
  sourceId: string,
  targetId: string,
  relationType: RelationType
): string {
  // Validate IDs
  if (!validateOpenAlexId(sourceId)) {
    logger.warn('edge', `Invalid source ID format: ${sourceId}`, {
      sourceId,
      targetId,
      relationType,
    })
  }

  if (!validateOpenAlexId(targetId)) {
    logger.warn('edge', `Invalid target ID format: ${targetId}`, {
      sourceId,
      targetId,
      relationType,
    })
  }

  // For symmetric relationships, use sorted IDs for consistent ordering
  const isSymmetric = [
    RelationType.RELATED_TO,
    RelationType.TOPIC_SIBLING,
  ].includes(relationType)

  const [id1, id2] = isSymmetric
    ? [sourceId, targetId].sort()
    : [sourceId, targetId]

  return `${id1}-${relationType}-${id2}`
}

/**
 * Validates OpenAlex entity ID format (FR-031, FR-032)
 *
 * Valid format: [A-Z]\d+ (single letter followed by digits)
 * Examples: W2741809807, A5017898742, I4210140050
 *
 * @param id - ID string to validate (handles null/undefined gracefully)
 * @returns true if valid OpenAlex ID format, false otherwise
 */
export function validateOpenAlexId(id: string | undefined | null): boolean {
  if (id === undefined || id === null || id === '') {
    return false
  }
  if (typeof id !== 'string') {
    return false
  }
  return /^[A-Z]\d+$/.test(id)
}

/**
 * Extracts OpenAlex ID from either a full URL or bare ID string
 *
 * Handles both formats:
 * - Full URL: https://openalex.org/W2741809807 → W2741809807
 * - Bare ID: W2741809807 → W2741809807
 *
 * @param idOrUrl - OpenAlex ID or full URL
 * @returns Bare OpenAlex ID (e.g., W2741809807)
 *
 * @example
 * extractOpenAlexId('https://openalex.org/W2741809807') // Returns: 'W2741809807'
 * extractOpenAlexId('W2741809807') // Returns: 'W2741809807'
 */
export function extractOpenAlexId(idOrUrl: string): string {
  // If it's already a bare ID, return as-is
  if (/^[A-Z]\d+$/.test(idOrUrl)) {
    return idOrUrl
  }

  // Extract from URL: https://openalex.org/W2741809807 or https://api.openalex.org/W2741809807
  const urlMatch = idOrUrl.match(/\/([A-Z]\d+)(?:[?#]|$)/i)
  if (urlMatch) {
    return urlMatch[1].toUpperCase()
  }

  // Fallback: return original if no pattern matches
  return idOrUrl
}
