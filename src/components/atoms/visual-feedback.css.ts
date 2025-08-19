import { style, keyframes } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

// Performance-optimized animations using transform and opacity
const rippleExpand = keyframes({
  '0%': {
    transform: 'scale(0)',
    opacity: 0.6,
  },
  '100%': {
    transform: 'scale(4)',
    opacity: 0,
  },
});

const bounceIn = keyframes({
  '0%': {
    transform: 'scale(0.3)',
    opacity: 0,
  },
  '50%': {
    transform: 'scale(1.05)',
    opacity: 1,
  },
  '70%': {
    transform: 'scale(0.9)',
  },
  '100%': {
    transform: 'scale(1)',
    opacity: 1,
  },
});

const slideInRight = keyframes({
  '0%': {
    transform: 'translateX(100%)',
    opacity: 0,
  },
  '100%': {
    transform: 'translateX(0)',
    opacity: 1,
  },
});

const shake = keyframes({
  '0%, 100%': {
    transform: 'translateX(0)',
  },
  '10%, 30%, 50%, 70%, 90%': {
    transform: 'translateX(-2px)',
  },
  '20%, 40%, 60%, 80%': {
    transform: 'translateX(2px)',
  },
});

const pulse = keyframes({
  '0%, 100%': {
    transform: 'scale(1)',
    opacity: 1,
  },
  '50%': {
    transform: 'scale(1.05)',
    opacity: 0.8,
  },
});

const glow = keyframes({
  '0%, 100%': {
    boxShadow: `0 0 5px ${entityVars.color.work}40`,
  },
  '50%': {
    boxShadow: `0 0 20px ${entityVars.color.work}80`,
  },
});

const rotate = keyframes({
  '0%': {
    transform: 'rotate(0deg)',
  },
  '100%': {
    transform: 'rotate(360deg)',
  },
});

const spinAnimation = keyframes({
  '0%': {
    transform: 'rotate(0deg)',
  },
  '100%': {
    transform: 'rotate(360deg)',
  },
});

const progressFill = keyframes({
  '0%': {
    transform: 'translateX(-100%)',
  },
  '100%': {
    transform: 'translateX(0)',
  },
});

const fadeInUp = keyframes({
  '0%': {
    transform: 'translateY(20px)',
    opacity: 0,
  },
  '100%': {
    transform: 'translateY(0)',
    opacity: 1,
  },
});

const scaleIn = keyframes({
  '0%': {
    transform: 'scale(0.8)',
    opacity: 0,
  },
  '100%': {
    transform: 'scale(1)',
    opacity: 1,
  },
});

// Base feedback container
export const feedbackContainer = style({
  position: 'relative',
  display: 'inline-block',
  overflow: 'hidden',
  isolation: 'isolate',
  
  // GPU acceleration for smooth animations
  transform: 'translate3d(0, 0, 0)',
  backfaceVisibility: 'hidden',
  perspective: '1000px',
  
  // Smooth transitions
  transition: `all ${entityVars.transition.fast} cubic-bezier(0.4, 0, 0.2, 1)`,
  
  // Interaction cursor
  cursor: 'pointer',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
      transform: 'none',
    },
  },
});

// Interaction states
export const hovered = style({
  transform: 'translateY(-1px) translate3d(0, 0, 0)',
  
  '@media': {
    '(hover: none)': {
      transform: 'translate3d(0, 0, 0)',
    },
    
    '(prefers-reduced-motion: reduce)': {
      transform: 'translate3d(0, 0, 0)',
    },
  },
});

export const focused = style({
  outline: `2px solid ${entityVars.color.work}`,
  outlineOffset: '2px',
  zIndex: 1,
  
  '@media': {
    '(prefers-contrast: high)': {
      outline: `3px solid ${entityVars.color.text}`,
      outlineOffset: '3px',
    },
  },
});

export const pressed = style({
  transform: 'scale(0.98) translate3d(0, 0, 0)',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transform: 'translate3d(0, 0, 0)',
    },
  },
});

export const elevated = style({
  boxShadow: entityVars.shadow.lg,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      boxShadow: 'none',
    },
  },
});

// State styles
export const loading = style({
  opacity: 0.8,
  pointerEvents: 'none',
  
  '::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
});

export const success = style({
  backgroundColor: entityVars.color.successBackground,
  borderColor: entityVars.color.success,
  animation: `${bounceIn} 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

export const error = style({
  backgroundColor: entityVars.color.errorBackground,
  borderColor: entityVars.color.error,
  animation: `${shake} 0.5s ease-in-out`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

export const disabled = style({
  opacity: 0.6,
  cursor: 'not-allowed',
  pointerEvents: 'none',
  transform: 'none !important',
});

// Ripple effect
export const ripple = style({
  position: 'absolute',
  borderRadius: '50%',
  pointerEvents: 'none',
  animation: `${rippleExpand} 600ms cubic-bezier(0.4, 0, 0.2, 1)`,
  transform: 'scale(0)',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
      display: 'none',
    },
  },
});

// Overlay for state indicators
export const overlay = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  zIndex: 2,
  animation: `${fadeInUp} ${entityVars.transition.normal} ease-out`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

// Loading indicator
export const loadingIndicator = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const loadingSpinnerStyle = style({
  width: '24px',
  height: '24px',
  border: `3px solid ${entityVars.color.border}`,
  borderTop: `3px solid ${entityVars.color.work}`,
  borderRadius: '50%',
  animation: `${spinAnimation} 1s linear infinite`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
      borderTop: `3px solid ${entityVars.color.work}`,
    },
  },
});

export const loadingMessage = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  textAlign: 'center',
});

// Success indicator
export const successIndicator = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  color: entityVars.color.success,
});

export const successIcon = style({
  fontSize: entityVars.fontSize.xl,
  fontWeight: entityVars.fontWeight.bold,
  animation: `${scaleIn} 0.3s ease-out`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

export const successMessage = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.success,
  textAlign: 'center',
  fontWeight: entityVars.fontWeight.medium,
});

// Error indicator
export const errorIndicator = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  color: entityVars.color.error,
});

export const errorIcon = style({
  fontSize: entityVars.fontSize.xl,
  fontWeight: entityVars.fontWeight.bold,
  animation: `${scaleIn} 0.3s ease-out`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

export const errorMessage = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.error,
  textAlign: 'center',
  fontWeight: entityVars.fontWeight.medium,
});

// Progress bar
export const progressContainer = style({
  width: '100%',
  height: '4px',
  backgroundColor: entityVars.color.border,
  borderRadius: entityVars.borderRadius.full,
  overflow: 'hidden',
  position: 'relative',
});

export const progressBar = style({
  height: '100%',
  backgroundColor: entityVars.color.work,
  borderRadius: 'inherit',
  transition: `width ${entityVars.transition.normal} ease-out`,
  transform: 'translate3d(0, 0, 0)',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

export const progressAnimated = style({
  position: 'relative',
  
  '::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)`,
    animation: `${progressFill} 1.5s infinite`,
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      '::before': {
        animation: 'none',
        display: 'none',
      },
    },
  },
});

// Toast notifications
export const toastContainer = style({
  position: 'fixed',
  top: entityVars.spacing.lg,
  right: entityVars.spacing.lg,
  zIndex: 10000,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
  maxWidth: '400px',
  pointerEvents: 'none',
  
  '@media': {
    '(max-width: 768px)': {
      top: entityVars.spacing.md,
      right: entityVars.spacing.md,
      left: entityVars.spacing.md,
      maxWidth: 'none',
    },
  },
});

export const toast = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: entityVars.spacing.sm,
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  boxShadow: entityVars.shadow.lg,
  animation: `${slideInRight} ${entityVars.transition.normal} ease-out`,
  pointerEvents: 'auto',
  cursor: 'pointer',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

export const toastSuccess = style({
  borderColor: entityVars.color.success,
  backgroundColor: entityVars.color.successBackground,
});

export const toastError = style({
  borderColor: entityVars.color.error,
  backgroundColor: entityVars.color.errorBackground,
});

export const toastInfo = style({
  borderColor: entityVars.color.work,
  backgroundColor: entityVars.color.infoBackground,
});

export const toastWarning = style({
  borderColor: entityVars.color.warning,
  backgroundColor: entityVars.color.warningBackground,
});

export const toastMessage = style({
  flex: 1,
  fontSize: entityVars.fontSize.sm,
  lineHeight: entityVars.lineHeight.tight,
  color: entityVars.color.text,
});

export const toastCloseButton = style({
  background: 'none',
  border: 'none',
  fontSize: entityVars.fontSize.lg,
  lineHeight: 1,
  color: entityVars.color.muted,
  cursor: 'pointer',
  padding: 0,
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: entityVars.borderRadius.sm,
  transition: `color ${entityVars.transition.fast}`,
  
  ':hover': {
    color: entityVars.color.text,
    backgroundColor: entityVars.color.border,
  },
  
  ':focus': {
    outline: `2px solid ${entityVars.color.work}`,
    outlineOffset: '2px',
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

// Button styles
export const feedbackButton = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: entityVars.spacing.sm,
  border: 'none',
  borderRadius: entityVars.borderRadius.md,
  font: 'inherit',
  fontWeight: entityVars.fontWeight.medium,
  cursor: 'pointer',
  userSelect: 'none',
  outline: 'none',
  overflow: 'hidden',
  
  // Performance optimizations
  transform: 'translate3d(0, 0, 0)',
  backfaceVisibility: 'hidden',
  
  // Smooth transitions
  transition: `all ${entityVars.transition.fast} cubic-bezier(0.4, 0, 0.2, 1)`,
  
  // Touch feedback
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.work}`,
    outlineOffset: '2px',
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

export const buttonPrimary = style({
  backgroundColor: entityVars.color.work,
  color: entityVars.color.background,
  
  ':hover': {
    backgroundColor: entityVars.color.workDark,
  },
  
  ':disabled': {
    backgroundColor: entityVars.color.muted,
    color: entityVars.color.subtle,
  },
});

export const buttonSecondary = style({
  backgroundColor: entityVars.color.cardBackground,
  color: entityVars.color.text,
  border: `1px solid ${entityVars.color.border}`,
  
  ':hover': {
    backgroundColor: entityVars.color.background,
    borderColor: entityVars.color.borderHover,
  },
  
  ':disabled': {
    backgroundColor: entityVars.color.cardBackground,
    color: entityVars.color.muted,
    borderColor: entityVars.color.border,
  },
});

export const buttonGhost = style({
  backgroundColor: 'transparent',
  color: entityVars.color.text,
  
  ':hover': {
    backgroundColor: entityVars.color.cardBackground,
  },
  
  ':disabled': {
    color: entityVars.color.muted,
  },
});

export const buttonSizeSmall = style({
  minHeight: '32px',
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  fontSize: entityVars.fontSize.sm,
});

export const buttonSizeMedium = style({
  minHeight: '40px',
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  fontSize: entityVars.fontSize.base,
});

export const buttonSizeLarge = style({
  minHeight: '48px',
  padding: `${entityVars.spacing.md} ${entityVars.spacing.lg}`,
  fontSize: entityVars.fontSize.lg,
});

// Progress feedback
export const progressFeedback = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  width: '100%',
});

export const progressDefault = style({
  color: entityVars.color.text,
});

export const progressSuccess = style({
  color: entityVars.color.success,
  
  [progressBar]: {
    backgroundColor: entityVars.color.success,
  },
});

export const progressError = style({
  color: entityVars.color.error,
  
  [progressBar]: {
    backgroundColor: entityVars.color.error,
  },
});

export const progressWarning = style({
  color: entityVars.color.warning,
  
  [progressBar]: {
    backgroundColor: entityVars.color.warning,
  },
});

export const progressLabel = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  color: 'inherit',
});

// Micro-interactions
export const microInteraction = style({
  display: 'inline-block',
  transform: 'translate3d(0, 0, 0)',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transform: 'none',
    },
  },
});

export const animationBounce = style({
  selectors: {
    '&.triggered': {
      animation: `${bounceIn} 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
    },
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        '&.triggered': {
          animation: 'none',
        },
      },
    },
  },
});

export const animationShake = style({
  selectors: {
    '&.triggered': {
      animation: `${shake} 0.5s ease-in-out`,
    },
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        '&.triggered': {
          animation: 'none',
        },
      },
    },
  },
});

export const animationPulse = style({
  selectors: {
    '&.triggered': {
      animation: `${pulse} 1s ease-in-out infinite`,
    },
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        '&.triggered': {
          animation: 'none',
        },
      },
    },
  },
});

export const animationGlow = style({
  selectors: {
    '&.triggered': {
      animation: `${glow} 2s ease-in-out infinite`,
    },
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        '&.triggered': {
          animation: 'none',
        },
      },
    },
  },
});

export const animationRotate = style({
  selectors: {
    '&.triggered': {
      animation: `${rotate} 1s ease-in-out`,
    },
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        '&.triggered': {
          animation: 'none',
        },
      },
    },
  },
});

export const triggered = style({
  // Base triggered state - specific animations defined in animation classes
});

// Performance optimizations
export const gpuOptimized = style({
  // Force GPU layer creation
  transform: 'translate3d(0, 0, 0)',
  backfaceVisibility: 'hidden',
  perspective: '1000px',
  willChange: 'transform, opacity',
});

// Reduced data mode
export const reducedData = style({
  '@media': {
    '(prefers-reduced-data: reduce)': {
      selectors: {
        '& *': {
          animation: 'none !important',
          transition: 'none !important',
        },
      },
    },
  },
});

// Named export for loadingSpinner to avoid conflicts
export const loadingSpinner = loadingSpinnerStyle;