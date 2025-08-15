import { EntityBadge } from '@/components';
import type { Work } from '@/lib/openalex/types';

interface WorkConceptsProps {
  work: Work;
  maxConcepts?: number;
  className?: string;
}

export function WorkConcepts({
  work,
  maxConcepts = 3,
  className = ''
}: WorkConceptsProps) {
  if (!work.concepts || work.concepts.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {work.concepts
        .slice(0, maxConcepts)
        .map((concept) => (
          <EntityBadge
            key={concept.id}
            entityType="concept"
            size="sm"
          >
            {concept.display_name}
          </EntityBadge>
        ))}
    </div>
  );
}