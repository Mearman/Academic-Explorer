/**
 * Entity Loading Molecule
 * Combines loading spinner with entity-specific messaging
 */

import React from 'react';
import { LoadingSpinner } from '../atoms/loading-spinner';
import * as styles from './entity-loading.css';

export interface EntityLoadingProps {
  entityType?: string;
  entityId?: string;
  message?: string;
}

export function EntityLoading({ 
  entityType = 'entity', 
  entityId,
  message 
}: EntityLoadingProps) {
  const displayMessage = message || `Loading ${entityType.slice(0, -1)}...`;
  
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <LoadingSpinner size="lg" className={styles.spinner} />
        <h2 className={styles.message}>
          {displayMessage}
        </h2>
        {entityId && (
          <p className={styles.entityId}>
            ID: <code className={styles.code}>{entityId}</code>
          </p>
        )}
      </div>
    </div>
  );
}