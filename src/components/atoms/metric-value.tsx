import { TrendIndicator } from '@/components/atoms/trend-indicator';
import { formatMetricValue } from '@/lib/metric-formatting';
import type { MetricFormat, TrendDirection } from '@/lib/metric-formatting';

interface MetricValueProps {
  value: number | string;
  format: MetricFormat;
  trend?: {
    direction: TrendDirection;
    value?: number | string;
    label?: string;
  };
  className?: string;
  valueClassName?: string;
  trendClassName?: string;
}

export function MetricValue({ 
  value, 
  format, 
  trend, 
  className = '',
  valueClassName = '',
  trendClassName = ''
}: MetricValueProps) {
  return (
    <div className={className}>
      <span className={valueClassName}>
        {formatMetricValue(value, format)}
      </span>
      
      {trend && (
        <TrendIndicator
          direction={trend.direction}
          value={trend.value}
          label={trend.label}
          className={trendClassName}
        />
      )}
    </div>
  );
}