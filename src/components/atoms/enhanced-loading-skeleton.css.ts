import { style, keyframes, globalStyle } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

// Enhanced animations
const shimmer = keyframes({
  '0%': {
    backgroundPosition: '-200px 0',
  },
  '100%': {
    backgroundPosition: 'calc(200px + 100%) 0',
  },
});

const wave = keyframes({
  '0%': {
    transform: 'translateX(-100%)',
  },
  '50%': {
    transform: 'translateX(100%)',
  },
  '100%': {
    transform: 'translateX(100%)',
  },
});

const pulse = keyframes({
  '0%, 100%': { 
    opacity: 1,
    transform: 'scale(1)',
  },
  '50%': { 
    opacity: 0.6,
    transform: 'scale(1.02)',
  },
});

const fadeIn = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateY(4px)',
  },
  '100%': {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

const progressFill = keyframes({
  '0%': {
    width: '0%',
  },
  '100%': {
    width: '100%',
  },
});

// Container styles
export const container = style({
  position: 'relative',
  width: '100%',
  animation: `${fadeIn} ${entityVars.transition.normal} ease-out`,
});

export const groupContainer = style({
  position: 'relative',
  width: '100%',
});

export const skeletonStack = style({
  position: 'relative',
});

// Progress indicator styles
export const progressContainer = style({
  marginBottom: entityVars.spacing.md,
  position: 'relative',
  zIndex: 1,
});

export const progressBar = style({
  backgroundColor: entityVars.color.border,
  borderRadius: entityVars.borderRadius.sm,
  overflow: 'hidden',
  position: 'relative',

  selectors: {
    '&[data-progress]::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      backgroundColor: entityVars.color.work,
      borderRadius: 'inherit',
      animation: `${progressFill} ${entityVars.transition.slow} ease-out`,
      transition: `width ${entityVars.transition.normal} ease-out`,
    },
  },
});

export const progressText = style({
  fontSize: entityVars.fontSize.sm,
  lineHeight: entityVars.lineHeight.tight,
  color: entityVars.color.muted,
  textAlign: 'center',
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

export const loadingText = style({
  fontSize: entityVars.fontSize.sm,
  lineHeight: entityVars.lineHeight.normal,
  color: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.medium,
  
  selectors: {
    '&[aria-live]': {
      position: 'absolute',
      left: '-10000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    },
  },
});

// Screen reader only text
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

// Enhanced skeleton animations
export const shimmerAnimation = style({
  position: 'relative',
  overflow: 'hidden',
  
  '::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    )`,
    animation: `${shimmer} 1.5s infinite`,
    transform: 'translateX(-100%)',
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

export const waveAnimation = style({
  position: 'relative',
  overflow: 'hidden',
  
  '::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.4),
      transparent
    )`,
    animation: `${wave} 2s infinite`,
  },
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      '::after': {
        animation: 'none',
        display: 'none',
      },
    },
  },
});

export const pulseAnimation = style({
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
  
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

// High contrast mode support
export const highContrast = style({
  border: `2px solid ${entityVars.color.border}`,
  backgroundColor: entityVars.color.background,
  
  '@media': {
    '(prefers-contrast: high)': {
      borderColor: entityVars.color.text,
      backgroundColor: entityVars.color.cardBackground,
      outline: `1px solid ${entityVars.color.text}`,
      outlineOffset: '2px',
    },
  },
});

// Responsive design patterns
export const responsiveContainer = style({
  '@media': {
    '(max-width: 768px)': {
      padding: entityVars.spacing.sm,
    },
    '(min-width: 769px)': {
      padding: entityVars.spacing.md,
    },
  },
});

// Touch-friendly sizing for mobile
export const mobileOptimized = style({
  '@media': {
    '(hover: none) and (pointer: coarse)': {
      minHeight: '44px', // Touch target size
      borderRadius: entityVars.borderRadius.lg,
    },
  },
});

// Performance optimizations
export const gpuAccelerated = style({
  transform: 'translate3d(0, 0, 0)',
  backfaceVisibility: 'hidden',
  perspective: '1000px',
});

// Focus management for keyboard navigation
export const focusVisible = style({
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${entityVars.color.work}`,
      outlineOffset: '2px',
      borderRadius: entityVars.borderRadius.sm,
    },
  },
});

// Staggered animation support
export const staggered = style({
  animationFillMode: 'both',
  
  selectors: {
    '&:nth-child(1)': { animationDelay: '0ms' },
    '&:nth-child(2)': { animationDelay: '100ms' },
    '&:nth-child(3)': { animationDelay: '200ms' },
    '&:nth-child(4)': { animationDelay: '300ms' },
    '&:nth-child(5)': { animationDelay: '400ms' },
    '&:nth-child(n+6)': { animationDelay: '500ms' },
  },
});

// Dynamic stagger animation support via data attributes
globalStyle('[data-stagger-delay]', {
  animationFillMode: 'both',
});

globalStyle('[data-stagger-delay="0"]', {
  animationDelay: '0ms',
});

globalStyle('[data-stagger-delay="100"]', {
  animationDelay: '100ms',
});

globalStyle('[data-stagger-delay="200"]', {
  animationDelay: '200ms',
});

globalStyle('[data-stagger-delay="300"]', {
  animationDelay: '300ms',
});

globalStyle('[data-stagger-delay="400"]', {
  animationDelay: '400ms',
});

globalStyle('[data-stagger-delay="500"]', {
  animationDelay: '500ms',
});

globalStyle('[data-stagger-delay="600"]', {
  animationDelay: '600ms',
});

globalStyle('[data-stagger-delay="700"]', {
  animationDelay: '700ms',
});

globalStyle('[data-stagger-delay="800"]', {
  animationDelay: '800ms',
});

globalStyle('[data-stagger-delay="900"]', {
  animationDelay: '900ms',
});

globalStyle('[data-stagger-delay="1000"]', {
  animationDelay: '1000ms',
});

// Loading state transitions
export const entering = style({
  animation: `${fadeIn} ${entityVars.transition.normal} ease-out`,
});

export const exiting = style({
  animation: `${fadeIn} ${entityVars.transition.normal} ease-out reverse`,
});

// Error state styling
export const errorState = style({
  backgroundColor: entityVars.color.errorBackground,
  borderColor: entityVars.color.error,
  
  '::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: entityVars.color.error,
    opacity: 0.6,
  },
});

// Success state styling
export const successState = style({
  backgroundColor: entityVars.color.successBackground,
  borderColor: entityVars.color.success,
  
  '::before': {
    content: '"✓"',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: entityVars.color.success,
    fontSize: entityVars.fontSize.sm,
    fontWeight: entityVars.fontWeight.bold,
  },
});

// Dark mode optimizations
globalStyle('[data-mantine-color-scheme="dark"] .skeleton', {
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
});

// Reduced data mode (for slow connections)
globalStyle('@media (prefers-reduced-data: reduce)', {
  [shimmerAnimation]: {
    animation: 'none',
  },
  [waveAnimation]: {
    animation: 'none',
  },
  [pulseAnimation]: {
    animationDuration: '3s', // Slower animation for reduced data
  },
});

// Print styles
globalStyle('@media print', {
  [container]: {
    display: 'none',
  },
});

// Force-colors mode (Windows High Contrast)
globalStyle('@media (forced-colors: active)', {
  [container]: {
    borderColor: 'ButtonText',
    backgroundColor: 'ButtonFace',
  },
  [progressBar]: {
    borderColor: 'ButtonText',
    backgroundColor: 'ButtonShadow',
  },
});

// Prefers-color-scheme support
globalStyle('@media (prefers-color-scheme: dark)', {
  [progressText]: {
    color: entityVars.color.subtle,
  },
  [loadingText]: {
    color: entityVars.color.muted,
  },
});