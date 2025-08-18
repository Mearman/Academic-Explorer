import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from '@mantine/hooks';

interface PaneLayoutState {
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  isDragging: boolean;
}

interface PaneLayoutConfig {
  defaultSplit?: number; // Percentage for left pane (0-100)
  minPaneSize?: number; // Minimum pane width in pixels
  persistState?: boolean;
  stateKey?: string;
  leftCollapsible?: boolean;
  rightCollapsible?: boolean;
}

interface PaneLayoutActions {
  toggleLeftPane: () => void;
  toggleRightPane: () => void;
  setPaneSizes: (leftPercent: number, rightPercent: number) => void;
  resetLayout: () => void;
  startDragging: () => void;
  stopDragging: () => void;
  handleDrag: (clientX: number, containerRect: DOMRect) => void;
}

type UsePaneLayoutReturn = PaneLayoutState & PaneLayoutActions;

const DEFAULT_SPLIT = 60; // 60% left, 40% right
const DEFAULT_MIN_PANE_SIZE = 300; // pixels

export function usePaneLayout({
  defaultSplit = DEFAULT_SPLIT,
  minPaneSize = DEFAULT_MIN_PANE_SIZE,
  persistState = true,
  stateKey = 'default',
  leftCollapsible = true,
  rightCollapsible = true,
}: PaneLayoutConfig = {}): UsePaneLayoutReturn {
  // Generate unique storage key
  const storageKey = `pane-layout-${stateKey}`;

  // Persistent state (only if enabled)
  const [persistedState, setPersistedState] = useLocalStorage<{
    leftWidth: number;
    rightWidth: number;
    leftCollapsed: boolean;
    rightCollapsed: boolean;
  }>({
    key: storageKey,
    defaultValue: {
      leftWidth: defaultSplit,
      rightWidth: 100 - defaultSplit,
      leftCollapsed: false,
      rightCollapsed: false,
    },
    serialize: JSON.stringify,
    deserialize: (value) => {
      try {
        return value ? JSON.parse(value) : {
          leftWidth: defaultSplit,
          rightWidth: 100 - defaultSplit,
          leftCollapsed: false,
          rightCollapsed: false,
        };
      } catch {
        return {
          leftWidth: defaultSplit,
          rightWidth: 100 - defaultSplit,
          leftCollapsed: false,
          rightCollapsed: false,
        };
      }
    },
  });

  // Local state (always used for real-time updates)
  const [localState, setLocalState] = useState<PaneLayoutState>({
    leftWidth: persistState ? persistedState.leftWidth : defaultSplit,
    rightWidth: persistState ? persistedState.rightWidth : 100 - defaultSplit,
    leftCollapsed: persistState ? persistedState.leftCollapsed : false,
    rightCollapsed: persistState ? persistedState.rightCollapsed : false,
    isDragging: false,
  });

  // Update persisted state when local state changes (debounced)
  useEffect(() => {
    if (!persistState) return;

    const timeoutId = setTimeout(() => {
      setPersistedState({
        leftWidth: localState.leftWidth,
        rightWidth: localState.rightWidth,
        leftCollapsed: localState.leftCollapsed,
        rightCollapsed: localState.rightCollapsed,
      });
    }, 100); // Debounce to avoid excessive localStorage writes

    return () => clearTimeout(timeoutId);
  }, [localState, persistState, setPersistedState]);

  const toggleLeftPane = useCallback(() => {
    if (!leftCollapsible) return;

    setLocalState((prev) => ({
      ...prev,
      leftCollapsed: !prev.leftCollapsed,
      // When expanding left pane, ensure right pane isn't collapsed
      rightCollapsed: !prev.leftCollapsed ? false : prev.rightCollapsed,
    }));
  }, [leftCollapsible]);

  const toggleRightPane = useCallback(() => {
    if (!rightCollapsible) return;

    setLocalState((prev) => ({
      ...prev,
      rightCollapsed: !prev.rightCollapsed,
      // When expanding right pane, ensure left pane isn't collapsed
      leftCollapsed: !prev.rightCollapsed ? false : prev.leftCollapsed,
    }));
  }, [rightCollapsible]);

  const setPaneSizes = useCallback((leftPercent: number, rightPercent: number) => {
    // Ensure percentages add up to 100 and respect minimums
    const total = leftPercent + rightPercent;
    if (total !== 100) {
      // Normalize to 100%
      const normalizedLeft = (leftPercent / total) * 100;
      const normalizedRight = (rightPercent / total) * 100;
      leftPercent = normalizedLeft;
      rightPercent = normalizedRight;
    }

    // Clamp to reasonable bounds (10% to 90% for each pane)
    leftPercent = Math.max(10, Math.min(90, leftPercent));
    rightPercent = 100 - leftPercent;

    setLocalState((prev) => ({
      ...prev,
      leftWidth: leftPercent,
      rightWidth: rightPercent,
      leftCollapsed: false,
      rightCollapsed: false,
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setLocalState({
      leftWidth: defaultSplit,
      rightWidth: 100 - defaultSplit,
      leftCollapsed: false,
      rightCollapsed: false,
      isDragging: false,
    });
  }, [defaultSplit]);

  const startDragging = useCallback(() => {
    setLocalState((prev) => ({ ...prev, isDragging: true }));
  }, []);

  const stopDragging = useCallback(() => {
    setLocalState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const handleDrag = useCallback((clientX: number, containerRect: DOMRect) => {
    const containerWidth = containerRect.width;
    const minWidthPercent = (minPaneSize / containerWidth) * 100;
    const maxLeftPercent = 100 - minWidthPercent;
    
    // Calculate new left percentage based on mouse position
    const leftPercent = ((clientX - containerRect.left) / containerWidth) * 100;
    
    // Clamp to minimum and maximum bounds
    const clampedLeftPercent = Math.max(minWidthPercent, Math.min(maxLeftPercent, leftPercent));
    const rightPercent = 100 - clampedLeftPercent;

    setLocalState((prev) => ({
      ...prev,
      leftWidth: clampedLeftPercent,
      rightWidth: rightPercent,
      leftCollapsed: false,
      rightCollapsed: false,
    }));
  }, [minPaneSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Only handle shortcuts when Cmd/Ctrl is pressed
      if (!event.metaKey && !event.ctrlKey) return;
      
      // Don't handle shortcuts if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true'
      )) {
        return;
      }

      switch (event.key) {
        case '[':
          event.preventDefault();
          toggleLeftPane();
          // Announce to screen readers
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(
              localState.leftCollapsed ? 'Left panel expanded' : 'Left panel collapsed'
            );
            utterance.volume = 0.1;
            speechSynthesis.speak(utterance);
          }
          break;
        case ']':
          event.preventDefault();
          toggleRightPane();
          // Announce to screen readers
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(
              localState.rightCollapsed ? 'Right panel expanded' : 'Right panel collapsed'
            );
            utterance.volume = 0.1;
            speechSynthesis.speak(utterance);
          }
          break;
        case '\\':
          event.preventDefault();
          resetLayout();
          // Announce to screen readers
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('Layout reset to default');
            utterance.volume = 0.1;
            speechSynthesis.speak(utterance);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [toggleLeftPane, toggleRightPane, resetLayout, localState.leftCollapsed, localState.rightCollapsed]);

  return {
    ...localState,
    toggleLeftPane,
    toggleRightPane,
    setPaneSizes,
    resetLayout,
    startDragging,
    stopDragging,
    handleDrag,
  };
}