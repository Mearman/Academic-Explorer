import { style, styleVariants } from '@vanilla-extract/css';
import { entityVars } from '@/components/design-tokens.css';

// Main work display container
export const workContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing['4xl'],
  maxWidth: '1200px',
  margin: '0 auto',
});

// Enhanced metrics grid
export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: entityVars.spacing['3xl'],
  marginBottom: entityVars.spacing['5xl'],
  
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: entityVars.spacing.xl,
    },
    '(max-width: 480px)': {
      gridTemplateColumns: '1fr 1fr',
      gap: entityVars.spacing.lg,
    },
  },
});

// Publication details grid
export const detailsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: entityVars.spacing['3xl'],
  
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: entityVars.spacing.xl,
    },
  },
});

// Detail item styling
export const detailItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.sm,
  padding: entityVars.spacing.xl,
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.borderRadius.lg,
  border: `1px solid ${entityVars.color.border}`,
  boxShadow: entityVars.shadow.sm,
  transition: entityVars.transition.normal,
  
  ':hover': {
    borderColor: entityVars.color.borderHover,
    boxShadow: entityVars.shadow.md,
    transform: 'translateY(-2px)',
  },
});

export const detailLabel = style({
  fontWeight: entityVars.fontWeight.semibold,
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
  marginBottom: entityVars.spacing.xs,
});

export const detailValue = style({
  fontSize: entityVars.fontSize.base,
  color: entityVars.color.accent,
  lineHeight: entityVars.lineHeight.normal,
  fontWeight: entityVars.fontWeight.medium,
});

// DOI link styling
export const doiLink = style({
  color: entityVars.color.work,
  textDecoration: 'none',
  fontFamily: 'monospace',
  fontSize: entityVars.fontSize.sm,
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  backgroundColor: `color-mix(in srgb, ${entityVars.color.work} 10%, transparent)`,
  borderRadius: entityVars.borderRadius.sm,
  transition: entityVars.transition.fast,
  
  ':hover': {
    backgroundColor: `color-mix(in srgb, ${entityVars.color.work} 15%, transparent)`,
    textDecoration: 'underline',
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.work}`,
    outlineOffset: '2px',
  },
});

// Abstract section styling
export const abstractSection = style({
  backgroundColor: entityVars.color.infoBackground,
  padding: entityVars.spacing['4xl'],
  borderRadius: entityVars.borderRadius.xl,
  border: `1px solid color-mix(in srgb, ${entityVars.color.work} 20%, ${entityVars.color.border})`,
  
  '@media': {
    '(max-width: 768px)': {
      padding: entityVars.spacing['3xl'],
    },
  },
});

export const abstractText = style({
  fontSize: entityVars.fontSize.base,
  lineHeight: entityVars.lineHeight.relaxed,
  color: entityVars.color.muted,
  fontStyle: 'italic',
  textAlign: 'center',
  opacity: 0.8,
});

// Topics section styling
export const topicsContainer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: entityVars.spacing.lg,
  
  '@media': {
    '(max-width: 768px)': {
      gap: entityVars.spacing.md,
    },
  },
});

// Enhanced external links
export const externalLinksContainer = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: entityVars.spacing.xl,
  
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: entityVars.spacing.lg,
    },
  },
});

export const externalLink = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: entityVars.spacing.md,
  padding: `${entityVars.spacing.xl} ${entityVars.spacing['3xl']}`,
  backgroundColor: entityVars.color.cardBackground,
  border: `2px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.xl,
  textDecoration: 'none',
  color: entityVars.color.work,
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.semibold,
  transition: entityVars.transition.normal,
  boxShadow: entityVars.shadow.sm,
  minHeight: '60px',
  
  ':hover': {
    backgroundColor: entityVars.color.work,
    color: 'white',
    borderColor: entityVars.color.work,
    boxShadow: entityVars.shadow.lg,
    transform: 'translateY(-3px)',
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.work}`,
    outlineOffset: '3px',
  },
  
  ':active': {
    transform: 'translateY(-1px)',
  },
});

// Link type variants
export const linkVariants = styleVariants({
  publisher: {
    borderColor: entityVars.color.publisher,
    color: entityVars.color.publisher,
    
    ':hover': {
      backgroundColor: entityVars.color.publisher,
      borderColor: entityVars.color.publisher,
    },
  },
  pdf: {
    borderColor: entityVars.color.openAccess,
    color: entityVars.color.openAccess,
    
    ':hover': {
      backgroundColor: entityVars.color.openAccess,
      borderColor: entityVars.color.openAccess,
    },
  },
  openalex: {
    borderColor: entityVars.color.work,
    color: entityVars.color.work,
    
    ':hover': {
      backgroundColor: entityVars.color.work,
      borderColor: entityVars.color.work,
    },
  },
});

// Responsive typography
export const responsiveText = style({
  '@media': {
    '(max-width: 768px)': {
      fontSize: entityVars.fontSize.sm,
    },
  },
});

// Card hover effects
export const hoverCard = style({
  transition: entityVars.transition.normal,
  
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: entityVars.shadow.lg,
  },
});

// Status indicators
export const statusIndicator = styleVariants({
  open: {
    backgroundColor: entityVars.color.successBackground,
    color: entityVars.color.openAccess,
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.lg}`,
    borderRadius: entityVars.borderRadius.full,
    fontSize: entityVars.fontSize.sm,
    fontWeight: entityVars.fontWeight.semibold,
    border: `1px solid ${entityVars.color.openAccess}`,
  },
  closed: {
    backgroundColor: entityVars.color.errorBackground,
    color: entityVars.color.closed,
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.lg}`,
    borderRadius: entityVars.borderRadius.full,
    fontSize: entityVars.fontSize.sm,
    fontWeight: entityVars.fontWeight.semibold,
    border: `1px solid ${entityVars.color.closed}`,
  },
});

// Enhanced section styling
export const enhancedSection = style({
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.borderRadius.xl,
  border: `1px solid ${entityVars.color.border}`,
  overflow: 'hidden',
  boxShadow: entityVars.shadow.sm,
  transition: entityVars.transition.normal,
  
  ':hover': {
    boxShadow: entityVars.shadow.md,
  },
});

export const sectionContent = style({
  padding: entityVars.spacing['4xl'],
  
  '@media': {
    '(max-width: 768px)': {
      padding: entityVars.spacing['3xl'],
    },
  },
});

// Loading states
export const loadingContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  gap: entityVars.spacing.xl,
  color: entityVars.color.muted,
});

export const loadingText = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.medium,
  animation: 'pulse 2s infinite',
});