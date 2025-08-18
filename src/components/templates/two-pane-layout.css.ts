import { style, styleVariants } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  display: 'flex',
  height: '100%',
  minHeight: 'calc(100vh - 200px)', // Account for header and padding
  position: 'relative',
  overflow: 'hidden',
});

export const pane = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  transition: `width ${entityVars.transition.normal}, opacity ${entityVars.transition.fast}`,
  position: 'relative',
});

export const paneVariants = styleVariants({
  left: {
    borderRight: `1px solid ${entityVars.color.border}`,
  },
  right: {
    borderLeft: `1px solid ${entityVars.color.border}`,
  },
});

export const paneContent = style({
  flex: 1,
  overflow: 'auto',
  padding: entityVars.spacing.lg,
  height: '100%',
  
  '@media': {
    'screen and (max-width: 768px)': {
      padding: entityVars.spacing.md,
    },
  },
});

export const collapsedPane = style({
  width: '0 !important',
  minWidth: '0 !important',
  opacity: 0,
  overflow: 'hidden',
  borderWidth: 0,
});

export const dividerContainer = style({
  '@media': {
    'screen and (max-width: 1024px)': {
      display: 'none',
    },
  },
});

export const divider = style({
  width: '8px',
  background: entityVars.color.border,
  cursor: 'col-resize',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderLeft: `1px solid ${entityVars.color.border}`,
  borderRight: `1px solid ${entityVars.color.border}`,
  transition: `background-color ${entityVars.transition.fast}`,
  
  ':hover': {
    backgroundColor: entityVars.color.accent,
  },
});

export const dividerHandle = style({
  width: '4px',
  height: '40px',
  backgroundColor: 'white',
  borderRadius: entityVars.borderRadius.sm,
  boxShadow: entityVars.shadow.sm,
  position: 'relative',
  
  '::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '2px',
    height: '20px',
    background: `repeating-linear-gradient(
      to bottom,
      ${entityVars.color.muted} 0px,
      ${entityVars.color.muted} 2px,
      transparent 2px,
      transparent 4px
    )`,
  },
});

export const collapseButton = style({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '20px',
  height: '20px',
  backgroundColor: 'white',
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.full,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  color: entityVars.color.muted,
  boxShadow: entityVars.shadow.sm,
  transition: `all ${entityVars.transition.fast}`,
  zIndex: 10,
  
  ':hover': {
    backgroundColor: entityVars.color.accent,
    color: 'white',
    borderColor: entityVars.color.accent,
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

export const collapseButtonVariants = styleVariants({
  left: {
    left: '-30px',
  },
  right: {
    right: '-30px',
  },
});

export const paneHeader = style({
  padding: entityVars.spacing.md,
  borderBottom: `1px solid ${entityVars.color.border}`,
  backgroundColor: entityVars.color.cardBackground,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: entityVars.spacing.md,
  minHeight: '60px',
});

export const paneTitle = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const paneActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const mobileTabContainer = style({
  display: 'none',
  
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'flex',
      borderBottom: `2px solid ${entityVars.color.border}`,
      marginBottom: entityVars.spacing.md,
      backgroundColor: entityVars.color.cardBackground,
    },
  },
});

export const mobileTab = style({
  flex: 1,
  padding: entityVars.spacing.md,
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.muted,
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  cursor: 'pointer',
  transition: entityVars.transition.fast,
  textAlign: 'center',
  
  ':hover': {
    color: entityVars.color.accent,
    backgroundColor: `color-mix(in srgb, ${entityVars.color.border} 30%, transparent)`,
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

export const activeMobileTab = style({
  color: entityVars.color.accent,
  borderBottomColor: 'currentColor',
  fontWeight: entityVars.fontWeight.semibold,
});

export const mobileContent = style({
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'block',
    },
  },
});

export const hiddenOnMobile = style({
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'none !important',
    },
  },
});

// Responsive variants for desktop vs mobile layout
export const desktopLayout = style({
  '@media': {
    'screen and (min-width: 769px)': {
      display: 'flex',
      flexDirection: 'row',
    },
    'screen and (max-width: 768px)': {
      display: 'block',
    },
  },
});

export const tabletOverlay = style({
  '@media': {
    'screen and (min-width: 769px) and (max-width: 1024px)': {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      backgroundColor: entityVars.color.cardBackground,
      boxShadow: entityVars.shadow.lg,
      zIndex: entityVars.zIndex.modal,
      borderLeft: `1px solid ${entityVars.color.border}`,
    },
  },
});