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

describe('OpenAlexGraphProvider - Keyword Relationships', () => {
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

	it('should create WORK_HAS_KEYWORD edges from work to keywords (T072)', async () => {
		// Arrange
		const mockWork = {
			id: 'https://openalex.org/W2741809807',
			title: 'Machine Learning Applications in Healthcare',
			publication_date: '2020-01-15',
			keywords: [
				{
					id: 'https://openalex.org/keywords/machine-learning',
					display_name: 'Machine Learning',
					score: 0.95,
				},
				{
					id: 'https://openalex.org/keywords/healthcare',
					display_name: 'Healthcare',
					score: 0.88,
				},
				{
					id: 'https://openalex.org/keywords/artificial-intelligence',
					display_name: 'Artificial Intelligence',
					score: 0.76,
				},
			],
			authorships: [],
			referenced_works: [],
		};

		mockClient.getWork.mockResolvedValue(mockWork);

		// Act
		const result = await provider.expandEntity('W2741809807', { limit: 10 });

		// Assert
		expect(result).toBeDefined();
		expect(result.nodes).toBeDefined();
		expect(result.edges).toBeDefined();

		// Verify work node exists
		const workNode = result.nodes.find((n) => n.id === 'W2741809807');
		expect(workNode).toBeDefined();
		expect(workNode?.entityType).toBe('works');

		// Verify WORK_HAS_KEYWORD edges
		const keywordEdges = result.edges.filter((e) => e.type === RelationType.WORK_HAS_KEYWORD);
		expect(keywordEdges).toHaveLength(3);

		// Verify first keyword edge (Machine Learning)
		const mlEdge = keywordEdges.find((e) => e.target === 'machine-learning');
		expect(mlEdge).toBeDefined();
		expect(mlEdge?.source).toBe('W2741809807');
		expect(mlEdge?.target).toBe('machine-learning');
		expect(mlEdge?.direction).toBe('outbound');
		expect(mlEdge?.type).toBe(RelationType.WORK_HAS_KEYWORD);
		expect(mlEdge?.id).toBe('W2741809807-work_has_keyword-machine-learning');
		expect(mlEdge?.metadata?.score).toBe(0.95);

		// Verify second keyword edge (Healthcare)
		const healthcareEdge = keywordEdges.find((e) => e.target === 'healthcare');
		expect(healthcareEdge).toBeDefined();
		expect(healthcareEdge?.source).toBe('W2741809807');
		expect(healthcareEdge?.target).toBe('healthcare');
		expect(healthcareEdge?.direction).toBe('outbound');
		expect(healthcareEdge?.metadata?.score).toBe(0.88);

		// Verify third keyword edge (AI)
		const aiEdge = keywordEdges.find((e) => e.target === 'artificial-intelligence');
		expect(aiEdge).toBeDefined();
		expect(aiEdge?.source).toBe('W2741809807');
		expect(aiEdge?.target).toBe('artificial-intelligence');
		expect(aiEdge?.direction).toBe('outbound');
		expect(aiEdge?.metadata?.score).toBe(0.76);

		// Verify keyword nodes created
		const mlNode = result.nodes.find((n) => n.id === 'machine-learning');
		expect(mlNode).toBeDefined();
		expect(mlNode?.label).toBe('Machine Learning');
		expect(mlNode?.entityType).toBe('keywords');

		const healthcareNode = result.nodes.find((n) => n.id === 'healthcare');
		expect(healthcareNode).toBeDefined();
		expect(healthcareNode?.label).toBe('Healthcare');

		const aiNode = result.nodes.find((n) => n.id === 'artificial-intelligence');
		expect(aiNode).toBeDefined();
		expect(aiNode?.label).toBe('Artificial Intelligence');
	});

	it('should gracefully handle work with no keywords', async () => {
		// Arrange
		const mockWorkNoKeywords = {
			id: 'https://openalex.org/W2741809807',
			title: 'Sample Work Without Keywords',
			publication_date: '2020-01-15',
			keywords: [],
			authorships: [],
			referenced_works: [],
		};

		mockClient.getWork.mockResolvedValue(mockWorkNoKeywords);

		// Act
		const result = await provider.expandEntity('W2741809807', { limit: 10 });

		// Assert
		expect(result).toBeDefined();

		// Verify no WORK_HAS_KEYWORD edges created
		const keywordEdges = result.edges.filter((e) => e.type === RelationType.WORK_HAS_KEYWORD);
		expect(keywordEdges).toHaveLength(0);

		// Verify no keyword nodes created
		const keywordNodes = result.nodes.filter((n) => n.entityType === 'keywords');
		expect(keywordNodes).toHaveLength(0);
	});

	it('should apply configurable limit to keywords', async () => {
		// Arrange
		const mockWorkManyKeywords = {
			id: 'https://openalex.org/W2741809807',
			title: 'Work With Many Keywords',
			publication_date: '2020-01-15',
			keywords: [
				{ id: 'https://openalex.org/keywords/k1', display_name: 'Keyword 1', score: 0.9 },
				{ id: 'https://openalex.org/keywords/k2', display_name: 'Keyword 2', score: 0.85 },
				{ id: 'https://openalex.org/keywords/k3', display_name: 'Keyword 3', score: 0.8 },
				{ id: 'https://openalex.org/keywords/k4', display_name: 'Keyword 4', score: 0.75 },
				{ id: 'https://openalex.org/keywords/k5', display_name: 'Keyword 5', score: 0.7 },
				{ id: 'https://openalex.org/keywords/k6', display_name: 'Keyword 6', score: 0.65 },
			],
			authorships: [],
			referenced_works: [],
		};

		mockClient.getWork.mockResolvedValue(mockWorkManyKeywords);

		// Act - Limit keywords to 3
		const result = await provider.expandEntity('W2741809807', {
			limit: 10,
			limits: { [RelationType.WORK_HAS_KEYWORD]: 3 },
		});

		// Assert
		const keywordEdges = result.edges.filter((e) => e.type === RelationType.WORK_HAS_KEYWORD);
		expect(keywordEdges).toHaveLength(3);

		// Should include highest scored keywords
		const edgeTargets = keywordEdges.map((e) => e.target);
		expect(edgeTargets).toContain('k1');
		expect(edgeTargets).toContain('k2');
		expect(edgeTargets).toContain('k3');
	});

	it('should handle keywords with missing or null properties gracefully', async () => {
		// Arrange
		const mockWorkPartialKeywords = {
			id: 'https://openalex.org/W2741809807',
			title: 'Work With Partial Keywords',
			publication_date: '2020-01-15',
			keywords: [
				{ id: 'https://openalex.org/keywords/valid', display_name: 'Valid Keyword', score: 0.9 },
				{ id: null, display_name: 'Invalid Keyword', score: 0.85 }, // Invalid ID
				{ id: 'https://openalex.org/keywords/no-score', display_name: 'No Score' }, // Missing score
			],
			authorships: [],
			referenced_works: [],
		};

		mockClient.getWork.mockResolvedValue(mockWorkPartialKeywords);

		// Act
		const result = await provider.expandEntity('W2741809807', { limit: 10 });

		// Assert
		const keywordEdges = result.edges.filter((e) => e.type === RelationType.WORK_HAS_KEYWORD);

		// Should only create edges for valid keywords
		expect(keywordEdges.length).toBeGreaterThanOrEqual(1);

		// Valid keyword should have edge
		const validEdge = keywordEdges.find((e) => e.target === 'valid');
		expect(validEdge).toBeDefined();
		expect(validEdge?.metadata?.score).toBe(0.9);

		// No-score keyword should have edge with undefined score
		const noScoreEdge = keywordEdges.find((e) => e.target === 'no-score');
		if (noScoreEdge) {
			expect(noScoreEdge.metadata?.score).toBeUndefined();
		}
	});
});
