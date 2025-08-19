/**
 * Network Diagram Styles
 * 
 * Vanilla Extract CSS for the network diagram component with entity-based theming
 */

import { style } from '@vanilla-extract/css';

import { entityVars } from '@/components/design-tokens.css';

// ============================================================================
// Container Styles
// ============================================================================

export const container = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  borderRadius: entityVars.borderRadius.md,
  border: `1px solid ${entityVars.color.border}`,
  backgroundColor: entityVars.color.background,
});

export const svg = style({
  width: '100%',
  height: '100%',
  display: 'block',
  cursor: 'grab',
  
  ':active': {
    cursor: 'grabbing',
  },
});

// ============================================================================
// Network Elements
// ============================================================================

export const linksGroup = style({});

export const nodesGroup = style({});

export const labelsGroup = style({});

export const link = style({
  stroke: entityVars.color.border,
  strokeOpacity: 0.6,
  strokeWidth: 1,
  
  ':hover': {
    strokeOpacity: 0.8,
    strokeWidth: 2,
  },
});

export const node = style({
  fill: entityVars.color.work,
  stroke: entityVars.color.background,
  strokeWidth: 1.5,
  cursor: 'pointer',
  
  ':hover': {
    strokeWidth: 3,
    filter: 'brightness(1.1)',
  },
  
  selectors: {
    '&[data-selected="true"]': {
      stroke: entityVars.color.work,
      strokeWidth: 3,
    },
  },
});

export const label = style({
  fill: entityVars.color.text,
  fontSize: entityVars.fontSize.xs,
  fontFamily: 'system-ui, sans-serif',
  textAnchor: 'middle',
  pointerEvents: 'none',
  userSelect: 'none',
});

// ============================================================================
// State Styles
// ============================================================================

export const loadingState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: entityVars.color.muted,
  gap: entityVars.spacing.md,
});

export const errorState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: entityVars.color.error,
  gap: entityVars.spacing.sm,
  textAlign: 'center',
});

export const errorIcon = style({
  color: entityVars.color.error,
});

export const errorMessage = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.medium,
  margin: 0,
});

export const errorDescription = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  margin: 0,
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: entityVars.color.muted,
  gap: entityVars.spacing.sm,
  textAlign: 'center',
});

export const emptyIcon = style({
  color: entityVars.color.subtle,
  opacity: 0.5,
});

export const emptyMessage = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.medium,
  margin: 0,
});

export const emptyDescription = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.subtle,
  margin: 0,
});

// ============================================================================
// Tooltip Styles
// ============================================================================

export const tooltip = style({
  position: 'absolute',
  zIndex: 1000,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.sm,
  padding: entityVars.spacing.sm,
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.text,
  boxShadow: entityVars.shadow.md,
  maxWidth: '200px',
  pointerEvents: 'none',
});

export const tooltipTitle = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.text,
  marginBottom: entityVars.spacing.xs,
});

export const tooltipType = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: entityVars.spacing.xs,
});

export const tooltipMetric = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  marginBottom: entityVars.spacing.xs,
  
  ':last-child': {
    marginBottom: 0,
  },
});

// ============================================================================
// Interactive Styles
// ============================================================================

export const dragging = style({
  cursor: 'grabbing',
});

export const highlighted = style({
  filter: 'brightness(1.2)',
});

export const dimmed = style({
  opacity: 0.3,
});

// ============================================================================
// Cluster Styles
// ============================================================================

export const clusterHull = style({
  fill: 'none',
  stroke: entityVars.color.border,
  strokeWidth: 2,
  strokeDasharray: '5,5',
  opacity: 0.5,
  pointerEvents: 'none',
});

export const clusterLabel = style({
  fill: entityVars.color.muted,
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  textAnchor: 'middle',
  pointerEvents: 'none',
});