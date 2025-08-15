import React from 'react';

import { EntityBadge } from '@/components';
import type { EntityGraphVertex } from '@/types/entity-graph';

import * as styles from '../entity-graph-visualization.css';

interface GraphTooltipProps {
  vertex: EntityGraphVertex;
  x: number;
  y: number;
}

export function GraphTooltip({ vertex, x, y }: GraphTooltipProps) {
  return (
    <div
      className={styles.tooltip}
      style={{
        left: x + 10,
        top: y - 10,
      }}
    >
      <div className={styles.tooltipTitle}>{vertex.displayName}</div>
      <div className={styles.tooltipDetail}>
        Type: <EntityBadge entityType={vertex.entityType} size="xs" />
      </div>
      {vertex.directlyVisited && (
        <div className={styles.tooltipDetail}>
          Visits: {vertex.visitCount}
        </div>
      )}
      {vertex.metadata.citedByCount && (
        <div className={styles.tooltipDetail}>
          Citations: {vertex.metadata.citedByCount.toLocaleString()}
        </div>
      )}
      {vertex.metadata.publicationYear && (
        <div className={styles.tooltipDetail}>
          Year: {vertex.metadata.publicationYear}
        </div>
      )}
      <div className={styles.tooltipDetail}>
        First seen: {new Date(vertex.firstSeen).toLocaleDateString()}
      </div>
    </div>
  );
}