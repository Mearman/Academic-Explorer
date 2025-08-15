import React from 'react';

import { 
  MetricDisplay, 
  WorkHeader, 
  WorkAuthors, 
  WorkVenue, 
  WorkConcepts, 
  WorkLinks, 
  WorkAbstract 
} from '@/components';
import type { Work } from '@/lib/openalex/types';

import * as styles from './search-result-item.css';

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
      <WorkHeader
        work={work}
        className={styles.resultHeader}
        titleClassName={styles.resultTitle}
        metaClassName={styles.resultMeta}
        yearClassName={styles.year}
        openAccessClassName={styles.openAccess}
      />

      <WorkAuthors
        work={work}
        className={styles.authors}
        labelClassName={styles.authorsLabel}
        listClassName={styles.authorsList}
      />

      <WorkVenue
        work={work}
        className={styles.venue}
        labelClassName={styles.venueLabel}
        nameClassName={styles.venueName}
      />

      <div className={styles.metrics}>
        <MetricDisplay 
          label="Citations"
          value={work.cited_by_count || 0}
          variant="default"
        />
        
        <WorkConcepts
          work={work}
          className={styles.concepts}
        />
      </div>

      <WorkLinks
        work={work}
        className={styles.links}
      />

      <WorkAbstract
        work={work}
        className={styles.abstract}
        toggleClassName={styles.abstractToggle}
        contentClassName={styles.abstractContent}
      />
    </div>
  );
}