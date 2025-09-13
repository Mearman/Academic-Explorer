/**
 * Graph data service for integrating OpenAlex API with graph visualization
 * Handles data transformation, caching, and progressive loading
 */

import { openAlex } from '@/lib/openalex/openalex-client';
import { EntityDetector } from '@/lib/graph/utils/entity-detection';
import { useGraphStore } from '@/stores/graph-store';
import type {
  GraphNode,
  GraphEdge,
  EntityType,
  RelationType,
  ExternalIdentifier,
  SearchOptions,
  GraphCache,
} from '@/lib/graph/types';
import type {
  Work,
  Author,
  Source,
  InstitutionEntity,
  OpenAlexEntity,
} from '@/lib/openalex/types';

export class GraphDataService {
  private detector: EntityDetector;
  private cache: GraphCache;

  constructor() {
    this.detector = new EntityDetector();
    this.cache = {
      nodes: new Map(),
      edges: new Map(),
      expandedNodes: new Set(),
      fetchedRelationships: new Map(),
    };
  }

  /**
   * Load initial graph for an entity
   */
  async loadEntityGraph(entityId: string): Promise<void> {
    const store = useGraphStore.getState();
    store.setLoading(true);
    store.setError(null);

    try {
      // Detect entity type
      const detection = this.detector.detectEntityIdentifier(entityId);

      if (!detection.entityType) {
        throw new Error(`Unable to detect entity type for: ${entityId}`);
      }

      // Fetch entity with OpenAlex client
      const entity = await openAlex.getEntity(detection.normalizedId);

      // Transform to graph data
      const { nodes, edges } = this.transformEntityToGraph(entity);

      // Clear existing graph and add new data
      store.clear();
      store.addNodes(nodes);
      store.addEdges(edges);

      // Apply force layout
      store.provider?.applyLayout({ type: 'force' });
      store.provider?.fitView();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      store.setError(errorMessage);
      console.error('Failed to load entity graph:', error);
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * Expand a node to show related entities
   */
  async expandNode(nodeId: string, options: {
    depth?: number;
    limit?: number;
    relationTypes?: RelationType[];
  } = {}): Promise<void> {
    // Check if already expanded
    if (this.cache.expandedNodes.has(nodeId)) {
      return;
    }

    const { limit = 10 } = options;
    const store = useGraphStore.getState();

    try {
      // Get the node to expand
      const node = store.nodes.get(nodeId);
      if (!node) return;

      // Fetch related entities based on node type
      let relatedData: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [], edges: [] };

      switch (node.type) {
        case 'authors':
          relatedData = await this.expandAuthor(node.entityId, { limit });
          break;
        case 'works':
          relatedData = await this.expandWork(node.entityId, { limit });
          break;
        case 'sources':
          relatedData = await this.expandSource(node.entityId, { limit });
          break;
        case 'institutions':
          relatedData = await this.expandInstitution(node.entityId, { limit });
          break;
        default:
          console.warn(`Expansion not implemented for entity type: ${node.type}`);
          return;
      }

      // Add new nodes and edges to the graph
      store.addNodes(relatedData.nodes);
      store.addEdges(relatedData.edges);

      // Mark as expanded
      this.cache.expandedNodes.add(nodeId);

      // Apply layout update
      store.provider?.applyLayout({ type: 'force' });

    } catch (error) {
      console.error('Failed to expand node:', error);
    }
  }

  /**
   * Search and add results to graph
   */
  async searchAndVisualize(query: string, options: SearchOptions): Promise<void> {
    const store = useGraphStore.getState();
    store.setLoading(true);
    store.setError(null);

    try {
      const results = await openAlex.searchAll(query, {
        entityTypes: options.entityTypes,
        limit: options.limit || 20,
      });

      const { nodes, edges } = this.transformSearchResults(results);

      // Clear existing graph and add search results
      store.clear();
      store.addNodes(nodes);
      store.addEdges(edges);

      // Apply appropriate layout
      const layout = this.determineLayout(nodes.length, edges.length);
      store.provider?.applyLayout(layout);
      store.provider?.fitView();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      store.setError(errorMessage);
      console.error('Failed to search and visualize:', error);
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * Transform OpenAlex entity to graph nodes and edges
   */
  private transformEntityToGraph(entity: OpenAlexEntity): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Determine entity type
    const detection = this.detector.detectEntityIdentifier(entity.id);
    const entityType = detection.entityType as EntityType;

    // Create main entity node
    const mainNode = this.createNodeFromEntity(entity, entityType);
    nodes.push(mainNode);

    // Transform based on entity type
    switch (entityType) {
      case 'work':
        const workData = this.transformWork(entity as Work, mainNode);
        nodes.push(...workData.nodes);
        edges.push(...workData.edges);
        break;

      case 'author':
        const authorData = this.transformAuthor(entity as Author, mainNode);
        nodes.push(...authorData.nodes);
        edges.push(...authorData.edges);
        break;

      case 'source':
        const sourceData = this.transformSource(entity as Source, mainNode);
        nodes.push(...sourceData.nodes);
        edges.push(...sourceData.edges);
        break;

      case 'institution':
        const institutionData = this.transformInstitution(entity as InstitutionEntity, mainNode);
        nodes.push(...institutionData.nodes);
        edges.push(...institutionData.edges);
        break;
    }

    return { nodes, edges };
  }

  /**
   * Transform Work entity
   */
  private transformWork(work: Work, mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Add author nodes and authorship edges
    work.authorships?.slice(0, 5).forEach((authorship, index) => {
      const authorNode: GraphNode = {
        id: authorship.author.id,
        type: 'authors' as EntityType,
        label: authorship.author.display_name,
        entityId: authorship.author.id,
        position: { x: (index - 2) * 150, y: -150 },
        externalIds: authorship.author.orcid ? [
          {
            type: 'orcid',
            value: authorship.author.orcid,
            url: `https://orcid.org/${authorship.author.orcid}`,
          }
        ] : [],
        metadata: {
          position: authorship.author_position,
        }
      };
      nodes.push(authorNode);

      edges.push({
        id: `${authorship.author.id}-authored-${work.id}`,
        source: authorship.author.id,
        target: work.id,
        type: 'authored' as RelationType,
        weight: authorship.author_position === 'first' ? 1.0 : 0.5,
      });
    });

    // Add source/journal node
    if (work.primary_location?.source) {
      const sourceNode: GraphNode = {
        id: work.primary_location.source.id,
        type: 'sources' as EntityType,
        label: work.primary_location.source.display_name,
        entityId: work.primary_location.source.id,
        position: { x: 0, y: 150 },
        externalIds: work.primary_location.source.issn_l ? [
          {
            type: 'issn_l',
            value: work.primary_location.source.issn_l,
            url: `https://portal.issn.org/resource/ISSN/${work.primary_location.source.issn_l}`,
          }
        ] : [],
      };
      nodes.push(sourceNode);

      edges.push({
        id: `${work.id}-published-in-${work.primary_location.source.id}`,
        source: work.id,
        target: work.primary_location.source.id,
        type: 'published_in' as RelationType,
      });
    }

    // Add a few cited works (if available)
    work.referenced_works?.slice(0, 3).forEach((citedWorkId, index) => {
      // Create placeholder nodes for cited works (would need separate API calls to get full data)
      const citedNode: GraphNode = {
        id: citedWorkId,
        type: 'works' as EntityType,
        label: `Referenced Work ${index + 1}`,
        entityId: citedWorkId,
        position: { x: (index - 1) * 200, y: 300 },
        externalIds: [],
        metadata: { isPlaceholder: true },
      };
      nodes.push(citedNode);

      edges.push({
        id: `${work.id}-cites-${citedWorkId}`,
        source: work.id,
        target: citedWorkId,
        type: 'cited' as RelationType,
      });
    });

    return { nodes, edges };
  }

  /**
   * Transform Author entity (basic implementation)
   */
  private transformAuthor(author: Author, mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Add affiliated institutions
    author.affiliations?.slice(0, 3).forEach((affiliation, index) => {
      const institutionNode: GraphNode = {
        id: affiliation.institution.id,
        type: 'institutions' as EntityType,
        label: affiliation.institution.display_name,
        entityId: affiliation.institution.id,
        position: { x: (index - 1) * 200, y: 150 },
        externalIds: affiliation.institution.ror ? [
          {
            type: 'ror',
            value: affiliation.institution.ror,
            url: `https://ror.org/${affiliation.institution.ror}`,
          }
        ] : [],
      };
      nodes.push(institutionNode);

      edges.push({
        id: `${author.id}-affiliated-${affiliation.institution.id}`,
        source: author.id,
        target: affiliation.institution.id,
        type: 'affiliated' as RelationType,
      });
    });

    return { nodes, edges };
  }

  /**
   * Transform Source entity (basic implementation)
   */
  private transformSource(source: Source, mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Add publisher if available
    if (source.host_organization) {
      const publisherNode: GraphNode = {
        id: source.host_organization,
        type: 'publishers' as EntityType,
        label: source.host_organization_name || 'Publisher',
        entityId: source.host_organization,
        position: { x: 0, y: 150 },
        externalIds: [],
      };
      nodes.push(publisherNode);

      edges.push({
        id: `${source.id}-published-by-${source.host_organization}`,
        source: source.id,
        target: source.host_organization,
        type: 'published_in' as RelationType,
      });
    }

    return { nodes, edges };
  }

  /**
   * Transform Institution entity (basic implementation)
   */
  private transformInstitution(institution: InstitutionEntity, mainNode: GraphNode): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Add parent institutions from lineage
    institution.lineage?.slice(0, 2).forEach((parentId, index) => {
      if (parentId !== institution.id) {
        const parentNode: GraphNode = {
          id: parentId,
          type: 'institutions' as EntityType,
          label: `Parent Institution ${index + 1}`,
          entityId: parentId,
          position: { x: (index - 0.5) * 200, y: -150 },
          externalIds: [],
          metadata: { isPlaceholder: true },
        };
        nodes.push(parentNode);

        edges.push({
          id: `${institution.id}-part-of-${parentId}`,
          source: institution.id,
          target: parentId,
          type: 'affiliated' as RelationType,
        });
      }
    });

    return { nodes, edges };
  }

  /**
   * Create a graph node from an OpenAlex entity
   */
  private createNodeFromEntity(entity: OpenAlexEntity, entityType: EntityType): GraphNode {
    const externalIds = this.extractExternalIds(entity, entityType);

    return {
      id: entity.id,
      type: entityType,
      label: entity.display_name || 'Unknown Entity',
      entityId: entity.id,
      position: { x: 0, y: 0 }, // Will be updated by layout
      externalIds,
      metadata: this.extractMetadata(entity, entityType),
    };
  }

  /**
   * Extract external identifiers from entity
   */
  private extractExternalIds(entity: OpenAlexEntity, entityType: EntityType): ExternalIdentifier[] {
    const externalIds: ExternalIdentifier[] = [];

    switch (entityType) {
      case 'work':
        const work = entity as Work;
        if (work.doi) {
          externalIds.push({
            type: 'doi',
            value: work.doi,
            url: `https://doi.org/${work.doi}`,
          });
        }
        break;

      case 'author':
        const author = entity as Author;
        if (author.orcid) {
          externalIds.push({
            type: 'orcid',
            value: author.orcid,
            url: author.orcid.startsWith('http') ? author.orcid : `https://orcid.org/${author.orcid}`,
          });
        }
        break;

      case 'source':
        const source = entity as Source;
        if (source.issn_l) {
          externalIds.push({
            type: 'issn_l',
            value: source.issn_l,
            url: `https://portal.issn.org/resource/ISSN/${source.issn_l}`,
          });
        }
        break;

      case 'institution':
        const institution = entity as InstitutionEntity;
        if (institution.ror) {
          externalIds.push({
            type: 'ror',
            value: institution.ror,
            url: institution.ror.startsWith('http') ? institution.ror : `https://ror.org/${institution.ror}`,
          });
        }
        break;
    }

    return externalIds;
  }

  /**
   * Extract metadata from entity for display
   */
  private extractMetadata(entity: OpenAlexEntity, entityType: EntityType): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    switch (entityType) {
      case 'work':
        const work = entity as Work;
        metadata.year = work.publication_year;
        metadata.citationCount = work.cited_by_count;
        metadata.openAccess = work.open_access?.is_oa;
        break;

      case 'author':
        const author = entity as Author;
        metadata.worksCount = author.works_count;
        metadata.citationCount = author.cited_by_count;
        break;

      case 'source':
        const source = entity as Source;
        metadata.worksCount = source.works_count;
        metadata.type = source.type;
        break;

      case 'institution':
        const institution = entity as InstitutionEntity;
        metadata.worksCount = institution.works_count;
        metadata.country = institution.country_code;
        metadata.type = institution.type;
        break;
    }

    return metadata;
  }

  // Placeholder methods for expansion (to be implemented)
  private async expandAuthor(authorId: string, options: { limit: number }): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    try {
      // Fetch the author's recent works
      const worksQuery = await openAlex.works.getWorks({
        filter: { author: authorId },
        per_page: Math.min(options.limit, 8),
        sort: 'publication_year:desc'
      });

      worksQuery.results.forEach((work) => {
        // Add work node
        const workNode: GraphNode = {
          id: work.id,
          type: 'works' as EntityType,
          label: work.display_name || 'Untitled Work',
          entityId: work.id,
          position: { x: Math.random() * 400 - 200, y: Math.random() * 300 - 150 },
          externalIds: work.doi ? [{
            type: 'doi',
            value: work.doi,
            url: `https://doi.org/${work.doi}`,
          }] : [],
          metadata: {
            year: work.publication_year,
            citationCount: work.cited_by_count,
            openAccess: work.open_access?.is_oa,
          },
        };
        nodes.push(workNode);

        // Add authorship edge
        edges.push({
          id: `${authorId}-authored-${work.id}`,
          source: authorId,
          target: work.id,
          type: 'authored' as RelationType,
          label: 'authored',
        });

        // Add co-authors from the first few works to show collaboration
        if (nodes.length <= 3 && work.authorships) { // Only for first few works to avoid clutter
          work.authorships.slice(0, 3).forEach((authorship) => {
            if (authorship.author.id !== authorId) { // Skip the main author
              const coAuthorNode: GraphNode = {
                id: authorship.author.id,
                type: 'authors' as EntityType,
                label: authorship.author.display_name || 'Unknown Author',
                entityId: authorship.author.id,
                position: { x: Math.random() * 400 - 200, y: Math.random() * 300 - 150 },
                externalIds: authorship.author.orcid ? [{
                  type: 'orcid',
                  value: authorship.author.orcid,
                  url: `https://orcid.org/${authorship.author.orcid}`,
                }] : [],
                metadata: {
                  worksCount: authorship.author.works_count,
                  citationCount: authorship.author.cited_by_count,
                },
              };

              // Only add if not already present
              if (!nodes.some(n => n.id === coAuthorNode.id)) {
                nodes.push(coAuthorNode);

                // Add co-authorship edge
                edges.push({
                  id: `${authorId}-collaborated-${authorship.author.id}`,
                  source: authorId,
                  target: authorship.author.id,
                  type: 'co_authored' as RelationType,
                  label: 'collaborated',
                });

                // Add co-author to work edge
                edges.push({
                  id: `${authorship.author.id}-authored-${work.id}`,
                  source: authorship.author.id,
                  target: work.id,
                  type: 'authored' as RelationType,
                  label: 'authored',
                });
              }
            }
          });
        }
      });

    } catch (error) {
      console.error(`Failed to expand author ${authorId}:`, error);
    }

    return { nodes, edges };
  }

  private async expandWork(workId: string, options: { limit: number }): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    try {
      // Fetch the work to get its citations and references
      const work = await openAlex.works.getWork(workId) as Work;

      // Add citations (works that cite this work)
      if (work.cited_by_count > 0) {
        const citationsQuery = await openAlex.works.getWorks({
          filter: { cites: workId },
          per_page: Math.min(options.limit, 5), // Limit citations to avoid clutter
          sort: 'cited_by_count:desc'
        });

        citationsQuery.results.forEach((citingWork) => {
          // Add citing work node
          const citingNode: GraphNode = {
            id: citingWork.id,
            type: 'works' as EntityType,
            label: citingWork.display_name || 'Untitled Work',
            entityId: citingWork.id,
            position: { x: Math.random() * 400 - 200, y: -150 + Math.random() * 50 },
            externalIds: citingWork.doi ? [{
              type: 'doi',
              value: citingWork.doi,
              url: `https://doi.org/${citingWork.doi}`,
            }] : [],
            metadata: {
              year: citingWork.publication_year,
              citationCount: citingWork.cited_by_count,
              openAccess: citingWork.open_access?.is_oa,
            },
          };
          nodes.push(citingNode);

          // Add citation edge
          edges.push({
            id: `${citingWork.id}-cites-${workId}`,
            source: citingWork.id,
            target: workId,
            type: 'cited' as RelationType,
            label: 'cites',
          });
        });
      }

      // Add references (works this work cites)
      if (work.referenced_works && work.referenced_works.length > 0) {
        const referencesSlice = work.referenced_works.slice(0, Math.min(options.limit, 5));

        // Fetch reference details in batches
        const referencePromises = referencesSlice.map(async (refId) => {
          try {
            const refWork = await openAlex.works.getWork(refId) as Work;
            return refWork;
          } catch (error) {
            console.warn(`Failed to fetch reference work ${refId}:`, error);
            return null;
          }
        });

        const references = (await Promise.all(referencePromises)).filter(Boolean) as Work[];

        references.forEach((refWork) => {
          // Add reference work node
          const refNode: GraphNode = {
            id: refWork.id,
            type: 'works' as EntityType,
            label: refWork.display_name || 'Untitled Work',
            entityId: refWork.id,
            position: { x: Math.random() * 400 - 200, y: 150 + Math.random() * 50 },
            externalIds: refWork.doi ? [{
              type: 'doi',
              value: refWork.doi,
              url: `https://doi.org/${refWork.doi}`,
            }] : [],
            metadata: {
              year: refWork.publication_year,
              citationCount: refWork.cited_by_count,
              openAccess: refWork.open_access?.is_oa,
            },
          };
          nodes.push(refNode);

          // Add reference edge
          edges.push({
            id: `${workId}-references-${refWork.id}`,
            source: workId,
            target: refWork.id,
            type: 'references' as RelationType,
            label: 'references',
          });
        });
      }

    } catch (error) {
      console.error(`Failed to expand work ${workId}:`, error);
    }

    return { nodes, edges };
  }

  private async expandSource(sourceId: string, options: { limit: number }): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    // TODO: Implement source expansion (recent papers)
    return { nodes: [], edges: [] };
  }

  private async expandInstitution(institutionId: string, options: { limit: number }): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    // TODO: Implement institution expansion (affiliated authors, recent works)
    return { nodes: [], edges: [] };
  }

  private transformSearchResults(results: any): { nodes: GraphNode[]; edges: GraphEdge[] } {
    // TODO: Implement search results transformation
    return { nodes: [], edges: [] };
  }

  private determineLayout(nodeCount: number, edgeCount: number) {
    if (nodeCount <= 5) {
      return { type: 'circular' as const };
    } else if (nodeCount <= 20) {
      return { type: 'force' as const };
    } else {
      return { type: 'hierarchical' as const };
    }
  }
}