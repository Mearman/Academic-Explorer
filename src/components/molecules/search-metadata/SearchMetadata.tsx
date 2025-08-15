import React from 'react';

import * as styles from '../../organisms/search-results.css';

interface SearchMetadataProps {
  count: number;
  responseTimeMs?: number;
  loading: boolean;
}

export function SearchMetadata({ count, responseTimeMs, loading }: SearchMetadataProps) {
  return (
    <div className={styles.metadata}>
      <div className={styles.resultsInfo}>
        <span className={styles.count}>
          {count.toLocaleString()} results
        </span>
        {responseTimeMs && (
          <span className={styles.responseTime}>
            ({responseTimeMs}ms)
          </span>
        )}
      </div>
      
      {loading && (
        <div className={styles.loadingIndicator}>
          Searching...
        </div>
      )}
    </div>
  );
}