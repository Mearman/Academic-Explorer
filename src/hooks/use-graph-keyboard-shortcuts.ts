import { useEffect, useCallback } from 'react';

export interface GraphKeyboardShortcuts {
  onToggleFullscreen?: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onToggleSearch?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onEscape?: () => void;
}

/**
 * Custom hook for handling graph-specific keyboard shortcuts
 */
export function useGraphKeyboardShortcuts(shortcuts: GraphKeyboardShortcuts) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts if user is typing in an input/textarea
    const target = event.target as HTMLElement;
    if (target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.contentEditable === 'true'
    )) {
      return;
    }

    // F11 - Toggle fullscreen (without modifiers)
    if (event.key === 'F11') {
      event.preventDefault();
      shortcuts.onToggleFullscreen?.();
      return;
    }

    // Escape key (without modifiers)
    if (event.key === 'Escape') {
      event.preventDefault();
      shortcuts.onEscape?.();
      return;
    }

    // Zoom shortcuts (without modifiers for +, -, 0)
    if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      switch (event.key) {
        case '+':
        case '=': // Plus key without shift
          event.preventDefault();
          shortcuts.onZoomIn?.();
          return;
        case '-':
          event.preventDefault();
          shortcuts.onZoomOut?.();
          return;
        case '0':
          event.preventDefault();
          shortcuts.onZoomReset?.();
          return;
      }
    }

    // Cmd/Ctrl shortcuts
    if (event.metaKey || event.ctrlKey) {
      switch (event.key) {
        case 'e':
        case 'E':
          event.preventDefault();
          shortcuts.onExportPNG?.();
          announceToScreenReader('Exporting graph as PNG');
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          shortcuts.onToggleSearch?.();
          announceToScreenReader('Toggling graph search');
          break;
        case '+':
        case '=':
          event.preventDefault();
          shortcuts.onZoomIn?.();
          break;
        case '-':
          event.preventDefault();
          shortcuts.onZoomOut?.();
          break;
        case '0':
          event.preventDefault();
          shortcuts.onZoomReset?.();
          break;
      }
    }

    // Cmd/Ctrl + Shift shortcuts
    if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
      switch (event.key) {
        case 'E':
          event.preventDefault();
          shortcuts.onExportSVG?.();
          announceToScreenReader('Exporting graph as SVG');
          break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Announce actions to screen readers
 */
function announceToScreenReader(message: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.volume = 0.1;
    utterance.rate = 1.2;
    speechSynthesis.speak(utterance);
  }
}

/**
 * Get keyboard shortcut labels for display in tooltips/help
 */
export function getKeyboardShortcutLabels() {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? 'Cmd' : 'Ctrl';
  
  return {
    toggleFullscreen: 'F11',
    exportPNG: `${modKey}+E`,
    exportSVG: `${modKey}+Shift+E`,
    toggleSearch: `${modKey}+F`,
    zoomIn: '+',
    zoomOut: '-',
    zoomReset: '0',
    escape: 'Escape',
    modifierKey: modKey,
  };
}