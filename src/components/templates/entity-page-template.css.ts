import { style, styleVariants } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  minHeight: '100vh',
  backgroundColor: `color-mix(in srgb, ${entityVars.color.border} 20%, transparent)`,
});

export const pageWrapper = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: entityVars.spacing.xl,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing['2xl'],
  
  '@media': {
    'screen and (max-width: 768px)': {
      padding: entityVars.spacing.md,
      gap: entityVars.spacing.xl,
    },
  },
});

export const layoutVariants = styleVariants({
  default: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: entityVars.spacing['2xl'],
  },
  withSidebar: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: entityVars.spacing['2xl'],
    alignItems: 'start',
    
    '@media': {
      'screen and (max-width: 1024px)': {
        gridTemplateColumns: '1fr',
      },
    },
  },
  centered: {
    maxWidth: '800px',
    margin: '0 auto',
  },
});

export const breadcrumbsWrapper = style({
  marginBottom: entityVars.spacing.lg,
});

export const headerWrapper = style({
  marginBottom: entityVars.spacing['2xl'],
});

export const mainContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing['2xl'],
  minWidth: 0, // Allow content to shrink
});

export const sidebar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xl,
  position: 'sticky',
  top: entityVars.spacing.xl,
  maxHeight: 'calc(100vh - 2rem)',
  overflowY: 'auto',
  
  '@media': {
    'screen and (max-width: 1024px)': {
      position: 'static',
      maxHeight: 'none',
      overflowY: 'visible',
    },
  },
});

export const section = style({
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.borderRadius.xl,
  border: `1px solid ${entityVars.color.border}`,
  padding: entityVars.spacing.xl,
  boxShadow: entityVars.shadow.sm,
  
  // Ensure sections stack properly on mobile
  '@media': {
    'screen and (max-width: 768px)': {
      padding: entityVars.spacing.lg,
      borderRadius: entityVars.borderRadius.lg,
    },
  },
});

export const sectionHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: entityVars.spacing.lg,
  paddingBottom: entityVars.spacing.md,
  borderBottom: `1px solid ${entityVars.color.border}`,
});

export const sectionTitle = style({
  fontSize: entityVars.fontSize.xl,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.accent,
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const sectionActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
});

export const loadingContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '400px',
  color: entityVars.color.muted,
});

export const errorContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '400px',
  gap: entityVars.spacing.lg,
  textAlign: 'center',
  color: entityVars.color.muted,
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  gap: entityVars.spacing.md,
  textAlign: 'center',
  color: entityVars.color.muted,
  fontSize: entityVars.fontSize.sm,
  border: `1px dashed ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
  padding: entityVars.spacing.xl,
});

export const metricGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.lg,
  marginBottom: entityVars.spacing['2xl'],
});

export const actionsBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: entityVars.spacing.md,
  padding: entityVars.spacing.md,
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.borderRadius.lg,
  border: `1px solid ${entityVars.color.border}`,
  marginBottom: entityVars.spacing.xl,
  
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: entityVars.spacing.sm,
    },
  },
});

export const tabNavigation = style({
  display: 'flex',
  borderBottom: `2px solid ${entityVars.color.border}`,
  marginBottom: entityVars.spacing.xl,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  
  '::-webkit-scrollbar': {
    display: 'none',
  },
});

export const tabButton = style({
  padding: `${entityVars.spacing.md} ${entityVars.spacing.lg}`,
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.muted,
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid transparent',
  cursor: 'pointer',
  transition: entityVars.transition.fast,
  whiteSpace: 'nowrap',
  
  ':hover': {
    color: entityVars.color.accent,
    backgroundColor: `color-mix(in srgb, ${entityVars.color.border} 30%, transparent)`,
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

export const activeTab = style({
  color: entityVars.color.accent,
  borderBottomColor: 'currentColor',
  fontWeight: entityVars.fontWeight.semibold,
});

export const tabContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xl,
});

export const floatingActions = style({
  position: 'fixed',
  bottom: entityVars.spacing.xl,
  right: entityVars.spacing.xl,
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
  zIndex: entityVars.zIndex.fixed,
});

export const backToTop = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '48px',
  height: '48px',
  backgroundColor: entityVars.color.accent,
  color: 'white',
  borderRadius: entityVars.borderRadius.full,
  border: 'none',
  cursor: 'pointer',
  boxShadow: entityVars.shadow.lg,
  transition: entityVars.transition.fast,
  
  ':hover': {
    transform: 'scale(1.1)',
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '4px',
  },
});