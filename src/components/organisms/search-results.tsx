'use client';

import { useNavigate } from '@tanstack/react-router';

import { GroupByResults } from '@/components/molecules/group-by-results/GroupByResults';
import { PaginationControls } from '@/components/molecules/pagination-controls/PaginationControls';
import { SearchMetadata } from '@/components/molecules/search-metadata/SearchMetadata';
import { SearchResultItem } from '@/components/molecules/search-result-item/SearchResultItem';
import { LoadingState, ErrorState, EmptyState } from '@/components/molecules/search-states/SearchStates';
import type { Work, WorksParams, ApiResponse } from '@/lib/openalex/types';
import { useWorks } from '@/lib/react-query';

import * as styles from './search-results.css';


interface SearchResultsProps {
  searchParams: WorksParams;
  onParamsChange?: (params: WorksParams) => void;
}


export function SearchResults({ searchParams, onParamsChange }: SearchResultsProps) {
  const navigate = useNavigate();
  const worksQuery = useWorks(searchParams);
  
  // Type assertion to help TypeScript understand the data structure
  const data = worksQuery.data as ApiResponse<Work> | undefined;

  const handlePageChange = (page: number) => {
    const newParams = { ...searchParams, page };
    onParamsChange?.(newParams);
  };

  const handleResultClick = (work: Work) => {
    // Navigate to work detail page
    navigate({ to: `/works/${work.id.replace('https://openalex.org/', '')}` });
  };

  // Handle different states
  if (worksQuery.isLoading && (!data?.results || data.results.length === 0)) {
    return <LoadingState />;
  }

  if (worksQuery.isError) {
    const errorMessage = worksQuery.error instanceof Error ? worksQuery.error.message : 'Search failed';
    return <ErrorState error={errorMessage} onRetry={() => worksQuery.refetch()} />;
  }

  if (!data?.meta && (!data?.results || data.results.length === 0)) {
    return <EmptyState />;
  }

  const results = data?.results || [];
  const meta = data?.meta;
  const groupBy = data?.group_by;

  return (
    <div className={styles.container}>
      {/* Search Metadata */}
      {meta && typeof meta.count === 'number' && (
        <SearchMetadata
          count={meta.count}
          responseTimeMs={meta.db_response_time_ms}
          loading={worksQuery.isFetching}
        />
      )}

      {/* Group By Results */}
      <GroupByResults groupBy={groupBy} />

      {/* Search Results */}
      {results.length > 0 && (
        <div className={styles.results}>
          {results.map((work) => (
            <SearchResultItem
              key={work.id}
              work={work}
              onClick={handleResultClick}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && typeof meta.count === 'number' && (
        <PaginationControls
          currentPage={searchParams.page || 1}
          totalCount={meta.count}
          perPage={meta.per_page || 25}
          onPageChange={handlePageChange}
        />
      )}

      {/* No Results */}
      {meta && meta.count === 0 && (
        <EmptyState hasSearched />
      )}
    </div>
  );
}