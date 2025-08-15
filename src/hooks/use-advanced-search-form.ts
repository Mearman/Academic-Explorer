import { useState } from 'react';

import type { WorksParams } from '@/lib/openalex/types';

export interface AdvancedSearchFormData {
  // Basic search
  query: string;
  searchField: 'all' | 'title' | 'abstract' | 'fulltext';
  searchMode: 'basic' | 'boolean' | 'exact' | 'no_stem';
  
  // Date filters
  fromPublicationDate?: string;
  toPublicationDate?: string;
  publicationYear?: number;
  
  // Content filters
  isOpenAccess?: boolean;
  hasFulltext?: boolean;
  hasDoi?: boolean;
  hasAbstract?: boolean;
  isRetracted?: boolean;
  
  // Citation filters
  citationCountMin?: number;
  citationCountMax?: number;
  
  // Entity filters
  authorId?: string;
  institutionId?: string;
  sourceId?: string;
  funderId?: string;
  topicId?: string;
  
  // Results control
  sortBy?: 'relevance_score' | 'cited_by_count' | 'publication_date' | 'display_name';
  sortOrder?: 'asc' | 'desc';
  perPage?: number;
  sample?: number;
  groupBy?: string;
}

interface UseAdvancedSearchFormProps {
  initialData?: Partial<AdvancedSearchFormData>;
  onSearch: (params: WorksParams) => void;
}

const defaultFormData: AdvancedSearchFormData = {
  query: '',
  searchField: 'all',
  searchMode: 'basic',
  sortBy: 'relevance_score',
  sortOrder: 'desc',
  perPage: 25,
};

export function useAdvancedSearchForm({ initialData, onSearch }: UseAdvancedSearchFormProps) {
  const [formData, setFormData] = useState<AdvancedSearchFormData>({
    ...defaultFormData,
    ...initialData,
  });

  const [isCollapsed, setIsCollapsed] = useState(true);

  const updateField = <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const buildSearchParams = (): WorksParams => {
    const params: WorksParams = {};

    // Build search query
    if (formData.query) {
      if (formData.searchField === 'all') {
        params.search = formData.query;
      } else {
        // Use field-specific search
        const searchKey = `${formData.searchField}.search${formData.searchMode === 'no_stem' ? '.no_stem' : ''}`;
        
        let searchValue = formData.query;
        if (formData.searchMode === 'exact') {
          searchValue = `"${formData.query}"`;
        } else if (formData.searchMode === 'boolean') {
          // Allow boolean operators in the query
          searchValue = formData.query;
        }
        
        params.filter = `${searchKey}:${searchValue}`;
      }
    }

    // Add date filters
    if (formData.fromPublicationDate) {
      params.from_publication_date = formData.fromPublicationDate;
    }
    if (formData.toPublicationDate) {
      params.to_publication_date = formData.toPublicationDate;
    }
    if (formData.publicationYear) {
      const yearFilter = `publication_year:${formData.publicationYear}`;
      params.filter = params.filter ? `${params.filter},${yearFilter}` : yearFilter;
    }

    // Add content filters
    const contentFilters: string[] = [];
    if (formData.isOpenAccess !== undefined) {
      contentFilters.push(`is_oa:${formData.isOpenAccess}`);
    }
    if (formData.hasFulltext !== undefined) {
      contentFilters.push(`has_fulltext:${formData.hasFulltext}`);
    }
    if (formData.hasDoi !== undefined) {
      contentFilters.push(`has_doi:${formData.hasDoi}`);
    }
    if (formData.hasAbstract !== undefined) {
      contentFilters.push(`has_abstract:${formData.hasAbstract}`);
    }
    if (formData.isRetracted !== undefined) {
      contentFilters.push(`is_retracted:${formData.isRetracted}`);
    }

    // Add citation filters
    if (formData.citationCountMin !== undefined) {
      contentFilters.push(`cited_by_count:>${formData.citationCountMin}`);
    }
    if (formData.citationCountMax !== undefined) {
      contentFilters.push(`cited_by_count:<${formData.citationCountMax}`);
    }

    // Add entity filters
    if (formData.authorId) {
      contentFilters.push(`authorships.author.id:${formData.authorId}`);
    }
    if (formData.institutionId) {
      contentFilters.push(`authorships.institutions.id:${formData.institutionId}`);
    }
    if (formData.sourceId) {
      contentFilters.push(`primary_location.source.id:${formData.sourceId}`);
    }
    if (formData.funderId) {
      contentFilters.push(`grants.funder:${formData.funderId}`);
    }
    if (formData.topicId) {
      contentFilters.push(`topics.id:${formData.topicId}`);
    }

    // Combine all filters
    if (contentFilters.length > 0) {
      const filtersString = contentFilters.join(',');
      params.filter = params.filter ? `${params.filter},${filtersString}` : filtersString;
    }

    // Add sorting
    if (formData.sortBy) {
      params.sort = formData.sortOrder === 'asc' 
        ? formData.sortBy 
        : `${formData.sortBy}:desc`;
    }

    // Add pagination
    if (formData.perPage) {
      params.per_page = formData.perPage;
    }

    // Add sampling
    if (formData.sample) {
      params.sample = formData.sample;
    }

    // Add grouping
    if (formData.groupBy) {
      params.group_by = formData.groupBy;
    }

    return params;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = buildSearchParams();
    onSearch(params);
  };

  const handleReset = () => {
    setFormData(defaultFormData);
  };

  return {
    formData,
    isCollapsed,
    setIsCollapsed,
    updateField,
    handleSubmit,
    handleReset,
  };
}