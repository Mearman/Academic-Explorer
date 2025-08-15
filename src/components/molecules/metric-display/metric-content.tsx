import { Icon } from '@/components/atoms/icon';
import type { SizeVariant } from '@/components/types';
import { formatMetricValue } from '@/lib/metric-formatting';
import type { MetricFormat, TrendDirection } from '@/lib/metric-formatting';

import * as styles from '../metric-display.css';

import { TrendIndicator } from './trend-indicator';

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
        <div className={styles.iconContainer}>
          <Icon 
            name={icon} 
            size={size === 'sm' ? 'sm' : 'md'} 
            aria-hidden="true" 
          />
        </div>
      )}
      
      <div className={styles.contentContainer}>
        <div className={styles.labelStyle}>
          {icon && layout === 'compact' && (
            <Icon name={icon} size="sm" aria-hidden="true" />
          )}
          {label}
        </div>
        
        <div className={styles.valueContainer}>
          <span className={styles.valueStyle}>
            {formatMetricValue(value, format)}
          </span>
          
          {trend && (
            <TrendIndicator
              direction={trend.direction}
              value={trend.value}
              label={trend.label}
            />
          )}
        </div>
        
        {description && (
          <div className={styles.descriptionStyle}>
            {description}
          </div>
        )}
        
        {accessories && (
          <div className={styles.accessoryContainer}>
            {accessories}
          </div>
        )}
      </div>
    </>
  );
}