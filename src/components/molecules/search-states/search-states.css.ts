import { style } from '@vanilla-extract/css';

import { entityVars } from '../../design-tokens.css';

export const container = style({
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
});

export const loading = style({
  padding: entityVars.spacing.xl,
});

export const emptyState = style({
  textAlign: 'center',
  padding: entityVars.spacing['6xl'],
  color: entityVars.color.muted,
});

export const noResults = style({
  textAlign: 'center',
  padding: entityVars.spacing['6xl'],
  background: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
});