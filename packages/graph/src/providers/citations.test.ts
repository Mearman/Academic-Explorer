/// <reference types="vitest" />
/**
 * Unit tests for citation relationship handling in OpenAlexGraphProvider
 * Tests Work → Work edge direction for references (cited works)
 *
 * Spec: 015-openalex-relationships
 * User Story 2: View Citation Relationships Correctly (P1)
 * Functional Requirements: FR-005, FR-006
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
const createMockWork = (id = 'W2741809807', referencedWorks: string[] = []) => ({
  id,
  title: 'Test Work for Citations',
  display_name: 'Test Work Display Name',
  publication_year: 2023,
  ids: {
    doi: '10.1000/test123',
    openalex: `https://openalex.org/${id}`,
  },
  authorships: [
    {
      author: {
        id: 'A5017898742',
        display_name: 'Test Author Name',
        ids: {
          orcid: 'https://orcid.org/0000-0000-0000-0000',
          openalex: 'https://openalex.org/A5017898742',
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
  referenced_works: referencedWorks,
})

describe('OpenAlexGraphProvider - Citation Relationships (US2)', () => {
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

  describe('Work references (FR-005, FR-006)', () => {
    /**
     * Test Case T018: Verify citing Work → cited Work edges are created correctly from referenced_works[] array
     *
     * This test verifies that REFERENCE edges follow the correct direction:
     * - Citing work (source) → Cited work (target)
     * - Direction: 'outbound' (stored on citing work)
     * - Type: RelationType.REFERENCE
     */
    it('should create REFERENCE edges from citing work to cited works with correct direction (Work → Work)', async () => {
      // Arrange: Create citing work with multiple references
      const citingWorkId = 'W1234567890'
      const citedWorkIds = ['W4567890123', 'W7890123456']
      const mockCitingWork = createMockWork(citingWorkId, citedWorkIds)

      // Mock the getWork call to return citing work data
      mockClient.getWork.mockResolvedValue(mockCitingWork)

      // Mock the works endpoint to return cited works (for full expansion)
      // This simulates fetching metadata for the cited works
      mockClient.works.mockResolvedValue({
        results: citedWorkIds.map((id) => createMockWork(id, [])),
        meta: { count: citedWorkIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand the citing work node
      const expansion = await provider.expandEntity(citingWorkId, { limit: 10 })

      // Assert: Extract edges related to citations (REFERENCE type)
      const referenceEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.REFERENCE
      )

      // Verify correct number of REFERENCE edges created
      expect(
        referenceEdges.length,
        `Expected 2 REFERENCE edges for 2 cited works, got ${referenceEdges.length}`
      ).toBe(2)

      // Verify Edge 1: W123 → W456
      const edge1 = referenceEdges.find(
        (edge) => edge.source === citingWorkId && edge.target === citedWorkIds[0]
      )
      expect(
        edge1,
        `Expected REFERENCE edge from ${citingWorkId} to ${citedWorkIds[0]}`
      ).toBeDefined()

      if (edge1) {
        expect(edge1.source).toBe(citingWorkId)
        expect(edge1.target).toBe(citedWorkIds[0])
        expect(edge1.type).toBe(RelationType.REFERENCE)
        expect((edge1 as GraphEdge).direction).toBe('outbound')

        // Verify canonical edge ID format
        const expectedEdgeId = createCanonicalEdgeId(
          citingWorkId,
          citedWorkIds[0],
          RelationType.REFERENCE
        )
        expect(
          edge1.id,
          `REFERENCE edge ID should follow canonical format. Got: ${edge1.id}, Expected: ${expectedEdgeId}`
        ).toBe(expectedEdgeId)
      }

      // Verify Edge 2: W123 → W789
      const edge2 = referenceEdges.find(
        (edge) => edge.source === citingWorkId && edge.target === citedWorkIds[1]
      )
      expect(
        edge2,
        `Expected REFERENCE edge from ${citingWorkId} to ${citedWorkIds[1]}`
      ).toBeDefined()

      if (edge2) {
        expect(edge2.source).toBe(citingWorkId)
        expect(edge2.target).toBe(citedWorkIds[1])
        expect(edge2.type).toBe(RelationType.REFERENCE)
        expect((edge2 as GraphEdge).direction).toBe('outbound')

        // Verify canonical edge ID format
        const expectedEdgeId = createCanonicalEdgeId(
          citingWorkId,
          citedWorkIds[1],
          RelationType.REFERENCE
        )
        expect(
          edge2.id,
          `REFERENCE edge ID should follow canonical format. Got: ${edge2.id}, Expected: ${expectedEdgeId}`
        ).toBe(expectedEdgeId)
      }
    })

    it('should not create reversed (invalid) citation edges', async () => {
      // Arrange: Create citing work
      const citingWorkId = 'W1234567890'
      const citedWorkIds = ['W4567890123', 'W7890123456']
      const mockCitingWork = createMockWork(citingWorkId, citedWorkIds)

      mockClient.getWork.mockResolvedValue(mockCitingWork)
      mockClient.works.mockResolvedValue({
        results: citedWorkIds.map((id) => createMockWork(id, [])),
        meta: { count: citedWorkIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand citing work
      const expansion = await provider.expandEntity(citingWorkId, { limit: 10 })

      // Assert: Verify NO edges have the invalid reversed direction (cited → citing)
      const allEdges = expansion.edges
      const invalidEdges = allEdges.filter(
        (edge) =>
          edge.type === RelationType.REFERENCE &&
          citedWorkIds.includes(edge.source) && // INVALID: source is cited work
          edge.target === citingWorkId // INVALID: target is citing work
      )

      expect(
        invalidEdges.length,
        `REFERENCE edges should NEVER have source=citedWork and target=citingWork (reversed direction). ` +
        `Found ${invalidEdges.length} invalid edges: ${invalidEdges.map((e) => `${e.source}→${e.target}`).join(', ')}`
      ).toBe(0)
    })

    it('should handle work with no references gracefully', async () => {
      // Arrange: Create work with no references
      const workId = 'W1234567890'
      const mockWork = createMockWork(workId, []) // Empty referenced_works array

      mockClient.getWork.mockResolvedValue(mockWork)

      // Act: Expand work with no references
      const expansion = await provider.expandEntity(workId, { limit: 10 })

      // Assert: No REFERENCE edges should be created
      const referenceEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.REFERENCE
      )

      expect(
        referenceEdges.length,
        'Work with no references should create zero REFERENCE edges'
      ).toBe(0)
    })

    it('should handle work with many references (stress test)', async () => {
      // Arrange: Work with 50 references (typical large paper)
      const citingWorkId = 'W1234567890'
      const citedWorkIds = Array.from({ length: 50 }, (_, i) => `W${1000000000 + i}`)
      const mockCitingWork = createMockWork(citingWorkId, citedWorkIds)

      mockClient.getWork.mockResolvedValue(mockCitingWork)
      mockClient.works.mockResolvedValue({
        results: citedWorkIds.map((id) => createMockWork(id, [])),
        meta: { count: citedWorkIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand citing work
      const expansion = await provider.expandEntity(citingWorkId, { limit: 100 })

      // Assert: All REFERENCE edges should maintain correct direction
      const referenceEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.REFERENCE
      )

      expect(
        referenceEdges.length,
        `Expected 50 REFERENCE edges, got ${referenceEdges.length}`
      ).toBeGreaterThanOrEqual(50)

      // Verify ALL edges follow correct pattern (citing → cited)
      for (const edge of referenceEdges) {
        expect(
          edge.source,
          `All REFERENCE edges must have citing work as source. Got: ${edge.source}`
        ).toBe(citingWorkId)

        expect(
          citedWorkIds,
          `Edge target should be one of the cited work IDs. Got: ${edge.target}`
        ).toContain(edge.target)

        expect((edge as GraphEdge).direction).toBe('outbound')
      }
    })

    it('should create unique canonical IDs for each citation edge', async () => {
      // Arrange: Citing work with multiple references
      const citingWorkId = 'W1234567890'
      const citedWorkIds = ['W4567890123', 'W7890123456', 'W9990123456']
      const mockCitingWork = createMockWork(citingWorkId, citedWorkIds)

      mockClient.getWork.mockResolvedValue(mockCitingWork)
      mockClient.works.mockResolvedValue({
        results: citedWorkIds.map((id) => createMockWork(id, [])),
        meta: { count: citedWorkIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand citing work
      const expansion = await provider.expandEntity(citingWorkId, { limit: 10 })

      // Assert: Extract REFERENCE edges
      const referenceEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.REFERENCE
      )

      // Verify each edge has a unique ID
      const edgeIds = referenceEdges.map((edge) => edge.id)
      const uniqueEdgeIds = new Set(edgeIds)

      expect(
        uniqueEdgeIds.size,
        `Expected ${referenceEdges.length} unique edge IDs, got ${uniqueEdgeIds.size}. Duplicate IDs detected.`
      ).toBe(referenceEdges.length)

      // Verify each ID follows canonical format
      for (const edge of referenceEdges) {
        const expectedId = `${citingWorkId}-${RelationType.REFERENCE}-${edge.target}`
        expect(
          edge.id,
          `Edge ID should follow pattern: citingWork-REFERENCE-citedWork. Got: ${edge.id}`
        ).toBe(expectedId)
      }
    })
  })

  describe('Reverse citation lookup (FR-007)', () => {
    /**
     * T021: Test reverse citation lookup (discovering works that cite a given work)
     *
     * This test verifies FR-007: Reverse lookup for citations.
     * When expanding a work, we can optionally query for works that CITE this work
     * (not just works this work cites).
     *
     * Critical Pattern:
     * - Semantic edge direction: ALWAYS citing work → cited work (source → target)
     * - Discovery direction metadata: 'inbound' means "we found this edge by querying backwards"
     * - Same pattern as authorship: Work → Author is semantic, but can be discovered via
     *   reverse lookup with direction='inbound'
     *
     * Test Scenario:
     * 1. We have work W456 (the cited work)
     * 2. OpenAlex API query for "works that cite W456" returns [W123, W789]
     * 3. Call expandEntity() on W456 with reverse lookup enabled
     * 4. Verify:
     *    - 2 REFERENCE edges created
     *    - Edge 1: source=W123 (citing), target=W456 (cited), direction='inbound'
     *    - Edge 2: source=W789 (citing), target=W456 (cited), direction='inbound'
     *    - Note: Even though discovered via reverse lookup, semantic direction
     *      is still citing→cited (W123→W456, W789→W456)
     *    - direction='inbound' marks HOW we discovered it (reverse lookup)
     */
    it('should discover citing works through reverse lookup with direction="inbound"', async () => {
      // Arrange: Setup mock cited work (the work being cited)
      const citedWorkId = 'W4567890123'
      const citingWorkIds = ['W1234567890', 'W7890123456']

      // The cited work we're expanding
      const mockCitedWork = createMockWork(citedWorkId, [])

      // Mock the getWork call to return the cited work data
      mockClient.getWork.mockResolvedValue(mockCitedWork)

      // Mock the works endpoint to return works that CITE this work
      // This simulates the reverse lookup: expanding work discovers works citing it
      // Query format: /works?filter=cites:W456
      const citingWorks = citingWorkIds.map((citingId) =>
        createMockWork(citingId, [citedWorkId])
      )

      mockClient.works.mockResolvedValue({
        results: citingWorks,
        meta: { count: citingWorks.length, per_page: 50, page: 1 },
      })

      // Act: Expand the cited work (reverse lookup - discovers works that cite it)
      const expansion = await provider.expandEntity(citedWorkId, { limit: 10 })

      // Assert: Extract REFERENCE edges (citations)
      const referenceEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.REFERENCE
      )

      // Must have exactly 2 citation edges (one for each citing work)
      expect(referenceEdges.length).toBe(2)

      // Check both edges maintain correct semantic direction: citing → cited
      for (const edge of referenceEdges) {
        // FR-007 requirement: reverse lookup maintains canonical direction
        // - source MUST be citing work ID (W123 or W789)
        // - target MUST be cited work ID (W456)
        // - direction MUST be 'inbound' (discovered via reverse lookup)

        expect(
          citingWorkIds,
          `REFERENCE edge source should be one of the citing work IDs. Edge: ${JSON.stringify(edge)}`
        ).toContain(edge.source)

        expect(
          edge.target,
          `REFERENCE edge target should be cited work ID. Edge: ${JSON.stringify(edge)}`
        ).toBe(citedWorkId)

        expect(
          (edge as GraphEdge).direction,
          `Reverse lookup citations must have direction='inbound'. Edge: ${JSON.stringify(edge)}`
        ).toBe('inbound')
      }

      // Verify specific edges exist with correct IDs
      const expectedEdge1Id = createCanonicalEdgeId('W1234567890', 'W4567890123', RelationType.REFERENCE)
      const expectedEdge2Id = createCanonicalEdgeId('W7890123456', 'W4567890123', RelationType.REFERENCE)

      const edgeIds = referenceEdges.map((e) => e.id)
      expect(edgeIds).toContain(expectedEdge1Id)
      expect(edgeIds).toContain(expectedEdge2Id)
    })
  })

  describe('Regression: Citation direction bug (T018)', () => {
    /**
     * CRITICAL REGRESSION TEST (T018)
     * Prevents accidental reversal of citation edges
     *
     * Citation direction MUST be: Citing work → Cited work
     * NEVER: Cited work → Citing work
     *
     * This test FAILS if citation edges are ever created backwards,
     * ensuring the bug cannot be accidentally introduced.
     */
    it('should NEVER create edges with cited work as source and citing work as target (regression test)', async () => {
      // Arrange: Create citing work with references
      const citingWorkId = 'W1234567890'
      const citedWorkIds = ['W4567890123', 'W7890123456', 'W9990123456']
      const mockCitingWork = createMockWork(citingWorkId, citedWorkIds)

      mockClient.getWork.mockResolvedValue(mockCitingWork)
      mockClient.works.mockResolvedValue({
        results: citedWorkIds.map((id) => createMockWork(id, [])),
        meta: { count: citedWorkIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand citing work
      const expansion = await provider.expandEntity(citingWorkId, { limit: 10 })

      // Assert: Filter REFERENCE edges and verify NO edges have cited work as source
      const referenceEdges = expansion.edges.filter(
        (e) => e.type === RelationType.REFERENCE
      )

      // This is the critical regression check - MUST NOT FAIL
      for (const edge of referenceEdges) {
        // Verify source is NOT a cited work ID (should be citing work ID)
        expect(
          citedWorkIds,
          `REGRESSION: Edge has cited work as source: ${edge.source} → ${edge.target}. ` +
          `This indicates citation direction bug (cited → citing). ` +
          `Expected direction: citing → cited (${citingWorkId} → cited work)`
        ).not.toContain(edge.source)

        // Verify source IS the citing work ID
        expect(
          edge.source,
          `Source must be citing work ID (${citingWorkId}), got: ${edge.source}`
        ).toBe(citingWorkId)

        // Verify target is NOT the citing work ID (should be cited work ID)
        expect(
          edge.target,
          `REGRESSION: Edge has citing work as target: ${edge.source} → ${edge.target}. ` +
          `This indicates citation direction bug (cited → citing).`
        ).not.toBe(citingWorkId)

        // Verify target IS one of the cited work IDs
        expect(
          citedWorkIds,
          `Target must be one of the cited work IDs, got: ${edge.target}`
        ).toContain(edge.target)

        // Verify direction metadata is correct (outbound for work expansion)
        expect(
          (edge as GraphEdge).direction,
          `Citation edges from work expansion must have direction='outbound'`
        ).toBe('outbound')
      }

      // Safety check: Ensure we actually tested some edges
      expect(
        referenceEdges.length,
        'Test created no reference edges - test may be invalid'
      ).toBeGreaterThan(0)
    })
  })
})
