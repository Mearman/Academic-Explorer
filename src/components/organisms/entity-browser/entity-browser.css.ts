import { style } from '@vanilla-extract/css';

import { entityVars } from '@/components/design-tokens.css';

export const container = style({
  maxWidth: '100%',
  margin: '0 auto',
});

export const resultItem = style({
  height: '100%',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  cursor: 'pointer',
  
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: entityVars.shadow.md,
  },
});

export const filterSection = style({
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  padding: entityVars.spacing.lg,
});

export const filterRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.lg,
  alignItems: 'end',
});

export const searchSection = style({
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
  padding: entityVars.spacing.md,
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: entityVars.spacing.xs,
  marginTop: entityVars.spacing.xs,
});

export const entityMetric = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.medium,
});

export const paginationContainer = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: entityVars.spacing.xl,
  padding: entityVars.spacing.lg,
  borderTop: `1px solid ${entityVars.color.border}`,
});

export const emptyState = style({
  textAlign: 'center',
  padding: entityVars.spacing['4xl'],
  color: entityVars.color.muted,
});

export const loadingState = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: entityVars.spacing.lg,
});

export const errorState = style({
  textAlign: 'center',
  padding: entityVars.spacing['4xl'],
  backgroundColor: entityVars.color.errorBackground,
  border: `1px solid ${entityVars.color.error}`,
  borderRadius: entityVars.borderRadius.md,
  color: entityVars.color.error,
});

export const sortControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.md,
  flexWrap: 'wrap',
});

export const activeFiltersContainer = style({
  padding: entityVars.spacing.md,
  backgroundColor: entityVars.color.infoBackground,
  borderRadius: entityVars.borderRadius.sm,
  border: `1px solid ${entityVars.color.border}`,
});

export const filterBadge = style({
  fontSize: entityVars.fontSize.xs,
  
  ':hover': {
    backgroundColor: entityVars.color.infoBackground,
  },
});