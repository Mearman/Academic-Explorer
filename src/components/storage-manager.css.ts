import { style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '600px',
  margin: '2rem auto',
  padding: '1.5rem',
  backgroundColor: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
});

export const title = style({
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '1rem',
  margin: 0,
});

export const metrics = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginBottom: '1.5rem',
});

export const metric = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0',
  borderBottom: '1px solid #f3f4f6',
});

export const label = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#6b7280',
});

export const value = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
});

export const progressContainer = style({
  marginBottom: '1.5rem',
});

export const progressBar = style({
  width: '100%',
  height: '0.5rem',
  backgroundColor: '#f3f4f6',
  borderRadius: '0.25rem',
  overflow: 'hidden',
  marginBottom: '0.5rem',
});

export const progressFill = style({
  height: '100%',
  backgroundColor: '#3b82f6',
  transition: 'width 0.3s ease',
});

export const progressLabel = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const actions = style({
  display: 'flex',
  gap: '0.75rem',
  marginBottom: '1rem',
  flexWrap: 'wrap',
});

export const button = style({
  padding: '0.5rem 1rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  backgroundColor: '#f9fafb',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  
  ':hover': {
    backgroundColor: '#f3f4f6',
    borderColor: '#9ca3af',
  },
  
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const result = style({
  padding: '0.75rem',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  color: '#15803d',
});