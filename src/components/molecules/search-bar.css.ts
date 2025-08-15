import { style, globalStyle } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

// Container for autocomplete search mode
export const container = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: entityVars.spacing.md,
  maxWidth: '600px',
  margin: '0 auto 2rem',
});

// Autocomplete search wrapper
export const autocomplete = style({
  width: '100%',
});

// Search hint text
export const searchHint = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  textAlign: 'center',
  fontStyle: 'italic',
});

// Traditional form layout (fallback)
export const form = style({
  display: 'flex',
  gap: entityVars.spacing.md,
  maxWidth: '600px',
  margin: '0 auto 2rem',
  alignItems: 'stretch',
});

export const input = style([
  {
    flex: 1,
    padding: `${entityVars.spacing.lg} ${entityVars.spacing.xl}`,
    fontSize: entityVars.fontSize.base,
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.lg,
    outline: 'none',
    backgroundColor: entityVars.color.cardBackground,
    color: entityVars.color.accent,
    transition: entityVars.transition.normal,
  },
  {
    ':focus': {
      borderColor: entityVars.color.work,
      boxShadow: `0 0 0 3px ${entityVars.color.work}20`,
    },
    ':hover': {
      borderColor: entityVars.color.borderHover,
    },
    '::placeholder': {
      color: entityVars.color.muted,
    },
  },
]);

export const button = style([
  {
    padding: `${entityVars.spacing.lg} ${entityVars.spacing['2xl']}`,
    fontSize: entityVars.fontSize.base,
    fontWeight: entityVars.fontWeight.semibold,
    color: entityVars.color.cardBackground,
    backgroundColor: entityVars.color.work,
    border: 'none',
    borderRadius: entityVars.borderRadius.lg,
    cursor: 'pointer',
    transition: entityVars.transition.normal,
    whiteSpace: 'nowrap',
  },
  {
    ':hover': {
      opacity: '0.9',
    },
    ':active': {
      transform: 'translateY(1px)',
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 3px ${entityVars.color.work}40`,
    },
  },
]);

// Responsive design
globalStyle(form, {
  '@media': {
    'screen and (max-width: 640px)': {
      flexDirection: 'column',
      gap: entityVars.spacing.md,
    },
  },
});

globalStyle(button, {
  '@media': {
    'screen and (max-width: 640px)': {
      width: '100%',
      justifyContent: 'center',
    },
  },
});