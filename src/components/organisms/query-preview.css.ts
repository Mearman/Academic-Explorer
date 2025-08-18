import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.md,
  overflow: 'hidden',
});

export const queryDisplay = style({
  fontSize: '0.8rem',
  lineHeight: 1.4,
  maxHeight: '120px',
  overflowY: 'auto',
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
  padding: entityVars.spacing.xs,
});

export const apiUrl = style({
  fontSize: '0.75rem',
  lineHeight: 1.3,
  wordBreak: 'break-all',
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
  padding: entityVars.spacing.xs,
});

export const previewResult = style({
  borderRadius: entityVars.borderRadius.md,
  border: `1px solid ${entityVars.color.border}`,
  padding: entityVars.spacing.sm,
  backgroundColor: entityVars.color.cardBackground,
  transition: 'all 0.2s ease',
  
  ':hover': {
    borderColor: entityVars.color.accent,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
});