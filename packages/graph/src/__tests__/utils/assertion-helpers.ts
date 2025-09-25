/**
 * Assertion helpers for complex object validation
 * Provides specialized matchers and utilities for graph testing
 */

import { expect } from 'vitest';
import type { GraphNode, GraphEdge, GraphData, EntityType } from '../../types/core';
import { RelationType } from '../../types/core';
import type { GraphExpansion } from '../../providers/base-provider';

/**
 * Deep equality comparison with tolerance for floating point numbers
 */
export function expectDeepEqualWithTolerance<T>(
  actual: T,
  expected: T,
  tolerance = 1e-10
): void {
  if (typeof actual === 'number' && typeof expected === 'number') {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
    return;
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    expect(actual).toHaveLength(expected.length);
    for (let i = 0; i < actual.length; i++) {
      expectDeepEqualWithTolerance(actual[i], expected[i], tolerance);
    }
    return;
  }

  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    expect(actualKeys).toEqual(expectedKeys);

    for (const key of actualKeys) {
      expectDeepEqualWithTolerance(
        (actual as any)[key],
        (expected as any)[key],
        tolerance
      );
    }
    return;
  }

  expect(actual).toEqual(expected);
}

/**
 * Validate GraphNode structure and content
 */
export function expectValidGraphNode(node: unknown): asserts node is GraphNode {
  expect(node).toBeDefined();
  expect(node).toBeTypeOf('object');
  expect(node).not.toBeNull();

  const n = node as GraphNode;

  // Required fields
  expect(n.id).toBeTypeOf('string');
  expect(n.id.length).toBeGreaterThan(0);
  expect(n.entityType).toBeTypeOf('string');
  expect(n.label).toBeTypeOf('string');
  expect(n.label.length).toBeGreaterThan(0);
  expect(n.entityId).toBeTypeOf('string');
  expect(n.entityId.length).toBeGreaterThan(0);

  // Position coordinates
  expect(n.x).toBeTypeOf('number');
  expect(n.y).toBeTypeOf('number');
  expect(Number.isFinite(n.x)).toBe(true);
  expect(Number.isFinite(n.y)).toBe(true);
  expect(n.x).not.toBeNaN();
  expect(n.y).not.toBeNaN();

  // External IDs array
  expect(n.externalIds).toBeDefined();
  expect(Array.isArray(n.externalIds)).toBe(true);

  // Validate external IDs structure
  for (const extId of n.externalIds) {
    expect(extId).toBeTypeOf('object');
    expect(extId.type).toBeTypeOf('string');
    expect(extId.value).toBeTypeOf('string');
    expect(extId.url).toBeTypeOf('string');
    expect(extId.url).toMatch(/^https?:\/\//);
  }

  // Validate entity type
  const validEntityTypes: EntityType[] = [
    'works', 'authors', 'sources', 'institutions', 'publishers', 'funders', 'topics', 'concepts', 'keywords'
  ];
  expect(validEntityTypes).toContain(n.entityType as EntityType);
}

/**
 * Validate GraphEdge structure and content
 */
export function expectValidGraphEdge(edge: unknown): asserts edge is GraphEdge {
  expect(edge).toBeDefined();
  expect(edge).toBeTypeOf('object');
  expect(edge).not.toBeNull();

  const e = edge as GraphEdge;

  // Required fields
  expect(e.id).toBeTypeOf('string');
  expect(e.id.length).toBeGreaterThan(0);
  expect(e.source).toBeTypeOf('string');
  expect(e.source.length).toBeGreaterThan(0);
  expect(e.target).toBeTypeOf('string');
  expect(e.target.length).toBeGreaterThan(0);
  expect(e.type).toBeTypeOf('string');

  // Source and target should be valid (can be the same for self-referential relationships)
  expect(e.source).toBeDefined();
  expect(e.target).toBeDefined();

  // Validate relationship type
  const validRelationTypes = Object.values(RelationType);
  expect(validRelationTypes).toContain(e.type as RelationType);

  // Optional fields validation
  if (e.weight !== undefined) {
    expect(e.weight).toBeTypeOf('number');
    expect(Number.isFinite(e.weight)).toBe(true);
    expect(e.weight).not.toBeNaN();
    expect(e.weight).toBeGreaterThan(0);
  }

  if (e.label !== undefined) {
    expect(e.label).toBeTypeOf('string');
  }
}

/**
 * Validate GraphData structure
 */
export function expectValidGraphData(data: unknown): asserts data is GraphData {
  expect(data).toBeDefined();
  expect(data).toBeTypeOf('object');
  expect(data).not.toBeNull();

  const d = data as GraphData;

  expect(d.nodes).toBeDefined();
  expect(Array.isArray(d.nodes)).toBe(true);
  expect(d.edges).toBeDefined();
  expect(Array.isArray(d.edges)).toBe(true);

  // Validate all nodes
  for (const node of d.nodes) {
    expectValidGraphNode(node);
  }

  // Validate all edges
  for (const edge of d.edges) {
    expectValidGraphEdge(edge);
  }

  // Validate edge references
  const nodeIds = new Set(d.nodes.map(n => n.id));
  for (const edge of d.edges) {
    expect(nodeIds).toContain(edge.source);
    expect(nodeIds).toContain(edge.target);
  }
}

/**
 * Validate GraphExpansion structure
 */
export function expectValidGraphExpansion(expansion: unknown): asserts expansion is GraphExpansion {
  expect(expansion).toBeDefined();
  expect(expansion).toBeTypeOf('object');
  expect(expansion).not.toBeNull();

  const exp = expansion as GraphExpansion;

  // Validate nodes and edges
  expectValidGraphData({ nodes: exp.nodes, edges: exp.edges });

  // Validate metadata
  expect(exp.metadata).toBeDefined();
  expect(exp.metadata).toBeTypeOf('object');
  expect(exp.metadata.expandedFrom).toBeTypeOf('string');
  expect(exp.metadata.depth).toBeTypeOf('number');
  expect(exp.metadata.totalFound).toBeTypeOf('number');
  expect(exp.metadata.options).toBeTypeOf('object');

  // Depth should be positive
  expect(exp.metadata.depth).toBeGreaterThan(0);

  // Total found should be non-negative
  expect(exp.metadata.totalFound).toBeGreaterThanOrEqual(0);

  // Total found should be >= actual nodes returned
  expect(exp.metadata.totalFound).toBeGreaterThanOrEqual(exp.nodes.length);
}

/**
 * Validate position coordinates are within bounds
 */
export function expectPositionInBounds(
  node: GraphNode,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): void {
  expect(node.x).toBeGreaterThanOrEqual(bounds.minX);
  expect(node.x).toBeLessThanOrEqual(bounds.maxX);
  expect(node.y).toBeGreaterThanOrEqual(bounds.minY);
  expect(node.y).toBeLessThanOrEqual(bounds.maxY);
}

/**
 * Validate that nodes have moved (positions changed)
 */
export function expectNodesHaveMoved(
  nodesBefore: GraphNode[],
  nodesAfter: GraphNode[],
  tolerance = 1e-10
): void {
  expect(nodesBefore).toHaveLength(nodesAfter.length);

  const beforeMap = new Map(nodesBefore.map(n => [n.id, { x: n.x, y: n.y }]));
  const afterMap = new Map(nodesAfter.map(n => [n.id, { x: n.x, y: n.y }]));

  let movedCount = 0;
  for (const [nodeId, beforePos] of beforeMap) {
    const afterPos = afterMap.get(nodeId);
    expect(afterPos).toBeDefined();

    const distance = Math.sqrt(
      Math.pow(afterPos!.x - beforePos.x, 2) +
      Math.pow(afterPos!.y - beforePos.y, 2)
    );

    if (distance > tolerance) {
      movedCount++;
    }
  }

  expect(movedCount).toBeGreaterThan(0);
}

/**
 * Validate graph connectivity
 */
export function expectGraphConnectivity(
  data: GraphData,
  expectedComponents?: number
): void {
  const nodeIds = new Set(data.nodes.map(n => n.id));
  const adjacencyList = new Map<string, Set<string>>();

  // Initialize adjacency list
  for (const node of data.nodes) {
    adjacencyList.set(node.id, new Set());
  }

  // Build adjacency list from edges
  for (const edge of data.edges) {
    adjacencyList.get(edge.source)?.add(edge.target);
    adjacencyList.get(edge.target)?.add(edge.source);
  }

  // Find connected components using DFS
  const visited = new Set<string>();
  let componentCount = 0;

  function dfs(nodeId: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    for (const neighbor of adjacencyList.get(nodeId) || []) {
      dfs(neighbor);
    }
  }

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
      componentCount++;
    }
  }

  if (expectedComponents !== undefined) {
    expect(componentCount).toBe(expectedComponents);
  }

  // Graph should have at least one component if it has nodes
  if (data.nodes.length > 0) {
    expect(componentCount).toBeGreaterThan(0);
    expect(componentCount).toBeLessThanOrEqual(data.nodes.length);
  }
}

/**
 * Validate entity type distribution
 */
export function expectEntityTypeDistribution(
  nodes: GraphNode[],
  expectedDistribution: Partial<Record<EntityType, number>>
): void {
  const actualDistribution: Record<EntityType, number> = {} as any;

  // Count entity types
  for (const node of nodes) {
    actualDistribution[node.entityType] = (actualDistribution[node.entityType] || 0) + 1;
  }

  // Validate expected counts
  for (const [entityType, expectedCount] of Object.entries(expectedDistribution)) {
    expect(actualDistribution[entityType as EntityType] || 0).toBe(expectedCount);
  }
}

/**
 * Validate that all external IDs are properly formatted
 */
export function expectValidExternalIds(nodes: GraphNode[]): void {
  for (const node of nodes) {
    for (const extId of node.externalIds) {
      switch (extId.type) {
        case 'doi':
          expect(extId.value).toMatch(/^10\.\d+\/.+/);
          expect(extId.url).toMatch(/^https?:\/\/.*doi\.org\//);
          break;
        case 'orcid':
          expect(extId.value).toMatch(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/);
          expect(extId.url).toMatch(/^https?:\/\/orcid\.org\//);
          break;
        case 'ror':
          expect(extId.value).toMatch(/^[0-9a-z]+$/);
          expect(extId.url).toMatch(/^https?:\/\/ror\.org\//);
          break;
        case 'issn_l':
          expect(extId.value).toMatch(/^\d{4}-\d{3}[\dX]$/);
          break;
        case 'wikidata':
          expect(extId.value).toMatch(/^Q\d+$/);
          expect(extId.url).toMatch(/^https?:\/\/.*wikidata\.org\//);
          break;
      }
    }
  }
}

/**
 * Validate performance metrics
 */
export function expectPerformanceMetrics(
  startTime: number,
  endTime: number,
  maxDuration: number,
  operation: string
): void {
  const duration = endTime - startTime;
  expect(duration).toBeLessThanOrEqual(maxDuration);
  expect(duration).toBeGreaterThanOrEqual(0);

  // Log performance info for debugging
  const durationMs = duration / 1000000; // Convert from nanoseconds to milliseconds
  console.debug(`Performance: ${operation} completed in ${durationMs.toFixed(2)}ms`);
}

/**
 * Custom assertion for array subset validation
 */
export function expectArrayContainsSubset<T>(
  actual: T[],
  expected: Partial<T>[],
  matcher: (actual: T, expected: Partial<T>) => boolean = (a, e) =>
    Object.keys(e).every(key => (a as any)[key] === (e as any)[key])
): void {
  for (const expectedItem of expected) {
    const found = actual.some(actualItem => matcher(actualItem, expectedItem));
    expect(found).toBe(true);
  }
}

/**
 * Validate deterministic behavior
 */
export function expectDeterministicResults<T>(
  generator: () => T,
  equality: (a: T, b: T) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  iterations = 3
): void {
  const results: T[] = [];

  for (let i = 0; i < iterations; i++) {
    results.push(generator());
  }

  // All results should be equal
  for (let i = 1; i < results.length; i++) {
    expect(equality(results[0], results[i])).toBe(true);
  }
}

/**
 * Assertion utilities export
 */
export const assertions = {
  expectDeepEqualWithTolerance,
  expectValidGraphNode,
  expectValidGraphEdge,
  expectValidGraphData,
  expectValidGraphExpansion,
  expectPositionInBounds,
  expectNodesHaveMoved,
  expectGraphConnectivity,
  expectEntityTypeDistribution,
  expectValidExternalIds,
  expectPerformanceMetrics,
  expectArrayContainsSubset,
  expectDeterministicResults,
};