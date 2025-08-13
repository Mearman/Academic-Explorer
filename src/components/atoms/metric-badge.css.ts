import { style, styleVariants, createVar } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

// CSS custom properties for dynamic values
export const metricColorVar = createVar();
export const metricSizeVar = createVar();

export const base = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: entityVars.fontWeight.semibold,
  fontFamily: '"Inter", system-ui, sans-serif',
  borderRadius: entityVars.borderRadius.md,
  transition: entityVars.transition.fast,
  border: `1px solid ${entityVars.color.border}`,
  backgroundColor: entityVars.color.cardBackground,
  color: entityVars.color.accent,
  whiteSpace: 'nowrap',
  
  ':hover': {
    borderColor: entityVars.color.borderHover,
    backgroundColor: `color-mix(in srgb, ${entityVars.color.cardBackground} 90%, ${entityVars.color.border} 10%)`,
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

export const sizeVariants = styleVariants({
  xs: {
    fontSize: entityVars.fontSize.xs,
    padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
    minHeight: '20px',
  },
  sm: {
    fontSize: entityVars.fontSize.sm,
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
    minHeight: '24px',
  },
  md: {
    fontSize: entityVars.fontSize.base,
    padding: `${entityVars.spacing.md} ${entityVars.spacing.lg}`,
    minHeight: '32px',
  },
  lg: {
    fontSize: entityVars.fontSize.lg,
    padding: `${entityVars.spacing.lg} ${entityVars.spacing.xl}`,
    minHeight: '40px',
  },
  xl: {
    fontSize: entityVars.fontSize.xl,
    padding: `${entityVars.spacing.xl} ${entityVars.spacing['2xl']}`,
    minHeight: '48px',
  },
});

export const variantStyles = styleVariants({
  default: {
    backgroundColor: entityVars.color.cardBackground,
    color: entityVars.color.accent,
    borderColor: entityVars.color.border,
  },
  primary: {
    backgroundColor: entityVars.color.work,
    color: 'white',
    borderColor: entityVars.color.work,
  },
  success: {
    backgroundColor: entityVars.color.openAccess,
    color: 'white',
    borderColor: entityVars.color.openAccess,
  },
  warning: {
    backgroundColor: entityVars.color.hybrid,
    color: 'white',
    borderColor: entityVars.color.hybrid,
  },
  error: {
    backgroundColor: entityVars.color.closed,
    color: 'white',
    borderColor: entityVars.color.closed,
  },
  muted: {
    backgroundColor: `color-mix(in srgb, ${entityVars.color.muted} 10%, transparent)`,
    color: entityVars.color.muted,
    borderColor: entityVars.color.border,
  },
});

export const iconStyle = style({
  marginRight: entityVars.spacing.sm,
  display: 'inline-flex',
  alignItems: 'center',
});

export const valueStyle = style({
  fontWeight: entityVars.fontWeight.bold,
  fontVariantNumeric: 'tabular-nums',
});

export const labelStyle = style({
  fontSize: '0.9em',
  fontWeight: entityVars.fontWeight.medium,
  opacity: 0.9,
});

export const compactStyle = style({
  flexDirection: 'column',
  textAlign: 'center',
  gap: entityVars.spacing.xs,
});

export const inlineStyle = style({
  gap: entityVars.spacing.sm,
});

export const trendIndicator = style({
  marginLeft: entityVars.spacing.xs,
  fontSize: '0.75em',
  fontWeight: entityVars.fontWeight.bold,
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