import { style } from '@vanilla-extract/css';

export const form = style({
  display: 'flex',
  gap: '0.5rem',
  maxWidth: '600px',
  margin: '0 auto 2rem',
});

export const input = style({
  flex: 1,
  padding: '0.75rem 1rem',
  fontSize: '1rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.5rem',
  outline: 'none',
  
  ':focus': {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const button = style({
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  fontWeight: '600',
  color: 'white',
  backgroundColor: '#3b82f6',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  
  ':hover': {
    backgroundColor: '#2563eb',
  },
  
  ':active': {
    backgroundColor: '#1d4ed8',
  },
});