import type { AdvancedSearchFormData } from '@/hooks/use-advanced-search-form';

interface BasicSearchControlsProps {
  formData: AdvancedSearchFormData;
  updateField: <K extends keyof AdvancedSearchFormData>(
    field: K,
    value: AdvancedSearchFormData[K]
  ) => void;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export function BasicSearchControls({
  formData,
  updateField,
  className = '',
  inputClassName = '',
  buttonClassName = ''
}: BasicSearchControlsProps) {
  return (
    <div className={className}>
      <input
        type="text"
        value={formData.query}
        onChange={(e) => updateField('query', e.target.value)}
        placeholder="Enter search terms..."
        className={inputClassName}
        required
      />
      
      <button type="submit" className={buttonClassName}>
        Search
      </button>
    </div>
  );
}