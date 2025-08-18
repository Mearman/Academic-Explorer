import React, { useRef, useState } from 'react';
import { IconLayoutSidebar, IconChartBar } from '@tabler/icons-react';

import { usePaneLayout } from '@/hooks/use-pane-layout';

import { PaneDivider } from '../molecules/pane-divider';

import * as styles from './two-pane-layout.css';

interface TwoPaneLayoutProps {
  /** Content for the left pane */
  leftPane: React.ReactNode;
  /** Content for the right pane */
  rightPane: React.ReactNode;
  /** Default split percentage for left pane (0-100) */
  defaultSplit?: number;
  /** Minimum pane size in pixels */
  minPaneSize?: number;
  /** Whether left pane can be collapsed */
  leftCollapsible?: boolean;
  /** Whether right pane can be collapsed */
  rightCollapsible?: boolean;
  /** Initial collapsed state for left pane */
  leftCollapsed?: boolean;
  /** Initial collapsed state for right pane */
  rightCollapsed?: boolean;
  /** Persist state in localStorage */
  persistState?: boolean;
  /** Unique key for state persistence */
  stateKey?: string;
  /** Title for left pane */
  leftTitle?: string;
  /** Title for right pane */
  rightTitle?: string;
  /** Actions for left pane header */
  leftActions?: React.ReactNode;
  /** Actions for right pane header */
  rightActions?: React.ReactNode;
  /** Whether to show pane headers */
  showHeaders?: boolean;
  /** Whether to show mobile tabs */
  showMobileTabs?: boolean;
  /** Custom mobile tab labels */
  mobileTabLabels?: {
    left: string;
    right: string;
  };
}

export function TwoPaneLayout({
  leftPane,
  rightPane,
  defaultSplit = 60,
  minPaneSize = 300,
  leftCollapsible = true,
  rightCollapsible = true,
  leftCollapsed: _leftCollapsed = false,
  rightCollapsed: _rightCollapsed = false,
  persistState = true,
  stateKey = 'default',
  leftTitle,
  rightTitle,
  leftActions,
  rightActions,
  showHeaders = false,
  showMobileTabs = true,
  mobileTabLabels = { left: 'Data', right: 'Graph' },
}: TwoPaneLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'left' | 'right'>('left');

  const {
    leftWidth,
    rightWidth,
    leftCollapsed: isLeftCollapsed,
    rightCollapsed: isRightCollapsed,
    isDragging,
    toggleLeftPane,
    toggleRightPane,
    handleDrag,
    startDragging,
    stopDragging,
  } = usePaneLayout({
    defaultSplit,
    minPaneSize,
    persistState,
    stateKey,
    leftCollapsible,
    rightCollapsible,
  });

  // Use prop values initially, then state takes over
  const leftPaneCollapsed = isLeftCollapsed;
  const rightPaneCollapsed = isRightCollapsed;

  // Calculate actual widths for CSS
  const getLeftWidth = () => {
    if (leftPaneCollapsed) return 0;
    if (rightPaneCollapsed) return 100;
    return leftWidth;
  };

  const getRightWidth = () => {
    if (rightPaneCollapsed) return 0;
    if (leftPaneCollapsed) return 100;
    return rightWidth;
  };

  const leftWidthPercent = getLeftWidth();
  const rightWidthPercent = getRightWidth();

  // Mobile tab handlers
  const handleMobileTabClick = (tab: 'left' | 'right') => {
    setActiveMobileTab(tab);
  };

  // Expand pane handlers (for when clicking on collapsed pane area)
  const handleExpandLeft = () => {
    if (leftPaneCollapsed) {
      toggleLeftPane();
    }
  };

  const handleExpandRight = () => {
    if (rightPaneCollapsed) {
      toggleRightPane();
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Mobile tabs - only visible on mobile */}
      {showMobileTabs && (
        <div className={styles.mobileTabContainer}>
          <button
            className={`${styles.mobileTab} ${activeMobileTab === 'left' ? styles.activeMobileTab : ''}`}
            onClick={() => handleMobileTabClick('left')}
            type="button"
          >
            <IconLayoutSidebar size={16} style={{ marginRight: '8px' }} />
            {mobileTabLabels.left}
          </button>
          <button
            className={`${styles.mobileTab} ${activeMobileTab === 'right' ? styles.activeMobileTab : ''}`}
            onClick={() => handleMobileTabClick('right')}
            type="button"
          >
            <IconChartBar size={16} style={{ marginRight: '8px' }} />
            {mobileTabLabels.right}
          </button>
        </div>
      )}

      {/* Desktop layout */}
      <div className={styles.desktopLayout}>
        {/* Left pane */}
        <div
          className={`${styles.pane} ${styles.paneVariants.left} ${leftPaneCollapsed ? styles.collapsedPane : ''} ${showMobileTabs && activeMobileTab !== 'left' ? styles.hiddenOnMobile : ''}`}
          style={{
            width: `${leftWidthPercent}%`,
            minWidth: leftPaneCollapsed ? 0 : minPaneSize,
          }}
          onClick={handleExpandLeft}
          role={leftPaneCollapsed ? 'button' : 'region'}
          tabIndex={leftPaneCollapsed ? 0 : undefined}
          aria-label={leftPaneCollapsed ? 'Expand left panel (Cmd+[)' : leftTitle || 'Left panel content'}
          aria-expanded={!leftPaneCollapsed}
          onKeyDown={leftPaneCollapsed ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleExpandLeft();
            }
          } : undefined}
        >
          {showHeaders && leftTitle && (
            <div className={styles.paneHeader}>
              <h2 className={styles.paneTitle}>
                <IconLayoutSidebar size={20} />
                {leftTitle}
              </h2>
              {leftActions && (
                <div className={styles.paneActions}>
                  {leftActions}
                </div>
              )}
            </div>
          )}
          <div className={styles.paneContent}>
            {leftPane}
          </div>
        </div>

        {/* Divider - only visible on desktop */}
        <div className={styles.dividerContainer}>
          <PaneDivider
            onDrag={handleDrag}
            onDragStart={startDragging}
            onDragEnd={stopDragging}
            onCollapseLeft={leftCollapsible ? toggleLeftPane : undefined}
            onCollapseRight={rightCollapsible ? toggleRightPane : undefined}
            leftCollapsed={leftPaneCollapsed}
            rightCollapsed={rightPaneCollapsed}
            leftCollapsible={leftCollapsible}
            rightCollapsible={rightCollapsible}
            containerRef={containerRef}
          />
        </div>

        {/* Right pane */}
        <div
          className={`${styles.pane} ${styles.paneVariants.right} ${rightPaneCollapsed ? styles.collapsedPane : ''} ${showMobileTabs && activeMobileTab !== 'right' ? styles.hiddenOnMobile : ''}`}
          style={{
            width: `${rightWidthPercent}%`,
            minWidth: rightPaneCollapsed ? 0 : minPaneSize,
          }}
          onClick={handleExpandRight}
          role={rightPaneCollapsed ? 'button' : 'region'}
          tabIndex={rightPaneCollapsed ? 0 : undefined}
          aria-label={rightPaneCollapsed ? 'Expand right panel (Cmd+])' : rightTitle || 'Right panel content'}
          aria-expanded={!rightPaneCollapsed}
          onKeyDown={rightPaneCollapsed ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleExpandRight();
            }
          } : undefined}
        >
          {showHeaders && rightTitle && (
            <div className={styles.paneHeader}>
              <h2 className={styles.paneTitle}>
                <IconChartBar size={20} />
                {rightTitle}
              </h2>
              {rightActions && (
                <div className={styles.paneActions}>
                  {rightActions}
                </div>
              )}
            </div>
          )}
          <div className={styles.paneContent}>
            {rightPane}
          </div>
        </div>
      </div>

      {/* Visual feedback for dragging */}
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: 'col-resize',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}