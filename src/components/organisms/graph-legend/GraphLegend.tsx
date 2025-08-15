import React from 'react';
import { EntityBadge } from '@/components';
import type { EntityGraphVertex, EntityType } from '@/types/entity-graph';\nimport * as styles from '../entity-graph-visualization.css';

interface GraphLegendProps {
  vertices: EntityGraphVertex[];
  getEntityColor: (entityType: EntityType) => string;
}

export function GraphLegend({ vertices, getEntityColor }: GraphLegendProps) {
  const uniqueEntityTypes = Array.from(new Set(vertices.map(v => v.entityType)));

  return (
    <div className={styles.legend}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600' }}>
        Entity Types
      </h4>
      {uniqueEntityTypes.map(entityType => (
        <div key={entityType} className={styles.legendItem}>
          <div
            className={styles.legendColor}
            style={{ backgroundColor: getEntityColor(entityType) }}
          />
          <EntityBadge entityType={entityType} size="xs" />
        </div>
      ))}
      
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${styles.entityColors.work}` }}>
        <div className={styles.legendItem}>
          <div
            className={styles.legendColor}
            style={{ 
              backgroundColor: 'transparent',
              border: `2px solid ${styles.entityColors.work}`,
            }}
          />
          <span style={{ fontSize: '10px' }}>Directly visited</span>
        </div>
        <div className={styles.legendItem}>
          <div
            className={styles.legendColor}
            style={{ 
              backgroundColor: 'transparent',
              border: `1px solid ${styles.entityColors.work}`,
              opacity: 0.6,
            }}
          />
          <span style={{ fontSize: '10px' }}>Related entity</span>
        </div>
      </div>
    </div>
  );
}