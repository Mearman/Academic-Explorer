import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  maxWidth: '64rem',
  margin: '0 auto',
  padding: entityVars.spacing.xl,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xl,
});

export const header = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
});

export const badgeRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const metadataGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.md,
  
  '@media': {
    '(min-width: 768px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
  },
});

export const metadataItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const content = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
});

export const textLines = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: entityVars.spacing.md,
  
  '@media': {
    '(min-width: 768px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
    },
  },
});

export const statItem = style({
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const relatedSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
});

export const relatedItems = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const relatedItem = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: entityVars.spacing.sm,
  padding: entityVars.spacing.sm,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
});

export const relatedContent = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const compactContainer = style({
  padding: entityVars.spacing.md,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
});

export const compactContent = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: entityVars.spacing.sm,
});

export const compactText = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const compactMeta = style({
  display: 'flex',
  gap: entityVars.spacing.md,
});

export const tableCell = style({
  padding: entityVars.spacing.sm,
});