'use client';

import { useState } from 'react';

import { useHybridStorage } from '@/hooks/use-hybrid-storage';

import * as styles from './storage-manager.css';

export function StorageManager() {
  const { metrics, cleanupOldData, updateMetrics, isInitialised } = useHybridStorage();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);
    
    try {
      const deleted = await cleanupOldData(30);
      setCleanupResult(`Cleaned up ${deleted} old search results`);
      await updateMetrics();
    } catch {
      setCleanupResult('Cleanup failed');
    } finally {
      setIsCleaningUp(false);
    }
  };

  if (!isInitialised) {
    return null;
  }

  const usagePercentage = metrics.indexedDBUsage && metrics.indexedDBQuota
    ? (metrics.indexedDBUsage / metrics.indexedDBQuota) * 100
    : 0;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Storage Management</h3>
      
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.label}>localStorage:</span>
          <span className={styles.value}>{formatBytes(metrics.localStorageSize)}</span>
        </div>
        
        {metrics.indexedDBUsage && (
          <div className={styles.metric}>
            <span className={styles.label}>IndexedDB:</span>
            <span className={styles.value}>
              {formatBytes(metrics.indexedDBUsage)} / {formatBytes(metrics.indexedDBQuota)}
            </span>
          </div>
        )}
      </div>

      {metrics.indexedDBUsage && metrics.indexedDBQuota && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <span className={styles.progressLabel}>
            {usagePercentage.toFixed(1)}% used
          </span>
        </div>
      )}

      <div className={styles.actions}>
        <button
          onClick={handleCleanup}
          disabled={isCleaningUp}
          className={styles.button}
        >
          {isCleaningUp ? 'Cleaning...' : 'Clean old data (30+ days)'}
        </button>
        
        <button
          onClick={updateMetrics}
          className={styles.button}
        >
          Refresh metrics
        </button>
      </div>

      {cleanupResult && (
        <div className={styles.result}>
          {cleanupResult}
        </div>
      )}
    </div>
  );
}