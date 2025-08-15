import { Icon } from '@/components/atoms/icon';
import type { SizeVariant } from '@/components/types';

interface MetricIconProps {
  icon: string;
  size: SizeVariant;
  layout: 'horizontal' | 'vertical' | 'compact';
  className?: string;
}

export function MetricIcon({ icon, size, layout, className = '' }: MetricIconProps) {
  if (layout === 'compact') {
    return <Icon name={icon} size="sm" aria-hidden="true" />;
  }

  return (
    <div className={className}>
      <Icon 
        name={icon} 
        size={size === 'sm' ? 'sm' : 'md'} 
        aria-hidden="true" 
      />
    </div>
  );
}