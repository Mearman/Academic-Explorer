import { EntityBadge } from '@/components';
import type { EntityType } from '@/components/types';

interface SuggestionHeaderProps {
  displayName: string;
  entityType: EntityType;
  showEntityBadges: boolean;
  className?: string;
  nameClassName?: string;
}

export function SuggestionHeader({ 
  displayName, 
  entityType, 
  showEntityBadges,
  className = '',
  nameClassName = ''
}: SuggestionHeaderProps) {
  return (
    <div className={className}>
      <span className={nameClassName}>
        {displayName}
      </span>
      {showEntityBadges && (
        <EntityBadge 
          entityType={entityType}
          size="sm"
        />
      )}
    </div>
  );
}