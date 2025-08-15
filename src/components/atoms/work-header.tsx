import { EntityBadge } from '@/components';
import type { Work } from '@/lib/openalex/types';

interface WorkHeaderProps {
  work: Work;
  className?: string;
  titleClassName?: string;
  metaClassName?: string;
  yearClassName?: string;
  openAccessClassName?: string;
}

export function WorkHeader({
  work,
  className = '',
  titleClassName = '',
  metaClassName = '',
  yearClassName = '',
  openAccessClassName = ''
}: WorkHeaderProps) {
  return (
    <div className={className}>
      <h3 className={titleClassName}>
        {work.title}
      </h3>
      <div className={metaClassName}>
        <EntityBadge entityType="work" />
        {work.publication_year && (
          <span className={yearClassName}>
            {work.publication_year}
          </span>
        )}
        {work.open_access?.is_oa && (
          <span className={openAccessClassName}>
            Open Access
          </span>
        )}
      </div>
    </div>
  );
}