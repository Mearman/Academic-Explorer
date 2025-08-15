import { forwardRef } from 'react';

import { LoadingSkeleton } from '@/components/atoms/loading-skeleton';

import * as styles from '../metric-display.css';

interface LoadingStateProps {
  icon?: string;
  layout: 'horizontal' | 'vertical' | 'compact';
  description?: string;
  className: string;
  'data-testid'?: string;
}

export const LoadingState = forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ icon, layout, description, className, 'data-testid': testId, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={className}
        data-testid={testId}
        {...props}
      >
        {icon && layout !== 'compact' && (
          <div className={styles.iconContainer}>
            <LoadingSkeleton shape="circle" width="24px" height="24px" />
          </div>
        )}
        <div className={styles.contentContainer}>
          <LoadingSkeleton preset="text" width="60%" />
          <LoadingSkeleton preset="title" width="40%" />
          {description && (
            <LoadingSkeleton preset="text" width="80%" />
          )}
        </div>
      </div>
    );
  }
);

LoadingState.displayName = 'LoadingState';