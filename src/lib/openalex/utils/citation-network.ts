/**
 * Citation network utilities for exploring relationships between works and authors
 */

import type { OpenAlexClient } from '../client';
import type { Work, Author } from '../types';

export interface CitationNode {
  id: string;
  title: string;
  year?: number;
  citedByCount: number;
  depth: number;
  work?: Work;
}

export interface CitationEdge {
  source: string;
  target: string;
  type: 'cites' | 'cited_by';
}

export interface CitationNetwork {
  nodes: CitationNode[];
  edges: CitationEdge[];
}

export interface CoauthorNode {
  id: string;
  name: string;
  worksCount: number;
  citedByCount: number;
  author?: Author;
}

export interface CoauthorEdge {
  source: string;
  target: string;
  weight: number; // Number of co-authored works
  works: string[]; // IDs of co-authored works
}

export interface CoauthorNetwork {
  nodes: CoauthorNode[];
  edges: CoauthorEdge[];
}

/**
 * Citation network analysis utilities
 */
export class CitationNetworkAnalysis {
  constructor(private client: OpenAlexClient) {}

  /**
   * Get citation chain for a work (papers it cites and papers that cite it)
   * @param workId Work ID
   * @param depth How many levels deep to traverse
   * @param direction Direction to traverse ('forward' = cited by, 'backward' = references, 'both')
   * @example
   * const network = await citationNetwork.getCitationChain('W2741809807', 2, 'both');
   */
  async getCitationChain(
    workId: string,
    depth = 1,
    direction: 'forward' | 'backward' | 'both' = 'both'
  ): Promise<CitationNetwork> {
    const nodes = new Map<string, CitationNode>();
    const edges: CitationEdge[] = [];
    const visited = new Set<string>();

    // Get the root work
    const rootWork = await this.client.work(workId);
    nodes.set(rootWork.id, {
      id: rootWork.id,
      title: rootWork.title || rootWork.display_name || 'Untitled',
      year: rootWork.publication_year,
      citedByCount: rootWork.cited_by_count,
      depth: 0,
      work: rootWork
    });

    // Traverse the citation network
    await this.traverseCitations(
      rootWork.id,
      depth,
      direction,
      nodes,
      edges,
      visited,
      0
    );

    return {
      nodes: Array.from(nodes.values()),
      edges
    };
  }

  private async traverseCitations(
    workId: string,
    maxDepth: number,
    direction: 'forward' | 'backward' | 'both',
    nodes: Map<string, CitationNode>,
    edges: CitationEdge[],
    visited: Set<string>,
    currentDepth: number
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(workId)) {
      return;
    }

    visited.add(workId);

    // Get cited works (backward)
    if (direction === 'backward' || direction === 'both') {
      try {
        const work = nodes.get(workId)?.work || await this.client.work(workId);
        
        if (work.referenced_works && work.referenced_works.length > 0) {
          // Fetch referenced works in batches
          const referencedIds = work.referenced_works.slice(0, 20); // Limit to prevent overwhelming
          const referencedWorks = await this.client.worksBatch(referencedIds);

          for (const refWork of referencedWorks) {
            if (!nodes.has(refWork.id)) {
              nodes.set(refWork.id, {
                id: refWork.id,
                title: refWork.title || refWork.display_name || 'Untitled',
                year: refWork.publication_year,
                citedByCount: refWork.cited_by_count,
                depth: currentDepth + 1,
                work: refWork
              });
            }

            edges.push({
              source: workId,
              target: refWork.id,
              type: 'cites'
            });

            // Recursively traverse
            if (currentDepth + 1 < maxDepth) {
              await this.traverseCitations(
                refWork.id,
                maxDepth,
                direction,
                nodes,
                edges,
                visited,
                currentDepth + 1
              );
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching references for ${workId}:`, error);
      }
    }

    // Get citing works (forward)
    if (direction === 'forward' || direction === 'both') {
      try {
        const citingWorks = await this.client.works({
          filter: `cites:${workId}`,
          sort: 'cited_by_count:desc',
          per_page: 20 // Limit to prevent overwhelming
        });

        for (const citingWork of citingWorks.results) {
          if (!nodes.has(citingWork.id)) {
            nodes.set(citingWork.id, {
              id: citingWork.id,
              title: citingWork.title || citingWork.display_name || 'Untitled',
              year: citingWork.publication_year,
              citedByCount: citingWork.cited_by_count,
              depth: currentDepth + 1,
              work: citingWork
            });
          }

          edges.push({
            source: citingWork.id,
            target: workId,
            type: 'cites'
          });

          // Recursively traverse
          if (currentDepth + 1 < maxDepth) {
            await this.traverseCitations(
              citingWork.id,
              maxDepth,
              direction,
              nodes,
              edges,
              visited,
              currentDepth + 1
            );
          }
        }
      } catch (error) {
        console.error(`Error fetching citations for ${workId}:`, error);
      }
    }
  }

  /**
   * Get co-author network for an author
   * @param authorId Author ID or ORCID
   * @param depth Levels of co-authorship to explore
   * @example
   * const network = await citationNetwork.getCoauthorNetwork('A5023888391', 2);
   */
  async getCoauthorNetwork(
    authorId: string,
    depth = 1
  ): Promise<CoauthorNetwork> {
    const nodes = new Map<string, CoauthorNode>();
    const edges = new Map<string, CoauthorEdge>();
    const visited = new Set<string>();

    // Get the root author
    const rootAuthor = await this.client.author(authorId);
    nodes.set(rootAuthor.id, {
      id: rootAuthor.id,
      name: rootAuthor.display_name,
      worksCount: rootAuthor.works_count,
      citedByCount: rootAuthor.cited_by_count,
      author: rootAuthor
    });

    // Traverse the co-author network
    await this.traverseCoauthors(
      rootAuthor.id,
      depth,
      nodes,
      edges,
      visited,
      0
    );

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values())
    };
  }

  private async traverseCoauthors(
    authorId: string,
    maxDepth: number,
    nodes: Map<string, CoauthorNode>,
    edges: Map<string, CoauthorEdge>,
    visited: Set<string>,
    currentDepth: number
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(authorId)) {
      return;
    }

    visited.add(authorId);

    // Get author's recent works
    const worksResponse = await this.client.works({
      filter: `author.id:${authorId}`,
      sort: 'publication_date:desc',
      per_page: 50
    });

    // Extract co-authors
    const coauthorMap = new Map<string, string[]>(); // authorId -> workIds

    for (const work of worksResponse.results) {
      for (const authorship of work.authorships) {
        if (authorship.author.id && authorship.author.id !== authorId) {
          const coauthorId = authorship.author.id;
          if (!coauthorMap.has(coauthorId)) {
            coauthorMap.set(coauthorId, []);
          }
          coauthorMap.get(coauthorId)!.push(work.id);
        }
      }
    }

    // Fetch co-author details and create edges
    const coauthorIds = Array.from(coauthorMap.keys()).slice(0, 20); // Limit
    const coauthors = await this.client.authorsBatch(coauthorIds);

    for (const coauthor of coauthors) {
      if (!nodes.has(coauthor.id)) {
        nodes.set(coauthor.id, {
          id: coauthor.id,
          name: coauthor.display_name,
          worksCount: coauthor.works_count,
          citedByCount: coauthor.cited_by_count,
          author: coauthor
        });
      }

      const edgeKey = [authorId, coauthor.id].sort().join('-');
      const sharedWorks = coauthorMap.get(coauthor.id) || [];
      
      if (!edges.has(edgeKey)) {
        edges.set(edgeKey, {
          source: authorId,
          target: coauthor.id,
          weight: sharedWorks.length,
          works: sharedWorks
        });
      }

      // Recursively traverse
      if (currentDepth + 1 < maxDepth) {
        await this.traverseCoauthors(
          coauthor.id,
          maxDepth,
          nodes,
          edges,
          visited,
          currentDepth + 1
        );
      }
    }
  }

  /**
   * Get related works based on citations and references
   * @param workId Work ID
   * @param limit Maximum number of related works
   * @example
   * const relatedWorks = await citationNetwork.getRelatedWorks('W2741809807', 10);
   */
  async getRelatedWorks(
    workId: string,
    limit = 10
  ): Promise<Work[]> {
    const work = await this.client.work(workId);
    const relatedIds = new Set<string>();

    // Get works that cite the same references
    if (work.referenced_works && work.referenced_works.length > 0) {
      const sampleRefs = work.referenced_works.slice(0, 5);
      
      for (const refId of sampleRefs) {
        const citingWorks = await this.client.works({
          filter: `cites:${refId}`,
          sort: 'cited_by_count:desc',
          per_page: 5
        });

        for (const citingWork of citingWorks.results) {
          if (citingWork.id !== workId) {
            relatedIds.add(citingWork.id);
          }
        }
      }
    }

    // Get works by the same authors
    for (const authorship of work.authorships.slice(0, 3)) {
      if (authorship.author.id) {
        const authorWorks = await this.client.works({
          filter: `author.id:${authorship.author.id}`,
          sort: 'cited_by_count:desc',
          per_page: 5
        });

        for (const authorWork of authorWorks.results) {
          if (authorWork.id !== workId) {
            relatedIds.add(authorWork.id);
          }
        }
      }
    }

    // Get works with similar topics
    if (work.topics && work.topics.length > 0) {
      const topicId = work.topics[0].id;
      const topicWorks = await this.client.works({
        filter: `topics.id:${topicId}`,
        sort: 'cited_by_count:desc',
        per_page: 5
      });

      for (const topicWork of topicWorks.results) {
        if (topicWork.id !== workId) {
          relatedIds.add(topicWork.id);
        }
      }
    }

    // Fetch and return the related works
    const ids = Array.from(relatedIds).slice(0, limit);
    return this.client.worksBatch(ids);
  }

  /**
   * Calculate citation metrics for a set of works
   * @param works Array of Work objects
   * @returns Citation statistics
   */
  calculateCitationMetrics(works: Work[]): {
    totalCitations: number;
    averageCitations: number;
    medianCitations: number;
    h_index: number;
    citationDistribution: Record<string, number>;
  } {
    const citations = works.map(w => w.cited_by_count).sort((a, b) => b - a);
    
    const totalCitations = citations.reduce((sum, c) => sum + c, 0);
    const averageCitations = citations.length > 0 ? totalCitations / citations.length : 0;
    
    // Calculate median
    const medianCitations = citations.length > 0
      ? citations.length % 2 === 0
        ? (citations[citations.length / 2 - 1] + citations[citations.length / 2]) / 2
        : citations[Math.floor(citations.length / 2)]
      : 0;

    // Calculate h-index
    let h_index = 0;
    for (let i = 0; i < citations.length; i++) {
      if (citations[i] >= i + 1) {
        h_index = i + 1;
      } else {
        break;
      }
    }

    // Citation distribution
    const distribution: Record<string, number> = {
      '0': 0,
      '1-10': 0,
      '11-50': 0,
      '51-100': 0,
      '101-500': 0,
      '500+': 0
    };

    for (const count of citations) {
      if (count === 0) distribution['0']++;
      else if (count <= 10) distribution['1-10']++;
      else if (count <= 50) distribution['11-50']++;
      else if (count <= 100) distribution['51-100']++;
      else if (count <= 500) distribution['101-500']++;
      else distribution['500+']++;
    }

    return {
      totalCitations,
      averageCitations,
      medianCitations,
      h_index,
      citationDistribution: distribution
    };
  }
}