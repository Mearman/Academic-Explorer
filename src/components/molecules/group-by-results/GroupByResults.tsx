import React from 'react';

import type { ApiResponse, Work } from '@/lib/openalex/types';

import * as styles from './group-by-results.css';

interface GroupByResultsProps {
  groupBy: ApiResponse<Work>['group_by'];
}

export function GroupByResults({ groupBy }: GroupByResultsProps) {
  if (!groupBy || groupBy.length === 0) return null;

  return (
    <div className={styles.groupBySection}>
      <h3 className={styles.groupByTitle}>Results by Category</h3>
      <div className={styles.groupByGrid}>
        {groupBy.map((group, index) => (
          <div key={index} className={styles.groupByItem}>
            <span className={styles.groupByKey}>
              {group.key_display_name || group.key}
            </span>
            <span className={styles.groupByCount}>
              {group.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}