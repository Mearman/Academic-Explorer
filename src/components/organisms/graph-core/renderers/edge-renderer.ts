/**
 * Generic edge renderer with pluggable strategy pattern for graph visualisation
 * Supports SVG and Canvas rendering contexts with composable strategies
 */

import type { RenderingContext, VertexData } from './vertex-renderer';

// Generic edge data with metadata support
export interface EdgeData<TMetadata = Record<string, unknown>> {
  id: string;
  source: string; // Source vertex ID
  target: string; // Target vertex ID
  metadata: TMetadata;
  // Optional computed properties for caching
  _computedColour?: string;
  _computedWidth?: number;
  _computedLabel?: string;
}

// Edge path calculation utilities
export interface EdgePath {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  controlPoints?: Array<{ x: number; y: number }>; // For curved edges
  midpoint: { x: number; y: number };
}

export function calculateEdgePath<TMetadata = Record<string, unknown>>(
  sourceVertex: VertexData<TMetadata>,
  targetVertex: VertexData<TMetadata>,
  curvature = 0
): EdgePath {
  const sourceX = sourceVertex.x;
  const sourceY = sourceVertex.y;
  const targetX = targetVertex.x;
  const targetY = targetVertex.y;
  
  const midpoint = {
    x: (sourceX + targetX) / 2,
    y: (sourceY + targetY) / 2,
  };

  let controlPoints: Array<{ x: number; y: number }> | undefined;
  
  if (curvature > 0) {
    // Calculate perpendicular offset for curve
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length > 0) {
      const offsetX = (-dy / length) * curvature * length * 0.2;
      const offsetY = (dx / length) * curvature * length * 0.2;
      
      controlPoints = [{
        x: midpoint.x + offsetX,
        y: midpoint.y + offsetY,
      }];
    }
  }

  return {
    sourceX,
    sourceY,
    targetX,
    targetY,
    controlPoints,
    midpoint,
  };
}

// Edge rendering strategy interfaces
export interface EdgeColourStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  getColour(edge: EdgeData<TMetadata>, context: RenderingContext): string;
}

export interface EdgeWidthStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  getWidth(edge: EdgeData<TMetadata>, context: RenderingContext): number;
}

export interface EdgeStyleStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  renderEdge(
    edge: EdgeData<TMetadata>,
    path: EdgePath,
    context: RenderingContext,
    colour: string,
    width: number
  ): void;
}

export interface EdgeLabelStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  getLabel(edge: EdgeData<TMetadata>, context: RenderingContext): string | null;
  renderLabel(
    edge: EdgeData<TMetadata>,
    path: EdgePath,
    context: RenderingContext,
    label: string
  ): void;
}

export interface EdgeArrowStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  shouldRenderArrow(edge: EdgeData<TMetadata>, context: RenderingContext): boolean;
  renderArrow(
    edge: EdgeData<TMetadata>,
    path: EdgePath,
    context: RenderingContext,
    colour: string,
    width: number
  ): void;
}

export interface EdgeTooltipStrategy<TMetadata = Record<string, unknown>> {
  readonly name: string;
  getTooltipContent(edge: EdgeData<TMetadata>, context: RenderingContext): string | null;
}

// Composition strategy for combining multiple strategies
export interface CompositeEdgeStrategy<TMetadata = Record<string, unknown>> {
  colour: EdgeColourStrategy<TMetadata>;
  width: EdgeWidthStrategy<TMetadata>;
  style: EdgeStyleStrategy<TMetadata>;
  label?: EdgeLabelStrategy<TMetadata>;
  arrow?: EdgeArrowStrategy<TMetadata>;
  tooltip?: EdgeTooltipStrategy<TMetadata>;
}

// Edge renderer configuration
export interface EdgeRendererConfig<TMetadata = Record<string, unknown>> {
  strategy: CompositeEdgeStrategy<TMetadata>;
  enableCaching?: boolean;
  animationDuration?: number;
  debugMode?: boolean;
  defaultCurvature?: number;
}

// Vertex lookup function type for edge rendering
export type VertexLookupFunction<TMetadata = Record<string, unknown>> = (
  id: string
) => VertexData<TMetadata> | undefined;

// Main edge renderer class
export class EdgeRenderer<TMetadata = Record<string, unknown>> {
  private readonly config: Required<EdgeRendererConfig<TMetadata>>;
  private readonly cache = new Map<string, {
    colour?: string;
    width?: number;
    label?: string;
    path?: EdgePath;
    timestamp: number;
  }>();

  constructor(config: EdgeRendererConfig<TMetadata>) {
    this.config = {
      enableCaching: true,
      animationDuration: 300,
      debugMode: false,
      defaultCurvature: 0,
      ...config,
    };
  }

  /**
   * Render a single edge using the configured strategies
   */
  render(
    edge: EdgeData<TMetadata>,
    context: RenderingContext,
    vertexLookup: VertexLookupFunction<TMetadata>,
    curvature?: number
  ): void {
    const startTime = this.config.debugMode ? performance.now() : 0;

    try {
      // Find source and target vertices
      const sourceVertex = vertexLookup(edge.source);
      const targetVertex = vertexLookup(edge.target);

      if (!sourceVertex || !targetVertex) {
        if (this.config.debugMode) {
          console.warn(`Cannot render edge ${edge.id}: missing vertices`);
        }
        return;
      }

      // Calculate edge path
      const path = this.getEdgePath(edge, sourceVertex, targetVertex, curvature);

      // Get rendering properties using strategies with caching
      const colour = this.getEdgeColour(edge, context);
      const width = this.getEdgeWidth(edge, context);

      // Render edge style
      this.config.strategy.style.renderEdge(edge, path, context, colour, width);

      // Render arrow if strategy provided
      if (this.config.strategy.arrow?.shouldRenderArrow(edge, context)) {
        this.config.strategy.arrow.renderArrow(edge, path, context, colour, width);
      }

      // Render label if strategy provided
      if (this.config.strategy.label) {
        const label = this.getEdgeLabel(edge, context);
        if (label) {
          this.config.strategy.label.renderLabel(edge, path, context, label);
        }
      }

      if (this.config.debugMode) {
        const duration = performance.now() - startTime;
        console.debug(`Rendered edge ${edge.id} in ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error(`Failed to render edge ${edge.id}:`, error);
      // Render fallback representation
      this.renderFallback(edge, context, vertexLookup);
    }
  }

  /**
   * Batch render multiple edges with optimisation
   */
  renderBatch(
    edges: EdgeData<TMetadata>[],
    context: RenderingContext,
    vertexLookup: VertexLookupFunction<TMetadata>,
    curvature?: number
  ): void {
    const startTime = this.config.debugMode ? performance.now() : 0;
    let successCount = 0;
    let errorCount = 0;

    for (const edge of edges) {
      try {
        this.render(edge, context, vertexLookup, curvature);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Batch render failed for edge ${edge.id}:`, error);
      }
    }

    if (this.config.debugMode) {
      const duration = performance.now() - startTime;
      console.debug(
        `Batch rendered ${edges.length} edges in ${duration.toFixed(2)}ms ` +
        `(${successCount} success, ${errorCount} errors)`
      );
    }
  }

  /**
   * Get edge path using caching if enabled
   */
  private getEdgePath(
    edge: EdgeData<TMetadata>,
    sourceVertex: VertexData<TMetadata>,
    targetVertex: VertexData<TMetadata>,
    curvature?: number
  ): EdgePath {
    const actualCurvature = curvature ?? this.config.defaultCurvature;
    const cacheKey = `${edge.id}-path-${sourceVertex.x}-${sourceVertex.y}-${targetVertex.x}-${targetVertex.y}-${actualCurvature}`;
    
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached?.path && this.isCacheValid(cached.timestamp)) {
        return cached.path;
      }
    }

    const path = calculateEdgePath(sourceVertex, targetVertex, actualCurvature);
    
    if (this.config.enableCaching) {
      this.updateCache(cacheKey, { path });
    }
    
    return path;
  }

  /**
   * Get edge colour using caching if enabled
   */
  private getEdgeColour(edge: EdgeData<TMetadata>, context: RenderingContext): string {
    if (edge._computedColour) {
      return edge._computedColour;
    }

    const cacheKey = `${edge.id}-colour`;
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached?.colour && this.isCacheValid(cached.timestamp)) {
        edge._computedColour = cached.colour;
        return cached.colour;
      }
    }

    const colour = this.config.strategy.colour.getColour(edge, context);
    
    if (this.config.enableCaching) {
      this.updateCache(cacheKey, { colour });
    }
    
    edge._computedColour = colour;
    return colour;
  }

  /**
   * Get edge width using caching if enabled
   */
  private getEdgeWidth(edge: EdgeData<TMetadata>, context: RenderingContext): number {
    if (edge._computedWidth) {
      return edge._computedWidth;
    }

    const cacheKey = `${edge.id}-width`;
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached?.width && this.isCacheValid(cached.timestamp)) {
        edge._computedWidth = cached.width;
        return cached.width;
      }
    }

    const width = this.config.strategy.width.getWidth(edge, context);
    
    if (this.config.enableCaching) {
      this.updateCache(cacheKey, { width });
    }
    
    edge._computedWidth = width;
    return width;
  }

  /**
   * Get edge label using caching if enabled
   */
  private getEdgeLabel(edge: EdgeData<TMetadata>, context: RenderingContext): string | null {
    if (!this.config.strategy.label) {
      return null;
    }

    if (edge._computedLabel !== undefined) {
      return edge._computedLabel;
    }

    const cacheKey = `${edge.id}-label`;
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached?.label !== undefined && this.isCacheValid(cached.timestamp)) {
        edge._computedLabel = cached.label;
        return cached.label;
      }
    }

    const label = this.config.strategy.label.getLabel(edge, context);
    
    if (this.config.enableCaching) {
      this.updateCache(cacheKey, { label: label || '' });
    }
    
    edge._computedLabel = label || '';
    return label;
  }

  /**
   * Render fallback representation for failed renders
   */
  private renderFallback(
    edge: EdgeData<TMetadata>,
    context: RenderingContext,
    vertexLookup: VertexLookupFunction<TMetadata>
  ): void {
    const sourceVertex = vertexLookup(edge.source);
    const targetVertex = vertexLookup(edge.target);

    if (!sourceVertex || !targetVertex) {
      return;
    }

    const fallbackColour = '#cccccc';
    const fallbackWidth = 1;

    if (context.type === 'svg') {
      const line = context.createElement('line');
      context.setAttribute(line, 'x1', sourceVertex.x);
      context.setAttribute(line, 'y1', sourceVertex.y);
      context.setAttribute(line, 'x2', targetVertex.x);
      context.setAttribute(line, 'y2', targetVertex.y);
      context.setAttribute(line, 'stroke', fallbackColour);
      context.setAttribute(line, 'stroke-width', fallbackWidth);
      context.container.appendChild(line);
    } else if (context.type === 'canvas') {
      const ctx = context.context;
      ctx.save();
      ctx.strokeStyle = fallbackColour;
      ctx.lineWidth = fallbackWidth;
      ctx.beginPath();
      ctx.moveTo(sourceVertex.x, sourceVertex.y);
      ctx.lineTo(targetVertex.x, targetVertex.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Get tooltip content for an edge
   */
  getTooltipContent(edge: EdgeData<TMetadata>, context: RenderingContext): string | null {
    if (!this.config.strategy.tooltip) {
      return null;
    }
    return this.config.strategy.tooltip.getTooltipContent(edge, context);
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
  updateStrategy(strategy: Partial<CompositeEdgeStrategy<TMetadata>>): void {
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
  private updateCache(key: string, data: Partial<{ colour: string; width: number; label: string; path: EdgePath }>): void {
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
export const DefaultEdgeColourStrategy: EdgeColourStrategy = {
  name: 'default-edge-colour',
  getColour: () => '#95a5a6',
};

export const DefaultEdgeWidthStrategy: EdgeWidthStrategy = {
  name: 'default-edge-width',
  getWidth: () => 1,
};

export const DefaultEdgeStyleStrategy: EdgeStyleStrategy = {
  name: 'default-edge-line',
  renderEdge: (edge, path, context, colour, width) => {
    if (context.type === 'svg') {
      if (path.controlPoints && path.controlPoints.length > 0) {
        // Render curved edge using quadratic curve
        const control = path.controlPoints[0];
        const pathElement = context.createElement('path');
        const pathData = `M ${path.sourceX} ${path.sourceY} Q ${control.x} ${control.y} ${path.targetX} ${path.targetY}`;
        context.setAttribute(pathElement, 'd', pathData);
        context.setAttribute(pathElement, 'stroke', colour);
        context.setAttribute(pathElement, 'stroke-width', width);
        context.setAttribute(pathElement, 'fill', 'none');
        context.container.appendChild(pathElement);
      } else {
        // Render straight edge
        const line = context.createElement('line');
        context.setAttribute(line, 'x1', path.sourceX);
        context.setAttribute(line, 'y1', path.sourceY);
        context.setAttribute(line, 'x2', path.targetX);
        context.setAttribute(line, 'y2', path.targetY);
        context.setAttribute(line, 'stroke', colour);
        context.setAttribute(line, 'stroke-width', width);
        context.container.appendChild(line);
      }
    } else if (context.type === 'canvas') {
      const ctx = context.context;
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      
      if (path.controlPoints && path.controlPoints.length > 0) {
        // Render curved edge
        const control = path.controlPoints[0];
        ctx.moveTo(path.sourceX, path.sourceY);
        ctx.quadraticCurveTo(control.x, control.y, path.targetX, path.targetY);
      } else {
        // Render straight edge
        ctx.moveTo(path.sourceX, path.sourceY);
        ctx.lineTo(path.targetX, path.targetY);
      }
      
      ctx.stroke();
      ctx.restore();
    }
  },
};

export const DefaultEdgeLabelStrategy: EdgeLabelStrategy = {
  name: 'default-edge-label',
  getLabel: (edge) => edge.id,
  renderLabel: (edge, path, context, label) => {
    const fontSize = 10;
    
    if (context.type === 'svg') {
      const text = context.createElement('text');
      context.setAttribute(text, 'x', path.midpoint.x);
      context.setAttribute(text, 'y', path.midpoint.y);
      context.setAttribute(text, 'text-anchor', 'middle');
      context.setAttribute(text, 'font-size', fontSize);
      context.setAttribute(text, 'font-family', 'Arial, sans-serif');
      context.setAttribute(text, 'fill', '#666666');
      context.setAttribute(text, 'dominant-baseline', 'middle');
      text.textContent = label;
      context.container.appendChild(text);
    } else if (context.type === 'canvas') {
      const ctx = context.context;
      ctx.save();
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, path.midpoint.x, path.midpoint.y);
      ctx.restore();
    }
  },
};

export const DefaultEdgeArrowStrategy: EdgeArrowStrategy = {
  name: 'default-edge-arrow',
  shouldRenderArrow: () => true,
  renderArrow: (edge, path, context, colour, width) => {
    const arrowSize = Math.max(6, width * 3);
    const angle = Math.atan2(path.targetY - path.sourceY, path.targetX - path.sourceX);
    
    // Calculate arrow position (offset from target to avoid overlap)
    const offsetDistance = 8; // Adjust based on typical vertex size
    const arrowX = path.targetX - Math.cos(angle) * offsetDistance;
    const arrowY = path.targetY - Math.sin(angle) * offsetDistance;
    
    // Calculate arrow points
    const arrowAngle = Math.PI / 6; // 30 degrees
    const x1 = arrowX - arrowSize * Math.cos(angle - arrowAngle);
    const y1 = arrowY - arrowSize * Math.sin(angle - arrowAngle);
    const x2 = arrowX - arrowSize * Math.cos(angle + arrowAngle);
    const y2 = arrowY - arrowSize * Math.sin(angle + arrowAngle);

    if (context.type === 'svg') {
      const polygon = context.createElement('polygon');
      const points = `${arrowX},${arrowY} ${x1},${y1} ${x2},${y2}`;
      context.setAttribute(polygon, 'points', points);
      context.setAttribute(polygon, 'fill', colour);
      context.container.appendChild(polygon);
    } else if (context.type === 'canvas') {
      const ctx = context.context;
      ctx.save();
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },
};

export const DefaultEdgeTooltipStrategy: EdgeTooltipStrategy = {
  name: 'default-edge-tooltip',
  getTooltipContent: (edge) => `Edge: ${edge.source} → ${edge.target}`,
};

// Default composite strategy
export const DefaultEdgeStrategy: CompositeEdgeStrategy = {
  colour: DefaultEdgeColourStrategy,
  width: DefaultEdgeWidthStrategy,
  style: DefaultEdgeStyleStrategy,
  label: DefaultEdgeLabelStrategy,
  arrow: DefaultEdgeArrowStrategy,
  tooltip: DefaultEdgeTooltipStrategy,
};

/**
 * Factory function for creating edge renderers
 */
export function createEdgeRenderer<TMetadata = Record<string, unknown>>(
  config?: Partial<EdgeRendererConfig<TMetadata>>
): EdgeRenderer<TMetadata> {
  return new EdgeRenderer({
    strategy: DefaultEdgeStrategy as CompositeEdgeStrategy<TMetadata>,
    ...config,
  });
}