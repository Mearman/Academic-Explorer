import { style, keyframes } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

const spin = keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

export const spinner = style({
  display: 'inline-block',
  animation: `${spin} 1s linear infinite`,
});

export const svg = style({
  width: '100%',
  height: '100%',
  color: entityVars.color.work, // Using work color as primary
});

export const circle = style({
  opacity: 0.25,
});

export const path = style({
  opacity: 0.75,
});

export const sm = style({
  width: '1rem',
  height: '1rem',
});

export const md = style({
  width: '2rem',
  height: '2rem',
});

export const lg = style({
  width: '3rem',
  height: '3rem',
});