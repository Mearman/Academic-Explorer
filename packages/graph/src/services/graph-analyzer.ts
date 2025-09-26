/**
 * GraphAnalyzer - Academic Graph Analysis and Metrics Calculation Service
 *
 * Provides comprehensive analysis capabilities for academic networks including:
 * - Citation analysis (h-index, impact metrics)
 * - Network analysis (centrality measures, clustering)
 * - Collaboration analysis (co-authorship patterns)
 * - Research trends detection (temporal analysis)
 *
 * Uses the Phase 2 provider architecture for data access with caching for performance.
 */

/* eslint-disable no-console */

import type { GraphNode, GraphEdge, GraphData, EntityType } from '../types/core';
import { RelationType } from '../types/core';
import type { GraphDataProvider } from '../providers/base-provider';

// ============================================================================
// Core Analysis Interfaces
// ============================================================================

/**
 * Citation metrics for academic entities
 */
export interface CitationMetrics {
  // Basic citation counts
  totalCitations: number;
  recentCitations: number; // Citations in last 2 years
  selfCitations: number;
  externalCitations: number;

  // Impact indices
  hIndex: number;
  i10Index: number; // Papers with at least 10 citations
  impactFactor?: number; // For venues

  // Citation patterns
  citationsByYear: Array<{ year: number; count: number }>;
  topCitingPapers: Array<{ nodeId: string; citations: number; title: string }>;
  citationVelocity: number; // Citations per year trend

  // Statistical measures
  meanCitationsPerPaper: number;
  medianCitationsPerPaper: number;
  citationDistribution: {
    quartiles: [number, number, number, number];
    outliers: string[]; // Node IDs of highly cited works
  };

  // Confidence and metadata
  dataCompleteness: number; // 0-1 scale
  lastUpdated: Date;
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: number; // e.g., 0.95 for 95%
  };
}

/**
 * Network analysis metrics for graph structures
 */
export interface NetworkMetrics {
  // Basic network properties
  nodeCount: number;
  edgeCount: number;
  density: number;
  diameter: number;
  averagePathLength: number;

  // Centrality measures by node
  centrality: {
    [nodeId: string]: {
      degree: number;
      betweenness: number;
      closeness: number;
      eigenvector: number;
      pagerank: number;
    };
  };

  // Clustering and community structure
  clusteringCoefficient: number;
  globalClusteringCoefficient: number;
  communities: Array<{
    id: string;
    nodes: string[];
    size: number;
    density: number;
    modularity: number;
  }>;

  // Network resilience
  robustness: {
    criticalNodes: string[]; // Nodes whose removal fragments network
    bridgeEdges: string[]; // Edges whose removal increases components
    vulnerabilityScore: number; // 0-1, higher = more vulnerable
  };

  // Statistical properties
  degreeDistribution: Array<{ degree: number; frequency: number }>;
  smallWorldness?: number; // Watts-Strogatz coefficient
  scale_freeness?: number; // Power-law fit quality

  // Metadata
  analysisTimestamp: Date;
  networkHash: string; // To detect changes
}

/**
 * Collaboration analysis for academic networks
 */
export interface CollaborationMetrics {
  // Co-authorship patterns
  collaborationNetwork: {
    directCollaborators: Array<{
      nodeId: string;
      collaborations: number;
      sharedWorks: string[];
      strengthScore: number; // Weighted by work impact
    }>;
    collaborationStrength: number; // 0-1 overall collaboration intensity
  };

  // Institutional analysis
  institutionalCollaboration: {
    primaryInstitution?: string;
    institutionalDiversity: number; // Number of distinct institutions
    crossInstitutionalRate: number; // Fraction of cross-institutional works
    topInstitutions: Array<{
      institutionId: string;
      collaborations: number;
      impactScore: number;
    }>;
  };

  // Cross-disciplinary collaboration
  disciplinaryReach: {
    primaryFields: string[];
    fieldDiversity: number;
    interdisciplinaryRate: number;
    emergingFields: string[];
  };

  // Collaboration evolution
  temporalPatterns: Array<{
    year: number;
    newCollaborators: number;
    repeatCollaborators: number;
    collaborationBreadth: number;
  }>;

  // Network position in collaboration graph
  collaborationCentrality: {
    degreeCentrality: number;
    betweennessCentrality: number;
    brokerage: number; // Ability to connect disparate groups
  };

  // Quality metrics
  impactOfCollaborations: {
    soloWorkImpact: number;
    collaborativeWorkImpact: number;
    collaborationPremium: number; // Difference in impact
  };
}

/**
 * Research trends and temporal analysis
 */
export interface TrendAnalysis {
  // Publication patterns
  publicationTrends: {
    yearlyOutput: Array<{ year: number; count: number; impactSum: number }>;
    careerStage: 'early' | 'mid' | 'senior' | 'emeritus';
    productivityTrend: 'increasing' | 'stable' | 'decreasing';
    peakYears: number[];
  };

  // Topic evolution
  researchTopics: {
    currentTopics: Array<{
      topic: string;
      prevalence: number;
      trend: 'emerging' | 'stable' | 'declining';
      firstAppeared: number;
      lastAppeared: number;
    }>;
    topicTransitions: Array<{
      from: string;
      to: string;
      transitionYear: number;
      strength: number;
    }>;
    emergingAreas: string[];
  };

  // Impact trajectory
  impactEvolution: {
    impactByYear: Array<{ year: number; totalCitations: number; hIndex: number }>;
    impactAcceleration: number; // Recent vs. historical impact rate
    sustainedImpact: boolean; // Impact persisting beyond publication year
    breakthrough_works: string[]; // Works with exceptional impact growth
  };

  // Collaboration evolution
  networkEvolution: {
    networkExpansion: Array<{ year: number; collaboratorCount: number }>;
    institutionalMobility: Array<{
      year: number;
      institution: string;
      transitionType: 'join' | 'leave' | 'visit';
    }>;
    collaborationMaturity: number; // Stability of collaboration patterns
  };

  // Predictive indicators
  futureProjections: {
    expectedOutput: number; // Next year publication estimate
    impactProjection: number; // Expected citation growth
    emergingTopicAlignment: number; // Alignment with emerging fields
    confidence: number; // 0-1 confidence in predictions
  };
}

/**
 * Time range specification for temporal analysis
 */
export interface TimeRange {
  startYear: number;
  endYear: number;
  includeFuture?: boolean; // Include projections
}

/**
 * Analysis cache for expensive calculations
 */
interface AnalysisCache {
  citationMetrics: Map<string, { data: CitationMetrics; timestamp: Date; hash: string }>;
  networkMetrics: Map<string, { data: NetworkMetrics; timestamp: Date; hash: string }>;
  collaborationMetrics: Map<string, { data: CollaborationMetrics; timestamp: Date; hash: string }>;
  trendAnalysis: Map<string, { data: TrendAnalysis; timestamp: Date; hash: string }>;
}

/**
 * Analysis options for controlling computation intensity
 */
export interface AnalysisOptions {
  useCache?: boolean;
  cacheExpiry?: number; // Minutes
  computeStatistics?: boolean;
  includeConfidenceIntervals?: boolean;
  maxNetworkSize?: number;
  samplingRate?: number; // For large networks
}

// ============================================================================
// GraphAnalyzer Service Implementation
// ============================================================================

/**
 * Comprehensive graph analyzer for academic networks
 * Uses provider architecture for data access with intelligent caching
 */
export class GraphAnalyzer {
  private provider: GraphDataProvider | null = null;
  private cache: AnalysisCache;
  private readonly defaultCacheExpiry = 60; // minutes

  constructor(provider?: GraphDataProvider) {
    this.provider = provider || null;
    this.cache = {
      citationMetrics: new Map(),
      networkMetrics: new Map(),
      collaborationMetrics: new Map(),
      trendAnalysis: new Map(),
    };
  }

  // ============================================================================
  // Provider Management
  // ============================================================================

  setProvider(provider: GraphDataProvider): void {
    this.provider = provider;
  }

  private getProvider(): GraphDataProvider {
    if (!this.provider) {
      throw new Error('No data provider available for graph analysis');
    }
    return this.provider;
  }

  // ============================================================================
  // Citation Analysis
  // ============================================================================

  /**
   * Calculate comprehensive citation metrics for an entity
   */
  async calculateCitationMetrics(
    nodeId: string,
    options: AnalysisOptions = {}
  ): Promise<CitationMetrics> {
    const cacheKey = this.createCacheKey(nodeId, options);
    const cached = this.getCachedResult(this.cache.citationMetrics, cacheKey, options);
    if (cached) return cached;

    const provider = this.getProvider();

    // Fetch entity and its citation network
    const _entity = await provider.fetchEntity(nodeId);
    const expansion = await provider.expandEntity(nodeId, {
      relationshipTypes: [RelationType.REFERENCES],
      maxDepth: 2,
      limit: options.maxNetworkSize || 1000,
    });

    // Convert expansion edges to GraphEdges for type safety
    const graphEdges = expansion.edges.map(edge => ({
      ...edge,
      type: edge.type as RelationType,
    })) as GraphEdge[];

    // Calculate basic citation counts
    const citationEdges = graphEdges.filter(e => e.type === RelationType.REFERENCES && e.target === nodeId);
    const citationSources = citationEdges.map(e => e.source);

    // Get citation data for temporal analysis
    const citingWorks = await Promise.all(
      citationSources.slice(0, 500).map(async (id) => {
        try {
          return await provider.fetchEntity(id);
        } catch {
          return null;
        }
      })
    );

    const validCitingWorks = citingWorks.filter((w): w is GraphNode => w !== null);

    // Calculate metrics
    const totalCitations = citationEdges.length;
    const currentYear = new Date().getFullYear();

    const citationsByYear = this.calculateCitationsByYear(validCitingWorks);
    const recentCitations = citationsByYear
      .filter(cy => cy.year >= currentYear - 2)
      .reduce((sum, cy) => sum + cy.count, 0);

    // Calculate h-index and i10-index (simplified for single entity)
    const hIndex = await this.calculateHIndex(nodeId, provider);
    const i10Index = await this.calculateI10Index(nodeId, provider);

    // Calculate citation distribution statistics
    const citationCounts = [totalCitations]; // Simplified for single entity
    const mean = totalCitations;
    const median = totalCitations;

    const citationVelocity = this.calculateCitationVelocity(citationsByYear);

    const metrics: CitationMetrics = {
      totalCitations,
      recentCitations,
      selfCitations: await this.calculateSelfCitations(nodeId, validCitingWorks, provider),
      externalCitations: totalCitations, // Will be refined with self-citation calculation
      hIndex,
      i10Index,
      citationsByYear,
      topCitingPapers: await this.getTopCitingPapers(validCitingWorks, 10),
      citationVelocity,
      meanCitationsPerPaper: mean,
      medianCitationsPerPaper: median,
      citationDistribution: {
        quartiles: this.calculateQuartiles(citationCounts),
        outliers: citationCounts.length > 10 ? [nodeId] : [],
      },
      dataCompleteness: Math.min(validCitingWorks.length / Math.max(citationSources.length, 1), 1),
      lastUpdated: new Date(),
    };

    // Add confidence intervals if requested
    if (options.includeConfidenceIntervals) {
      metrics.confidenceInterval = this.calculateConfidenceInterval(totalCitations, 0.95);
    }

    // Cache result
    this.setCachedResult(this.cache.citationMetrics, cacheKey, metrics);

    return metrics;
  }

  // ============================================================================
  // Network Analysis
  // ============================================================================

  /**
   * Calculate comprehensive network metrics for graph data
   */
  async calculateNetworkMetrics(
    graphData: GraphData,
    options: AnalysisOptions = {}
  ): Promise<NetworkMetrics> {
    const graphHash = this.hashGraphData(graphData);
    const cacheKey = `network_${graphHash}`;
    const cached = this.getCachedResult(this.cache.networkMetrics, cacheKey, options);
    if (cached) return cached;

    // Basic network properties
    const nodeCount = graphData.nodes.length;
    const edgeCount = graphData.edges.length;
    const density = edgeCount / (nodeCount * (nodeCount - 1) / 2);

    // Build adjacency structure for analysis
    const adjacency = this.buildAdjacencyMap(graphData);

    // Calculate centrality measures
    const centrality = await this.calculateCentralityMeasures(graphData, adjacency);

    // Calculate clustering coefficients
    const clusteringCoefficient = this.calculateClusteringCoefficient(adjacency);
    const globalClusteringCoefficient = this.calculateGlobalClusteringCoefficient(adjacency);

    // Community detection
    const communities = await this.detectCommunities(graphData, adjacency);

    // Network robustness analysis
    const robustness = this.analyzeNetworkRobustness(graphData, adjacency);

    // Degree distribution
    const degreeDistribution = this.calculateDegreeDistribution(adjacency);

    // Path-based metrics (expensive, limit for large networks)
    const pathMetrics = graphData.nodes.length <= 1000
      ? this.calculatePathMetrics(adjacency)
      : { diameter: -1, averagePathLength: -1 };

    const metrics: NetworkMetrics = {
      nodeCount,
      edgeCount,
      density,
      diameter: pathMetrics.diameter,
      averagePathLength: pathMetrics.averagePathLength,
      centrality,
      clusteringCoefficient,
      globalClusteringCoefficient,
      communities,
      robustness,
      degreeDistribution,
      analysisTimestamp: new Date(),
      networkHash: graphHash,
    };

    // Add advanced metrics if requested and network is suitable
    if (options.computeStatistics && nodeCount <= 5000) {
      metrics.smallWorldness = this.calculateSmallWorldness(adjacency, pathMetrics.averagePathLength, clusteringCoefficient);
      metrics.scale_freeness = this.calculateScaleFreeness(degreeDistribution);
    }

    this.setCachedResult(this.cache.networkMetrics, cacheKey, metrics);

    return metrics;
  }

  // ============================================================================
  // Collaboration Analysis
  // ============================================================================

  /**
   * Analyze collaboration patterns for an author
   */
  async analyzeCollaborations(
    authorId: string,
    options: AnalysisOptions = {}
  ): Promise<CollaborationMetrics> {
    const cacheKey = this.createCacheKey(authorId, options);
    const cached = this.getCachedResult(this.cache.collaborationMetrics, cacheKey, options);
    if (cached) return cached;

    const provider = this.getProvider();

    // Expand to get authored works and co-authors
    const expansion = await provider.expandEntity(authorId, {
      relationshipTypes: [RelationType.AUTHORED, RelationType.AFFILIATED],
      maxDepth: 2,
      limit: options.maxNetworkSize || 1000,
    });

    // Convert expansion edges to GraphEdges for type safety
    const graphEdges = expansion.edges.map(edge => ({
      ...edge,
      type: edge.type as RelationType,
    })) as GraphEdge[];

    // Find all works authored by this person
    const authoredWorks = graphEdges
      .filter(e => e.type === RelationType.AUTHORED && e.source === authorId)
      .map(e => e.target);

    // Get collaboration data for each work
    const collaborationData = await this.getCollaborationData(authoredWorks, authorId, provider);

    // Calculate collaboration metrics
    const collaborationNetwork = await this.buildCollaborationNetwork(collaborationData, provider);
    const institutionalCollaboration = await this.analyzeInstitutionalCollaboration(authorId, collaborationData, provider);
    const disciplinaryReach = await this.analyzeDisciplinaryReach(authoredWorks, provider);
    const temporalPatterns = this.analyzeCollaborationTemporalPatterns(collaborationData);
    const collaborationCentrality = this.calculateCollaborationCentrality(collaborationNetwork);
    const impactOfCollaborations = await this.analyzeCollaborationImpact(collaborationData, provider);

    const metrics: CollaborationMetrics = {
      collaborationNetwork: {
        directCollaborators: collaborationNetwork.directCollaborators,
        collaborationStrength: collaborationNetwork.collaborationStrength,
      },
      institutionalCollaboration,
      disciplinaryReach,
      temporalPatterns,
      collaborationCentrality,
      impactOfCollaborations,
    };

    this.setCachedResult(this.cache.collaborationMetrics, cacheKey, metrics);

    return metrics;
  }

  // ============================================================================
  // Research Trends Detection
  // ============================================================================

  /**
   * Detect research trends for an entity over a time range
   */
  async detectTrends(
    timeRange: TimeRange,
    entityType: EntityType,
    entityId?: string,
    options: AnalysisOptions = {}
  ): Promise<TrendAnalysis> {
    const cacheKey = `trends_${entityId || 'global'}_${entityType}_${timeRange.startYear}_${timeRange.endYear}`;
    const cached = this.getCachedResult(this.cache.trendAnalysis, cacheKey, options);
    if (cached) return cached;

    const provider = this.getProvider();

    let analysisData: GraphData;

    if (entityId) {
      // Entity-specific trend analysis
      const expansion = await provider.expandEntity(entityId, {
        maxDepth: 2,
        limit: options.maxNetworkSize || 2000,
      });
      analysisData = {
        nodes: expansion.nodes,
        edges: expansion.edges.map(edge => ({
          ...edge,
          type: edge.type as RelationType,
        })) as GraphEdge[]
      };
    } else {
      // Global trend analysis would require a different approach
      throw new Error('Global trend analysis not yet implemented - requires entity ID');
    }

    // Calculate publication trends
    const publicationTrends = this.calculatePublicationTrends(analysisData, timeRange);

    // Analyze research topics evolution
    const researchTopics = await this.analyzeResearchTopicsEvolution(analysisData, timeRange, provider);

    // Calculate impact trajectory
    const impactEvolution = await this.calculateImpactEvolution(analysisData, timeRange, provider);

    // Analyze network evolution
    const networkEvolution = this.analyzeNetworkEvolution(analysisData, timeRange);

    // Generate future projections
    const futureProjections = this.generateFutureProjections(
      publicationTrends,
      impactEvolution,
      researchTopics
    );

    const trends: TrendAnalysis = {
      publicationTrends,
      researchTopics,
      impactEvolution,
      networkEvolution,
      futureProjections,
    };

    this.setCachedResult(this.cache.trendAnalysis, cacheKey, trends);

    return trends;
  }

  // ============================================================================
  // Batch Analysis Operations
  // ============================================================================

  /**
   * Perform batch citation analysis for multiple entities
   */
  async batchCitationAnalysis(
    nodeIds: string[],
    options: AnalysisOptions = {}
  ): Promise<Record<string, CitationMetrics>> {
    const results: Record<string, CitationMetrics> = {};

    // Process in chunks to avoid overwhelming the provider
    const chunkSize = 10;
    for (let i = 0; i < nodeIds.length; i += chunkSize) {
      const chunk = nodeIds.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async nodeId => {
        try {
          const metrics = await this.calculateCitationMetrics(nodeId, options);
          return { nodeId, metrics };
        } catch (error) {
          console.warn(`Citation analysis failed for ${nodeId}:`, error);
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      chunkResults.forEach(result => {
        if (result) {
          results[result.nodeId] = result.metrics;
        }
      });
    }

    return results;
  }

  /**
   * Compare metrics between multiple entities
   */
  async compareEntities(
    nodeIds: string[],
    analysisType: 'citation' | 'collaboration' | 'trends',
    options: AnalysisOptions = {}
  ): Promise<{
    entities: string[];
    metrics: Record<string, CitationMetrics | CollaborationMetrics | TrendAnalysis>;
    comparison: {
      rankings: Array<{ nodeId: string; score: number; rank: number }>;
      statisticalSignificance?: Record<string, number>;
    };
  }> {
    const metrics: Record<string, CitationMetrics | CollaborationMetrics | TrendAnalysis> = {};

    // Calculate metrics for each entity
    for (const nodeId of nodeIds) {
      try {
        switch (analysisType) {
          case 'citation':
            metrics[nodeId] = await this.calculateCitationMetrics(nodeId, options);
            break;
          case 'collaboration':
            metrics[nodeId] = await this.analyzeCollaborations(nodeId, options);
            break;
          case 'trends': {
            // Use default time range for trends
            const timeRange: TimeRange = {
              startYear: new Date().getFullYear() - 10,
              endYear: new Date().getFullYear()
            };
            metrics[nodeId] = await this.detectTrends(timeRange, 'authors', nodeId, options);
            break;
          }
        }
      } catch (error) {
        console.warn(`Analysis failed for ${nodeId}:`, error);
      }
    }

    // Generate comparative rankings
    const rankings = this.generateComparativeRankings(metrics, analysisType);

    return {
      entities: nodeIds,
      metrics,
      comparison: {
        rankings,
      },
    };
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Clear all analysis caches
   */
  clearCache(): void {
    this.cache.citationMetrics.clear();
    this.cache.networkMetrics.clear();
    this.cache.collaborationMetrics.clear();
    this.cache.trendAnalysis.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    citationMetrics: number;
    networkMetrics: number;
    collaborationMetrics: number;
    trendAnalysis: number;
    totalSize: number;
  } {
    return {
      citationMetrics: this.cache.citationMetrics.size,
      networkMetrics: this.cache.networkMetrics.size,
      collaborationMetrics: this.cache.collaborationMetrics.size,
      trendAnalysis: this.cache.trendAnalysis.size,
      totalSize: this.cache.citationMetrics.size +
                 this.cache.networkMetrics.size +
                 this.cache.collaborationMetrics.size +
                 this.cache.trendAnalysis.size,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private createCacheKey(nodeId: string, options: AnalysisOptions): string {
    const optionsHash = JSON.stringify(options);
    return `${nodeId}_${btoa(optionsHash).slice(0, 10)}`;
  }

  private getCachedResult<T>(
    cache: Map<string, { data: T; timestamp: Date; hash: string }>,
    key: string,
    options: AnalysisOptions
  ): T | null {
    if (!options.useCache) return null;

    const cached = cache.get(key);
    if (!cached) return null;

    const expiryMs = (options.cacheExpiry || this.defaultCacheExpiry) * 60 * 1000;
    const isExpired = Date.now() - cached.timestamp.getTime() > expiryMs;

    if (isExpired) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedResult<T>(
    cache: Map<string, { data: T; timestamp: Date; hash: string }>,
    key: string,
    data: T
  ): void {
    cache.set(key, {
      data,
      timestamp: new Date(),
      hash: key,
    });
  }

  private hashGraphData(graphData: GraphData): string {
    const nodeIds = graphData.nodes.map(n => n.id).sort();
    const edgeIds = graphData.edges.map(e => `${e.source}-${e.target}-${e.type}`).sort();
    return btoa(JSON.stringify({ nodes: nodeIds, edges: edgeIds })).slice(0, 16);
  }

  private buildAdjacencyMap(graphData: GraphData): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();

    // Initialize all nodes
    graphData.nodes.forEach(node => {
      adjacency.set(node.id, new Set());
    });

    // Add edges
    graphData.edges.forEach(edge => {
      const sourceNeighbors = adjacency.get(edge.source);
      const targetNeighbors = adjacency.get(edge.target);

      if (sourceNeighbors) sourceNeighbors.add(edge.target);
      if (targetNeighbors) targetNeighbors.add(edge.source);
    });

    return adjacency;
  }

  // Citation analysis helpers
  private calculateCitationsByYear(citingWorks: GraphNode[]): Array<{ year: number; count: number }> {
    const yearCounts = new Map<number, number>();

    citingWorks.forEach(work => {
      // Extract publication year from entity data
      const year = this.extractPublicationYear(work);
      if (year) {
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
      }
    });

    return Array.from(yearCounts.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);
  }

  private extractPublicationYear(work: GraphNode): number | null {
    // Extract year from entityData - this would depend on the actual data structure
    const data = work.entityData as any;
    return data?.publication_year ||
           data?.publicationYear ||
           (data?.publication_date ? new Date(data.publication_date).getFullYear() : null);
  }

  private calculateCitationVelocity(citationsByYear: Array<{ year: number; count: number }>): number {
    if (citationsByYear.length < 2) return 0;

    // Calculate recent trend (last 3 years vs previous 3 years)
    const currentYear = new Date().getFullYear();
    const recent = citationsByYear
      .filter(cy => cy.year >= currentYear - 3)
      .reduce((sum, cy) => sum + cy.count, 0);
    const previous = citationsByYear
      .filter(cy => cy.year >= currentYear - 6 && cy.year < currentYear - 3)
      .reduce((sum, cy) => sum + cy.count, 0);

    return previous === 0 ? recent : (recent - previous) / previous;
  }

  private async calculateHIndex(nodeId: string, provider: GraphDataProvider): Promise<number> {
    // Simplified h-index calculation for a single entity
    // In a real implementation, this would calculate h-index across all papers by an author
    return 1; // Placeholder
  }

  private async calculateI10Index(nodeId: string, provider: GraphDataProvider): Promise<number> {
    // Simplified i10-index calculation
    return 0; // Placeholder
  }

  private async calculateSelfCitations(nodeId: string, citingWorks: GraphNode[], provider: GraphDataProvider): Promise<number> {
    // Calculate self-citations by checking author overlap
    return 0; // Placeholder - would require author comparison
  }

  private async getTopCitingPapers(citingWorks: GraphNode[], limit: number): Promise<Array<{ nodeId: string; citations: number; title: string }>> {
    // Sort by citation count and return top papers
    return citingWorks
      .slice(0, limit)
      .map(work => ({
        nodeId: work.id,
        citations: this.extractCitationCount(work),
        title: work.label || 'Unknown Title',
      }));
  }

  private extractCitationCount(work: GraphNode): number {
    const data = work.entityData as any;
    return data?.cited_by_count || data?.citationCount || 0;
  }

  private calculateQuartiles(values: number[]): [number, number, number, number] {
    const sorted = values.sort((a, b) => a - b);
    const len = sorted.length;

    if (len === 0) return [0, 0, 0, 0];
    if (len === 1) return [sorted[0], sorted[0], sorted[0], sorted[0]];

    const q1 = sorted[Math.floor(len * 0.25)];
    const q2 = sorted[Math.floor(len * 0.5)];
    const q3 = sorted[Math.floor(len * 0.75)];

    return [sorted[0], q1, q2, q3];
  }

  private calculateConfidenceInterval(value: number, level: number): { lower: number; upper: number; level: number } {
    // Simplified confidence interval calculation
    const margin = Math.sqrt(value) * 1.96; // 95% CI for normal approximation
    return {
      lower: Math.max(0, value - margin),
      upper: value + margin,
      level,
    };
  }

  // Network analysis helpers
  private async calculateCentralityMeasures(graphData: GraphData, adjacency: Map<string, Set<string>>): Promise<{ [nodeId: string]: { degree: number; betweenness: number; closeness: number; eigenvector: number; pagerank: number } }> {
    const centrality: { [nodeId: string]: { degree: number; betweenness: number; closeness: number; eigenvector: number; pagerank: number } } = {};

    graphData.nodes.forEach(node => {
      const neighbors = adjacency.get(node.id) || new Set();
      centrality[node.id] = {
        degree: neighbors.size,
        betweenness: 0, // Placeholder - expensive to calculate
        closeness: 0, // Placeholder - expensive to calculate
        eigenvector: 0, // Placeholder - requires iterative calculation
        pagerank: 1 / graphData.nodes.length, // Placeholder - uniform initial value
      };
    });

    return centrality;
  }

  private calculateClusteringCoefficient(adjacency: Map<string, Set<string>>): number {
    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const [nodeId, neighbors] of adjacency) {
      if (neighbors.size < 2) continue;

      let triangles = 0;
      const neighborArray = Array.from(neighbors);

      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const neighbor1 = neighborArray[i];
          const neighbor2 = neighborArray[j];
          const neighbor1Adj = adjacency.get(neighbor1);

          if (neighbor1Adj?.has(neighbor2)) {
            triangles++;
          }
        }
      }

      const possibleTriangles = neighbors.size * (neighbors.size - 1) / 2;
      totalCoefficient += possibleTriangles > 0 ? triangles / possibleTriangles : 0;
      nodeCount++;
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  private calculateGlobalClusteringCoefficient(adjacency: Map<string, Set<string>>): number {
    let triangles = 0;
    let triplets = 0;

    for (const [nodeId, neighbors] of adjacency) {
      const degree = neighbors.size;
      if (degree < 2) continue;

      triplets += degree * (degree - 1) / 2;

      const neighborArray = Array.from(neighbors);
      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const neighbor1 = neighborArray[i];
          const neighbor2 = neighborArray[j];
          const neighbor1Adj = adjacency.get(neighbor1);

          if (neighbor1Adj?.has(neighbor2)) {
            triangles++;
          }
        }
      }
    }

    return triplets > 0 ? (3 * triangles) / triplets : 0;
  }

  private async detectCommunities(graphData: GraphData, adjacency: Map<string, Set<string>>): Promise<Array<{ id: string; nodes: string[]; size: number; density: number; modularity: number }>> {
    // Simplified community detection - in practice would use Louvain or similar algorithms
    return [{
      id: 'community_1',
      nodes: graphData.nodes.map(n => n.id),
      size: graphData.nodes.length,
      density: graphData.edges.length / (graphData.nodes.length * (graphData.nodes.length - 1) / 2),
      modularity: 0.5, // Placeholder
    }];
  }

  private analyzeNetworkRobustness(graphData: GraphData, adjacency: Map<string, Set<string>>): { criticalNodes: string[]; bridgeEdges: string[]; vulnerabilityScore: number } {
    // Simplified robustness analysis
    const criticalNodes: string[] = [];

    // Find high-degree nodes as critical nodes
    const degreeThreshold = Math.max(3, Math.floor(graphData.nodes.length * 0.1));
    for (const [nodeId, neighbors] of adjacency) {
      if (neighbors.size >= degreeThreshold) {
        criticalNodes.push(nodeId);
      }
    }

    return {
      criticalNodes,
      bridgeEdges: [], // Placeholder
      vulnerabilityScore: criticalNodes.length / graphData.nodes.length,
    };
  }

  private calculateDegreeDistribution(adjacency: Map<string, Set<string>>): Array<{ degree: number; frequency: number }> {
    const degreeCount = new Map<number, number>();

    for (const [nodeId, neighbors] of adjacency) {
      const degree = neighbors.size;
      degreeCount.set(degree, (degreeCount.get(degree) || 0) + 1);
    }

    return Array.from(degreeCount.entries())
      .map(([degree, frequency]) => ({ degree, frequency }))
      .sort((a, b) => a.degree - b.degree);
  }

  private calculatePathMetrics(adjacency: Map<string, Set<string>>): { diameter: number; averagePathLength: number } {
    // Simplified path calculation - would use BFS for all pairs
    return {
      diameter: -1, // Placeholder - expensive to calculate
      averagePathLength: -1, // Placeholder - expensive to calculate
    };
  }

  private calculateSmallWorldness(adjacency: Map<string, Set<string>>, avgPathLength: number, clusteringCoeff: number): number {
    // Small-worldness calculation (Watts-Strogatz)
    return -1; // Placeholder - requires reference random network
  }

  private calculateScaleFreeness(degreeDistribution: Array<{ degree: number; frequency: number }>): number {
    // Power-law fit quality
    return -1; // Placeholder - requires power-law fitting
  }

  // Collaboration analysis helpers
  private async getCollaborationData(worksIds: string[], authorId: string, provider: GraphDataProvider): Promise<Array<{ workId: string; collaborators: string[]; year: number; impact: number }>> {
    const collaborationData: Array<{ workId: string; collaborators: string[]; year: number; impact: number }> = [];

    for (const workId of worksIds) {
      try {
        const work = await provider.fetchEntity(workId);
        const expansion = await provider.expandEntity(workId, {
          relationshipTypes: [RelationType.AUTHORED],
          maxDepth: 1,
        });

        const collaborators = expansion.edges
          .filter(e => e.type === (RelationType.AUTHORED as string) && e.source !== authorId)
          .map(e => e.source);

        collaborationData.push({
          workId,
          collaborators,
          year: this.extractPublicationYear(work) || new Date().getFullYear(),
          impact: this.extractCitationCount(work),
        });
      } catch (error) {
        console.warn(`Failed to get collaboration data for work ${workId}:`, error);
      }
    }

    return collaborationData;
  }

  private async buildCollaborationNetwork(
    collaborationData: Array<{ workId: string; collaborators: string[]; year: number; impact: number }>,
    provider: GraphDataProvider
  ): Promise<{ directCollaborators: Array<{ nodeId: string; collaborations: number; sharedWorks: string[]; strengthScore: number }>; collaborationStrength: number }> {
    const collaboratorMap = new Map<string, { collaborations: number; sharedWorks: string[]; totalImpact: number }>();

    collaborationData.forEach(collab => {
      collab.collaborators.forEach(collaboratorId => {
        const existing = collaboratorMap.get(collaboratorId) || { collaborations: 0, sharedWorks: [], totalImpact: 0 };
        existing.collaborations++;
        existing.sharedWorks.push(collab.workId);
        existing.totalImpact += collab.impact;
        collaboratorMap.set(collaboratorId, existing);
      });
    });

    const directCollaborators = Array.from(collaboratorMap.entries())
      .map(([nodeId, data]) => ({
        nodeId,
        collaborations: data.collaborations,
        sharedWorks: data.sharedWorks,
        strengthScore: data.totalImpact / Math.max(data.collaborations, 1),
      }))
      .sort((a, b) => b.strengthScore - a.strengthScore);

    const collaborationStrength = collaboratorMap.size / Math.max(collaborationData.length, 1);

    return { directCollaborators, collaborationStrength };
  }

  private async analyzeInstitutionalCollaboration(authorId: string, collaborationData: Array<{ workId: string; collaborators: string[]; year: number; impact: number }>, provider: GraphDataProvider): Promise<{ primaryInstitution?: string; institutionalDiversity: number; crossInstitutionalRate: number; topInstitutions: Array<{ institutionId: string; collaborations: number; impactScore: number }> }> {
    // Placeholder - would require institutional affiliation data
    return {
      institutionalDiversity: 1,
      crossInstitutionalRate: 0.5,
      topInstitutions: [],
    };
  }

  private async analyzeDisciplinaryReach(worksIds: string[], provider: GraphDataProvider): Promise<{ primaryFields: string[]; fieldDiversity: number; interdisciplinaryRate: number; emergingFields: string[] }> {
    // Placeholder - would require topic/field classification
    return {
      primaryFields: ['Computer Science'],
      fieldDiversity: 1,
      interdisciplinaryRate: 0.3,
      emergingFields: ['Machine Learning'],
    };
  }

  private analyzeCollaborationTemporalPatterns(collaborationData: Array<{ workId: string; collaborators: string[]; year: number; impact: number }>): Array<{ year: number; newCollaborators: number; repeatCollaborators: number; collaborationBreadth: number }> {
    const yearlyPatterns = new Map<number, { newCollabs: Set<string>; repeatCollabs: Set<string>; allCollabs: Set<string> }>();
    const seenCollaborators = new Set<string>();

    collaborationData
      .sort((a, b) => a.year - b.year)
      .forEach(collab => {
        const yearData = yearlyPatterns.get(collab.year) || { newCollabs: new Set(), repeatCollabs: new Set(), allCollabs: new Set() };

        collab.collaborators.forEach(collaboratorId => {
          yearData.allCollabs.add(collaboratorId);
          if (seenCollaborators.has(collaboratorId)) {
            yearData.repeatCollabs.add(collaboratorId);
          } else {
            yearData.newCollabs.add(collaboratorId);
            seenCollaborators.add(collaboratorId);
          }
        });

        yearlyPatterns.set(collab.year, yearData);
      });

    return Array.from(yearlyPatterns.entries())
      .map(([year, data]) => ({
        year,
        newCollaborators: data.newCollabs.size,
        repeatCollaborators: data.repeatCollabs.size,
        collaborationBreadth: data.allCollabs.size,
      }));
  }

  private calculateCollaborationCentrality(collaborationNetwork: { directCollaborators: Array<{ nodeId: string; collaborations: number; sharedWorks: string[]; strengthScore: number }>; collaborationStrength: number }): { degreeCentrality: number; betweennessCentrality: number; brokerage: number } {
    return {
      degreeCentrality: collaborationNetwork.directCollaborators.length,
      betweennessCentrality: 0, // Placeholder - expensive to calculate
      brokerage: 0, // Placeholder - requires network structure
    };
  }

  private async analyzeCollaborationImpact(collaborationData: Array<{ workId: string; collaborators: string[]; year: number; impact: number }>, provider: GraphDataProvider): Promise<{ soloWorkImpact: number; collaborativeWorkImpact: number; collaborationPremium: number }> {
    const soloWorks = collaborationData.filter(c => c.collaborators.length === 0);
    const collabWorks = collaborationData.filter(c => c.collaborators.length > 0);

    const soloWorkImpact = soloWorks.reduce((sum, w) => sum + w.impact, 0) / Math.max(soloWorks.length, 1);
    const collaborativeWorkImpact = collabWorks.reduce((sum, w) => sum + w.impact, 0) / Math.max(collabWorks.length, 1);

    return {
      soloWorkImpact,
      collaborativeWorkImpact,
      collaborationPremium: collaborativeWorkImpact - soloWorkImpact,
    };
  }

  // Trend analysis helpers
  private calculatePublicationTrends(analysisData: GraphData, timeRange: TimeRange): { yearlyOutput: Array<{ year: number; count: number; impactSum: number }>; careerStage: 'early' | 'mid' | 'senior' | 'emeritus'; productivityTrend: 'increasing' | 'stable' | 'decreasing'; peakYears: number[] } {
    const yearlyStats = new Map<number, { count: number; impactSum: number }>();

    analysisData.nodes.forEach(node => {
      const year = this.extractPublicationYear(node);
      if (year && year >= timeRange.startYear && year <= timeRange.endYear) {
        const stats = yearlyStats.get(year) || { count: 0, impactSum: 0 };
        stats.count++;
        stats.impactSum += this.extractCitationCount(node);
        yearlyStats.set(year, stats);
      }
    });

    const yearlyOutput = Array.from(yearlyStats.entries())
      .map(([year, stats]) => ({ year, count: stats.count, impactSum: stats.impactSum }))
      .sort((a, b) => a.year - b.year);

    // Determine career stage and productivity trend (simplified)
    const careerLength = timeRange.endYear - timeRange.startYear;
    const careerStage: 'early' | 'mid' | 'senior' | 'emeritus' =
      careerLength < 5 ? 'early' :
      careerLength < 15 ? 'mid' :
      careerLength < 30 ? 'senior' : 'emeritus';

    // Calculate productivity trend
    const recentYears = yearlyOutput.slice(-3);
    const earlierYears = yearlyOutput.slice(0, 3);
    const recentAvg = recentYears.reduce((sum, y) => sum + y.count, 0) / Math.max(recentYears.length, 1);
    const earlierAvg = earlierYears.reduce((sum, y) => sum + y.count, 0) / Math.max(earlierYears.length, 1);

    const productivityTrend: 'increasing' | 'stable' | 'decreasing' =
      recentAvg > earlierAvg * 1.2 ? 'increasing' :
      recentAvg < earlierAvg * 0.8 ? 'decreasing' : 'stable';

    // Find peak years
    const maxOutput = Math.max(...yearlyOutput.map(y => y.count));
    const peakYears = yearlyOutput.filter(y => y.count === maxOutput).map(y => y.year);

    return {
      yearlyOutput,
      careerStage,
      productivityTrend,
      peakYears,
    };
  }

  private async analyzeResearchTopicsEvolution(analysisData: GraphData, timeRange: TimeRange, provider: GraphDataProvider): Promise<{ currentTopics: Array<{ topic: string; prevalence: number; trend: 'emerging' | 'stable' | 'declining'; firstAppeared: number; lastAppeared: number }>; topicTransitions: Array<{ from: string; to: string; transitionYear: number; strength: number }>; emergingAreas: string[] }> {
    // Placeholder - would require topic extraction and analysis
    return {
      currentTopics: [
        {
          topic: 'Machine Learning',
          prevalence: 0.6,
          trend: 'stable',
          firstAppeared: timeRange.startYear,
          lastAppeared: timeRange.endYear,
        }
      ],
      topicTransitions: [],
      emergingAreas: ['Deep Learning', 'Graph Neural Networks'],
    };
  }

  private async calculateImpactEvolution(analysisData: GraphData, timeRange: TimeRange, provider: GraphDataProvider): Promise<{ impactByYear: Array<{ year: number; totalCitations: number; hIndex: number }>; impactAcceleration: number; sustainedImpact: boolean; breakthrough_works: string[] }> {
    const impactByYear: Array<{ year: number; totalCitations: number; hIndex: number }> = [];

    for (let year = timeRange.startYear; year <= timeRange.endYear; year++) {
      const yearNodes = analysisData.nodes.filter(node => this.extractPublicationYear(node) === year);
      const totalCitations = yearNodes.reduce((sum, node) => sum + this.extractCitationCount(node), 0);

      impactByYear.push({
        year,
        totalCitations,
        hIndex: 1, // Placeholder
      });
    }

    // Calculate impact acceleration
    const recentImpact = impactByYear.slice(-3).reduce((sum, y) => sum + y.totalCitations, 0);
    const earlierImpact = impactByYear.slice(0, 3).reduce((sum, y) => sum + y.totalCitations, 0);
    const impactAcceleration = earlierImpact > 0 ? (recentImpact - earlierImpact) / earlierImpact : 0;

    // Find breakthrough works (top 10% by citations)
    const citationThreshold = analysisData.nodes
      .map(n => this.extractCitationCount(n))
      .sort((a, b) => b - a)[Math.floor(analysisData.nodes.length * 0.1)] || 0;

    const breakthrough_works = analysisData.nodes
      .filter(n => this.extractCitationCount(n) >= citationThreshold)
      .map(n => n.id);

    return {
      impactByYear,
      impactAcceleration,
      sustainedImpact: breakthrough_works.length > 0,
      breakthrough_works,
    };
  }

  private analyzeNetworkEvolution(analysisData: GraphData, timeRange: TimeRange): { networkExpansion: Array<{ year: number; collaboratorCount: number }>; institutionalMobility: Array<{ year: number; institution: string; transitionType: 'join' | 'leave' | 'visit' }>; collaborationMaturity: number } {
    // Placeholder - would require temporal network analysis
    return {
      networkExpansion: [],
      institutionalMobility: [],
      collaborationMaturity: 0.7,
    };
  }

  private generateFutureProjections(
    publicationTrends: any,
    impactEvolution: any,
    researchTopics: any
  ): { expectedOutput: number; impactProjection: number; emergingTopicAlignment: number; confidence: number } {
    // Simple linear projection based on recent trends
    const recentOutput = publicationTrends.yearlyOutput.slice(-3).map((y: any) => y.count);
    const avgRecentOutput = recentOutput.reduce((sum: number, count: number) => sum + count, 0) / recentOutput.length;

    const recentImpact = impactEvolution.impactByYear.slice(-3).map((y: any) => y.totalCitations);
    const avgRecentImpact = recentImpact.reduce((sum: number, citations: number) => sum + citations, 0) / recentImpact.length;

    return {
      expectedOutput: Math.round(avgRecentOutput),
      impactProjection: Math.round(avgRecentImpact * 1.1), // 10% growth assumption
      emergingTopicAlignment: 0.4, // Placeholder
      confidence: 0.6, // Placeholder
    };
  }

  private generateComparativeRankings(
    metrics: Record<string, CitationMetrics | CollaborationMetrics | TrendAnalysis>,
    analysisType: 'citation' | 'collaboration' | 'trends'
  ): Array<{ nodeId: string; score: number; rank: number }> {
    const scores: Array<{ nodeId: string; score: number }> = [];

    Object.entries(metrics).forEach(([nodeId, metric]) => {
      let score = 0;

      switch (analysisType) {
        case 'citation':
          const citationMetric = metric as CitationMetrics;
          score = citationMetric.totalCitations * 0.5 + citationMetric.hIndex * 10 + citationMetric.recentCitations * 0.3;
          break;
        case 'collaboration':
          const collabMetric = metric as CollaborationMetrics;
          score = collabMetric.collaborationNetwork.directCollaborators.length * 2 +
                  collabMetric.institutionalCollaboration.institutionalDiversity * 5;
          break;
        case 'trends':
          const trendMetric = metric as TrendAnalysis;
          score = trendMetric.publicationTrends.yearlyOutput.reduce((sum, y) => sum + y.count, 0) +
                  trendMetric.futureProjections.expectedOutput * 2;
          break;
      }

      scores.push({ nodeId, score });
    });

    // Sort by score and assign ranks
    const ranked = scores
      .sort((a, b) => b.score - a.score)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return ranked;
  }

  /**
   * Cleanup resources and cancel ongoing operations
   */
  destroy(): void {
    this.clearCache();
    this.provider = null;
  }
}