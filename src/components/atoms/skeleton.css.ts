import { style, keyframes } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

const pulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 },
});

export const skeleton = style({
  backgroundColor: entityVars.color.muted,
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
});

export const base = style({
  borderRadius: entityVars.borderRadius.sm,
});

export const rounded = style({
  borderRadius: '50%',
});