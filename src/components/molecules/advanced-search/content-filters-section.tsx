import { ContentFiltersList } from '@/components/atoms/content-filters-list';
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
        <ContentFiltersList
          formData={formData}
          updateField={updateField}
          checkboxClassName={styles.checkbox}
          labelClassName={styles.checkboxLabel}
        />
      </div>
    </div>
  );
}