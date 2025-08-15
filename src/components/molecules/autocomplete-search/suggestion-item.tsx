import { Link } from '@tanstack/react-router';

import { EntityBadge, Icon } from '@/components';
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
        <div className={styles.suggestionContent}>
          <div className={styles.suggestionHeader}>
            <span className={styles.suggestionName}>
              {suggestion.display_name}
            </span>
            {showEntityBadges && (
              <EntityBadge 
                entityType={suggestion.entity_type}
                size="sm"
              />
            )}
          </div>
          
          {suggestion.hint && (
            <div className={styles.suggestionHint}>
              {suggestion.hint}
            </div>
          )}
          
          <div className={styles.suggestionMeta}>
            {suggestion.entity_type === 'work' && suggestion.cited_by_count !== undefined && (
              <span className={styles.metricBadge}>
                <Icon name="citation" size="xs" />
                {suggestion.cited_by_count.toLocaleString()} citations
              </span>
            )}
            {suggestion.entity_type === 'author' && suggestion.works_count !== undefined && (
              <span className={styles.metricBadge}>
                <Icon name="publication" size="xs" />
                {suggestion.works_count.toLocaleString()} works
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}