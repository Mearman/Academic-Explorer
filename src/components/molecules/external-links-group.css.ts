import { style, styleVariants } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

export const base = style({
  display: 'flex',
  gap: entityVars.spacing.md,
  alignItems: 'flex-start',
});

export const layoutVariants = styleVariants({
  horizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  vertical: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: entityVars.spacing.md,
  },
});

export const sizeVariants = styleVariants({
  sm: {
    gap: entityVars.spacing.sm,
  },
  md: {
    gap: entityVars.spacing.md,
  },
  lg: {
    gap: entityVars.spacing.lg,
  },
});

export const linkItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  padding: entityVars.spacing.sm,
  borderRadius: entityVars.borderRadius.md,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  transition: entityVars.transition.fast,
  textDecoration: 'none',
  color: 'inherit',
  minWidth: 0, // Allow text truncation
  
  ':hover': {
    borderColor: entityVars.color.borderHover,
    backgroundColor: `color-mix(in srgb, ${entityVars.color.cardBackground} 95%, ${entityVars.color.border})`,
    transform: 'translateY(-1px)',
    boxShadow: entityVars.shadow.sm,
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

export const linkItemCompact = style({
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  fontSize: entityVars.fontSize.sm,
});

export const linkItemFull = style({
  width: '100%',
  justifyContent: 'flex-start',
});

export const iconStyle = style({
  flexShrink: 0,
  width: '16px',
  height: '16px',
});

export const labelContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  flex: 1,
  minWidth: 0,
});

export const labelStyle = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.accent,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const urlStyle = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const externalIconStyle = style({
  flexShrink: 0,
  width: '12px',
  height: '12px',
  opacity: 0.6,
});

export const emptyState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: entityVars.spacing.xl,
  color: entityVars.color.muted,
  fontSize: entityVars.fontSize.sm,
  fontStyle: 'italic',
  border: `1px dashed ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
});

export const headerStyle = style({
  marginBottom: entityVars.spacing.md,
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
});

export const countBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '20px',
  height: '20px',
  borderRadius: entityVars.borderRadius.full,
  backgroundColor: entityVars.color.work,
  color: 'white',
  fontSize: entityVars.fontSize.xs,
  fontWeight: entityVars.fontWeight.bold,
  marginLeft: entityVars.spacing.sm,
});

export const groupContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
});

export const typeGroupStyle = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const typeHeaderStyle = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: entityVars.spacing.xs,
});