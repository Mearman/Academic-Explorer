/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAlexGraphProvider } from './openalex-provider';
import { RelationType } from '../types/core';
import type { GraphEdge } from '../types/core';

interface MockOpenAlexClient {
	get: ReturnType<typeof vi.fn>;
	getWork: ReturnType<typeof vi.fn>;
	getAuthor: ReturnType<typeof vi.fn>;
	getSource: ReturnType<typeof vi.fn>;
	getInstitution: ReturnType<typeof vi.fn>;
	works: ReturnType<typeof vi.fn>;
	authors: ReturnType<typeof vi.fn>;
	sources: ReturnType<typeof vi.fn>;
	institutions: ReturnType<typeof vi.fn>;
}

describe('OpenAlexGraphProvider - Institution Lineage', () => {
	let provider: OpenAlexGraphProvider;
	let mockClient: MockOpenAlexClient;

	beforeEach(() => {
		mockClient = {
			get: vi.fn(),
			getWork: vi.fn(),
			getAuthor: vi.fn(),
			getSource: vi.fn(),
			getInstitution: vi.fn(),
			works: vi.fn().mockResolvedValue({ results: [] }),
			authors: vi.fn().mockResolvedValue({ results: [] }),
			sources: vi.fn().mockResolvedValue({ results: [] }),
			institutions: vi.fn().mockResolvedValue({ results: [] }),
		} as unknown as MockOpenAlexClient;

		provider = new OpenAlexGraphProvider(mockClient as any);
	});

	it('should create LINEAGE edges from institution to parents (T050)', async () => {
		// Arrange - Use valid OpenAlex IDs (8+ digits)
		const mockInstitution = {
			id: 'https://openalex.org/I12345678',
			display_name: 'Stanford Computer Science Department',
			type: 'education',
			country_code: 'US',
			lineage: [
				'https://openalex.org/I12345678', // Self
				'https://openalex.org/I45678901', // Parent: Stanford University
				'https://openalex.org/I78901234', // Grandparent: Stanford System
			],
			works_count: 5000,
			cited_by_count: 50000,
		};

		const mockParent = {
			id: 'https://openalex.org/I45678901',
			display_name: 'Stanford University',
			type: 'education',
			country_code: 'US',
			lineage: ['https://openalex.org/I45678901', 'https://openalex.org/I78901234'],
			works_count: 100000,
			cited_by_count: 1000000,
		};

		const mockGrandparent = {
			id: 'https://openalex.org/I78901234',
			display_name: 'Stanford System',
			type: 'education',
			country_code: 'US',
			lineage: ['https://openalex.org/I78901234'],
			works_count: 150000,
			cited_by_count: 1500000,
		};

		mockClient.getInstitution.mockImplementation((id: string) => {
			if (id === 'I12345678') return Promise.resolve(mockInstitution);
			if (id === 'I45678901') return Promise.resolve(mockParent);
			if (id === 'I78901234') return Promise.resolve(mockGrandparent);
			return Promise.reject(new Error('Not found'));
		});

		// Act
		const result = await provider.expandEntity('I12345678', { limit: 10 });

		// Assert
		const lineageEdges = result.edges.filter((e) => e.type === RelationType.LINEAGE);
		expect(lineageEdges).toHaveLength(2);

		// Check first edge (child → parent)
		const parentEdge = lineageEdges.find((e) => e.target === 'I45678901');
		expect(parentEdge).toBeDefined();
		expect(parentEdge!.source).toBe('I12345678');
		expect(parentEdge!.target).toBe('I45678901');
		expect(parentEdge!.type).toBe(RelationType.LINEAGE);
		expect(parentEdge!.direction).toBe('outbound');
		expect(parentEdge!.id).toBe('I12345678-LINEAGE-I45678901');

		// Check second edge (child → grandparent)
		const grandparentEdge = lineageEdges.find((e) => e.target === 'I78901234');
		expect(grandparentEdge).toBeDefined();
		expect(grandparentEdge!.source).toBe('I12345678');
		expect(grandparentEdge!.target).toBe('I78901234');
		expect(grandparentEdge!.type).toBe(RelationType.LINEAGE);
		expect(grandparentEdge!.direction).toBe('outbound');
		expect(grandparentEdge!.id).toBe('I12345678-LINEAGE-I78901234');

		// Verify nodes created
		expect(result.nodes).toHaveLength(3);
		const nodeIds = result.nodes.map((n) => n.id);
		expect(nodeIds).toContain('I12345678');
		expect(nodeIds).toContain('I45678901');
		expect(nodeIds).toContain('I78901234');
	});

	it('should extract lineage metadata from relationships (T051)', async () => {
		// Arrange - Use valid OpenAlex IDs (8+ digits)
		const mockInstitution = {
			id: 'https://openalex.org/I12345678',
			display_name: 'Stanford Computer Science Department',
			type: 'education',
			country_code: 'US',
			lineage: [
				'https://openalex.org/I12345678', // Self
				'https://openalex.org/I45678901', // Parent (level 1)
				'https://openalex.org/I78901234', // Grandparent (level 2)
			],
			works_count: 5000,
			cited_by_count: 50000,
		};

		const mockParent = {
			id: 'https://openalex.org/I45678901',
			display_name: 'Stanford University',
			type: 'education',
			country_code: 'US',
			lineage: ['https://openalex.org/I45678901', 'https://openalex.org/I78901234'],
			works_count: 100000,
			cited_by_count: 1000000,
		};

		const mockGrandparent = {
			id: 'https://openalex.org/I78901234',
			display_name: 'Stanford System',
			type: 'education',
			country_code: 'US',
			lineage: ['https://openalex.org/I78901234'],
			works_count: 150000,
			cited_by_count: 1500000,
		};

		mockClient.getInstitution.mockImplementation((id: string) => {
			if (id === 'I12345678') return Promise.resolve(mockInstitution);
			if (id === 'I45678901') return Promise.resolve(mockParent);
			if (id === 'I78901234') return Promise.resolve(mockGrandparent);
			return Promise.reject(new Error('Not found'));
		});

		// Act
		const result = await provider.expandEntity('I12345678', { limit: 10 });

		// Assert
		const lineageEdges = result.edges.filter((e) => e.type === RelationType.LINEAGE);
		expect(lineageEdges).toHaveLength(2);

		// Check parent edge metadata
		const parentEdge = lineageEdges.find((e) => e.target === 'I45678901');
		expect(parentEdge).toBeDefined();
		expect(parentEdge!.metadata).toBeDefined();
		expect(parentEdge!.metadata?.lineage_level).toBe(1);

		// Check grandparent edge metadata
		const grandparentEdge = lineageEdges.find((e) => e.target === 'I78901234');
		expect(grandparentEdge).toBeDefined();
		expect(grandparentEdge!.metadata).toBeDefined();
		expect(grandparentEdge!.metadata?.lineage_level).toBe(2);
	});

	it('should integrate multi-level institutional hierarchy (T052)', async () => {
		// Arrange - Use valid OpenAlex IDs (8+ digits)
		const mockChild = {
			id: 'https://openalex.org/I12345678',
			display_name: 'CS Dept',
			type: 'education',
			country_code: 'US',
			lineage: [
				'https://openalex.org/I12345678',
				'https://openalex.org/I45678901',
				'https://openalex.org/I78901234',
			],
			works_count: 5000,
			cited_by_count: 50000,
		};

		const mockParent = {
			id: 'https://openalex.org/I45678901',
			display_name: 'Stanford',
			type: 'education',
			country_code: 'US',
			lineage: ['https://openalex.org/I45678901', 'https://openalex.org/I78901234'],
			works_count: 100000,
			cited_by_count: 1000000,
		};

		const mockGrandparent = {
			id: 'https://openalex.org/I78901234',
			display_name: 'Stanford System',
			type: 'education',
			country_code: 'US',
			lineage: ['https://openalex.org/I78901234'],
			works_count: 150000,
			cited_by_count: 1500000,
		};

		mockClient.getInstitution.mockImplementation((id: string) => {
			if (id === 'I12345678') return Promise.resolve(mockChild);
			if (id === 'I45678901') return Promise.resolve(mockParent);
			if (id === 'I78901234') return Promise.resolve(mockGrandparent);
			return Promise.reject(new Error('Not found'));
		});

		// Act - Expand child
		const childResult = await provider.expandEntity('I12345678', { limit: 10 });

		// Assert child expansion
		const childLineageEdges = childResult.edges.filter(
			(e) => e.type === RelationType.LINEAGE
		);
		expect(childLineageEdges).toHaveLength(2);
		expect(childLineageEdges.some((e) => e.source === 'I12345678' && e.target === 'I45678901')).toBe(
			true
		);
		expect(childLineageEdges.some((e) => e.source === 'I12345678' && e.target === 'I78901234')).toBe(
			true
		);

		// Act - Expand parent
		const parentResult = await provider.expandEntity('I45678901', { limit: 10 });

		// Assert parent expansion
		const parentLineageEdges = parentResult.edges.filter(
			(e) => e.type === RelationType.LINEAGE
		);
		expect(parentLineageEdges).toHaveLength(1);
		expect(parentLineageEdges[0].source).toBe('I45678901');
		expect(parentLineageEdges[0].target).toBe('I78901234');
		expect(parentLineageEdges[0].direction).toBe('outbound');

		// Act - Expand grandparent
		const grandparentResult = await provider.expandEntity('I78901234', { limit: 10 });

		// Assert grandparent has no lineage edges (only contains self)
		const grandparentLineageEdges = grandparentResult.edges.filter(
			(e) => e.type === RelationType.LINEAGE
		);
		expect(grandparentLineageEdges).toHaveLength(0);

		// Verify all nodes present
		const allNodeIds = [
			...childResult.nodes.map((n) => n.id),
			...parentResult.nodes.map((n) => n.id),
			...grandparentResult.nodes.map((n) => n.id),
		];
		expect(allNodeIds).toContain('I12345678');
		expect(allNodeIds).toContain('I45678901');
		expect(allNodeIds).toContain('I78901234');

		// Verify complete hierarchy path traversable
		const allEdges = [
			...childResult.edges,
			...parentResult.edges,
			...grandparentResult.edges,
		];
		const lineageEdges = allEdges.filter((e) => e.type === RelationType.LINEAGE);

		// Path I12345678 → I45678901 exists
		expect(lineageEdges.some((e) => e.source === 'I12345678' && e.target === 'I45678901')).toBe(true);

		// Path I12345678 → I78901234 exists
		expect(lineageEdges.some((e) => e.source === 'I12345678' && e.target === 'I78901234')).toBe(true);

		// Path I45678901 → I78901234 exists
		expect(lineageEdges.some((e) => e.source === 'I45678901' && e.target === 'I78901234')).toBe(true);
	});

	it('should discover child institutions via reverse lookup (T053)', async () => {
		// Arrange - Use valid OpenAlex IDs (8+ digits)
		const mockParent = {
			id: 'https://openalex.org/I45678901',
			display_name: 'Stanford University',
			type: 'education',
			country_code: 'US',
			lineage: ['https://openalex.org/I45678901', 'https://openalex.org/I78901234'],
			works_count: 100000,
			cited_by_count: 1000000,
		};

		const mockChild = {
			id: 'https://openalex.org/I12345678',
			display_name: 'CS Dept',
			type: 'education',
			country_code: 'US',
			lineage: [
				'https://openalex.org/I12345678',
				'https://openalex.org/I45678901',
				'https://openalex.org/I78901234',
			],
			works_count: 5000,
			cited_by_count: 50000,
		};

		const mockGrandparent = {
			id: 'https://openalex.org/I78901234',
			display_name: 'Stanford System',
			type: 'education',
			country_code: 'US',
			lineage: ['https://openalex.org/I78901234'],
			works_count: 150000,
			cited_by_count: 1500000,
		};

		mockClient.getInstitution.mockImplementation((id: string) => {
			if (id === 'I45678901') return Promise.resolve(mockParent);
			if (id === 'I12345678') return Promise.resolve(mockChild);
			if (id === 'I78901234') return Promise.resolve(mockGrandparent);
			return Promise.reject(new Error('Not found'));
		});

		// Mock reverse lookup query: institutions where lineage contains I45678901
		mockClient.institutions.mockResolvedValue({
			results: [mockChild],
			meta: {
				count: 1,
				db_response_time_ms: 10,
				page: 1,
				per_page: 25,
				groups_count: null,
			},
		});

		// Act - Expand parent with reverse lookup
		const result = await provider.expandEntity('I45678901', {
			limit: 10,
			includeReverseRelationships: true,
		});

		// Assert
		const lineageEdges = result.edges.filter((e) => e.type === RelationType.LINEAGE);

		// Should have edge from child to parent (discovered via reverse lookup)
		const childToParentEdge = lineageEdges.find(
			(e) => e.source === 'I12345678' && e.target === 'I45678901'
		);
		expect(childToParentEdge).toBeDefined();
		expect(childToParentEdge!.type).toBe(RelationType.LINEAGE);
		expect(childToParentEdge!.direction).toBe('inbound');
		expect(childToParentEdge!.id).toBe('I12345678-LINEAGE-I45678901');

		// Verify both nodes present
		const nodeIds = result.nodes.map((n) => n.id);
		expect(nodeIds).toContain('I12345678');
		expect(nodeIds).toContain('I45678901');

		// Verify API was called with correct filter
		expect(mockClient.institutions).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: expect.objectContaining({
					lineage: 'I45678901',
				}),
			})
		);
	});
});
