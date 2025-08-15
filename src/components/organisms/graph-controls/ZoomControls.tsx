import React from 'react';

import { Icon } from '@/components';

import * as styles from '../entity-graph-visualization.css';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onZoomReset }: ZoomControlsProps) {
  return (
    <div className={styles.zoomControls}>
      <button className={styles.zoomButton} onClick={onZoomOut} title="Zoom out">
        <Icon name="minus" size="sm" />
      </button>
      <button className={styles.zoomButton} onClick={onZoomReset} title="Reset zoom">
        <Icon name="target" size="sm" />
      </button>
      <button className={styles.zoomButton} onClick={onZoomIn} title="Zoom in">
        <Icon name="plus" size="sm" />
      </button>
    </div>
  );
}