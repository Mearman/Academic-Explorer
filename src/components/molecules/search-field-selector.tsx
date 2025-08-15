interface SearchFieldSelectorProps {
  value: 'all' | 'title' | 'abstract' | 'fulltext';
  onChange: (value: 'all' | 'title' | 'abstract' | 'fulltext') => void;
}

export function SearchFieldSelector({ value, onChange }: SearchFieldSelectorProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as 'all' | 'title' | 'abstract' | 'fulltext')}>
      <option value="all">All Fields</option>
      <option value="title">Title</option>
      <option value="abstract">Abstract</option>
      <option value="fulltext">Full Text</option>
    </select>
  );
}