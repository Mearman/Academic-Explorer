import { style, styleVariants } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const base = style({
  display: 'inline-flex',
  alignItems: 'center',
  fontWeight: entityVars.fontWeight.medium,
  fontSize: entityVars.fontSize.sm,
  borderRadius: entityVars.borderRadius.full,
  transition: entityVars.transition.fast,
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

export const sizeVariants = styleVariants({
  xs: {
    fontSize: entityVars.fontSize.xs,
    padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
    gap: entityVars.spacing.xs,
  },
  sm: {
    fontSize: entityVars.fontSize.sm,
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
    gap: entityVars.spacing.sm,
  },
  md: {
    fontSize: entityVars.fontSize.base,
    padding: `${entityVars.spacing.md} ${entityVars.spacing.lg}`,
    gap: entityVars.spacing.sm,
  },
  lg: {
    fontSize: entityVars.fontSize.lg,
    padding: `${entityVars.spacing.lg} ${entityVars.spacing.xl}`,
    gap: entityVars.spacing.md,
  },
  xl: {
    fontSize: entityVars.fontSize.xl,
    padding: `${entityVars.spacing.xl} ${entityVars.spacing['2xl']}`,
    gap: entityVars.spacing.md,
  },
});

export const statusVariants = styleVariants({
  active: {
    backgroundColor: entityVars.color.successBackground,
    color: entityVars.color.openAccess,
    border: `1px solid ${entityVars.color.openAccess}`,
  },
  inactive: {
    backgroundColor: entityVars.color.errorBackground,
    color: entityVars.color.closed,
    border: `1px solid ${entityVars.color.closed}`,
  },
  deprecated: {
    backgroundColor: entityVars.color.warningBackground,
    color: entityVars.color.hybrid,
    border: `1px solid ${entityVars.color.hybrid}`,
  },
  pending: {
    backgroundColor: entityVars.color.infoBackground,
    color: entityVars.color.work,
    border: `1px solid ${entityVars.color.work}`,
  },
  verified: {
    backgroundColor: entityVars.color.successBackground,
    color: entityVars.color.openAccess,
    border: `1px solid ${entityVars.color.openAccess}`,
  },
});

export const dotStyle = style({
  width: '8px',
  height: '8px',
  borderRadius: entityVars.borderRadius.full,
  display: 'inline-block',
  marginRight: entityVars.spacing.sm,
});

export const dotVariants = styleVariants({
  active: {
    backgroundColor: entityVars.color.openAccess,
  },
  inactive: {
    backgroundColor: entityVars.color.closed,
  },
  deprecated: {
    backgroundColor: entityVars.color.hybrid,
  },
  pending: {
    backgroundColor: entityVars.color.work,
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  verified: {
    backgroundColor: entityVars.color.openAccess,
  },
});

export const inlineStyle = style({
  display: 'inline-flex',
  padding: 0,
  backgroundColor: 'transparent',
  border: 'none',
});

export const labelStyle = style({
  fontSize: 'inherit',
  fontWeight: 'inherit',
});