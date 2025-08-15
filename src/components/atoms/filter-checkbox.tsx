interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  checkboxClassName?: string;
}

export function FilterCheckbox({ 
  label, 
  checked, 
  onChange, 
  className = '',
  checkboxClassName = ''
}: FilterCheckboxProps) {
  return (
    <label className={className}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={checkboxClassName}
      />
      {label}
    </label>
  );
}