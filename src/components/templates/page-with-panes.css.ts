import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  overflow: 'hidden',
});

export const pageHeader = style({
  flexShrink: 0,
  backgroundColor: entityVars.color.cardBackground,
  borderBottom: `1px solid ${entityVars.color.border}`,
  padding: entityVars.spacing.lg,
  position: 'relative',
  zIndex: 10,
});

export const headerContent = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: entityVars.spacing.lg,
  maxWidth: '1400px',
  margin: '0 auto',
});

export const headerMain = style({
  flex: 1,
  minWidth: 0, // Allow flex shrinking
});

export const headerActions = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.md,
});

export const paneControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  
  '@media': {
    'screen and (max-width: 1024px)': {
      display: 'none', // Hide on mobile where panes become tabs
    },
  },
});

export const paneToggleButton = style({
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  backgroundColor: 'transparent',
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.text,
  transition: `all ${entityVars.transition.fast}`,
  
  ':hover': {
    backgroundColor: entityVars.color.background,
    borderColor: entityVars.color.accent,
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
  
  selectors: {
    '&[data-active="true"]': {
      backgroundColor: entityVars.color.accent,
      color: 'white',
      borderColor: entityVars.color.accent,
    },
  },
});

export const panesContainer = style({
  flex: 1,
  minHeight: 0, // Allow flex shrinking
  overflow: 'hidden',
});