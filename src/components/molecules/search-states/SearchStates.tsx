import React from 'react';

import { LoadingSkeleton, SkeletonGroup, ErrorMessage } from '@/components';

import * as styles from './search-states.css';

interface LoadingStateProps {
  className?: string;
}

export function LoadingState({ className }: LoadingStateProps) {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.loading}>
        <SkeletonGroup lines={5}>
          <LoadingSkeleton height="120px" />
        </SkeletonGroup>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <ErrorMessage 
        title="Search Error"
        message={error}
        actions={[
          {
            label: "Try Again",
            onClick: onRetry
          }
        ]}
      />
    </div>
  );
}

interface EmptyStateProps {
  hasSearched?: boolean;
  className?: string;
}

export function EmptyState({ hasSearched = false, className }: EmptyStateProps) {
  if (!hasSearched) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.emptyState}>
          <h2>Ready to search</h2>
          <p>Enter search terms and configure filters to find academic works.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.noResults}>
      <h3>No results found</h3>
      <p>Try adjusting your search terms or filters.</p>
    </div>
  );
}