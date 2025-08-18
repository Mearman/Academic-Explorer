import React from 'react';

import { Icon } from '@/components';

import * as styles from '../entity-graph-visualization.css';

interface GraphControlsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onRegenerateLayout: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onToggleSearch?: () => void;
  showSearch?: boolean;
}

export function GraphControls({
  isFullscreen,
  onToggleFullscreen,
  onRegenerateLayout,
  onExportPNG,
  onExportSVG,
  onToggleSearch,
  showSearch = false,
}: GraphControlsProps) {
  return (
    <div className={styles.controls} role="toolbar" aria-label="Graph controls">
      <button
        className={styles.controlButton}
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen (F11)' : 'Enter fullscreen (F11)'}
        aria-label={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
      >
        <Icon name={isFullscreen ? 'minimize' : 'maximize'} size="sm" />
      </button>
      
      <button
        className={styles.controlButton}
        onClick={onRegenerateLayout}
        title="Regenerate layout"
        aria-label="Regenerate graph layout"
      >
        <Icon name="refresh" size="sm" />
      </button>
      
      {onToggleSearch && (
        <button
          className={`${styles.controlButton} ${showSearch ? styles.controlButtonActive : ''}`}
          onClick={onToggleSearch}
          title="Toggle search (Cmd/Ctrl+F)"
          aria-label={showSearch ? 'Hide search' : 'Show search'}
          aria-pressed={showSearch}
        >
          <Icon name="search" size="sm" />
        </button>
      )}
      
      {(onExportPNG || onExportSVG) && (
        <div className={styles.exportGroup} role="group" aria-label="Export options">
          {onExportPNG && (
            <button
              className={styles.controlButton}
              onClick={onExportPNG}
              title="Export as PNG (Cmd/Ctrl+E)"
              aria-label="Export graph as PNG image"
            >
              <Icon name="download" size="sm" />
            </button>
          )}
          
          {onExportSVG && (
            <button
              className={styles.controlButton}
              onClick={onExportSVG}
              title="Export as SVG"
              aria-label="Export graph as SVG vector image"
            >
              <Icon name="file-type-svg" size="sm" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}