import React from 'react';

import { Icon } from '@/components';

import * as styles from '../entity-graph-visualization.css';

interface GraphControlsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onRegenerateLayout: () => void;
}

export function GraphControls({
  isFullscreen,
  onToggleFullscreen,
  onRegenerateLayout,
}: GraphControlsProps) {
  return (
    <div className={styles.controls}>
      <button
        className={styles.controlButton}
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        <Icon name={isFullscreen ? 'minimize' : 'maximize'} size="sm" />
      </button>
      <button
        className={styles.controlButton}
        onClick={onRegenerateLayout}
        title="Regenerate layout"
      >
        <Icon name="refresh" size="sm" />
      </button>
    </div>
  );
}