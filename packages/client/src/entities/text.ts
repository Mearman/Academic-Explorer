/**
 * OpenAlex Text Analysis API
 * Provides methods for text analysis operations including concept extraction
 */

import type {
	Concept,
	QueryParams,
	OpenAlexResponse,
} from "../types";
import type { OpenAlexBaseClient } from "../client";

/**
 * Result from text analysis operations
 */
export interface TextAnalysisResult {
  concepts: Concept[];
  text: string;
  source?: string;
}

/**
 * Options for text analysis
 */
export interface TextAnalysisOptions {
  /** Maximum number of concepts to return */
  limit?: number;

  /** Minimum confidence score for concept extraction */
  min_score?: number;

  /** Specific fields to include in concept results */
  select?: string[];
}

/**
 * Parameters for concept extraction from text
 */
export interface ConceptExtractionParams extends QueryParams {
  /** The text to analyze for concept extraction */
  title?: string;

  /** The abstract or full text content */
  abstract?: string;

  /** Alternative text field */
  text?: string;

  /** Maximum number of concepts to return */
  limit?: number;

  /** Minimum confidence score */
  min_score?: number;
}

/**
 * Text Analysis API class providing methods for text analysis operations
 */
export class TextApi {
	constructor(private client: OpenAlexBaseClient) {}

	/**
	 * Extract concepts from text title
	 *
	 * @param title - The text title to analyze for concepts
	 * @param options - Optional parameters for concept extraction
	 * @returns Promise resolving to extracted concepts
	 *
	 * @example
	 * ```typescript
	 * const concepts = await textApi.extractConceptsFromTitle(
	 *   'Machine Learning Applications in Healthcare',
	 *   { limit: 10, min_score: 0.5 }
	 * );
	 * ```
	 */
	async extractConceptsFromTitle(
		title: string,
		options: TextAnalysisOptions = {}
	): Promise<Concept[]> {
		if (!title || typeof title !== 'string' || title.trim().length === 0) {
			throw new Error('Title must be a non-empty string');
		}

		const params: ConceptExtractionParams = {
			title: title.trim(),
			...options,
		};

		const response = await this.client.getResponse<Concept>('text/concepts', params);
		return response.results;
	}

	/**
	 * Extract concepts from abstract text
	 *
	 * @param abstract - The abstract text to analyze for concepts
	 * @param options - Optional parameters for concept extraction
	 * @returns Promise resolving to extracted concepts
	 *
	 * @example
	 * ```typescript
	 * const concepts = await textApi.extractConceptsFromAbstract(
	 *   'This study investigates machine learning algorithms...',
	 *   { limit: 5 }
	 * );
	 * ```
	 */
	async extractConceptsFromAbstract(
		abstract: string,
		options: TextAnalysisOptions = {}
	): Promise<Concept[]> {
		if (!abstract || typeof abstract !== 'string' || abstract.trim().length === 0) {
			throw new Error('Abstract must be a non-empty string');
		}

		const params: ConceptExtractionParams = {
			abstract: abstract.trim(),
			...options,
		};

		const response = await this.client.getResponse<Concept>('text/concepts', params);
		return response.results;
	}

	/**
	 * Extract concepts from arbitrary text
	 *
	 * @param text - The text to analyze for concepts
	 * @param options - Optional parameters for concept extraction
	 * @returns Promise resolving to extracted concepts
	 *
	 * @example
	 * ```typescript
	 * const concepts = await textApi.extractConceptsFromText(
	 *   'Natural language processing and computer vision are important AI fields',
	 *   { limit: 10 }
	 * );
	 * ```
	 */
	async extractConceptsFromText(
		text: string,
		options: TextAnalysisOptions = {}
	): Promise<Concept[]> {
		if (!text || typeof text !== 'string' || text.trim().length === 0) {
			throw new Error('Text must be a non-empty string');
		}

		const params: ConceptExtractionParams = {
			text: text.trim(),
			...options,
		};

		const response = await this.client.getResponse<Concept>('text/concepts', params);
		return response.results;
	}

	/**
	 * Extract concepts from multiple text fields (title + abstract)
	 *
	 * @param title - The title text
	 * @param abstract - The abstract text
	 * @param options - Optional parameters for concept extraction
	 * @returns Promise resolving to extracted concepts
	 *
	 * @example
	 * ```typescript
	 * const concepts = await textApi.extractConceptsFromMultipleFields(
	 *   'Deep Learning in Medical Imaging',
	 *   'This paper presents a comprehensive study of deep learning...',
	 *   { limit: 15, min_score: 0.3 }
	 * );
	 * ```
	 */
	async extractConceptsFromMultipleFields(
		title: string,
		abstract: string,
		options: TextAnalysisOptions = {}
	): Promise<Concept[]> {
		if (!title && !abstract) {
			throw new Error('At least one of title or abstract must be provided');
		}

		const params: ConceptExtractionParams = {
			...options,
		};

		if (title && title.trim().length > 0) {
			params.title = title.trim();
		}

		if (abstract && abstract.trim().length > 0) {
			params.abstract = abstract.trim();
		}

		const response = await this.client.getResponse<Concept>('text/concepts', params);
		return response.results;
	}

	/**
	 * Perform comprehensive text analysis with flexible parameters
	 *
	 * @param params - Parameters for text analysis
	 * @returns Promise resolving to text analysis results
	 *
	 * @example
	 * ```typescript
	 * const result = await textApi.analyzeText({
	 *   title: 'AI in Healthcare',
	 *   abstract: 'Artificial intelligence applications...',
	 *   limit: 20,
	 *   min_score: 0.4
	 * });
	 * ```
	 */
	async analyzeText(params: ConceptExtractionParams): Promise<TextAnalysisResult> {
		// Validate that at least one text field is provided
		if (!params.title && !params.abstract && !params.text) {
			throw new Error('At least one text field (title, abstract, or text) must be provided');
		}

		const response = await this.client.getResponse<Concept>('text/concepts', params);

		// Combine all text for the result
		const textParts: string[] = [];
		if (params.title) textParts.push(params.title);
		if (params.abstract) textParts.push(params.abstract);
		if (params.text) textParts.push(params.text);

		return {
			concepts: response.results,
			text: textParts.join(' '),
			source: 'text_analysis'
		};
	}

	/**
	 * Get text analysis endpoint directly with custom parameters
	 *
	 * @param params - Query parameters for text analysis
	 * @returns Promise resolving to OpenAlex response with concepts
	 *
	 * @example
	 * ```typescript
	 * const response = await textApi.getTextConcepts({
	 *   title: 'Machine Learning Research',
	 *   limit: 10
	 * });
	 * ```
	 */
	async getTextConcepts(params: ConceptExtractionParams = {}): Promise<OpenAlexResponse<Concept>> {
		return this.client.getResponse<Concept>('text/concepts', params);
	}
}