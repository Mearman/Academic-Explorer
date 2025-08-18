'use client';

import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';

import { GroupByResults } from '@/components/molecules/group-by-results/GroupByResults';
import { PaginationControls } from '@/components/molecules/pagination-controls/PaginationControls';
import { SearchMetadata } from '@/components/molecules/search-metadata/SearchMetadata';
import { SearchResultItem } from '@/components/molecules/search-result-item/SearchResultItem';
import { LoadingState, ErrorState, EmptyState } from '@/components/molecules/search-states/SearchStates';
import { recordSearchResultEncounters } from '@/lib/graph-entity-tracking';
import type { Work, WorksParams, ApiResponse } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useWorks } from '@/lib/react-query';

import * as styles from './search-results.css';


interface SearchResultsProps {
  searchParams: WorksParams;
  onParamsChange?: (params: WorksParams) => void;
}


export function SearchResults({ searchParams, onParamsChange }: SearchResultsProps) {
  const navigate = useNavigate();
  
  // Prevent showing cached results when there are no search parameters
  const hasSearch = searchParams.search && searchParams.search.trim() !== '';
  const hasFilter = searchParams.filter && (
    typeof searchParams.filter === 'string' 
      ? searchParams.filter.trim() !== ''
      : Object.keys(searchParams.filter).length > 0
  );
  
  // Always call hooks unconditionally
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

  const results = useMemo(() => data?.results || [], [data?.results]);
  const meta = data?.meta;
  const groupBy = data?.group_by;

  // Track search results in graph database
  useEffect(() => {
    if (results.length > 0 && searchParams.search) {
      const searchResults = results.map(work => ({
        id: work.id,
        entityType: EntityType.WORK,
        displayName: work.display_name,
      }));

      const queryFilters = {
        filter: searchParams.filter,
        sort: searchParams.sort,
        per_page: searchParams.per_page,
        sample: searchParams.sample,
        group_by: searchParams.group_by,
        from_publication_date: searchParams.from_publication_date,
        to_publication_date: searchParams.to_publication_date,
      };

      const queryExecutionMetadata = {
        totalResults: meta?.count || 0,
        pageNumber: searchParams.page || 1,
        perPage: meta?.per_page || searchParams.per_page || 25,
      };

      recordSearchResultEncounters(
        searchResults,
        searchParams.search,
        queryFilters,
        queryExecutionMetadata
      ).catch(error => {
        console.error('[SearchResults] Failed to record search results:', error);
      });
    }
  }, [results, searchParams, meta]);
  
  // Early return after all hooks have been called
  if (!hasSearch && !hasFilter) {
    return <EmptyState />;
  }

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