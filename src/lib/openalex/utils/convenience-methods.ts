/**
 * Convenience methods for common OpenAlex API queries
 * These methods provide simplified access to frequently used query patterns
 */

import type { OpenAlexClient } from '../client';
import type { Work, Author, Source, Institution, Topic, ApiResponse } from '../types';

import { QueryBuilder } from './query-builder';

/**
 * Common query convenience methods
 */
export class OpenAlexConvenience {
  constructor(private client: OpenAlexClient) {}

  /**
   * Get highly cited works (above a threshold)
   * @param minCitations Minimum citation count
   * @param options Additional query options
   * @example
   * const highlyCtedWorks = await convenience.getHighlyCitedWorks(100);
   */
  async getHighlyCitedWorks(
    minCitations: number,
    options: {
      year?: number;
      limit?: number;
      sort?: 'cited_by_count' | 'publication_date';
    } = {}
  ): Promise<Work[]> {
    const qb = new QueryBuilder().greaterThan('cited_by_count', minCitations);
    
    if (options.year) {
      qb.equals('publication_year', options.year);
    }

    const response = await this.client.works({
      filter: qb.build(),
      sort: options.sort === 'publication_date' ? 'publication_date:desc' : 'cited_by_count:desc',
      per_page: options.limit || 25
    });

    return response.results;
  }

  /**
   * Get open access works
   * @param year Optional year filter
   * @param limit Number of results to return
   * @example
   * const openAccessWorks = await convenience.getOpenAccessWorks(2023, 50);
   */
  async getOpenAccessWorks(year?: number, limit = 25): Promise<Work[]> {
    const qb = new QueryBuilder().isTrue('is_oa');
    
    if (year) {
      qb.equals('publication_year', year);
    }

    const response = await this.client.works({
      filter: qb.build(),
      sort: 'cited_by_count:desc',
      per_page: limit
    });

    return response.results;
  }

  /**
   * Get recent works from specific institution
   * @param institutionId Institution ID or ROR
   * @param days Number of days back to search
   * @example
   * const recentWorks = await convenience.getRecentWorksFromInstitution('I27837315', 30);
   */
  async getRecentWorksFromInstitution(
    institutionId: string,
    days = 30
  ): Promise<Work[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const fromDate = date.toISOString().split('T')[0];

    const qb = new QueryBuilder()
      .equals('institutions.id', institutionId)
      .dateAfter('publication_date', fromDate);

    const response = await this.client.works({
      filter: qb.build(),
      sort: 'publication_date:desc',
      per_page: 100
    });

    return response.results;
  }

  /**
   * Get author collaborators
   * @param authorId Author ID or ORCID
   * @param limit Maximum number of collaborators to return
   * @example
   * const collaborators = await convenience.getAuthorCollaborators('A5023888391');
   */
  async getAuthorCollaborators(
    authorId: string,
    limit = 20
  ): Promise<Author[]> {
    // First get the author's recent works
    const worksResponse = await this.client.works({
      filter: `author.id:${authorId}`,
      per_page: 50,
      sort: 'publication_date:desc'
    });

    // Extract unique collaborator IDs
    const collaboratorIds = new Set<string>();
    for (const work of worksResponse.results) {
      for (const authorship of work.authorships) {
        if (authorship.author.id !== authorId && authorship.author.id) {
          collaboratorIds.add(authorship.author.id);
        }
      }
    }

    // Fetch collaborator details
    const ids = Array.from(collaboratorIds).slice(0, limit);
    return this.client.authorsBatch(ids);
  }

  /**
   * Get trending topics
   * @param year Year to analyze
   * @param limit Number of topics to return
   * @example
   * const trendingTopics = await convenience.getTrendingTopics(2023);
   */
  async getTrendingTopics(year: number, limit = 10): Promise<Topic[]> {
    const response = await this.client.topics({
      filter: `works_count:>100`,
      sort: 'works_count:desc',
      per_page: limit
    });

    return response.results;
  }

  /**
   * Get works by multiple authors (co-authored)
   * @param authorIds Array of author IDs
   * @example
   * const coauthoredWorks = await convenience.getCoauthoredWorks(['A5023888391', 'A5067977678']);
   */
  async getCoauthoredWorks(authorIds: string[]): Promise<Work[]> {
    if (authorIds.length < 2) {
      throw new Error('At least 2 author IDs required');
    }

    // Build filter for all authors
    const filters = authorIds.map(id => `author.id:${id}`);
    const filter = filters.join(','); // AND operator

    const response = await this.client.works({
      filter,
      sort: 'publication_date:desc',
      per_page: 100
    });

    return response.results;
  }

  /**
   * Get institution's top researchers
   * @param institutionId Institution ID or ROR
   * @param limit Number of authors to return
   * @example
   * const topResearchers = await convenience.getInstitutionTopResearchers('I27837315');
   */
  async getInstitutionTopResearchers(
    institutionId: string,
    limit = 20
  ): Promise<Author[]> {
    const response = await this.client.authors({
      filter: `last_known_institutions.id:${institutionId}`,
      sort: 'cited_by_count:desc',
      per_page: limit
    });

    return response.results;
  }

  /**
   * Get works in a specific language
   * @param languageCode ISO 639-1 language code (e.g., 'en', 'es', 'zh')
   * @param options Additional query options
   * @example
   * const spanishWorks = await convenience.getWorksByLanguage('es', { year: 2023 });
   */
  async getWorksByLanguage(
    languageCode: string,
    options: {
      year?: number;
      limit?: number;
    } = {}
  ): Promise<Work[]> {
    const qb = new QueryBuilder().equals('language', languageCode);
    
    if (options.year) {
      qb.equals('publication_year', options.year);
    }

    const response = await this.client.works({
      filter: qb.build(),
      sort: 'cited_by_count:desc',
      per_page: options.limit || 25
    });

    return response.results;
  }

  /**
   * Get retracted works
   * @param options Query options
   * @example
   * const retractedWorks = await convenience.getRetractedWorks({ year: 2023 });
   */
  async getRetractedWorks(options: {
    year?: number;
    limit?: number;
  } = {}): Promise<Work[]> {
    const qb = new QueryBuilder().isTrue('is_retracted');
    
    if (options.year) {
      qb.equals('publication_year', options.year);
    }

    const response = await this.client.works({
      filter: qb.build(),
      sort: 'publication_date:desc',
      per_page: options.limit || 25
    });

    return response.results;
  }

  /**
   * Get sources by publisher
   * @param publisherId Publisher ID
   * @param limit Number of sources to return
   * @example
   * const sources = await convenience.getSourcesByPublisher('P4310319965');
   */
  async getSourcesByPublisher(
    publisherId: string,
    limit = 25
  ): Promise<Source[]> {
    const response = await this.client.sources({
      filter: `host_organization:${publisherId}`,
      sort: 'works_count:desc',
      per_page: limit
    });

    return response.results;
  }

  /**
   * Get funded works
   * @param funderId Funder ID
   * @param options Query options
   * @example
   * const fundedWorks = await convenience.getFundedWorks('F4320306076', { year: 2023 });
   */
  async getFundedWorks(
    funderId: string,
    options: {
      year?: number;
      limit?: number;
    } = {}
  ): Promise<Work[]> {
    const qb = new QueryBuilder().equals('grants.funder', funderId);
    
    if (options.year) {
      qb.equals('publication_year', options.year);
    }

    const response = await this.client.works({
      filter: qb.build(),
      sort: 'cited_by_count:desc',
      per_page: options.limit || 25
    });

    return response.results;
  }

  /**
   * Search works by keyword in title and abstract
   * @param keywords Keywords to search for
   * @param options Search options
   * @example
   * const works = await convenience.searchWorksByKeywords(['machine learning', 'AI']);
   */
  async searchWorksByKeywords(
    keywords: string[],
    options: {
      year?: number;
      isOa?: boolean;
      limit?: number;
    } = {}
  ): Promise<Work[]> {
    const searchQuery = keywords.join(' ');
    const qb = new QueryBuilder();

    if (options.year) {
      qb.equals('publication_year', options.year);
    }
    
    if (options.isOa !== undefined) {
      options.isOa ? qb.isTrue('is_oa') : qb.isFalse('is_oa');
    }

    const response = await this.client.works({
      search: searchQuery,
      filter: qb.build() || undefined,
      sort: 'relevance_score:desc',
      per_page: options.limit || 25
    });

    return response.results;
  }
}