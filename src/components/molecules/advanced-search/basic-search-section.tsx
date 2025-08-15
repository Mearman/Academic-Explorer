import { BasicSearchControls } from '@/components/atoms/basic-search-controls';
import { ToggleButton } from '@/components/atoms/toggle-button';
import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

import * as styles from '../advanced-search-form.css';
import { SearchFieldSelector } from '../search-field-selector';
import { SearchModeSelector } from '../search-mode-selector';

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
        <BasicSearchControls
          formData={formData}
          updateField={updateField}
          className=""
          inputClassName={styles.searchInput}
          buttonClassName={styles.searchButton}
        />
        
        <SearchFieldSelector
          value={formData.searchField}
          onChange={(value) => updateField('searchField', value)}
        />

        <SearchModeSelector
          value={formData.searchMode}
          onChange={(value) => updateField('searchMode', value)}
        />
      </div>

      <ToggleButton 
        isCollapsed={isCollapsed}
        onToggle={setIsCollapsed}
        className={styles.toggleButton}
      />
    </div>
  );
}