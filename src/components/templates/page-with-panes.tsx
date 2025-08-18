import { IconEye, IconEyeOff, IconChartBar, IconLayoutSidebar } from '@tabler/icons-react';
import React, { useRef, useImperativeHandle, forwardRef } from 'react';

import * as styles from './page-with-panes.css';
import { TwoPaneLayout } from './two-pane-layout';


interface PageWithPanesProps {
  /** Content for the page header */
  headerContent: React.ReactNode;
  /** Content for the left pane */
  leftPane: React.ReactNode;
  /** Content for the right pane */
  rightPane: React.ReactNode;
  /** Additional actions to show in the header */
  headerActions?: React.ReactNode;
  /** Props to pass to the TwoPaneLayout component */
  twoPaneLayoutProps?: Omit<React.ComponentProps<typeof TwoPaneLayout>, 'leftPane' | 'rightPane'>;
  /** Whether to show pane toggle controls */
  showPaneControls?: boolean;
  /** Labels for pane toggle buttons */
  paneControlLabels?: {
    left: string;
    right: string;
  };
}

export function PageWithPanes({
  headerContent,
  leftPane,
  rightPane,
  headerActions,
  twoPaneLayoutProps = {},
  showPaneControls = true,
  paneControlLabels = { left: 'Data', right: 'Graph' },
}: PageWithPanesProps) {
  // State to track current pane visibility (synced with TwoPaneLayout)
  const [leftPaneVisible, setLeftPaneVisible] = React.useState(true);
  const [rightPaneVisible, setRightPaneVisible] = React.useState(true);
  
  // Refs to store the actual toggle functions from TwoPaneLayout
  const toggleLeftRef = React.useRef<(() => void) | null>(null);
  const toggleRightRef = React.useRef<(() => void) | null>(null);

  // Handle toggle functions being ready from TwoPaneLayout
  const handleToggleFunctionsReady = React.useCallback((toggleLeft: () => void, toggleRight: () => void) => {
    toggleLeftRef.current = toggleLeft;
    toggleRightRef.current = toggleRight;
  }, []);

  // Handle pane state changes from TwoPaneLayout
  const handlePaneStateChange = React.useCallback((leftCollapsed: boolean, rightCollapsed: boolean) => {
    setLeftPaneVisible(!leftCollapsed);
    setRightPaneVisible(!rightCollapsed);
  }, []);

  // Create smart toggle functions that implement the "restore both panes" behavior
  const handleLeftToggle = () => {
    if (!toggleLeftRef.current || !toggleRightRef.current) return;
    
    // If right pane is hidden, show both panes
    if (!rightPaneVisible) {
      // Show left pane if it's hidden
      if (!leftPaneVisible) {
        toggleLeftRef.current();
      }
      // Show right pane
      toggleRightRef.current();
    } else {
      // Normal toggle behavior when both panes are visible
      toggleLeftRef.current();
    }
  };

  const handleRightToggle = () => {
    if (!toggleLeftRef.current || !toggleRightRef.current) return;
    
    // If left pane is hidden, show both panes
    if (!leftPaneVisible) {
      // Show left pane
      toggleLeftRef.current();
      // Show right pane if it's hidden
      if (!rightPaneVisible) {
        toggleRightRef.current();
      }
    } else {
      // Normal toggle behavior when both panes are visible
      toggleRightRef.current();
    }
  };

  // Pass callbacks to TwoPaneLayout
  const layoutProps = {
    ...twoPaneLayoutProps,
    leftCollapsible: true,
    rightCollapsible: true,
    showHeaders: false, // We handle headers ourselves
    onToggleFunctionsReady: handleToggleFunctionsReady,
    onPaneStateChange: handlePaneStateChange,
  };

  return (
    <div className={styles.pageContainer}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerMain}>
            {headerContent}
          </div>
          
          <div className={styles.headerActions}>
            {/* Custom header actions */}
            {headerActions}
            
            {/* Pane visibility controls */}
            {showPaneControls && (
              <div className={styles.paneControls}>
                <button
                  className={styles.paneToggleButton}
                  onClick={handleLeftToggle}
                  data-active={leftPaneVisible}
                  title={leftPaneVisible ? `Hide ${paneControlLabels.left}` : `Show ${paneControlLabels.left}`}
                  aria-label={leftPaneVisible ? `Hide ${paneControlLabels.left} pane` : `Show ${paneControlLabels.left} pane`}
                >
                  <IconLayoutSidebar size={16} />
                  {leftPaneVisible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  {paneControlLabels.left}
                </button>
                
                <button
                  className={styles.paneToggleButton}
                  onClick={handleRightToggle}
                  data-active={rightPaneVisible}
                  title={rightPaneVisible ? `Hide ${paneControlLabels.right}` : `Show ${paneControlLabels.right}`}
                  aria-label={rightPaneVisible ? `Hide ${paneControlLabels.right} pane` : `Show ${paneControlLabels.right} pane`}
                >
                  <IconChartBar size={16} />
                  {rightPaneVisible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  {paneControlLabels.right}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Pane Layout */}
      <div className={styles.panesContainer}>
        <TwoPaneLayout
          leftPane={leftPane}
          rightPane={rightPane}
          {...layoutProps}
        />
      </div>
    </div>
  );
}