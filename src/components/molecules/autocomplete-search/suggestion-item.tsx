import { Link } from '@tanstack/react-router';

import { SuggestionContent } from '@/components';
import type { AutocompleteSuggestion } from '@/hooks/use-autocomplete-search';

import * as styles from '../autocomplete-search.css';

import { getSuggestionUrl } from './utils';

interface SuggestionItemProps {
  suggestion: AutocompleteSuggestion;
  index: number;
  isSelected: boolean;
  showEntityBadges: boolean;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
}

export function SuggestionItem({
  suggestion,
  index,
  isSelected,
  showEntityBadges,
  onSelect,
}: SuggestionItemProps) {
  return (
    <li
      id={`suggestion-${index}`}
      className={`${styles.suggestionItem} ${
        isSelected ? styles.suggestionSelected : ''
      }`}
      role="option"
      aria-selected={isSelected}
    >
      <Link
        to={getSuggestionUrl(suggestion)}
        className={styles.suggestionLink}
        onClick={() => onSelect(suggestion)}
      >
        <SuggestionContent
          suggestion={suggestion}
          showEntityBadges={showEntityBadges}
          className={styles.suggestionContent}
          headerClassName={styles.suggestionHeader}
          nameClassName={styles.suggestionName}
          hintClassName={styles.suggestionHint}
          metaClassName={styles.suggestionMeta}
          badgeClassName={styles.metricBadge}
        />
      </Link>
    </li>
  );
}