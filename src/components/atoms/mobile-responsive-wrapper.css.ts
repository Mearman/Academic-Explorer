import { style, keyframes } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

// Touch feedback animations
const touchRipple = keyframes({
  '0%': {
    transform: 'scale(0)',
    opacity: 0.6,
  },
  '100%': {
    transform: 'scale(1)',
    opacity: 0,
  },
});

const buttonPress = keyframes({
  '0%': {
    transform: 'scale(1)',
  },
  '50%': {
    transform: 'scale(0.98)',
  },
  '100%': {
    transform: 'scale(1)',
  },
});

const fadeInUp = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateY(20px)',
  },
  '100%': {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

const bounce = keyframes({
  '0%, 20%, 50%, 80%, 100%': {
    transform: 'translateY(0)',
  },
  '40%': {
    transform: 'translateY(-10px)',
  },
  '60%': {
    transform: 'translateY(-5px)',
  },
});

// Base responsive container
export const responsiveContainer = style({
  position: 'relative',
  width: '100%',
  minHeight: 'fit-content',
  boxSizing: 'border-box',
  isolation: 'isolate',
  
  // Smooth transitions for layout changes
  transition: `all ${entityVars.transition.normal} ease-out`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

// Breakpoint-specific styles
export const mobile = style({
  maxWidth: '100vw',
  padding: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.sm,
  lineHeight: entityVars.lineHeight.normal,
  
  // Mobile-specific optimizations
  WebkitTextSizeAdjust: '100%',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  
  // Prevent zoom on input focus
  selectors: {
    '& input, & textarea, & select': {
      fontSize: '16px', // Prevents zoom on iOS
    },
  },
});

export const tablet = style({
  maxWidth: '100vw',
  padding: entityVars.spacing.md,
  fontSize: entityVars.fontSize.base,
  lineHeight: entityVars.lineHeight.normal,
  
  // Tablet-specific optimizations
  touchAction: 'manipulation',
});

export const desktop = style({
  maxWidth: 'none',
  padding: entityVars.spacing.lg,
  fontSize: entityVars.fontSize.base,
  lineHeight: entityVars.lineHeight.relaxed,
  
  // Desktop-specific optimizations
  cursor: 'default',
});

// Orientation-specific styles
export const portrait = style({
  // Portrait-specific adjustments
  '@media': {
    '(orientation: portrait)': {
      paddingTop: entityVars.spacing.lg,
      paddingBottom: entityVars.spacing.lg,
    },
  },
});

export const landscape = style({
  // Landscape-specific adjustments
  '@media': {
    '(orientation: landscape)': {
      paddingTop: entityVars.spacing.md,
      paddingBottom: entityVars.spacing.md,
    },
  },
});

// Touch optimizations
export const touchOptimized = style({
  // Minimum touch target sizes
  selectors: {
    '& button, & [role="button"], & a, & input, & select, & textarea': {
      minHeight: '44px',
      minWidth: '44px',
      padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
    },
    
    '& [data-touch-target]': {
      minHeight: '48px',
      minWidth: '48px',
    },
  },
  
  // Improved touch feedback
  '@media': {
    '(hover: none) and (pointer: coarse)': {
      selectors: {
        '& button, & [role="button"]': {
          fontSize: entityVars.fontSize.lg,
          padding: `${entityVars.spacing.md} ${entityVars.spacing.lg}`,
          borderRadius: entityVars.borderRadius.lg,
        },
      },
    },
  },
});

// GPU acceleration for smooth animations
export const gpuAccelerated = style({
  transform: 'translate3d(0, 0, 0)',
  backfaceVisibility: 'hidden',
  perspective: '1000px',
  willChange: 'transform',
});

// Reduced motion fallback
export const reducedMotion = style({
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none !important',
      transition: 'none !important',
      
      selectors: {
        '& *': {
          animation: 'none !important',
          transition: 'none !important',
        },
      },
    },
  },
});

// Safe area adaptation
export const safeAreaAdapted = style({
  paddingTop: 'env(safe-area-inset-top)',
  paddingRight: 'env(safe-area-inset-right)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  
  // Fallback for browsers that don't support env()
  '@supports': {
    'not (padding: env(safe-area-inset-top))': {
      paddingTop: entityVars.spacing.lg,
      paddingBottom: entityVars.spacing.lg,
    },
  },
});

// Notch-specific adaptations
export const notchAdapted = style({
  // Additional padding for devices with notches
  '@media': {
    '(display-mode: standalone)': {
      paddingTop: 'calc(env(safe-area-inset-top) + 20px)',
    },
  },
  
  // iPhone X and newer specific styles
  '@supports': {
    '(padding: env(safe-area-inset-top))': {
      paddingTop: 'max(env(safe-area-inset-top), 20px)',
    },
  },
});

// Touch feedback effect
export const touchFeedback = style({
  position: 'relative',
  overflow: 'hidden',
  
  '::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100px',
    height: '100px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%) scale(0)',
    animation: `${touchRipple} 0.3s ease-out`,
    pointerEvents: 'none',
  },
});

// Touch-optimized button styles
export const touchButton = style({
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
  WebkitUserSelect: 'none',
  outline: 'none',
  overflow: 'hidden',
  
  // Smooth transitions
  transition: `all ${entityVars.transition.fast} ease-out`,
  
  // Touch feedback
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
  
  // Focus styles
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.work}`,
    outlineOffset: '2px',
  },
  
  // Prevent text selection on touch
  WebkitTouchCallout: 'none',
  KhtmlUserSelect: 'none',
  MozUserSelect: 'none',
  msUserSelect: 'none',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

// Button variants
export const buttonPrimary = style({
  backgroundColor: entityVars.color.work,
  color: entityVars.color.background,
  
  ':hover': {
    backgroundColor: entityVars.color.workDark,
    transform: 'translateY(-1px)',
    boxShadow: entityVars.shadow.md,
  },
  
  ':active': {
    transform: 'translateY(0)',
    boxShadow: entityVars.shadow.sm,
  },
  
  '@media': {
    '(hover: none)': {
      ':hover': {
        backgroundColor: entityVars.color.work,
        transform: 'none',
        boxShadow: 'none',
      },
    },
  },
});

export const buttonSecondary = style({
  backgroundColor: entityVars.color.cardBackground,
  color: entityVars.color.text,
  border: `1px solid ${entityVars.color.border}`,
  
  ':hover': {
    backgroundColor: entityVars.color.background,
    borderColor: entityVars.color.borderHover,
    transform: 'translateY(-1px)',
    boxShadow: entityVars.shadow.sm,
  },
  
  ':active': {
    transform: 'translateY(0)',
    backgroundColor: entityVars.color.cardBackground,
  },
  
  '@media': {
    '(hover: none)': {
      ':hover': {
        backgroundColor: entityVars.color.cardBackground,
        transform: 'none',
        boxShadow: 'none',
      },
    },
  },
});

export const buttonGhost = style({
  backgroundColor: 'transparent',
  color: entityVars.color.text,
  
  ':hover': {
    backgroundColor: entityVars.color.cardBackground,
    transform: 'translateY(-1px)',
  },
  
  ':active': {
    transform: 'translateY(0)',
    backgroundColor: entityVars.color.background,
  },
  
  '@media': {
    '(hover: none)': {
      ':hover': {
        backgroundColor: 'transparent',
        transform: 'none',
      },
    },
  },
});

// Button sizes
export const buttonSizeSmall = style({
  minHeight: '36px',
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  fontSize: entityVars.fontSize.sm,
  
  '@media': {
    '(hover: none) and (pointer: coarse)': {
      minHeight: '44px',
      padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
    },
  },
});

export const buttonSizeMedium = style({
  minHeight: '40px',
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  fontSize: entityVars.fontSize.base,
  
  '@media': {
    '(hover: none) and (pointer: coarse)': {
      minHeight: '48px',
      padding: `${entityVars.spacing.md} ${entityVars.spacing.lg}`,
    },
  },
});

export const buttonSizeLarge = style({
  minHeight: '48px',
  padding: `${entityVars.spacing.md} ${entityVars.spacing.lg}`,
  fontSize: entityVars.fontSize.lg,
  
  '@media': {
    '(hover: none) and (pointer: coarse)': {
      minHeight: '56px',
      padding: `${entityVars.spacing.lg} ${entityVars.spacing.xl}`,
    },
  },
});

// Button states
export const buttonPressed = style({
  animation: `${buttonPress} 0.15s ease-out`,
  transform: 'scale(0.98)',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
      transform: 'none',
    },
  },
});

export const buttonDisabled = style({
  opacity: 0.6,
  cursor: 'not-allowed',
  transform: 'none !important',
  
  ':hover': {
    transform: 'none !important',
    boxShadow: 'none !important',
  },
});

// Mobile-specific button optimizations
export const mobileButton = style({
  '@media': {
    '(max-width: 767px)': {
      width: '100%',
      justifyContent: 'center',
      
      // Larger touch targets
      minHeight: '48px',
      fontSize: entityVars.fontSize.lg,
      
      // Better visual feedback
      ':active': {
        backgroundColor: entityVars.color.work,
        color: entityVars.color.background,
      },
    },
  },
});

// Scroll optimizations
export const scrollOptimized = style({
  // Smooth scrolling
  scrollBehavior: 'smooth',
  
  // Momentum scrolling on iOS
  WebkitOverflowScrolling: 'touch',
  
  // Prevent overscroll bounce
  overscrollBehavior: 'contain',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      scrollBehavior: 'auto',
    },
  },
});

// High DPI display optimizations
export const highDpiOptimized = style({
  '@media': {
    '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)': {
      // Sharper borders
      borderWidth: '0.5px',
      
      // Better text rendering
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    },
  },
});

// Dark mode optimizations
export const darkModeOptimized = style({
  '@media': {
    '(prefers-color-scheme: dark)': {
      // Reduce eye strain in dark mode
      selectors: {
        '& *': {
          textShadow: 'none',
        },
      },
      
      // Better contrast ratios
      backgroundColor: entityVars.color.background,
      color: entityVars.color.text,
    },
  },
});

// Network-conscious optimizations
export const reducedDataOptimized = style({
  '@media': {
    '(prefers-reduced-data: reduce)': {
      // Disable non-essential animations
      selectors: {
        '& *': {
          animation: 'none !important',
          backgroundImage: 'none !important',
        },
      },
    },
  },
});

// Print optimizations
export const printOptimized = style({
  '@media': {
    'print': {
      color: '#000 !important',
      backgroundColor: '#fff !important',
      boxShadow: 'none !important',
      
      selectors: {
        '& *': {
          color: '#000 !important',
          backgroundColor: '#fff !important',
          boxShadow: 'none !important',
        },
      },
    },
  },
});

// Container query support (future enhancement)
export const containerQuerySupport = style({
  containerType: 'inline-size',
  
  '@container': {
    '(max-width: 300px)': {
      fontSize: entityVars.fontSize.xs,
      padding: entityVars.spacing.xs,
    },
    
    '(min-width: 300px) and (max-width: 600px)': {
      fontSize: entityVars.fontSize.sm,
      padding: entityVars.spacing.sm,
    },
    
    '(min-width: 600px)': {
      fontSize: entityVars.fontSize.base,
      padding: entityVars.spacing.md,
    },
  },
});