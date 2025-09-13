import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

import * as styles from '../advanced-search-form.css';
import { ResultsSettings } from '../results-settings';
import { SearchActionButtons } from '../search-action-buttons';
import { SortSelector } from '../sort-selector';

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
          <SortSelector
            {...(formData.sortBy !== undefined && { sortBy: formData.sortBy })}
            {...(formData.sortOrder !== undefined && { sortOrder: formData.sortOrder })}
            onSortByChange={(value) => updateField('sortBy', value)}
            onSortOrderChange={(value) => updateField('sortOrder', value)}
          />
          <ResultsSettings
            {...(formData.perPage !== undefined && { perPage: formData.perPage })}
            {...(formData.sample !== undefined && { sample: formData.sample })}
            {...(formData.groupBy !== undefined && { groupBy: formData.groupBy })}
            onPerPageChange={(value) => updateField('perPage', value)}
            onSampleChange={(value) => updateField('sample', value)}
            onGroupByChange={(value) => updateField('groupBy', value)}
          />
        </div>
      </div>

      <SearchActionButtons onReset={onReset} />
    </>
  );
}