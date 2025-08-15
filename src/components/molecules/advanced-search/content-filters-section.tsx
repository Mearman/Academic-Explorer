import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

import * as styles from '../advanced-search-form.css';

interface ContentFiltersSectionProps {
  formData: AdvancedSearchFormData;
  updateField: <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => void;
}

export function ContentFiltersSection({ formData, updateField }: ContentFiltersSectionProps) {
  return (
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
  );
}