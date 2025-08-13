import { style, styleVariants } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

export const base = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.lg,
  borderRadius: entityVars.borderRadius.lg,
  border: '1px solid',
  fontSize: entityVars.fontSize.sm,
  lineHeight: entityVars.lineHeight.normal,
});

export const severityVariants = styleVariants({
  error: {
    backgroundColor: entityVars.color.errorBackground,
    borderColor: entityVars.color.closed,
    color: entityVars.color.closed,
  },
  warning: {
    backgroundColor: entityVars.color.warningBackground,
    borderColor: entityVars.color.hybrid,
    color: entityVars.color.hybrid,
  },
  info: {
    backgroundColor: entityVars.color.infoBackground,
    borderColor: entityVars.color.work,
    color: entityVars.color.work,
  },
  success: {
    backgroundColor: entityVars.color.successBackground,
    borderColor: entityVars.color.openAccess,
    color: entityVars.color.openAccess,
  },
});

export const sizeVariants = styleVariants({
  sm: {
    padding: entityVars.spacing.md,
    fontSize: entityVars.fontSize.xs,
    gap: entityVars.spacing.sm,
  },
  md: {
    padding: entityVars.spacing.lg,
    fontSize: entityVars.fontSize.sm,
    gap: entityVars.spacing.md,
  },
  lg: {
    padding: entityVars.spacing.xl,
    fontSize: entityVars.fontSize.base,
    gap: entityVars.spacing.lg,
  },
});

export const iconStyle = style({
  flexShrink: 0,
  marginTop: '2px', // Slight alignment adjustment
  fontSize: '1.2em',
});

export const contentStyle = style({
  flex: 1,
  minWidth: 0, // Allow text to wrap properly
});

export const titleStyle = style({
  fontWeight: entityVars.fontWeight.semibold,
  marginBottom: entityVars.spacing.xs,
  fontSize: '1.1em',
});

export const messageStyle = style({
  lineHeight: entityVars.lineHeight.relaxed,
  wordBreak: 'break-word',
});

export const detailsStyle = style({
  marginTop: entityVars.spacing.sm,
  fontSize: '0.9em',
  opacity: 0.8,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  backgroundColor: 'rgba(0, 0, 0, 0.05)',
  padding: entityVars.spacing.sm,
  borderRadius: entityVars.borderRadius.sm,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
});

export const actionsStyle = style({
  marginTop: entityVars.spacing.md,
  display: 'flex',
  gap: entityVars.spacing.sm,
  flexWrap: 'wrap',
});

export const buttonStyle = style({
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  border: '1px solid currentColor',
  borderRadius: entityVars.borderRadius.md,
  backgroundColor: 'transparent',
  color: 'inherit',
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  cursor: 'pointer',
  transition: entityVars.transition.fast,
  
  ':hover': {
    backgroundColor: 'currentColor',
    color: entityVars.color.cardBackground,
  },
  
  ':focus-visible': {
    outline: `2px solid currentColor`,
    outlineOffset: '2px',
  },
});

export const dismissButtonStyle = style({
  position: 'absolute',
  top: entityVars.spacing.md,
  right: entityVars.spacing.md,
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: entityVars.spacing.xs,
  borderRadius: entityVars.borderRadius.sm,
  transition: entityVars.transition.fast,
  
  ':hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  
  ':focus-visible': {
    outline: `2px solid currentColor`,
    outlineOffset: '2px',
  },
});

export const dismissibleStyle = style({
  position: 'relative',
  paddingRight: entityVars.spacing['5xl'], // Make room for dismiss button
});

export const compactStyle = style({
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  fontSize: entityVars.fontSize.xs,
  gap: entityVars.spacing.sm,
});

export const inlineStyle = style({
  display: 'inline-flex',
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  fontSize: entityVars.fontSize.xs,
  gap: entityVars.spacing.xs,
  borderRadius: entityVars.borderRadius.md,
});