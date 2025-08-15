import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

interface EntityInputConfig {
  label: string;
  placeholder: string;
  field: keyof AdvancedSearchFormData;
}

interface EntityInputsListProps {
  formData: AdvancedSearchFormData;
  updateField: <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => void;
  inputClassName?: string;
  labelClassName?: string;
}

const entityInputs: EntityInputConfig[] = [
  { label: 'Author ID', field: 'authorId', placeholder: 'e.g. A1234567890' },
  { label: 'Institution ID', field: 'institutionId', placeholder: 'e.g. I1234567890' },
  { label: 'Source ID', field: 'sourceId', placeholder: 'e.g. S1234567890' },
  { label: 'Funder ID', field: 'funderId', placeholder: 'e.g. F1234567890' },
  { label: 'Topic ID', field: 'topicId', placeholder: 'e.g. T1234567890' },
];

export function EntityInputsList({
  formData,
  updateField,
  inputClassName = '',
  labelClassName = ''
}: EntityInputsListProps) {
  return (
    <>
      {entityInputs.map(({ label, field, placeholder }) => (
        <div key={field} className={labelClassName}>
          <label>{label}</label>
          <input
            type="text"
            value={(formData[field] as string) || ''}
            placeholder={placeholder}
            onChange={(e) => updateField(field, e.target.value)}
            className={inputClassName}
          />
        </div>
      ))}
    </>
  );
}