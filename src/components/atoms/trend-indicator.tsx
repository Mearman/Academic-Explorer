import { Icon } from '@/components/atoms/icon';
import { getTrendIcon, formatTrendValue } from '@/lib/metric-formatting';
import type { TrendDirection } from '@/lib/metric-formatting';

interface TrendIndicatorProps {
  direction: TrendDirection;
  value?: number | string;
  label?: string;
  className?: string;
  valueClassName?: string;
}

export function TrendIndicator({ 
  direction, 
  value, 
  label, 
  className = '',
  valueClassName = ''
}: TrendIndicatorProps) {
  return (
    <div className={className}>
      <Icon 
        name={getTrendIcon(direction)} 
        size="sm" 
        aria-hidden="true" 
      />
      {value && (
        <span className={valueClassName}>
          {formatTrendValue(value)}
          {label && <span> {label}</span>}
        </span>
      )}
    </div>
  );
}