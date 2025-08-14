/**
 * Entity Page Skeleton Organism
 * Complex skeleton layout for entity pages
 */

import React from 'react';
import { Skeleton } from '../atoms/skeleton';
import * as styles from './entity-page-skeleton.css';

export function EntityPageSkeleton() {
  return (
    <div className={styles.container}>
      {/* Header skeleton */}
      <div className={styles.header}>
        <div className={styles.badgeRow}>
          <Skeleton width="80px" height="24px" />
          <Skeleton width="120px" height="20px" />
        </div>
        <Skeleton width="60%" height="32px" />
        <Skeleton width="40%" height="20px" />
      </div>
      
      {/* Metadata skeleton */}
      <div className={styles.metadataGrid}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.metadataItem}>
            <Skeleton width="80px" height="16px" />
            <Skeleton width="100%" height="20px" />
          </div>
        ))}
      </div>
      
      {/* Content skeleton */}
      <div className={styles.content}>
        <Skeleton width="30%" height="24px" />
        <div className={styles.textLines}>
          <Skeleton width="100%" height="16px" />
          <Skeleton width="100%" height="16px" />
          <Skeleton width="80%" height="16px" />
        </div>
      </div>
      
      {/* Stats skeleton */}
      <div className={styles.statsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.statItem}>
            <Skeleton width="100%" height="32px" />
            <Skeleton width="80%" height="16px" />
          </div>
        ))}
      </div>
      
      {/* Related items skeleton */}
      <div className={styles.relatedSection}>
        <Skeleton width="25%" height="24px" />
        <div className={styles.relatedItems}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.relatedItem}>
              <Skeleton width="48px" height="48px" rounded />
              <div className={styles.relatedContent}>
                <Skeleton width="70%" height="18px" />
                <Skeleton width="50%" height="14px" />
                <Skeleton width="30%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CompactEntitySkeleton() {
  return (
    <div className={styles.compactContainer}>
      <div className={styles.compactContent}>
        <Skeleton width="40px" height="40px" rounded />
        <div className={styles.compactText}>
          <Skeleton width="70%" height="18px" />
          <Skeleton width="50%" height="14px" />
          <div className={styles.compactMeta}>
            <Skeleton width="60px" height="12px" />
            <Skeleton width="80px" height="12px" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }, (_, i) => (
        <td key={i} className={styles.tableCell}>
          <Skeleton width="100%" height="16px" />
        </td>
      ))}
    </tr>
  );
}