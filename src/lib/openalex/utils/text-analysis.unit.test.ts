import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TextAnalysisApi } from './text-analysis';
import type { OpenAlexBaseClient } from '../client';
import type { TextAnalysis } from '../types';

// Mock the client
const mockClient = {
  get: vi.fn(),
} as unknown as jest.Mocked<OpenAlexBaseClient>;

describe('TextAnalysisApi', () => {
  let textAnalysisApi: TextAnalysisApi;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.get.mockReset();
    textAnalysisApi = new TextAnalysisApi(mockClient);
  });

  describe('analyzeText', () => {
    it('should analyze text with default parameters', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [
          { entity_type: 'topic', entity_id: 'T123', display_name: 'Machine Learning', score: 0.95 },
          { entity_type: 'concept', entity_id: 'C456', display_name: 'Neural Networks', score: 0.87 },
          { entity_type: 'keyword', entity_id: 'K789', display_name: 'Algorithm', score: 0.76 },
        ],
        meta: {
          count: 3,
          processing_time_ms: 150,
          text_length: 50,
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await textAnalysisApi.analyzeText('Machine learning algorithms for natural language processing');

      expect(mockClient.get).toHaveBeenCalledWith('text', {
        text: 'Machine learning algorithms for natural language processing',
        limit: 20,
        min_confidence: 0.5,
        entity_types: 'topic,concept,keyword',
        include_scores: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should analyze text with custom parameters', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [
          { entity_type: 'topic', entity_id: 'T123', display_name: 'Quantum Computing', score: 0.92 },
        ],
        meta: {
          count: 1,
          processing_time_ms: 120,
          text_length: 30,
        },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await textAnalysisApi.analyzeText('Quantum computing research', {
        limit: 10,
        min_confidence: 0.8,
        entity_types: ['topic'],
        include_scores: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith('text', {
        text: 'Quantum computing research',
        limit: 10,
        min_confidence: 0.8,
        entity_types: 'topic',
        include_scores: false,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should trim input text', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [],
        meta: { count: 0, processing_time_ms: 50, text_length: 10 },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      await textAnalysisApi.analyzeText('  trimmed text  ');

      expect(mockClient.get).toHaveBeenCalledWith('text', {
        text: 'trimmed text',
        limit: 20,
        min_confidence: 0.5,
        entity_types: 'topic,concept,keyword',
        include_scores: true,
      });
    });
  });

  describe('batchAnalyzeTexts', () => {
    it('should process multiple texts in batches', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse1: TextAnalysis = {
        results: [{ entity_type: 'topic', entity_id: 'T1', display_name: 'AI', score: 0.9 }],
        meta: { count: 1, processing_time_ms: 100, text_length: 20 },
      };

      const mockResponse2: TextAnalysis = {
        results: [{ entity_type: 'concept', entity_id: 'C2', display_name: 'Deep Learning', score: 0.85 }],
        meta: { count: 1, processing_time_ms: 110, text_length: 25 },
      };

      mockClient.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const texts = ['Artificial intelligence research', 'Deep learning applications'];
      const result = await textAnalysisApi.batchAnalyzeTexts(texts, { batch_size: 2, batch_delay: 0 });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockResponse1);
      expect(result[1]).toEqual(mockResponse2);
      expect(mockClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle batch processing with failures gracefully', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [{ entity_type: 'topic', entity_id: 'T1', display_name: 'Success', score: 0.9 }],
        meta: { count: 1, processing_time_ms: 100, text_length: 20 },
      };

      // Mock console.warn to avoid noise in test output
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockClient.get
        .mockResolvedValueOnce(mockResponse)
        .mockRejectedValueOnce(new Error('API Error'));

      const texts = ['Successful text', 'Failed text'];
      const result = await textAnalysisApi.batchAnalyzeTexts(texts, { batch_size: 1, batch_delay: 0 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockResponse);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[api] Failed to analyze text: Failed text...',
        expect.objectContaining({
          text: 'Failed text',
          error: expect.any(Error)
        })
      );

      consoleWarnSpy.mockRestore();
    });

    it('should process texts in correct batch sizes', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [],
        meta: { count: 0, processing_time_ms: 50, text_length: 10 },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const texts = ['text1', 'text2', 'text3', 'text4', 'text5'];
      await textAnalysisApi.batchAnalyzeTexts(texts, { batch_size: 2, batch_delay: 0 });

      // Should make 5 calls total (2 + 2 + 1)
      expect(mockClient.get).toHaveBeenCalledTimes(5);
    });
  });

  describe('extractTopics', () => {
    it('should extract topics from text', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [
          { entity_type: 'topic', entity_id: 'T123', display_name: 'Machine Learning', score: 0.95 },
          { entity_type: 'topic', entity_id: 'T456', display_name: 'Data Science', score: 0.87 },
          { entity_type: 'concept', entity_id: 'C789', display_name: 'Algorithm', score: 0.76 }, // Should be filtered out
        ],
        meta: { count: 3, processing_time_ms: 120, text_length: 40 },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await textAnalysisApi.extractTopics('Machine learning and data science', 5);

      expect(mockClient.get).toHaveBeenCalledWith('text', {
        text: 'Machine learning and data science',
        limit: 5,
        min_confidence: 0.5,
        entity_types: 'topic',
        include_scores: true,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'T123',
        display_name: 'Machine Learning',
        score: 0.95,
      });
      expect(result[1]).toEqual({
        id: 'T456',
        display_name: 'Data Science',
        score: 0.87,
      });
    });

    it('should use default limit when not specified', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [],
        meta: { count: 0, processing_time_ms: 50, text_length: 10 },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      await textAnalysisApi.extractTopics('test text');

      expect(mockClient.get).toHaveBeenCalledWith('text', {
        text: 'test text',
        limit: 10,
        min_confidence: 0.5,
        entity_types: 'topic',
        include_scores: true,
      });
    });
  });

  describe('extractConcepts', () => {
    it('should extract concepts from text', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [
          { entity_type: 'concept', entity_id: 'C123', display_name: 'Neural Networks', score: 0.92 },
          { entity_type: 'topic', entity_id: 'T456', display_name: 'AI', score: 0.88 }, // Should be filtered out
          { entity_type: 'concept', entity_id: 'C789', display_name: 'Deep Learning', score: 0.85 },
        ],
        meta: { count: 3, processing_time_ms: 130, text_length: 35 },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await textAnalysisApi.extractConcepts('Neural networks and deep learning', 8);

      expect(mockClient.get).toHaveBeenCalledWith('text', {
        text: 'Neural networks and deep learning',
        limit: 8,
        min_confidence: 0.5,
        entity_types: 'concept',
        include_scores: true,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'C123',
        display_name: 'Neural Networks',
        score: 0.92,
      });
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [
          { entity_type: 'keyword', entity_id: 'K123', display_name: 'Algorithm', score: 0.89 },
          { entity_type: 'keyword', entity_id: 'K456', display_name: 'Optimization', score: 0.82 },
          { entity_type: 'topic', entity_id: 'T789', display_name: 'Computer Science', score: 0.91 }, // Should be filtered out
        ],
        meta: { count: 3, processing_time_ms: 115, text_length: 30 },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await textAnalysisApi.extractKeywords('Algorithm optimization techniques', 6);

      expect(mockClient.get).toHaveBeenCalledWith('text', {
        text: 'Algorithm optimization techniques',
        limit: 6,
        min_confidence: 0.5,
        entity_types: 'keyword',
        include_scores: true,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'K123',
        display_name: 'Algorithm',
        score: 0.89,
      });
    });
  });

  describe('getTextSimilarity', () => {
    it('should calculate text similarity with common entities', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse1: TextAnalysis = {
        results: [
          { entity_type: 'topic', entity_id: 'T123', display_name: 'Machine Learning', score: 0.95 },
          { entity_type: 'concept', entity_id: 'C456', display_name: 'Neural Networks', score: 0.87 },
        ],
        meta: { count: 2, processing_time_ms: 120, text_length: 40 },
      };

      const mockResponse2: TextAnalysis = {
        results: [
          { entity_type: 'topic', entity_id: 'T123', display_name: 'Machine Learning', score: 0.92 },
          { entity_type: 'concept', entity_id: 'C789', display_name: 'Deep Learning', score: 0.84 },
        ],
        meta: { count: 2, processing_time_ms: 110, text_length: 35 },
      };

      mockClient.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await textAnalysisApi.getTextSimilarity(
        'Machine learning with neural networks',
        'Machine learning and deep learning'
      );

      expect(mockClient.get).toHaveBeenCalledTimes(2);
      expect(result.similarity_score).toBeCloseTo(0.33, 2); // 1 common / 3 total unique
      expect(result.common_entities).toHaveLength(1);
      expect(result.common_entities[0]).toEqual({
        entity_id: 'T123',
        display_name: 'Machine Learning',
        entity_type: 'topic',
        score1: 0.95,
        score2: 0.92,
      });
      expect(result.total_entities1).toBe(2);
      expect(result.total_entities2).toBe(2);
    });

    it('should handle texts with no common entities', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse1: TextAnalysis = {
        results: [
          { entity_type: 'topic', entity_id: 'T123', display_name: 'Biology', score: 0.90 },
        ],
        meta: { count: 1, processing_time_ms: 100, text_length: 20 },
      };

      const mockResponse2: TextAnalysis = {
        results: [
          { entity_type: 'topic', entity_id: 'T456', display_name: 'Physics', score: 0.88 },
        ],
        meta: { count: 1, processing_time_ms: 95, text_length: 18 },
      };

      mockClient.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await textAnalysisApi.getTextSimilarity(
        'Biological research methods',
        'Physics experiments'
      );

      expect(result.similarity_score).toBe(0); // 0 common / 2 total unique
      expect(result.common_entities).toHaveLength(0);
    });

    it('should handle empty analysis results', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockEmptyResponse: TextAnalysis = {
        results: [],
        meta: { count: 0, processing_time_ms: 50, text_length: 10 },
      };

      mockClient.get.mockResolvedValue(mockEmptyResponse);

      const result = await textAnalysisApi.getTextSimilarity('short text', 'another text');

      expect(result.similarity_score).toBe(0);
      expect(result.common_entities).toHaveLength(0);
      expect(result.total_entities1).toBe(0);
      expect(result.total_entities2).toBe(0);
    });
  });

  describe('analyzeResearchContent', () => {
    it('should analyze research content with enhanced analysis', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [
          { entity_type: 'topic', entity_id: 'T123', display_name: 'Machine Learning', score: 0.95 },
          { entity_type: 'topic', entity_id: 'T456', display_name: 'Neural Networks', score: 0.85 },
          { entity_type: 'concept', entity_id: 'C789', display_name: 'Deep Learning', score: 0.75 },
          { entity_type: 'concept', entity_id: 'C012', display_name: 'Algorithm', score: 0.65 },
          { entity_type: 'keyword', entity_id: 'K345', display_name: 'Classification', score: 0.45 },
        ],
        meta: { count: 5, processing_time_ms: 200, text_length: 150 },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await textAnalysisApi.analyzeResearchContent(
        'This study investigates machine learning algorithms and neural networks for classification tasks'
      );

      expect(mockClient.get).toHaveBeenCalledWith('text', {
        text: 'This study investigates machine learning algorithms and neural networks for classification tasks',
        limit: 25,
        min_confidence: 0.4,
        entity_types: 'topic,concept,keyword',
        include_scores: true,
      });

      expect(result.primary_topics).toEqual(['Machine Learning', 'Neural Networks']);
      expect(result.research_areas).toEqual(['Machine Learning', 'Neural Networks', 'Deep Learning', 'Algorithm']);
      expect(result.confidence_distribution).toEqual({
        high: 2, // score > 0.8: Machine Learning (0.95), Neural Networks (0.85)
        medium: 2, // score 0.5-0.8: Deep Learning (0.75), Algorithm (0.65)
        low: 1, // score < 0.5: Classification (0.45)
      });
      expect(result.results).toEqual(mockResponse.results);
      expect(result.meta).toEqual(mockResponse.meta);
    });

    it('should use custom options for research content analysis', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [],
        meta: { count: 0, processing_time_ms: 80, text_length: 50 },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      await textAnalysisApi.analyzeResearchContent('Short research abstract', {
        min_confidence: 0.7,
        limit: 15,
        entity_types: ['topic'],
      });

      expect(mockClient.get).toHaveBeenCalledWith('text', {
        text: 'Short research abstract',
        limit: 15,
        min_confidence: 0.7,
        entity_types: 'topic',
        include_scores: true,
      });
    });
  });

  describe('private method coverage', () => {
    it('should test sleep method through batchAnalyzeTexts', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.get.mockReset();

      const mockResponse: TextAnalysis = {
        results: [],
        meta: { count: 0, processing_time_ms: 50, text_length: 10 },
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const startTime = Date.now();

      // Test with non-zero delay to ensure sleep is called
      const texts = ['text1', 'text2', 'text3'];
      await textAnalysisApi.batchAnalyzeTexts(texts, {
        batch_size: 1,
        batch_delay: 10 // Small delay to test sleep functionality
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have taken at least 20ms (2 delays of 10ms each)
      expect(duration).toBeGreaterThanOrEqual(15);
      expect(mockClient.get).toHaveBeenCalledTimes(3);
    });
  });
});