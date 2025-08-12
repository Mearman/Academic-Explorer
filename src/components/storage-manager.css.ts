import { style } from '@vanilla-extract/css';
import { vars } from '@/app/globals.css';

export const container = style({
  marginTop: '3rem',
  padding: vars.space.large,
  border: `1px solid ${vars.color.foreground}20`,
  borderRadius: '8px',
  maxWidth: '600px',
  margin: '3rem auto 0',
});

export const title = style({
  fontSize: '1.1rem',
  fontWeight: 'bold',
  marginBottom: vars.space.large,
});

export const metrics = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.medium,
  marginBottom: vars.space.large,
});

export const metric = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: vars.space.medium,
  backgroundColor: `${vars.color.foreground}05`,
  borderRadius: '4px',
});

export const label = style({
  fontWeight: '500',
  opacity: 0.8,
});

export const value = style({
  fontFamily: 'monospace',
  fontWeight: 'bold',
});

export const progressContainer = style({
  marginBottom: vars.space.large,
});

export const progressBar = style({
  width: '100%',
  height: '20px',
  backgroundColor: `${vars.color.foreground}10`,
  borderRadius: '10px',
  overflow: 'hidden',
  marginBottom: vars.space.small,
});

export const progressFill = style({
  height: '100%',
  backgroundColor: vars.color.foreground,
  transition: 'width 0.3s ease',
});

export const progressLabel = style({
  fontSize: '0.9rem',
  opacity: 0.7,
});

export const actions = style({
  display: 'flex',
  gap: vars.space.medium,
  flexWrap: 'wrap',
});

export const button = style({
  padding: `${vars.space.medium} ${vars.space.large}`,
  fontSize: '0.95rem',
  border: `1px solid ${vars.color.foreground}40`,
  borderRadius: '6px',
  backgroundColor: 'transparent',
  color: vars.color.foreground,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: `${vars.color.foreground}10`,
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const result = style({
  marginTop: vars.space.large,
  padding: vars.space.medium,
  backgroundColor: `${vars.color.foreground}10`,
  borderRadius: '4px',
  fontSize: '0.95rem',
});