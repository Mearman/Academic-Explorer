import { style, globalStyle, keyframes } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

export const container = style({
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.lg,
  marginBottom: entityVars.spacing.lg,
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: entityVars.spacing.lg,
  paddingBottom: entityVars.spacing.sm,
  borderBottom: `1px solid ${entityVars.color.border}`,
});

export const headerLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const title = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  margin: 0,
});

export const saveButton = style([
  {
    display: 'flex',
    alignItems: 'center',
    gap: entityVars.spacing.xs,
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
    backgroundColor: `${entityVars.color.work}10`,
    border: `1px solid ${entityVars.color.work}`,
    borderRadius: entityVars.borderRadius.md,
    color: entityVars.color.work,
    fontSize: entityVars.fontSize.sm,
    fontWeight: entityVars.fontWeight.medium,
    cursor: 'pointer',
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      backgroundColor: `${entityVars.color.work}20`,
      transform: 'translateY(-1px)',
      boxShadow: entityVars.shadow.sm,
    },
    ':active': {
      transform: 'translateY(0)',
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${entityVars.color.work}40`,
    },
  },
]);

export const loading = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.xl,
  color: entityVars.color.muted,
  fontSize: entityVars.fontSize.sm,
});

export const retryButton = style([
  {
    padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
    backgroundColor: entityVars.color.work,
    color: entityVars.color.cardBackground,
    border: 'none',
    borderRadius: entityVars.borderRadius.sm,
    fontSize: entityVars.fontSize.sm,
    fontWeight: entityVars.fontWeight.medium,
    cursor: 'pointer',
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      backgroundColor: entityVars.color.workDark,
    },
  },
]);

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.xl,
  textAlign: 'center',
  color: entityVars.color.muted,
});

export const searchList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
});

export const searchItem = style([
  {
    display: 'flex',
    alignItems: 'flex-start',
    gap: entityVars.spacing.md,
    padding: entityVars.spacing.md,
    backgroundColor: `${entityVars.color.muted}05`,
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.md,
    transition: entityVars.transition.normal,
    cursor: 'pointer',
  },
  {
    ':hover': {
      backgroundColor: `${entityVars.color.work}05`,
      borderColor: entityVars.color.work,
      transform: 'translateY(-1px)',
      boxShadow: entityVars.shadow.sm,
    },
  },
]);

export const searchContent = style({
  flex: 1,
  minWidth: 0, // Allow flex shrinking
});

export const searchHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: entityVars.spacing.xs,
});

export const searchName = style({
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  margin: 0,
  lineHeight: entityVars.lineHeight.tight,
});

export const searchMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.xs,
});

export const searchDate = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.normal,
});

export const searchDescription = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.text,
  lineHeight: entityVars.lineHeight.normal,
  margin: `${entityVars.spacing.xs} 0`,
});

export const searchSummary = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  fontStyle: 'italic',
  lineHeight: entityVars.lineHeight.normal,
  margin: `${entityVars.spacing.xs} 0`,
});

export const searchTags = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: entityVars.spacing.xs,
  marginTop: entityVars.spacing.sm,
});

export const searchActions = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  flexShrink: 0,
});

export const actionButton = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: `${entityVars.color.work}10`,
    border: `1px solid ${entityVars.color.work}`,
    borderRadius: entityVars.borderRadius.sm,
    color: entityVars.color.work,
    cursor: 'pointer',
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      backgroundColor: `${entityVars.color.work}20`,
      transform: 'scale(1.05)',
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${entityVars.color.work}40`,
    },
  },
]);

export const deleteButton = style([
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: `${entityVars.color.error}10`,
    border: `1px solid ${entityVars.color.error}`,
    borderRadius: entityVars.borderRadius.sm,
    color: entityVars.color.error,
    cursor: 'pointer',
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      backgroundColor: `${entityVars.color.error}20`,
      transform: 'scale(1.05)',
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${entityVars.color.error}40`,
    },
  },
]);

export const saveDialog = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
});

export const dialogContent = style({
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
  minWidth: '400px',
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: entityVars.shadow.lg,
});

export const nameInput = style([
  {
    width: '100%',
    padding: entityVars.spacing.md,
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.md,
    fontSize: entityVars.fontSize.base,
    marginBottom: entityVars.spacing.md,
    backgroundColor: entityVars.color.cardBackground,
    color: entityVars.color.text,
  },
  {
    ':focus': {
      outline: 'none',
      borderColor: entityVars.color.work,
      boxShadow: `0 0 0 2px ${entityVars.color.work}20`,
    },
  },
]);

export const descriptionInput = style([
  {
    width: '100%',
    padding: entityVars.spacing.md,
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.md,
    fontSize: entityVars.fontSize.base,
    marginBottom: entityVars.spacing.lg,
    backgroundColor: entityVars.color.cardBackground,
    color: entityVars.color.text,
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '80px',
  },
  {
    ':focus': {
      outline: 'none',
      borderColor: entityVars.color.work,
      boxShadow: `0 0 0 2px ${entityVars.color.work}20`,
    },
  },
]);

export const dialogActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: entityVars.spacing.md,
  marginTop: entityVars.spacing.lg,
});

export const cancelButton = style([
  {
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.lg}`,
    backgroundColor: 'transparent',
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.md,
    color: entityVars.color.muted,
    fontSize: entityVars.fontSize.sm,
    fontWeight: entityVars.fontWeight.medium,
    cursor: 'pointer',
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      backgroundColor: `${entityVars.color.muted}10`,
      borderColor: entityVars.color.muted,
    },
  },
]);

export const confirmButton = style({
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.lg}`,
  backgroundColor: entityVars.color.work,
  border: `1px solid ${entityVars.color.work}`,
  borderRadius: entityVars.borderRadius.md,
  color: entityVars.color.cardBackground,
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  cursor: 'pointer',
  transition: entityVars.transition.normal,
  
  selectors: {
    '&:hover:not(:disabled)': {
      backgroundColor: entityVars.color.workDark,
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
});

// Responsive design using globalStyle
globalStyle(searchItem, {
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});

globalStyle(searchActions, {
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignSelf: 'flex-start',
    },
  },
});

globalStyle(dialogContent, {
  '@media': {
    'screen and (max-width: 768px)': {
      minWidth: 'auto',
      width: '90vw',
      margin: entityVars.spacing.md,
    },
  },
});

// Animation for new items
const fadeInKeyframes = keyframes({
  '0%': { opacity: 0, transform: 'translateY(10px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

export const fadeIn = style({
  animation: `${fadeInKeyframes} 0.3s ease-in-out`,
});

// Success state for recently used
export const recentlyUsed = style({
  borderColor: entityVars.color.openAccess,
  backgroundColor: `${entityVars.color.openAccess}05`,
});

// Print optimization
export const printHidden = style({
  '@media': {
    print: {
      display: 'none',
    },
  },
});