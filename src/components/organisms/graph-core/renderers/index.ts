/**
 * Graph renderer system exports
 * Comprehensive pluggable renderer system for graph visualisation
 */

// Vertex renderer exports
export type {
  VertexData,
  ColourStrategy,
  SizeStrategy,
  ShapeStrategy,
  LabelStrategy,
  TooltipStrategy as VertexTooltipStrategy,
  CompositeVertexStrategy,
  VertexRendererConfig,
} from './vertex-renderer';

export {
  VertexRenderer,
  DefaultColourStrategy,
  DefaultSizeStrategy,
  DefaultShapeStrategy,
  DefaultLabelStrategy,
  DefaultTooltipStrategy,
  DefaultVertexStrategy,
  createVertexRenderer,
} from './vertex-renderer';

// Edge renderer exports
export type {
  EdgeData,
  EdgePath,
  EdgeColourStrategy,
  EdgeWidthStrategy,
  EdgeStyleStrategy,
  EdgeLabelStrategy,
  EdgeArrowStrategy,
  EdgeTooltipStrategy,
  CompositeEdgeStrategy,
  EdgeRendererConfig,
  VertexLookupFunction,
} from './edge-renderer';

export {
  EdgeRenderer,
  calculateEdgePath,
  DefaultEdgeColourStrategy,
  DefaultEdgeWidthStrategy,
  DefaultEdgeStyleStrategy,
  DefaultEdgeLabelStrategy,
  DefaultEdgeArrowStrategy,
  DefaultEdgeTooltipStrategy,
  DefaultEdgeStrategy,
  createEdgeRenderer,
} from './edge-renderer';

// Registry exports
export type {
  RendererInfo,
  StrategyInfo,
  VertexRendererEntry,
  EdgeRendererEntry,
  VertexStrategyEntry,
  EdgeStrategyEntry,
  RegistryConfig,
} from './renderer-registry';

export {
  RendererRegistry,
  getRendererRegistry,
  createRendererRegistry,
  createCompositeVertexRenderer,
  createCompositeEdgeRenderer,
} from './renderer-registry';

// Common rendering context exports
export type {
  SVGRenderingContext,
  CanvasRenderingContext,
  RenderingContext,
} from './vertex-renderer';

/**
 * Quick start examples and usage patterns
 */

// Import functions and types for use in examples
import {
  createEdgeRenderer,
  EdgeColourStrategy,
  DefaultEdgeStrategy,
  CompositeEdgeStrategy,
  EdgeData,
} from './edge-renderer';
import { getRendererRegistry } from './renderer-registry';
import {
  createVertexRenderer,
  ColourStrategy,
  DefaultVertexStrategy,
  CompositeVertexStrategy,
  VertexData,
} from './vertex-renderer';

// Example: Creating a basic renderer with default strategies
export const createBasicGraphRenderer = <TMetadata = Record<string, unknown>>() => {
  const vertexRenderer = createVertexRenderer<TMetadata>();
  const edgeRenderer = createEdgeRenderer<TMetadata>();
  
  return { vertexRenderer, edgeRenderer };
};

// Example: Creating a renderer with custom colour strategy
export const createColouredGraphRenderer = <TMetadata = Record<string, unknown>>(
  vertexColours: Record<string, string>,
  edgeColours: Record<string, string>
) => {
  const customVertexColour: ColourStrategy<TMetadata> = {
    name: 'custom-vertex-colour',
    getColour: (vertex: VertexData<TMetadata>) => {
      // Use metadata to determine colour or fallback to default
      const {type} = (vertex.metadata as { type?: string });
      return type && vertexColours[type] ? vertexColours[type] : '#3498db';
    },
  };

  const customEdgeColour: EdgeColourStrategy<TMetadata> = {
    name: 'custom-edge-colour',
    getColour: (edge: EdgeData<TMetadata>) => {
      // Use metadata to determine colour or fallback to default
      const {type} = (edge.metadata as { type?: string });
      return type && edgeColours[type] ? edgeColours[type] : '#95a5a6';
    },
  };

  const vertexRenderer = createVertexRenderer<TMetadata>({
    strategy: {
      ...DefaultVertexStrategy,
      colour: customVertexColour,
    } as CompositeVertexStrategy<TMetadata>,
  });

  const edgeRenderer = createEdgeRenderer<TMetadata>({
    strategy: {
      ...DefaultEdgeStrategy,
      colour: customEdgeColour,
    } as CompositeEdgeStrategy<TMetadata>,
  });

  return { vertexRenderer, edgeRenderer };
};

// Example: Using the registry system
export const createRegistryBasedRenderer = <TMetadata = Record<string, unknown>>(
  dataTypes: string[]
) => {
  const registry = getRendererRegistry();
  
  // Auto-select best renderers based on data types
  const vertexRendererName = registry.selectBestVertexRenderer(dataTypes) || 'default';
  const edgeRendererName = registry.selectBestEdgeRenderer(dataTypes) || 'default';
  
  const vertexRenderer = registry.createVertexRenderer<TMetadata>(vertexRendererName);
  const edgeRenderer = registry.createEdgeRenderer<TMetadata>(edgeRendererName);
  
  return { 
    vertexRenderer: vertexRenderer!,
    edgeRenderer: edgeRenderer!,
    registry 
  };
};