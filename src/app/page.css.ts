import { style } from '@vanilla-extract/css';

export const page = style({
  minHeight: '100vh',
  backgroundColor: '#f9fafb',
});

export const main = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem 1rem',
});

export const title = style({
  fontSize: '2.25rem',
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: '1rem',
  color: '#1f2937',
});

export const description = style({
  fontSize: '1.125rem',
  textAlign: 'center',
  marginBottom: '2rem',
  color: '#6b7280',
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem',
  marginTop: '2rem',
});

export const card = style({
  backgroundColor: 'white',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
});