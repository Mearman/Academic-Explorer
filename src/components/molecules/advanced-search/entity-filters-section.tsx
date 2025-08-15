import { EntityInputsList } from '@/components/atoms/entity-inputs-list';
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
        <EntityInputsList
          formData={formData}
          updateField={updateField}
          inputClassName={styles.textInput}
          labelClassName={styles.label}
        />
      </div>
    </div>
  );
}