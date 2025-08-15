import { style, globalStyle } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
});

export const loading = style({
  padding: entityVars.spacing.xl,
});

export const metadata = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: entityVars.spacing.md,
  background: `${entityVars.color.muted}20`,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  marginBottom: entityVars.spacing.lg,
});

export const resultsInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const count = style({
  fontWeight: '600',
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.accent,
});

export const responseTime = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
});

export const loadingIndicator = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
});

export const groupBySection = style({
  marginBottom: entityVars.spacing.xl,
  padding: entityVars.spacing.lg,
  background: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
});

export const groupByTitle = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: '600',
  color: entityVars.color.accent,
  marginBottom: entityVars.spacing.md,
});

export const groupByGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.md,
});

export const groupByItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: entityVars.spacing.md,
  background: `${entityVars.color.work}10`,
  border: `1px solid ${entityVars.color.work}20`,
  borderRadius: entityVars.borderRadius.sm,
});

export const groupByKey = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: '500',
  color: entityVars.color.accent,
});

export const groupByCount = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: '600',
  color: entityVars.color.work,
});

export const results = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.lg,
});

export const resultItem = style([
  {
    padding: entityVars.spacing.lg,
    background: entityVars.color.cardBackground,
    border: `1px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  {
    ':hover': {
      borderColor: entityVars.color.work,
      boxShadow: `0 4px 8px ${entityVars.color.border}`,
      transform: 'translateY(-1px)',
    },
  },
]);

export const resultHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: entityVars.spacing.md,
  gap: entityVars.spacing.md,
});

export const resultTitle = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: '600',
  color: entityVars.color.accent,
  margin: 0,
  lineHeight: '1.4',
  flex: 1,
});

export const resultMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  flexShrink: 0,
});

export const year = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  fontWeight: '500',
});

export const openAccess = style({
  color: entityVars.color.success,
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  textTransform: 'uppercase',
});

export const authors = style({
  marginBottom: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.accent,
});

export const authorsLabel = style({
  fontWeight: '500',
  marginRight: entityVars.spacing.xs,
});

export const authorsList = style({
  color: entityVars.color.muted,
});

export const venue = style({
  marginBottom: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.accent,
});

export const venueLabel = style({
  fontWeight: '500',
  marginRight: entityVars.spacing.xs,
});

export const venueName = style({
  color: entityVars.color.muted,
  fontStyle: 'italic',
});

export const metrics = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.lg,
  marginBottom: entityVars.spacing.sm,
  flexWrap: 'wrap',
});

export const concepts = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: entityVars.spacing.xs,
});

export const links = style({
  marginBottom: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.sm,
});

export const abstract = style({
  fontSize: entityVars.fontSize.sm,
});

export const abstractToggle = style({
  cursor: 'pointer',
  color: entityVars.color.work,
  fontSize: entityVars.fontSize.sm,
  fontWeight: '500',
  userSelect: 'none',
});

export const abstractContent = style({
  marginTop: entityVars.spacing.sm,
  padding: entityVars.spacing.md,
  background: `${entityVars.color.muted}20`,
  borderRadius: entityVars.borderRadius.sm,
  color: entityVars.color.accent,
  lineHeight: '1.6',
});

export const pagination = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: entityVars.spacing.lg,
  marginTop: entityVars.spacing.xl,
  padding: entityVars.spacing.lg,
});

export const paginationButton = style({
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  background: entityVars.color.cardBackground,
  color: entityVars.color.accent,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
  fontSize: entityVars.fontSize.sm,
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  
  ':hover': {
    background: entityVars.color.work,
    color: entityVars.color.cardBackground,
    borderColor: entityVars.color.work,
  },
  
  ':disabled': {
    opacity: '0.5',
    cursor: 'not-allowed',
  },
  
  ':focus': {
    outline: 'none',
    boxShadow: `0 0 0 2px ${entityVars.color.work}40`,
  },
});

export const paginationInfo = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  fontWeight: '500',
});

export const emptyState = style({
  textAlign: 'center',
  padding: entityVars.spacing['6xl'],
  color: entityVars.color.muted,
});

export const noResults = style({
  textAlign: 'center',
  padding: entityVars.spacing['6xl'],
  background: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
});

export const retryButton = style([
  {
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
    background: entityVars.color.work,
    color: entityVars.color.cardBackground,
    border: 'none',
    borderRadius: entityVars.borderRadius.sm,
    fontSize: entityVars.fontSize.sm,
    fontWeight: '500',
    cursor: 'pointer',
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

// Responsive design
globalStyle(resultHeader, {
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },
});

globalStyle(resultMeta, {
  '@media': {
    'screen and (max-width: 768px)': {
      alignSelf: 'flex-end',
    },
  },
});

globalStyle(metrics, {
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: entityVars.spacing.sm,
    },
  },
});