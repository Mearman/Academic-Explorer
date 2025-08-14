import { style } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

export const container = style({
  position: 'relative',
  width: '100%',
  maxWidth: '600px',
});

export const inputWrapper = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
});

export const input = style([
  {
    width: '100%',
    padding: `${entityVars.spacing.md} ${entityVars.spacing['5xl']} ${entityVars.spacing.md} ${entityVars.spacing.lg}`,
    border: `2px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.lg,
    fontSize: entityVars.fontSize.base,
    fontWeight: entityVars.fontWeight.normal,
    color: entityVars.color.accent,
    backgroundColor: entityVars.color.cardBackground,
    transition: entityVars.transition.normal,
    outline: 'none',
  },
  {
    ':focus': {
      borderColor: entityVars.color.work,
      boxShadow: `0 0 0 3px ${entityVars.color.work}20`,
    },
    ':hover': {
      borderColor: entityVars.color.borderHover,
    },
    '::placeholder': {
      color: entityVars.color.muted,
    },
  },
]);

export const inputSuffix = style({
  position: 'absolute',
  right: entityVars.spacing.lg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
});

export const searchIcon = style({
  color: entityVars.color.muted,
});

export const suggestionsList = style({
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: entityVars.zIndex.dropdown,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  boxShadow: entityVars.shadow.lg,
  marginTop: entityVars.spacing.xs,
  maxHeight: '400px',
  overflowY: 'auto',
  padding: 0,
  margin: 0,
  listStyle: 'none',
});

export const suggestionItem = style([
  {
    borderBottom: `1px solid ${entityVars.color.border}20`,
    ':last-child': {
      borderBottom: 'none',
    },
  },
]);

export const suggestionSelected = style({
  backgroundColor: `${entityVars.color.work}10`,
});

export const suggestionLink = style([
  {
    display: 'block',
    padding: entityVars.spacing.lg,
    textDecoration: 'none',
    color: 'inherit',
    transition: entityVars.transition.fast,
  },
  {
    ':hover': {
      backgroundColor: `${entityVars.color.work}05`,
    },
    ':focus': {
      outline: 'none',
      backgroundColor: `${entityVars.color.work}10`,
    },
  },
]);

export const suggestionContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const suggestionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: entityVars.spacing.md,
});

export const suggestionName = style({
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.accent,
  flex: 1,
  lineHeight: entityVars.lineHeight.tight,
});

export const suggestionHint = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  lineHeight: entityVars.lineHeight.normal,
  marginTop: `-${entityVars.spacing.xs}`,
});

export const suggestionMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.md,
  flexWrap: 'wrap',
});

export const metricBadge = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.xs,
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.medium,
});

// Responsive design
export const responsiveContainer = style({
  '@media': {
    'screen and (max-width: 640px)': {
      selectors: {
        [`${suggestionHeader}`]: {
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: entityVars.spacing.sm,
        },
        [`${suggestionMeta}`]: {
          justifyContent: 'flex-start',
        },
      },
    },
  },
});

// Accessibility enhancements
export const visuallyHidden = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});

// Loading state
export const loadingState = style({
  padding: entityVars.spacing.xl,
  textAlign: 'center',
  color: entityVars.color.muted,
  fontSize: entityVars.fontSize.sm,
});

// Empty state
export const emptyState = style({
  padding: entityVars.spacing.xl,
  textAlign: 'center',
  color: entityVars.color.muted,
  fontSize: entityVars.fontSize.sm,
  fontStyle: 'italic',
});

// High contrast mode support
export const highContrast = style({
  '@media': {
    '(prefers-contrast: high)': {
      selectors: {
        [`${input}`]: {
          borderWidth: '3px',
        },
        [`${suggestionsList}`]: {
          border: `2px solid ${entityVars.color.accent}`,
        },
        [`${suggestionSelected}`]: {
          backgroundColor: entityVars.color.accent,
          color: entityVars.color.cardBackground,
        },
      },
    },
  },
});

// Reduced motion support
export const reducedMotion = style({
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        [`${input}`]: {
          transition: 'none',
        },
        [`${suggestionLink}`]: {
          transition: 'none',
        },
      },
    },
  },
});