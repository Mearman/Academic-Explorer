interface SearchActionButtonsProps {
  onReset: () => void;
}

export function SearchActionButtons({ onReset }: SearchActionButtonsProps) {
  return (
    <div>
      <button type="button" onClick={onReset}>
        Reset
      </button>
      <button type="submit">
        Search
      </button>
    </div>
  );
}