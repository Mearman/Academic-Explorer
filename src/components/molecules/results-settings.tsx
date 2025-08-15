interface ResultsSettingsProps {
  perPage?: number;
  sample?: number;
  groupBy?: string;
  onPerPageChange: (value?: number) => void;
  onSampleChange: (value?: number) => void;
  onGroupByChange: (value?: string) => void;
}

export function ResultsSettings({
  perPage,
  sample: _sample,
  groupBy: _groupBy,
  onPerPageChange,
  onSampleChange: _onSampleChange,
  onGroupByChange: _onGroupByChange
}: ResultsSettingsProps) {
  return (
    <div>
      <label>
        Results per page:
        <select value={perPage || 25} onChange={(e) => onPerPageChange(Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </label>
    </div>
  );
}