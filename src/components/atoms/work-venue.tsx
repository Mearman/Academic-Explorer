import type { Work } from '@/lib/openalex/types';

interface WorkVenueProps {
  work: Work;
  className?: string;
  labelClassName?: string;
  nameClassName?: string;
}

export function WorkVenue({
  work,
  className = '',
  labelClassName = '',
  nameClassName = ''
}: WorkVenueProps) {
  if (!work.primary_location?.source?.display_name) {
    return null;
  }

  return (
    <div className={className}>
      <span className={labelClassName}>Published in:</span>
      <span className={nameClassName}>
        {work.primary_location.source.display_name}
      </span>
    </div>
  );
}