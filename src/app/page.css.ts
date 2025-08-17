import { style } from '@vanilla-extract/css';

import { entityVars } from '../components/design-tokens.css';

export const page = style({
  minHeight: '100vh',
  backgroundColor: entityVars.color.background,
});

export const main = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: `${entityVars.spacing['4xl']} ${entityVars.spacing.xl}`,
});

export const title = style({
  fontSize: entityVars.fontSize['3xl'],
  fontWeight: entityVars.fontWeight.bold,
  textAlign: 'center',
  marginBottom: entityVars.spacing.xl,
  color: entityVars.color.text,
});

export const description = style({
  fontSize: entityVars.fontSize.lg,
  textAlign: 'center',
  marginBottom: entityVars.spacing['4xl'],
  color: entityVars.color.muted,
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: entityVars.spacing['3xl'],
  marginTop: entityVars.spacing['4xl'],
});

export const card = style({
  backgroundColor: entityVars.color.cardBackground,
  padding: entityVars.spacing['3xl'],
  borderRadius: entityVars.borderRadius.lg,
  boxShadow: entityVars.shadow.md,
});

// Search page specific styles
export const searchPageHeader = style({
  textAlign: 'center',
  marginBottom: entityVars.spacing['4xl'],
});

export const searchInterface = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: entityVars.spacing['4xl'],
  alignItems: 'start',
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
      gap: entityVars.spacing['3xl'],
    },
  },
});

export const searchInterfaceWithSidebar = style({
  display: 'grid',
  gridTemplateColumns: '300px 1fr',
  gap: entityVars.spacing['4xl'],
  alignItems: 'start',
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
      gap: entityVars.spacing['3xl'],
    },
  },
});

export const searchSidebar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xl,
  '@media': {
    'screen and (max-width: 1024px)': {
      order: 2,
    },
  },
});

export const searchMainContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing['4xl'],
  minWidth: 0, // Allow flex shrinking
  '@media': {
    'screen and (max-width: 1024px)': {
      order: 1,
    },
  },
});

export const searchResultsSection = style({
  minHeight: '400px',
});