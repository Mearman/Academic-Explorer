/// <reference types="vitest" />
/**
 * Unit tests for funding relationship handling in OpenAlexGraphProvider
 * Tests Work → Funder edge direction for grants (funded_by relationships)
 *
 * Spec: 015-openalex-relationships
 * User Story 6: View Funding Relationships Correctly (P2)
 * Functional Requirements: FR-009, FR-010
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
  get: ReturnType<typeof vi.fn>
  works: ReturnType<typeof vi.fn>
  authors: ReturnType<typeof vi.fn>
  funders: ReturnType<typeof vi.fn>
}

// Mock data generators
const createMockWork = (id = 'W2741809807', grants: Array<{ funder: string; award_id?: string }> = []) => ({
  id,
  title: 'Test Work for Funding',
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
  grants: grants,
})

const createMockFunder = (id = 'F4567890123', displayName = 'Test Funder') => ({
  id,
  display_name: displayName,
  country_code: 'US',
  ids: {
    openalex: `https://openalex.org/${id}`,
    ror: `https://ror.org/test${id}`,
  },
})

describe('OpenAlexGraphProvider - Funding Relationships (US6)', () => {
  let provider: OpenAlexGraphProvider
  let mockClient: MockOpenAlexClient

  beforeEach(() => {
    // Create mock client
    mockClient = {
      getWork: vi.fn(),
      getAuthor: vi.fn(),
      get: vi.fn(),
      works: vi.fn(),
      authors: vi.fn(),
      funders: vi.fn(),
    }

    // Create provider with mock client
    provider = new OpenAlexGraphProvider(mockClient as any)
  })

  describe('Work funding relationships (FR-009, FR-010)', () => {
    /**
     * Test Case T028: Verify Work → Funder edges are created correctly from grants[] array
     *
     * This test verifies that FUNDED_BY edges follow the correct direction:
     * - Funded work (source) → Funder (target)
     * - Direction: 'outbound' (stored on work)
     * - Type: RelationType.FUNDED_BY
     */
    it('should create FUNDED_BY edges from work to funders with correct direction (Work → Funder)', async () => {
      // Arrange: Create work with multiple funders
      const workId = 'W1234567890'
      const funderIds = ['F4567890123', 'F7890123456']
      const mockWork = createMockWork(workId, [
        { funder: `https://openalex.org/${funderIds[0]}`, award_id: 'GRANT-123' },
        { funder: `https://openalex.org/${funderIds[1]}`, award_id: 'GRANT-456' },
      ])

      // Mock the getWork call to return work data
      mockClient.getWork.mockResolvedValue(mockWork)

      // Mock the funders endpoint to return funder metadata (for full expansion)
      mockClient.funders.mockResolvedValue({
        results: [
          createMockFunder(funderIds[0], 'National Science Foundation'),
          createMockFunder(funderIds[1], 'National Institutes of Health'),
        ],
        meta: { count: funderIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand the work node
      const expansion = await provider.expandEntity(workId, { limit: 10 })

      // Assert: Extract edges related to funding (FUNDED_BY type)
      const fundingEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.FUNDED_BY
      )

      // Verify correct number of FUNDED_BY edges created
      expect(
        fundingEdges.length,
        `Expected 2 FUNDED_BY edges for 2 funders, got ${fundingEdges.length}`
      ).toBe(2)

      // Verify Edge 1: W123 → F456
      const edge1 = fundingEdges.find(
        (edge) => edge.source === workId && edge.target === funderIds[0]
      )
      expect(
        edge1,
        `Expected FUNDED_BY edge from ${workId} to ${funderIds[0]}`
      ).toBeDefined()

      if (edge1) {
        expect(edge1.source).toBe(workId)
        expect(edge1.target).toBe(funderIds[0])
        expect(edge1.type).toBe(RelationType.FUNDED_BY)
        expect((edge1 as GraphEdge).direction).toBe('outbound')

        // Verify canonical edge ID format
        const expectedEdgeId = createCanonicalEdgeId(
          workId,
          funderIds[0],
          RelationType.FUNDED_BY
        )
        expect(
          edge1.id,
          `FUNDED_BY edge ID should follow canonical format. Got: ${edge1.id}, Expected: ${expectedEdgeId}`
        ).toBe(expectedEdgeId)
      }

      // Verify Edge 2: W123 → F789
      const edge2 = fundingEdges.find(
        (edge) => edge.source === workId && edge.target === funderIds[1]
      )
      expect(
        edge2,
        `Expected FUNDED_BY edge from ${workId} to ${funderIds[1]}`
      ).toBeDefined()

      if (edge2) {
        expect(edge2.source).toBe(workId)
        expect(edge2.target).toBe(funderIds[1])
        expect(edge2.type).toBe(RelationType.FUNDED_BY)
        expect((edge2 as GraphEdge).direction).toBe('outbound')

        // Verify canonical edge ID format
        const expectedEdgeId = createCanonicalEdgeId(
          workId,
          funderIds[1],
          RelationType.FUNDED_BY
        )
        expect(
          edge2.id,
          `FUNDED_BY edge ID should follow canonical format. Got: ${edge2.id}, Expected: ${expectedEdgeId}`
        ).toBe(expectedEdgeId)
      }
    })

    it('should not create reversed (invalid) funding edges', async () => {
      // Arrange: Create work with funders
      const workId = 'W1234567890'
      const funderIds = ['F4567890123', 'F7890123456']
      const mockWork = createMockWork(workId, [
        { funder: `https://openalex.org/${funderIds[0]}`, award_id: 'GRANT-123' },
        { funder: `https://openalex.org/${funderIds[1]}`, award_id: 'GRANT-456' },
      ])

      mockClient.getWork.mockResolvedValue(mockWork)
      mockClient.funders.mockResolvedValue({
        results: [
          createMockFunder(funderIds[0]),
          createMockFunder(funderIds[1]),
        ],
        meta: { count: funderIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand work
      const expansion = await provider.expandEntity(workId, { limit: 10 })

      // Assert: Verify NO edges have the invalid reversed direction (funder → work)
      const allEdges = expansion.edges
      const invalidEdges = allEdges.filter(
        (edge) =>
          edge.type === RelationType.FUNDED_BY &&
          funderIds.includes(edge.source) && // INVALID: source is funder
          edge.target === workId // INVALID: target is work
      )

      expect(
        invalidEdges.length,
        `FUNDED_BY edges should NEVER have source=funder and target=work (reversed direction). ` +
        `Found ${invalidEdges.length} invalid edges: ${invalidEdges.map((e) => `${e.source}→${e.target}`).join(', ')}`
      ).toBe(0)
    })

    it('should handle work with no grants gracefully', async () => {
      // Arrange: Create work with no grants
      const workId = 'W1234567890'
      const mockWork = createMockWork(workId, []) // Empty grants array

      mockClient.getWork.mockResolvedValue(mockWork)

      // Act: Expand work with no grants
      const expansion = await provider.expandEntity(workId, { limit: 10 })

      // Assert: No FUNDED_BY edges should be created
      const fundingEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.FUNDED_BY
      )

      expect(
        fundingEdges.length,
        'Work with no grants should create zero FUNDED_BY edges'
      ).toBe(0)
    })

    it('should handle work with many grants (stress test)', async () => {
      // Arrange: Work with 20 funders (typical large research program)
      const workId = 'W1234567890'
      const funderIds = Array.from({ length: 20 }, (_, i) => `F${1000000000 + i}`)
      const mockWork = createMockWork(
        workId,
        funderIds.map((fid) => ({
          funder: `https://openalex.org/${fid}`,
          award_id: `GRANT-${fid}`,
        }))
      )

      mockClient.getWork.mockResolvedValue(mockWork)
      mockClient.funders.mockResolvedValue({
        results: funderIds.map((fid) => createMockFunder(fid, `Funder ${fid}`)),
        meta: { count: funderIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand work
      const expansion = await provider.expandEntity(workId, { limit: 100 })

      // Assert: All FUNDED_BY edges should maintain correct direction
      const fundingEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.FUNDED_BY
      )

      expect(
        fundingEdges.length,
        `Expected 20 FUNDED_BY edges, got ${fundingEdges.length}`
      ).toBeGreaterThanOrEqual(20)

      // Verify ALL edges follow correct pattern (work → funder)
      for (const edge of fundingEdges) {
        expect(
          edge.source,
          `All FUNDED_BY edges must have work as source. Got: ${edge.source}`
        ).toBe(workId)

        expect(
          funderIds,
          `Edge target should be one of the funder IDs. Got: ${edge.target}`
        ).toContain(edge.target)

        expect((edge as GraphEdge).direction).toBe('outbound')
      }
    })

    it('should create unique canonical IDs for each funding edge', async () => {
      // Arrange: Work with multiple funders
      const workId = 'W1234567890'
      const funderIds = ['F4567890123', 'F7890123456', 'F9990123456']
      const mockWork = createMockWork(
        workId,
        funderIds.map((fid) => ({
          funder: `https://openalex.org/${fid}`,
          award_id: `GRANT-${fid}`,
        }))
      )

      mockClient.getWork.mockResolvedValue(mockWork)
      mockClient.funders.mockResolvedValue({
        results: funderIds.map((fid) => createMockFunder(fid)),
        meta: { count: funderIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand work
      const expansion = await provider.expandEntity(workId, { limit: 10 })

      // Assert: Extract FUNDED_BY edges
      const fundingEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.FUNDED_BY
      )

      // Verify each edge has a unique ID
      const edgeIds = fundingEdges.map((edge) => edge.id)
      const uniqueEdgeIds = new Set(edgeIds)

      expect(
        uniqueEdgeIds.size,
        `Expected ${fundingEdges.length} unique edge IDs, got ${uniqueEdgeIds.size}. Duplicate IDs detected.`
      ).toBe(fundingEdges.length)

      // Verify each ID follows canonical format
      for (const edge of fundingEdges) {
        const expectedId = `${workId}-${RelationType.FUNDED_BY}-${edge.target}`
        expect(
          edge.id,
          `Edge ID should follow pattern: work-FUNDED_BY-funder. Got: ${edge.id}`
        ).toBe(expectedId)
      }
    })

    it('should preserve grant metadata in edge metadata', async () => {
      // Arrange: Work with funders including award IDs
      const workId = 'W1234567890'
      const grants = [
        { funder: 'https://openalex.org/F4567890123', award_id: 'NSF-2024-001' },
        { funder: 'https://openalex.org/F7890123456', award_id: 'NIH-R01-54321' },
      ]
      const mockWork = createMockWork(workId, grants)

      mockClient.getWork.mockResolvedValue(mockWork)
      mockClient.funders.mockResolvedValue({
        results: [
          createMockFunder('F4567890123'),
          createMockFunder('F7890123456'),
        ],
        meta: { count: 2, per_page: 50, page: 1 },
      })

      // Act: Expand work
      const expansion = await provider.expandEntity(workId, { limit: 10 })

      // Assert: Extract FUNDED_BY edges
      const fundingEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.FUNDED_BY
      )

      // Verify award IDs are preserved in edge metadata
      for (const edge of fundingEdges) {
        const matchingGrant = grants.find(
          (g) => g.funder === `https://openalex.org/${edge.target}`
        )

        if (matchingGrant?.award_id) {
          expect(
            edge.metadata,
            `Edge should have metadata with award_id. Edge: ${edge.id}`
          ).toBeDefined()

          if (edge.metadata) {
            expect(
              edge.metadata.award_id,
              `Edge metadata should include award_id from grant. Edge: ${edge.id}`
            ).toBe(matchingGrant.award_id)
          }
        }
      }
    })
  })

  describe('Funder reverse lookup (FR-012, FR-026)', () => {
    /**
     * T031: Verify reverse lookup discovers works funded by a given funder
     *
     * This test verifies FR-012 and FR-026:
     * - System MUST support reverse lookup to find all works funded by a given funder
     * - expandFunderWithCache() MUST be implemented to support funder entity expansion
     *
     * Critical requirements:
     * 1. When expanding a funder, query OpenAlex for all works funded by that funder
     * 2. Create FUNDED_BY edges with SEMANTIC direction: work → funder
     * 3. Mark edges with direction='inbound' to indicate HOW they were discovered (reverse lookup)
     * 4. Maintain consistency: semantic direction ≠ discovery direction
     *
     * Edge semantics:
     * - source: ALWAYS the work ID (who receives funding)
     * - target: ALWAYS the funder ID (who provides funding)
     * - direction: 'inbound' (discovered via reverse lookup from funder)
     *
     * This pattern matches authorship (T012) and citations - semantic direction
     * stays constant regardless of how the relationship was discovered.
     */
    it('should discover funded works through funder expansion with direction=\'inbound\' (T031)', async () => {
      // Arrange: Setup mock funder with funded works
      const funderId = 'F4567890123'
      const workIds = ['W1234567890', 'W7890123456']
      const mockFunder = createMockFunder(funderId, 'National Science Foundation')

      // Mock the get call to return funder data (provider uses client.get("funders", id))
      mockClient.get.mockResolvedValue(mockFunder)

      // Mock the works endpoint to return works funded by this funder
      // This simulates the reverse lookup: expanding funder discovers their funded works
      const fundedWorks = workIds.map((wId) =>
        createMockWork(wId, [{ funder: `https://openalex.org/${funderId}`, award_id: `GRANT-${wId}` }])
      )
      mockClient.works.mockResolvedValue({
        results: fundedWorks,
        meta: { count: workIds.length, per_page: 10, page: 1 },
      })

      // Act: Expand the funder node (reverse lookup - discovers works funded by this funder)
      const expansion = await provider.expandEntity(funderId, { limit: 10 })

      // Assert: Extract edges related to funding
      const fundingEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.FUNDED_BY
      )

      // Must have exactly 2 FUNDED_BY edges (one for each work)
      expect(fundingEdges.length).toBe(2)

      // Verify Edge 1: W1234567890 → F4567890123 with direction='inbound'
      const edge1 = fundingEdges.find((edge) => edge.source === workIds[0])
      expect(
        edge1,
        `Expected edge with source=${workIds[0]}, but none found. Edges: ${JSON.stringify(fundingEdges)}`
      ).toBeDefined()

      expect(
        edge1!.source,
        `Edge 1: source MUST be work ID (${workIds[0]}), not funder ID`
      ).toBe(workIds[0])

      expect(
        edge1!.target,
        `Edge 1: target MUST be funder ID (${funderId})`
      ).toBe(funderId)

      expect(
        edge1!.type,
        'Edge 1: type MUST be FUNDED_BY'
      ).toBe(RelationType.FUNDED_BY)

      expect(
        (edge1 as GraphEdge)!.direction,
        'Edge 1: direction MUST be "inbound" (discovered via reverse lookup from funder)'
      ).toBe('inbound')

      // Verify Edge 2: W7890123456 → F4567890123 with direction='inbound'
      const edge2 = fundingEdges.find((edge) => edge.source === workIds[1])
      expect(
        edge2,
        `Expected edge with source=${workIds[1]}, but none found. Edges: ${JSON.stringify(fundingEdges)}`
      ).toBeDefined()

      expect(
        edge2!.source,
        `Edge 2: source MUST be work ID (${workIds[1]}), not funder ID`
      ).toBe(workIds[1])

      expect(
        edge2!.target,
        `Edge 2: target MUST be funder ID (${funderId})`
      ).toBe(funderId)

      expect(
        edge2!.type,
        'Edge 2: type MUST be FUNDED_BY'
      ).toBe(RelationType.FUNDED_BY)

      expect(
        (edge2 as GraphEdge)!.direction,
        'Edge 2: direction MUST be "inbound" (discovered via reverse lookup from funder)'
      ).toBe('inbound')

      // Verify canonical edge IDs follow pattern: {workId}-{FUNDED_BY}-{funderId}
      const expectedEdgeId1 = createCanonicalEdgeId(workIds[0], funderId, RelationType.FUNDED_BY)
      const expectedEdgeId2 = createCanonicalEdgeId(workIds[1], funderId, RelationType.FUNDED_BY)

      expect(
        edge1!.id,
        `Edge 1 ID should follow canonical format: {workId}-{FUNDED_BY}-{funderId}. Got: ${edge1!.id}, Expected: ${expectedEdgeId1}`
      ).toBe(expectedEdgeId1)

      expect(
        edge2!.id,
        `Edge 2 ID should follow canonical format: {workId}-{FUNDED_BY}-{funderId}. Got: ${edge2!.id}, Expected: ${expectedEdgeId2}`
      ).toBe(expectedEdgeId2)
    })

    it('should not create reversed (invalid) funding edges when expanding funder', async () => {
      // Arrange: Setup mock funder
      const funderId = 'F4567890123'
      const workId = 'W1234567890'
      const mockFunder = createMockFunder(funderId, 'Test Funder')

      mockClient.get.mockResolvedValue(mockFunder)
      mockClient.works.mockResolvedValue({
        results: [createMockWork(workId, [{ funder: `https://openalex.org/${funderId}`, award_id: 'GRANT-123' }])],
        meta: { count: 1, per_page: 10, page: 1 },
      })

      // Act: Expand funder
      const expansion = await provider.expandEntity(funderId, { limit: 10 })

      // Assert: Verify NO edges have the invalid reversed direction
      const allEdges = expansion.edges
      const invalidEdges = allEdges.filter(
        (edge) =>
          edge.type === RelationType.FUNDED_BY &&
          edge.source === funderId && // INVALID: source is funder
          edge.target === workId // INVALID: target is work
      )

      expect(
        invalidEdges.length,
        'FUNDED_BY edges should NEVER have source=funderId and target=workId (reversed direction)'
      ).toBe(0)
    })

    it('should handle multiple funded works when expanding funder (reverse lookup with many relationships)', async () => {
      // Arrange: Funder with multiple funded works
      const funderId = 'F4567890123'
      const workIds = ['W1110000001', 'W2220000002', 'W3330000003', 'W4440000004', 'W5550000005']
      const mockFunder = createMockFunder(funderId, 'National Science Foundation')

      mockClient.get.mockResolvedValue(mockFunder)

      // Each work is funded by the same funder
      const works = workIds.map((wId) =>
        createMockWork(wId, [{ funder: `https://openalex.org/${funderId}`, award_id: `GRANT-${wId}` }])
      )
      mockClient.works.mockResolvedValue({
        results: works,
        meta: { count: works.length, per_page: 50, page: 1 },
      })

      // Act: Expand funder (reverse lookup)
      const expansion = await provider.expandEntity(funderId, { limit: 10 })

      // Assert: All edges should maintain Work → Funder direction
      const fundingEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.FUNDED_BY
      )

      expect(fundingEdges.length).toBe(workIds.length)

      for (const edge of fundingEdges) {
        // All edges must point FROM work TO funder
        expect(
          workIds,
          `Edge source should be one of the work IDs. Got: ${edge.source}`
        ).toContain(edge.source)
        expect(edge.target).toBe(funderId)
        expect((edge as GraphEdge).direction).toBe('inbound')
      }
    })

    it('should create funding edges with correct canonical IDs when expanding funder', async () => {
      // Arrange: Setup mock funder with funded works
      const funderId = 'F4567890123'
      const workId = 'W1234567890'
      const mockFunder = createMockFunder(funderId, 'Test Funder')

      mockClient.get.mockResolvedValue(mockFunder)
      mockClient.works.mockResolvedValue({
        results: [createMockWork(workId, [{ funder: `https://openalex.org/${funderId}`, award_id: 'GRANT-123' }])],
        meta: { count: 1, per_page: 10, page: 1 },
      })

      // Act: Expand funder
      const expansion = await provider.expandEntity(funderId, { limit: 10 })

      // Assert: Check edge ID format matches canonical pattern
      const fundingEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.FUNDED_BY
      )

      expect(fundingEdges.length).toBeGreaterThan(0)

      for (const edge of fundingEdges) {
        // Edge ID should follow canonical format: {workId}-{FUNDED_BY}-{funderId}
        // NOT the reversed format: {funderId}-{FUNDED_BY}-{workId}
        const expectedEdgeId = `${workId}-${RelationType.FUNDED_BY}-${funderId}`
        expect(
          edge.id,
          `FUNDED_BY edge ID should follow canonical format. Got: ${edge.id}, Expected: ${expectedEdgeId}`
        ).toBe(expectedEdgeId)
      }
    })
  })

  describe('Regression: Funding direction bug (T028)', () => {
    /**
     * CRITICAL REGRESSION TEST (T028)
     * Prevents accidental reversal of funding edges
     *
     * Funding direction MUST be: Work → Funder
     * NEVER: Funder → Work
     *
     * This test FAILS if funding edges are ever created backwards,
     * ensuring the bug cannot be accidentally introduced.
     */
    it('should NEVER create edges with funder as source and work as target (regression test)', async () => {
      // Arrange: Create work with grants
      const workId = 'W1234567890'
      const funderIds = ['F4567890123', 'F7890123456', 'F9990123456']
      const mockWork = createMockWork(
        workId,
        funderIds.map((fid) => ({
          funder: `https://openalex.org/${fid}`,
          award_id: `GRANT-${fid}`,
        }))
      )

      mockClient.getWork.mockResolvedValue(mockWork)
      mockClient.funders.mockResolvedValue({
        results: funderIds.map((fid) => createMockFunder(fid)),
        meta: { count: funderIds.length, per_page: 50, page: 1 },
      })

      // Act: Expand work
      const expansion = await provider.expandEntity(workId, { limit: 10 })

      // Assert: Filter FUNDED_BY edges and verify NO edges have funder as source
      const fundingEdges = expansion.edges.filter(
        (e) => e.type === RelationType.FUNDED_BY
      )

      // This is the critical regression check - MUST NOT FAIL
      for (const edge of fundingEdges) {
        // Verify source is NOT a funder ID (should be work ID)
        expect(
          funderIds,
          `REGRESSION: Edge has funder as source: ${edge.source} → ${edge.target}. ` +
          `This indicates funding direction bug (funder → work). ` +
          `Expected direction: work → funder (${workId} → funder)`
        ).not.toContain(edge.source)

        // Verify source IS the work ID
        expect(
          edge.source,
          `Source must be work ID (${workId}), got: ${edge.source}`
        ).toBe(workId)

        // Verify target is NOT the work ID (should be funder ID)
        expect(
          edge.target,
          `REGRESSION: Edge has work as target: ${edge.source} → ${edge.target}. ` +
          `This indicates funding direction bug (funder → work).`
        ).not.toBe(workId)

        // Verify target IS one of the funder IDs
        expect(
          funderIds,
          `Target must be one of the funder IDs, got: ${edge.target}`
        ).toContain(edge.target)

        // Verify direction metadata is correct (outbound for work expansion)
        expect(
          (edge as GraphEdge).direction,
          `Funding edges from work expansion must have direction='outbound'`
        ).toBe('outbound')
      }

      // Safety check: Ensure we actually tested some edges
      expect(
        fundingEdges.length,
        'Test created no funding edges - test may be invalid'
      ).toBeGreaterThan(0)
    })
  })
})
