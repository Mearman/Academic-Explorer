import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

import * as styles from '../advanced-search-form.css';

interface EntityFiltersSectionProps {
  formData: AdvancedSearchFormData;
  updateField: <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => void;
}

export function EntityFiltersSection({ formData, updateField }: EntityFiltersSectionProps) {
  return (
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
  );
}