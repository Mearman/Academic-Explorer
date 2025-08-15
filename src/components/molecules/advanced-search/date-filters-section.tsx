import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

import * as styles from '../advanced-search-form.css';

interface DateFiltersSectionProps {
  formData: AdvancedSearchFormData;
  updateField: <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => void;
}

export function DateFiltersSection({ formData, updateField }: DateFiltersSectionProps) {
  return (
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
  );
}