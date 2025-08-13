import { style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '600px',
  margin: '0 auto 2rem',
  backgroundColor: 'white',
  borderRadius: '0.5rem',
  padding: '1rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.75rem',
});

export const title = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: '#374151',
  margin: 0,
});

export const clearButton = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '0.25rem 0.5rem',
  borderRadius: '0.25rem',
  
  ':hover': {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
});

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

export const historyItem = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '1rem',
  padding: '0.25rem 0.75rem',
  cursor: 'pointer',
  
  ':hover': {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    color: '#374151',
  },
});