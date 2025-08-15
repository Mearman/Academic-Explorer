import type { Work } from '@/lib/openalex/types';

interface WorkAuthorsProps {
  work: Work;
  maxAuthors?: number;
  className?: string;
  labelClassName?: string;
  listClassName?: string;
}

export function WorkAuthors({
  work,
  maxAuthors = 3,
  className = '',
  labelClassName = '',
  listClassName = ''
}: WorkAuthorsProps) {
  if (!work.authorships || work.authorships.length === 0) {
    return null;
  }

  const authorNames = work.authorships
    .slice(0, maxAuthors)
    .map(auth => auth.author?.display_name)
    .filter(Boolean);

  const moreCount = work.authorships.length - maxAuthors;

  return (
    <div className={className}>
      <span className={labelClassName}>Authors:</span>
      <span className={listClassName}>
        {authorNames.join(', ')}
        {moreCount > 0 && ` and ${moreCount} more`}
      </span>
    </div>
  );
}