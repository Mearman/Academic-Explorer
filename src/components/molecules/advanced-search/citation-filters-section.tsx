import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

import * as styles from '../advanced-search-form.css';

interface CitationFiltersSectionProps {
  formData: AdvancedSearchFormData;
  updateField: <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => void;
}

export function CitationFiltersSection({ formData, updateField }: CitationFiltersSectionProps) {
  return (
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
  );
}