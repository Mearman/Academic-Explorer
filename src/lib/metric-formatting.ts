import type { SizeVariant } from '@/components/types';
import { formatNumber } from '@/lib/openalex/utils/transformers';


export type MetricFormat = 'number' | 'percentage' | 'currency' | 'compact';
export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Format a value based on the specified format type
 */
export function formatMetricValue(value: number | string, format: MetricFormat): string {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-GB', { 
        style: 'currency', 
        currency: 'GBP' 
      }).format(value);
    case 'compact':
      return formatNumber(value);
    case 'number':
    default:
      return value.toLocaleString('en-GB');
  }
}

/**
 * Get the icon name for a trend direction
 */
export function getTrendIcon(direction: TrendDirection): string {
  switch (direction) {
    case 'up': return 'trend_up';
    case 'down': return 'trend_down';
    case 'neutral': return 'trend_neutral';
    default: return 'trend_neutral';
  }
}

/**
 * Map size variant to available CSS size options
 */
export function mapSizeVariant(size: SizeVariant): 'sm' | 'md' | 'lg' {
  if (size === 'xs') return 'sm';
  if (size === 'xl') return 'lg';
  if (size === 'sm') return 'sm';
  if (size === 'md') return 'md';
  if (size === 'lg') return 'lg';
  return 'md'; // default fallback
}

/**
 * Format trend value for display
 */
export function formatTrendValue(value: number | string): string {
  return typeof value === 'number' ? value.toFixed(1) : value;
}