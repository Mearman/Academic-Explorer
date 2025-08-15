import React from 'react';

import type { EntityGraphVertex, EntityGraphEdge } from '@/types/entity-graph';

import * as styles from '../entity-graph-visualization.css';

interface GraphInfoPanelProps {
  vertices: EntityGraphVertex[];
  edges: EntityGraphEdge[];
}

export function GraphInfoPanel({ vertices, edges }: GraphInfoPanelProps) {
  const visitedCount = vertices.filter(v => v.directlyVisited).length;

  return (
    <div className={styles.infoPanel}>
      <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
        Graph Statistics
      </div>
      <div style={{ fontSize: '10px', color: styles.entityColors.work }}>
        Entities: {vertices.length} | 
        Connections: {edges.length} |
        Visited: {visitedCount}
      </div>
    </div>
  );
}