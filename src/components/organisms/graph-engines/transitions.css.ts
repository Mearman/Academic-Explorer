import { style, keyframes, createVar } from '@vanilla-extract/css';

import { entityVars } from '../../design-tokens.css';

// ============================================================================
// CSS Variables for Dynamic Transitions
// ============================================================================

export const transitionDurationVar = createVar();
export const transitionProgressVar = createVar();
export const transitionDirectionVar = createVar();

// ============================================================================
// Keyframe Animations
// ============================================================================

export const fadeOut = keyframes({
  '0%': { opacity: '1' },
  '100%': { opacity: '0' },
});

export const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const fadeIn = keyframes({
  '0%': { opacity: '0' },
  '100%': { opacity: '1' },
});

export const scaleOut = keyframes({
  '0%': { 
    transform: 'scale(1)', 
    opacity: '1' 
  },
  '50%': { 
    transform: 'scale(0.95)', 
    opacity: '0.5' 
  },
  '100%': { 
    transform: 'scale(0.9)', 
    opacity: '0' 
  },
});

export const scaleIn = keyframes({
  '0%': { 
    transform: 'scale(1.1)', 
    opacity: '0' 
  },
  '50%': { 
    transform: 'scale(1.05)', 
    opacity: '0.5' 
  },
  '100%': { 
    transform: 'scale(1)', 
    opacity: '1' 
  },
});

export const slideOutLeft = keyframes({
  '0%': { 
    transform: 'translateX(0)', 
    opacity: '1' 
  },
  '100%': { 
    transform: 'translateX(-100%)', 
    opacity: '0' 
  },
});

export const slideInLeft = keyframes({
  '0%': { 
    transform: 'translateX(100%)', 
    opacity: '0' 
  },
  '100%': { 
    transform: 'translateX(0)', 
    opacity: '1' 
  },
});

export const slideOutRight = keyframes({
  '0%': { 
    transform: 'translateX(0)', 
    opacity: '1' 
  },
  '100%': { 
    transform: 'translateX(100%)', 
    opacity: '0' 
  },
});

export const slideInRight = keyframes({
  '0%': { 
    transform: 'translateX(-100%)', 
    opacity: '0' 
  },
  '100%': { 
    transform: 'translateX(0)', 
    opacity: '1' 
  },
});

export const slideOutUp = keyframes({
  '0%': { 
    transform: 'translateY(0)', 
    opacity: '1' 
  },
  '100%': { 
    transform: 'translateY(-100%)', 
    opacity: '0' 
  },
});

export const slideInUp = keyframes({
  '0%': { 
    transform: 'translateY(100%)', 
    opacity: '0' 
  },
  '100%': { 
    transform: 'translateY(0)', 
    opacity: '1' 
  },
});

export const slideOutDown = keyframes({
  '0%': { 
    transform: 'translateY(0)', 
    opacity: '1' 
  },
  '100%': { 
    transform: 'translateY(100%)', 
    opacity: '0' 
  },
});

export const slideInDown = keyframes({
  '0%': { 
    transform: 'translateY(-100%)', 
    opacity: '0' 
  },
  '100%': { 
    transform: 'translateY(0)', 
    opacity: '1' 
  },
});

// ============================================================================
// Base Container Styles
// ============================================================================

export const graphEngineContainer = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
});

export const graphEngineCanvas = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'block',
});

// ============================================================================
// Transition Overlay Styles
// ============================================================================

export const transitionOverlay = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: `${entityVars.color.background}99`, // Semi-transparent
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  pointerEvents: 'none',
});

export const transitionContent = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: entityVars.spacing.lg,
  padding: entityVars.spacing.xl,
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.borderRadius.lg,
  border: `1px solid ${entityVars.color.border}`,
  boxShadow: `0 8px 32px ${entityVars.color.shadowColor}`,
  textAlign: 'center',
});

export const transitionTitle = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: entityVars.color.text,
  margin: 0,
});

export const transitionDescription = style({
  fontSize: '0.875rem',
  color: entityVars.color.muted,
  margin: 0,
});

// ============================================================================
// Progress Bar Styles
// ============================================================================

export const progressContainer = style({
  width: '200px',
  height: '4px',
  backgroundColor: entityVars.color.border,
  borderRadius: '2px',
  overflow: 'hidden',
});

export const progressBar = style({
  height: '100%',
  backgroundColor: entityVars.color.accent,
  borderRadius: '2px',
  transform: `translateX(calc(-100% + ${transitionProgressVar}%))`,
  transition: 'transform 0.2s ease-out',
});

// ============================================================================
// Engine Transition States
// ============================================================================

export const engineTransitioning = style({
  pointerEvents: 'none',
  transition: 'all 0.3s ease-in-out',
});

export const engineOutgoing = style({
  zIndex: 1,
});

export const engineIncoming = style({
  zIndex: 2,
});

// ============================================================================
// Fade Transition Styles
// ============================================================================

export const fadeTransitionOut = style({
  animation: `${fadeOut} ${transitionDurationVar} ease-in-out forwards`,
});

export const fadeTransitionIn = style({
  animation: `${fadeIn} ${transitionDurationVar} ease-in-out forwards`,
});

// ============================================================================
// Scale Transition Styles
// ============================================================================

export const scaleTransitionOut = style({
  animation: `${scaleOut} ${transitionDurationVar} ease-in-out forwards`,
});

export const scaleTransitionIn = style({
  animation: `${scaleIn} ${transitionDurationVar} ease-in-out forwards`,
});

// ============================================================================
// Slide Transition Styles
// ============================================================================

export const slideTransitionOutLeft = style({
  animation: `${slideOutLeft} ${transitionDurationVar} ease-in-out forwards`,
});

export const slideTransitionInLeft = style({
  animation: `${slideInLeft} ${transitionDurationVar} ease-in-out forwards`,
});

export const slideTransitionOutRight = style({
  animation: `${slideOutRight} ${transitionDurationVar} ease-in-out forwards`,
});

export const slideTransitionInRight = style({
  animation: `${slideInRight} ${transitionDurationVar} ease-in-out forwards`,
});

export const slideTransitionOutUp = style({
  animation: `${slideOutUp} ${transitionDurationVar} ease-in-out forwards`,
});

export const slideTransitionInUp = style({
  animation: `${slideInUp} ${transitionDurationVar} ease-in-out forwards`,
});

export const slideTransitionOutDown = style({
  animation: `${slideOutDown} ${transitionDurationVar} ease-in-out forwards`,
});

export const slideTransitionInDown = style({
  animation: `${slideInDown} ${transitionDurationVar} ease-in-out forwards`,
});

// ============================================================================
// Loading States
// ============================================================================

export const engineLoading = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: entityVars.color.background,
  zIndex: 999,
});

export const loadingSpinner = style({
  width: '32px',
  height: '32px',
  border: `3px solid ${entityVars.color.border}`,
  borderTop: `3px solid ${entityVars.color.accent}`,
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`,
  
});

export const loadingText = style({
  marginTop: entityVars.spacing.lg,
  fontSize: '0.875rem',
  color: entityVars.color.muted,
});

// ============================================================================
// Error States
// ============================================================================

export const engineError = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: entityVars.color.errorBackground,
  border: `1px solid ${entityVars.color.error}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
  textAlign: 'center',
  zIndex: 998,
});

export const errorIcon = style({
  fontSize: '2rem',
  color: entityVars.color.error,
  marginBottom: entityVars.spacing.lg,
});

export const errorTitle = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: entityVars.color.error,
  margin: 0,
  marginBottom: entityVars.spacing.sm,
});

export const errorMessage = style({
  fontSize: '0.875rem',
  color: entityVars.color.muted,
  margin: 0,
  marginBottom: entityVars.spacing.lg,
  maxWidth: '300px',
});

export const errorActions = style({
  display: 'flex',
  gap: entityVars.spacing.md,
});

export const errorButton = style({
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.lg}`,
  fontSize: '0.875rem',
  fontWeight: '500',
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  backgroundColor: entityVars.color.cardBackground,
  color: entityVars.color.text,
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  
  ':hover': {
    backgroundColor: entityVars.color.background,
    borderColor: entityVars.color.borderHover,
  },
  
  ':active': {
    transform: 'translateY(1px)',
  },
});

// ============================================================================
// Performance Warning Styles
// ============================================================================

export const performanceWarning = style({
  position: 'absolute',
  top: entityVars.spacing.lg,
  right: entityVars.spacing.lg,
  padding: entityVars.spacing.md,
  backgroundColor: entityVars.color.warningBackground,
  border: `1px solid ${entityVars.color.warning}`,
  borderRadius: entityVars.borderRadius.md,
  color: entityVars.color.warning,
  fontSize: '0.75rem',
  fontWeight: '500',
  zIndex: 1001,
  maxWidth: '250px',
  
  selectors: {
    '&::before': {
      content: 'WARN',
      marginRight: entityVars.spacing.sm,
    },
  },
});

// ============================================================================
// Responsive Design
// ============================================================================

export const responsiveContainer = style({
  '@media': {
    '(max-width: 768px)': {
      borderRadius: 0,
      border: 'none',
    },
  },
});

export const responsiveTransitionContent = style({
  '@media': {
    '(max-width: 480px)': {
      padding: entityVars.spacing.lg,
      width: '90%',
      maxWidth: 'none',
    },
  },
});

// ============================================================================
// Accessibility Enhancements
// ============================================================================

export const accessibleTransition = style({
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none !important',
      transition: 'none !important',
    },
  },
});

export const focusVisible = style({
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

// ============================================================================
// Theme-specific Overrides
// ============================================================================

export const darkModeOverrides = style({
  selectors: {
    '[data-theme="dark"] &': {
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3)`,
    },
  },
});

export const lightModeOverrides = style({
  selectors: {
    '[data-theme="light"] &': {
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.1)`,
    },
  },
});