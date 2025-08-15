import { FilterCheckbox } from '@/components/atoms/filter-checkbox';
import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

interface ContentFiltersListProps {
  formData: AdvancedSearchFormData;
  updateField: <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => void;
  checkboxClassName?: string;
  labelClassName?: string;
}

const FILTER_CONFIGS = [
  { field: 'isOpenAccess' as const, label: 'Open Access Only', getValue: (data: AdvancedSearchFormData) => data.isOpenAccess || false, transform: (checked: boolean) => checked || undefined },
  { field: 'hasFulltext' as const, label: 'Has Full Text', getValue: (data: AdvancedSearchFormData) => data.hasFulltext || false, transform: (checked: boolean) => checked || undefined },
  { field: 'hasDoi' as const, label: 'Has DOI', getValue: (data: AdvancedSearchFormData) => data.hasDoi || false, transform: (checked: boolean) => checked || undefined },
  { field: 'hasAbstract' as const, label: 'Has Abstract', getValue: (data: AdvancedSearchFormData) => data.hasAbstract || false, transform: (checked: boolean) => checked || undefined },
  { field: 'isRetracted' as const, label: 'Exclude Retracted', getValue: (data: AdvancedSearchFormData) => data.isRetracted === false, transform: (checked: boolean) => checked ? false : undefined }
];

export function ContentFiltersList({ formData, updateField, checkboxClassName = '', labelClassName = '' }: ContentFiltersListProps) {
  return (
    <>
      {FILTER_CONFIGS.map(({ field, label, getValue, transform }) => (
        <FilterCheckbox
          key={field}
          label={label}
          checked={getValue(formData)}
          onChange={(checked) => updateField(field, transform(checked))}
          className={labelClassName}
          checkboxClassName={checkboxClassName}
        />
      ))}
    </>
  );
}