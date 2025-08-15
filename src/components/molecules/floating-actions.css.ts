import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const floatingActions = style({
  position: 'fixed',
  bottom: entityVars.spacing.xl,
  right: entityVars.spacing.xl,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
  zIndex: entityVars.zIndex.fixed,
});

export const backToTop = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '48px',
  height: '48px',
  backgroundColor: entityVars.color.accent,
  color: 'white',
  borderRadius: entityVars.borderRadius.full,
  border: 'none',
  cursor: 'pointer',
  boxShadow: entityVars.shadow.md,
  transition: 'all 0.2s ease',
  
  ':hover': {
    backgroundColor: `color-mix(in srgb, ${entityVars.color.accent} 80%, black)`,
    transform: 'translateY(-2px)',
    boxShadow: entityVars.shadow.lg,
  },
  
  ':active': {
    transform: 'translateY(0)',
  },
});