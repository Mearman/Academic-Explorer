import React, { useCallback, useEffect, useRef, useState } from 'react';

// Hook for managing ARIA live regions
export const useLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;

      // Clear the announcement after a delay to allow repeated announcements
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const LiveRegionComponent = useCallback(() => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
  ), []);

  return { announce, LiveRegionComponent };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (items: Array<{ id: string; element?: HTMLElement | null }>, onSelect?: (id: string) => void) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'j':
        event.preventDefault();
        setActiveIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
      case 'k':
        event.preventDefault();
        setActiveIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onSelect && items[activeIndex]) {
          onSelect(items[activeIndex].id);
        }
        break;
    }
  }, [items, activeIndex, onSelect]);

  // Focus active element
  useEffect(() => {
    if (items[activeIndex]?.element) {
      items[activeIndex].element?.focus();
    }
  }, [activeIndex, items]);

  return { activeIndex, handleKeyDown, setActiveIndex };
};

// Hook for focus trap
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    // Focus first element when trap is activated
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

// Hook for managing ARIA attributes
export const useAriaAttributes = () => {
  const getAriaLabel = useCallback((elementType: string, action?: string) => {
    const labels = {
      button: 'Button',
      link: 'Link',
      input: 'Input field',
      select: 'Dropdown',
      checkbox: 'Checkbox',
      radio: 'Radio button',
      modal: 'Dialog',
      menu: 'Menu',
      tab: 'Tab',
      table: 'Table',
    };

    const baseLabel = labels[elementType as keyof typeof labels] || elementType;
    return action ? `${baseLabel} ${action}` : baseLabel;
  }, []);

  const getAriaDescribedBy = useCallback((elementId: string, description?: string) => {
    if (!description) return undefined;

    const descriptionId = `${elementId}-description`;
    return descriptionId;
  }, []);

  return { getAriaLabel, getAriaDescribedBy };
};

// Hook for screen reader announcements
export const useScreenReader = () => {
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // eslint-disable-next-line custom/no-deprecated
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.append(announcement);
    announcement.textContent = message;

    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }, []);

  const announceNavigation = useCallback((direction: 'forward' | 'backward', itemName?: string) => {
    const message = itemName
      ? `Navigated ${direction} to ${itemName}`
      : `Navigated ${direction}`;
    announceToScreenReader(message, 'polite');
  }, [announceToScreenReader]);

  const announceAction = useCallback((action: string, target?: string) => {
    const message = target ? `${action} ${target}` : action;
    announceToScreenReader(message, 'assertive');
  }, [announceToScreenReader]);

  const announceStatus = useCallback((status: string) => {
    announceToScreenReader(status, 'polite');
  }, [announceToScreenReader]);

  return {
    announceToScreenReader,
    announceNavigation,
    announceAction,
    announceStatus,
  };
};

// Hook for high contrast mode detection
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

// Hook for reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// Hook for focus management
export const useFocusManagement = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus();
    }
  }, []);

  const focusElement = useCallback((element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }, []);

  return { saveFocus, restoreFocus, focusElement };
};

