import { Icon } from '@/components';
import type { AutocompleteSuggestion } from '@/hooks/use-autocomplete-search';

interface SuggestionMetricsProps {
  suggestion: AutocompleteSuggestion;
  className?: string;
  badgeClassName?: string;
}

export function SuggestionMetrics({ 
  suggestion, 
  className = '',
  badgeClassName = ''
}: SuggestionMetricsProps) {
  return (
    <div className={className}>
      {suggestion.entity_type === 'work' && suggestion.cited_by_count !== undefined && (
        <span className={badgeClassName}>
          <Icon name="citation" size="xs" />
          {suggestion.cited_by_count.toLocaleString()} citations
        </span>
      )}
      {suggestion.entity_type === 'author' && suggestion.works_count !== undefined && (
        <span className={badgeClassName}>
          <Icon name="publication" size="xs" />
          {suggestion.works_count.toLocaleString()} works
        </span>
      )}
    </div>
  );
}