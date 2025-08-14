'use client';

import { useState } from 'react';
import * as styles from './advanced-search-form.css';
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

interface AdvancedSearchFormProps {
  onSearch: (params: WorksParams) => void;
  initialData?: Partial<AdvancedSearchFormData>;
}

export function AdvancedSearchForm({ onSearch, initialData }: AdvancedSearchFormProps) {
  const [formData, setFormData] = useState<AdvancedSearchFormData>({
    query: '',
    searchField: 'all',
    searchMode: 'basic',
    sortBy: 'relevance_score',
    sortOrder: 'desc',
    perPage: 25,
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
    setFormData({
      query: '',
      searchField: 'all',
      searchMode: 'basic',
      sortBy: 'relevance_score',
      sortOrder: 'desc',
      perPage: 25,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Basic Search */}
      <div className={styles.section}>
        <div className={styles.basicSearch}>
          <input
            type="text"
            value={formData.query}
            onChange={(e) => updateField('query', e.target.value)}
            placeholder="Enter search terms..."
            className={styles.searchInput}
            required
          />
          
          <select
            value={formData.searchField}
            onChange={(e) => updateField('searchField', e.target.value as any)}
            className={styles.select}
          >
            <option value="all">All Fields</option>
            <option value="title">Title Only</option>
            <option value="abstract">Abstract Only</option>
            <option value="fulltext">Full Text</option>
          </select>

          <select
            value={formData.searchMode}
            onChange={(e) => updateField('searchMode', e.target.value as any)}
            className={styles.select}
          >
            <option value="basic">Basic Search</option>
            <option value="boolean">Boolean (AND/OR/NOT)</option>
            <option value="exact">Exact Phrase</option>
            <option value="no_stem">No Stemming</option>
          </select>

          <button type="submit" className={styles.searchButton}>
            Search
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={styles.toggleButton}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? 'Show Advanced Options' : 'Hide Advanced Options'}
        </button>
      </div>

      {/* Advanced Options */}
      {!isCollapsed && (
        <div className={styles.advancedSection}>
          {/* Date Filters */}
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>Publication Date</h3>
            <div className={styles.groupContent}>
              <label className={styles.label}>
                From:
                <input
                  type="date"
                  value={formData.fromPublicationDate || ''}
                  onChange={(e) => updateField('fromPublicationDate', e.target.value || undefined)}
                  className={styles.dateInput}
                />
              </label>
              <label className={styles.label}>
                To:
                <input
                  type="date"
                  value={formData.toPublicationDate || ''}
                  onChange={(e) => updateField('toPublicationDate', e.target.value || undefined)}
                  className={styles.dateInput}
                />
              </label>
              <label className={styles.label}>
                Specific Year:
                <input
                  type="number"
                  value={formData.publicationYear || ''}
                  onChange={(e) => updateField('publicationYear', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 2023"
                  className={styles.numberInput}
                  min="1900"
                  max="2030"
                />
              </label>
            </div>
          </div>

          {/* Content Filters */}
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>Content Requirements</h3>
            <div className={styles.groupContent}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isOpenAccess || false}
                  onChange={(e) => updateField('isOpenAccess', e.target.checked || undefined)}
                  className={styles.checkbox}
                />
                Open Access Only
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.hasFulltext || false}
                  onChange={(e) => updateField('hasFulltext', e.target.checked || undefined)}
                  className={styles.checkbox}
                />
                Has Full Text
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.hasDoi || false}
                  onChange={(e) => updateField('hasDoi', e.target.checked || undefined)}
                  className={styles.checkbox}
                />
                Has DOI
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.hasAbstract || false}
                  onChange={(e) => updateField('hasAbstract', e.target.checked || undefined)}
                  className={styles.checkbox}
                />
                Has Abstract
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isRetracted === false}
                  onChange={(e) => updateField('isRetracted', e.target.checked ? false : undefined)}
                  className={styles.checkbox}
                />
                Exclude Retracted
              </label>
            </div>
          </div>

          {/* Citation Filters */}
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>Citation Count</h3>
            <div className={styles.groupContent}>
              <label className={styles.label}>
                Minimum:
                <input
                  type="number"
                  value={formData.citationCountMin || ''}
                  onChange={(e) => updateField('citationCountMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="0"
                  className={styles.numberInput}
                  min="0"
                />
              </label>
              <label className={styles.label}>
                Maximum:
                <input
                  type="number"
                  value={formData.citationCountMax || ''}
                  onChange={(e) => updateField('citationCountMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="No limit"
                  className={styles.numberInput}
                  min="0"
                />
              </label>
            </div>
          </div>

          {/* Entity Filters */}
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>Entity Filters</h3>
            <div className={styles.groupContent}>
              <label className={styles.label}>
                Author ID:
                <input
                  type="text"
                  value={formData.authorId || ''}
                  onChange={(e) => updateField('authorId', e.target.value || undefined)}
                  placeholder="e.g. A1234567890"
                  className={styles.textInput}
                />
              </label>
              <label className={styles.label}>
                Institution ID:
                <input
                  type="text"
                  value={formData.institutionId || ''}
                  onChange={(e) => updateField('institutionId', e.target.value || undefined)}
                  placeholder="e.g. I1234567890"
                  className={styles.textInput}
                />
              </label>
              <label className={styles.label}>
                Source ID:
                <input
                  type="text"
                  value={formData.sourceId || ''}
                  onChange={(e) => updateField('sourceId', e.target.value || undefined)}
                  placeholder="e.g. S1234567890"
                  className={styles.textInput}
                />
              </label>
              <label className={styles.label}>
                Funder ID:
                <input
                  type="text"
                  value={formData.funderId || ''}
                  onChange={(e) => updateField('funderId', e.target.value || undefined)}
                  placeholder="e.g. F1234567890"
                  className={styles.textInput}
                />
              </label>
              <label className={styles.label}>
                Topic ID:
                <input
                  type="text"
                  value={formData.topicId || ''}
                  onChange={(e) => updateField('topicId', e.target.value || undefined)}
                  placeholder="e.g. T1234567890"
                  className={styles.textInput}
                />
              </label>
            </div>
          </div>

          {/* Results Control */}
          <div className={styles.group}>
            <h3 className={styles.groupTitle}>Results Options</h3>
            <div className={styles.groupContent}>
              <label className={styles.label}>
                Sort By:
                <select
                  value={formData.sortBy || ''}
                  onChange={(e) => updateField('sortBy', e.target.value as any || undefined)}
                  className={styles.select}
                >
                  <option value="relevance_score">Relevance</option>
                  <option value="cited_by_count">Citation Count</option>
                  <option value="publication_date">Publication Date</option>
                  <option value="display_name">Title</option>
                </select>
              </label>
              <label className={styles.label}>
                Order:
                <select
                  value={formData.sortOrder || 'desc'}
                  onChange={(e) => updateField('sortOrder', e.target.value as any)}
                  className={styles.select}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </label>
              <label className={styles.label}>
                Results Per Page:
                <select
                  value={formData.perPage || 25}
                  onChange={(e) => updateField('perPage', parseInt(e.target.value))}
                  className={styles.select}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </label>
              <label className={styles.label}>
                Random Sample:
                <input
                  type="number"
                  value={formData.sample || ''}
                  onChange={(e) => updateField('sample', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Leave empty for all"
                  className={styles.numberInput}
                  min="1"
                  max="10000"
                />
              </label>
              <label className={styles.label}>
                Group By:
                <select
                  value={formData.groupBy || ''}
                  onChange={(e) => updateField('groupBy', e.target.value || undefined)}
                  className={styles.select}
                >
                  <option value="">No Grouping</option>
                  <option value="publication_year">Publication Year</option>
                  <option value="type">Work Type</option>
                  <option value="is_oa">Open Access Status</option>
                  <option value="authorships.institutions.country_code">Country</option>
                  <option value="authorships.institutions.type">Institution Type</option>
                  <option value="primary_location.source.host_organization">Publisher</option>
                </select>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button type="submit" className={styles.primaryButton}>
              Search with Filters
            </button>
            <button
              type="button"
              onClick={handleReset}
              className={styles.secondaryButton}
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}
    </form>
  );
}