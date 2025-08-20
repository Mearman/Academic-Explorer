import { useState, useCallback } from 'react';

/**
 * Hook for focus management outside of component
 */
export const useFocusManager = () => {
  const [trapFocus, setTrapFocus] = useState(false);
  const [currentFocus, setCurrentFocus] = useState<HTMLElement | null>(null);

  const moveFocusTo = useCallback((element: HTMLElement | string) => {
    const target = typeof element === 'string' 
      ? document.querySelector(element) as HTMLElement
      : element;
    
    if (target) {
      target.focus();
      setCurrentFocus(target);
    }
  }, []);

  const moveFocusToNext = useCallback(() => {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    
    if (focusableElements[nextIndex]) {
      moveFocusTo(focusableElements[nextIndex]);
    }
  }, [moveFocusTo]);

  const moveFocusToPrevious = useCallback(() => {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    const prevIndex = currentIndex === 0 
      ? focusableElements.length - 1 
      : currentIndex - 1;
    
    if (focusableElements[prevIndex]) {
      moveFocusTo(focusableElements[prevIndex]);
    }
  }, [moveFocusTo]);

  return {
    trapFocus,
    setTrapFocus,
    currentFocus,
    moveFocusTo,
    moveFocusToNext,
    moveFocusToPrevious,
  };
};