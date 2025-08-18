'use client';

import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

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
  const [expandedPageNavs, setExpandedPageNavs] = useState<Set<string>>(new Set());

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

  const togglePageNavExpansion = (queryId: string) => {
    setExpandedPageNavs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(queryId)) {
        newSet.delete(queryId);
      } else {
        newSet.add(queryId);
      }
      return newSet;
    });
  };

  const getOccurrenceCount = (query: QueryRecord) => {
    return (query.pageNavigations?.length || 0) + 1; // +1 for the original query
  };


  const getOccurrenceTypes = (query: QueryRecord) => {
    const types = { pages: new Set<number>(), reruns: 0 };
    
    // Add original query
    types.pages.add(query.params.page || 1);
    
    if (query.pageNavigations) {
      query.pageNavigations.forEach(nav => {
        if (nav.isPageNavigation) {
          types.pages.add(nav.params.page || 1);
        } else {
          types.reruns++;
        }
      });
    }
    
    return {
      pageCount: types.pages.size,
      rerunCount: types.reruns,
      pages: Array.from(types.pages).sort((a, b) => a - b)
    };
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
          const hasOccurrences = query.pageNavigations && query.pageNavigations.length > 0;
          const isOccurrencesExpanded = expandedPageNavs.has(query.id);
          const occurrenceCount = getOccurrenceCount(query);
          const occurrenceTypes = getOccurrenceTypes(query);

          return (
            <div 
              key={query.id} 
              className={`${styles.queryItem} ${styles[status]}`}
            >
              {/* Main Query Header */}
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
                    {hasOccurrences && (
                      <span className={styles.pageCount}>
                        {occurrenceTypes.pageCount > 1 && `Pages: ${occurrenceTypes.pages.join(', ')}`}
                        {occurrenceTypes.rerunCount > 0 && ` | ${occurrenceTypes.rerunCount} reruns`}
                        {occurrenceTypes.pageCount === 1 && occurrenceTypes.rerunCount === 0 && `${occurrenceCount} occurrences`}
                      </span>
                    )}
                    {query.error && (
                      <span className={styles.errorIndicator}>Error</span>
                    )}
                  </div>
                </div>
                <div className={styles.queryActions}>
                  {hasOccurrences && (
                    <button
                      className={styles.pageNavToggle}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePageNavExpansion(query.id);
                      }}
                      type="button"
                    >
                      {isOccurrencesExpanded ? 'Hide' : 'Show'} Occurrences
                    </button>
                  )}
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
                    [EXPAND]
                  </span>
                </div>
              </div>

              {/* Query Occurrences */}
              {hasOccurrences && isOccurrencesExpanded && (
                <div className={styles.pageNavigations}>
                  {query.pageNavigations!.map((pageNav) => {
                    const pageStatus = getQueryStatus(pageNav);
                    return (
                      <div 
                        key={pageNav.id}
                        className={`${styles.pageNavItem} ${styles[pageStatus]}`}
                      >
                        <div className={styles.pageNavHeader}>
                          <div className={styles.pageNavInfo}>
                            <div className={styles.pageNavText}>
                              {pageNav.isPageNavigation 
                                ? `Page ${pageNav.params.page || 1}`
                                : `Rerun (${formatTimestamp(pageNav.timestamp)})`
                              }
                            </div>
                            <div className={styles.pageNavMeta}>
                              <span className={styles.timestamp}>
                                {formatTimestamp(pageNav.timestamp)}
                              </span>
                              {pageNav.results && (
                                <span className={styles.responseTime}>
                                  {formatDuration(pageNav.results.responseTimeMs)}
                                </span>
                              )}
                              {pageNav.error && (
                                <span className={styles.errorIndicator}>Error</span>
                              )}
                            </div>
                          </div>
                          <button
                            className={styles.rerunButton}
                            onClick={() => handleRerunQuery(pageNav)}
                            type="button"
                          >
                            {pageNav.isPageNavigation ? 'Jump to Page' : 'Rerun Query'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Query Details */}
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