import { style, globalStyle, keyframes } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

// Chart container styles
export const chartContainer = style({
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
  marginBottom: entityVars.spacing.lg,
});

export const chartTitle = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  marginBottom: entityVars.spacing.lg,
  textAlign: 'center',
});

export const chart = style({
  width: '100%',
  height: 'auto',
  display: 'block',
  margin: '0 auto',
});

// Chart elements
export const chartBar = style({
  transition: entityVars.transition.normal,
  ':hover': {
    opacity: '0.8',
    stroke: entityVars.color.accent,
    strokeWidth: '1',
  },
});

export const chartLine = style({
  strokeDasharray: 'none',
  transition: entityVars.transition.normal,
  ':hover': {
    strokeWidth: '3',
  },
});

export const chartPoint = style({
  transition: entityVars.transition.normal,
  ':hover': {
    r: '6',
    stroke: entityVars.color.cardBackground,
    strokeWidth: '2',
  },
});

export const axis = style({
  stroke: entityVars.color.border,
  strokeWidth: '1',
});

export const gridLine = style({
  stroke: `${entityVars.color.muted}30`,
  strokeWidth: '1',
  strokeDasharray: '2,2',
});

export const grid = style({
  opacity: '0.5',
});

export const chartLabel = style({
  fontSize: entityVars.fontSize.xs,
  fill: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.medium,
});

export const axisLabel = style({
  fontSize: entityVars.fontSize.xs,
  fill: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.medium,
});

// Network visualization styles
export const networkContainer = style({
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
  marginBottom: entityVars.spacing.lg,
  position: 'relative',
});

export const networkTitle = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  marginBottom: entityVars.spacing.lg,
  textAlign: 'center',
});

export const network = style({
  width: '100%',
  height: 'auto',
  display: 'block',
  margin: '0 auto',
});

export const networkEdge = style({
  stroke: `${entityVars.color.muted}60`,
  transition: entityVars.transition.normal,
  ':hover': {
    stroke: entityVars.color.accent,
    opacity: '1 !important',
  },
});

export const networkNode = style({
  cursor: 'pointer',
  transition: entityVars.transition.normal,
  ':hover': {
    transform: 'scale(1.1)',
  },
});

export const nodeCircle = style({
  stroke: entityVars.color.cardBackground,
  strokeWidth: '2',
  transition: entityVars.transition.normal,
});

// Entity-specific node colors
export const nodework = style({
  fill: entityVars.color.work,
});

export const nodeauthor = style({
  fill: entityVars.color.author,
});

export const nodesource = style({
  fill: entityVars.color.source,
});

export const nodeinstitution = style({
  fill: entityVars.color.institution,
});

export const nodepublisher = style({
  fill: entityVars.color.publisher,
});

export const nodefunder = style({
  fill: entityVars.color.funder,
});

export const nodetopic = style({
  fill: entityVars.color.topic,
});

export const nodeconcept = style({
  fill: entityVars.color.concept,
});

export const nodeLabel = style({
  fontSize: entityVars.fontSize.xs,
  fill: entityVars.color.accent,
  fontWeight: entityVars.fontWeight.medium,
  textAnchor: 'middle',
  pointerEvents: 'none',
});

export const nodeMetric = style({
  fontSize: entityVars.fontSize.xs,
  fill: entityVars.color.cardBackground,
  fontWeight: entityVars.fontWeight.semibold,
  textAnchor: 'middle',
  pointerEvents: 'none',
});

// Network legend
export const networkLegend = style({
  position: 'absolute',
  top: entityVars.spacing.lg,
  right: entityVars.spacing.lg,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
  backgroundColor: `${entityVars.color.cardBackground}f0`,
  padding: entityVars.spacing.md,
  borderRadius: entityVars.borderRadius.sm,
  border: `1px solid ${entityVars.color.border}`,
});

export const legendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const legendColor = style({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  border: `1px solid ${entityVars.color.border}`,
});

// Metrics panel styles
export const metricsPanel = style({
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
  marginBottom: entityVars.spacing.lg,
});

export const metricsPanelTitle = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  marginBottom: entityVars.spacing.lg,
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.lg,
});

export const metricCard = style({
  backgroundColor: `${entityVars.color.muted}05`,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  padding: entityVars.spacing.lg,
  textAlign: 'center',
  transition: entityVars.transition.normal,
  ':hover': {
    backgroundColor: `${entityVars.color.muted}10`,
    transform: 'translateY(-2px)',
    boxShadow: entityVars.shadow.md,
  },
});

export const metricLabel = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  fontWeight: entityVars.fontWeight.medium,
  marginBottom: entityVars.spacing.sm,
});

export const metricValue = style({
  fontSize: entityVars.fontSize.xl,
  color: entityVars.color.accent,
  fontWeight: entityVars.fontWeight.bold,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: entityVars.spacing.sm,
});

export const metricTrend = style({
  fontSize: entityVars.fontSize.lg,
});

// Responsive design
globalStyle(chartContainer, {
  '@media': {
    'screen and (max-width: 768px)': {
      padding: entityVars.spacing.md,
    },
  },
});

globalStyle(networkContainer, {
  '@media': {
    'screen and (max-width: 768px)': {
      padding: entityVars.spacing.md,
    },
  },
});

globalStyle(networkLegend, {
  '@media': {
    'screen and (max-width: 768px)': {
      position: 'relative',
      top: 'auto',
      right: 'auto',
      marginTop: entityVars.spacing.lg,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
  },
});

globalStyle(metricsGrid, {
  '@media': {
    'screen and (max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    },
  },
});

// Animation styles
const fadeInKeyframes = keyframes({
  '0%': { opacity: 0, transform: 'translateY(20px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

export const fadeIn = style({
  animation: `${fadeInKeyframes} 0.5s ease-in`,
});

const slideInKeyframes = keyframes({
  '0%': { transform: 'translateX(-20px)', opacity: 0 },
  '100%': { transform: 'translateX(0)', opacity: 1 },
});

export const slideIn = style({
  animation: `${slideInKeyframes} 0.3s ease-out`,
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

// High contrast support
globalStyle(chartBar, {
  '@media': {
    '(prefers-contrast: high)': {
      stroke: entityVars.color.accent,
      strokeWidth: '2',
    },
  },
});

globalStyle(networkEdge, {
  '@media': {
    '(prefers-contrast: high)': {
      stroke: entityVars.color.accent,
      strokeWidth: '2',
    },
  },
});

globalStyle(axis, {
  '@media': {
    '(prefers-contrast: high)': {
      strokeWidth: '2',
    },
  },
});

// Print styles
globalStyle(chartContainer, {
  '@media': {
    print: {
      backgroundColor: 'white',
      border: '1px solid black',
      boxShadow: 'none',
    },
  },
});

globalStyle(networkContainer, {
  '@media': {
    print: {
      backgroundColor: 'white',
      border: '1px solid black',
      boxShadow: 'none',
    },
  },
});