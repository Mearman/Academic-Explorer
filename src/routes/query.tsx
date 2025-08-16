import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';

import { AdvancedSearchForm, type AdvancedSearchFormData } from '@/components/molecules/advanced-search-form';
import { SearchResults } from '@/components/organisms/search-results';
import { SearchHistory } from '@/components/organisms/search-history';
// import { SavedSearches } from '@/components/molecules/saved-searches'; // Removed - component not implemented
import type { WorksParams } from '@/lib/openalex/types';

import * as styles from '../app/page.css';

// Search params validation schema
const searchSchema = z.object({
  q: z.string().optional(),
  field: z.enum(['all', 'title', 'abstract', 'fulltext']).optional(),
  mode: z.enum(['basic', 'boolean', 'exact', 'no_stem']).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  year: z.number().optional(),
  is_oa: z.boolean().optional(),
  has_fulltext: z.boolean().optional(),
  has_doi: z.boolean().optional(),
  has_abstract: z.boolean().optional(),
  not_retracted: z.boolean().optional(),
  min_citations: z.number().optional(),
  max_citations: z.number().optional(),
  author_id: z.string().optional(),
  institution_id: z.string().optional(),
  source_id: z.string().optional(),
  funder_id: z.string().optional(),
  topic_id: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  per_page: z.number().optional(),
  sample: z.number().optional(),
  group_by: z.string().optional(),
  page: z.number().optional(),
}).partial();

type SearchParams = z.infer<typeof searchSchema>;

function SearchPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/query' });
  const [currentParams, setCurrentParams] = useState<WorksParams>({});

  // Convert URL search params to AdvancedSearchFormData
  const getFormDataFromParams = (params: SearchParams): Partial<AdvancedSearchFormData> => {
    return {
      query: params.q || '',
      searchField: (params.field as 'all' | 'title' | 'abstract' | 'fulltext') || 'all',
      searchMode: (params.mode as 'basic' | 'boolean' | 'exact' | 'no_stem') || 'basic',
      fromPublicationDate: params.from_date,
      toPublicationDate: params.to_date,
      publicationYear: params.year,
      isOpenAccess: params.is_oa,
      hasFulltext: params.has_fulltext,
      hasDoi: params.has_doi,
      hasAbstract: params.has_abstract,
      isRetracted: params.not_retracted ? false : undefined,
      citationCountMin: params.min_citations,
      citationCountMax: params.max_citations,
      // Note: Other fields like authorId, etc. are not part of AdvancedSearchFormData interface
    };
  };

  // Convert WorksParams to URL search params
  const updateUrlParams = (worksParams: WorksParams) => {
    const urlParams: SearchParams = {};

    // Extract basic search info
    if (worksParams.search) {
      urlParams.q = worksParams.search;
    }

    // Parse filter string for structured params
    if (worksParams.filter && typeof worksParams.filter === 'string') {
      const filters = worksParams.filter.split(',');
      filters.forEach(filter => {
        const [key, value] = filter.split(':');
        switch (key) {
          case 'is_oa':
            urlParams.is_oa = value === 'true';
            break;
          case 'has_fulltext':
            urlParams.has_fulltext = value === 'true';
            break;
          case 'has_doi':
            urlParams.has_doi = value === 'true';
            break;
          case 'has_abstract':
            urlParams.has_abstract = value === 'true';
            break;
          case 'is_retracted':
            urlParams.not_retracted = value === 'false';
            break;
          case 'publication_year':
            urlParams.year = parseInt(value);
            break;
          case 'authorships.author.id':
            urlParams.author_id = value;
            break;
          case 'authorships.institutions.id':
            urlParams.institution_id = value;
            break;
          case 'primary_location.source.id':
            urlParams.source_id = value;
            break;
          case 'grants.funder':
            urlParams.funder_id = value;
            break;
          case 'topics.id':
            urlParams.topic_id = value;
            break;
        }
      });
    }

    // Date range params
    if (worksParams.from_publication_date) {
      urlParams.from_date = worksParams.from_publication_date;
    }
    if (worksParams.to_publication_date) {
      urlParams.to_date = worksParams.to_publication_date;
    }

    // Sort and pagination
    if (worksParams.sort) {
      const [sortField, sortOrder] = worksParams.sort.split(':');
      urlParams.sort = sortField;
      urlParams.order = sortOrder === 'desc' ? 'desc' : 'asc';
    }
    if (worksParams.per_page) {
      urlParams.per_page = worksParams.per_page;
    }
    if (worksParams.sample) {
      urlParams.sample = worksParams.sample;
    }
    if (worksParams.group_by) {
      urlParams.group_by = worksParams.group_by;
    }
    if (worksParams.page) {
      urlParams.page = worksParams.page;
    }

    // Update URL
    navigate({
      to: '/query',
      search: urlParams,
      replace: true,
    });
  };

  const handleSearch = (worksParams: WorksParams) => {
    setCurrentParams(worksParams);
    updateUrlParams(worksParams);
  };

  const handleParamsChange = (worksParams: WorksParams) => {
    setCurrentParams(worksParams);
    updateUrlParams(worksParams);
  };

  const _handleLoadSavedSearch = (worksParams: WorksParams) => {
    setCurrentParams(worksParams);
    updateUrlParams(worksParams);
  };

  // Initialize from URL params on load
  const hasSearchParams = Object.keys(searchParams).length > 0;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.searchPageHeader}>
          <h1 className={styles.title}>Advanced Academic Search</h1>
          <p className={styles.description}>
            Search millions of academic works with powerful filters and analysis tools
          </p>
        </div>

        <div className={styles.searchInterface}>
          {/* <div className={styles.searchSidebar}>
            <SavedSearches
              currentParams={currentParams}
              onLoadSearch={handleLoadSavedSearch}
            />
          </div> */}
          
          <div className={styles.searchMainContent}>
            <SearchHistory />
            
            <AdvancedSearchForm
              onSearch={handleSearch}
              initialData={hasSearchParams ? getFormDataFromParams(searchParams) : undefined}
            />

            <div className={styles.searchResultsSection}>
              <SearchResults
                searchParams={currentParams}
                onParamsChange={handleParamsChange}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/query')({
  component: SearchPage,
  validateSearch: searchSchema,
});