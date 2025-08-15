interface SortSelectorProps {
  sortBy?: 'relevance_score' | 'cited_by_count' | 'publication_date' | 'display_name';
  sortOrder?: 'asc' | 'desc';
  onSortByChange: (value?: 'relevance_score' | 'cited_by_count' | 'publication_date' | 'display_name') => void;
  onSortOrderChange: (value?: 'asc' | 'desc') => void;
}

export function SortSelector({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange
}: SortSelectorProps) {
  return (
    <div>
      <label>
        Sort by:
        <select value={sortBy || 'relevance_score'} onChange={(e) => onSortByChange(e.target.value as 'relevance_score' | 'cited_by_count' | 'publication_date' | 'display_name')}>
          <option value="relevance_score">Relevance</option>
          <option value="publication_date">Publication Year</option>
          <option value="cited_by_count">Citations</option>
          <option value="display_name">Name</option>
        </select>
      </label>
      <label>
        Order:
        <select value={sortOrder || 'desc'} onChange={(e) => onSortOrderChange(e.target.value as 'asc' | 'desc')}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
    </div>
  );
}