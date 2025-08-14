import { style, globalStyle } from '@vanilla-extract/css';
import { entityVars } from '../components/design-tokens.css';

export const page = style({
  minHeight: '100vh',
  backgroundColor: entityVars.color.background,
});

export const main = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: `${entityVars.spacing.xl} ${entityVars.spacing.lg}`,
});

export const header = style({
  textAlign: 'center',
  marginBottom: entityVars.spacing.xxl,
  paddingBottom: entityVars.spacing.lg,
  borderBottom: `1px solid ${entityVars.color.border}`,
});

export const title = style({
  fontSize: entityVars.fontSize.xxl,
  fontWeight: entityVars.fontWeight.bold,
  color: entityVars.color.accent,
  marginBottom: entityVars.spacing.md,
  lineHeight: entityVars.lineHeight.tight,
});

export const description = style({
  fontSize: entityVars.fontSize.lg,
  color: entityVars.color.muted,
  lineHeight: entityVars.lineHeight.normal,
  maxWidth: '600px',
  margin: '0 auto',
});

export const content = style({
  display: 'grid',
  gridTemplateColumns: '250px 1fr',
  gap: entityVars.spacing.xl,
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
      gap: entityVars.spacing.lg,
    },
  },
});

export const toc = style({
  position: 'sticky',
  top: entityVars.spacing.lg,
  height: 'fit-content',
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.lg,
  '@media': {
    'screen and (max-width: 1024px)': {
      position: 'static',
      order: -1,
    },
  },
});

export const guide = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xxl,
});

export const section = style({
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
  scrollMarginTop: entityVars.spacing.xl,
});

export const feature = style({
  backgroundColor: `${entityVars.color.work}05`,
  border: `1px solid ${entityVars.color.work}20`,
  borderRadius: entityVars.borderRadius.md,
  padding: entityVars.spacing.lg,
  marginTop: entityVars.spacing.lg,
});

export const example = style({
  backgroundColor: `${entityVars.color.muted}05`,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  padding: entityVars.spacing.lg,
  marginTop: entityVars.spacing.md,
  fontFamily: 'monospace',
});

export const tip = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: entityVars.spacing.sm,
  backgroundColor: `${entityVars.color.openAccess}10`,
  border: `1px solid ${entityVars.color.openAccess}`,
  borderRadius: entityVars.borderRadius.md,
  padding: entityVars.spacing.md,
  marginTop: entityVars.spacing.lg,
  fontSize: entityVars.fontSize.sm,
});

export const subsection = style({
  marginTop: entityVars.spacing.lg,
  paddingTop: entityVars.spacing.lg,
  borderTop: `1px solid ${entityVars.color.border}`,
});

export const modeGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.md,
  marginTop: entityVars.spacing.md,
});

export const mode = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  padding: entityVars.spacing.md,
  backgroundColor: `${entityVars.color.muted}05`,
  borderRadius: entityVars.borderRadius.sm,
});

export const filterGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: entityVars.spacing.lg,
  marginTop: entityVars.spacing.lg,
});

export const filterGroup = style({
  padding: entityVars.spacing.md,
  backgroundColor: `${entityVars.color.muted}05`,
  borderRadius: entityVars.borderRadius.md,
  border: `1px solid ${entityVars.color.border}`,
});

export const exportGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: entityVars.spacing.lg,
  marginTop: entityVars.spacing.lg,
});

export const exportFormat = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.lg,
  backgroundColor: `${entityVars.color.work}05`,
  border: `1px solid ${entityVars.color.work}20`,
  borderRadius: entityVars.borderRadius.md,
  textAlign: 'center',
});

export const workflow = style({
  backgroundColor: `${entityVars.color.author}05`,
  border: `1px solid ${entityVars.color.author}20`,
  borderRadius: entityVars.borderRadius.md,
  padding: entityVars.spacing.lg,
  marginTop: entityVars.spacing.lg,
});

export const savedSearchSteps = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.lg,
  marginTop: entityVars.spacing.lg,
});

export const step = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.md,
  backgroundColor: `${entityVars.color.muted}05`,
  borderRadius: entityVars.borderRadius.md,
});

export const vizTypes = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.md,
  marginTop: entityVars.spacing.lg,
});

export const vizType = style({
  padding: entityVars.spacing.md,
  backgroundColor: `${entityVars.color.topic}05`,
  border: `1px solid ${entityVars.color.topic}20`,
  borderRadius: entityVars.borderRadius.sm,
  textAlign: 'center',
});

export const tipsList = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: entityVars.spacing.lg,
  marginTop: entityVars.spacing.lg,
});

export const tipCard = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.lg,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  textAlign: 'center',
  transition: entityVars.transition.normal,
  ':hover': {
    borderColor: entityVars.color.work,
    transform: 'translateY(-2px)',
    boxShadow: entityVars.shadow.md,
  },
});

export const troubleshoot = style({
  marginTop: entityVars.spacing.lg,
  padding: entityVars.spacing.md,
  backgroundColor: `${entityVars.color.warning}05`,
  border: `1px solid ${entityVars.color.warning}20`,
  borderRadius: entityVars.borderRadius.sm,
});

export const support = style({
  textAlign: 'center',
  backgroundColor: `${entityVars.color.accent}05`,
  border: `1px solid ${entityVars.color.accent}20`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
});

export const supportLinks = style({
  display: 'flex',
  justifyContent: 'center',
  gap: entityVars.spacing.lg,
  marginTop: entityVars.spacing.lg,
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'center',
    },
  },
});

export const supportLink = style([
  {
    display: 'flex',
    alignItems: 'center',
    gap: entityVars.spacing.xs,
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.lg}`,
    backgroundColor: entityVars.color.work,
    color: entityVars.color.cardBackground,
    textDecoration: 'none',
    borderRadius: entityVars.borderRadius.md,
    fontWeight: entityVars.fontWeight.medium,
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      backgroundColor: entityVars.color.workDark,
      transform: 'translateY(-1px)',
      boxShadow: entityVars.shadow.md,
    },
  },
]);

// Responsive adjustments using globalStyle
globalStyle(`${main}`, {
  '@media': {
    'screen and (max-width: 768px)': {
      padding: entityVars.spacing.md,
    },
  },
});

globalStyle(`${section}`, {
  '@media': {
    'screen and (max-width: 768px)': {
      padding: entityVars.spacing.md,
    },
  },
});

globalStyle(`${filterGrid}`, {
  '@media': {
    'screen and (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

globalStyle(`${exportGrid}`, {
  '@media': {
    'screen and (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

globalStyle(`${tipsList}`, {
  '@media': {
    'screen and (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

// Table of contents styling
export const tocTitle = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  marginBottom: entityVars.spacing.md,
});

export const tocList = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
});

export const tocItem = style({
  marginBottom: entityVars.spacing.xs,
});

export const tocLink = style([
  {
    color: entityVars.color.muted,
    textDecoration: 'none',
    fontSize: entityVars.fontSize.sm,
    padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
    borderRadius: entityVars.borderRadius.sm,
    display: 'block',
    transition: entityVars.transition.normal,
  },
  {
    ':hover': {
      color: entityVars.color.work,
      backgroundColor: `${entityVars.color.work}10`,
    },
  },
]);

// Code highlighting
export const code = style({
  fontFamily: 'monospace',
  fontSize: entityVars.fontSize.sm,
  backgroundColor: `${entityVars.color.muted}10`,
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  borderRadius: entityVars.borderRadius.sm,
  border: `1px solid ${entityVars.color.border}`,
});