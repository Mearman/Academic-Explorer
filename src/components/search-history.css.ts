import { style } from '@vanilla-extract/css';
import { vars } from '@/app/globals.css';

export const container = style({
  marginTop: '2rem',
  padding: vars.space.large,
  border: `1px solid ${vars.color.foreground}20`,
  borderRadius: '8px',
  maxWidth: '600px',
  margin: '2rem auto 0',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.space.large,
});

export const title = style({
  fontSize: '1.1rem',
  fontWeight: 'bold',
  margin: 0,
});

export const clearButton = style({
  padding: `${vars.space.small} ${vars.space.medium}`,
  fontSize: '0.9rem',
  border: `1px solid ${vars.color.foreground}40`,
  borderRadius: '4px',
  backgroundColor: 'transparent',
  color: vars.color.foreground,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: `${vars.color.foreground}10`,
  },
});

export const list = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.space.medium,
});

export const historyItem = style({
  padding: `${vars.space.small} ${vars.space.medium}`,
  fontSize: '0.95rem',
  border: 'none',
  borderRadius: '20px',
  backgroundColor: `${vars.color.foreground}10`,
  color: vars.color.foreground,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: `${vars.color.foreground}20`,
  },
});