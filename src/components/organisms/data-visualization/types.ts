/**
 * Advanced Data Visualization Types for Academic Explorer
 * 
 * Comprehensive type definitions for sophisticated academic data visualizations
 * including timeline charts, network diagrams, heatmaps, Sankey diagrams,
 * and statistical dashboards.
 */

import type { Work, Author, Institution, Topic, Concept } from '@/lib/openalex/types';

// ============================================================================
// Base Visualization Types
// ============================================================================

/**
 * Base interface for all visualization components
 */
export interface BaseVisualizationProps {
  /** Unique identifier for the visualization */
  id?: string;
  /** CSS class names */
  className?: string;
  /** Visualization dimensions */
  width?: number;
  height?: number;
  /** Whether to show loading state */
  loading?: boolean;
  /** Error state */
  error?: string | null;
  /** Accessibility label */
  ariaLabel?: string;
  /** Whether visualization is interactive */
  interactive?: boolean;
  /** Export configuration */
  exportConfig?: ExportConfiguration;
}

/**
 * Export configuration for visualizations
 */
export interface ExportConfiguration {
  /** Supported export formats */
  formats: ExportFormat[];
  /** Default filename prefix */
  filenamePrefix?: string;
  /** Include metadata in exports */
  includeMetadata?: boolean;
  /** Custom export handlers */
  customHandlers?: Record<ExportFormat, (data: unknown) => void>;
}

/**
 * Supported export formats
 */
export type ExportFormat = 'svg' | 'png' | 'pdf' | 'csv' | 'json' | 'html';

/**
 * Color scheme options
 */
export type ColorScheme = 'categorical' | 'sequential' | 'diverging' | 'entity-based';

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /** Enable animations */
  enabled: boolean;
  /** Animation duration in milliseconds */
  duration: number;
  /** Animation easing function */
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  /** Delay before animation starts */
  delay?: number;
}

// ============================================================================
// Timeline Chart Types
// ============================================================================

/**
 * Timeline chart data point
 */
export interface TimelineDataPoint {
  /** Date/time value */
  date: Date;
  /** Numeric value */
  value: number;
  /** Optional label */
  label?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Associated entity */
  entity?: Work | Author | Institution;
}

/**
 * Timeline series configuration
 */
export interface TimelineSeries {
  /** Series identifier */
  id: string;
  /** Series name */
  name: string;
  /** Data points */
  data: TimelineDataPoint[];
  /** Series color */
  color?: string;
  /** Series style */
  style?: 'line' | 'area' | 'bar' | 'scatter';
  /** Whether series is visible */
  visible?: boolean;
}

/**
 * Timeline chart configuration
 */
export interface TimelineChartProps extends BaseVisualizationProps {
  /** Timeline series data */
  series: TimelineSeries[];
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Chart styling */
  style?: TimelineStyleConfig;
  /** Interactive features */
  interactions?: TimelineInteractionConfig;
  /** Event handlers */
  onPointClick?: (point: TimelineDataPoint, series: TimelineSeries) => void;
  onPointHover?: (point: TimelineDataPoint | null, series?: TimelineSeries) => void;
  onRangeSelect?: (startDate: Date, endDate: Date) => void;
}

/**
 * Axis configuration
 */
export interface AxisConfig {
  /** Axis label */
  label?: string;
  /** Tick configuration */
  ticks?: TickConfig;
  /** Domain (min/max values) */
  domain?: [number, number] | [Date, Date];
  /** Scale type */
  scale?: 'linear' | 'log' | 'time' | 'ordinal';
  /** Grid lines */
  grid?: boolean;
}

/**
 * Tick configuration
 */
export interface TickConfig {
  /** Number of ticks */
  count?: number;
  /** Tick format function */
  format?: (value: number | Date) => string;
  /** Tick values */
  values?: (number | Date)[];
}

/**
 * Timeline styling configuration
 */
export interface TimelineStyleConfig {
  /** Color scheme */
  colorScheme?: ColorScheme;
  /** Custom colors */
  colors?: string[];
  /** Line styles */
  lineStyle?: {
    strokeWidth?: number;
    strokeDasharray?: string;
  };
  /** Area styles */
  areaStyle?: {
    fillOpacity?: number;
    gradient?: boolean;
  };
  /** Point styles */
  pointStyle?: {
    radius?: number;
    strokeWidth?: number;
  };
}

/**
 * Timeline interaction configuration
 */
export interface TimelineInteractionConfig {
  /** Enable zooming */
  zoom?: boolean;
  /** Enable panning */
  pan?: boolean;
  /** Enable brushing (range selection) */
  brush?: boolean;
  /** Enable crosshair */
  crosshair?: boolean;
  /** Tooltip configuration */
  tooltip?: TooltipConfig;
}

/**
 * Tooltip configuration
 */
export interface TooltipConfig {
  /** Enable tooltip */
  enabled: boolean;
  /** Tooltip content renderer */
  content?: (point: TimelineDataPoint, series: TimelineSeries) => string | React.ReactNode;
  /** Tooltip position */
  position?: 'mouse' | 'fixed';
  /** Tooltip delay in milliseconds */
  delay?: number;
}

// ============================================================================
// Network Diagram Types
// ============================================================================

/**
 * Network node data
 */
export interface NetworkNode {
  /** Unique node identifier */
  id: string;
  /** Node label */
  label: string;
  /** Node type */
  type: string;
  /** Node size (relative) */
  size?: number;
  /** Node color */
  color?: string;
  /** Node position */
  x?: number;
  y?: number;
  /** Fixed position */
  fixed?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Associated entity */
  entity?: Work | Author | Institution | Topic | Concept;
}

/**
 * Network edge data
 */
export interface NetworkEdge {
  /** Edge identifier */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Edge weight */
  weight?: number;
  /** Edge type */
  type?: string;
  /** Edge color */
  color?: string;
  /** Edge style */
  style?: 'solid' | 'dashed' | 'dotted';
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Network clustering configuration
 */
export interface ClusterConfig {
  /** Clustering algorithm */
  algorithm: 'modularity' | 'louvain' | 'leiden' | 'kmeans' | 'hierarchical';
  /** Number of clusters (for k-means) */
  k?: number;
  /** Resolution parameter (for modularity-based algorithms) */
  resolution?: number;
  /** Minimum cluster size */
  minClusterSize?: number;
}

/**
 * Network layout configuration
 */
export interface NetworkLayoutConfig {
  /** Layout algorithm */
  algorithm: 'force' | 'spring' | 'circular' | 'grid' | 'hierarchical' | 'random';
  /** Layout parameters */
  parameters?: Record<string, number>;
  /** Animation during layout */
  animate?: boolean;
  /** Layout iterations */
  iterations?: number;
}

/**
 * Network diagram configuration
 */
export interface NetworkDiagramProps extends BaseVisualizationProps {
  /** Network nodes */
  nodes: NetworkNode[];
  /** Network edges */
  edges: NetworkEdge[];
  /** Layout configuration */
  layout?: NetworkLayoutConfig;
  /** Clustering configuration */
  clustering?: ClusterConfig;
  /** Styling configuration */
  style?: NetworkStyleConfig;
  /** Interactive features */
  interactions?: NetworkInteractionConfig;
  /** Event handlers */
  onNodeClick?: (node: NetworkNode) => void;
  onNodeHover?: (node: NetworkNode | null) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
  onClusterSelect?: (cluster: NetworkNode[]) => void;
}

/**
 * Network styling configuration
 */
export interface NetworkStyleConfig {
  /** Node styling */
  node?: {
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    strokeWidth?: number;
    opacity?: number;
  };
  /** Edge styling */
  edge?: {
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    opacity?: number;
  };
  /** Cluster styling */
  cluster?: {
    showHulls?: boolean;
    hullOpacity?: number;
    hullStroke?: number;
  };
  /** Labels */
  labels?: {
    show?: boolean;
    fontSize?: number;
    fontFamily?: string;
    threshold?: number; // Show labels only for nodes above this size
  };
}

/**
 * Network interaction configuration
 */
export interface NetworkInteractionConfig {
  /** Enable node dragging */
  drag?: boolean;
  /** Enable zooming */
  zoom?: boolean;
  /** Enable panning */
  pan?: boolean;
  /** Enable selection */
  selection?: boolean;
  /** Selection mode */
  selectionMode?: 'single' | 'multiple' | 'lasso';
  /** Hover effects */
  hover?: boolean;
  /** Tooltip configuration */
  tooltip?: TooltipConfig;
}

// ============================================================================
// Heatmap Types
// ============================================================================

/**
 * Heatmap data point
 */
export interface HeatmapDataPoint {
  /** X-axis value */
  x: string | number;
  /** Y-axis value */
  y: string | number;
  /** Heat value */
  value: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Heatmap configuration
 */
export interface HeatmapProps extends BaseVisualizationProps {
  /** Heatmap data */
  data: HeatmapDataPoint[];
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Color scale configuration */
  colorScale?: ColorScaleConfig;
  /** Styling configuration */
  style?: HeatmapStyleConfig;
  /** Interactive features */
  interactions?: HeatmapInteractionConfig;
  /** Event handlers */
  onCellClick?: (point: HeatmapDataPoint) => void;
  onCellHover?: (point: HeatmapDataPoint | null) => void;
}

/**
 * Color scale configuration
 */
export interface ColorScaleConfig {
  /** Color scheme */
  scheme: ColorScheme;
  /** Custom colors */
  colors?: string[];
  /** Domain (min/max values) */
  domain?: [number, number];
  /** Number of color steps */
  steps?: number;
  /** Interpolation method */
  interpolation?: 'linear' | 'log' | 'sqrt' | 'pow';
}

/**
 * Heatmap styling configuration
 */
export interface HeatmapStyleConfig {
  /** Cell styling */
  cell?: {
    strokeWidth?: number;
    strokeColor?: string;
    borderRadius?: number;
  };
  /** Gradient configuration */
  gradient?: {
    enabled?: boolean;
    direction?: 'horizontal' | 'vertical' | 'radial';
  };
}

/**
 * Heatmap interaction configuration
 */
export interface HeatmapInteractionConfig {
  /** Enable zooming */
  zoom?: boolean;
  /** Enable panning */
  pan?: boolean;
  /** Hover effects */
  hover?: boolean;
  /** Selection mode */
  selection?: 'single' | 'rectangle' | 'lasso';
  /** Tooltip configuration */
  tooltip?: TooltipConfig;
}

// ============================================================================
// Sankey Diagram Types
// ============================================================================

/**
 * Sankey node data
 */
export interface SankeyNode {
  /** Node identifier */
  id: string;
  /** Node label */
  label: string;
  /** Node category */
  category?: string;
  /** Node color */
  color?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Sankey link data
 */
export interface SankeyLink {
  /** Link identifier */
  id?: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Link value (flow amount) */
  value: number;
  /** Link color */
  color?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Sankey diagram configuration
 */
export interface SankeyDiagramProps extends BaseVisualizationProps {
  /** Sankey nodes */
  nodes: SankeyNode[];
  /** Sankey links */
  links: SankeyLink[];
  /** Layout configuration */
  layout?: SankeyLayoutConfig;
  /** Styling configuration */
  style?: SankeyStyleConfig;
  /** Interactive features */
  interactions?: SankeyInteractionConfig;
  /** Event handlers */
  onNodeClick?: (node: SankeyNode) => void;
  onNodeHover?: (node: SankeyNode | null) => void;
  onLinkClick?: (link: SankeyLink) => void;
  onLinkHover?: (link: SankeyLink | null) => void;
}

/**
 * Sankey layout configuration
 */
export interface SankeyLayoutConfig {
  /** Node alignment */
  nodeAlign?: 'left' | 'right' | 'center' | 'justify';
  /** Node padding */
  nodePadding?: number;
  /** Node width */
  nodeWidth?: number;
  /** Link sorting */
  linkSort?: 'ascending' | 'descending' | 'source' | 'target';
  /** Number of iterations for layout optimization */
  iterations?: number;
}

/**
 * Sankey styling configuration
 */
export interface SankeyStyleConfig {
  /** Node styling */
  node?: {
    strokeWidth?: number;
    strokeColor?: string;
    borderRadius?: number;
    opacity?: number;
  };
  /** Link styling */
  link?: {
    opacity?: number;
    curvature?: number;
    gradient?: boolean;
  };
  /** Labels */
  labels?: {
    show?: boolean;
    fontSize?: number;
    fontFamily?: string;
    position?: 'inside' | 'outside';
  };
}

/**
 * Sankey interaction configuration
 */
export interface SankeyInteractionConfig {
  /** Enable node dragging */
  drag?: boolean;
  /** Hover effects */
  hover?: boolean;
  /** Highlight connected elements on hover */
  highlightConnected?: boolean;
  /** Tooltip configuration */
  tooltip?: TooltipConfig;
}

// ============================================================================
// Statistical Dashboard Types
// ============================================================================

/**
 * Metric data for statistical displays
 */
export interface MetricData {
  /** Metric identifier */
  id: string;
  /** Metric name */
  name: string;
  /** Current value */
  value: number;
  /** Previous value (for trend calculation) */
  previousValue?: number;
  /** Metric unit */
  unit?: string;
  /** Metric category */
  category?: string;
  /** Format configuration */
  format?: MetricFormat;
  /** Trend configuration */
  trend?: TrendConfig;
}

/**
 * Metric formatting configuration
 */
export interface MetricFormat {
  /** Number format */
  type: 'number' | 'percentage' | 'currency' | 'duration' | 'bytes';
  /** Decimal places */
  precision?: number;
  /** Use abbreviations (K, M, B) */
  abbreviate?: boolean;
  /** Custom formatter function */
  formatter?: (value: number) => string;
}

/**
 * Trend configuration
 */
export interface TrendConfig {
  /** Show trend indicator */
  show: boolean;
  /** Trend direction */
  direction?: 'up' | 'down' | 'neutral';
  /** Trend percentage */
  percentage?: number;
  /** Trend color scheme */
  colorScheme?: 'default' | 'inverse';
}

/**
 * Comparison data for statistical analysis
 */
export interface ComparisonData {
  /** Comparison identifier */
  id: string;
  /** Comparison name */
  name: string;
  /** Data series for comparison */
  series: {
    name: string;
    values: number[];
    color?: string;
  }[];
  /** Categories (x-axis labels) */
  categories: string[];
  /** Comparison type */
  type: 'bar' | 'line' | 'area' | 'radar';
}

/**
 * Statistical dashboard configuration
 */
export interface StatisticalDashboardProps extends BaseVisualizationProps {
  /** Metric cards data */
  metrics?: MetricData[];
  /** Comparison charts data */
  comparisons?: ComparisonData[];
  /** Layout configuration */
  layout?: DashboardLayoutConfig;
  /** Styling configuration */
  style?: DashboardStyleConfig;
  /** Interactive features */
  interactions?: DashboardInteractionConfig;
  /** Event handlers */
  onMetricClick?: (metric: MetricData) => void;
  onComparisonClick?: (comparison: ComparisonData) => void;
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayoutConfig {
  /** Grid columns */
  columns?: number;
  /** Grid rows */
  rows?: number;
  /** Grid gap */
  gap?: number;
  /** Responsive breakpoints */
  breakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** Auto-layout */
  autoLayout?: boolean;
}

/**
 * Dashboard styling configuration
 */
export interface DashboardStyleConfig {
  /** Card styling */
  card?: {
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
    shadow?: boolean;
  };
  /** Chart styling */
  chart?: {
    height?: number;
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  };
  /** Typography */
  typography?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
  };
}

/**
 * Dashboard interaction configuration
 */
export interface DashboardInteractionConfig {
  /** Enable card interactions */
  cardInteractions?: boolean;
  /** Enable chart interactions */
  chartInteractions?: boolean;
  /** Enable filtering */
  filtering?: boolean;
  /** Enable sorting */
  sorting?: boolean;
  /** Tooltip configuration */
  tooltip?: TooltipConfig;
}

// ============================================================================
// Performance and Accessibility Types
// ============================================================================

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /** Enable canvas rendering for large datasets */
  useCanvas?: boolean;
  /** Data point threshold for canvas fallback */
  canvasThreshold?: number;
  /** Enable level-of-detail rendering */
  levelOfDetail?: boolean;
  /** Enable data sampling for performance */
  dataSampling?: boolean;
  /** Maximum data points to render */
  maxDataPoints?: number;
  /** Enable virtualization */
  virtualization?: boolean;
}

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
  /** Enable keyboard navigation */
  keyboardNavigation?: boolean;
  /** Enable screen reader support */
  screenReader?: boolean;
  /** High contrast mode */
  highContrast?: boolean;
  /** Reduced motion */
  reducedMotion?: boolean;
  /** Focus management */
  focusManagement?: boolean;
  /** ARIA labels and descriptions */
  ariaLabels?: Record<string, string>;
}

/**
 * Comprehensive visualization configuration
 */
export interface VisualizationConfig {
  /** Performance settings */
  performance?: PerformanceConfig;
  /** Accessibility settings */
  accessibility?: AccessibilityConfig;
  /** Animation settings */
  animation?: AnimationConfig;
  /** Export settings */
  export?: ExportConfiguration;
  /** Debug mode */
  debug?: boolean;
}