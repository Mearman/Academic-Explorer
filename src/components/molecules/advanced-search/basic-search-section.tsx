import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

import * as styles from '../advanced-search-form.css';

interface BasicSearchSectionProps {
  formData: AdvancedSearchFormData;
  updateField: <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function BasicSearchSection({
  formData,
  updateField,
  isCollapsed,
  setIsCollapsed,
}: BasicSearchSectionProps) {
  return (
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
          onChange={(e) => updateField('searchField', e.target.value as 'all' | 'title' | 'abstract' | 'fulltext')}
          className={styles.select}
        >
          <option value="all">All Fields</option>
          <option value="title">Title Only</option>
          <option value="abstract">Abstract Only</option>
          <option value="fulltext">Full Text</option>
        </select>

        <select
          value={formData.searchMode}
          onChange={(e) => updateField('searchMode', e.target.value as 'basic' | 'boolean' | 'exact' | 'no_stem')}
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
  );
}