/**
 * Test data fixtures for different entity types
 * Provides consistent, realistic test data for graph package testing
 */

import type { GraphNode, GraphEdge, EntityType, ExternalIdentifier } from '../../types/core';
import { RelationType } from '../../types/core';

/**
 * Fixture generation options
 */
export interface FixtureOptions {
  includeExternalIds?: boolean;
  includeMetadata?: boolean;
  includeEntityData?: boolean;
  customPosition?: { x: number; y: number };
  customLabel?: string;
}

/**
 * Base fixture data for different entity types
 */
const FIXTURE_TEMPLATES = {
  works: {
    entityType: 'works' as EntityType,
    externalIdTypes: ['doi'] as const,
    sampleExternalIds: [
      { type: 'doi', value: '10.1038/nature12373', url: 'https://doi.org/10.1038/nature12373' },
      { type: 'doi', value: '10.1126/science.1234567', url: 'https://doi.org/10.1126/science.1234567' },
    ],
    sampleEntityData: {
      title: 'Machine Learning in Academic Research',
      publication_year: 2023,
      open_access: { is_oa: true },
      authorships: [],
      concepts: [],
    },
  },
  authors: {
    entityType: 'authors' as EntityType,
    externalIdTypes: ['orcid'] as const,
    sampleExternalIds: [
      { type: 'orcid', value: '0000-0000-0000-0000', url: 'https://orcid.org/0000-0000-0000-0000' },
      { type: 'orcid', value: '0000-0001-2345-6789', url: 'https://orcid.org/0000-0001-2345-6789' },
    ],
    sampleEntityData: {
      display_name: 'Dr. Jane Smith',
      works_count: 42,
      cited_by_count: 1337,
      affiliations: [],
    },
  },
  institutions: {
    entityType: 'institutions' as EntityType,
    externalIdTypes: ['ror'] as const,
    sampleExternalIds: [
      { type: 'ror', value: '02ex6cf31', url: 'https://ror.org/02ex6cf31' },
      { type: 'ror', value: '03v76x132', url: 'https://ror.org/03v76x132' },
    ],
    sampleEntityData: {
      display_name: 'University of Example',
      country_code: 'US',
      type: 'education',
      works_count: 12543,
    },
  },
  sources: {
    entityType: 'sources' as EntityType,
    externalIdTypes: ['issn_l'] as const,
    sampleExternalIds: [
      { type: 'issn_l', value: '0028-0836', url: 'https://portal.issn.org/resource/ISSN/0028-0836' },
      { type: 'issn_l', value: '1095-9203', url: 'https://portal.issn.org/resource/ISSN/1095-9203' },
    ],
    sampleEntityData: {
      display_name: 'Nature',
      host_organization: 'Springer Nature',
      type: 'journal',
      works_count: 234567,
    },
  },
  topics: {
    entityType: 'topics' as EntityType,
    externalIdTypes: ['wikidata'] as const,
    sampleExternalIds: [
      { type: 'wikidata', value: 'Q11660', url: 'https://www.wikidata.org/wiki/Q11660' },
      { type: 'wikidata', value: 'Q21198', url: 'https://www.wikidata.org/wiki/Q21198' },
    ],
    sampleEntityData: {
      display_name: 'Machine Learning',
      field: { display_name: 'Computer Science' },
      domain: { display_name: 'Physical Sciences' },
      works_count: 98765,
    },
  },
  publishers: {
    entityType: 'publishers' as EntityType,
    externalIdTypes: ['wikidata'] as const,
    sampleExternalIds: [
      { type: 'wikidata', value: 'Q180' , url: 'https://www.wikidata.org/wiki/Q180' },
      { type: 'wikidata', value: 'Q7251' , url: 'https://www.wikidata.org/wiki/Q7251' },
    ],
    sampleEntityData: {
      display_name: 'Springer Nature',
      alternate_titles: ['Nature Publishing Group'],
      works_count: 45632,
    },
  },
  funders: {
    entityType: 'funders' as EntityType,
    externalIdTypes: ['ror'] as const,
    sampleExternalIds: [
      { type: 'ror', value: '021nxhr62', url: 'https://ror.org/021nxhr62' },
      { type: 'ror', value: '00k4n6c32', url: 'https://ror.org/00k4n6c32' },
    ],
    sampleEntityData: {
      display_name: 'National Science Foundation',
      country_code: 'US',
      grants_count: 123456,
    },
  },
} as const;

/**
 * Counter for generating unique IDs - starts at high number to match OpenAlex format
 */
let fixtureCounter = 1000000000; // Start at 1 billion for proper 10-digit IDs

/**
 * Generate a unique OpenAlex-style ID for an entity type
 * Always generates 10+ digit IDs matching real OpenAlex format
 */
export function generateEntityId(entityType: EntityType): string {
  const prefixes: Record<EntityType, string> = {
    works: 'W',
    authors: 'A',
    institutions: 'I',
    sources: 'S',
    topics: 'T',
    publishers: 'P',
    funders: 'F',
    concepts: 'C',
    keywords: 'K',
  };

  const prefix = prefixes[entityType] || 'X';
  return `${prefix}${fixtureCounter++}`;
}

/**
 * Create a test GraphNode fixture
 */
export function createNodeFixture(
  entityType: EntityType,
  id?: string,
  options: FixtureOptions = {}
): GraphNode {
  const template = FIXTURE_TEMPLATES[entityType as keyof typeof FIXTURE_TEMPLATES];
  if (!template) {
    throw new Error(`No template found for entity type: ${entityType}`);
  }

  const nodeId = id || generateEntityId(entityType);
  const position = options.customPosition || {
    x: Math.random() * 1000,
    y: Math.random() * 1000
  };

  const baseLabel = options.customLabel ||
    (template.sampleEntityData as { display_name?: string })?.display_name ||
    `${entityType.charAt(0).toUpperCase()}${entityType.slice(1)} ${nodeId}`;

  const externalIds: ExternalIdentifier[] = [];
  if (options.includeExternalIds !== false) {
    const sampleId = template.sampleExternalIds[fixtureCounter % template.sampleExternalIds.length];
    externalIds.push({
      ...sampleId,
      value: `${sampleId.value}-${fixtureCounter}`,
    });
  }

  const node: GraphNode = {
    id: nodeId,
    entityType,
    label: baseLabel,
    entityId: nodeId,
    x: position.x,
    y: position.y,
    externalIds,
  };

  if (options.includeEntityData !== false) {
    node.entityData = { ...template.sampleEntityData };
  }

  if (options.includeMetadata) {
    node.metadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: 'test-fixture',
      version: 1,
    };
  }

  return node;
}

/**
 * Create a test GraphEdge fixture
 */
export function createEdgeFixture(
  source: string,
  target: string,
  type: RelationType,
  options: { weight?: number; label?: string; metadata?: Record<string, unknown> } = {}
): GraphEdge {
  return {
    id: `${source}-${target}-${type}`,
    source,
    target,
    type,
    weight: options.weight || 1.0,
    label: options.label,
    metadata: options.metadata || {
      createdAt: Date.now(),
      source: 'test-fixture',
    },
  };
}

/**
 * Create a collection of related nodes and edges for testing
 */
export function createGraphFixture(config: {
  nodeCount?: number;
  entityTypes?: EntityType[];
  edgeDensity?: number; // 0-1, how connected the graph should be
  includeExternalIds?: boolean;
  includeMetadata?: boolean;
}): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const {
    nodeCount = 10,
    entityTypes = ['works', 'authors', 'institutions'],
    edgeDensity = 0.3,
    includeExternalIds = true,
    includeMetadata = false,
  } = config;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const entityType = entityTypes[i % entityTypes.length];
    const node = createNodeFixture(entityType, undefined, {
      includeExternalIds,
      includeMetadata,
    });
    nodes.push(node);
  }

  // Create edges based on density
  const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
  const targetEdgeCount = Math.floor(maxPossibleEdges * edgeDensity);

  const usedPairs = new Set<string>();

  for (let i = 0; i < targetEdgeCount; i++) {
    let source: GraphNode;
    let target: GraphNode;
    let pairKey: string = '';

    // Find unused node pair
    do {
      source = nodes[Math.floor(Math.random() * nodes.length)];
      target = nodes[Math.floor(Math.random() * nodes.length)];

      if (source.id === target.id) continue;

      pairKey = [source.id, target.id].sort().join('-');
    } while (usedPairs.has(pairKey) && usedPairs.size < maxPossibleEdges);

    if (usedPairs.has(pairKey)) break; // No more unique pairs available

    usedPairs.add(pairKey);

    // Determine relationship type based on entity types
    const relationType = getRelationshipType(source.entityType, target.entityType);

    const edge = createEdgeFixture(source.id, target.id, relationType, {
      weight: Math.random() * 2 + 0.5, // 0.5 to 2.5
      metadata: includeMetadata ? {
        createdAt: Date.now(),
        confidence: Math.random(),
      } : undefined,
    });

    edges.push(edge);
  }

  return { nodes, edges };
}

/**
 * Get appropriate relationship type for entity type pair
 */
function getRelationshipType(sourceType: EntityType, targetType: EntityType): RelationType {
  const relationshipMap: Record<string, RelationType> = {
    'authors-works': RelationType.AUTHORED,
    'works-authors': RelationType.AUTHORED,
    'authors-institutions': RelationType.AFFILIATED,
    'institutions-authors': RelationType.AFFILIATED,
    'works-sources': RelationType.PUBLISHED_IN,
    'sources-works': RelationType.PUBLISHED_IN,
    'works-funders': RelationType.FUNDED_BY,
    'funders-works': RelationType.FUNDED_BY,
    'sources-publishers': RelationType.SOURCE_PUBLISHED_BY,
    'publishers-sources': RelationType.SOURCE_PUBLISHED_BY,
    'works-topics': RelationType.WORK_HAS_TOPIC,
    'topics-works': RelationType.WORK_HAS_TOPIC,
    'authors-topics': RelationType.AUTHOR_RESEARCHES,
    'topics-authors': RelationType.AUTHOR_RESEARCHES,
    'works-works': RelationType.REFERENCES,
  };

  const key1 = `${sourceType}-${targetType}`;
  const key2 = `${targetType}-${sourceType}`;

  return relationshipMap[key1] || relationshipMap[key2] || RelationType.RELATED_TO;
}

/**
 * Predefined test scenarios
 */
export const testScenarios = {
  /**
   * Small academic paper network
   */
  academicPaper: () => createGraphFixture({
    nodeCount: 15,
    entityTypes: ['works', 'authors', 'institutions', 'topics'],
    edgeDensity: 0.4,
    includeExternalIds: true,
    includeMetadata: true,
  }),

  /**
   * Author collaboration network
   */
  collaboration: () => createGraphFixture({
    nodeCount: 8,
    entityTypes: ['authors', 'institutions'],
    edgeDensity: 0.6,
    includeExternalIds: true,
  }),

  /**
   * Publishing ecosystem
   */
  publishing: () => createGraphFixture({
    nodeCount: 12,
    entityTypes: ['works', 'sources', 'publishers'],
    edgeDensity: 0.3,
    includeExternalIds: true,
  }),

  /**
   * Large sparse network for performance testing
   */
  largeSparse: () => createGraphFixture({
    nodeCount: 100,
    entityTypes: ['works', 'authors', 'institutions', 'topics', 'sources'],
    edgeDensity: 0.05,
  }),

  /**
   * Dense small network for algorithm testing
   */
  dense: () => createGraphFixture({
    nodeCount: 6,
    entityTypes: ['works', 'authors'],
    edgeDensity: 0.8,
    includeMetadata: true,
  }),

  /**
   * Single node for basic testing
   */
  single: () => ({
    nodes: [createNodeFixture('works', 'W2741809807', { includeExternalIds: true })],
    edges: [],
  }),

  /**
   * Empty graph for edge cases
   */
  empty: () => ({
    nodes: [],
    edges: [],
  }),
};

/**
 * Create fixtures by entity type
 */
export const entityFixtures = {
  work: (id?: string, options?: FixtureOptions) => createNodeFixture('works', id, options),
  author: (id?: string, options?: FixtureOptions) => createNodeFixture('authors', id, options),
  institution: (id?: string, options?: FixtureOptions) => createNodeFixture('institutions', id, options),
  source: (id?: string, options?: FixtureOptions) => createNodeFixture('sources', id, options),
  topic: (id?: string, options?: FixtureOptions) => createNodeFixture('topics', id, options),
  publisher: (id?: string, options?: FixtureOptions) => createNodeFixture('publishers', id, options),
  funder: (id?: string, options?: FixtureOptions) => createNodeFixture('funders', id, options),
};

/**
 * Reset fixture counter (useful for deterministic tests)
 */
export function resetFixtureCounter(): void {
  fixtureCounter = 1;
}

/**
 * Create a fixture with specific OpenAlex-style data
 */
export function createOpenAlexFixture(entityType: EntityType, openAlexId: string): GraphNode {
  const node = createNodeFixture(entityType, openAlexId, {
    includeExternalIds: true,
    includeEntityData: true,
  });

  // Add realistic OpenAlex entity data structure
  if (entityType === 'works') {
    node.entityData = {
      id: `https://openalex.org/${openAlexId}`,
      doi: `https://doi.org/10.1038/nature.${openAlexId.slice(1)}`,
      display_name: `Research Paper ${openAlexId}`,
      publication_year: 2020 + (parseInt(openAlexId.slice(1)) % 4),
      type: 'article',
      open_access: { is_oa: true, oa_url: `https://example.com/${openAlexId}` },
      authorships: [],
      concepts: [],
      referenced_works: [],
      cited_by_count: Math.floor(Math.random() * 100),
    };
  }

  return node;
}