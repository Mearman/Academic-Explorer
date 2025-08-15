import { MetricIcon } from '@/components/atoms/metric-icon';
import { MetricLabel } from '@/components/atoms/metric-label';
import { MetricValue } from '@/components/atoms/metric-value';
import type { SizeVariant } from '@/components/types';
import type { MetricFormat, TrendDirection } from '@/lib/metric-formatting';

import * as styles from '../metric-display.css';
import { MetricExtras } from '../metric-extras';

interface MetricContentProps {
  label: string;
  value: number | string;
  format: MetricFormat;
  icon?: string;
  layout: 'horizontal' | 'vertical' | 'compact';
  size: SizeVariant;
  description?: string;
  trend?: {
    direction: TrendDirection;
    value?: number | string;
    label?: string;
  };
  accessories?: React.ReactNode;
}

export function MetricContent({
  label,
  value,
  format,
  icon,
  layout,
  size,
  description,
  trend,
  accessories,
}: MetricContentProps) {
  return (
    <>
      {icon && layout !== 'compact' && (
        <MetricIcon icon={icon} size={size} layout={layout} className={styles.iconContainer} />
      )}
      
      <div className={styles.contentContainer}>
        <MetricLabel
          label={label}
          icon={icon}
          size={size}
          layout={layout}
          className={styles.labelStyle}
        />
        
        <MetricValue 
          value={value} 
          format={format} 
          trend={trend}
          className={styles.valueContainer}
          valueClassName={styles.valueStyle}
          trendClassName={`${styles.trendContainer} ${trend ? styles.trendVariants[trend.direction] : ''}`}
        />
        <MetricExtras description={description} accessories={accessories} />
      </div>
    </>
  );
}