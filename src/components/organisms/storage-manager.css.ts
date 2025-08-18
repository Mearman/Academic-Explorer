import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  maxWidth: '600px',
  margin: `${entityVars.spacing['4xl']} auto`,
  padding: `${entityVars.spacing['3xl']}`,
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.borderRadius.lg,
  boxShadow: entityVars.shadow.md,
});

export const title = style({
  fontSize: entityVars.fontSize.xl,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.text,
  marginBottom: entityVars.spacing.xl,
  margin: 0,
});

export const metrics = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.lg,
  marginBottom: entityVars.spacing['3xl'],
});

export const metric = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${entityVars.spacing.md} 0`,
  borderBottom: `1px solid ${entityVars.color.border}`,
});

export const label = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.muted,
});

export const value = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.text,
});

export const progressContainer = style({
  marginBottom: entityVars.spacing['3xl'],
});

export const progressBar = style({
  width: '100%',
  height: entityVars.spacing.md,
  backgroundColor: entityVars.color.border,
  borderRadius: entityVars.borderRadius.sm,
  overflow: 'hidden',
  marginBottom: entityVars.spacing.md,
});

export const progressFill = style({
  height: '100%',
  backgroundColor: entityVars.color.work,
  transition: `width ${entityVars.transition.normal}`,
});

export const progressLabel = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
});

export const actions = style({
  display: 'flex',
  gap: entityVars.spacing.lg,
  marginBottom: entityVars.spacing.xl,
  flexWrap: 'wrap',
});

export const button = style({
  padding: `${entityVars.spacing.md} ${entityVars.spacing.xl}`,
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.text,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  cursor: 'pointer',
  
  ':hover': {
    backgroundColor: entityVars.color.border,
    borderColor: entityVars.color.borderHover,
  },
  
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const result = style({
  padding: entityVars.spacing.lg,
  backgroundColor: entityVars.color.successBackground,
  border: `1px solid ${entityVars.color.success}`,
  borderRadius: entityVars.borderRadius.md,
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.success,
});