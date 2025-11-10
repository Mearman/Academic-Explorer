/**
 * OpenAlex Text Analysis API
 * Provides text analysis functionality using the /text endpoint for "aboutness" detection
 */

import type { TextAnalysis } from "@academic-explorer/types";
import { OpenAlexBaseClient } from "../client";
import { logger } from "../internal/logger";

/**
 * Text analysis options
 */
export interface TextAnalysisOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum confidence score (0-1) */
  min_confidence?: number;
  /** Entity types to include in analysis */
  entity_types?: ("topic" | "concept" | "keyword")[];
  /** Include scores in results */
  include_scores?: boolean;
}

/**
 * Batch text analysis options
 */
export interface BatchTextAnalysisOptions extends TextAnalysisOptions {
  /** Maximum number of texts to process in parallel */
  batch_size?: number;
  /** Delay between batch requests (ms) */
  batch_delay?: number;
}

/**
 * Text Analysis API class providing methods for analyzing text content
 */
export class TextAnalysisApi {
  constructor(private client: OpenAlexBaseClient) {}

  /**
   * Analyze text content to extract research topics, concepts, and keywords
   *
   * @param text - Text content to analyze
   * @param options - Analysis options
   * @returns Promise resolving to text analysis results
   *
   * @example
   * ```typescript
   * const analysis = await textAnalysisApi.analyzeText(
   *   'Machine learning algorithms for natural language processing',
   *   {
   *     limit: 10,
   *     min_confidence: 0.7,
   *     entity_types: ['topic', 'concept']
   *   }
   * );
   * ```
   */
  async analyzeText(
    text: string,
    options: TextAnalysisOptions = {},
  ): Promise<TextAnalysis> {
    const {
      limit = 20,
      min_confidence = 0.5,
      entity_types = ["topic", "concept", "keyword"],
      include_scores = true,
    } = options;

    const params: Record<string, unknown> = {
      text: text.trim(),
      limit,
      min_confidence,
      entity_types: entity_types.join(","),
      include_scores,
    };

    return this.client.get<TextAnalysis>("text", params);
  }

  /**
   * Analyze multiple texts in batches
   *
   * @param texts - Array of text contents to analyze
   * @param options - Batch analysis options
   * @returns Promise resolving to array of text analysis results
   *
   * @example
   * ```typescript
   * const results = await textAnalysisApi.batchAnalyzeTexts([
   *   'Quantum computing and cryptography',
   *   'Deep learning for computer vision',
   *   'Blockchain technology applications'
   * ], {
   *   batch_size: 2,
   *   limit: 5,
   *   min_confidence: 0.8
   * });
   * ```
   */
  async batchAnalyzeTexts(
    texts: string[],
    options: BatchTextAnalysisOptions = {},
  ): Promise<TextAnalysis[]> {
    const { batch_size = 5, batch_delay = 200, ...analysisOptions } = options;

    const results: TextAnalysis[] = [];

    // Process texts in batches to respect rate limits
    for (let i = 0; i < texts.length; i += batch_size) {
      const batch = texts.slice(i, i + batch_size);

      const batchPromises = batch.map((text) =>
        this.analyzeText(text, analysisOptions).catch((error: unknown) => {
          logger.warn(
            `[TextAnalysisApi] Failed to analyze text: ${text.substring(0, 50)}...`,
            { text: text.substring(0, 100), error },
          );
          return null;
        }),
      );

      const batchResults = await Promise.all(batchPromises);

      // Filter out failed analyses
      const validResults = batchResults.filter(
        (result): result is TextAnalysis => result !== null,
      );
      results.push(...validResults);

      // Add delay between batches if not the last batch
      if (i + batch_size < texts.length) {
        await this.sleep(batch_delay);
      }
    }

    return results;
  }

  /**
   * Extract top topics from text content
   *
   * @param text - Text content to analyze
   * @param limit - Maximum number of topics to return
   * @returns Promise resolving to top topics with scores
   *
   * @example
   * ```typescript
   * const topics = await textAnalysisApi.extractTopics(
   *   'Artificial intelligence and machine learning research',
   *   5
   * );
   * ```
   */
  async extractTopics(
    text: string,
    limit: number = 10,
  ): Promise<
    Array<{
      id: string;
      display_name: string;
      score: number;
    }>
  > {
    const analysis = await this.analyzeText(text, {
      entity_types: ["topic"],
      limit,
      include_scores: true,
    });

    return analysis.results
      .filter((result) => result.entity_type === "topic")
      .map((result) => ({
        id: result.entity_id,
        display_name: result.display_name,
        score: result.score,
      }));
  }

  /**
   * Extract concepts from text content
   *
   * @param text - Text content to analyze
   * @param limit - Maximum number of concepts to return
   * @returns Promise resolving to concepts with scores
   *
   * @example
   * ```typescript
   * const concepts = await textAnalysisApi.extractConcepts(
   *   'Climate change and environmental sustainability',
   *   8
   * );
   * ```
   */
  async extractConcepts(
    text: string,
    limit: number = 10,
  ): Promise<
    Array<{
      id: string;
      display_name: string;
      score: number;
    }>
  > {
    const analysis = await this.analyzeText(text, {
      entity_types: ["concept"],
      limit,
      include_scores: true,
    });

    return analysis.results
      .filter((result) => result.entity_type === "concept")
      .map((result) => ({
        id: result.entity_id,
        display_name: result.display_name,
        score: result.score,
      }));
  }

  /**
   * Extract keywords from text content
   *
   * @param text - Text content to analyze
   * @param limit - Maximum number of keywords to return
   * @returns Promise resolving to keywords with scores
   *
   * @example
   * ```typescript
   * const keywords = await textAnalysisApi.extractKeywords(
   *   'Renewable energy sources and power generation',
   *   6
   * );
   * ```
   */
  async extractKeywords(
    text: string,
    limit: number = 10,
  ): Promise<
    Array<{
      id: string;
      display_name: string;
      score: number;
    }>
  > {
    const analysis = await this.analyzeText(text, {
      entity_types: ["keyword"],
      limit,
      include_scores: true,
    });

    return analysis.results
      .filter((result) => result.entity_type === "keyword")
      .map((result) => ({
        id: result.entity_id,
        display_name: result.display_name,
        score: result.score,
      }));
  }

  /**
   * Get text similarity based on extracted entities
   *
   * @param text1 - First text to compare
   * @param text2 - Second text to compare
   * @param options - Analysis options
   * @returns Promise resolving to similarity metrics
   *
   * @example
   * ```typescript
   * const similarity = await textAnalysisApi.getTextSimilarity(
   *   'Machine learning for healthcare applications',
   *   'AI applications in medical diagnosis',
   *   { entity_types: ['topic', 'concept'] }
   * );
   * ```
   */
  async getTextSimilarity(
    text1: string,
    text2: string,
    options: TextAnalysisOptions = {},
  ): Promise<{
    similarity_score: number;
    common_entities: Array<{
      entity_id: string;
      display_name: string;
      entity_type: string;
      score1: number;
      score2: number;
    }>;
    total_entities1: number;
    total_entities2: number;
  }> {
    const [analysis1, analysis2] = await Promise.all([
      this.analyzeText(text1, options),
      this.analyzeText(text2, options),
    ]);

    // Create maps for quick lookup
    const entities1 = new Map<
      string,
      {
        entity_id: string;
        display_name: string;
        entity_type: string;
        score: number;
      }
    >(analysis1.results.map((r) => [r.entity_id, { ...r, score: r.score }]));
    const entities2 = new Map<
      string,
      {
        entity_id: string;
        display_name: string;
        entity_type: string;
        score: number;
      }
    >(analysis2.results.map((r) => [r.entity_id, { ...r, score: r.score }]));

    // Find common entities
    const commonEntities: Array<{
      entity_id: string;
      display_name: string;
      entity_type: string;
      score1: number;
      score2: number;
    }> = [];

    for (const [entityId, entity1] of entities1) {
      const entity2 = entities2.get(entityId);
      if (entity2) {
        commonEntities.push({
          entity_id: entityId,
          display_name: entity1.display_name,
          entity_type: entity1.entity_type,
          score1: entity1.score,
          score2: entity2.score,
        });
      }
    }

    // Calculate similarity score (Jaccard similarity)
    const totalUniqueEntities = new Set([
      ...entities1.keys(),
      ...entities2.keys(),
    ]).size;
    const similarityScore =
      totalUniqueEntities > 0 ? commonEntities.length / totalUniqueEntities : 0;

    return {
      similarity_score: similarityScore,
      common_entities: commonEntities.sort(
        (a, b) => b.score1 + b.score2 - (a.score1 + a.score2),
      ),
      total_entities1: analysis1.results.length,
      total_entities2: analysis2.results.length,
    };
  }

  /**
   * Analyze research paper abstract or content
   *
   * @param abstract - Research paper abstract or content
   * @param options - Analysis options
   * @returns Promise resolving to research-focused analysis
   *
   * @example
   * ```typescript
   * const analysis = await textAnalysisApi.analyzeResearchContent(
   *   'This study investigates the application of deep neural networks...',
   *   { min_confidence: 0.8, limit: 15 }
   * );
   * ```
   */
  async analyzeResearchContent(
    abstract: string,
    options: TextAnalysisOptions = {},
  ): Promise<
    TextAnalysis & {
      primary_topics: string[];
      research_areas: string[];
      confidence_distribution: {
        high: number; // > 0.8
        medium: number; // 0.5-0.8
        low: number; // < 0.5
      };
    }
  > {
    const analysis = await this.analyzeText(abstract, {
      ...options,
      min_confidence: options.min_confidence ?? 0.4, // Lower threshold for research content
      limit: options.limit ?? 25,
    });

    // Extract primary topics (highest scoring topics)
    const primaryTopics = analysis.results
      .filter((r) => r.entity_type === "topic" && r.score > 0.7)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((r) => r.display_name);

    // Extract research areas (combination of topics and high-scoring concepts)
    const researchAreas = analysis.results
      .filter(
        (r) =>
          (r.entity_type === "topic" || r.entity_type === "concept") &&
          r.score > 0.6,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((r) => r.display_name);

    // Calculate confidence distribution
    const confidenceDistribution = analysis.results.reduce(
      (acc, result) => {
        if (result.score > 0.8) acc.high++;
        else if (result.score > 0.5) acc.medium++;
        else acc.low++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 },
    );

    return {
      ...analysis,
      primary_topics: primaryTopics,
      research_areas: researchAreas,
      confidence_distribution: confidenceDistribution,
    };
  }

  /**
   * Sleep utility for batch processing delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
