import { formatNumber } from '@/lib/openalex/utils/transformers';

export const TREND_ICONS = { up: '^', down: 'v', neutral: '->' } as const;

export function formatMetricValue(value: number | string, format: string): string {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'percentage': return `${value.toFixed(1)}%`;
    case 'currency': return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
    case 'compact': return formatNumber(value);
    default: return value.toLocaleString('en-GB');
  }
}