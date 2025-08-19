/**
 * Generic vertex renderer with pluggable strategy pattern for graph visualisation
 * Supports SVG and Canvas rendering contexts with composable strategies
 */

// Core rendering context types
export type SVGRenderingContext = {
  type: 'svg';
  container: SVGGElement;
  createElement: <K extends keyof SVGElementTagNameMap>(tagName: K) => SVGElementTagNameMap[K];
  setAttribute: (element: Element, name: string, value: string | number) => void;
};

export type CanvasRenderingContext = {
  type: 'canvas';
  context: CanvasRenderingContext2D;
  devicePixelRatio: number;
};

export type RenderingContext = SVGRenderingContext | CanvasRenderingContext;

// Generic vertex data with metadata support
export interface VertexData<TMetadata = Record<string, unknown>> {
  id: string;
  x: number;
  y: number;
  metadata: TMetadata;
  // Optional computed properties for caching
  _computedSize?: number;
  _computedColour?: string;
  _computedLabel?: string;
}

// Rendering strategy interfaces
export interface ColourStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  getColour(vertex: VertexData<TMetadata>, context: RenderingContext): string;
}

export interface SizeStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  getSize(vertex: VertexData<TMetadata>, context: RenderingContext): number;
  getStrokeWidth?(vertex: VertexData<TMetadata>, context: RenderingContext): number;
}

export interface ShapeStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  renderShape(
    vertex: VertexData<TMetadata>, 
    context: RenderingContext, 
    size: number, 
    colour: string
  ): void;
}

export interface LabelStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  getLabel(vertex: VertexData<TMetadata>, context: RenderingContext): string | null;
  renderLabel(
    vertex: VertexData<TMetadata>, 
    context: RenderingContext, 
    label: string, 
    size: number
  ): void;
}

export interface TooltipStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  getTooltipContent(vertex: VertexData<TMetadata>, context: RenderingContext): string | null;
}

// Composition strategy for combining multiple strategies
export interface CompositeVertexStrategy<TMetadata = Record<string, unknown>> {
  colour: ColourStrategy<TMetadata>;
  size: SizeStrategy<TMetadata>;
  shape: ShapeStrategy<TMetadata>;
  label?: LabelStrategy<TMetadata>;
  tooltip?: TooltipStrategy<TMetadata>;
}

// Renderer configuration
export interface VertexRendererConfig<TMetadata = Record<string, unknown>> {
  strategy: CompositeVertexStrategy<TMetadata>;
  enableCaching?: boolean;
  animationDuration?: number;
  debugMode?: boolean;
}

// Main vertex renderer class
export class VertexRenderer<TMetadata = Record<string, unknown>> {
  private readonly config: Required<VertexRendererConfig<TMetadata>>;
  private readonly cache = new Map<string, {
    colour?: string;
    size?: number;
    label?: string;
    timestamp: number;
  }>();

  constructor(config: VertexRendererConfig<TMetadata>) {
    this.config = {
      enableCaching: true,
      animationDuration: 300,
      debugMode: false,
      ...config,
    };
  }

  /**
   * Render a single vertex using the configured strategies
   */
  render(vertex: VertexData<TMetadata>, context: RenderingContext): void {
    const startTime = this.config.debugMode ? performance.now() : 0;

    try {
      // Get rendering properties using strategies with caching
      const colour = this.getVertexColour(vertex, context);
      const size = this.getVertexSize(vertex, context);
      
      // Render shape
      this.config.strategy.shape.renderShape(vertex, context, size, colour);
      
      // Render label if strategy provided
      if (this.config.strategy.label) {
        const label = this.getVertexLabel(vertex, context);
        if (label) {
          this.config.strategy.label.renderLabel(vertex, context, label, size);
        }
      }

      if (this.config.debugMode) {
        const duration = performance.now() - startTime;
        console.debug(`Rendered vertex ${vertex.id} in ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error(`Failed to render vertex ${vertex.id}:`, error);
      // Render fallback representation
      this.renderFallback(vertex, context);
    }
  }

  /**
   * Batch render multiple vertices with optimisation
   */
  renderBatch(vertices: VertexData<TMetadata>[], context: RenderingContext): void {
    const startTime = this.config.debugMode ? performance.now() : 0;
    let successCount = 0;
    let errorCount = 0;

    for (const vertex of vertices) {
      try {
        this.render(vertex, context);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Batch render failed for vertex ${vertex.id}:`, error);
      }
    }

    if (this.config.debugMode) {
      const duration = performance.now() - startTime;
      console.debug(
        `Batch rendered ${vertices.length} vertices in ${duration.toFixed(2)}ms ` +
        `(${successCount} success, ${errorCount} errors)`
      );
    }
  }

  /**
   * Get vertex colour using caching if enabled
   */
  private getVertexColour(vertex: VertexData<TMetadata>, context: RenderingContext): string {
    if (vertex._computedColour) {
      return vertex._computedColour;
    }

    const cacheKey = `${vertex.id}-colour`;
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached?.colour && this.isCacheValid(cached.timestamp)) {
        vertex._computedColour = cached.colour;
        return cached.colour;
      }
    }

    const colour = this.config.strategy.colour.getColour(vertex, context);
    
    if (this.config.enableCaching) {
      this.updateCache(cacheKey, { colour });
    }
    
    vertex._computedColour = colour;
    return colour;
  }

  /**
   * Get vertex size using caching if enabled
   */
  private getVertexSize(vertex: VertexData<TMetadata>, context: RenderingContext): number {
    if (vertex._computedSize) {
      return vertex._computedSize;
    }

    const cacheKey = `${vertex.id}-size`;
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached?.size && this.isCacheValid(cached.timestamp)) {
        vertex._computedSize = cached.size;
        return cached.size;
      }
    }

    const size = this.config.strategy.size.getSize(vertex, context);
    
    if (this.config.enableCaching) {
      this.updateCache(cacheKey, { size });
    }
    
    vertex._computedSize = size;
    return size;
  }

  /**
   * Get vertex label using caching if enabled
   */
  private getVertexLabel(vertex: VertexData<TMetadata>, context: RenderingContext): string | null {
    if (!this.config.strategy.label) {
      return null;
    }

    if (vertex._computedLabel !== undefined) {
      return vertex._computedLabel;
    }

    const cacheKey = `${vertex.id}-label`;
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached?.label !== undefined && this.isCacheValid(cached.timestamp)) {
        vertex._computedLabel = cached.label;
        return cached.label;
      }
    }

    const label = this.config.strategy.label.getLabel(vertex, context);
    
    if (this.config.enableCaching) {
      this.updateCache(cacheKey, { label: label || '' });
    }
    
    vertex._computedLabel = label || '';
    return label;
  }

  /**
   * Render fallback representation for failed renders
   */
  private renderFallback(vertex: VertexData<TMetadata>, context: RenderingContext): void {
    const fallbackSize = 8;
    const fallbackColour = '#999999';

    if (context.type === 'svg') {
      const circle = context.createElement('circle');
      context.setAttribute(circle, 'cx', vertex.x);
      context.setAttribute(circle, 'cy', vertex.y);
      context.setAttribute(circle, 'r', fallbackSize);
      context.setAttribute(circle, 'fill', fallbackColour);
      context.setAttribute(circle, 'stroke', '#666666');
      context.setAttribute(circle, 'stroke-width', '1');
      context.container.appendChild(circle);
    } else if (context.type === 'canvas') {
      const ctx = context.context;
      ctx.save();
      ctx.fillStyle = fallbackColour;
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, fallbackSize, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Get tooltip content for a vertex
   */
  getTooltipContent(vertex: VertexData<TMetadata>, context: RenderingContext): string | null {
    if (!this.config.strategy.tooltip) {
      return null;
    }
    return this.config.strategy.tooltip.getTooltipContent(vertex, context);
  }

  /**
   * Clear cached data for optimisation
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update strategy configuration
   */
  updateStrategy(strategy: Partial<CompositeVertexStrategy<TMetadata>>): void {
    Object.assign(this.config.strategy, strategy);
    this.clearCache(); // Clear cache when strategy changes
  }

  /**
   * Check if cached value is still valid (5-minute TTL)
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < 300000; // 5 minutes
  }

  /**
   * Update cache entry
   */
  private updateCache(key: string, data: Partial<{ colour: string; size: number; label: string }>): void {
    const existing = this.cache.get(key) || { timestamp: Date.now() };
    this.cache.set(key, {
      ...existing,
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need request counters to calculate
    };
  }
}

// Default fallback strategies
export const DefaultColourStrategy: ColourStrategy = {
  name: 'default-colour',
  getColour: () => '#3498db',
};

export const DefaultSizeStrategy: SizeStrategy = {
  name: 'default-size',
  getSize: () => 10,
  getStrokeWidth: () => 1,
};

export const DefaultShapeStrategy: ShapeStrategy = {
  name: 'default-circle',
  renderShape: (vertex, context, size, colour) => {
    if (context.type === 'svg') {
      const circle = context.createElement('circle');
      context.setAttribute(circle, 'cx', vertex.x);
      context.setAttribute(circle, 'cy', vertex.y);
      context.setAttribute(circle, 'r', size);
      context.setAttribute(circle, 'fill', colour);
      context.setAttribute(circle, 'stroke', '#ffffff');
      context.setAttribute(circle, 'stroke-width', '1');
      context.container.appendChild(circle);
    } else if (context.type === 'canvas') {
      const ctx = context.context;
      ctx.save();
      ctx.fillStyle = colour;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, size, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  },
};

export const DefaultLabelStrategy: LabelStrategy = {
  name: 'default-label',
  getLabel: (vertex) => vertex.id,
  renderLabel: (vertex, context, label, size) => {
    const fontSize = Math.max(10, size * 0.8);
    
    if (context.type === 'svg') {
      const text = context.createElement('text');
      context.setAttribute(text, 'x', vertex.x);
      context.setAttribute(text, 'y', vertex.y + size + fontSize + 2);
      context.setAttribute(text, 'text-anchor', 'middle');
      context.setAttribute(text, 'font-size', fontSize);
      context.setAttribute(text, 'font-family', 'Arial, sans-serif');
      context.setAttribute(text, 'fill', '#333333');
      text.textContent = label;
      context.container.appendChild(text);
    } else if (context.type === 'canvas') {
      const ctx = context.context;
      ctx.save();
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, vertex.x, vertex.y + size + 2);
      ctx.restore();
    }
  },
};

export const DefaultTooltipStrategy: TooltipStrategy = {
  name: 'default-tooltip',
  getTooltipContent: (vertex) => `Vertex: ${vertex.id}`,
};

// Default composite strategy
export const DefaultVertexStrategy: CompositeVertexStrategy = {
  colour: DefaultColourStrategy,
  size: DefaultSizeStrategy,
  shape: DefaultShapeStrategy,
  label: DefaultLabelStrategy,
  tooltip: DefaultTooltipStrategy,
};

/**
 * Factory function for creating vertex renderers
 */
export function createVertexRenderer<TMetadata = Record<string, unknown>>(
  config?: Partial<VertexRendererConfig<TMetadata>>
): VertexRenderer<TMetadata> {
  return new VertexRenderer({
    strategy: DefaultVertexStrategy as CompositeVertexStrategy<TMetadata>,
    ...config,
  });
}