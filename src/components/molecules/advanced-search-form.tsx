'use client';


import { useAdvancedSearchForm } from '@/hooks/use-advanced-search-form';
import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';
import type { WorksParams } from '@/lib/openalex/types';

import {
  BasicSearchSection,
  DateFiltersSection,
  ContentFiltersSection,
  CitationFiltersSection,
  EntityFiltersSection,
  ResultsOptionsSection,
} from './advanced-search';
import * as styles from './advanced-search-form.css';

// Re-export the interface for external use
export type { AdvancedSearchFormData };

interface AdvancedSearchFormProps {
  onSearch: (params: WorksParams) => void;
  initialData?: Partial<AdvancedSearchFormData>;
}

export function AdvancedSearchForm({ onSearch, initialData }: AdvancedSearchFormProps) {
  const {
    formData,
    isCollapsed,
    setIsCollapsed,
    updateField,
    handleSubmit,
    handleReset,
  } = useAdvancedSearchForm({ initialData, onSearch });

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <BasicSearchSection
        formData={formData}
        updateField={updateField}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {!isCollapsed && (
        <div className={styles.advancedSection}>
          <DateFiltersSection
            formData={formData}
            updateField={updateField}
          />
          
          <ContentFiltersSection
            formData={formData}
            updateField={updateField}
          />
          
          <CitationFiltersSection
            formData={formData}
            updateField={updateField}
          />
          
          <EntityFiltersSection
            formData={formData}
            updateField={updateField}
          />
          
          <ResultsOptionsSection
            formData={formData}
            updateField={updateField}
            onReset={handleReset}
          />
        </div>
      )}
    </form>
  );
}