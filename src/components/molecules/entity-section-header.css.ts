import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const sectionHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: entityVars.spacing.lg,
  paddingBottom: entityVars.spacing.md,
  borderBottom: `1px solid ${entityVars.color.border}`,
});

export const sectionTitle = style({
  fontSize: entityVars.fontSize.xl,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const sectionActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});