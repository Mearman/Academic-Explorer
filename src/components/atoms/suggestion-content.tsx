import { SuggestionHeader, SuggestionMetrics } from '@/components';
import type { AutocompleteSuggestion } from '@/hooks/use-autocomplete-search';

interface SuggestionContentProps {
  suggestion: AutocompleteSuggestion;
  showEntityBadges: boolean;
  className?: string;
  headerClassName?: string;
  nameClassName?: string;
  hintClassName?: string;
  metaClassName?: string;
  badgeClassName?: string;
}

export function SuggestionContent({
  suggestion,
  showEntityBadges,
  className = '',
  headerClassName = '',
  nameClassName = '',
  hintClassName = '',
  metaClassName = '',
  badgeClassName = ''
}: SuggestionContentProps) {
  return (
    <div className={className}>
      <SuggestionHeader
        displayName={suggestion.display_name}
        entityType={suggestion.entity_type}
        showEntityBadges={showEntityBadges}
        className={headerClassName}
        nameClassName={nameClassName}
      />
      
      {suggestion.hint && (
        <div className={hintClassName}>
          {suggestion.hint}
        </div>
      )}
      
      <SuggestionMetrics
        suggestion={suggestion}
        className={metaClassName}
        badgeClassName={badgeClassName}
      />
    </div>
  );
}