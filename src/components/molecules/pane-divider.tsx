import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import React, { useEffect, useRef } from 'react';

// eslint-disable-next-line import/no-restricted-paths
import * as styles from '../templates/two-pane-layout.css';

interface PaneDividerProps {
  onDrag: (clientX: number, containerRect: DOMRect) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onCollapseLeft?: () => void;
  onCollapseRight?: () => void;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  leftCollapsible?: boolean;
  rightCollapsible?: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function PaneDivider({
  onDrag,
  onDragStart,
  onDragEnd,
  onCollapseLeft,
  onCollapseRight,
  leftCollapsed,
  rightCollapsed,
  leftCollapsible = true,
  rightCollapsible = true,
  containerRef,
}: PaneDividerProps) {
  const dividerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      
      event.preventDefault();
      const containerRect = containerRef.current.getBoundingClientRect();
      onDrag(event.clientX, containerRect);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onDragEnd();
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isDraggingRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag, onDragEnd, containerRef]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only left click
    
    event.preventDefault();
    isDraggingRef.current = true;
    onDragStart();
  };

  const handleCollapseLeft = (event: React.MouseEvent) => {
    event.stopPropagation();
    onCollapseLeft?.();
  };

  const handleCollapseRight = (event: React.MouseEvent) => {
    event.stopPropagation();
    onCollapseRight?.();
  };

  return (
    <div
      ref={dividerRef}
      className={styles.divider}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && leftCollapsible) {
          onCollapseLeft?.();
        } else if (event.key === 'ArrowRight' && rightCollapsible) {
          onCollapseRight?.();
        }
      }}
    >
      <div className={styles.dividerHandle} />
      
      {/* Left panel button - collapse when expanded, expand when collapsed */}
      {leftCollapsible && (
        <button
          className={`${styles.collapseButton} ${styles.collapseButtonVariants.left}`}
          onClick={handleCollapseLeft}
          aria-label={leftCollapsed ? "Expand left panel" : "Collapse left panel"}
          title={leftCollapsed ? "Expand left panel (Cmd+[)" : "Collapse left panel (Cmd+[)"}
          type="button"
        >
          {leftCollapsed ? <IconChevronRight size={12} /> : <IconChevronLeft size={12} />}
        </button>
      )}
      
      {/* Right panel button - collapse when expanded, expand when collapsed */}
      {rightCollapsible && (
        <button
          className={`${styles.collapseButton} ${styles.collapseButtonVariants.right}`}
          onClick={handleCollapseRight}
          aria-label={rightCollapsed ? "Expand right panel" : "Collapse right panel"}
          title={rightCollapsed ? "Expand right panel (Cmd+])" : "Collapse right panel (Cmd+])"}
          type="button"
        >
          {rightCollapsed ? <IconChevronLeft size={12} /> : <IconChevronRight size={12} />}
        </button>
      )}
    </div>
  );
}