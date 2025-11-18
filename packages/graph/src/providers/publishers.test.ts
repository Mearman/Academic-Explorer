/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAlexGraphProvider } from './openalex-provider';
import { RelationType } from '../types/core';
import type { GraphEdge } from '../types/core';

interface MockOpenAlexClient {
	get: ReturnType<typeof vi.fn>;
	institutions: { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
	works: { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
	authors: { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
	sources: { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
	funders: { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
	topics: { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
	publishers: { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
}

describe('OpenAlexGraphProvider - Publisher Relationships', () => {
	let provider: OpenAlexGraphProvider;
	let mockClient: MockOpenAlexClient;

	beforeEach(() => {
		mockClient = {
			get: vi.fn(),
			institutions: { get: vi.fn(), list: vi.fn() },
			works: { get: vi.fn(), list: vi.fn() },
			authors: { get: vi.fn(), list: vi.fn() },
			sources: { get: vi.fn(), list: vi.fn() },
			funders: { get: vi.fn(), list: vi.fn() },
			topics: { get: vi.fn(), list: vi.fn() },
			publishers: { get: vi.fn(), list: vi.fn() },
		} as unknown as MockOpenAlexClient;

		provider = new OpenAlexGraphProvider(mockClient as any);
	});

	it('should create HOST_ORGANIZATION edge from source to publisher (T060)', async () => {
		// Arrange
		const mockSource = {
			id: 'https://openalex.org/S12345678',
			display_name: 'Nature',
			type: 'journal',
			host_organization: 'https://openalex.org/P45678901',
			host_organization_name: 'Springer Nature',
			works_count: 500000,
			cited_by_count: 1000000,
			homepage_url: 'https://www.nature.com',
			issn_l: '0028-0836',
			issn: ['0028-0836', '1476-4687'],
		};

		const mockPublisher = {
			id: 'https://openalex.org/P45678901',
			display_name: 'Springer Nature',
			alternate_titles: ['Springer', 'Nature Publishing Group'],
			country_codes: ['GB', 'US'],
			hierarchy_level: 0,
			parent_publisher: null,
			lineage: ['https://openalex.org/P45678901'],
			works_count: 1000000,
			cited_by_count: 5000000,
			sources_api_url: 'https://api.openalex.org/sources?filter=host_organization.id:P45678901',
		};

		(mockClient.sources.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSource);
		(mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockPublisher);

		// Act
		const result = await provider.expandEntity('S12345678', { limit: 10 });

		// Assert
		expect(result).toBeDefined();
		expect(result.nodes).toBeDefined();
		expect(result.edges).toBeDefined();

		// Verify nodes
		const sourceNode = result.nodes.find(n => n.id === 'S12345678');
		const publisherNode = result.nodes.find(n => n.id === 'P45678901');

		expect(sourceNode).toBeDefined();
		expect(sourceNode?.label).toBe('Nature');
		expect(sourceNode?.entityType).toBe('sources');

		expect(publisherNode).toBeDefined();
		expect(publisherNode?.label).toBe('Springer Nature');
		expect(publisherNode?.entityType).toBe('publishers');

		// Verify HOST_ORGANIZATION edge
		const hostEdges = result.edges.filter(e => e.type === RelationType.HOST_ORGANIZATION);
		expect(hostEdges).toHaveLength(1);

		const hostEdge = hostEdges[0];
		expect(hostEdge.source).toBe('S12345678');
		expect(hostEdge.target).toBe('P45678901');
		expect(hostEdge.direction).toBe('outbound');
		expect(hostEdge.id).toBe('S12345678-HOST_ORGANIZATION-P45678901');

		// Verify client calls
		expect(mockClient.sources.get).toHaveBeenCalledWith('S12345678');
		expect(mockClient.get).toHaveBeenCalledWith('publishers', 'P45678901');
	});

	it('should create HOST_ORGANIZATION edges from publisher to all hosted sources via reverse lookup (T061)', async () => {
		// Arrange
		const mockPublisher = {
			id: 'https://openalex.org/P45678901',
			display_name: 'Springer Nature',
			alternate_titles: ['Springer', 'Nature Publishing Group'],
			country_codes: ['GB', 'US'],
			hierarchy_level: 0,
			parent_publisher: null,
			lineage: ['https://openalex.org/P45678901'],
			works_count: 1000000,
			cited_by_count: 5000000,
			sources_api_url: 'https://api.openalex.org/sources?filter=host_organization.id:P45678901',
		};

		const mockSourcesResponse = {
			meta: {
				count: 2,
				db_response_time_ms: 10,
				page: 1,
				per_page: 25,
			},
			results: [
				{
					id: 'https://openalex.org/S12345678',
					display_name: 'Nature',
					type: 'journal',
					host_organization: 'https://openalex.org/P45678901',
					host_organization_name: 'Springer Nature',
					works_count: 500000,
					cited_by_count: 1000000,
					issn_l: '0028-0836',
				},
				{
					id: 'https://openalex.org/S23456789',
					display_name: 'Science',
					type: 'journal',
					host_organization: 'https://openalex.org/P45678901',
					host_organization_name: 'Springer Nature',
					works_count: 400000,
					cited_by_count: 800000,
					issn_l: '0036-8075',
				},
			],
			group_by: [],
		};

		(mockClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockPublisher);
		(mockClient.sources.list as ReturnType<typeof vi.fn>).mockResolvedValue(mockSourcesResponse);

		// Act
		const result = await provider.expandEntity('P45678901', {
			limit: 10,
			includeReverseRelationships: true
		});

		// Assert
		expect(result).toBeDefined();
		expect(result.nodes).toBeDefined();
		expect(result.edges).toBeDefined();

		// Verify nodes
		const publisherNode = result.nodes.find(n => n.id === 'P45678901');
		const natureNode = result.nodes.find(n => n.id === 'S12345678');
		const scienceNode = result.nodes.find(n => n.id === 'S23456789');

		expect(publisherNode).toBeDefined();
		expect(publisherNode?.label).toBe('Springer Nature');
		expect(publisherNode?.entityType).toBe('publishers');

		expect(natureNode).toBeDefined();
		expect(natureNode?.label).toBe('Nature');
		expect(natureNode?.entityType).toBe('sources');

		expect(scienceNode).toBeDefined();
		expect(scienceNode?.label).toBe('Science');
		expect(scienceNode?.entityType).toBe('sources');

		// Verify HOST_ORGANIZATION edges
		const hostEdges = result.edges.filter(e => e.type === RelationType.HOST_ORGANIZATION);
		expect(hostEdges).toHaveLength(2);

		// Both edges should be inbound (discovered via reverse lookup)
		const natureEdge = hostEdges.find(e => e.source === 'S12345678');
		expect(natureEdge).toBeDefined();
		expect(natureEdge?.target).toBe('P45678901');
		expect(natureEdge?.direction).toBe('inbound');
		expect(natureEdge?.id).toBe('S12345678-HOST_ORGANIZATION-P45678901');

		const scienceEdge = hostEdges.find(e => e.source === 'S23456789');
		expect(scienceEdge).toBeDefined();
		expect(scienceEdge?.target).toBe('P45678901');
		expect(scienceEdge?.direction).toBe('inbound');
		expect(scienceEdge?.id).toBe('S23456789-HOST_ORGANIZATION-P45678901');

		// Verify client calls
		expect(mockClient.get).toHaveBeenCalledWith('publishers', 'P45678901');
		expect(mockClient.sources.list).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: { 'host_organization.id': 'P45678901' },
			})
		);
	});

	it('should create PUBLISHER_CHILD_OF edge from child publisher to parent publisher (T062)', async () => {
		// Arrange
		const mockChildPublisher = {
			id: 'https://openalex.org/P12345678',
			display_name: 'Nature Publishing Group',
			alternate_titles: ['NPG'],
			country_codes: ['GB'],
			hierarchy_level: 1,
			parent_publisher: 'https://openalex.org/P45678901',
			lineage: ['https://openalex.org/P12345678', 'https://openalex.org/P45678901'],
			works_count: 300000,
			cited_by_count: 1500000,
			sources_api_url: 'https://api.openalex.org/sources?filter=host_organization.id:P12345678',
		};

		const mockParentPublisher = {
			id: 'https://openalex.org/P45678901',
			display_name: 'Springer Nature',
			alternate_titles: ['Springer', 'Nature Publishing Group'],
			country_codes: ['GB', 'US'],
			hierarchy_level: 0,
			parent_publisher: null,
			lineage: ['https://openalex.org/P45678901'],
			works_count: 1000000,
			cited_by_count: 5000000,
			sources_api_url: 'https://api.openalex.org/sources?filter=host_organization.id:P45678901',
		};

		const mockSourcesResponse = {
			meta: {
				count: 0,
				db_response_time_ms: 5,
				page: 1,
				per_page: 25,
			},
			results: [],
			group_by: [],
		};

		(mockClient.get as ReturnType<typeof vi.fn>).mockImplementation((entityType: string, id: string) => {
			if (id === 'P12345678') return Promise.resolve(mockChildPublisher);
			if (id === 'P45678901') return Promise.resolve(mockParentPublisher);
			return Promise.reject(new Error(`Unknown publisher: ${id}`));
		});

		(mockClient.sources.list as ReturnType<typeof vi.fn>).mockResolvedValue(mockSourcesResponse);

		// Act
		const result = await provider.expandEntity('P12345678', { limit: 10 });

		// Assert
		expect(result).toBeDefined();
		expect(result.nodes).toBeDefined();
		expect(result.edges).toBeDefined();

		// Verify nodes
		const childNode = result.nodes.find(n => n.id === 'P12345678');
		const parentNode = result.nodes.find(n => n.id === 'P45678901');

		expect(childNode).toBeDefined();
		expect(childNode?.label).toBe('Nature Publishing Group');
		expect(childNode?.entityType).toBe('publishers');

		expect(parentNode).toBeDefined();
		expect(parentNode?.label).toBe('Springer Nature');
		expect(parentNode?.entityType).toBe('publishers');

		// Verify PUBLISHER_CHILD_OF edge
		const parentEdges = result.edges.filter(e => e.type === RelationType.PUBLISHER_CHILD_OF);
		expect(parentEdges).toHaveLength(1);

		const parentEdge = parentEdges[0];
		expect(parentEdge.source).toBe('P12345678');
		expect(parentEdge.target).toBe('P45678901');
		expect(parentEdge.direction).toBe('outbound');
		expect(parentEdge.id).toBe('P12345678-publisher_child_of-P45678901');

		// Verify parent publisher has no parent edges
		const parentAsSource = result.edges.filter(
			e => e.type === RelationType.PUBLISHER_CHILD_OF && e.source === 'P45678901'
		);
		expect(parentAsSource).toHaveLength(0);

		// Verify client calls
		expect(mockClient.get).toHaveBeenCalledWith('publishers', 'P12345678');
		expect(mockClient.get).toHaveBeenCalledWith('publishers', 'P45678901');
	});

	it('should gracefully handle source with no host_organization (T063)', async () => {
		// Arrange
		const mockSourceWithoutHost = {
			id: 'https://openalex.org/S12345678',
			display_name: 'Independent Journal',
			type: 'journal',
			host_organization: null,
			host_organization_name: null,
			works_count: 1000,
			cited_by_count: 5000,
			issn_l: '1234-5678',
			issn: ['1234-5678'],
			homepage_url: 'https://example.com',
		};

		(mockClient.sources.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockSourceWithoutHost);

		// Act
		const result = await provider.expandEntity('S12345678', { limit: 10 });

		// Assert
		expect(result).toBeDefined();
		expect(result.nodes).toBeDefined();
		expect(result.edges).toBeDefined();

		// Verify source node exists
		const sourceNode = result.nodes.find(n => n.id === 'S12345678');
		expect(sourceNode).toBeDefined();
		expect(sourceNode?.label).toBe('Independent Journal');
		expect(sourceNode?.entityType).toBe('sources');

		// Verify no HOST_ORGANIZATION edges created
		const hostEdges = result.edges.filter(e => e.type === RelationType.HOST_ORGANIZATION);
		expect(hostEdges).toHaveLength(0);

		// Verify no publisher nodes created
		const publisherNodes = result.nodes.filter(n => n.entityType === 'publishers');
		expect(publisherNodes).toHaveLength(0);

		// Verify only source node in graph
		expect(result.nodes).toHaveLength(1);

		// Verify client only called for source
		expect(mockClient.sources.get).toHaveBeenCalledWith('S12345678');
		expect(mockClient.get).not.toHaveBeenCalled();
	});
});
