import { style } from '@vanilla-extract/css';

import { entityVars } from '../../design-tokens.css';

export const pagination = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: entityVars.spacing.lg,
  marginTop: entityVars.spacing.xl,
  padding: entityVars.spacing.lg,
});

export const paginationButton = style({
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  background: entityVars.color.cardBackground,
  color: entityVars.color.accent,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
  fontSize: entityVars.fontSize.sm,
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  
  ':hover': {
    background: entityVars.color.work,
    color: entityVars.color.cardBackground,
    borderColor: entityVars.color.work,
  },
  
  ':disabled': {
    opacity: '0.5',
    cursor: 'not-allowed',
  },
  
  ':focus': {
    outline: 'none',
    boxShadow: `0 0 0 2px ${entityVars.color.work}40`,
  },
});

export const paginationInfo = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  fontWeight: '500',
});