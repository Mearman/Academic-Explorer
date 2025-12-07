/**
 * Keyboard Shortcuts Manager
 *
 * Provides comprehensive keyboard shortcut management with configurable
 * hotkeys, help modal, and accessibility features. Enhances user experience
 * through improved keyboard navigation and productivity shortcuts.
 */

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Kbd,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconHelp, IconKeyboard } from "@tabler/icons-react";

export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Key combination (e.g., 'ctrl+k', 'mod+s') */
  keys: string;
  /** Description of what the shortcut does */
  description: string;
  /** Function to execute when shortcut is triggered */
  handler: () => void | Promise<void>;
  /** Category for grouping in help modal */
  category?: string;
  /** Whether shortcut is currently enabled */
  enabled?: boolean;
  /** Modifier key requirements */
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  /** Key that must be pressed */
  key?: string;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
}

export interface KeyboardShortcutConfig {
  /** Array of keyboard shortcuts */
  shortcuts: KeyboardShortcut[];
  /** Global enable/disable flag */
  enabled?: boolean;
  /** Show help shortcut */
  helpShortcut?: string;
  /** Whether to show help button */
  showHelpButton?: boolean;
  /** Custom help button position */
  helpButtonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface KeyboardShortcutsManagerProps {
  /** Configuration object */
  config: KeyboardShortcutConfig;
  /** Whether to render help button */
  renderHelpButton?: boolean;
}

/**
 * Hook for keyboard shortcuts management
 */
export const useKeyboardShortcuts = (config: KeyboardShortcutConfig) => {
  const [enabled, setEnabled] = useState(config.enabled ?? true);
  const [helpOpen, setHelpOpen] = useState(false);
  const shortcutsRef = useRef(config.shortcuts);

  // Update shortcuts ref when config changes
  useEffect(() => {
    shortcutsRef.current = config.shortcuts;
  }, [config.shortcuts]);

  // Parse key combination
  const parseKeyCombo = useCallback((combo: string): {
    modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean };
    key: string;
  } => {
    const parts = combo.toLowerCase().split('+');
    const modifiers = {
      ctrl: parts.includes('ctrl') || parts.includes('control'),
      alt: parts.includes('alt'),
      shift: parts.includes('shift'),
      meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('mod'),
    };

    const key = parts.find(part =>
      !['ctrl', 'control', 'alt', 'shift', 'meta', 'cmd', 'mod'].includes(part)
    );

    return { modifiers, key: key || '' };
  }, []);

  // Check if key event matches shortcut
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    if (shortcut.enabled === false) {
      return false;
    }

    const combo = shortcut.modifiers ?
      `${shortcut.modifiers.ctrl ? 'ctrl+' : ''}${shortcut.modifiers.alt ? 'alt+' : ''}${shortcut.modifiers.shift ? 'shift+' : ''}${shortcut.modifiers.meta ? 'meta+' : ''}${shortcut.key || ''}` :
      shortcut.keys;

    const { modifiers, key } = parseKeyCombo(combo);

    const eventModifiers = {
      ctrl: event.ctrlKey || event.metaKey, // Treat cmd as ctrl for cross-platform
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
    };

    // Check modifiers match
    const modifiersMatch =
      (modifiers.ctrl === undefined || modifiers.ctrl === eventModifiers.ctrl) &&
      (modifiers.alt === undefined || modifiers.alt === eventModifiers.alt) &&
      (modifiers.shift === undefined || modifiers.shift === eventModifiers.shift) &&
      (modifiers.meta === undefined || modifiers.meta === eventModifiers.meta);

    // Check key matches
    const keyMatches = key ? (
      key.toLowerCase() === event.key.toLowerCase() ||
      key.toLowerCase() === event.code.toLowerCase()
    ) : false;

    return modifiersMatch && keyMatches;
  }, [parseKeyCombo]);

  // Handle keyboard events
  const handleKeyDown = useCallback(async (event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore events in input fields unless explicitly allowed
    if (
      (event.target as HTMLElement)?.tagName === 'INPUT' ||
      (event.target as HTMLElement)?.tagName === 'TEXTAREA' ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    for (const shortcut of shortcutsRef.current) {
      if (matchesShortcut(event, shortcut)) {
        try {
          if (shortcut.preventDefault) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }

          await shortcut.handler();
        } catch (error) {
          console.error(`Keyboard shortcut error (${shortcut.id}):`, error);
        }
        break;
      }
    }
  }, [enabled, matchesShortcut]);

  // Add and remove event listeners
  useEffect(() => {
    if (enabled) {
      const keydownHandler = (event: Event) => {
        // Cast Event to our expected KeyboardEvent type
        const keyboardEvent = event as unknown as KeyboardEvent;
        handleKeyDown(keyboardEvent);
      };

      document.addEventListener('keydown', keydownHandler, true);
      return () => document.removeEventListener('keydown', keydownHandler, true);
    }
  }, [enabled, handleKeyDown]);

  // Toggle enabled state
  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  // Register new shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutsRef.current = [...shortcutsRef.current, shortcut];
  }, []);

  // Unregister shortcut
  const unregisterShortcut = useCallback((id: string) => {
    shortcutsRef.current = shortcutsRef.current.filter(s => s.id !== id);
  }, []);

  // Get shortcuts by category
  const getShortcutsByCategory = useCallback(() => {
    const categories: Record<string, KeyboardShortcut[]> = {};

    shortcutsRef.current.forEach(shortcut => {
      const category = shortcut.category || 'General';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(shortcut);
    });

    return categories;
  }, []);

  return {
    enabled,
    helpOpen,
    setHelpOpen,
    toggleEnabled,
    registerShortcut,
    unregisterShortcut,
    getShortcutsByCategory,
  };
};


/**
 * Help button component
 */
interface KeyboardHelpButtonProps {
  onClick: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  tooltip?: string;
}

export const KeyboardHelpButton = ({
  onClick,
  position = 'top-right',
  tooltip = "Keyboard Shortcuts (Ctrl+?)",
}: KeyboardHelpButtonProps) => {
  const positionStyles = {
    'top-right': { position: 'fixed' as const, top: 20, right: 20 },
    'top-left': { position: 'fixed' as const, top: 20, left: 20 },
    'bottom-right': { position: 'fixed' as const, bottom: 20, right: 20 },
    'bottom-left': { position: 'fixed' as const, bottom: 20, left: 20 },
  };

  return (
    <Tooltip label={tooltip} position="bottom">
      <ActionIcon
        size="lg"
        radius="md"
        variant="light"
        onClick={onClick}
        style={positionStyles[position]}
        aria-label="Show keyboard shortcuts help"
      >
        <IconKeyboard size={20} />
      </ActionIcon>
    </Tooltip>
  );
};

/**
 * Main Keyboard Shortcuts Manager Component
 */
export const KeyboardShortcutsManager = ({
  config,
  renderHelpButton = true,
}: KeyboardShortcutsManagerProps) => {
  const {
    enabled,
    helpOpen,
    setHelpOpen,
    toggleEnabled,
    getShortcutsByCategory,
  } = useKeyboardShortcuts(config);

  // Add help shortcut if not present
  const allShortcuts = [
    ...config.shortcuts,
    {
      id: 'help',
      keys: config.helpShortcut || 'ctrl+?',
      description: 'Show keyboard shortcuts help',
      handler: () => setHelpOpen(true),
      category: 'Help',
      enabled: true,
    } as KeyboardShortcut,
  ];

  if (renderHelpButton && config.showHelpButton !== false) {
    return (
      <>
        <KeyboardHelpButton
          onClick={() => setHelpOpen(true)}
          position={config.helpButtonPosition}
        />
      </>
    );
  }

  return null;
};

/**
 * Predefined keyboard shortcuts for common actions
 */
export const CommonShortcuts = {
  search: {
    id: 'search',
    keys: 'ctrl+k',
    description: 'Focus search input',
    handler: () => {},
    category: 'Navigation',
  },
  save: {
    id: 'save',
    keys: 'ctrl+s',
    description: 'Save current item',
    handler: () => {},
    category: 'File',
  },
  new: {
    id: 'new',
    keys: 'ctrl+n',
    description: 'Create new item',
    handler: () => {},
    category: 'File',
  },
  copy: {
    id: 'copy',
    keys: 'ctrl+c',
    description: 'Copy selected item',
    handler: () => {},
    category: 'Edit',
  },
  paste: {
    id: 'paste',
    keys: 'ctrl+v',
    description: 'Paste from clipboard',
    handler: () => {},
    category: 'Edit',
  },
  undo: {
    id: 'undo',
    keys: 'ctrl+z',
    description: 'Undo last action',
    handler: () => {},
    category: 'Edit',
  },
  redo: {
    id: 'redo',
    keys: 'ctrl+y',
    description: 'Redo last action',
    handler: () => {},
    category: 'Edit',
  },
  help: {
    id: 'help',
    keys: 'ctrl+?',
    description: 'Show keyboard shortcuts help',
    handler: () => {},
    category: 'Help',
  },
} as const;

export default KeyboardShortcutsManager;