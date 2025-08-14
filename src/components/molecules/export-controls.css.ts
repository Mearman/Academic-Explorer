import { style, globalStyle, keyframes } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

export const container = style({
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
  marginBottom: entityVars.spacing.lg,
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: entityVars.spacing.lg,
  paddingBottom: entityVars.spacing.md,
  borderBottom: `1px solid ${entityVars.color.border}`,
});

export const info = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const count = style({
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.accent,
});

export const total = style({
  color: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.normal,
});

export const formats = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: entityVars.spacing.md,
});

export const formatButton = style([
  {
    display: 'flex',
    alignItems: 'center',
    gap: entityVars.spacing.md,
    padding: entityVars.spacing.lg,
    backgroundColor: `${entityVars.color.muted}05`,
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.md,
    cursor: 'pointer',
    transition: entityVars.transition.normal,
    textAlign: 'left',
    width: '100%',
  
    selectors: {
      '&:hover:not(:disabled)': {
        backgroundColor: `${entityVars.color.work}10`,
        borderColor: entityVars.color.work,
        transform: 'translateY(-1px)',
        boxShadow: entityVars.shadow.md,
      },
      '&:active:not(:disabled)': {
        transform: 'translateY(0)',
        boxShadow: entityVars.shadow.sm,
      },
      '&:disabled': {
        opacity: '0.6',
        cursor: 'not-allowed',
        transform: 'none',
      },
      '&:focus': {
        outline: 'none',
        boxShadow: `0 0 0 2px ${entityVars.color.work}40`,
      },
    },
  },
]);

export const formatButtonLoading = style({
  backgroundColor: `${entityVars.color.work}15`,
  borderColor: entityVars.color.work,
});

export const formatInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  flex: 1,
});

export const formatName = style({
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
});

export const formatDesc = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  lineHeight: entityVars.lineHeight.normal,
});

export const emptyState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: entityVars.spacing.sm,
  padding: entityVars.spacing.xl,
  color: entityVars.color.muted,
  fontSize: entityVars.fontSize.sm,
  fontStyle: 'italic',
  textAlign: 'center',
});

// Responsive design
globalStyle(formats, {
  '@media': {
    'screen and (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

globalStyle(formatButton, {
  '@media': {
    'screen and (max-width: 768px)': {
      padding: entityVars.spacing.md,
    },
  },
});

// Animation for loading state
const pulseKeyframes = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 },
});

export const pulse = style({
  animation: `${pulseKeyframes} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
});

// Success indicator
export const success = style({
  backgroundColor: `${entityVars.color.openAccess}10`,
  borderColor: entityVars.color.openAccess,
  color: entityVars.color.openAccess,
});

// High contrast mode support
globalStyle(formatButton, {
  '@media': {
    '(prefers-contrast: high)': {
      borderWidth: '2px',
    },
  },
});

globalStyle(formatButtonLoading, {
  '@media': {
    '(prefers-contrast: high)': {
      backgroundColor: entityVars.color.work,
      color: entityVars.color.cardBackground,
    },
  },
});

// Print optimization
export const printOptimized = style({
  '@media': {
    print: {
      display: 'none',
    },
  },
});