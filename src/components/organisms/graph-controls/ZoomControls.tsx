import React from 'react';

import { Icon } from '@/components';

import * as styles from '../entity-graph-visualization.css';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  zoom?: number;
  showZoomLevel?: boolean;
}

export function ZoomControls({ 
  onZoomIn, 
  onZoomOut, 
  onZoomReset,
  zoom = 1,
  showZoomLevel = true,
}: ZoomControlsProps) {
  return (
    <div className={styles.zoomControls} role="toolbar" aria-label="Zoom controls">
      <button 
        className={styles.zoomButton} 
        onClick={onZoomOut} 
        title="Zoom out (-)"
        aria-label="Zoom out"
      >
        <Icon name="minus" size="sm" />
      </button>
      
      {showZoomLevel && (
        <div 
          className={styles.zoomLevel}
          title={`Current zoom: ${Math.round(zoom * 100)}%`}
          aria-live="polite"
          aria-label={`Current zoom level: ${Math.round(zoom * 100)} percent`}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}
      
      <button 
        className={styles.zoomButton} 
        onClick={onZoomReset} 
        title="Reset zoom (0)"
        aria-label="Reset zoom to 100%"
      >
        <Icon name="target" size="sm" />
      </button>
      
      <button 
        className={styles.zoomButton} 
        onClick={onZoomIn} 
        title="Zoom in (+)"
        aria-label="Zoom in"
      >
        <Icon name="plus" size="sm" />
      </button>
    </div>
  );
}