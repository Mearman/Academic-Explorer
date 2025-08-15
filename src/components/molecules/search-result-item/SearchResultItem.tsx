import React from 'react';
import { EntityBadge, MetricDisplay, ExternalLink } from '@/components';
import type { Work } from '@/lib/openalex/types';
import * as styles from '../../organisms/search-results.css';

interface SearchResultItemProps {
  work: Work;
  onClick: (work: Work) => void;
}

export function SearchResultItem({ work, onClick }: SearchResultItemProps) {
  return (
    <div 
      className={styles.resultItem}
      onClick={() => onClick(work)}
    >
      <div className={styles.resultHeader}>
        <h3 className={styles.resultTitle}>
          {work.title}
        </h3>
        <div className={styles.resultMeta}>
          <EntityBadge entityType="work" />
          {work.publication_year && (
            <span className={styles.year}>
              {work.publication_year}
            </span>
          )}
          {work.open_access?.is_oa && (
            <span className={styles.openAccess}>
              Open Access
            </span>
          )}
        </div>
      </div>

      {work.authorships && work.authorships.length > 0 && (
        <div className={styles.authors}>
          <span className={styles.authorsLabel}>Authors:</span>
          <span className={styles.authorsList}>
            {work.authorships
              .slice(0, 3)
              .map(auth => auth.author?.display_name)
              .filter(Boolean)
              .join(', ')}
            {work.authorships.length > 3 && ` and ${work.authorships.length - 3} more`}
          </span>
        </div>
      )}

      {work.primary_location?.source?.display_name && (
        <div className={styles.venue}>
          <span className={styles.venueLabel}>Published in:</span>
          <span className={styles.venueName}>
            {work.primary_location.source.display_name}
          </span>
        </div>
      )}

      <div className={styles.metrics}>
        <MetricDisplay 
          label="Citations"
          value={work.cited_by_count || 0}
          variant="default"
        />
        
        {work.concepts && work.concepts.length > 0 && (
          <div className={styles.concepts}>
            {work.concepts
              .slice(0, 3)
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
        )}
      </div>

      {work.doi && (
        <div className={styles.links}>
          <ExternalLink href={`https://doi.org/${work.doi}`} type="doi">
            DOI: {work.doi}
          </ExternalLink>
        </div>
      )}

      {work.abstract_inverted_index && (
        <div className={styles.abstract}>
          <details>
            <summary className={styles.abstractToggle}>
              Show Abstract
            </summary>
            <div className={styles.abstractContent}>
              {/* We'll need to reconstruct the abstract from inverted index */}
              Abstract available (click to view full paper)
            </div>
          </details>
        </div>
      )}
    </div>
  );
}