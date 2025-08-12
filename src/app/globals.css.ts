import { globalStyle, createGlobalTheme } from '@vanilla-extract/css';

export const vars = createGlobalTheme(':root', {
  color: {
    background: '#ffffff',
    foreground: '#171717',
  },
  space: {
    small: '4px',
    medium: '8px',
    large: '16px',
  },
  font: {
    body: 'Arial, Helvetica, sans-serif',
  },
});

// Dark mode handled by CSS custom properties

globalStyle('html, body', {
  maxWidth: '100vw',
  overflowX: 'hidden',
});

globalStyle('body', {
  color: vars.color.foreground,
  background: vars.color.background,
  fontFamily: vars.font.body,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
});

globalStyle('*', {
  boxSizing: 'border-box',
  padding: 0,
  margin: 0,
});

globalStyle('a', {
  color: 'inherit',
  textDecoration: 'none',
});

// Media queries for dark mode need to be handled differently