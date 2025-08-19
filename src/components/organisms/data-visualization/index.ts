/**
 * Data Visualization Components Module
 * 
 * Export for data visualization components and related utilities
 */

// Import components first
import { NetworkDiagram } from './network-diagram';
import { TimelineChart } from './timeline-chart';

// Export with named exports
export { NetworkDiagram, TimelineChart };

// Legacy exports for backwards compatibility
export { NetworkDiagram as NetworkVisualization };
export { TimelineChart as Chart };

// Re-export types
export type { TimelineChartProps, TimelineSeries, TimelineDataPoint } from './timeline-chart';
export type * from './types';