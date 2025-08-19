/**
 * Graph Engine Container Component Styles
 * 
 * Comprehensive styling for graph engine selector and configuration UI components.
 * Uses Vanilla Extract with design tokens for consistency and responsive design.
 */

import { style, styleVariants, createVar } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { entityVars } from '../../design-tokens.css';

// ============================================================================
// CSS Variables
// ============================================================================

const badgeColorVar = createVar();
const performanceColorVar = createVar();
const capabilityIntensityVar = createVar();

// ============================================================================
// Graph Engine Selector Styles
// ============================================================================

export const engineSelector = style({
  position: 'relative',
  display: 'inline-block',
  minWidth: '280px',
  maxWidth: '400px',
});

export const selectorButton = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: `${entityVars.spacing.lg} ${entityVars.spacing.xl}`,
    backgroundColor: entityVars.color.cardBackground,
    border: `2px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.lg,
    fontSize: entityVars.fontSize.base,
    fontWeight: entityVars.fontWeight.medium,
    color: entityVars.color.text,
    cursor: 'pointer',
    transition: `all ${entityVars.transition.normal}`,
    outline: 'none',
    
    ':hover': {
      borderColor: entityVars.color.borderHover,
      backgroundColor: entityVars.color.background,
      transform: 'translateY(-1px)',
      boxShadow: entityVars.shadow.md,
    },
    
    ':focus-visible': {
      borderColor: entityVars.color.accent,
      boxShadow: `0 0 0 3px ${entityVars.color.accent}33`,
    },
    
    ':active': {
      transform: 'translateY(0)',
    },
  },
  variants: {
    open: {
      true: {
        borderColor: entityVars.color.accent,
        borderBottomLeftRadius: entityVars.borderRadius.sm,
        borderBottomRightRadius: entityVars.borderRadius.sm,
        zIndex: entityVars.zIndex.dropdown + 1,
      },
    },
    disabled: {
      true: {
        opacity: 0.6,
        cursor: 'not-allowed',
        ':hover': {
          borderColor: entityVars.color.border,
          backgroundColor: entityVars.color.cardBackground,
          transform: 'none',
          boxShadow: 'none',
        },
      },
    },
  },
});

export const selectorButtonContent = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.lg,
  flex: 1,
  minWidth: 0,
});

export const selectorIcon = style({
  width: '24px',
  height: '24px',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: entityVars.borderRadius.sm,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
});

export const selectorLabel = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: entityVars.spacing.xs,
  minWidth: 0,
});

export const selectorTitle = style({
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.text,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
});

export const selectorDescription = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
});

export const chevronIcon = style({
  width: '16px',
  height: '16px',
  color: entityVars.color.muted,
  transition: `transform ${entityVars.transition.normal}`,
  flexShrink: 0,
  
  selectors: {
    [`${selectorButton.classNames.variants.open.true} &`]: {
      transform: 'rotate(180deg)',
    },
  },
});

// ============================================================================
// Dropdown Styles
// ============================================================================

export const dropdown = style({
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  backgroundColor: entityVars.color.cardBackground,
  border: `2px solid ${entityVars.color.accent}`,
  borderTop: 'none',
  borderRadius: `0 0 ${entityVars.borderRadius.lg} ${entityVars.borderRadius.lg}`,
  boxShadow: entityVars.shadow.lg,
  zIndex: entityVars.zIndex.dropdown,
  maxHeight: '400px',
  overflowY: 'auto',
  overflowX: 'hidden',
});

export const dropdownOption = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: entityVars.spacing.lg,
    padding: `${entityVars.spacing.lg} ${entityVars.spacing.xl}`,
    cursor: 'pointer',
    transition: `all ${entityVars.transition.fast}`,
    borderBottom: `1px solid ${entityVars.color.border}`,
    
    ':hover': {
      backgroundColor: entityVars.color.background,
    },
    
    ':focus': {
      backgroundColor: entityVars.color.background,
      outline: 'none',
    },
    
    ':last-child': {
      borderBottom: 'none',
    },
  },
  variants: {
    selected: {
      true: {
        backgroundColor: entityVars.color.accent + '10',
        color: entityVars.color.accent,
        fontWeight: entityVars.fontWeight.semibold,
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        cursor: 'not-allowed',
        ':hover': {
          backgroundColor: 'transparent',
        },
      },
    },
    comingSoon: {
      true: {
        opacity: 0.7,
        position: 'relative',
        ':after': {
          content: '"Coming Soon"',
          position: 'absolute',
          right: entityVars.spacing.xl,
          fontSize: entityVars.fontSize.xs,
          fontWeight: entityVars.fontWeight.medium,
          color: entityVars.color.muted,
          backgroundColor: entityVars.color.background,
          padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
          borderRadius: entityVars.borderRadius.sm,
          border: `1px solid ${entityVars.color.border}`,
        },
      },
    },
  },
});

export const optionContent = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: entityVars.spacing.xs,
  flex: 1,
  minWidth: 0,
});

export const optionTitle = style({
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.medium,
  color: entityVars.color.text,
  lineHeight: entityVars.lineHeight.tight,
});

export const optionDescription = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  lineHeight: entityVars.lineHeight.normal,
  maxWidth: '100%',
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

// ============================================================================
// Capability Badges Styles
// ============================================================================

export const capabilityBadges = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: entityVars.spacing.sm,
  alignItems: 'center',
  padding: `${entityVars.spacing.md} 0`,
});

export const capabilityBadge = recipe({
  base: {
    vars: {
      [badgeColorVar]: entityVars.color.muted,
    },
    display: 'inline-flex',
    alignItems: 'center',
    gap: entityVars.spacing.xs,
    padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
    fontSize: entityVars.fontSize.xs,
    fontWeight: entityVars.fontWeight.medium,
    borderRadius: entityVars.borderRadius.full,
    border: `1px solid ${badgeColorVar}`,
    color: badgeColorVar,
    backgroundColor: badgeColorVar + '10',
    transition: `all ${entityVars.transition.fast}`,
    whiteSpace: 'nowrap',
  },
  variants: {
    supported: {
      true: {
        vars: {
          [badgeColorVar]: entityVars.color.success,
        },
      },
      false: {
        vars: {
          [badgeColorVar]: entityVars.color.muted,
        },
        opacity: 0.6,
        textDecoration: 'line-through',
      },
    },
    intensity: {
      low: {
        vars: {
          [capabilityIntensityVar]: '0.3',
        },
        opacity: capabilityIntensityVar,
      },
      medium: {
        vars: {
          [capabilityIntensityVar]: '0.6',
        },
        opacity: capabilityIntensityVar,
      },
      high: {
        vars: {
          [capabilityIntensityVar]: '1',
        },
        opacity: capabilityIntensityVar,
      },
    },
  },
});

export const badgeIcon = style({
  width: '12px',
  height: '12px',
  flexShrink: 0,
});

// ============================================================================
// Performance Indicator Styles
// ============================================================================

export const performanceIndicator = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.lg,
  padding: entityVars.spacing.xl,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.lg,
});

export const performanceHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: entityVars.spacing.md,
});

export const performanceTitle = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.text,
});

export const performanceStatus = recipe({
  base: {
    vars: {
      [performanceColorVar]: entityVars.color.muted,
    },
    display: 'inline-flex',
    alignItems: 'center',
    gap: entityVars.spacing.xs,
    padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
    fontSize: entityVars.fontSize.xs,
    fontWeight: entityVars.fontWeight.medium,
    borderRadius: entityVars.borderRadius.full,
    backgroundColor: performanceColorVar + '10',
    color: performanceColorVar,
    border: `1px solid ${performanceColorVar}`,
  },
  variants: {
    status: {
      excellent: {
        vars: {
          [performanceColorVar]: entityVars.color.success,
        },
      },
      good: {
        vars: {
          [performanceColorVar]: entityVars.color.openAccess,
        },
      },
      moderate: {
        vars: {
          [performanceColorVar]: entityVars.color.warning,
        },
      },
      poor: {
        vars: {
          [performanceColorVar]: entityVars.color.error,
        },
      },
      unknown: {
        vars: {
          [performanceColorVar]: entityVars.color.muted,
        },
      },
    },
  },
});

export const performanceMetrics = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: entityVars.spacing.lg,
});

export const performanceMetric = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: entityVars.spacing.xs,
  padding: entityVars.spacing.md,
  backgroundColor: entityVars.color.background,
  borderRadius: entityVars.borderRadius.md,
  border: `1px solid ${entityVars.color.border}`,
});

export const metricValue = style({
  fontSize: entityVars.fontSize.xl,
  fontWeight: entityVars.fontWeight.bold,
  color: entityVars.color.text,
  lineHeight: entityVars.lineHeight.tight,
});

export const metricLabel = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  textAlign: 'center',
  fontWeight: entityVars.fontWeight.medium,
});

export const metricUnit = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.subtle,
  fontWeight: entityVars.fontWeight.normal,
});

// ============================================================================
// Recommendation Tooltip Styles
// ============================================================================

export const recommendationTooltip = style({
  position: 'absolute',
  top: '100%',
  right: 0,
  width: '320px',
  marginTop: entityVars.spacing.sm,
  padding: entityVars.spacing.xl,
  backgroundColor: entityVars.color.cardBackground,
  border: `2px solid ${entityVars.color.accent}`,
  borderRadius: entityVars.borderRadius.lg,
  boxShadow: entityVars.shadow.lg,
  zIndex: entityVars.zIndex.tooltip,
  
  ':before': {
    content: '""',
    position: 'absolute',
    top: '-6px',
    right: entityVars.spacing.xl,
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderBottom: `6px solid ${entityVars.color.accent}`,
  },
});

export const recommendationHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.sm,
  marginBottom: entityVars.spacing.lg,
});

export const recommendationIcon = style({
  width: '20px',
  height: '20px',
  color: entityVars.color.accent,
});

export const recommendationTitle = style({
  fontSize: entityVars.fontSize.base,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.text,
});

export const recommendationList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.md,
});

export const recommendationItem = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: entityVars.spacing.sm,
  padding: entityVars.spacing.md,
  backgroundColor: entityVars.color.background,
  borderRadius: entityVars.borderRadius.md,
  border: `1px solid ${entityVars.color.border}`,
  transition: `all ${entityVars.transition.fast}`,
  
  ':hover': {
    borderColor: entityVars.color.borderHover,
    backgroundColor: entityVars.color.cardBackground,
  },
});

export const recommendationScore = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  fontSize: entityVars.fontSize.xs,
  fontWeight: entityVars.fontWeight.bold,
  borderRadius: entityVars.borderRadius.full,
  backgroundColor: entityVars.color.success,
  color: entityVars.color.cardBackground,
  flexShrink: 0,
});

export const recommendationContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: entityVars.spacing.xs,
  flex: 1,
  minWidth: 0,
});

export const recommendationName = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.text,
});

export const recommendationReason = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  lineHeight: entityVars.lineHeight.normal,
});

// ============================================================================
// Engine Comparison Modal Styles
// ============================================================================

export const modalOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  zIndex: entityVars.zIndex.modal,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: entityVars.spacing.xl,
});

export const modal = style({
  width: '100%',
  maxWidth: '1000px',
  maxHeight: '90vh',
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.borderRadius.xl,
  boxShadow: entityVars.shadow.lg,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

export const modalHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${entityVars.spacing['2xl']} ${entityVars.spacing['3xl']}`,
  borderBottom: `2px solid ${entityVars.color.border}`,
});

export const modalTitle = style({
  fontSize: entityVars.fontSize['2xl'],
  fontWeight: entityVars.fontWeight.bold,
  color: entityVars.color.text,
});

export const modalCloseButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  border: 'none',
  borderRadius: entityVars.borderRadius.md,
  backgroundColor: 'transparent',
  color: entityVars.color.muted,
  cursor: 'pointer',
  transition: `all ${entityVars.transition.fast}`,
  
  ':hover': {
    backgroundColor: entityVars.color.background,
    color: entityVars.color.text,
  },
});

export const modalBody = style({
  flex: 1,
  overflowY: 'auto',
  padding: entityVars.spacing['3xl'],
});

export const comparisonGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: entityVars.spacing['2xl'],
  marginBottom: entityVars.spacing['4xl'],
});

export const comparisonCard = recipe({
  base: {
    padding: entityVars.spacing['2xl'],
    backgroundColor: entityVars.color.background,
    border: `2px solid ${entityVars.color.border}`,
    borderRadius: entityVars.borderRadius.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: entityVars.spacing.xl,
  },
  variants: {
    recommended: {
      true: {
        borderColor: entityVars.color.success,
        backgroundColor: entityVars.color.successBackground,
        position: 'relative',
        
        ':before': {
          content: '"Recommended"',
          position: 'absolute',
          top: entityVars.spacing.sm,
          right: entityVars.spacing.sm,
          padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
          fontSize: entityVars.fontSize.xs,
          fontWeight: entityVars.fontWeight.semibold,
          backgroundColor: entityVars.color.success,
          color: entityVars.color.cardBackground,
          borderRadius: entityVars.borderRadius.sm,
        },
      },
    },
  },
});

export const comparisonTable = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: entityVars.fontSize.sm,
});

export const tableHeader = style({
  backgroundColor: entityVars.color.background,
  borderBottom: `2px solid ${entityVars.color.border}`,
});

export const tableHeaderCell = style({
  padding: `${entityVars.spacing.lg} ${entityVars.spacing.xl}`,
  textAlign: 'left',
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.semibold,
  color: entityVars.color.text,
});

export const tableRow = style({
  borderBottom: `1px solid ${entityVars.color.border}`,
  
  ':hover': {
    backgroundColor: entityVars.color.background,
  },
});

export const tableCell = style({
  padding: `${entityVars.spacing.md} ${entityVars.spacing.xl}`,
  color: entityVars.color.text,
  verticalAlign: 'middle',
});

// ============================================================================
// Responsive Styles
// ============================================================================

export const mobileResponsive = style({
  '@media': {
    'screen and (max-width: 768px)': {
      minWidth: 'auto',
      maxWidth: '100%',
    },
  },
});

export const tabletResponsive = style({
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
      gap: entityVars.spacing.xl,
    },
  },
});

export const mobileDropdown = style({
  '@media': {
    'screen and (max-width: 768px)': {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90vw',
      maxWidth: '400px',
      maxHeight: '70vh',
      borderRadius: entityVars.borderRadius.xl,
      zIndex: entityVars.zIndex.modal,
      boxShadow: entityVars.shadow.lg,
    },
  },
});

export const mobileModal = style({
  '@media': {
    'screen and (max-width: 768px)': {
      width: '95vw',
      maxHeight: '85vh',
      margin: 0,
    },
  },
});

export const mobileModalBody = style({
  '@media': {
    'screen and (max-width: 768px)': {
      padding: entityVars.spacing.xl,
    },
  },
});

export const mobileComparisonGrid = style({
  '@media': {
    'screen and (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: entityVars.spacing.xl,
    },
  },
});