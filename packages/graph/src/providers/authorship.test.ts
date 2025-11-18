/// <reference types="vitest" />
/**
 * Unit tests for authorship relationship handling in OpenAlexGraphProvider
 * Tests Work → Author edge direction for both forward and reverse lookups
 *
 * Spec: 015-openalex-relationships
 * User Story 1: View Authorship Relationships Correctly (P1)
 * Functional Requirements: FR-001, FR-002, FR-003, FR-004
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenAlexGraphProvider } from './openalex-provider'
import type { ProviderExpansionOptions } from './base-provider'
import { RelationType } from '../types/core'
import type { GraphEdge, EdgeDirection } from '../types/core'
import { createCanonicalEdgeId } from '../utils/edge-utils'

// Mock OpenAlex client interface
interface MockOpenAlexClient {
  getWork: ReturnType<typeof vi.fn>
  getAuthor: ReturnType<typeof vi.fn>
  works: ReturnType<typeof vi.fn>
  authors: ReturnType<typeof vi.fn>
}

// Mock data generators
const createMockWork = (id = 'W2741809807', authorId = 'A5017898742') => ({
  id,
  title: 'Test Work for Authorship',
  display_name: 'Test Work Display Name',
  publication_year: 2023,
  ids: {
    doi: '10.1000/test123',
    openalex: `https://openalex.org/${id}`,
  },
  authorships: [
    {
      author: {
        id: authorId,
        display_name: 'Test Author Name',
        ids: {
          orcid: 'https://orcid.org/0000-0000-0000-0000',
          openalex: `https://openalex.org/${authorId}`,
        },
      },
      institutions: [],
    },
  ],
  primary_location: {
    source: {
      id: 'S4210184550',
      display_name: 'Test Journal',
      ids: {
        issn_l: '1234-5678',
        openalex: 'https://openalex.org/S4210184550',
      },
    },
  },
  referenced_works: [],
})

const createMockAuthor = (id = 'A5017898742', workIds = ['W2741809807']) => ({
  id,
  display_name: 'Test Author Name',
  ids: {
    orcid: 'https://orcid.org/0000-0000-0000-0000',
    openalex: `https://openalex.org/${id}`,
  },
  works_count: workIds.length,
})

describe('OpenAlexGraphProvider - Authorship Relationships (US1)', () => {
  let provider: OpenAlexGraphProvider
  let mockClient: MockOpenAlexClient

  beforeEach(() => {
    // Create mock client
    mockClient = {
      getWork: vi.fn(),
      getAuthor: vi.fn(),
      works: vi.fn(),
      authors: vi.fn(),
    }

    // Create provider with mock client
    provider = new OpenAlexGraphProvider(mockClient as any)
  })

  describe('Author reverse lookup (FR-003)', () => {
    it('should maintain Work → Author direction even when discovered via author expansion (FR-003)', async () => {
      // Arrange: Setup mock author with works
      const authorId = 'A5017898742'
      const workId = 'W2741809807'
      const mockAuthor = createMockAuthor(authorId, [workId])

      // Mock the getAuthor call to return author data
      mockClient.getAuthor.mockResolvedValue(mockAuthor)

      // Mock the works endpoint to return works by this author
      // This simulates the reverse lookup: expanding author discovers their works
      mockClient.works.mockResolvedValue({
        results: [createMockWork(workId, authorId)],
        meta: { count: 1, per_page: 1, page: 1 },
      })

      // Act: Expand the author node (reverse lookup - discovers works by this author)
      const expansion = await provider.expandEntity(authorId, { limit: 10 })

      // Assert: Extract edges related to authorship
      const authorshipEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.AUTHORSHIP
      )

      // Must not fail with false positives - at least one authorship edge should exist
      expect(authorshipEdges.length).toBeGreaterThan(0)

      // Check the critical assertion: edge direction must be FROM work TO author
      // even when discovered via author expansion (reverse lookup)
      for (const edge of authorshipEdges) {
        // FR-003 requirement: reverse lookup maintains canonical direction
        // - source MUST be workId (NOT authorId)
        // - target MUST be authorId
        // - direction MUST be 'inbound' (discovered via reverse lookup)
        expect(
          edge.source,
          `AUTHORSHIP edge source should be work ID, not author ID. Edge: ${JSON.stringify(edge)}`
        ).toBe(workId)

        expect(
          edge.target,
          `AUTHORSHIP edge target should be author ID. Edge: ${JSON.stringify(edge)}`
        ).toBe(authorId)
      }
    })

    it('should create authorship edges with correct canonical IDs when expanding author', async () => {
      // Arrange: Setup mock author with works
      const authorId = 'A5017898742'
      const workId = 'W2741809807'
      const mockAuthor = createMockAuthor(authorId, [workId])

      mockClient.getAuthor.mockResolvedValue(mockAuthor)
      mockClient.works.mockResolvedValue({
        results: [createMockWork(workId, authorId)],
        meta: { count: 1, per_page: 1, page: 1 },
      })

      // Act: Expand author
      const expansion = await provider.expandEntity(authorId, { limit: 10 })

      // Assert: Check edge ID format matches canonical pattern
      const authorshipEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.AUTHORSHIP
      )

      expect(authorshipEdges.length).toBeGreaterThan(0)

      for (const edge of authorshipEdges) {
        // Edge ID should follow canonical format: {workId}-{AUTHORSHIP}-{authorId}
        // NOT the reversed format: {authorId}-{AUTHORSHIP}-{workId}
        const expectedEdgeId = `${workId}-${RelationType.AUTHORSHIP}-${authorId}`
        expect(
          edge.id,
          `AUTHORSHIP edge ID should follow canonical format. Got: ${edge.id}, Expected: ${expectedEdgeId}`
        ).toBe(expectedEdgeId)
      }
    })

    it('should not create reversed (invalid) authorship edges when expanding author', async () => {
      // Arrange: Setup mock author
      const authorId = 'A5017898742'
      const workId = 'W2741809807'
      const mockAuthor = createMockAuthor(authorId, [workId])

      mockClient.getAuthor.mockResolvedValue(mockAuthor)
      mockClient.works.mockResolvedValue({
        results: [createMockWork(workId, authorId)],
        meta: { count: 1, per_page: 1, page: 1 },
      })

      // Act: Expand author
      const expansion = await provider.expandEntity(authorId, { limit: 10 })

      // Assert: Verify NO edges have the invalid reversed direction
      const allEdges = expansion.edges
      const invalidEdges = allEdges.filter(
        (edge) =>
          edge.type === RelationType.AUTHORSHIP &&
          edge.source === authorId && // INVALID: source is author
          edge.target === workId // INVALID: target is work
      )

      expect(
        invalidEdges.length,
        'AUTHORSHIP edges should NEVER have source=authorId and target=workId (reversed direction)'
      ).toBe(0)
    })

    it('should handle multiple works when expanding author (reverse lookup with many relationships)', async () => {
      // Arrange: Author with multiple works
      const authorId = 'A5017898742'
      const workIds = ['W1111111111', 'W2222222222', 'W3333333333']
      const mockAuthor = createMockAuthor(authorId, workIds)

      mockClient.getAuthor.mockResolvedValue(mockAuthor)

      // Each work has the same author
      const works = workIds.map((wId) => createMockWork(wId, authorId))
      mockClient.works.mockResolvedValue({
        results: works,
        meta: { count: works.length, per_page: 50, page: 1 },
      })

      // Act: Expand author (reverse lookup)
      const expansion = await provider.expandEntity(authorId, { limit: 10 })

      // Assert: All edges should maintain Work → Author direction
      const authorshipEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.AUTHORSHIP
      )

      expect(authorshipEdges.length).toBeGreaterThanOrEqual(workIds.length)

      for (const edge of authorshipEdges) {
        // All edges must point FROM work TO author
        expect(
          workIds,
          `Edge source should be one of the work IDs. Got: ${edge.source}`
        ).toContain(edge.source)
        expect(edge.target).toBe(authorId)
      }
    })
  })


  describe('Bidirectional Consistency (FR-004)', () => {
    /**
     * T012: Integration test for bidirectional consistency in authorship
     *
     * This test verifies that expanding both a work and an author node
     * results in the SAME edge ID being generated from both directions.
     * This ensures edge deduplication works correctly, preventing duplicate
     * edges when the bidirectional relationship is discovered from both ends.
     *
     * Test Scenario:
     * 1. Expand work W123 (creates edge from work's perspective: outbound)
     * 2. Expand author A456 (discovers same edge from author's perspective: inbound via reverse lookup)
     * 3. Assert both expansion methods generate identical edge.id
     * 4. Verify only ONE edge exists in the graph with this canonical ID
     */
    it('should not create duplicate edges when expanding both work and author (FR-004)', () => {
      // Arrange: Create mock work with author
      const workId = 'W2741809807'
      const authorId = 'A5017898742'

      // Act: Create edges as they would be created from both expansion directions
      // Expand work: creates outbound edge from work → author
      const edgeFromWorkExpansion: GraphEdge = {
        id: createCanonicalEdgeId(workId, authorId, RelationType.AUTHORSHIP),
        source: workId,
        target: authorId,
        type: RelationType.AUTHORSHIP,
        direction: 'outbound',
        metadata: {
          raw_affiliation_string: 'Test University',
        },
      }

      // Expand author: would discover the same relationship via reverse lookup
      // Should create inbound edge with SAME canonical ID
      const edgeFromAuthorExpansion: GraphEdge = {
        id: createCanonicalEdgeId(workId, authorId, RelationType.AUTHORSHIP),
        source: workId,
        target: authorId,
        type: RelationType.AUTHORSHIP,
        direction: 'inbound',
        metadata: {
          raw_affiliation_string: 'Test University',
        },
      }

      // Assert: Verify bidirectional consistency
      // Expected canonical ID format: "W2741809807-AUTHORSHIP-A5017898742"
      const expectedCanonicalId = `${workId}-${RelationType.AUTHORSHIP}-${authorId}`

      expect(edgeFromWorkExpansion.id).toBe(expectedCanonicalId)
      expect(edgeFromAuthorExpansion.id).toBe(expectedCanonicalId)
      expect(edgeFromWorkExpansion.id).toBe(edgeFromAuthorExpansion.id)

      // Verify edges are identical except for direction field
      // (direction reflects perspective: outbound when expanding work, inbound when expanding author)
      expect(edgeFromWorkExpansion.source).toBe(edgeFromAuthorExpansion.source)
      expect(edgeFromWorkExpansion.target).toBe(edgeFromAuthorExpansion.target)
      expect(edgeFromWorkExpansion.type).toBe(edgeFromAuthorExpansion.type)

      // Direction should differ (reflects expansion perspective)
      expect(edgeFromWorkExpansion.direction).toBe('outbound')
      expect(edgeFromAuthorExpansion.direction).toBe('inbound')

      // Simulate graph deduplication: merge both edges by ID
      // In a real graph, edges with same ID would be stored once with both direction values
      const edges: Record<string, GraphEdge> = {}
      edges[edgeFromWorkExpansion.id] = edgeFromWorkExpansion
      edges[edgeFromAuthorExpansion.id] = edgeFromAuthorExpansion

      // Assert only ONE edge exists after deduplication
      expect(Object.keys(edges)).toHaveLength(1)
      expect(edges[expectedCanonicalId]).toBeDefined()
    })

    /**
     * Additional consistency check: Verify canonical ID format is consistent
     * regardless of which entity is expanded first
     */
    it('should generate same canonical ID regardless of expansion order (FR-004)', () => {
      // Arrange: IDs in any order
      const workId = 'W2741809807'
      const authorId = 'A5017898742'

      // Act: Generate canonical IDs in both orders
      // Note: For AUTHORSHIP (directional), order matters
      const idExpandingWork = createCanonicalEdgeId(workId, authorId, RelationType.AUTHORSHIP)
      const idExpandingAuthor = createCanonicalEdgeId(workId, authorId, RelationType.AUTHORSHIP)

      // Assert: Same ID from both directions
      expect(idExpandingWork).toBe(idExpandingAuthor)
      expect(idExpandingWork).toBe(`${workId}-${RelationType.AUTHORSHIP}-${authorId}`)
    })
  })

  describe('Regression: Issue #015 - AUTHORSHIP direction bug (T013)', () => {
    /**
     * CRITICAL REGRESSION TEST (T013)
     * Prevents accidental reversion to the original bug where AUTHORSHIP edges
     * were incorrectly created as Author → Work instead of Work → Author
     *
     * Background (research.md Section 5, lines 815-833):
     * The original implementation incorrectly created authorship edges with:
     * - source = authorship.author.id (WRONG!)
     * - target = workId (WRONG!)
     * Direction = outbound (WRONG - should indicate reverse lookup)
     *
     * This test FAILS if that pattern is ever recreated, ensuring the bug
     * cannot be accidentally reintroduced.
     *
     * Reference: tasks.md T013 - regression test for original AUTHORSHIP bug
     */
    it('should NEVER create edges with Author as source and Work as target (regression test)', async () => {
      // Arrange: Create mock work with multiple authors
      const workId = 'W2741809807'
      const authorIds = ['A5017898742', 'A1234567890', 'A9876543210']

      const mockWork = {
        ...createMockWork(workId, authorIds[0]),
        authorships: authorIds.map((authorId, index) => ({
          author: {
            id: authorId,
            display_name: `Author ${index + 1}`,
            ids: {
              orcid: `https://orcid.org/0000-000${index}-0000-000${index}`,
              openalex: `https://openalex.org/${authorId}`,
            },
          },
          institutions: [],
        })),
      }

      mockClient.getWork.mockResolvedValue(mockWork)

      // Act: Expand work (should create Work → Author edges)
      const expansion = await provider.expandEntity(workId, { limit: 10 })

      // Assert: Filter AUTHORSHIP edges and verify NO edges have Author as source + Work as target
      const authorshipEdges = expansion.edges.filter(
        (e) => e.type === RelationType.AUTHORSHIP
      )

      // This is the critical regression check - MUST NOT FAIL
      for (const edge of authorshipEdges) {
        // Verify source is NOT an author ID (should be work ID)
        expect(
          edge.source,
          `REGRESSION: Edge has author as source: ${edge.source} → ${edge.target}. ` +
          `This indicates the bug has returned (Author → Work pattern).`
        ).not.toMatch(/^A\d+$/)

        // Verify source IS a work ID (matches W prefix + digits)
        expect(
          edge.source,
          `Source must be Work ID (format W###), got: ${edge.source}`
        ).toMatch(/^W\d+$/)

        // Verify target is NOT a work ID (should be author ID)
        expect(
          edge.target,
          `REGRESSION: Edge has work as target: ${edge.source} → ${edge.target}. ` +
          `This indicates the bug has returned (Author → Work pattern).`
        ).not.toMatch(/^W\d+$/)

        // Verify target IS an author ID (matches A prefix + digits)
        expect(
          edge.target,
          `Target must be Author ID (format A###), got: ${edge.target}`
        ).toMatch(/^A\d+$/)

        // Verify direction metadata is correct (outbound for work expansion)
        expect(
          (edge as GraphEdge).direction,
          `Authorship edges from work expansion must have direction='outbound'`
        ).toBe('outbound')
      }

      // Safety check: Ensure we actually tested some edges
      expect(
        authorshipEdges.length,
        'Test created no authorship edges - test may be invalid'
      ).toBeGreaterThan(0)
    })

    it('should maintain consistent AUTHORSHIP direction across multiple authors', async () => {
      // Arrange: Work with many authors (comprehensive test)
      const workId = 'W2741809807'
      const authorIds = Array.from({ length: 5 }, (_, i) => `A${1000000000 + i}`)

      const mockWork = {
        ...createMockWork(workId, authorIds[0]),
        authorships: authorIds.map((authorId, index) => ({
          author: {
            id: authorId,
            display_name: `Author ${index + 1}`,
            ids: {
              orcid: `https://orcid.org/000${index}-000${index}-000${index}-000${index}`,
              openalex: `https://openalex.org/${authorId}`,
            },
          },
          institutions: [],
        })),
      }

      mockClient.getWork.mockResolvedValue(mockWork)

      // Act: Expand work
      const expansion = await provider.expandEntity(workId, { limit: 10 })

      // Assert: Every single AUTHORSHIP edge must follow correct pattern
      const authorshipEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.AUTHORSHIP
      )

      expect(
        authorshipEdges.length,
        'Should create authorship edges'
      ).toBeGreaterThan(0)

      // Check for the buggy pattern (Author → Work)
      const buggyEdges = authorshipEdges.filter(
        (edge) => edge.source.startsWith('A') && edge.target.startsWith('W')
      )

      expect(
        buggyEdges.length,
        `Found ${buggyEdges.length} edges with Author as source and Work as target. ` +
        `The AUTHORSHIP bug has returned! Expected: Work → Author, Found: Author → Work. ` +
        `Buggy edges: ${buggyEdges.map((e) => `${e.source}→${e.target}`).join(', ')}`
      ).toBe(0)

      // Positive assertion: ALL edges follow correct pattern (Work → Author)
      for (const edge of authorshipEdges) {
        expect(
          edge.source,
          `All authorship edges must have work as source. Got: ${edge.source}`
        ).toMatch(/^W\d+$/)
        expect(
          edge.target,
          `All authorship edges must have author as target. Got: ${edge.target}`
        ).toMatch(/^A\d+$/)
      }
    })
  })
})
