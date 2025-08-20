import { Box } from '@mantine/core';
import { useEffect, useRef, useState, useCallback } from 'react';

import * as styles from './focus-management.css';

export interface FocusManagementProps {
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
  
  // Focus management options
  trapFocus?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
  skipLinks?: boolean;
  
  // Keyboard navigation
  enableArrowNavigation?: boolean;
  enableEscapeKey?: boolean;
  enableTabCycling?: boolean;
  
  // Accessibility enhancements
  announceChanges?: boolean;
  provideFocusIndicators?: boolean;
  respectReducedMotion?: boolean;
  
  // Custom navigation patterns
  navigationMode?: 'default' | 'grid' | 'list' | 'tabs' | 'menu';
  gridColumns?: number;
  
  // Callbacks
  onFocusEnter?: (element: HTMLElement) => void;
  onFocusLeave?: (element: HTMLElement) => void;
  onKeyboardNavigation?: (direction: string, event: KeyboardEvent) => void;
  onEscape?: () => void;
}

interface FocusableElement extends HTMLElement {
  tabIndex: number;
}

/**
 * Get all focusable elements within a container
 */
function useFocusableElements(containerRef: React.RefObject<HTMLDivElement | null>) {
  return useCallback((): FocusableElement[] => {
    if (!containerRef.current) return [];

    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'audio[controls]',
      'video[controls]',
      'details summary',
      '[role="button"]:not([disabled])',
      '[role="link"]:not([disabled])',
      '[role="menuitem"]:not([disabled])',
      '[role="option"]:not([disabled])',
      '[role="tab"]:not([disabled])',
    ].join(',');

    const elements = Array.from(
      containerRef.current.querySelectorAll(selectors)
    ) as FocusableElement[];

    return elements.filter(element => {
      // Check if element is visible and not hidden
      const style = window.getComputedStyle(element);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0 &&
        !element.hasAttribute('inert')
      );
    });
  }, [containerRef]);
}

/**
 * Focus navigation functions
 */
function useFocusNavigation(
  getFocusableElements: () => FocusableElement[],
  currentFocusIndex: number,
  setCurrentFocusIndex: (index: number) => void,
  onFocusEnter?: (element: HTMLElement) => void
) {
  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      setCurrentFocusIndex(0);
      onFocusEnter?.(focusableElements[0]);
    }
  }, [getFocusableElements, setCurrentFocusIndex, onFocusEnter]);

  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      const lastIndex = focusableElements.length - 1;
      focusableElements[lastIndex].focus();
      setCurrentFocusIndex(lastIndex);
      onFocusEnter?.(focusableElements[lastIndex]);
    }
  }, [getFocusableElements, setCurrentFocusIndex, onFocusEnter]);

  const focusNext = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const nextIndex = (currentFocusIndex + 1) % focusableElements.length;
    focusableElements[nextIndex].focus();
    setCurrentFocusIndex(nextIndex);
    onFocusEnter?.(focusableElements[nextIndex]);
  }, [currentFocusIndex, getFocusableElements, setCurrentFocusIndex, onFocusEnter]);

  const focusPrevious = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const prevIndex = currentFocusIndex === 0 
      ? focusableElements.length - 1 
      : currentFocusIndex - 1;
    focusableElements[prevIndex].focus();
    setCurrentFocusIndex(prevIndex);
    onFocusEnter?.(focusableElements[prevIndex]);
  }, [currentFocusIndex, getFocusableElements, setCurrentFocusIndex, onFocusEnter]);

  return { focusFirst, focusLast, focusNext, focusPrevious };
}

/**
 * Focus trap functionality for Tab key handling
 */
function useFocusTrap(
  trapFocus: boolean,
  getFocusableElements: () => FocusableElement[],
  setCurrentFocusIndex: (index: number) => void
) {
  return useCallback((event: KeyboardEvent) => {
    if (!trapFocus) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        setCurrentFocusIndex(focusableElements.length - 1);
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        setCurrentFocusIndex(0);
      }
    }
  }, [trapFocus, getFocusableElements, setCurrentFocusIndex]);
}

/**
 * Focus restoration effect
 */
function useFocusRestoration(
  restoreFocus: boolean,
  autoFocus: boolean,
  containerRef: React.RefObject<HTMLDivElement | null>,
  focusFirst: () => void
) {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Store previously focused element for restoration
    if (restoreFocus) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
    }

    // Auto-focus first element if requested
    if (autoFocus) {
      focusFirst();
    }

    // Cleanup function to restore focus
    return () => {
      if (restoreFocus && previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [restoreFocus, autoFocus, containerRef, focusFirst]);
}

/**
 * Hook to manage focus within a container
 */
function useFocusManagement({
  trapFocus = false,
  restoreFocus = false,
  autoFocus = false,
  onFocusEnter,
  _onFocusLeave,
}: {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
  onFocusEnter?: (element: HTMLElement) => void;
  _onFocusLeave?: (element: HTMLElement) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);

  const getFocusableElements = useFocusableElements(containerRef);
  const navigation = useFocusNavigation(
    getFocusableElements,
    currentFocusIndex,
    setCurrentFocusIndex,
    onFocusEnter
  );
  const handleTabKey = useFocusTrap(trapFocus, getFocusableElements, setCurrentFocusIndex);

  useFocusRestoration(restoreFocus, autoFocus, containerRef, navigation.focusFirst);

  return {
    containerRef,
    ...navigation,
    handleTabKey,
    currentFocusIndex,
    getFocusableElements,
  };
}

/**
 * Hook for keyboard navigation patterns
 */
function useKeyboardNavigation({
  navigationMode = 'default',
  gridColumns = 1,
  enableArrowNavigation = true,
  enableEscapeKey = true,
  onKeyboardNavigation,
  onEscape,
  focusNext,
  focusPrevious,
  getFocusableElements,
}: {
  navigationMode?: string;
  gridColumns?: number;
  enableArrowNavigation?: boolean;
  enableEscapeKey?: boolean;
  onKeyboardNavigation?: (direction: string, event: KeyboardEvent) => void;
  onEscape?: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
  getFocusableElements: () => FocusableElement[];
}) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey, altKey } = event;

    // Handle Escape key
    if (enableEscapeKey && key === 'Escape') {
      event.preventDefault();
      onEscape?.();
      return;
    }

    // Skip arrow navigation if modifier keys are pressed
    if (ctrlKey || metaKey || altKey) return;

    if (!enableArrowNavigation) return;

    let handled = false;

    switch (navigationMode) {
      case 'grid':
        handled = handleGridNavigation(event, gridColumns, getFocusableElements);
        break;
      
      case 'list':
        handled = handleListNavigation(event, focusNext, focusPrevious);
        break;
      
      case 'tabs':
        handled = handleTabsNavigation(event, focusNext, focusPrevious);
        break;
      
      case 'menu':
        handled = handleMenuNavigation(event, focusNext, focusPrevious);
        break;
      
      default:
        handled = handleDefaultNavigation(event, focusNext, focusPrevious);
        break;
    }

    if (handled) {
      event.preventDefault();
      onKeyboardNavigation?.(key, event);
    }
  }, [
    navigationMode,
    gridColumns,
    enableArrowNavigation,
    enableEscapeKey,
    onKeyboardNavigation,
    onEscape,
    focusNext,
    focusPrevious,
    getFocusableElements,
  ]);

  return { handleKeyDown };
}

// Navigation pattern handlers
function handleGridNavigation(
  event: KeyboardEvent, 
  columns: number, 
  getFocusableElements: () => FocusableElement[]
): boolean {
  const { key } = event;
  const elements = getFocusableElements();
  const currentIndex = elements.findIndex(el => el === document.activeElement);
  
  if (currentIndex === -1) return false;

  let newIndex = currentIndex;

  switch (key) {
    case 'ArrowRight':
      newIndex = Math.min(currentIndex + 1, elements.length - 1);
      break;
    case 'ArrowLeft':
      newIndex = Math.max(currentIndex - 1, 0);
      break;
    case 'ArrowDown':
      newIndex = Math.min(currentIndex + columns, elements.length - 1);
      break;
    case 'ArrowUp':
      newIndex = Math.max(currentIndex - columns, 0);
      break;
    case 'Home':
      newIndex = 0;
      break;
    case 'End':
      newIndex = elements.length - 1;
      break;
    default:
      return false;
  }

  if (newIndex !== currentIndex) {
    elements[newIndex].focus();
    return true;
  }

  return false;
}

function handleListNavigation(
  event: KeyboardEvent,
  focusNext: () => void,
  focusPrevious: () => void
): boolean {
  const { key } = event;

  switch (key) {
    case 'ArrowDown':
      focusNext();
      return true;
    case 'ArrowUp':
      focusPrevious();
      return true;
    default:
      return false;
  }
}

function handleTabsNavigation(
  event: KeyboardEvent,
  focusNext: () => void,
  focusPrevious: () => void
): boolean {
  const { key } = event;

  switch (key) {
    case 'ArrowRight':
      focusNext();
      return true;
    case 'ArrowLeft':
      focusPrevious();
      return true;
    default:
      return false;
  }
}

function handleMenuNavigation(
  event: KeyboardEvent,
  focusNext: () => void,
  focusPrevious: () => void
): boolean {
  const { key } = event;

  switch (key) {
    case 'ArrowDown':
      focusNext();
      return true;
    case 'ArrowUp':
      focusPrevious();
      return true;
    default:
      return false;
  }
}

function handleDefaultNavigation(
  event: KeyboardEvent,
  focusNext: () => void,
  focusPrevious: () => void
): boolean {
  const { key } = event;

  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      focusNext();
      return true;
    case 'ArrowUp':
    case 'ArrowLeft':
      focusPrevious();
      return true;
    default:
      return false;
  }
}

/**
 * Focus indicator component
 */
const FocusIndicator = ({ target }: { target: HTMLElement | null }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!target) {
      setIsVisible(false);
      return;
    }

    const updatePosition = () => {
      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
      setIsVisible(true);
    };

    updatePosition();

    // Update position on scroll or resize
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [target]);

  if (!isVisible) return null;

  return (
    <div
      className={styles.focusIndicator}
      style={{
        top: position.top - 4,
        left: position.left - 4,
        width: position.width + 8,
        height: position.height + 8,
      }}
      aria-hidden="true"
    />
  );
};

/**
 * Skip links component for accessibility
 */
const SkipLinks = ({ links }: { 
  links: Array<{ href: string; label: string }> 
}) => (
  <div className={styles.skipLinks}>
    {links.map((link, index) => (
      <a key={index} href={link.href} className={styles.skipLink}>
        {link.label}
      </a>
    ))}
  </div>
);

/**
 * Main focus management component
 */
export const FocusManagement = ({
  children,
  className,
  'data-testid': testId,
  trapFocus = false,
  restoreFocus = false,
  autoFocus = false,
  skipLinks = false,
  enableArrowNavigation = true,
  enableEscapeKey = true,
  enableTabCycling = true,
  announceChanges = true,
  provideFocusIndicators = true,
  respectReducedMotion = true,
  navigationMode = 'default',
  gridColumns = 1,
  onFocusEnter,
  onFocusLeave,
  onKeyboardNavigation,
  onEscape,
}: FocusManagementProps) => {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const [announceText, setAnnounceText] = useState('');

  const focusManagement = useFocusManagement({
    trapFocus,
    restoreFocus,
    autoFocus,
    onFocusEnter: (element) => {
      setFocusedElement(element);
      onFocusEnter?.(element);
      
      if (announceChanges) {
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('aria-labelledby') ||
                     element.textContent ||
                     element.tagName.toLowerCase();
        setAnnounceText(`Focused: ${label}`);
      }
    },
    _onFocusLeave: (element) => {
      setFocusedElement(null);
      onFocusLeave?.(element);
    },
  });

  const keyboardNavigation = useKeyboardNavigation({
    navigationMode,
    gridColumns,
    enableArrowNavigation,
    enableEscapeKey,
    onKeyboardNavigation,
    onEscape,
    focusNext: focusManagement.focusNext,
    focusPrevious: focusManagement.focusPrevious,
    getFocusableElements: focusManagement.getFocusableElements,
  });

  // Handle focus events
  useEffect(() => {
    const container = focusManagement.containerRef.current;
    if (!container) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (container.contains(target)) {
        setFocusedElement(target);
        onFocusEnter?.(target);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (container.contains(target)) {
        onFocusLeave?.(target);
      }
    };

    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);

    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, [onFocusEnter, onFocusLeave, focusManagement.containerRef]);

  // Handle keyboard events
  useEffect(() => {
    const container = focusManagement.containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Tab key for focus trapping
      if (event.key === 'Tab' && enableTabCycling) {
        focusManagement.handleTabKey(event);
      }
      
      // Handle other keyboard navigation
      keyboardNavigation.handleKeyDown(event);
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enableTabCycling,
    focusManagement.handleTabKey,
    keyboardNavigation.handleKeyDown,
    focusManagement, // Added missing dependency
    keyboardNavigation, // Added missing dependency
  ]);

  const containerClasses = [
    styles.focusContainer,
    styles[navigationMode === 'default' ? 'defaultStyle' : navigationMode],
    respectReducedMotion ? styles.respectReducedMotion : '',
    className,
  ].filter(Boolean).join(' ');

  const defaultSkipLinks = skipLinks ? [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
  ] : [];

  return (
    <>
      {skipLinks && <SkipLinks links={defaultSkipLinks} />}
      
      <Box
        ref={focusManagement.containerRef}
        className={containerClasses}
        data-testid={testId}
        data-navigation-mode={navigationMode}
        role="region"
        aria-label="Interactive content area"
      >
        {children}
        
        {/* Focus indicator */}
        {provideFocusIndicators && (
          <FocusIndicator target={focusedElement} />
        )}
        
        {/* Announcements for screen readers */}
        {announceChanges && announceText && (
          <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
            {announceText}
          </div>
        )}
      </Box>
    </>
  );
};

