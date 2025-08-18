import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const headerContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
});

export const topRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: entityVars.spacing.lg,
});

export const titleSection = style({
  flex: 1,
  minWidth: 0, // Allow flex shrinking
});

export const badgeRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  marginBottom: entityVars.spacing.sm,
  flexWrap: 'wrap',
});

export const entityId = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  fontFamily: 'monospace',
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
});

export const title = style({
  fontSize: entityVars.fontSize['3xl'],
  fontWeight: entityVars.fontWeight.bold,
  lineHeight: entityVars.lineHeight.tight,
  color: entityVars.color.text,
  margin: 0,
  marginBottom: entityVars.spacing.xs,
  wordBreak: 'break-word',
});

export const subtitle = style({
  fontSize: entityVars.fontSize.lg,
  color: entityVars.color.muted,
  margin: 0,
  marginBottom: entityVars.spacing.sm,
});

export const alternativeNames = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.subtle,
  fontStyle: 'italic',
});

export const statusContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  flexWrap: 'wrap',
  marginTop: entityVars.spacing.sm,
});

export const quickActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  flexShrink: 0,
});

export const externalLinksRow = style({
  marginTop: entityVars.spacing.sm,
});

export const metaRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  padding: `${entityVars.spacing.xs} 0`,
  borderTop: `1px solid ${entityVars.color.border}`,
  marginTop: entityVars.spacing.sm,
  
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: entityVars.spacing.xs,
    },
  },
});

export const metaInfo = style({
  display: 'flex',
  gap: entityVars.spacing.md,
  
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      gap: entityVars.spacing.xs,
    },
  },
});

export const metaItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.xs,
});

export const metaLabel = style({
  fontWeight: entityVars.fontWeight.medium,
});

export const metaValue = style({
  color: entityVars.color.text,
});