import { style } from '@vanilla-extract/css';

import { entityVars } from '../../design-tokens.css';

export const groupBySection = style({
  marginBottom: entityVars.spacing.xl,
  padding: entityVars.spacing.lg,
  background: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
});

export const groupByTitle = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: '600',
  color: entityVars.color.accent,
  marginBottom: entityVars.spacing.md,
});

export const groupByGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.md,
});

export const groupByItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: entityVars.spacing.md,
  background: `${entityVars.color.work}10`,
  border: `1px solid ${entityVars.color.work}20`,
  borderRadius: entityVars.borderRadius.sm,
});

export const groupByKey = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: '500',
  color: entityVars.color.accent,
});

export const groupByCount = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: '600',
  color: entityVars.color.work,
});