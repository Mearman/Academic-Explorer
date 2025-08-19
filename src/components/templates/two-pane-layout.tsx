import { IconLayoutSidebar, IconChartBar } from '@tabler/icons-react';
import React, { useRef, useState, useEffect } from 'react';

import { LayoutProvider } from '@/contexts/layout-context';
import { usePaneLayout } from '@/hooks/use-pane-layout';

import { PaneDivider } from '../molecules/pane-divider';

import * as styles from './two-pane-layout.css';

/**
 * Mobile tabs component
 */
function MobileTabs({ config }: { config: MobileTabConfig }) {
  return (
    <div className={styles.mobileTabContainer}>
      <button
        className={`${styles.mobileTab} ${config.activeTab === 'left' ? styles.activeMobileTab : ''}`}
        onClick={() => config.onTabClick('left')}
        type="button"
      >
        <IconLayoutSidebar size={16} style={{ marginRight: '8px' }} />
        {config.labels.left}
      </button>
      <button
        className={`${styles.mobileTab} ${config.activeTab === 'right' ? styles.activeMobileTab : ''}`}
        onClick={() => config.onTabClick('right')}
        type="button"
      >
        <IconChartBar size={16} style={{ marginRight: '8px' }} />
        {config.labels.right}
      </button>
    </div>
  );
}

/**
 * Individual pane element component
 */
function PaneElement({ 
  config, 
  minPaneSize, 
  showHeaders, 
  showMobileTabs, 
  activeMobileTab 
}: {
  config: PaneConfig;
  minPaneSize: number;
  showHeaders: boolean;
  showMobileTabs: boolean;
  activeMobileTab: 'left' | 'right';
}) {
  const handleClick = () => {
    if (config.collapsed) {
      config.onExpand();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (config.collapsed && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      config.onExpand();
    }
  };

  const isHiddenOnMobile = showMobileTabs && activeMobileTab !== config.type;
  const ariaLabel = config.collapsed 
    ? `Expand ${config.type} panel (Cmd+${config.type === 'left' ? '[' : ']'})` 
    : config.title || `${config.type} panel content`;

  return (
    <div
      className={`${styles.pane} ${styles.paneVariants[config.type]} ${config.collapsed ? styles.collapsedPane : ''} ${isHiddenOnMobile ? styles.hiddenOnMobile : ''}`}
      style={{
        width: `${config.widthPercent}%`,
        minWidth: config.collapsed ? 0 : minPaneSize,
      }}
      onClick={handleClick}
      role={config.collapsed ? 'button' : 'region'}
      tabIndex={config.collapsed ? 0 : undefined}
      aria-label={ariaLabel}
      aria-expanded={!config.collapsed}
      onKeyDown={config.collapsed ? handleKeyDown : undefined}
    >
      {showHeaders && config.title && (
        <PaneHeader 
          title={config.title}
          icon={config.tabIcon}
          actions={config.actions}
        />
      )}
      <div className={styles.paneContent}>
        {config.content}
      </div>
    </div>
  );
}

/**
 * Pane header component
 */
function PaneHeader({ 
  title, 
  icon: Icon, 
  actions 
}: {
  title: string;
  icon: React.ComponentType<{ size?: number | string }>;
  actions?: React.ReactNode;
}) {
  return (
    <div className={styles.paneHeader}>
      <h2 className={styles.paneTitle}>
        <Icon size={20} />
        {title}
      </h2>
      {actions && (
        <div className={styles.paneActions}>
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Drag overlay component for visual feedback
 */
function DragOverlay() {
  return (
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
  );
}

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
  /** Callback when pane state changes */
  onPaneStateChange?: (leftCollapsed: boolean, rightCollapsed: boolean) => void;
  /** Callback to provide toggle functions to parent */
  onToggleFunctionsReady?: (toggleLeft: () => void, toggleRight: () => void) => void;
}

type PaneType = 'left' | 'right';

interface PaneConfig {
  type: PaneType;
  collapsed: boolean;
  title?: string;
  actions?: React.ReactNode;
  content: React.ReactNode;
  collapsible: boolean;
  widthPercent: number;
  onExpand: () => void;
  tabIcon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
}

interface MobileTabConfig {
  labels: { left: string; right: string };
  activeTab: 'left' | 'right';
  onTabClick: (tab: 'left' | 'right') => void;
}

/**
 * Calculate pane width percentages based on collapsed states
 */
function calculatePaneWidths(
  leftWidth: number,
  rightWidth: number,
  leftCollapsed: boolean,
  rightCollapsed: boolean
): { left: number; right: number } {
  if (leftCollapsed) return { left: 0, right: 100 };
  if (rightCollapsed) return { left: 100, right: 0 };
  return { left: leftWidth, right: rightWidth };
}

/**
 * Create pane configuration objects
 */
function createPaneConfigs(
  props: TwoPaneLayoutProps,
  state: {
    leftCollapsed: boolean;
    rightCollapsed: boolean;
    leftWidth: number;
    rightWidth: number;
    toggleLeftPane: () => void;
    toggleRightPane: () => void;
  }
): { left: PaneConfig; right: PaneConfig } {
  const { left: leftWidth, right: rightWidth } = calculatePaneWidths(
    state.leftWidth,
    state.rightWidth,
    state.leftCollapsed,
    state.rightCollapsed
  );

  return {
    left: {
      type: 'left',
      collapsed: state.leftCollapsed,
      title: props.leftTitle,
      actions: props.leftActions,
      content: props.leftPane,
      collapsible: props.leftCollapsible ?? true,
      widthPercent: leftWidth,
      onExpand: state.toggleLeftPane,
      tabIcon: IconLayoutSidebar,
    },
    right: {
      type: 'right',
      collapsed: state.rightCollapsed,
      title: props.rightTitle,
      actions: props.rightActions,
      content: props.rightPane,
      collapsible: props.rightCollapsible ?? true,
      widthPercent: rightWidth,
      onExpand: state.toggleRightPane,
      tabIcon: IconChartBar,
    },
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
  onPaneStateChange,
  onToggleFunctionsReady,
}: TwoPaneLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'left' | 'right'>('left');

  const paneLayoutState = usePaneLayout({
    defaultSplit,
    minPaneSize,
    persistState,
    stateKey,
    leftCollapsible,
    rightCollapsible,
  });

  const {
    leftCollapsed: isLeftCollapsed,
    rightCollapsed: isRightCollapsed,
    toggleLeftPane,
    toggleRightPane,
  } = paneLayoutState;

  // Provide toggle functions to parent component
  useEffect(() => {
    onToggleFunctionsReady?.(toggleLeftPane, toggleRightPane);
  }, [onToggleFunctionsReady, toggleLeftPane, toggleRightPane]);

  // Notify parent of state changes
  useEffect(() => {
    onPaneStateChange?.(isLeftCollapsed, isRightCollapsed);
  }, [onPaneStateChange, isLeftCollapsed, isRightCollapsed]);

  const paneConfigs = createPaneConfigs(
    { leftPane, rightPane, leftTitle, rightTitle, leftActions, rightActions, leftCollapsible, rightCollapsible },
    paneLayoutState
  );

  const mobileTabConfig: MobileTabConfig = {
    labels: mobileTabLabels,
    activeTab: activeMobileTab,
    onTabClick: setActiveMobileTab,
  };

  return (
    <LayoutProvider isInTwoPaneLayout={true}>
      <div className={styles.container} ref={containerRef}>
        {showMobileTabs && (
          <MobileTabs config={mobileTabConfig} />
        )}

        <div className={styles.desktopLayout}>
          <PaneElement
            config={paneConfigs.left}
            minPaneSize={minPaneSize}
            showHeaders={showHeaders}
            showMobileTabs={showMobileTabs}
            activeMobileTab={activeMobileTab}
          />

          <div className={styles.dividerContainer}>
            <PaneDivider
              onDrag={paneLayoutState.handleDrag}
              onDragStart={paneLayoutState.startDragging}
              onDragEnd={paneLayoutState.stopDragging}
              onCollapseLeft={leftCollapsible ? toggleLeftPane : undefined}
              onCollapseRight={rightCollapsible ? toggleRightPane : undefined}
              leftCollapsed={isLeftCollapsed}
              rightCollapsed={isRightCollapsed}
              leftCollapsible={leftCollapsible}
              rightCollapsible={rightCollapsible}
              containerRef={containerRef}
            />
          </div>

          <PaneElement
            config={paneConfigs.right}
            minPaneSize={minPaneSize}
            showHeaders={showHeaders}
            showMobileTabs={showMobileTabs}
            activeMobileTab={activeMobileTab}
          />
        </div>

        {paneLayoutState.isDragging && <DragOverlay />}
      </div>
    </LayoutProvider>
  );
}