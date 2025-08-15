import { style } from '@vanilla-extract/css';

import { entityVars } from '../../design-tokens.css';

export const metadata = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: entityVars.spacing.md,
  background: `${entityVars.color.muted}20`,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  marginBottom: entityVars.spacing.lg,
});

export const resultsInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const count = style({
  fontWeight: '600',
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.accent,
});

export const responseTime = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
});

export const loadingIndicator = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
});