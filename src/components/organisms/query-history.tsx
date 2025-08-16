'use client';

import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import type { WorksParams } from '@/lib/openalex/types';
import { useAppStore, type QueryRecord } from '@/stores/app-store';

import * as styles from './query-history.css';

interface QueryHistoryProps {
  onRerunQuery?: (params: WorksParams) => void;
}

export function QueryHistory({ onRerunQuery }: QueryHistoryProps) {
  const navigate = useNavigate();
  const { queryHistory, clearQueryHistory } = useAppStore();
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);

  const handleRerunQuery = (query: QueryRecord) => {
    if (onRerunQuery) {
      onRerunQuery(query.params);
    } else {
      // Navigate to query page with the parameters
      const urlParams = buildUrlParams(query.params);
      navigate({
        to: '/query',
        search: urlParams,
      });
    }
  };

  const buildUrlParams = (params: WorksParams) => {
    const urlParams: Record<string, string | number> = {};

    if (params.search) urlParams.q = params.search;
    if (params.filter && typeof params.filter === 'string') urlParams.filter = params.filter;
    if (params.sort) urlParams.sort = params.sort;
    if (params.per_page) urlParams.per_page = params.per_page;
    if (params.page) urlParams.page = params.page;
    if (params.sample) urlParams.sample = params.sample;
    if (params.group_by) urlParams.group_by = params.group_by;
    if (params.from_publication_date) urlParams.from_date = params.from_publication_date;
    if (params.to_publication_date) urlParams.to_date = params.to_publication_date;

    return urlParams;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getQueryStatus = (query: QueryRecord) => {
    if (query.error) return 'error';
    if (query.results) return 'success';
    return 'pending';
  };

  const toggleQueryExpansion = (queryId: string) => {
    setExpandedQuery(expandedQuery === queryId ? null : queryId);
  };

  if (queryHistory.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>No Query History</h3>
        <p>Your executed queries will appear here with detailed results and timing information.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Query History</h3>
        <div className={styles.headerActions}>
          <span className={styles.queryCount}>{queryHistory.length} queries</span>
          <button 
            className={styles.clearButton}
            onClick={clearQueryHistory}
            type="button"
          >
            Clear History
          </button>
        </div>
      </div>

      <div className={styles.queryList}>
        {queryHistory.map((query) => {
          const status = getQueryStatus(query);
          const isExpanded = expandedQuery === query.id;

          return (
            <div 
              key={query.id} 
              className={`${styles.queryItem} ${styles[status]}`}
            >
              <div 
                className={styles.queryHeader}
                onClick={() => toggleQueryExpansion(query.id)}
              >
                <div className={styles.queryInfo}>
                  <div className={styles.queryText}>{query.query}</div>
                  <div className={styles.queryMeta}>
                    <span className={styles.timestamp}>
                      {formatTimestamp(query.timestamp)}
                    </span>
                    {query.results && (
                      <>
                        <span className={styles.resultCount}>
                          {query.results.count.toLocaleString()} results
                        </span>
                        <span className={styles.responseTime}>
                          {formatDuration(query.results.responseTimeMs)}
                        </span>
                      </>
                    )}
                    {query.error && (
                      <span className={styles.errorIndicator}>Error</span>
                    )}
                  </div>
                </div>
                <div className={styles.queryActions}>
                  <button
                    className={styles.rerunButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRerunQuery(query);
                    }}
                    type="button"
                  >
                    Rerun
                  </button>
                  <span className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.queryDetails}>
                  {query.error && (
                    <div className={styles.errorDetails}>
                      <strong>Error:</strong> {query.error}
                    </div>
                  )}

                  {query.results && (
                    <div className={styles.resultsDetails}>
                      <div className={styles.resultsSummary}>
                        <div><strong>Results:</strong> {query.results.count.toLocaleString()}</div>
                        <div><strong>Response Time:</strong> {formatDuration(query.results.responseTimeMs)}</div>
                        {query.results.firstResult && (
                          <div className={styles.firstResult}>
                            <strong>First Result:</strong>
                            <button
                              className={styles.resultLink}
                              onClick={() => navigate({ 
                                to: `/works/${query.results!.firstResult!.id.replace('https://openalex.org/', '')}` 
                              })}
                            >
                              {query.results.firstResult.title}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={styles.paramsDetails}>
                    <strong>Query Parameters:</strong>
                    <pre className={styles.paramsJson}>
                      {JSON.stringify(query.params, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}