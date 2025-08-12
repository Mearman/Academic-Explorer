import { style } from '@vanilla-extract/css';
import { vars } from './globals.css';

export const page = style({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  padding: vars.space.large,
});

export const main = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2rem',
});

export const title = style({
  fontSize: '3rem',
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: '1rem',
});

export const description = style({
  fontSize: '1.2rem',
  textAlign: 'center',
  color: vars.color.foreground,
  opacity: 0.8,
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1.5rem',
  width: '100%',
  maxWidth: '1200px',
  marginTop: '2rem',
});

export const card = style({
  padding: '1.5rem',
  border: `1px solid rgba(0,0,0,0.1)`,
  borderRadius: '8px',
  transition: 'transform 0.2s, box-shadow 0.2s',
  selectors: {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
  },
});