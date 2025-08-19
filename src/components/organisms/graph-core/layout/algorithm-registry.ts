/**
 * Layout Algorithm Registry
 * 
 * Provides a centralized registry for managing layout algorithms with
 * automatic registration, categorization, and algorithm discovery.
 */

import type { LayoutAlgorithm, LayoutConfig, LayoutEngine } from './layout-engine';

/**
 * Algorithm category for grouping similar algorithms
 */
export enum AlgorithmCategory {
  FORCE_DIRECTED = 'force-directed',
  HIERARCHICAL = 'hierarchical',
  CIRCULAR = 'circular',
  GRID = 'grid',
  TREE = 'tree',
  CLUSTERING = 'clustering',
  OPTIMIZATION = 'optimization',
  EXPERIMENTAL = 'experimental',
}

/**
 * Algorithm complexity rating
 */
export enum ComplexityRating {
  LOW = 'low',        // O(n) or O(n log n)
  MEDIUM = 'medium',  // O(n²)
  HIGH = 'high',      // O(n³) or worse
}

/**
 * Algorithm performance characteristics
 */
export interface AlgorithmPerformance {
  /** Time complexity */
  timeComplexity: ComplexityRating;
  /** Space complexity */
  spaceComplexity: ComplexityRating;
  /** Recommended maximum vertex count */
  maxVertices: number;
  /** Whether algorithm supports incremental updates */
  supportsIncremental: boolean;
  /** Whether algorithm is deterministic */
  isDeterministic: boolean;
}

/**
 * Algorithm metadata for registration
 */
export interface AlgorithmMetadata {
  /** Human-readable name */
  displayName: string;
  /** Detailed description */
  description: string;
  /** Algorithm category */
  category: AlgorithmCategory;
  /** Performance characteristics */
  performance: AlgorithmPerformance;
  /** Author/source */
  author?: string;
  /** Version */
  version?: string;
  /** Documentation URL */
  documentation?: string;
  /** Supported features */
  features: {
    /** Supports weighted edges */
    supportsWeights: boolean;
    /** Supports constrained positions */
    supportsConstraints: boolean;
    /** Supports clustering */
    supportsClustering: boolean;
    /** Supports animation */
    supportsAnimation: boolean;
    /** Supports directed graphs */
    supportsDirected: boolean;
  };
  /** Configuration schema for validation */
  configSchema?: Record<string, any>;
}

/**
 * Registered algorithm information
 */
export interface RegisteredAlgorithm<TVertex = unknown, TEdge = unknown> {
  /** Algorithm instance */
  algorithm: LayoutAlgorithm<TVertex, TEdge, any>;
  /** Algorithm metadata */
  metadata: AlgorithmMetadata;
  /** Registration timestamp */
  registeredAt: Date;
  /** Usage statistics */
  stats: {
    usageCount: number;
    totalComputeTime: number;
    averageComputeTime: number;
    lastUsed?: Date;
  };
}

/**
 * Algorithm registry for managing layout algorithms
 */
export class AlgorithmRegistry<TVertex = unknown, TEdge = unknown> {
  private algorithms = new Map<string, RegisteredAlgorithm<TVertex, TEdge>>();
  private categorizedAlgorithms = new Map<AlgorithmCategory, Set<string>>();
  private aliases = new Map<string, string>();

  /**
   * Register an algorithm with metadata
   */
  register(
    algorithm: LayoutAlgorithm<TVertex, TEdge, any>,
    metadata: AlgorithmMetadata,
    aliases: string[] = []
  ): void {
    const registration: RegisteredAlgorithm<TVertex, TEdge> = {
      algorithm,
      metadata,
      registeredAt: new Date(),
      stats: {
        usageCount: 0,
        totalComputeTime: 0,
        averageComputeTime: 0,
      },
    };

    // Register main algorithm
    this.algorithms.set(algorithm.name, registration);

    // Update category index
    if (!this.categorizedAlgorithms.has(metadata.category)) {
      this.categorizedAlgorithms.set(metadata.category, new Set());
    }
    this.categorizedAlgorithms.get(metadata.category)!.add(algorithm.name);

    // Register aliases
    aliases.forEach(alias => {
      this.aliases.set(alias, algorithm.name);
    });

    console.log(`Registered layout algorithm: ${algorithm.name} (${metadata.displayName})`);
  }

  /**
   * Unregister an algorithm
   */
  unregister(name: string): boolean {
    const registration = this.algorithms.get(name);
    if (!registration) {
      return false;
    }

    // Remove from main registry
    this.algorithms.delete(name);

    // Remove from category index
    const {category} = registration.metadata;
    this.categorizedAlgorithms.get(category)?.delete(name);
    
    // Clean up empty categories
    if (this.categorizedAlgorithms.get(category)?.size === 0) {
      this.categorizedAlgorithms.delete(category);
    }

    // Remove aliases
    for (const [alias, target] of this.aliases.entries()) {
      if (target === name) {
        this.aliases.delete(alias);
      }
    }

    console.log(`Unregistered layout algorithm: ${name}`);
    return true;
  }

  /**
   * Get algorithm by name or alias
   */
  get(nameOrAlias: string): LayoutAlgorithm<TVertex, TEdge, any> | undefined {
    const name = this.aliases.get(nameOrAlias) || nameOrAlias;
    return this.algorithms.get(name)?.algorithm;
  }

  /**
   * Get full registration information
   */
  getRegistration(nameOrAlias: string): RegisteredAlgorithm<TVertex, TEdge> | undefined {
    const name = this.aliases.get(nameOrAlias) || nameOrAlias;
    return this.algorithms.get(name);
  }

  /**
   * List all registered algorithms
   */
  list(): Array<{
    name: string;
    displayName: string;
    description: string;
    category: AlgorithmCategory;
    performance: AlgorithmPerformance;
  }> {
    return Array.from(this.algorithms.entries()).map(([name, registration]) => ({
      name,
      displayName: registration.metadata.displayName,
      description: registration.metadata.description,
      category: registration.metadata.category,
      performance: registration.metadata.performance,
    }));
  }

  /**
   * Get algorithms by category
   */
  getByCategory(category: AlgorithmCategory): Array<{
    name: string;
    displayName: string;
    description: string;
  }> {
    const algorithmNames = this.categorizedAlgorithms.get(category);
    if (!algorithmNames) {
      return [];
    }

    return Array.from(algorithmNames).map(name => {
      const registration = this.algorithms.get(name)!;
      return {
        name,
        displayName: registration.metadata.displayName,
        description: registration.metadata.description,
      };
    });
  }

  /**
   * Get available categories
   */
  getCategories(): AlgorithmCategory[] {
    return Array.from(this.categorizedAlgorithms.keys());
  }

  /**
   * Find algorithms by features
   */
  findByFeatures(requiredFeatures: Partial<AlgorithmMetadata['features']>): string[] {
    const results: string[] = [];

    this.algorithms.forEach((registration, name) => {
      const {features} = registration.metadata;
      const matches = Object.entries(requiredFeatures).every(([key, value]) => {
        return features[key as keyof typeof features] === value;
      });

      if (matches) {
        results.push(name);
      }
    });

    return results;
  }

  /**
   * Get algorithm recommendations based on graph size and requirements
   */
  getRecommendations(requirements: {
    vertexCount: number;
    edgeCount: number;
    needsWeights?: boolean;
    needsConstraints?: boolean;
    needsAnimation?: boolean;
    needsClustering?: boolean;
    maxComplexity?: ComplexityRating;
  }): Array<{
    name: string;
    displayName: string;
    score: number;
    reasoning: string[];
  }> {
    const recommendations: Array<{
      name: string;
      displayName: string;
      score: number;
      reasoning: string[];
    }> = [];

    this.algorithms.forEach((registration, name) => {
      const { metadata } = registration;
      const { performance, features } = metadata;
      
      let score = 100;
      const reasoning: string[] = [];

      // Check vertex count compatibility
      if (requirements.vertexCount > performance.maxVertices) {
        score -= 50;
        reasoning.push(`May not scale well for ${requirements.vertexCount} vertices (max recommended: ${performance.maxVertices})`);
      }

      // Check complexity requirements
      if (requirements.maxComplexity) {
        const complexityOrder = { low: 0, medium: 1, high: 2 };
        if (complexityOrder[performance.timeComplexity] > complexityOrder[requirements.maxComplexity]) {
          score -= 30;
          reasoning.push(`Time complexity (${performance.timeComplexity}) exceeds requirement (${requirements.maxComplexity})`);
        }
      }

      // Check feature requirements
      if (requirements.needsWeights && !features.supportsWeights) {
        score -= 40;
        reasoning.push('Does not support weighted edges');
      }

      if (requirements.needsConstraints && !features.supportsConstraints) {
        score -= 30;
        reasoning.push('Does not support constrained positions');
      }

      if (requirements.needsAnimation && !features.supportsAnimation) {
        score -= 20;
        reasoning.push('Does not support animation');
      }

      if (requirements.needsClustering && !features.supportsClustering) {
        score -= 25;
        reasoning.push('Does not support clustering');
      }

      // Bonus for good performance characteristics
      if (performance.timeComplexity === ComplexityRating.LOW) {
        score += 10;
        reasoning.push('Excellent time complexity');
      }

      if (performance.supportsIncremental) {
        score += 15;
        reasoning.push('Supports incremental updates');
      }

      if (performance.isDeterministic) {
        score += 5;
        reasoning.push('Deterministic results');
      }

      // Add usage-based bonus
      const usageBonus = Math.min(registration.stats.usageCount * 2, 20);
      score += usageBonus;
      if (usageBonus > 0) {
        reasoning.push(`Popular choice (${registration.stats.usageCount} uses)`);
      }

      if (score > 0) {
        recommendations.push({
          name,
          displayName: metadata.displayName,
          score,
          reasoning: reasoning.length > 0 ? reasoning : ['Good general-purpose choice'],
        });
      }
    });

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Update algorithm usage statistics
   */
  updateStats(name: string, computeTime: number): void {
    const registration = this.algorithms.get(name);
    if (!registration) {
      return;
    }

    registration.stats.usageCount++;
    registration.stats.totalComputeTime += computeTime;
    registration.stats.averageComputeTime = 
      registration.stats.totalComputeTime / registration.stats.usageCount;
    registration.stats.lastUsed = new Date();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAlgorithms: number;
    categoryCounts: Record<AlgorithmCategory, number>;
    totalUsage: number;
    mostUsedAlgorithm: string | null;
  } {
    const categoryCounts: Record<AlgorithmCategory, number> = {} as any;
    let totalUsage = 0;
    let mostUsedAlgorithm: string | null = null;
    let maxUsage = 0;

    this.categorizedAlgorithms.forEach((algorithms, category) => {
      categoryCounts[category] = algorithms.size;
    });

    this.algorithms.forEach((registration, name) => {
      totalUsage += registration.stats.usageCount;
      if (registration.stats.usageCount > maxUsage) {
        maxUsage = registration.stats.usageCount;
        mostUsedAlgorithm = name;
      }
    });

    return {
      totalAlgorithms: this.algorithms.size,
      categoryCounts,
      totalUsage,
      mostUsedAlgorithm,
    };
  }

  /**
   * Clear usage statistics
   */
  clearStats(): void {
    this.algorithms.forEach(registration => {
      registration.stats = {
        usageCount: 0,
        totalComputeTime: 0,
        averageComputeTime: 0,
      };
    });
  }

  /**
   * Auto-register algorithms from a layout engine
   */
  autoRegisterFromEngine(engine: LayoutEngine<TVertex, TEdge>): void {
    const algorithms = engine.getAvailableAlgorithms();
    
    algorithms.forEach(({ name, displayName, description }) => {
      const algorithm = engine.getAlgorithm(name);
      if (algorithm && !this.algorithms.has(name)) {
        // Create basic metadata for auto-registered algorithms
        const metadata: AlgorithmMetadata = {
          displayName,
          description,
          category: this.inferCategory(name),
          performance: {
            timeComplexity: ComplexityRating.MEDIUM,
            spaceComplexity: ComplexityRating.MEDIUM,
            maxVertices: 1000,
            supportsIncremental: false,
            isDeterministic: true,
          },
          features: {
            supportsWeights: true,
            supportsConstraints: true,
            supportsClustering: false,
            supportsAnimation: true,
            supportsDirected: true,
          },
        };

        this.register(algorithm, metadata);
      }
    });
  }

  /**
   * Infer category from algorithm name
   */
  private inferCategory(name: string): AlgorithmCategory {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('force')) return AlgorithmCategory.FORCE_DIRECTED;
    if (nameLower.includes('circular')) return AlgorithmCategory.CIRCULAR;
    if (nameLower.includes('hierarchical') || nameLower.includes('tree')) return AlgorithmCategory.HIERARCHICAL;
    if (nameLower.includes('grid')) return AlgorithmCategory.GRID;
    if (nameLower.includes('cluster')) return AlgorithmCategory.CLUSTERING;
    
    return AlgorithmCategory.EXPERIMENTAL;
  }
}

/**
 * Global algorithm registry instance
 */
export const algorithmRegistry = new AlgorithmRegistry();

/**
 * Helper function to create algorithm metadata
 */
export function createAlgorithmMetadata(
  metadata: Partial<AlgorithmMetadata> & Pick<AlgorithmMetadata, 'displayName' | 'description' | 'category'>
): AlgorithmMetadata {
  return {
    performance: {
      timeComplexity: ComplexityRating.MEDIUM,
      spaceComplexity: ComplexityRating.MEDIUM,
      maxVertices: 1000,
      supportsIncremental: false,
      isDeterministic: true,
    },
    features: {
      supportsWeights: true,
      supportsConstraints: true,
      supportsClustering: false,
      supportsAnimation: true,
      supportsDirected: true,
    },
    ...metadata,
  };
}