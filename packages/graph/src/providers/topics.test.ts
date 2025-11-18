/// <reference types="vitest" />
/**
 * Unit tests for topic taxonomy relationship handling in OpenAlexGraphProvider
 * Tests Topic → Field → Domain hierarchy edge creation
 *
 * Spec: 015-openalex-relationships
 * User Story 4: Explore Topic Taxonomy Hierarchies (P2)
 * Functional Requirements: FR-013, FR-014, FR-015, FR-016
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenAlexGraphProvider } from './openalex-provider'
import type { ProviderExpansionOptions } from './base-provider'
import { RelationType } from '../types/core'

// Mock OpenAlex client interface
interface MockOpenAlexClient {
  get: ReturnType<typeof vi.fn>
  getTopic: ReturnType<typeof vi.fn>
  getField: ReturnType<typeof vi.fn>
  getDomain: ReturnType<typeof vi.fn>
  topics: ReturnType<typeof vi.fn>
  works: ReturnType<typeof vi.fn>
}

// Mock data generators
const createMockTopic = (
  id = 'T12345',
  fieldId = 'fields/17',
  domainId = 'domains/3',
  subfieldId?: string
) => ({
  id,
  display_name: 'Test Topic Name',
  description: 'A test topic for unit testing',
  ids: {
    openalex: `https://openalex.org/${id}`,
    wikidata: 'https://wikidata.org/wiki/Q123456',
  },
  subfield: subfieldId
    ? {
        id: subfieldId,
        display_name: 'Test Subfield',
      }
    : undefined,
  field: {
    id: fieldId,
    display_name: 'Test Field',
  },
  domain: {
    id: domainId,
    display_name: 'Test Domain',
  },
  keywords: ['keyword1', 'keyword2'],
  works_count: 100,
  cited_by_count: 500,
})

describe('OpenAlexGraphProvider - Topic Taxonomy Hierarchies (US4)', () => {
  let provider: OpenAlexGraphProvider
  let mockClient: MockOpenAlexClient

  beforeEach(() => {
    // Create mock client
    mockClient = {
      get: vi.fn(),
      getTopic: vi.fn(),
      getField: vi.fn(),
      getDomain: vi.fn(),
      topics: vi.fn(),
      works: vi.fn(),
    }

    // Create provider with mock client
    provider = new OpenAlexGraphProvider(mockClient as any)
  })

  describe('Complete Taxonomy Hierarchy (FR-015, T041)', () => {
    /**
     * T041: Integration test for complete topic taxonomy hierarchy
     *
     * This test verifies that expanding a topic node creates a COMPLETE
     * taxonomy chain from Topic → Field → Domain, forming the full
     * hierarchical path through the OpenAlex topic taxonomy.
     *
     * Test Scenario:
     * 1. Create mock topic T12345 with complete hierarchy:
     *    - Topic: T12345
     *    - Field: fields/17
     *    - Domain: domains/3
     * 2. Call expandTopicWithCache() on T12345
     * 3. Verify complete path created:
     *    - Edge 1: T12345 → fields/17 (TOPIC_PART_OF_FIELD)
     *    - Edge 2: fields/17 → domains/3 (FIELD_PART_OF_DOMAIN)
     * 4. Verify both edges have direction='outbound'
     * 5. Verify stub nodes created for field and domain
     *
     * Related: spec.md lines 68-69 about topic taxonomy paths
     * Pattern: Single expansion creates multiple edges forming hierarchy chain
     */
    it('should create complete topic taxonomy hierarchy (Topic → Field → Domain)', async () => {
      // Arrange: Create topic with complete hierarchy
      const topicId = 'T12345' // Topic IDs require 4+ digits
      const fieldId = 'fields/17'
      const domainId = 'domains/3'
      const mockTopic = createMockTopic(topicId, fieldId, domainId)

      // Mock client.get() to return topic data
      mockClient.get.mockResolvedValue(mockTopic)
      mockClient.getTopic.mockResolvedValue(mockTopic)
      mockClient.works.mockResolvedValue({
        results: [],
        meta: { count: 0, per_page: 10, page: 1 },
      })

      // Act: Expand topic (should create complete taxonomy hierarchy)
      const expansion = await provider.expandEntity(topicId, { limit: 10 })

      // Assert: Extract taxonomy edges
      const topicToFieldEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.TOPIC_PART_OF_FIELD
      )
      const fieldToDomainEdges = expansion.edges.filter(
        (edge) => edge.type === RelationType.FIELD_PART_OF_DOMAIN
      )

      // Verify 2 total hierarchy edges created (Topic→Field + Field→Domain)
      const totalHierarchyEdges = topicToFieldEdges.length + fieldToDomainEdges.length
      expect(
        totalHierarchyEdges,
        'Should create exactly 2 hierarchy edges for complete taxonomy path (T→F + F→D)'
      ).toBe(2)

      // Verify Edge 1: T123 → fields/17 (TOPIC_PART_OF_FIELD)
      expect(
        topicToFieldEdges.length,
        'Should create exactly 1 TOPIC_PART_OF_FIELD edge'
      ).toBe(1)
      const topicToFieldEdge = topicToFieldEdges[0]

      expect(
        topicToFieldEdge.source,
        `TOPIC_PART_OF_FIELD edge source should be topic ID. Got: ${topicToFieldEdge.source}`
      ).toBe(topicId)

      expect(
        topicToFieldEdge.target,
        `TOPIC_PART_OF_FIELD edge target should be field ID. Got: ${topicToFieldEdge.target}`
      ).toBe(fieldId)

      expect(
        topicToFieldEdge.direction,
        'TOPIC_PART_OF_FIELD edge should have direction=outbound (topic owns field relationship)'
      ).toBe('outbound')

      // Verify Edge 2: fields/17 → domains/3 (FIELD_PART_OF_DOMAIN)
      expect(
        fieldToDomainEdges.length,
        'Should create exactly 1 FIELD_PART_OF_DOMAIN edge'
      ).toBe(1)
      const fieldToDomainEdge = fieldToDomainEdges[0]

      expect(
        fieldToDomainEdge.source,
        `FIELD_PART_OF_DOMAIN edge source should be field ID. Got: ${fieldToDomainEdge.source}`
      ).toBe(fieldId)

      expect(
        fieldToDomainEdge.target,
        `FIELD_PART_OF_DOMAIN edge target should be domain ID. Got: ${fieldToDomainEdge.target}`
      ).toBe(domainId)

      expect(
        fieldToDomainEdge.direction,
        'FIELD_PART_OF_DOMAIN edge should have direction=outbound (field owns domain relationship)'
      ).toBe('outbound')

      // Verify NO reversed edges exist
      const reversedTopicToFieldEdges = expansion.edges.filter(
        (edge) =>
          edge.type === RelationType.TOPIC_PART_OF_FIELD &&
          edge.source === fieldId &&
          edge.target === topicId
      )
      expect(
        reversedTopicToFieldEdges.length,
        'Should NOT create reversed edges (Field → Topic is invalid)'
      ).toBe(0)

      const reversedFieldToDomainEdges = expansion.edges.filter(
        (edge) =>
          edge.type === RelationType.FIELD_PART_OF_DOMAIN &&
          edge.source === domainId &&
          edge.target === fieldId
      )
      expect(
        reversedFieldToDomainEdges.length,
        'Should NOT create reversed edges (Domain → Field is invalid)'
      ).toBe(0)

      // Verify stub nodes created for field and domain
      const fieldNode = expansion.nodes.find((node) => node.id === fieldId)
      expect(
        fieldNode,
        `Field stub node should be created with id=${fieldId}`
      ).toBeDefined()
      expect(
        fieldNode?.entityType,
        'Field node should have entityType=topics (using topics taxonomy)'
      ).toBe('topics')

      const domainNode = expansion.nodes.find((node) => node.id === domainId)
      expect(
        domainNode,
        `Domain stub node should be created with id=${domainId}`
      ).toBeDefined()
      expect(
        domainNode?.entityType,
        'Domain node should have entityType=topics (using topics taxonomy)'
      ).toBe('topics')
    })
  })
})
