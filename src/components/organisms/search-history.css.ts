import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  maxWidth: '600px',
  margin: `0 auto ${entityVars.spacing['4xl']}`,
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
  boxShadow: entityVars.shadow.sm,
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: entityVars.spacing.lg,
});

export const title = style({
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.text,
  margin: 0,
});

export const clearButton = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  borderRadius: entityVars.borderRadius.sm,
  transition: entityVars.transition.fast,
  
  ':hover': {
    backgroundColor: entityVars.color.border,
    color: entityVars.color.text,
  },
});

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: entityVars.spacing.md,
});

export const historyItem = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.full,
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.lg}`,
  cursor: 'pointer',
  transition: entityVars.transition.fast,
  
  ':hover': {
    backgroundColor: entityVars.color.border,
    borderColor: entityVars.color.borderHover,
    color: entityVars.color.text,
  },
});