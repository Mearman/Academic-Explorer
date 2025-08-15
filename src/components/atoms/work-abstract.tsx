import type { Work } from '@/lib/openalex/types';

interface WorkAbstractProps {
  work: Work;
  className?: string;
  toggleClassName?: string;
  contentClassName?: string;
}

export function WorkAbstract({
  work,
  className = '',
  toggleClassName = '',
  contentClassName = ''
}: WorkAbstractProps) {
  if (!work.abstract_inverted_index) {
    return null;
  }

  return (
    <div className={className}>
      <details>
        <summary className={toggleClassName}>
          Show Abstract
        </summary>
        <div className={contentClassName}>
          {/* We'll need to reconstruct the abstract from inverted index */}
          Abstract available (click to view full paper)
        </div>
      </details>
    </div>
  );
}