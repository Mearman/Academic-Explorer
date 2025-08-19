/**
 * Renderer registry system for managing multiple graph renderer implementations
 * Supports pluggable vertex and edge renderers with automatic fallback and composition
 */

import type {
  EdgeRenderer,
  EdgeRendererConfig,
  CompositeEdgeStrategy,
  EdgeColourStrategy,
  EdgeWidthStrategy,
  EdgeStyleStrategy,
  EdgeLabelStrategy,
  EdgeArrowStrategy,
  EdgeTooltipStrategy,
} from './edge-renderer';
import {
  createEdgeRenderer,
  DefaultEdgeStrategy,
} from './edge-renderer';
import type {
  VertexRenderer,
  VertexRendererConfig,
  CompositeVertexStrategy,
  ColourStrategy,
  SizeStrategy,
  ShapeStrategy,
  LabelStrategy,
  TooltipStrategy as VertexTooltipStrategy,
} from './vertex-renderer';
import {
  createVertexRenderer,
  DefaultVertexStrategy,
} from './vertex-renderer';



// Registry entry types
export interface RendererInfo {
  name: string;
  description: string;
  version: string;
  author?: string;
  tags: string[];
  dataTypes: string[]; // What types of metadata this renderer supports
  priority: number; // Higher priority = preferred choice for conflicts
}

export interface VertexRendererEntry<TMetadata = Record<string, unknown>> {
  info: RendererInfo;
  renderer: VertexRenderer<TMetadata>;
  factory: (config?: Partial<VertexRendererConfig<TMetadata>>) => VertexRenderer<TMetadata>;
}

export interface EdgeRendererEntry<TMetadata = Record<string, unknown>> {
  info: RendererInfo;
  renderer: EdgeRenderer<TMetadata>;
  factory: (config?: Partial<EdgeRendererConfig<TMetadata>>) => EdgeRenderer<TMetadata>;
}

// Strategy registry entries
export interface StrategyInfo {
  name: string;
  description: string;
  version: string;
  author?: string;
  compatibleWith: string[]; // Compatible renderer names
  dataTypes: string[];
}

export interface VertexStrategyEntry<TMetadata = Record<string, unknown>> {
  info: StrategyInfo;
  colour?: ColourStrategy<TMetadata>;
  size?: SizeStrategy<TMetadata>;
  shape?: ShapeStrategy<TMetadata>;
  label?: LabelStrategy<TMetadata>;
  tooltip?: VertexTooltipStrategy<TMetadata>;
}

export interface EdgeStrategyEntry<TMetadata = Record<string, unknown>> {
  info: StrategyInfo;
  colour?: EdgeColourStrategy<TMetadata>;
  width?: EdgeWidthStrategy<TMetadata>;
  style?: EdgeStyleStrategy<TMetadata>;
  label?: EdgeLabelStrategy<TMetadata>;
  arrow?: EdgeArrowStrategy<TMetadata>;
  tooltip?: EdgeTooltipStrategy<TMetadata>;
}

// Registry configuration
export interface RegistryConfig {
  enableCaching: boolean;
  enableAutoFallback: boolean;
  debugMode: boolean;
  maxCacheSize: number;
}

// Main renderer registry
export class RendererRegistry {
  private readonly config: Required<RegistryConfig>;
  private readonly vertexRenderers = new Map<string, VertexRendererEntry>();
  private readonly edgeRenderers = new Map<string, EdgeRendererEntry>();
  private readonly vertexStrategies = new Map<string, VertexStrategyEntry>();
  private readonly edgeStrategies = new Map<string, EdgeStrategyEntry>();
  private readonly cachedComposites = new Map<string, CompositeVertexStrategy<Record<string, unknown>> | CompositeEdgeStrategy<Record<string, unknown>>>();

  constructor(config?: Partial<RegistryConfig>) {
    this.config = {
      enableCaching: true,
      enableAutoFallback: true,
      debugMode: false,
      maxCacheSize: 100,
      ...config,
    };

    // Register default renderers
    this.registerDefaultRenderers();
  }

  // Vertex renderer management
  registerVertexRenderer<TMetadata = Record<string, unknown>>(
    entry: VertexRendererEntry<TMetadata>
  ): void {
    if (this.vertexRenderers.has(entry.info.name)) {
      if (this.config.debugMode) {
        console.warn(`Vertex renderer '${entry.info.name}' is already registered. Overwriting.`);
      }
    }

    this.vertexRenderers.set(entry.info.name, entry as VertexRendererEntry);
    
    if (this.config.debugMode) {
      console.debug(`Registered vertex renderer: ${entry.info.name} v${entry.info.version}`);
    }
  }

  getVertexRenderer<TMetadata = Record<string, unknown>>(
    name: string
  ): VertexRenderer<TMetadata> | undefined {
    const entry = this.vertexRenderers.get(name) as VertexRendererEntry<TMetadata>;
    return entry?.renderer;
  }

  createVertexRenderer<TMetadata = Record<string, unknown>>(
    name: string,
    config?: Partial<VertexRendererConfig<TMetadata>>
  ): VertexRenderer<TMetadata> | undefined {
    const entry = this.vertexRenderers.get(name) as VertexRendererEntry<TMetadata>;
    return entry?.factory(config);
  }

  // Edge renderer management
  registerEdgeRenderer<TMetadata = Record<string, unknown>>(
    entry: EdgeRendererEntry<TMetadata>
  ): void {
    if (this.edgeRenderers.has(entry.info.name)) {
      if (this.config.debugMode) {
        console.warn(`Edge renderer '${entry.info.name}' is already registered. Overwriting.`);
      }
    }

    this.edgeRenderers.set(entry.info.name, entry as EdgeRendererEntry);
    
    if (this.config.debugMode) {
      console.debug(`Registered edge renderer: ${entry.info.name} v${entry.info.version}`);
    }
  }

  getEdgeRenderer<TMetadata = Record<string, unknown>>(
    name: string
  ): EdgeRenderer<TMetadata> | undefined {
    const entry = this.edgeRenderers.get(name) as EdgeRendererEntry<TMetadata>;
    return entry?.renderer;
  }

  createEdgeRenderer<TMetadata = Record<string, unknown>>(
    name: string,
    config?: Partial<EdgeRendererConfig<TMetadata>>
  ): EdgeRenderer<TMetadata> | undefined {
    const entry = this.edgeRenderers.get(name) as EdgeRendererEntry<TMetadata>;
    return entry?.factory(config);
  }

  // Strategy management
  registerVertexStrategy<TMetadata = Record<string, unknown>>(
    entry: VertexStrategyEntry<TMetadata>
  ): void {
    if (this.vertexStrategies.has(entry.info.name)) {
      if (this.config.debugMode) {
        console.warn(`Vertex strategy '${entry.info.name}' is already registered. Overwriting.`);
      }
    }

    this.vertexStrategies.set(entry.info.name, entry as VertexStrategyEntry);
    
    if (this.config.debugMode) {
      console.debug(`Registered vertex strategy: ${entry.info.name} v${entry.info.version}`);
    }
  }

  registerEdgeStrategy<TMetadata = Record<string, unknown>>(
    entry: EdgeStrategyEntry<TMetadata>
  ): void {
    if (this.edgeStrategies.has(entry.info.name)) {
      if (this.config.debugMode) {
        console.warn(`Edge strategy '${entry.info.name}' is already registered. Overwriting.`);
      }
    }

    this.edgeStrategies.set(entry.info.name, entry as EdgeStrategyEntry);
    
    if (this.config.debugMode) {
      console.debug(`Registered edge strategy: ${entry.info.name} v${entry.info.version}`);
    }
  }

  // Strategy composition utilities
  composeVertexStrategy<TMetadata = Record<string, unknown>>(
    strategyNames: string[]
  ): CompositeVertexStrategy<TMetadata> {
    const cacheKey = `vertex-${strategyNames.sort().join('-')}`;
    
    if (this.config.enableCaching && this.cachedComposites.has(cacheKey)) {
      return this.cachedComposites.get(cacheKey) as CompositeVertexStrategy<TMetadata>;
    }

    const composite: CompositeVertexStrategy<TMetadata> = {} as CompositeVertexStrategy<TMetadata>;
    
    // Start with default strategy as base
    Object.assign(composite, DefaultVertexStrategy);

    // Apply strategies in order, later ones override earlier ones
    for (const strategyName of strategyNames) {
      const strategy = this.vertexStrategies.get(strategyName) as VertexStrategyEntry<TMetadata>;
      if (strategy) {
        if (strategy.colour) composite.colour = strategy.colour;
        if (strategy.size) composite.size = strategy.size;
        if (strategy.shape) composite.shape = strategy.shape;
        if (strategy.label) composite.label = strategy.label;
        if (strategy.tooltip) composite.tooltip = strategy.tooltip;
      } else if (this.config.debugMode) {
        console.warn(`Vertex strategy '${strategyName}' not found in registry`);
      }
    }

    // Cache the result if caching is enabled
    if (this.config.enableCaching) {
      this.cachedComposites.set(cacheKey, composite as CompositeVertexStrategy<Record<string, unknown>>);
      this.cleanupCache();
    }

    return composite;
  }

  composeEdgeStrategy<TMetadata = Record<string, unknown>>(
    strategyNames: string[]
  ): CompositeEdgeStrategy<TMetadata> {
    const cacheKey = `edge-${strategyNames.sort().join('-')}`;
    
    if (this.config.enableCaching && this.cachedComposites.has(cacheKey)) {
      return this.cachedComposites.get(cacheKey) as CompositeEdgeStrategy<TMetadata>;
    }

    const composite: CompositeEdgeStrategy<TMetadata> = {} as CompositeEdgeStrategy<TMetadata>;
    
    // Start with default strategy as base
    Object.assign(composite, DefaultEdgeStrategy);

    // Apply strategies in order, later ones override earlier ones
    for (const strategyName of strategyNames) {
      const strategy = this.edgeStrategies.get(strategyName) as EdgeStrategyEntry<TMetadata>;
      if (strategy) {
        if (strategy.colour) composite.colour = strategy.colour;
        if (strategy.width) composite.width = strategy.width;
        if (strategy.style) composite.style = strategy.style;
        if (strategy.label) composite.label = strategy.label;
        if (strategy.arrow) composite.arrow = strategy.arrow;
        if (strategy.tooltip) composite.tooltip = strategy.tooltip;
      } else if (this.config.debugMode) {
        console.warn(`Edge strategy '${strategyName}' not found in registry`);
      }
    }

    // Cache the result if caching is enabled
    if (this.config.enableCaching) {
      this.cachedComposites.set(cacheKey, composite as CompositeEdgeStrategy<Record<string, unknown>>);
      this.cleanupCache();
    }

    return composite;
  }

  // Auto-selection based on data types
  selectBestVertexRenderer(dataTypes: string[]): string | undefined {
    let bestMatch: { name: string; score: number; priority: number } | undefined;

    for (const [name, entry] of this.vertexRenderers.entries()) {
      const matchCount = dataTypes.filter(type => entry.info.dataTypes.includes(type)).length;
      if (matchCount > 0) {
        const score = matchCount / dataTypes.length;
        if (!bestMatch || score > bestMatch.score || 
           (score === bestMatch.score && entry.info.priority > bestMatch.priority)) {
          bestMatch = { name, score, priority: entry.info.priority };
        }
      }
    }

    return bestMatch?.name;
  }

  selectBestEdgeRenderer(dataTypes: string[]): string | undefined {
    let bestMatch: { name: string; score: number; priority: number } | undefined;

    for (const [name, entry] of this.edgeRenderers.entries()) {
      const matchCount = dataTypes.filter(type => entry.info.dataTypes.includes(type)).length;
      if (matchCount > 0) {
        const score = matchCount / dataTypes.length;
        if (!bestMatch || score > bestMatch.score || 
           (score === bestMatch.score && entry.info.priority > bestMatch.priority)) {
          bestMatch = { name, score, priority: entry.info.priority };
        }
      }
    }

    return bestMatch?.name;
  }

  // Query capabilities
  listVertexRenderers(): RendererInfo[] {
    return Array.from(this.vertexRenderers.values()).map(entry => entry.info);
  }

  listEdgeRenderers(): RendererInfo[] {
    return Array.from(this.edgeRenderers.values()).map(entry => entry.info);
  }

  listVertexStrategies(): StrategyInfo[] {
    return Array.from(this.vertexStrategies.values()).map(entry => entry.info);
  }

  listEdgeStrategies(): StrategyInfo[] {
    return Array.from(this.edgeStrategies.values()).map(entry => entry.info);
  }

  searchRenderers(query: string): { vertices: RendererInfo[]; edges: RendererInfo[] } {
    const searchTerm = query.toLowerCase();
    
    const vertices = this.listVertexRenderers().filter(info =>
      info.name.toLowerCase().includes(searchTerm) ||
      info.description.toLowerCase().includes(searchTerm) ||
      info.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );

    const edges = this.listEdgeRenderers().filter(info =>
      info.name.toLowerCase().includes(searchTerm) ||
      info.description.toLowerCase().includes(searchTerm) ||
      info.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );

    return { vertices, edges };
  }

  // Registry management
  unregisterVertexRenderer(name: string): boolean {
    return this.vertexRenderers.delete(name);
  }

  unregisterEdgeRenderer(name: string): boolean {
    return this.edgeRenderers.delete(name);
  }

  unregisterVertexStrategy(name: string): boolean {
    return this.vertexStrategies.delete(name);
  }

  unregisterEdgeStrategy(name: string): boolean {
    return this.edgeStrategies.delete(name);
  }

  clearCache(): void {
    this.cachedComposites.clear();
  }

  // Registry statistics
  getStats(): {
    vertexRenderers: number;
    edgeRenderers: number;
    vertexStrategies: number;
    edgeStrategies: number;
    cachedComposites: number;
  } {
    return {
      vertexRenderers: this.vertexRenderers.size,
      edgeRenderers: this.edgeRenderers.size,
      vertexStrategies: this.vertexStrategies.size,
      edgeStrategies: this.edgeStrategies.size,
      cachedComposites: this.cachedComposites.size,
    };
  }

  // Private methods
  private registerDefaultRenderers(): void {
    // Register default vertex renderer
    this.registerVertexRenderer({
      info: {
        name: 'default',
        description: 'Default vertex renderer with basic circle shapes',
        version: '1.0.0',
        author: 'Academic Explorer',
        tags: ['default', 'basic', 'circle'],
        dataTypes: ['*'], // Supports any data type
        priority: 0,
      },
      renderer: createVertexRenderer(),
      factory: createVertexRenderer,
    });

    // Register default edge renderer
    this.registerEdgeRenderer({
      info: {
        name: 'default',
        description: 'Default edge renderer with basic lines and arrows',
        version: '1.0.0',
        author: 'Academic Explorer',
        tags: ['default', 'basic', 'line'],
        dataTypes: ['*'], // Supports any data type
        priority: 0,
      },
      renderer: createEdgeRenderer(),
      factory: createEdgeRenderer,
    });
  }

  private cleanupCache(): void {
    if (this.cachedComposites.size > this.config.maxCacheSize) {
      // Simple LRU-like cleanup - remove oldest half
      const entries = Array.from(this.cachedComposites.entries());
      const toRemove = entries.slice(0, Math.floor(entries.length / 2));
      toRemove.forEach(([key]) => this.cachedComposites.delete(key));
    }
  }
}

// Global registry instance
let globalRegistry: RendererRegistry | undefined;

/**
 * Get the global renderer registry instance
 */
export function getRendererRegistry(): RendererRegistry {
  if (!globalRegistry) {
    globalRegistry = new RendererRegistry();
  }
  return globalRegistry;
}

/**
 * Create a new isolated renderer registry
 */
export function createRendererRegistry(config?: Partial<RegistryConfig>): RendererRegistry {
  return new RendererRegistry(config);
}

/**
 * Convenience function for creating a vertex renderer with composed strategies
 */
export function createCompositeVertexRenderer<TMetadata = Record<string, unknown>>(
  strategyNames: string[],
  config?: Partial<VertexRendererConfig<TMetadata>>,
  registry = getRendererRegistry()
): VertexRenderer<TMetadata> {
  const compositeStrategy = registry.composeVertexStrategy<TMetadata>(strategyNames);
  return createVertexRenderer({
    strategy: compositeStrategy,
    ...config,
  });
}

/**
 * Convenience function for creating an edge renderer with composed strategies
 */
export function createCompositeEdgeRenderer<TMetadata = Record<string, unknown>>(
  strategyNames: string[],
  config?: Partial<EdgeRendererConfig<TMetadata>>,
  registry = getRendererRegistry()
): EdgeRenderer<TMetadata> {
  const compositeStrategy = registry.composeEdgeStrategy<TMetadata>(strategyNames);
  return createEdgeRenderer({
    strategy: compositeStrategy,
    ...config,
  });
}

// Types are already exported as interfaces above - no need to re-export