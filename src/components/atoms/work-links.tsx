import { ExternalLink } from '@/components';
import type { Work } from '@/lib/openalex/types';

interface WorkLinksProps {
  work: Work;
  className?: string;
}

export function WorkLinks({
  work,
  className = ''
}: WorkLinksProps) {
  if (!work.doi) {
    return null;
  }

  return (
    <div className={className}>
      <ExternalLink href={`https://doi.org/${work.doi}`} type="doi">
        DOI: {work.doi}
      </ExternalLink>
    </div>
  );
}