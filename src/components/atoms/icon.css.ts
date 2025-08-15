import { style, styleVariants } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const base = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  userSelect: 'none',
  
  // Ensure consistent rendering across browsers
  fontStyle: 'normal',
  fontVariantLigatures: 'none',
  textRendering: 'optimizeLegibility',
});

export const sizeVariants = styleVariants({
  xs: {
    width: '12px',
    height: '12px',
    fontSize: '12px',
  },
  sm: {
    width: '16px',
    height: '16px',
    fontSize: '16px',
  },
  md: {
    width: '20px',
    height: '20px',
    fontSize: '20px',
  },
  lg: {
    width: '24px',
    height: '24px',
    fontSize: '24px',
  },
  xl: {
    width: '32px',
    height: '32px',
    fontSize: '32px',
  },
});

export const interactiveStyle = style({
  transition: entityVars.transition.fast,
  borderRadius: entityVars.borderRadius.sm,
  
  ':hover': {
    transform: 'scale(1.1)',
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

// Entity type specific icon colours
export const entityIconVariants = styleVariants({
  work: { color: entityVars.color.work },
  author: { color: entityVars.color.author },
  source: { color: entityVars.color.source },
  institution: { color: entityVars.color.institution },
  publisher: { color: entityVars.color.publisher },
  funder: { color: entityVars.color.funder },
  topic: { color: entityVars.color.topic },
  concept: { color: entityVars.color.concept },
  keyword: { color: entityVars.color.keyword },
  continent: { color: entityVars.color.continent },
  region: { color: entityVars.color.region },
});

// Common action icon colours
export const actionIconVariants = styleVariants({
  success: { color: entityVars.color.openAccess },
  warning: { color: entityVars.color.hybrid },
  error: { color: entityVars.color.closed },
  info: { color: entityVars.color.work },
  muted: { color: entityVars.color.muted },
  accent: { color: entityVars.color.accent },
});