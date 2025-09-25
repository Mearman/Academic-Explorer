/**
 * OpenAlex-specific implementation of GraphDataProvider
 * Provides graph data from the OpenAlex academic database
 */

import {
  GraphDataProvider,
  type SearchQuery,
  type ProviderExpansionOptions,
  type GraphExpansion
} from './base-provider';
import type { GraphNode, GraphEdge, EntityType, EntityIdentifier, ExternalIdentifier } from '../types/core';
import { RelationType } from '../types/core';

// Interface to avoid circular dependency with client package
interface OpenAlexClient {
  getWork(id: string): Promise<Record<string, unknown>>;
  getAuthor(id: string): Promise<Record<string, unknown>>;
  getSource(id: string): Promise<Record<string, unknown>>;
  getInstitution(id: string): Promise<Record<string, unknown>>;
  get(endpoint: string, id: string): Promise<Record<string, unknown>>;
  works(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>;
  authors(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>;
  sources(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>;
  institutions(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>;
}

interface OpenAlexProviderOptions {
  client: OpenAlexClient;
  name?: string;
  version?: string;
  maxConcurrentRequests?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * OpenAlex provider for graph data
 */
export class OpenAlexGraphProvider extends GraphDataProvider {
  constructor(private client: OpenAlexClient, options: Omit<OpenAlexProviderOptions, 'client'> = {}) {
    super({
      name: 'openalex',
      version: '1.0.0',
      ...options,
    });
  }

  /**
   * Fetch a single entity by ID
   */
  async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    return this.trackRequest((async () => {
      const entityType = this.detectEntityType(id);
      const entityData = await this.fetchEntityData(id, entityType);

      const node: GraphNode = {
        id,
        entityType,
        entityId: id,
        label: this.extractLabel(entityData, entityType),
        x: Math.random() * 800,
        y: Math.random() * 600,
        externalIds: this.extractExternalIds(entityData, entityType),
        entityData,
      };

      this.onEntityFetched(node);
      return node;
    })());
  }

  /**
   * Search for entities based on query
   */
  async searchEntities(query: SearchQuery): Promise<GraphNode[]> {
    return this.trackRequest((async () => {
      const results: GraphNode[] = [];

      // Search each entity type requested
      for (const entityType of query.entityTypes) {
        try {
          const searchResults = await this.searchByEntityType(
            query.query,
            entityType,
            {
              limit: Math.floor((query.limit || 20) / query.entityTypes.length),
              offset: query.offset,
            }
          );

          results.push(...searchResults);
        } catch (error) {
          console.warn(`Search failed for entity type ${entityType}:`, error);
        }
      }

      return results.slice(0, query.limit || 20);
    })());
  }

  /**
   * Expand an entity to show its relationships
   */
  async expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion> {
    return this.trackRequest((async () => {
      const entityType = this.detectEntityType(nodeId);
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      // Get the base entity data
      const baseEntity = await this.fetchEntityData(nodeId, entityType);

      // Expand based on entity type and available relationships
      switch (entityType) {
        case 'works':
          await this.expandWork(nodeId, baseEntity, nodes, edges, options);
          break;
        case 'authors':
          await this.expandAuthor(nodeId, baseEntity, nodes, edges, options);
          break;
        case 'sources':
          await this.expandSource(nodeId, baseEntity, nodes, edges, options);
          break;
        case 'institutions':
          await this.expandInstitution(nodeId, baseEntity, nodes, edges, options);
          break;
        case 'topics':
          await this.expandTopic(nodeId, baseEntity, nodes, edges, options);
          break;
        default:
          // Basic expansion for other entity types
          break;
      }

      return {
        nodes,
        edges,
        metadata: {
          expandedFrom: nodeId,
          depth: 1,
          totalFound: nodes.length,
          options,
        },
      };
    })());
  }

  /**
   * Health check - test if OpenAlex API is accessible
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple test request to verify API accessibility
      await this.client.works({
        filter: { has_doi: true },
        select: ['id'],
        per_page: 1
      });
      return true;
    } catch {
      return false;
    }
  }

  // Private helper methods

  private detectEntityType(id: string): EntityType {
    if (id.startsWith('W')) return 'works';
    if (id.startsWith('A')) return 'authors';
    if (id.startsWith('S')) return 'sources';
    if (id.startsWith('I')) return 'institutions';
    if (id.startsWith('T')) return 'topics';
    if (id.startsWith('P')) return 'publishers';
    if (id.startsWith('F')) return 'funders';
    if (id.startsWith('C')) return 'concepts';

    // Fallback: try to detect from URL patterns or other identifiers
    if (id.includes('doi.org')) return 'works';
    if (id.includes('orcid.org')) return 'authors';

    throw new Error(`Cannot detect entity type for ID: ${id}`);
  }

  private async fetchEntityData(id: string, entityType: EntityType): Promise<Record<string, unknown>> {
    switch (entityType) {
      case 'works':
        return this.client.getWork(id);
      case 'authors':
        return this.client.getAuthor(id);
      case 'sources':
        return this.client.getSource(id);
      case 'institutions':
        return this.client.getInstitution(id);
      case 'topics':
        return this.client.get('topics', id);
      case 'publishers':
        return this.client.get('publishers', id);
      case 'funders':
        return this.client.get('funders', id);
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  private extractLabel(data: Record<string, unknown>, entityType: EntityType): string {
    // Extract appropriate label based on entity type
    switch (entityType) {
      case 'works':
        return (data.title as string) || (data.display_name as string) || 'Untitled Work';
      case 'authors':
        return (data.display_name as string) || 'Unknown Author';
      case 'sources':
        return (data.display_name as string) || 'Unknown Source';
      case 'institutions':
        return (data.display_name as string) || 'Unknown Institution';
      default:
        return (data.display_name as string) || (data.name as string) || 'Unknown';
    }
  }

  private extractExternalIds(data: Record<string, unknown>, entityType: EntityType): ExternalIdentifier[] {
    const externalIds: ExternalIdentifier[] = [];

    // Extract IDs based on entity type
    const ids = data.ids as Record<string, string> || {};

    if (ids.doi) {
      externalIds.push({
        type: 'doi' as const,
        value: ids.doi,
        url: `https://doi.org/${ids.doi}`,
      });
    }

    if (ids.orcid) {
      externalIds.push({
        type: 'orcid' as const,
        value: ids.orcid,
        url: ids.orcid,
      });
    }

    if (ids.ror) {
      externalIds.push({
        type: 'ror' as const,
        value: ids.ror,
        url: `https://ror.org/${ids.ror}`,
      });
    }

    return externalIds;
  }

  private async searchByEntityType(query: string, entityType: EntityType, options: { limit?: number; offset?: number }): Promise<GraphNode[]> {
    let searchResults: any;

    switch (entityType) {
      case 'works':
        searchResults = await this.client.works({
          search: query,
          per_page: options.limit || 10,
        });
        break;
      case 'authors':
        searchResults = await this.client.authors({
          search: query,
          per_page: options.limit || 10,
        });
        break;
      case 'sources':
        searchResults = await this.client.sources({
          search: query,
          per_page: options.limit || 10,
        });
        break;
      case 'institutions':
        searchResults = await this.client.institutions({
          search: query,
          per_page: options.limit || 10,
        });
        break;
      default:
        return [];
    }

    // Convert results to GraphNode format
    return (searchResults.results || []).map((item: any) => ({
      id: item.id,
      entityType,
      entityId: item.id,
      label: this.extractLabel(item, entityType),
      x: Math.random() * 800,
      y: Math.random() * 600,
      externalIds: this.extractExternalIds(item, entityType),
      entityData: item,
    }));
  }

  private async expandWork(workId: string, workData: any, nodes: GraphNode[], edges: GraphEdge[], options: ProviderExpansionOptions): Promise<void> {
    // Add authors
    if (workData.authorships) {
      for (const authorship of workData.authorships.slice(0, options.limit || 10)) {
        if (authorship.author?.id) {
          const authorNode: GraphNode = {
            id: authorship.author.id,
            entityType: 'authors',
            entityId: authorship.author.id,
            label: authorship.author.display_name || 'Unknown Author',
            x: Math.random() * 800,
            y: Math.random() * 600,
            externalIds: this.extractExternalIds(authorship.author, 'authors'),
            entityData: authorship.author,
          };

          nodes.push(authorNode);
          edges.push({
            id: `${workId}-authored-${authorship.author.id}`,
            source: authorship.author.id,
            target: workId,
            type: RelationType.AUTHORED,
          });
        }
      }
    }

    // Add source (journal/venue)
    if (workData.primary_location?.source?.id) {
      const source = workData.primary_location.source;
      const sourceNode: GraphNode = {
        id: source.id,
        entityType: 'sources',
        entityId: source.id,
        label: source.display_name || 'Unknown Source',
        x: Math.random() * 800,
        y: Math.random() * 600,
        externalIds: this.extractExternalIds(source, 'sources'),
        entityData: source,
      };

      nodes.push(sourceNode);
      edges.push({
        id: `${workId}-published-in-${source.id}`,
        source: workId,
        target: source.id,
        type: RelationType.PUBLISHED_IN,
      });
    }
  }

  private async expandAuthor(authorId: string, authorData: any, nodes: GraphNode[], edges: GraphEdge[], options: ProviderExpansionOptions): Promise<void> {
    // Add recent works
    try {
      const works = await this.client.works({
        filter: { author: { id: authorId } },
        per_page: options.limit || 10,
        sort: 'publication_year:desc',
      });

      for (const work of works.results || []) {
        const workNode: GraphNode = {
          id: String(work.id),
          entityType: 'works',
          entityId: String(work.id),
          label: this.extractLabel(work, 'works'),
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: this.extractExternalIds(work, 'works'),
          entityData: work,
        };

        nodes.push(workNode);
        edges.push({
          id: `${authorId}-authored-${work.id}`,
          source: authorId,
          target: String(work.id),
          type: RelationType.AUTHORED,
        });
      }
    } catch (error) {
      console.warn(`Failed to expand author ${authorId}:`, error);
    }
  }

  private async expandSource(sourceId: string, sourceData: any, nodes: GraphNode[], edges: GraphEdge[], options: ProviderExpansionOptions): Promise<void> {
    // Add recent works published in this source
    try {
      const works = await this.client.works({
        filter: { primary_location: { source: { id: sourceId } } },
        per_page: options.limit || 10,
        sort: 'publication_year:desc',
      });

      for (const work of works.results || []) {
        const workNode: GraphNode = {
          id: String(work.id),
          entityType: 'works',
          entityId: String(work.id),
          label: this.extractLabel(work, 'works'),
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: this.extractExternalIds(work, 'works'),
          entityData: work,
        };

        nodes.push(workNode);
        edges.push({
          id: `${work.id}-published-in-${sourceId}`,
          source: String(work.id),
          target: sourceId,
          type: RelationType.PUBLISHED_IN,
        });
      }
    } catch (error) {
      console.warn(`Failed to expand source ${sourceId}:`, error);
    }
  }

  private async expandInstitution(institutionId: string, institutionData: any, nodes: GraphNode[], edges: GraphEdge[], options: ProviderExpansionOptions): Promise<void> {
    // Add authors affiliated with this institution
    try {
      const authors = await this.client.authors({
        filter: { last_known_institutions: { id: institutionId } },
        per_page: options.limit || 10,
      });

      for (const author of authors.results || []) {
        const authorNode: GraphNode = {
          id: String(author.id),
          entityType: 'authors',
          entityId: String(author.id),
          label: this.extractLabel(author, 'authors'),
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: this.extractExternalIds(author, 'authors'),
          entityData: author,
        };

        nodes.push(authorNode);
        edges.push({
          id: `${author.id}-affiliated-${institutionId}`,
          source: String(author.id),
          target: institutionId,
          type: RelationType.AFFILIATED,
        });
      }
    } catch (error) {
      console.warn(`Failed to expand institution ${institutionId}:`, error);
    }
  }

  private async expandTopic(topicId: string, topicData: any, nodes: GraphNode[], edges: GraphEdge[], options: ProviderExpansionOptions): Promise<void> {
    // Add recent works in this topic
    try {
      const works = await this.client.works({
        filter: { topics: { id: topicId } },
        per_page: options.limit || 10,
        sort: 'publication_year:desc',
      });

      for (const work of works.results || []) {
        const workNode: GraphNode = {
          id: String(work.id),
          entityType: 'works',
          entityId: String(work.id),
          label: this.extractLabel(work, 'works'),
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: this.extractExternalIds(work, 'works'),
          entityData: work,
        };

        nodes.push(workNode);
        edges.push({
          id: `${work.id}-has-topic-${topicId}`,
          source: String(work.id),
          target: topicId,
          type: RelationType.WORK_HAS_TOPIC,
        });
      }
    } catch (error) {
      console.warn(`Failed to expand topic ${topicId}:`, error);
    }
  }
}