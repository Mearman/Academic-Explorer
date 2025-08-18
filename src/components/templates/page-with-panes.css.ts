import { style } from '@vanilla-extract/css';

export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  overflow: 'hidden',
});

export const pageHeader = style({
  flexShrink: 0,
  borderBottom: '1px solid var(--mantine-color-default-border)',
  padding: 'var(--mantine-spacing-lg)',
  position: 'relative',
  zIndex: 10,
});

export const headerContent = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 'var(--mantine-spacing-lg)',
  maxWidth: '1400px',
  margin: '0 auto',
});

export const headerMain = style({
  flex: 1,
  minWidth: 0,
});

export const headerActions = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--mantine-spacing-md)',
});

export const paneControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--mantine-spacing-sm)',
  
  '@media': {
    'screen and (max-width: 1024px)': {
      display: 'none',
    },
  },
});

export const paneToggleButton = style({
  padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
  backgroundColor: 'transparent',
  border: '1px solid var(--mantine-color-default-border)',
  borderRadius: 'var(--mantine-radius-md)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--mantine-spacing-sm)',
  fontSize: 'var(--mantine-font-size-sm)',
  transition: 'all 200ms',
  
  ':hover': {
    backgroundColor: 'var(--mantine-color-gray-0)',
  },
  
  ':focus-visible': {
    outline: '2px solid var(--mantine-color-blue-6)',
    outlineOffset: '2px',
  },
  
  selectors: {
    '&[data-active="true"]': {
      backgroundColor: 'var(--mantine-color-blue-6)',
      color: 'white',
      borderColor: 'var(--mantine-color-blue-6)',
    },
  },
});

export const panesContainer = style({
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
});