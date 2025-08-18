/**
 * Topic hierarchy navigation utilities
 * Helps explore the domain -> field -> subfield -> topic hierarchy
 */

import type { OpenAlexClient } from '../client';
import type { Topic, Work } from '../types';

export interface TopicHierarchyNode {
  id: string;
  displayName: string;
  level: 'domain' | 'field' | 'subfield' | 'topic';
  worksCount?: number;
  citedByCount?: number;
  children?: TopicHierarchyNode[];
  topic?: Topic;
}

export interface DomainInfo {
  id: string;
  displayName: string;
  fields: FieldInfo[];
}

export interface FieldInfo {
  id: string;
  displayName: string;
  domainId: string;
  domainName: string;
  subfields: SubfieldInfo[];
}

export interface SubfieldInfo {
  id: string;
  displayName: string;
  fieldId: string;
  fieldName: string;
  domainId: string;
  domainName: string;
  topics: TopicInfo[];
}

export interface TopicInfo {
  id: string;
  displayName: string;
  subfield?: { id: string; display_name: string };
  field?: { id: string; display_name: string };
  domain?: { id: string; display_name: string };
  worksCount: number;
  citedByCount: number;
}

/**
 * Topic hierarchy navigation and analysis
 */
export class TopicHierarchyNavigation {
  constructor(private client: OpenAlexClient) {}

  /**
   * Get complete topic hierarchy for a given topic
   * @param topicId Topic ID
   * @returns Hierarchical structure from domain to topic
   * @example
   * const hierarchy = await topicNav.getTopicHierarchy('T11636');
   */
  async getTopicHierarchy(topicId: string): Promise<TopicHierarchyNode> {
    const topic = await this.client.topic(topicId);
    
    const node: TopicHierarchyNode = {
      id: topic.id,
      displayName: topic.display_name,
      level: 'topic',
      worksCount: topic.works_count,
      citedByCount: topic.cited_by_count,
      topic
    };

    // Build hierarchy path
    if (topic.domain) {
      const domainNode: TopicHierarchyNode = {
        id: `domain-${topic.domain.id}`,
        displayName: topic.domain.display_name,
        level: 'domain',
        children: []
      };

      if (topic.field) {
        const fieldNode: TopicHierarchyNode = {
          id: `field-${topic.field.id}`,
          displayName: topic.field.display_name,
          level: 'field',
          children: []
        };

        if (topic.subfield) {
          const subfieldNode: TopicHierarchyNode = {
            id: `subfield-${topic.subfield.id}`,
            displayName: topic.subfield.display_name,
            level: 'subfield',
            children: [node]
          };

          fieldNode.children!.push(subfieldNode);
        } else {
          fieldNode.children!.push(node);
        }

        domainNode.children!.push(fieldNode);
      } else {
        domainNode.children!.push(node);
      }

      return domainNode;
    }

    return node;
  }

  /**
   * Get sibling topics (topics in the same subfield)
   * @param topicId Topic ID
   * @param limit Maximum number of siblings to return
   * @example
   * const siblings = await topicNav.getTopicSiblings('T11636');
   */
  async getTopicSiblings(topicId: string, limit = 10): Promise<Topic[]> {
    const topic = await this.client.topic(topicId);
    
    if (!topic.subfield) {
      return [];
    }

    const response = await this.client.topics({
      filter: `subfield.id:${topic.subfield.id}`,
      sort: 'works_count:desc',
      per_page: limit + 1 // +1 to account for the topic itself
    });

    // Filter out the original topic
    return response.results.filter(t => t.id !== topic.id).slice(0, limit);
  }

  /**
   * Get all topics in a domain
   * @param domainId Domain ID
   * @param limit Maximum number of topics
   * @example
   * const topics = await topicNav.getTopicsInDomain(4, 50); // Health Sciences
   */
  async getTopicsInDomain(domainId: string | number, limit = 50): Promise<Topic[]> {
    const response = await this.client.topics({
      filter: `domain.id:${domainId}`,
      sort: 'works_count:desc',
      per_page: limit
    });

    return response.results;
  }

  /**
   * Get all topics in a field
   * @param fieldId Field ID
   * @param limit Maximum number of topics
   * @example
   * const topics = await topicNav.getTopicsInField(27, 50); // Medicine
   */
  async getTopicsInField(fieldId: string | number, limit = 50): Promise<Topic[]> {
    const response = await this.client.topics({
      filter: `field.id:${fieldId}`,
      sort: 'works_count:desc',
      per_page: limit
    });

    return response.results;
  }

  /**
   * Get all topics in a subfield
   * @param subfieldId Subfield ID
   * @param limit Maximum number of topics
   * @example
   * const topics = await topicNav.getTopicsInSubfield(2713, 25); // Epidemiology
   */
  async getTopicsInSubfield(subfieldId: string | number, limit = 25): Promise<Topic[]> {
    const response = await this.client.topics({
      filter: `subfield.id:${subfieldId}`,
      sort: 'works_count:desc',
      per_page: limit
    });

    return response.results;
  }

  /**
   * Get works in a domain
   * @param domainId Domain ID
   * @param options Query options
   * @example
   * const works = await topicNav.getWorksInDomain(4, { year: 2023, limit: 100 });
   */
  async getWorksInDomain(
    domainId: string | number,
    options: {
      year?: number;
      isOa?: boolean;
      limit?: number;
      sort?: string;
    } = {}
  ): Promise<Work[]> {
    const filters: string[] = [`topics.domain.id:${domainId}`];
    
    if (options.year) {
      filters.push(`publication_year:${options.year}`);
    }
    
    if (options.isOa !== undefined) {
      filters.push(`is_oa:${options.isOa}`);
    }

    const response = await this.client.works({
      filter: filters.join(','),
      sort: options.sort || 'cited_by_count:desc',
      per_page: options.limit || 25
    });

    return response.results;
  }

  /**
   * Get trending topics in a domain/field/subfield
   * @param level Hierarchy level to analyze
   * @param id ID of the domain/field/subfield
   * @param timeWindow Years to look back
   * @example
   * const trending = await topicNav.getTrendingTopics('field', 27, 2);
   */
  async getTrendingTopics(
    level: 'domain' | 'field' | 'subfield',
    id: string | number,
    timeWindow = 2
  ): Promise<Topic[]> {
    const currentYear = new Date().getFullYear();
    const _startYear = currentYear - timeWindow;

    const filter = `${level}.id:${id}`;
    
    // Get topics with recent growth
    const response = await this.client.topics({
      filter,
      sort: 'works_count:desc',
      per_page: 100
    });

    // Calculate growth rate (simplified - in production, would need historical data)
    const topicsWithGrowth = response.results.map(topic => {
      // This is a simplified calculation
      // In a real implementation, you'd need to query works by year
      return {
        topic,
        growthScore: topic.works_count / Math.max(1, topic.cited_by_count / 100)
      };
    });

    // Sort by growth score and return top topics
    topicsWithGrowth.sort((a, b) => b.growthScore - a.growthScore);
    
    return topicsWithGrowth.slice(0, 10).map(t => t.topic);
  }

  /**
   * Build a complete domain hierarchy map
   * @param domainId Optional domain ID to limit the hierarchy
   * @example
   * const hierarchy = await topicNav.buildDomainHierarchy();
   */
  async buildDomainHierarchy(domainId?: string | number): Promise<DomainInfo[]> {
    const domains: Map<string, DomainInfo> = new Map();
    const fields: Map<string, FieldInfo> = new Map();
    const subfields: Map<string, SubfieldInfo> = new Map();

    // Fetch topics
    const filter = domainId ? `domain.id:${domainId}` : undefined;
    const response = await this.client.topics({
      filter,
      per_page: 200,
      sort: 'works_count:desc'
    });

    // Build hierarchy from topics
    for (const topic of response.results) {
      // Process domain
      if (topic.domain) {
        const domainKey = `${topic.domain.id}`;
        if (!domains.has(domainKey)) {
          domains.set(domainKey, {
            id: domainKey,
            displayName: topic.domain.display_name,
            fields: []
          });
        }

        // Process field
        if (topic.field) {
          const fieldKey = `${topic.field.id}`;
          if (!fields.has(fieldKey)) {
            const fieldInfo: FieldInfo = {
              id: fieldKey,
              displayName: topic.field.display_name,
              domainId: domainKey,
              domainName: topic.domain.display_name,
              subfields: []
            };
            fields.set(fieldKey, fieldInfo);
            domains.get(domainKey)!.fields.push(fieldInfo);
          }

          // Process subfield
          if (topic.subfield) {
            const subfieldKey = `${topic.subfield.id}`;
            if (!subfields.has(subfieldKey)) {
              const subfieldInfo: SubfieldInfo = {
                id: subfieldKey,
                displayName: topic.subfield.display_name,
                fieldId: fieldKey,
                fieldName: topic.field.display_name,
                domainId: domainKey,
                domainName: topic.domain.display_name,
                topics: []
              };
              subfields.set(subfieldKey, subfieldInfo);
              fields.get(fieldKey)!.subfields.push(subfieldInfo);
            }

            // Add topic to subfield
            subfields.get(subfieldKey)!.topics.push({
              id: topic.id,
              displayName: topic.display_name,
              subfield: topic.subfield,
              field: topic.field,
              domain: topic.domain,
              worksCount: topic.works_count,
              citedByCount: topic.cited_by_count
            });
          }
        }
      }
    }

    return Array.from(domains.values());
  }

  /**
   * Find topics by keywords
   * @param keywords Keywords to search for
   * @param limit Maximum number of topics
   * @example
   * const topics = await topicNav.findTopicsByKeywords(['machine learning', 'AI']);
   */
  async findTopicsByKeywords(
    keywords: string[],
    limit = 10
  ): Promise<Topic[]> {
    const searchQuery = keywords.join(' ');
    
    const response = await this.client.topics({
      search: searchQuery,
      sort: 'relevance_score:desc',
      per_page: limit
    });

    return response.results;
  }

  /**
   * Get interdisciplinary topics (topics that span multiple fields)
   * @param limit Maximum number of topics
   * @example
   * const interdisciplinary = await topicNav.getInterdisciplinaryTopics();
   */
  async getInterdisciplinaryTopics(limit = 20): Promise<Topic[]> {
    // This is a heuristic approach - topics with high keyword diversity
    // In practice, would need more sophisticated analysis
    const response = await this.client.topics({
      filter: 'works_count:>1000',
      sort: 'works_count:desc',
      per_page: 100
    });

    // Filter topics that appear to be interdisciplinary based on keywords
    const interdisciplinary = response.results.filter(topic => {
      if (topic.keywords && topic.keywords.length > 10) {
        // Simple heuristic: topics with many diverse keywords
        return true;
      }
      return false;
    });

    return interdisciplinary.slice(0, limit);
  }
}