import { style, keyframes } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

// Focus-related animations
const focusRing = keyframes({
  '0%': {
    transform: 'scale(1)',
    opacity: 0.8,
  },
  '50%': {
    transform: 'scale(1.05)',
    opacity: 1,
  },
  '100%': {
    transform: 'scale(1)',
    opacity: 0.8,
  },
});

const slideDown = keyframes({
  '0%': {
    transform: 'translateY(-10px)',
    opacity: 0,
  },
  '100%': {
    transform: 'translateY(0)',
    opacity: 1,
  },
});

const pulseGlow = keyframes({
  '0%, 100%': {
    boxShadow: `0 0 0 2px ${entityVars.color.work}40`,
  },
  '50%': {
    boxShadow: `0 0 0 4px ${entityVars.color.work}60`,
  },
});

// Base focus container
export const focusContainer = style({
  position: 'relative',
  isolation: 'isolate',
  
  // Focus management
  ':focus-within': {
    outline: 'none',
  },
  
  // Ensure focusable elements are accessible
  selectors: {
    '& *:focus': {
      outline: `2px solid ${entityVars.color.work}`,
      outlineOffset: '2px',
      borderRadius: entityVars.borderRadius.sm,
    },
    
    '& *:focus:not(:focus-visible)': {
      outline: 'none',
    },
    
    '& *:focus-visible': {
      outline: `2px solid ${entityVars.color.work}`,
      outlineOffset: '2px',
      borderRadius: entityVars.borderRadius.sm,
    },
  },
});

// Navigation mode-specific styles
export const defaultStyle = style({
  // Default navigation behavior
});

export const grid = style({
  display: 'grid',
  gap: entityVars.spacing.sm,
  
  selectors: {
    '& > *': {
      position: 'relative',
    },
    
    '& > *:focus': {
      zIndex: 1,
    },
  },
});

export const list = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  
  selectors: {
    '& > *': {
      position: 'relative',
    },
    
    '& > *:focus': {
      zIndex: 1,
      backgroundColor: entityVars.color.cardBackground,
    },
  },
});

export const tabs = style({
  display: 'flex',
  flexDirection: 'row',
  gap: 0,
  
  selectors: {
    '& > *': {
      position: 'relative',
      borderRadius: 0,
    },
    
    '& > *:first-child': {
      borderTopLeftRadius: entityVars.borderRadius.md,
      borderBottomLeftRadius: entityVars.borderRadius.md,
    },
    
    '& > *:last-child': {
      borderTopRightRadius: entityVars.borderRadius.md,
      borderBottomRightRadius: entityVars.borderRadius.md,
    },
    
    '& > *:focus': {
      zIndex: 1,
      outline: `2px solid ${entityVars.color.work}`,
    },
  },
});

export const menu = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  padding: entityVars.spacing.xs,
  
  selectors: {
    '& > *': {
      position: 'relative',
      padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
      borderRadius: entityVars.borderRadius.sm,
      cursor: 'pointer',
      transition: `background-color ${entityVars.transition.fast}`,
    },
    
    '& > *:hover': {
      backgroundColor: entityVars.color.background,
    },
    
    '& > *:focus': {
      backgroundColor: entityVars.color.work,
      color: entityVars.color.background,
      outline: 'none',
    },
  },
});

// Focus indicator (custom focus ring)
export const focusIndicator = style({
  position: 'absolute',
  pointerEvents: 'none',
  border: `2px solid ${entityVars.color.work}`,
  borderRadius: entityVars.borderRadius.md,
  backgroundColor: 'transparent',
  zIndex: 9999,
  animation: `${focusRing} 2s infinite`,
  transition: `all ${entityVars.transition.fast} ease-out`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

// Skip links
export const skipLinks = style({
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 10000,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
});

export const skipLink = style({
  position: 'absolute',
  left: '-10000px',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  backgroundColor: entityVars.color.work,
  color: entityVars.color.background,
  textDecoration: 'none',
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.medium,
  borderRadius: entityVars.borderRadius.sm,
  border: `2px solid ${entityVars.color.work}`,
  
  ':focus': {
    position: 'static',
    left: 'auto',
    width: 'auto',
    height: 'auto',
    overflow: 'visible',
    clip: 'auto',
    whiteSpace: 'normal',
    animation: `${slideDown} ${entityVars.transition.normal} ease-out`,
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      ':focus': {
        animation: 'none',
      },
    },
  },
});

// Screen reader only content
export const srOnly = style({
  position: 'absolute',
  left: '-10000px',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
  margin: 0,
  padding: 0,
});

// Reduced motion support
export const respectReducedMotion = style({
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        '& *': {
          animation: 'none !important',
          transition: 'none !important',
        },
      },
    },
  },
});

// Enhanced focus styles for different elements
export const enhancedButton = style({
  position: 'relative',
  
  ':focus': {
    outline: 'none',
    boxShadow: `0 0 0 2px ${entityVars.color.background}, 0 0 0 4px ${entityVars.color.work}`,
    transform: 'translateY(-1px)',
  },
  
  ':focus-visible': {
    animation: `${pulseGlow} 2s infinite`,
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      ':focus': {
        transform: 'none',
      },
      
      ':focus-visible': {
        animation: 'none',
      },
    },
  },
});

export const enhancedInput = style({
  ':focus': {
    outline: 'none',
    borderColor: entityVars.color.work,
    boxShadow: `0 0 0 2px ${entityVars.color.work}40`,
  },
  
  ':focus-visible': {
    boxShadow: `0 0 0 2px ${entityVars.color.work}`,
  },
});

export const enhancedLink = style({
  ':focus': {
    outline: `2px solid ${entityVars.color.work}`,
    outlineOffset: '2px',
    borderRadius: entityVars.borderRadius.sm,
    textDecoration: 'none',
  },
  
  ':focus-visible': {
    backgroundColor: entityVars.color.work,
    color: entityVars.color.background,
    textDecoration: 'none',
  },
});

// Keyboard navigation hints
export const keyboardHint = style({
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginBottom: entityVars.spacing.xs,
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  backgroundColor: entityVars.color.text,
  color: entityVars.color.background,
  fontSize: entityVars.fontSize.xs,
  borderRadius: entityVars.borderRadius.sm,
  whiteSpace: 'nowrap',
  opacity: 0,
  pointerEvents: 'none',
  transition: `opacity ${entityVars.transition.fast}`,
  zIndex: 1000,
  
  '::after': {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderTop: `4px solid ${entityVars.color.text}`,
  },
  
  selectors: {
    '*:focus + &': {
      opacity: 1,
    },
  },
});

// Focus trap boundary
export const focusTrap = style({
  position: 'relative',
  
  '::before': {
    content: '""',
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    border: `2px dashed ${entityVars.color.work}40`,
    borderRadius: entityVars.borderRadius.lg,
    pointerEvents: 'none',
    opacity: 0,
    transition: `opacity ${entityVars.transition.fast}`,
  },
  
  selectors: {
    '&:focus-within::before': {
      opacity: 1,
    },
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      '::before': {
        transition: 'none',
      },
    },
  },
});

// High contrast mode support
export const highContrast = style({
  '@media': {
    '(prefers-contrast: high)': {
      selectors: {
        '& *:focus': {
          outline: `3px solid ${entityVars.color.text}`,
          outlineOffset: '3px',
          backgroundColor: entityVars.color.background,
          color: entityVars.color.text,
        },
      },
    },
    
    '(forced-colors: active)': {
      selectors: {
        '& *:focus': {
          outline: '2px solid ButtonText',
          backgroundColor: 'ButtonFace',
          color: 'ButtonText',
        },
      },
    },
  },
});

// Touch device optimizations
export const touchOptimized = style({
  '@media': {
    '(hover: none) and (pointer: coarse)': {
      selectors: {
        '& button, & [role="button"], & a': {
          minHeight: '44px',
          minWidth: '44px',
        },
        
        '& *:focus': {
          outline: `3px solid ${entityVars.color.work}`,
          outlineOffset: '3px',
        },
      },
    },
  },
});

// Focus group styling
export const focusGroup = style({
  position: 'relative',
  
  selectors: {
    '&[data-focus-group="true"] > *:focus': {
      position: 'relative',
      zIndex: 1,
    },
    
    '&[data-focus-group="true"]:focus-within': {
      backgroundColor: entityVars.color.cardBackground,
      borderRadius: entityVars.borderRadius.md,
      outline: `1px solid ${entityVars.color.border}`,
    },
  },
});

// Roving tabindex support
export const rovingTabindex = style({
  selectors: {
    '& [tabindex="0"]': {
      outline: `2px solid ${entityVars.color.work}`,
      outlineOffset: '2px',
    },
    
    '& [tabindex="-1"]': {
      outline: 'none',
    },
    
    '& [tabindex="-1"]:focus': {
      outline: `2px solid ${entityVars.color.work}`,
      outlineOffset: '2px',
    },
  },
});

// Keyboard shortcut indicators
export const shortcutIndicator = style({
  position: 'relative',
  
  '::after': {
    content: 'attr(data-keyboard-shortcut)',
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: entityVars.spacing.xs,
    padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
    backgroundColor: entityVars.color.muted,
    color: entityVars.color.background,
    fontSize: entityVars.fontSize.xs,
    borderRadius: entityVars.borderRadius.sm,
    opacity: 0,
    pointerEvents: 'none',
    transition: `opacity ${entityVars.transition.fast}`,
    whiteSpace: 'nowrap',
    zIndex: 100,
  },
  
  selectors: {
    '&:hover::after': {
      opacity: 1,
    },
    
    '&:focus::after': {
      opacity: 1,
    },
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      '::after': {
        transition: 'none',
      },
    },
  },
});