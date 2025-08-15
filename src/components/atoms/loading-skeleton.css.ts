import { style, styleVariants, keyframes } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

const shimmer = keyframes({
  '0%': {
    backgroundPosition: '-200px 0',
  },
  '100%': {
    backgroundPosition: 'calc(200px + 100%) 0',
  },
});

export const base = style({
  display: 'inline-block',
  backgroundColor: entityVars.color.border,
  borderRadius: entityVars.borderRadius.sm,
  position: 'relative',
  overflow: 'hidden',
  
  '::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    background: `linear-gradient(90deg, transparent, ${entityVars.color.cardBackground}, transparent)`,
    animation: `${shimmer} 2s infinite`,
  },
});

export const sizeVariants = styleVariants({
  xs: {
    height: '12px',
  },
  sm: {
    height: '16px',
  },
  md: {
    height: '20px',
  },
  lg: {
    height: '24px',
  },
  xl: {
    height: '32px',
  },
});

export const shapeVariants = styleVariants({
  rectangle: {
    borderRadius: entityVars.borderRadius.sm,
  },
  rounded: {
    borderRadius: entityVars.borderRadius.md,
  },
  pill: {
    borderRadius: entityVars.borderRadius.full,
  },
  circle: {
    borderRadius: entityVars.borderRadius.full,
    aspectRatio: '1',
  },
  square: {
    borderRadius: entityVars.borderRadius.sm,
    aspectRatio: '1',
  },
});

export const widthVariants = styleVariants({
  xs: { width: '2rem' },
  sm: { width: '4rem' },
  md: { width: '8rem' },
  lg: { width: '12rem' },
  xl: { width: '16rem' },
  '2xl': { width: '20rem' },
  '3xl': { width: '24rem' },
  full: { width: '100%' },
});

// Preset combinations for common use cases
export const presetVariants = styleVariants({
  text: {
    height: '1em',
    width: '100%',
    borderRadius: entityVars.borderRadius.sm,
  },
  title: {
    height: '1.5em',
    width: '75%',
    borderRadius: entityVars.borderRadius.sm,
  },
  subtitle: {
    height: '1.25em',
    width: '50%',
    borderRadius: entityVars.borderRadius.sm,
  },
  button: {
    height: '2.5rem',
    width: '8rem',
    borderRadius: entityVars.borderRadius.md,
  },
  avatar: {
    height: '2.5rem',
    width: '2.5rem',
    borderRadius: entityVars.borderRadius.full,
  },
  badge: {
    height: '1.5rem',
    width: '4rem',
    borderRadius: entityVars.borderRadius.full,
  },
  card: {
    height: '8rem',
    width: '100%',
    borderRadius: entityVars.borderRadius.lg,
  },
});

export const animationVariants = styleVariants({
  pulse: {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  wave: {
    // Uses the shimmer animation defined above
  },
  none: {
    '::after': {
      display: 'none',
    },
  },
});

export const blockStyle = style({
  display: 'block',
});

export const inlineStyle = style({
  display: 'inline-block',
});

export const groupStyle = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
});

export const lineGroupStyle = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});