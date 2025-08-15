interface SearchModeSelectorProps {
  value: 'basic' | 'boolean' | 'exact' | 'no_stem';
  onChange: (value: 'basic' | 'boolean' | 'exact' | 'no_stem') => void;
}

export function SearchModeSelector({ value, onChange }: SearchModeSelectorProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as 'basic' | 'boolean' | 'exact' | 'no_stem')}>
      <option value="basic">Basic</option>
      <option value="boolean">Boolean</option>
      <option value="exact">Exact Match</option>
      <option value="no_stem">No Stemming</option>
    </select>
  );
}