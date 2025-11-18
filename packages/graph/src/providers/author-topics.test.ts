/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAlexGraphProvider } from './openalex-provider';
import { RelationType } from '../types/core';
import type { GraphEdge } from '../types/core';

interface MockOpenAlexClient {
	getWork: ReturnType<typeof vi.fn>;
	getAuthor: ReturnType<typeof vi.fn>;
	getSource: ReturnType<typeof vi.fn>;
	getInstitution: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
	works: ReturnType<typeof vi.fn>;
	authors: ReturnType<typeof vi.fn>;
	sources: ReturnType<typeof vi.fn>;
	institutions: ReturnType<typeof vi.fn>;
	funders: ReturnType<typeof vi.fn>;
	topics: ReturnType<typeof vi.fn>;
	publishers: ReturnType<typeof vi.fn>;
}

describe('OpenAlexGraphProvider - Author Research Topics', () => {
	let provider: OpenAlexGraphProvider;
	let mockClient: MockOpenAlexClient;

	beforeEach(() => {
		mockClient = {
			getWork: vi.fn(),
			getAuthor: vi.fn(),
			getSource: vi.fn(),
			getInstitution: vi.fn(),
			get: vi.fn(),
			works: vi.fn(),
			authors: vi.fn(),
			sources: vi.fn(),
			institutions: vi.fn(),
			funders: vi.fn(),
			topics: vi.fn(),
			publishers: vi.fn(),
		} as unknown as MockOpenAlexClient;

		provider = new OpenAlexGraphProvider(mockClient as any);
	});

	it('should create AUTHOR_RESEARCHES edges from author to research topics (T074)', async () => {
		// Arrange
		const mockAuthor = {
			id: 'https://openalex.org/A2208157607',
			display_name: 'Dr. Jane Smith',
			orcid: 'https://orcid.org/0000-0001-2345-6789',
			topics: [
				{
					id: 'https://openalex.org/T10635',
					display_name: 'Machine Learning',
					count: 45,
					score: 0.92,
				},
				{
					id: 'https://openalex.org/T11234',
					display_name: 'Natural Language Processing',
					count: 32,
					score: 0.85,
				},
				{
					id: 'https://openalex.org/T12345',
					display_name: 'Computer Vision',
					count: 28,
					score: 0.78,
				},
			],
			works_count: 105,
			cited_by_count: 2500,
		};

		const mockTopic1 = {
			id: 'https://openalex.org/T10635',
			display_name: 'Machine Learning',
			description: 'Algorithms that learn from data',
		};

		const mockTopic2 = {
			id: 'https://openalex.org/T11234',
			display_name: 'Natural Language Processing',
			description: 'Processing and understanding human language',
		};

		const mockTopic3 = {
			id: 'https://openalex.org/T12345',
			display_name: 'Computer Vision',
			description: 'Enabling computers to interpret visual information',
		};

		mockClient.getAuthor.mockResolvedValue(mockAuthor);
		mockClient.get.mockImplementation((endpoint: string, id: string) => {
			if (endpoint !== 'topics') return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
			if (id === 'T10635') return Promise.resolve(mockTopic1);
			if (id === 'T11234') return Promise.resolve(mockTopic2);
			if (id === 'T12345') return Promise.resolve(mockTopic3);
			return Promise.reject(new Error(`Unknown topic: ${id}`));
		});

		// Act
		const result = await provider.expandEntity('A2208157607', { limit: 10 });

		// Assert
		expect(result).toBeDefined();
		expect(result.nodes).toBeDefined();
		expect(result.edges).toBeDefined();

		// Verify author node exists
		const authorNode = result.nodes.find((n) => n.id === 'A2208157607');
		expect(authorNode).toBeDefined();
		expect(authorNode?.entityType).toBe('authors');
		expect(authorNode?.label).toBe('Dr. Jane Smith');

		// Verify AUTHOR_RESEARCHES edges
		const researchEdges = result.edges.filter((e) => e.type === RelationType.AUTHOR_RESEARCHES);
		expect(researchEdges).toHaveLength(3);

		// Verify Machine Learning edge
		const mlEdge = researchEdges.find((e) => e.target === 'T10635');
		expect(mlEdge).toBeDefined();
		expect(mlEdge?.source).toBe('A2208157607');
		expect(mlEdge?.target).toBe('T10635');
		expect(mlEdge?.direction).toBe('outbound');
		expect(mlEdge?.type).toBe(RelationType.AUTHOR_RESEARCHES);
		expect(mlEdge?.id).toBe('A2208157607-author_researches-T10635');
		expect(mlEdge?.metadata?.count).toBe(45);
		expect(mlEdge?.metadata?.score).toBe(0.92);

		// Verify NLP edge
		const nlpEdge = researchEdges.find((e) => e.target === 'T11234');
		expect(nlpEdge).toBeDefined();
		expect(nlpEdge?.source).toBe('A2208157607');
		expect(nlpEdge?.target).toBe('T11234');
		expect(nlpEdge?.direction).toBe('outbound');
		expect(nlpEdge?.metadata?.count).toBe(32);
		expect(nlpEdge?.metadata?.score).toBe(0.85);

		// Verify Computer Vision edge
		const cvEdge = researchEdges.find((e) => e.target === 'T12345');
		expect(cvEdge).toBeDefined();
		expect(cvEdge?.source).toBe('A2208157607');
		expect(cvEdge?.target).toBe('T12345');
		expect(cvEdge?.direction).toBe('outbound');
		expect(cvEdge?.metadata?.count).toBe(28);
		expect(cvEdge?.metadata?.score).toBe(0.78);

		// Verify topic nodes created
		const mlNode = result.nodes.find((n) => n.id === 'T10635');
		expect(mlNode).toBeDefined();
		expect(mlNode?.label).toBe('Machine Learning');
		expect(mlNode?.entityType).toBe('topics');

		const nlpNode = result.nodes.find((n) => n.id === 'T11234');
		expect(nlpNode).toBeDefined();
		expect(nlpNode?.label).toBe('Natural Language Processing');

		const cvNode = result.nodes.find((n) => n.id === 'T12345');
		expect(cvNode).toBeDefined();
		expect(cvNode?.label).toBe('Computer Vision');
	});

	it('should gracefully handle author with no research topics', async () => {
		// Arrange
		const mockAuthorNoTopics = {
			id: 'https://openalex.org/A2208157607',
			display_name: 'New Researcher',
			topics: [],
			works_count: 2,
			cited_by_count: 5,
		};

		mockClient.getAuthor.mockResolvedValue(mockAuthorNoTopics);

		// Act
		const result = await provider.expandEntity('A2208157607', { limit: 10 });

		// Assert
		expect(result).toBeDefined();

		// Verify no AUTHOR_RESEARCHES edges created
		const researchEdges = result.edges.filter((e) => e.type === RelationType.AUTHOR_RESEARCHES);
		expect(researchEdges).toHaveLength(0);

		// Verify no topic nodes created from research topics
		const topicNodes = result.nodes.filter(
			(n) => n.entityType === 'topics' && n.id.startsWith('T')
		);
		expect(topicNodes).toHaveLength(0);
	});

	it('should apply configurable limit to research topics', async () => {
		// Arrange
		const mockAuthorManyTopics = {
			id: 'https://openalex.org/A2208157607',
			display_name: 'Prolific Researcher',
			topics: [
				{ id: 'https://openalex.org/T10001', display_name: 'Topic 1', count: 50, score: 0.95 },
				{ id: 'https://openalex.org/T10002', display_name: 'Topic 2', count: 45, score: 0.9 },
				{ id: 'https://openalex.org/T10003', display_name: 'Topic 3', count: 40, score: 0.85 },
				{ id: 'https://openalex.org/T10004', display_name: 'Topic 4', count: 35, score: 0.8 },
				{ id: 'https://openalex.org/T10005', display_name: 'Topic 5', count: 30, score: 0.75 },
			],
			works_count: 200,
			cited_by_count: 5000,
		};

		mockClient.getAuthor.mockResolvedValue(mockAuthorManyTopics);
		mockClient.get.mockResolvedValue({
			id: 'https://openalex.org/T10001',
			display_name: 'Topic',
		});

		// Act - Limit topics to 2
		const result = await provider.expandEntity('A2208157607', {
			limit: 10,
			limits: { [RelationType.AUTHOR_RESEARCHES]: 2 },
		});

		// Assert
		const researchEdges = result.edges.filter((e) => e.type === RelationType.AUTHOR_RESEARCHES);
		expect(researchEdges).toHaveLength(2);

		// Should include highest scored topics
		const edgeTargets = researchEdges.map((e) => e.target);
		expect(edgeTargets).toContain('T10001');
		expect(edgeTargets).toContain('T10002');
	});

	it('should handle topics with missing metadata gracefully', async () => {
		// Arrange
		const mockAuthorPartialTopics = {
			id: 'https://openalex.org/A2208157607',
			display_name: 'Dr. Smith',
			topics: [
				{ id: 'https://openalex.org/T10001', display_name: 'Full Topic', count: 25, score: 0.9 },
				{ id: 'https://openalex.org/T10002', display_name: 'No Count', score: 0.85 }, // Missing count
				{ id: 'https://openalex.org/T10003', display_name: 'No Score', count: 20 }, // Missing score
			],
			works_count: 50,
			cited_by_count: 500,
		};

		mockClient.getAuthor.mockResolvedValue(mockAuthorPartialTopics);
		mockClient.get.mockResolvedValue({
			id: 'https://openalex.org/T10001',
			display_name: 'Topic',
		});

		// Act
		const result = await provider.expandEntity('A2208157607', { limit: 10 });

		// Assert
		const researchEdges = result.edges.filter((e) => e.type === RelationType.AUTHOR_RESEARCHES);
		expect(researchEdges.length).toBeGreaterThanOrEqual(1);

		// Full topic should have complete metadata
		const fullEdge = researchEdges.find((e) => e.target === 'T10001');
		expect(fullEdge).toBeDefined();
		expect(fullEdge?.metadata?.count).toBe(25);
		expect(fullEdge?.metadata?.score).toBe(0.9);

		// Partial topics should have edges with available metadata
		const noCountEdge = researchEdges.find((e) => e.target === 'T10002');
		if (noCountEdge) {
			expect(noCountEdge.metadata?.score).toBe(0.85);
			expect(noCountEdge.metadata?.count).toBeUndefined();
		}

		const noScoreEdge = researchEdges.find((e) => e.target === 'T10003');
		if (noScoreEdge) {
			expect(noScoreEdge.metadata?.count).toBe(20);
			expect(noScoreEdge.metadata?.score).toBeUndefined();
		}
	});

	it('should skip topics with invalid IDs', async () => {
		// Arrange
		const mockAuthorInvalidTopics = {
			id: 'https://openalex.org/A2208157607',
			display_name: 'Dr. Smith',
			topics: [
				{ id: 'https://openalex.org/T10001', display_name: 'Valid Topic', count: 25, score: 0.9 },
				{ id: null, display_name: 'Invalid Topic', count: 20, score: 0.85 }, // Null ID
				{ id: '', display_name: 'Empty ID', count: 15, score: 0.8 }, // Empty ID
			],
			works_count: 50,
			cited_by_count: 500,
		};

		mockClient.getAuthor.mockResolvedValue(mockAuthorInvalidTopics);
		mockClient.get.mockResolvedValue({
			id: 'https://openalex.org/T10001',
			display_name: 'Valid Topic',
		});

		// Act
		const result = await provider.expandEntity('A2208157607', { limit: 10 });

		// Assert
		const researchEdges = result.edges.filter((e) => e.type === RelationType.AUTHOR_RESEARCHES);

		// Should only create edge for valid topic
		expect(researchEdges.length).toBeGreaterThanOrEqual(1);

		const validEdge = researchEdges.find((e) => e.target === 'T10001');
		expect(validEdge).toBeDefined();

		// Should not create edges for invalid topics
		const invalidEdges = researchEdges.filter((e) => e.target === null || e.target === '');
		expect(invalidEdges).toHaveLength(0);
	});
});
