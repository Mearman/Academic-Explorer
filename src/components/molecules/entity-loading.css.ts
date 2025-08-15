import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: entityVars.spacing.lg,
});

export const content = style({
  textAlign: 'center',
});

export const spinner = style({
  margin: '0 auto',
  marginBottom: entityVars.spacing.md,
});

export const message = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.accent,
  marginBottom: entityVars.spacing.sm,
});

export const entityId = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
});

export const code = style({
  backgroundColor: entityVars.color.border,
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  borderRadius: entityVars.borderRadius.sm,
  fontFamily: 'monospace',
});