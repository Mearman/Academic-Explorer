import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

import * as styles from '../advanced-search-form.css';

interface ResultsOptionsSectionProps {
  formData: AdvancedSearchFormData;
  updateField: <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => void;
  onReset: () => void;
}

export function ResultsOptionsSection({ formData, updateField, onReset }: ResultsOptionsSectionProps) {
  return (
    <>
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Results Options</h3>
        <div className={styles.groupContent}>
          <label className={styles.label}>
            Sort By:
            <select
              value={formData.sortBy || ''}
              onChange={(e) => updateField('sortBy', (e.target.value || undefined) as 'relevance_score' | 'cited_by_count' | 'publication_date' | 'display_name' | undefined)}
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
              onChange={(e) => updateField('sortOrder', e.target.value as 'asc' | 'desc')}
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
          onClick={onReset}
          className={styles.secondaryButton}
        >
          Reset All Filters
        </button>
      </div>
    </>
  );
}