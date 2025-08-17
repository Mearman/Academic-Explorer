import { style, globalStyle } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  padding: entityVars.spacing.lg,
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: `1px solid ${entityVars.color.border}`,
  paddingBottom: entityVars.spacing.md,
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.md,
});

export const queryCount = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
});

export const clearButton = style({
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  backgroundColor: entityVars.color.error,
  color: entityVars.color.cardBackground,
  border: 'none',
  borderRadius: entityVars.borderRadius.sm,
  fontSize: entityVars.fontSize.sm,
  cursor: 'pointer',
  fontWeight: entityVars.fontWeight.medium,
  
  ':hover': {
    opacity: '0.9',
  },
});

export const queryList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const queryItem = style({
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
  overflow: 'hidden',
  backgroundColor: entityVars.color.background,
});

export const success = style({
  borderLeftColor: entityVars.color.success,
  borderLeftWidth: '4px',
});

export const error = style({
  borderLeftColor: entityVars.color.error,
  borderLeftWidth: '4px',
});

export const pending = style({
  borderLeftColor: entityVars.color.warning,
  borderLeftWidth: '4px',
});

export const queryHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: entityVars.spacing.md,
  cursor: 'pointer',
  
  ':hover': {
    backgroundColor: entityVars.color.borderHover,
  },
});

export const queryInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  flex: 1,
});

export const queryText = style({
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.text,
  fontSize: entityVars.fontSize.base,
});

export const queryMeta = style({
  display: 'flex',
  gap: entityVars.spacing.md,
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
});

export const timestamp = style({
  fontFamily: 'monospace',
});

export const resultCount = style({
  color: entityVars.color.success,
  fontWeight: entityVars.fontWeight.medium,
});

export const responseTime = style({
  color: entityVars.color.work,
  fontFamily: 'monospace',
});

export const errorIndicator = style({
  color: entityVars.color.error,
  fontWeight: entityVars.fontWeight.medium,
});

export const queryActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const rerunButton = style({
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  backgroundColor: entityVars.color.work,
  color: entityVars.color.cardBackground,
  border: 'none',
  borderRadius: entityVars.borderRadius.sm,
  fontSize: entityVars.fontSize.sm,
  cursor: 'pointer',
  fontWeight: entityVars.fontWeight.medium,
  
  ':hover': {
    backgroundColor: entityVars.color.workDark,
  },
});

export const pageNavToggle = style({
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  backgroundColor: entityVars.color.muted,
  color: entityVars.color.cardBackground,
  border: 'none',
  borderRadius: entityVars.borderRadius.sm,
  fontSize: entityVars.fontSize.sm,
  cursor: 'pointer',
  fontWeight: entityVars.fontWeight.medium,
  
  ':hover': {
    opacity: '0.8',
  },
});

export const pageCount = style({
  color: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.medium,
  fontSize: entityVars.fontSize.sm,
  fontFamily: 'monospace',
});

export const expandIcon = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  transition: `transform ${entityVars.transition.normal}`,
  userSelect: 'none',
});

export const expanded = style({
  transform: 'rotate(180deg)',
});

export const queryDetails = style({
  padding: entityVars.spacing.md,
  backgroundColor: entityVars.color.borderHover,
  borderTop: `1px solid ${entityVars.color.border}`,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
});

export const errorDetails = style({
  color: entityVars.color.error,
  padding: entityVars.spacing.sm,
  backgroundColor: entityVars.color.errorBackground,
  borderRadius: entityVars.borderRadius.sm,
  fontSize: entityVars.fontSize.sm,
});

export const resultsDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const resultsSummary = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.sm,
});

export const firstResult = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
});

export const resultLink = style({
  color: entityVars.color.work,
  textDecoration: 'underline',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontSize: entityVars.fontSize.sm,
  textAlign: 'left',
  
  ':hover': {
    color: entityVars.color.workDark,
  },
});

export const paramsDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
});

export const paramsJson = style({
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
  padding: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.xs,
  fontFamily: 'monospace',
  overflow: 'auto',
  maxHeight: '200px',
  lineHeight: entityVars.lineHeight.normal,
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: entityVars.spacing.xl,
  textAlign: 'center',
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  color: entityVars.color.muted,
});

globalStyle(`${emptyState} h3`, {
  margin: `0 0 ${entityVars.spacing.sm} 0`,
  color: entityVars.color.text,
});

globalStyle(`${emptyState} p`, {
  margin: 0,
  fontSize: entityVars.fontSize.sm,
});

// Page Navigation Styles
export const pageNavigations = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  padding: `0 ${entityVars.spacing.md}`,
  borderTop: `1px solid ${entityVars.color.border}`,
  backgroundColor: entityVars.color.borderHover,
});

export const pageNavItem = style({
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
  backgroundColor: entityVars.color.background,
  marginLeft: entityVars.spacing.lg,
  position: 'relative',
  
  '::before': {
    content: '""',
    position: 'absolute',
    left: `-${entityVars.spacing.md}`,
    top: '50%',
    width: entityVars.spacing.sm,
    height: '1px',
    backgroundColor: entityVars.color.border,
  },
});

export const pageNavHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: entityVars.spacing.sm,
});

export const pageNavInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  flex: 1,
});

export const pageNavText = style({
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.text,
  fontSize: entityVars.fontSize.sm,
});

export const pageNavMeta = style({
  display: 'flex',
  gap: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
});