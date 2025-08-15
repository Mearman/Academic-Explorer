import { Icon } from '@/components/atoms/icon';
import { getTrendIcon, formatTrendValue } from '@/lib/metric-formatting';
import type { TrendDirection } from '@/lib/metric-formatting';

import * as styles from '../metric-display.css';

interface TrendIndicatorProps {
  direction: TrendDirection;
  value?: number | string;
  label?: string;
}

export function TrendIndicator({ direction, value, label }: TrendIndicatorProps) {
  return (
    <div className={`${styles.trendContainer} ${styles.trendVariants[direction]}`}>
      <Icon 
        name={getTrendIcon(direction)} 
        size="sm" 
        aria-hidden="true" 
      />
      {value && (
        <span className={styles.changeValueStyle}>
          {formatTrendValue(value)}
          {label && <span> {label}</span>}
        </span>
      )}
    </div>
  );
}