'use client';

import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { GroupByResults } from '@/components/molecules/group-by-results/GroupByResults';
import { PaginationControls } from '@/components/molecules/pagination-controls/PaginationControls';
import { SearchMetadata } from '@/components/molecules/search-metadata/SearchMetadata';
import { SearchResultItem } from '@/components/molecules/search-result-item/SearchResultItem';
import { LoadingState, ErrorState, EmptyState } from '@/components/molecules/search-states/SearchStates';
import type { Work, WorksParams } from '@/lib/openalex/types';

import { useSearchState } from './hooks/use-search-state';
import * as styles from './search-results.css';


interface SearchResultsProps {
  searchParams: WorksParams;
  onParamsChange?: (params: WorksParams) => void;
}


export function SearchResults({ searchParams, onParamsChange }: SearchResultsProps) {
  const navigate = useNavigate();
  const { state, performSearch } = useSearchState();

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

  // Handle different states
  if (state.loading && state.results.length === 0) {
    return <LoadingState />;
  }

  if (state.error) {
    return <ErrorState error={state.error} onRetry={() => performSearch(searchParams)} />;
  }

  if (!state.meta && state.results.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={styles.container}>
      {/* Search Metadata */}
      {state.meta && (
        <SearchMetadata
          count={state.meta.count}
          responseTimeMs={state.meta.db_response_time_ms}
          loading={state.loading}
        />
      )}

      {/* Group By Results */}
      <GroupByResults groupBy={state.groupBy} />


      {/* Search Results */}
      {state.results.length > 0 && (
        <div className={styles.results}>
          {state.results.map((work) => (
            <SearchResultItem
              key={work.id}
              work={work}
              onClick={handleResultClick}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {state.meta && (
        <PaginationControls
          currentPage={state.currentPage}
          totalCount={state.meta.count}
          perPage={state.meta.per_page || 25}
          onPageChange={handlePageChange}
        />
      )}

      {/* No Results */}
      {state.meta && state.meta.count === 0 && (
        <EmptyState hasSearched />
      )}
    </div>
  );
}