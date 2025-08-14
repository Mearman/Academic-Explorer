'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import * as styles from './search-results.css';
import { cachedOpenAlex } from '@/lib/openalex';
import type { Work, ApiResponse, WorksParams } from '@/lib/openalex/types';
import { EntityBadge, LoadingSkeleton, SkeletonGroup, ErrorMessage, ExternalLink, MetricDisplay } from '@/components';

interface SearchResultsProps {
  searchParams: WorksParams;
  onParamsChange?: (params: WorksParams) => void;
}

interface SearchState {
  results: Work[];
  meta: ApiResponse<Work>['meta'] | null;
  groupBy: ApiResponse<Work>['group_by'];
  loading: boolean;
  error: string | null;
  currentPage: number;
}

export function SearchResults({ searchParams, onParamsChange }: SearchResultsProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<SearchState>({
    results: [],
    meta: null,
    groupBy: undefined,
    loading: false,
    error: null,
    currentPage: 1,
  });

  const performSearch = useCallback(async (params: WorksParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = searchParams.group_by 
        ? await cachedOpenAlex.worksGroupBy({ ...params, group_by: searchParams.group_by })
        : await cachedOpenAlex.works(params);
      
      setState(prev => ({
        ...prev,
        results: response.results,
        meta: response.meta,
        groupBy: response.group_by,
        loading: false,
        currentPage: params.page || 1,
      }));
    } catch (error) {
      console.error('Search error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed',
      }));
    }
  }, [searchParams.group_by]);

  useEffect(() => {
    if (searchParams.search || searchParams.filter) {
      performSearch(searchParams);
    }
  }, [searchParams, performSearch]);

  const handlePageChange = (page: number) => {
    const newParams = { ...searchParams, page };
    onParamsChange?.(newParams);
  };

  const handleResultClick = (work: Work) => {
    // Navigate to work detail page
    navigate({ to: `/works/${work.id.replace('https://openalex.org/', '')}` });
  };

  if (state.loading && state.results.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <SkeletonGroup lines={5}>
            <LoadingSkeleton height="120px" />
          </SkeletonGroup>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={styles.container}>
        <ErrorMessage 
          title="Search Error"
          message={state.error}
          actions={[
            {
              label: "Try Again",
              onClick: () => performSearch(searchParams)
            }
          ]}
        />
      </div>
    );
  }

  if (!state.meta && state.results.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Ready to search</h2>
          <p>Enter search terms and configure filters to find academic works.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Search Metadata */}
      {state.meta && (
        <div className={styles.metadata}>
          <div className={styles.resultsInfo}>
            <span className={styles.count}>
              {state.meta.count.toLocaleString()} results
            </span>
            {state.meta.db_response_time_ms && (
              <span className={styles.responseTime}>
                ({state.meta.db_response_time_ms}ms)
              </span>
            )}
          </div>
          
          {state.loading && (
            <div className={styles.loadingIndicator}>
              Searching...
            </div>
          )}
        </div>
      )}

      {/* Group By Results */}
      {state.groupBy && state.groupBy.length > 0 && (
        <div className={styles.groupBySection}>
          <h3 className={styles.groupByTitle}>Results by Category</h3>
          <div className={styles.groupByGrid}>
            {state.groupBy.map((group, index) => (
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
      )}


      {/* Search Results */}
      {state.results.length > 0 && (
        <div className={styles.results}>
          {state.results.map((work) => (
            <div 
              key={work.id}
              className={styles.resultItem}
              onClick={() => handleResultClick(work)}
            >
              <div className={styles.resultHeader}>
                <h3 className={styles.resultTitle}>
                  {work.title}
                </h3>
                <div className={styles.resultMeta}>
                  <EntityBadge entityType="work" />
                  {work.publication_year && (
                    <span className={styles.year}>
                      {work.publication_year}
                    </span>
                  )}
                  {work.open_access?.is_oa && (
                    <span className={styles.openAccess}>
                      Open Access
                    </span>
                  )}
                </div>
              </div>

              {work.authorships && work.authorships.length > 0 && (
                <div className={styles.authors}>
                  <span className={styles.authorsLabel}>Authors:</span>
                  <span className={styles.authorsList}>
                    {work.authorships
                      .slice(0, 3)
                      .map(auth => auth.author?.display_name)
                      .filter(Boolean)
                      .join(', ')}
                    {work.authorships.length > 3 && ` and ${work.authorships.length - 3} more`}
                  </span>
                </div>
              )}

              {work.primary_location?.source?.display_name && (
                <div className={styles.venue}>
                  <span className={styles.venueLabel}>Published in:</span>
                  <span className={styles.venueName}>
                    {work.primary_location.source.display_name}
                  </span>
                </div>
              )}

              <div className={styles.metrics}>
                <MetricDisplay 
                  label="Citations"
                  value={work.cited_by_count || 0}
                  variant="default"
                />
                
                {work.concepts && work.concepts.length > 0 && (
                  <div className={styles.concepts}>
                    {work.concepts
                      .slice(0, 3)
                      .map((concept) => (
                        <EntityBadge
                          key={concept.id}
                          entityType="concept"
                          size="sm"
                        >
                          {concept.display_name}
                        </EntityBadge>
                      ))}
                  </div>
                )}
              </div>

              {work.doi && (
                <div className={styles.links}>
                  <ExternalLink href={`https://doi.org/${work.doi}`} type="doi">
                    DOI: {work.doi}
                  </ExternalLink>
                </div>
              )}

              {work.abstract_inverted_index && (
                <div className={styles.abstract}>
                  <details>
                    <summary className={styles.abstractToggle}>
                      Show Abstract
                    </summary>
                    <div className={styles.abstractContent}>
                      {/* We'll need to reconstruct the abstract from inverted index */}
                      Abstract available (click to view full paper)
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {state.meta && state.meta.count > (state.meta.per_page || 25) && (
        <div className={styles.pagination}>
          <button
            onClick={() => handlePageChange(state.currentPage - 1)}
            disabled={state.currentPage <= 1}
            className={styles.paginationButton}
          >
            Previous
          </button>
          
          <span className={styles.paginationInfo}>
            Page {state.currentPage} of {Math.ceil(state.meta.count / (state.meta.per_page || 25))}
          </span>
          
          <button
            onClick={() => handlePageChange(state.currentPage + 1)}
            disabled={state.currentPage >= Math.ceil(state.meta.count / (state.meta.per_page || 25))}
            className={styles.paginationButton}
          >
            Next
          </button>
        </div>
      )}

      {/* No Results */}
      {state.meta && state.meta.count === 0 && (
        <div className={styles.noResults}>
          <h3>No results found</h3>
          <p>Try adjusting your search terms or filters.</p>
        </div>
      )}
    </div>
  );
}