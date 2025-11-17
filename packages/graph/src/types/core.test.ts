/**
 * Unit tests for core graph types
 */

import { describe, it, expect } from 'vitest';
import type { GraphEdge, EdgeDirection } from './core';
import { RelationType } from './core';

describe('RelationType enum', () => {
  it('should use noun form matching OpenAlex field names', () => {
    // Verify noun form values
    expect(RelationType.AUTHORSHIP).toBe('AUTHORSHIP');
    expect(RelationType.REFERENCE).toBe('REFERENCE');
    expect(RelationType.PUBLICATION).toBe('PUBLICATION');
    expect(RelationType.TOPIC).toBe('TOPIC');
    expect(RelationType.AFFILIATION).toBe('AFFILIATION');
    expect(RelationType.HOST_ORGANIZATION).toBe('HOST_ORGANIZATION');
    expect(RelationType.LINEAGE).toBe('LINEAGE');
  });

  it('should have all required relationship types', () => {
    const relationTypes = Object.values(RelationType);

    // Core relationships
    expect(relationTypes).toContain('AUTHORSHIP');
    expect(relationTypes).toContain('REFERENCE');
    expect(relationTypes).toContain('PUBLICATION');
    expect(relationTypes).toContain('AFFILIATION');
    expect(relationTypes).toContain('TOPIC');

    // Publishing relationships
    expect(relationTypes).toContain('HOST_ORGANIZATION');

    // Institutional relationships
    expect(relationTypes).toContain('LINEAGE');
  });

  it('should not have old verb-form enum values', () => {
    const relationTypes = Object.values(RelationType);

    // These old values should NOT exist
    expect(relationTypes).not.toContain('authored');
    expect(relationTypes).not.toContain('affiliated');
    expect(relationTypes).not.toContain('published_in');
    expect(relationTypes).not.toContain('references');
    expect(relationTypes).not.toContain('source_published_by');
    expect(relationTypes).not.toContain('institution_child_of');
  });
});

describe('GraphEdge interface', () => {
  it('should have direction field with correct type', () => {
    // Create sample edges with direction field
    const outboundEdge: GraphEdge = {
      id: 'W1-A1',
      source: 'W1',
      target: 'A1',
      type: RelationType.AUTHORSHIP,
      direction: 'outbound',
    };

    const inboundEdge: GraphEdge = {
      id: 'W2-W1',
      source: 'W2',
      target: 'W1',
      type: RelationType.REFERENCE,
      direction: 'inbound',
    };

    // Verify direction field exists and has correct values
    expect(outboundEdge.direction).toBe('outbound');
    expect(inboundEdge.direction).toBe('inbound');
  });

  it('should support metadata field for relationship data', () => {
    // Create edge with metadata
    const edgeWithMetadata: GraphEdge = {
      id: 'W1-A1',
      source: 'W1',
      target: 'A1',
      type: RelationType.AUTHORSHIP,
      direction: 'outbound',
      metadata: {
        author_position: 'first',
        is_corresponding: true,
        raw_affiliation_strings: ['University of Example'],
      },
    };

    // Verify metadata field exists and has correct structure
    expect(edgeWithMetadata.metadata).toBeDefined();
    expect(edgeWithMetadata.metadata?.author_position).toBe('first');
    expect(edgeWithMetadata.metadata?.is_corresponding).toBe(true);
  });

  it('should allow EdgeDirection type to be outbound or inbound', () => {
    // Test that EdgeDirection type accepts valid values
    const validDirections: EdgeDirection[] = ['outbound', 'inbound'];

    validDirections.forEach((direction) => {
      const edge: GraphEdge = {
        id: 'test',
        source: 'S1',
        target: 'T1',
        type: RelationType.RELATED_TO,
        direction,
      };
      expect(edge.direction).toBe(direction);
    });
  });

  it('should support all RelationType values with direction field', () => {
    // Test that all core relationship types work with direction
    const coreTypes = [
      RelationType.AUTHORSHIP,
      RelationType.REFERENCE,
      RelationType.PUBLICATION,
      RelationType.AFFILIATION,
      RelationType.TOPIC,
      RelationType.HOST_ORGANIZATION,
      RelationType.LINEAGE,
    ];

    coreTypes.forEach((type) => {
      const edge: GraphEdge = {
        id: `test-${type}`,
        source: 'S1',
        target: 'T1',
        type,
        direction: 'outbound',
      };
      expect(edge.type).toBe(type);
      expect(edge.direction).toBe('outbound');
    });
  });
});
