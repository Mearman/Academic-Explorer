import { style, keyframes } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

// Accessibility-focused animations
const gentlePulse = keyframes({
  '0%, 100%': { 
    opacity: 1,
  },
  '50%': { 
    opacity: 0.7,
  },
});

const slideIn = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateY(8px)',
  },
  '100%': {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

const focusRing = keyframes({
  '0%': {
    boxShadow: `0 0 0 0 ${entityVars.color.work}40`,
  },
  '70%': {
    boxShadow: `0 0 0 4px ${entityVars.color.work}20`,
  },
  '100%': {
    boxShadow: `0 0 0 0 ${entityVars.color.work}00`,
  },
});

// Main container
export const container = style({
  position: 'relative',
  width: '100%',
  minHeight: 'fit-content',
  isolation: 'isolate',
});

// Loading region with ARIA live support
export const loadingRegion = style({
  position: 'relative',
  width: '100%',
  padding: entityVars.spacing.md,
  borderRadius: entityVars.borderRadius.md,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  animation: `${slideIn} ${entityVars.transition.normal} ease-out`,
  
  // Ensure sufficient contrast for accessibility
  '@media': {
    '(prefers-contrast: high)': {
      borderWidth: '2px',
      borderColor: entityVars.color.text,
      backgroundColor: entityVars.color.background,
    },
    
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

// Screen reader announcements
export const announcement = style({
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

// Error state container
export const errorContainer = style({
  position: 'relative',
  width: '100%',
  padding: entityVars.spacing.lg,
  borderRadius: entityVars.borderRadius.md,
  backgroundColor: entityVars.color.errorBackground,
  border: `2px solid ${entityVars.color.error}`,
  color: entityVars.color.text,
  animation: `${slideIn} ${entityVars.transition.normal} ease-out`,
  
  // Focus management for error state
  '::before': {
    content: '""',
    position: 'absolute',
    top: entityVars.spacing.sm,
    left: entityVars.spacing.sm,
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: entityVars.color.error,
    opacity: 0.8,
  },
  
  '@media': {
    '(prefers-contrast: high)': {
      borderWidth: '3px',
      backgroundColor: entityVars.color.background,
      outline: `2px solid ${entityVars.color.error}`,
      outlineOffset: '2px',
    },
    
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

// Error message styling
export const errorMessage = style({
  fontSize: entityVars.fontSize.base,
  lineHeight: entityVars.lineHeight.normal,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.text,
  marginBottom: entityVars.spacing.md,
  paddingLeft: entityVars.spacing.xl, // Space for error icon
  
  '@media': {
    '(prefers-contrast: high)': {
      fontWeight: entityVars.fontWeight.bold,
    },
  },
});

// Accessible retry button
export const retryButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.lg}`,
  backgroundColor: entityVars.color.work,
  color: entityVars.color.background,
  border: 'none',
  borderRadius: entityVars.borderRadius.md,
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.medium,
  cursor: 'pointer',
  transition: `all ${entityVars.transition.fast}`,
  minHeight: '44px', // Touch target size
  minWidth: '44px',
  
  // Focus styling for accessibility
  ':focus': {
    outline: 'none',
    boxShadow: `0 0 0 3px ${entityVars.color.work}40`,
    transform: 'translateY(-1px)',
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.background}`,
    outlineOffset: '2px',
    animation: `${focusRing} 2s infinite`,
  },
  
  ':hover': {
    backgroundColor: entityVars.color.workDark,
    transform: 'translateY(-1px)',
    boxShadow: entityVars.shadow.md,
  },
  
  ':active': {
    transform: 'translateY(0)',
    boxShadow: entityVars.shadow.sm,
  },
  
  ':disabled': {
    backgroundColor: entityVars.color.muted,
    cursor: 'not-allowed',
    transform: 'none',
    opacity: 0.6,
  },
  
  // High contrast mode
  '@media': {
    '(prefers-contrast: high)': {
      borderWidth: '2px',
      borderColor: entityVars.color.text,
      fontWeight: entityVars.fontWeight.bold,
    },
    
    '(hover: none) and (pointer: coarse)': {
      minHeight: '48px', // Larger touch target for mobile
      fontSize: entityVars.fontSize.lg,
    },
    
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
      animation: 'none',
      
      ':hover': {
        transform: 'none',
      },
      
      ':active': {
        transform: 'none',
      },
    },
  },
});

// Text skeleton layout
export const textSkeleton = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
  width: '100%',
});

// List skeleton layout
export const listSkeleton = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
  width: '100%',
});

export const listItem = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.sm,
  borderRadius: entityVars.borderRadius.sm,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  
  '@media': {
    '(prefers-contrast: high)': {
      borderWidth: '2px',
    },
  },
});

export const listItemContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  flex: 1,
  minWidth: 0, // Allow text truncation
});

// Responsive design for loading states
export const responsiveContainer = style({
  '@media': {
    '(max-width: 768px)': {
      padding: entityVars.spacing.sm,
      
      [errorMessage]: {
        fontSize: entityVars.fontSize.sm,
        paddingLeft: entityVars.spacing.lg,
      },
      
      [retryButton]: {
        width: '100%',
        justifyContent: 'center',
        minHeight: '48px',
      },
    },
    
    '(min-width: 769px)': {
      padding: entityVars.spacing.lg,
    },
  },
});

// Animation states for skeleton elements
export const skeletonElement = style({
  animation: `${gentlePulse} 2s ease-in-out infinite`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

// Staggered loading animation for multiple elements
export const staggeredLoad = style({
  selectors: {
    '&:nth-child(1)': { animationDelay: '0ms' },
    '&:nth-child(2)': { animationDelay: '150ms' },
    '&:nth-child(3)': { animationDelay: '300ms' },
    '&:nth-child(4)': { animationDelay: '450ms' },
    '&:nth-child(5)': { animationDelay: '600ms' },
    '&:nth-child(n+6)': { animationDelay: '750ms' },
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animationDelay: '0ms !important',
    },
  },
});

// Progress indicator enhancements
export const progressContainer = style({
  marginBottom: entityVars.spacing.md,
  padding: entityVars.spacing.sm,
  backgroundColor: entityVars.color.background,
  borderRadius: entityVars.borderRadius.sm,
  border: `1px solid ${entityVars.color.border}`,
});

export const progressLabel = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.text,
  marginBottom: entityVars.spacing.xs,
  textAlign: 'center',
});

export const progressDescription = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  textAlign: 'center',
  lineHeight: entityVars.lineHeight.tight,
});

// Loading phase indicators
export const phaseIndicator = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  marginTop: entityVars.spacing.sm,
  padding: entityVars.spacing.sm,
  backgroundColor: entityVars.color.infoBackground,
  borderRadius: entityVars.borderRadius.sm,
  border: `1px solid ${entityVars.color.work}20`,
});

export const phaseIcon = style({
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  backgroundColor: entityVars.color.work,
  animation: `${gentlePulse} 1.5s ease-in-out infinite`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

export const phaseText = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.text,
  fontWeight: entityVars.fontWeight.medium,
});

// Success state styling
export const successState = style({
  backgroundColor: entityVars.color.successBackground,
  borderColor: entityVars.color.success,
  color: entityVars.color.text,
  
  '::before': {
    content: '""',
    position: 'absolute',
    top: entityVars.spacing.sm,
    left: entityVars.spacing.sm,
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: entityVars.color.success,
    opacity: 0.8,
  },
});

// Keyboard navigation enhancements
export const keyboardNavigable = style({
  ':focus-within': {
    outline: `2px solid ${entityVars.color.work}`,
    outlineOffset: '2px',
    borderRadius: entityVars.borderRadius.md,
  },
});

// Reduced data mode optimizations
export const reducedDataMode = style({
  '@media': {
    '(prefers-reduced-data: reduce)': {
      [skeletonElement]: {
        animation: 'none',
      },
      
      [phaseIcon]: {
        animation: 'none',
      },
    },
  },
});

// Print mode handling
export const printOptimized = style({
  '@media': {
    'print': {
      [container]: {
        borderColor: '#000',
        backgroundColor: '#fff',
      },
      
      [errorContainer]: {
        borderColor: '#000',
        backgroundColor: '#fff',
      },
      
      [retryButton]: {
        display: 'none',
      },
      
      [announcement]: {
        position: 'static',
        width: 'auto',
        height: 'auto',
        overflow: 'visible',
        clip: 'auto',
        whiteSpace: 'normal',
      },
    },
  },
});