import { style } from '@vanilla-extract/css';
import { vars } from '@/app/globals.css';

export const form = style({
  display: 'flex',
  gap: vars.space.medium,
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
});

export const input = style({
  flex: 1,
  padding: `${vars.space.medium} ${vars.space.large}`,
  fontSize: '1rem',
  border: `2px solid ${vars.color.foreground}20`,
  borderRadius: '8px',
  backgroundColor: 'transparent',
  color: vars.color.foreground,
  transition: 'border-color 0.2s',
  ':focus': {
    outline: 'none',
    borderColor: vars.color.foreground,
  },
  '::placeholder': {
    opacity: 0.6,
  },
});

export const button = style({
  padding: `${vars.space.medium} ${vars.space.large}`,
  fontSize: '1rem',
  fontWeight: 'bold',
  border: 'none',
  borderRadius: '8px',
  backgroundColor: vars.color.foreground,
  color: vars.color.background,
  cursor: 'pointer',
  transition: 'opacity 0.2s',
  ':hover': {
    opacity: 0.9,
  },
  ':active': {
    transform: 'scale(0.98)',
  },
});