import { style, styleVariants } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const base = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.md,
  borderRadius: entityVars.borderRadius.lg,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  transition: entityVars.transition.fast,
  
  ':hover': {
    borderColor: entityVars.color.borderHover,
    boxShadow: entityVars.shadow.sm,
  },
});

export const layoutVariants = styleVariants({
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vertical: {
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: entityVars.spacing.sm,
    gap: entityVars.spacing.sm,
  },
});

export const sizeVariants = styleVariants({
  sm: {
    padding: entityVars.spacing.sm,
    gap: entityVars.spacing.sm,
  },
  md: {
    padding: entityVars.spacing.md,
    gap: entityVars.spacing.md,
  },
  lg: {
    padding: entityVars.spacing.lg,
    gap: entityVars.spacing.lg,
  },
});

export const iconContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: entityVars.borderRadius.lg,
  backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)`,
  color: 'currentColor',
  flexShrink: 0,
});

export const contentContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  flex: 1,
  minWidth: 0,
});

export const valueContainer = style({
  display: 'flex',
  alignItems: 'baseline',
  gap: entityVars.spacing.sm,
  flexWrap: 'wrap',
});

export const valueStyle = style({
  fontSize: entityVars.fontSize['2xl'],
  fontWeight: entityVars.fontWeight.bold,
  lineHeight: entityVars.lineHeight.tight,
  fontVariantNumeric: 'tabular-nums',
  color: entityVars.color.accent,
});

export const labelStyle = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.muted,
  lineHeight: entityVars.lineHeight.normal,
});

export const descriptionStyle = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.subtle,
  lineHeight: entityVars.lineHeight.normal,
  marginTop: entityVars.spacing.xs,
});

export const trendContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.xs,
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
});

export const trendVariants = styleVariants({
  up: {
    color: entityVars.color.openAccess,
  },
  down: {
    color: entityVars.color.closed,
  },
  neutral: {
    color: entityVars.color.muted,
  },
});

export const changeValueStyle = style({
  fontVariantNumeric: 'tabular-nums',
});

export const accessoryContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  marginTop: entityVars.spacing.sm,
});

export const variantStyles = styleVariants({
  default: {
    backgroundColor: entityVars.color.cardBackground,
    borderColor: entityVars.color.border,
  },
  highlighted: {
    backgroundColor: `color-mix(in srgb, ${entityVars.color.work} 5%, ${entityVars.color.cardBackground})`,
    borderColor: entityVars.color.work,
  },
  muted: {
    backgroundColor: `color-mix(in srgb, ${entityVars.color.muted} 5%, ${entityVars.color.cardBackground})`,
    borderColor: entityVars.color.border,
    opacity: 0.8,
  },
});

export const clickableStyle = style({
  cursor: 'pointer',
  
  ':hover': {
    transform: 'translateY(-1px)',
    boxShadow: entityVars.shadow.md,
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

export const loadingStyle = style({
  opacity: 0.6,
  pointerEvents: 'none',
});