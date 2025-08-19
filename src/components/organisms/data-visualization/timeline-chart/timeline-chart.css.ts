/**
 * Timeline Chart Component Styles
 * 
 * Comprehensive styling for the Timeline Chart component using Vanilla Extract
 * and design tokens from the Academic Explorer design system.
 */

import { style, styleVariants, keyframes, createVar } from '@vanilla-extract/css';

import { entityVars } from '@/components/design-tokens.css';

// ============================================================================
// CSS Custom Properties
// ============================================================================

export const timelineVars = {
  // Chart dimensions
  chartWidth: createVar(),
  chartHeight: createVar(),
  
  // Margins and padding
  marginTop: createVar(),
  marginRight: createVar(),
  marginBottom: createVar(),
  marginLeft: createVar(),
  
  // Colors
  lineColor: createVar(),
  areaColor: createVar(),
  pointColor: createVar(),
  gridColor: createVar(),
  axisColor: createVar(),
  
  // Line styles
  lineWidth: createVar(),
  pointRadius: createVar(),
  
  // Animation
  animationDuration: createVar(),
  animationEasing: createVar(),
};

// ============================================================================
// Animation Keyframes
// ============================================================================

const fadeIn = keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 }
});

const slideUp = keyframes({
  '0%': { 
    transform: 'translateY(100%)',
    opacity: 0 
  },
  '100%': { 
    transform: 'translateY(0)',
    opacity: 1 
  }
});

const lineGrow = keyframes({
  '0%': { strokeDashoffset: '100%' },
  '100%': { strokeDashoffset: '0%' }
});

const pointPop = keyframes({
  '0%': { 
    transform: 'scale(0)',
    opacity: 0 
  },
  '50%': { 
    transform: 'scale(1.2)',
    opacity: 1 
  },
  '100%': { 
    transform: 'scale(1)',
    opacity: 1 
  }
});

// ============================================================================
// Base Styles
// ============================================================================

export const container = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  background: entityVars.color.background,
  borderRadius: entityVars.borderRadius.md,
  overflow: 'hidden',
  
  vars: {
    [timelineVars.chartWidth]: '800px',
    [timelineVars.chartHeight]: '400px',
    [timelineVars.marginTop]: entityVars.spacing['2xl'],
    [timelineVars.marginRight]: entityVars.spacing['2xl'],
    [timelineVars.marginBottom]: entityVars.spacing['5xl'],
    [timelineVars.marginLeft]: entityVars.spacing['5xl'],
    [timelineVars.lineColor]: entityVars.color.work,
    [timelineVars.areaColor]: entityVars.color.work,
    [timelineVars.pointColor]: entityVars.color.work,
    [timelineVars.gridColor]: entityVars.color.border,
    [timelineVars.axisColor]: entityVars.color.text,
    [timelineVars.lineWidth]: '2px',
    [timelineVars.pointRadius]: '4px',
    [timelineVars.animationDuration]: entityVars.transition.normal,
    [timelineVars.animationEasing]: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
});

export const svg = style({
  display: 'block',
  width: '100%',
  height: '100%',
  background: 'transparent',
  overflow: 'visible',
  
  selectors: {
    '&:focus': {
      outline: `2px solid ${entityVars.color.accent}`,
      outlineOffset: '2px'
    }
  }
});

// ============================================================================
// Chart Elements
// ============================================================================

export const chartGroup = style({
  animation: `${fadeIn} ${timelineVars.animationDuration} ${timelineVars.animationEasing}`
});

export const axisGroup = style({
  fontSize: entityVars.fontSize.sm,
  fontFamily: 'inherit',
  fill: timelineVars.axisColor,
  stroke: 'none'
});

export const xAxis = style([axisGroup, {
  dominantBaseline: 'hanging'
}]);

export const yAxis = style([axisGroup, {
  textAnchor: 'end'
}]);

export const axisLabel = style({
  fontSize: entityVars.fontSize.sm,
  fontWeight: entityVars.fontWeight.medium,
  fill: timelineVars.axisColor,
  textAnchor: 'middle',
  dominantBaseline: 'central'
});

export const gridLine = style({
  stroke: timelineVars.gridColor,
  strokeWidth: '1px',
  strokeDasharray: '2,2',
  opacity: 0.5,
  fill: 'none'
});

// ============================================================================
// Series Styles
// ============================================================================

export const seriesGroup = style({
  animation: `${slideUp} ${timelineVars.animationDuration} ${timelineVars.animationEasing} forwards`
});

export const lineSeriesPath = style({
  fill: 'none',
  stroke: timelineVars.lineColor,
  strokeWidth: timelineVars.lineWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  
  // Animation for line drawing
  strokeDasharray: '100%',
  strokeDashoffset: '100%',
  animation: `${lineGrow} 1.5s ${timelineVars.animationEasing} forwards`,
  
  selectors: {
    // Hover effects
    '&:hover': {
      strokeWidth: `calc(${timelineVars.lineWidth} * 1.5)`,
      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
    },
    
    // Reduced motion
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      strokeDasharray: 'none',
      strokeDashoffset: '0'
    }
  }
});

export const areaSeriesPath = style({
  fill: timelineVars.areaColor,
  fillOpacity: 0.3,
  stroke: timelineVars.lineColor,
  strokeWidth: timelineVars.lineWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  
  animation: `${slideUp} 1s ${timelineVars.animationEasing} forwards`,
  
  selectors: {
    '&:hover': {
      fillOpacity: 0.5,
      filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))'
    },
    
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none'
    }
  }
});

export const barSeriesRect = style({
  fill: timelineVars.areaColor,
  stroke: timelineVars.lineColor,
  strokeWidth: '1px',
  
  animation: `${slideUp} 0.8s ${timelineVars.animationEasing} forwards`,
  transformOrigin: 'bottom center',
  
  selectors: {
    '&:hover': {
      fillOpacity: 0.8,
      transform: 'scaleY(1.05)',
      filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))'
    },
    
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none'
    }
  }
});

export const scatterPoint = style({
  fill: timelineVars.pointColor,
  stroke: entityVars.color.background,
  strokeWidth: '2px',
  cursor: 'pointer',
  
  animation: `${pointPop} 0.6s ${timelineVars.animationEasing} forwards`,
  
  selectors: {
    '&:hover': {
      transform: 'scale(1.3)',
      filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))'
    },
    
    '&:focus': {
      outline: `2px solid ${entityVars.color.accent}`,
      outlineOffset: '2px'
    },
    
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none'
    }
  }
});

// ============================================================================
// Interactive Elements
// ============================================================================

export const brushOverlay = style({
  fill: entityVars.color.accent,
  fillOpacity: 0.1,
  stroke: entityVars.color.accent,
  strokeWidth: '1px',
  strokeDasharray: '3,3',
  cursor: 'crosshair'
});

export const crosshairLine = style({
  stroke: entityVars.color.muted,
  strokeWidth: '1px',
  strokeDasharray: '2,2',
  opacity: 0.7,
  pointerEvents: 'none'
});

export const tooltip = style({
  position: 'absolute',
  background: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  padding: entityVars.spacing.md,
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.text,
  boxShadow: entityVars.shadow.lg,
  pointerEvents: 'none',
  zIndex: entityVars.zIndex.tooltip,
  maxWidth: '200px',
  
  animation: `${fadeIn} 0.2s ease-out`,
  
  selectors: {
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none'
    }
  }
});

export const tooltipTitle = style({
  fontWeight: entityVars.fontWeight.semibold,
  marginBottom: entityVars.spacing.xs,
  color: entityVars.color.text
});

export const tooltipValue = style({
  fontSize: entityVars.fontSize.lg,
  fontWeight: entityVars.fontWeight.bold,
  color: entityVars.color.accent
});

export const tooltipDate = style({
  fontSize: entityVars.fontSize.xs,
  color: entityVars.color.muted,
  marginTop: entityVars.spacing.xs
});

// ============================================================================
// State Styles
// ============================================================================

export const loadingState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  fontSize: entityVars.fontSize.lg,
  color: entityVars.color.muted,
  animation: `${fadeIn} 0.3s ease-out`
});

export const errorState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: entityVars.spacing.xl,
  textAlign: 'center'
});

export const errorIcon = style({
  fontSize: entityVars.fontSize['4xl'],
  color: entityVars.color.error,
  marginBottom: entityVars.spacing.md
});

export const errorMessage = style({
  fontSize: entityVars.fontSize.lg,
  color: entityVars.color.error,
  marginBottom: entityVars.spacing.md,
  fontWeight: entityVars.fontWeight.medium
});

export const errorDescription = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.muted,
  lineHeight: entityVars.lineHeight.relaxed
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: entityVars.spacing.xl,
  textAlign: 'center'
});

export const emptyIcon = style({
  fontSize: entityVars.fontSize['4xl'],
  color: entityVars.color.muted,
  marginBottom: entityVars.spacing.md,
  opacity: 0.5
});

export const emptyMessage = style({
  fontSize: entityVars.fontSize.lg,
  color: entityVars.color.muted,
  marginBottom: entityVars.spacing.sm,
  fontWeight: entityVars.fontWeight.medium
});

export const emptyDescription = style({
  fontSize: entityVars.fontSize.sm,
  color: entityVars.color.subtle,
  lineHeight: entityVars.lineHeight.relaxed
});

// ============================================================================
// Style Variants
// ============================================================================

export const sizeVariants = styleVariants({
  small: {
    vars: {
      [timelineVars.chartWidth]: '400px',
      [timelineVars.chartHeight]: '200px',
      [timelineVars.marginTop]: entityVars.spacing.lg,
      [timelineVars.marginRight]: entityVars.spacing.lg,
      [timelineVars.marginBottom]: entityVars.spacing['3xl'],
      [timelineVars.marginLeft]: entityVars.spacing['3xl']
    }
  },
  medium: {
    vars: {
      [timelineVars.chartWidth]: '600px',
      [timelineVars.chartHeight]: '300px',
      [timelineVars.marginTop]: entityVars.spacing.xl,
      [timelineVars.marginRight]: entityVars.spacing.xl,
      [timelineVars.marginBottom]: entityVars.spacing['4xl'],
      [timelineVars.marginLeft]: entityVars.spacing['4xl']
    }
  },
  large: {
    vars: {
      [timelineVars.chartWidth]: '1000px',
      [timelineVars.chartHeight]: '500px',
      [timelineVars.marginTop]: entityVars.spacing['3xl'],
      [timelineVars.marginRight]: entityVars.spacing['3xl'],
      [timelineVars.marginBottom]: entityVars.spacing['6xl'],
      [timelineVars.marginLeft]: entityVars.spacing['6xl']
    }
  }
});

export const colorSchemeVariants = styleVariants({
  categorical: {
    vars: {
      [timelineVars.lineColor]: entityVars.color.work,
      [timelineVars.areaColor]: entityVars.color.work,
      [timelineVars.pointColor]: entityVars.color.work
    }
  },
  sequential: {
    vars: {
      [timelineVars.lineColor]: entityVars.color.author,
      [timelineVars.areaColor]: entityVars.color.author,
      [timelineVars.pointColor]: entityVars.color.author
    }
  },
  diverging: {
    vars: {
      [timelineVars.lineColor]: entityVars.color.source,
      [timelineVars.areaColor]: entityVars.color.source,
      [timelineVars.pointColor]: entityVars.color.source
    }
  },
  entityBased: {
    vars: {
      [timelineVars.lineColor]: entityVars.color.topic,
      [timelineVars.areaColor]: entityVars.color.topic,
      [timelineVars.pointColor]: entityVars.color.topic
    }
  }
});

// ============================================================================
// Responsive Styles
// ============================================================================

export const responsiveContainer = style({
  '@media': {
    'screen and (max-width: 768px)': {
      vars: {
        [timelineVars.marginLeft]: entityVars.spacing['3xl'],
        [timelineVars.marginBottom]: entityVars.spacing['4xl']
      }
    },
    
    'screen and (max-width: 480px)': {
      vars: {
        [timelineVars.marginLeft]: entityVars.spacing['2xl'],
        [timelineVars.marginBottom]: entityVars.spacing['3xl'],
        [timelineVars.lineWidth]: '1.5px',
        [timelineVars.pointRadius]: '3px'
      }
    }
  }
});

// ============================================================================
// Accessibility Styles
// ============================================================================

export const accessibilityStyles = style({
  selectors: {
    // High contrast mode
    '@media (prefers-contrast: high)': {
      vars: {
        [timelineVars.lineColor]: '#000000',
        [timelineVars.gridColor]: '#666666'
      }
    },
    
    // Reduced motion
    '@media (prefers-reduced-motion: reduce)': {
      vars: {
        [timelineVars.animationDuration]: '0s'
      }
    },
    
    // Focus visible
    '&:focus-visible': {
      outline: `3px solid ${entityVars.color.accent}`,
      outlineOffset: '2px'
    }
  }
});

// ============================================================================
// Print Styles
// ============================================================================

export const printStyles = style({
  '@media': {
    print: {
      vars: {
        [timelineVars.lineColor]: '#000000',
        [timelineVars.gridColor]: '#666666',
        [timelineVars.axisColor]: '#000000'
      },
      
      // Remove animations for print
      animation: 'none !important'
    }
  }
});