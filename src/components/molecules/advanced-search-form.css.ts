import { style } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

export const form = style({
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  background: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  overflow: 'hidden',
});

export const section = style({
  padding: entityVars.spacing.xl,
  borderBottom: `1px solid ${entityVars.color.border}`,
  ':last-child': {
    borderBottom: 'none',
  },
});

export const basicSearch = style({
  display: 'flex',
  gap: entityVars.spacing.md,
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: entityVars.spacing.lg,
});

export const searchInput = style([
  {
    flex: '1 1 300px',
    padding: entityVars.spacing.md,
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.sm,
    fontSize: entityVars.fontSize.sm,
    minWidth: '200px',
  },
  {
    ':focus': {
      outline: 'none',
      borderColor: entityVars.color.work,
      boxShadow: `0 0 0 2px ${entityVars.color.work}20`,
    },
  },
]);

export const select = style([
  {
    padding: entityVars.spacing.md,
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.sm,
    fontSize: entityVars.fontSize.sm,
    background: entityVars.color.cardBackground,
    color: entityVars.color.accent,
    minWidth: '140px',
  },
  {
    ':focus': {
      outline: 'none',
      borderColor: entityVars.color.work,
      boxShadow: `0 0 0 2px ${entityVars.color.work}20`,
    },
  },
]);

export const searchButton = style([
  {
    padding: `${entityVars.spacing.md} ${entityVars.spacing.xl}`,
    background: entityVars.color.work,
    color: entityVars.color.cardBackground,
    border: 'none',
    borderRadius: entityVars.borderRadius.sm,
    fontSize: entityVars.fontSize.sm,
    fontWeight: entityVars.fontWeight.semibold,
    cursor: 'pointer',
    minWidth: '100px',
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      opacity: '0.9',
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${entityVars.color.work}40`,
    },
  },
]);

export const toggleButton = style([
  {
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
    background: 'transparent',
    color: entityVars.color.work,
    border: `1px solid ${entityVars.color.work}`,
    borderRadius: entityVars.borderRadius.sm,
    fontSize: entityVars.fontSize.xs,
    fontWeight: entityVars.fontWeight.medium,
    cursor: 'pointer',
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      background: `${entityVars.color.work}10`,
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${entityVars.color.work}40`,
    },
  },
]);

export const advancedSection = style({
  background: `${entityVars.color.muted}10`,
  padding: entityVars.spacing.xl,
});

export const group = style({
  marginBottom: entityVars.spacing['4xl'],
  ':last-child': {
    marginBottom: 0,
  },
});

export const groupTitle = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  margin: `0 0 ${entityVars.spacing.lg} 0`,
  padding: `0 0 ${entityVars.spacing.sm} 0`,
  borderBottom: `1px solid ${entityVars.color.border}`,
});

export const groupContent = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: entityVars.spacing.lg,
  alignItems: 'start',
});

export const label = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.accent,
});

export const checkboxLabel = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.accent,
  cursor: 'pointer',
});

export const dateInput = style([
  select,
  {
    minWidth: '160px',
  },
]);

export const numberInput = style([
  searchInput,
  {
    flex: 'none',
    minWidth: '120px',
    maxWidth: '200px',
  },
]);

export const textInput = style([
  searchInput,
  {
    flex: 'none',
    minWidth: '200px',
  },
]);

export const checkbox = style({
  width: '16px',
  height: '16px',
  cursor: 'pointer',
});

export const actions = style({
  display: 'flex',
  gap: entityVars.spacing.lg,
  justifyContent: 'flex-end',
  alignItems: 'center',
  marginTop: entityVars.spacing['4xl'],
  paddingTop: entityVars.spacing.xl,
  borderTop: `1px solid ${entityVars.color.border}`,
});

export const primaryButton = style([
  searchButton,
  {
    minWidth: '160px',
  },
]);

export const secondaryButton = style([
  {
    padding: `${entityVars.spacing.md} ${entityVars.spacing.xl}`,
    background: 'transparent',
    color: entityVars.color.muted,
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.sm,
    fontSize: entityVars.fontSize.sm,
    fontWeight: entityVars.fontWeight.medium,
    cursor: 'pointer',
    minWidth: '120px',
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      background: entityVars.color.muted,
      color: entityVars.color.cardBackground,
    },
    ':focus': {
      outline: 'none',
      boxShadow: `0 0 0 2px ${entityVars.color.border}`,
    },
  },
]);

// Responsive design
export const responsiveGrid = style({
  '@media': {
    'screen and (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

// Helper classes for better mobile experience
export const mobileStack = style({
  '@media': {
    'screen and (max-width: 640px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});