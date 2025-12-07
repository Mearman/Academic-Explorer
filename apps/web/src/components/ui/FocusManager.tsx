/**
 * Focus Manager Component - Advanced focus management and keyboard navigation
 *
 * Provides focus trapping, skip links, focus indicators, and enhanced
 * keyboard navigation support for accessibility compliance.
 */

import {
  Box,
  createStyles,
  keyframes,
  Text,
  useMantineTheme
} from "@mantine/core";
import { useEffect, useRef, useState, useCallback } from "react";

// Focus ring animation
const focusRingAnimation = keyframes({
  '0%': {
    boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.5)',
    transform: 'scale(0.95)'
  },
  '50%': {
    boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.2)',
    transform: 'scale(1.02)'
  },
  '100%': {
    boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3)',
    transform: 'scale(1)'
  }
});

const useStyles = createStyles((theme, params: { animated?: boolean }) => ({
  focusable: {
    '&:focus-visible': {
      outline: 'none',
      ...(params.animated && {
        animation: `${focusRingAnimation} 0.3s ease-out`,
      }),
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: '-2px',
        borderRadius: theme.radius.sm,
        border: `2px solid ${theme.colors.blue[6]}`,
        pointerEvents: 'none',
        zIndex: 1
      }
    },
    '&:not(:focus-visible)': {
      '&::after': {
        content: 'none'
      }
    }
  },
  focusTrap: {
    '&:focus-within': {
      outline: `2px solid ${theme.colors.blue[6]}`,
      outlineOffset: '2px',
      borderRadius: theme.radius.sm
    }
  },
  skipLink: {
    position: 'absolute',
    top: '-40px',
    left: '6px',
    background: theme.colors.blue[6],
    color: 'white',
    padding: '8px 16px',
    textDecoration: 'none',
    borderRadius: theme.radius.sm,
    zIndex: 10000,
    fontWeight: 500,
    '&:focus': {
      top: '6px',
      transform: 'translateY(0)',
      transition: 'top 0.2s ease-out'
    },
    '&:hover': {
      background: theme.colors.blue[7],
      transform: 'translateY(0)',
      top: '6px'
    }
  }
}));

// Focus trap props
interface FocusTrapProps {
  children: React.ReactNode;
  enabled?: boolean;
  onEscape?: () => void;
}

/**
 * Focus Trap Component
 *
 * Traps focus within a container for modals, dialogs, and other focused UI patterns
 */
export const FocusTrap = ({ children, enabled = true, onEscape }: FocusTrapProps) => {
  const { cx, classes } = useStyles({ animated: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([type="hidden"]):not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ');

      return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle keyboard navigation within the trap
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

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
      } else if (e.key === 'Escape' && onEscape) {
        onEscape();
      }
    };

    container.addEventListener('keydown', handleKeydown);

    return () => {
      container.removeEventListener('keydown', handleKeydown);
      // Restore previous focus
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [enabled, onEscape]);

  return (
    <div ref={containerRef} className={cx(classes.focusTrap, 'focus-trap')}>
      {children}
    </div>
  );
};

// Skip link props
interface SkipLinkProps {
  target: string;
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'top-center';
}

/**
 * Skip Link Component
 *
 * Provides skip navigation links for keyboard users
 */
export const SkipLink = ({ target, children, position = 'top-left' }: SkipLinkProps) => {
  const { cx, classes } = useStyles();

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return { left: 'auto', right: '6px' };
      case 'top-center':
        return { left: '50%', transform: 'translateX(-50%)' };
      default:
        return { left: '6px' };
    }
  };

  return (
    <Box
      component="a"
      href={target}
      className={classes.skipLink}
      style={getPositionStyles()}
    >
      {children}
    </Box>
  );
};

// Focus indicator props
interface FocusIndicatorProps {
  children: React.ReactNode;
  animated?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Focus Indicator Component
 *
 * Enhances focus visibility for better keyboard navigation
 */
export const FocusIndicator = ({ children, animated = true, color, size = 'md' }: FocusIndicatorProps) => {
  const { cx, classes } = useStyles({ animated });
  const theme = useMantineTheme();

  const getSizeStyles = () => {
    const sizes = {
      sm: '1px',
      md: '2px',
      lg: '3px'
    };
    return sizes[size];
  };

  const getColorStyles = () => {
    return color || theme.colors.blue[6];
  };

  return (
    <Box
      className={cx(classes.focusable, 'focus-indicator')}
      sx={{
        position: 'relative',
        '&:focus-visible::after': {
          borderColor: getColorStyles(),
          borderWidth: getSizeStyles()
        }
      }}
    >
      {children}
    </Box>
  );
};

// Keyboard navigation hint props
interface KeyboardNavigationHintProps {
  shortcuts: Array<{
    key: string;
    description: string;
    action?: () => void;
  }>;
  show?: boolean;
}

/**
 * Keyboard Navigation Hint Component
 *
 * Displays available keyboard shortcuts and navigation hints
 */
export const KeyboardNavigationHint = ({ shortcuts, show = false }: KeyboardNavigationHintProps) => {
  const { cx, classes } = useStyles();

  if (!show) return null;

  return (
    <Box
      p="sm"
      mb="md"
      sx={(theme) => ({
        background: theme.colors.gray[0],
        border: `1px solid ${theme.colors.gray[2]}`,
        borderRadius: theme.radius.sm,
        fontSize: theme.fontSizes.sm
      })}
    >
      <Box mb="xs" fw={500}>Keyboard Navigation:</Box>
      <Box>
        {shortcuts.map((shortcut, index) => (
          <Box
            key={index}
            mb={index < shortcuts.length - 1 ? 'xs' : 0}
            sx={{ display: 'flex', alignItems: 'center', gap: 'sm' }}
          >
            <Box
              component="kbd"
              px="xs"
              py={2}
              sx={(theme) => ({
                background: theme.colors.gray[1],
                border: `1px solid ${theme.colors.gray[3]}`,
                borderRadius: theme.radius.xs,
                fontSize: theme.fontSizes.xs,
                fontFamily: 'monospace',
                minWidth: '20px',
                textAlign: 'center'
              })}
            >
              {shortcut.key}
            </Box>
            <Text size="sm">{shortcut.description}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// Focus management hook
export const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);

  const focusElement = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.focus();
      setFocusedElement(element);
    }
  }, []);

  const focusNext = useCallback(() => {
    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
    focusElement(focusableElements[nextIndex]);
  }, [focusElement]);

  const focusPrevious = useCallback(() => {
    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
    focusElement(focusableElements[previousIndex]);
  }, [focusElement]);

  const focusFirst = useCallback(() => {
    const firstFocusable = document.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusElement(firstFocusable);
  }, [focusElement]);

  const focusLast = useCallback(() => {
    const focusableElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    focusElement(focusableElements[focusableElements.length - 1]);
  }, [focusElement]);

  // Track focused element
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      setFocusedElement(e.target as HTMLElement);
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  return {
    focusedElement,
    focusElement,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast
  };
};

// Live region for screen reader announcements
interface LiveRegionProps {
  politeness?: 'polite' | 'assertive' | 'off';
  children?: React.ReactNode;
}

export const LiveRegion = ({ politeness = 'polite', children }: LiveRegionProps) => (
  <Box
    aria-live={politeness}
    aria-atomic="true"
    sx={{
      position: 'absolute',
      left: '-10000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden'
    }}
  >
    {children}
  </Box>
);

// Custom hook for announcing to screen readers
export const useScreenReaderAnnouncer = () => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    announcement.textContent = message;
    document.body.appendChild(announcement);

    // Remove after announcement to prevent screen reader build-up
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, []);

  return { announce };
};

// Focus boundary component for creating keyboard navigation zones
interface FocusBoundaryProps {
  children: React.ReactNode;
  onEnter?: () => void;
  onExit?: () => void;
  boundaryClass?: string;
}

export const FocusBoundary = ({ children, onEnter, onExit, boundaryClass = 'focus-boundary' }: FocusBoundaryProps) => {
  const [isActive, setIsActive] = useState(false);
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const boundary = boundaryRef.current;

      if (boundary && boundary.contains(target)) {
        if (!isActive) {
          setIsActive(true);
          onEnter?.();
        }
      } else if (isActive && !boundary?.contains(target)) {
        setIsActive(false);
        onExit?.();
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [isActive, onEnter, onExit]);

  return (
    <div
      ref={boundaryRef}
      className={`${boundaryClass} ${isActive ? 'active' : ''}`}
      data-focus-boundary-active={isActive}
    >
      {children}
    </div>
  );
};