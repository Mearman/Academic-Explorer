import { style, styleVariants } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

export const base = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.lg,
  padding: entityVars.spacing.xl,
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.borderRadius.xl,
  border: `1px solid ${entityVars.color.border}`,
  boxShadow: entityVars.shadow.sm,
});

export const topRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: entityVars.spacing.lg,
  flexWrap: 'wrap',
});

export const headerContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
  flex: 1,
  minWidth: 0, // Allow text truncation
});

export const badgeRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.md,
  flexWrap: 'wrap',
});

export const entityId = style({
  fontSize: entityVars.fontSize.xs,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  color: entityVars.color.muted,
  backgroundColor: `color-mix(in srgb, ${entityVars.color.muted} 10%, transparent)`,
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  borderRadius: entityVars.borderRadius.sm,
  border: `1px solid ${entityVars.color.border}`,
});

export const titleContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
});

export const title = style({
  fontSize: entityVars.fontSize['3xl'],
  fontWeight: entityVars.fontWeight.bold,
  lineHeight: entityVars.lineHeight.tight,
  color: entityVars.color.accent,
  margin: 0,
  wordBreak: 'break-word',
  hyphens: 'auto',
});

export const titleSizeVariants = styleVariants({
  sm: {
    fontSize: entityVars.fontSize.xl,
  },
  md: {
    fontSize: entityVars.fontSize['2xl'],
  },
  lg: {
    fontSize: entityVars.fontSize['3xl'],
  },
  xl: {
    fontSize: entityVars.fontSize['4xl'],
  },
});

export const subtitle = style({
  fontSize: entityVars.fontSize.lg,
  color: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.medium,
  lineHeight: entityVars.lineHeight.normal,
  margin: 0,
  wordBreak: 'break-word',
});

export const alternativeNames = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.subtle,
  fontStyle: 'italic',
  lineHeight: entityVars.lineHeight.normal,
});

export const actionsContainer = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: entityVars.spacing.sm,
  flexShrink: 0,
});

export const breadcrumbsContainer = style({
  marginBottom: entityVars.spacing.md,
});

export const statusContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.md,
  flexWrap: 'wrap',
  marginTop: entityVars.spacing.sm,
});

export const metaInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
  marginTop: entityVars.spacing.md,
  padding: entityVars.spacing.md,
  backgroundColor: `color-mix(in srgb, ${entityVars.color.border} 30%, transparent)`,
  borderRadius: entityVars.borderRadius.md,
  fontSize: entityVars.fontSize.sm,
});

export const metaRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: entityVars.spacing.md,
});

export const metaLabel = style({
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.muted,
});

export const metaValue = style({
  color: entityVars.color.accent,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: entityVars.fontSize.xs,
});

export const compactLayout = style({
  padding: entityVars.spacing.md,
  gap: entityVars.spacing.md,
  
  [`& ${title}`]: {
    fontSize: entityVars.fontSize.xl,
  },
  
  [`& ${subtitle}`]: {
    fontSize: entityVars.fontSize.base,
  },
});

export const centeredLayout = style({
  textAlign: 'center',
  alignItems: 'center',
  
  [`& ${topRow}`]: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  
  [`& ${actionsContainer}`]: {
    justifyContent: 'center',
  },
});

export const loadingState = style({
  opacity: 0.6,
  pointerEvents: 'none',
});

export const errorState = style({
  borderColor: entityVars.color.closed,
  backgroundColor: `color-mix(in srgb, ${entityVars.color.closed} 5%, ${entityVars.color.cardBackground})`,
});