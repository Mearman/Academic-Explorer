import { MetricIcon } from '@/components/atoms/metric-icon';
import type { SizeVariant } from '@/components/types';

interface MetricLabelProps {
  label: string;
  icon?: string;
  size: SizeVariant;
  layout: 'horizontal' | 'vertical' | 'compact';
  className?: string;
}

export function MetricLabel({ 
  label, 
  icon, 
  size, 
  layout, 
  className = '' 
}: MetricLabelProps) {
  return (
    <div className={className}>
      {icon && layout === 'compact' && (
        <MetricIcon 
          icon={icon} 
          size={size} 
          layout={layout} 
        />
      )}
      {label}
    </div>
  );
}