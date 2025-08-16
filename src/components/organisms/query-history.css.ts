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
  color: '#ffffff',
  border: 'none',
  borderRadius: entityVars.borderRadius.sm,
  fontSize: entityVars.fontSize.sm,
  cursor: 'pointer',
  fontWeight: '500',
  
  ':hover': {
    backgroundColor: '#dc2626',
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
    backgroundColor: '#f9fafb',
  },
});

export const queryInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  flex: 1,
});

export const queryText = style({
  fontWeight: '600',
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
  fontWeight: '500',
});

export const responseTime = style({
  color: entityVars.color.work,
  fontFamily: 'monospace',
});

export const errorIndicator = style({
  color: entityVars.color.error,
  fontWeight: '500',
});

export const queryActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const rerunButton = style({
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  backgroundColor: entityVars.color.work,
  color: '#ffffff',
  border: 'none',
  borderRadius: entityVars.borderRadius.sm,
  fontSize: entityVars.fontSize.sm,
  cursor: 'pointer',
  fontWeight: '500',
  
  ':hover': {
    backgroundColor: '#2563eb',
  },
});

export const expandIcon = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  transition: 'transform 0.2s ease',
  userSelect: 'none',
});

export const expanded = style({
  transform: 'rotate(180deg)',
});

export const queryDetails = style({
  padding: entityVars.spacing.md,
  backgroundColor: '#f9fafb',
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
    color: '#2563eb',
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
  lineHeight: '1.4',
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