import { style, styleVariants } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

export const base = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: entityVars.fontWeight.medium,
  borderRadius: entityVars.borderRadius.md,
  border: '1px solid transparent',
  transition: entityVars.transition.fast,
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  cursor: 'default',
  
  // Focus styles for accessibility
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
});

export const sizeVariants = styleVariants({
  xs: {
    fontSize: entityVars.fontSize.xs,
    padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
    gap: entityVars.spacing.xs,
  },
  sm: {
    fontSize: entityVars.fontSize.xs,
    padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
    gap: entityVars.spacing.xs,
  },
  md: {
    fontSize: entityVars.fontSize.sm,
    padding: `${entityVars.spacing.md} ${entityVars.spacing.lg}`,
    gap: entityVars.spacing.sm,
  },
  lg: {
    fontSize: entityVars.fontSize.base,
    padding: `${entityVars.spacing.lg} ${entityVars.spacing.xl}`,
    gap: entityVars.spacing.md,
  },
  xl: {
    fontSize: entityVars.fontSize.lg,
    padding: `${entityVars.spacing.xl} ${entityVars.spacing['2xl']}`,
    gap: entityVars.spacing.md,
  },
});

export const variantStyles = styleVariants({
  default: {
    backgroundColor: entityVars.color.accent,
    color: entityVars.color.cardBackground,
    borderColor: entityVars.color.accent,
  },
  secondary: {
    backgroundColor: entityVars.color.cardBackground,
    color: entityVars.color.accent,
    borderColor: entityVars.color.border,
  },
  success: {
    backgroundColor: entityVars.color.successBackground,
    color: entityVars.color.openAccess,
    borderColor: entityVars.color.openAccess,
  },
  warning: {
    backgroundColor: entityVars.color.warningBackground,
    color: entityVars.color.hybrid,
    borderColor: entityVars.color.hybrid,
  },
  error: {
    backgroundColor: entityVars.color.errorBackground,
    color: entityVars.color.closed,
    borderColor: entityVars.color.closed,
  },
  info: {
    backgroundColor: entityVars.color.infoBackground,
    color: entityVars.color.work,
    borderColor: entityVars.color.work,
  },
});

export const pillStyle = style({
  borderRadius: entityVars.borderRadius.full,
});

export const removableStyle = style({
  paddingRight: entityVars.spacing.sm,
});

export const removeButton = style({
  all: 'unset',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: entityVars.spacing.xs,
  width: '16px',
  height: '16px',
  borderRadius: entityVars.borderRadius.full,
  cursor: 'pointer',
  transition: entityVars.transition.fast,
  
  ':hover': {
    backgroundColor: 'currentColor',
    opacity: 0.2,
  },
  
  ':focus-visible': {
    outline: `1px solid currentColor`,
    outlineOffset: '1px',
  },
});

// Entity type specific styles
export const entityTypeVariants = styleVariants({
  work: {
    backgroundColor: `${entityVars.color.work}15`,
    color: entityVars.color.work,
    borderColor: `${entityVars.color.work}30`,
  },
  author: {
    backgroundColor: `${entityVars.color.author}15`,
    color: entityVars.color.author,
    borderColor: `${entityVars.color.author}30`,
  },
  source: {
    backgroundColor: `${entityVars.color.source}15`,
    color: entityVars.color.source,
    borderColor: `${entityVars.color.source}30`,
  },
  institution: {
    backgroundColor: `${entityVars.color.institution}15`,
    color: entityVars.color.institution,
    borderColor: `${entityVars.color.institution}30`,
  },
  publisher: {
    backgroundColor: `${entityVars.color.publisher}15`,
    color: entityVars.color.publisher,
    borderColor: `${entityVars.color.publisher}30`,
  },
  funder: {
    backgroundColor: `${entityVars.color.funder}15`,
    color: entityVars.color.funder,
    borderColor: `${entityVars.color.funder}30`,
  },
  topic: {
    backgroundColor: `${entityVars.color.topic}15`,
    color: entityVars.color.topic,
    borderColor: `${entityVars.color.topic}30`,
  },
  concept: {
    backgroundColor: `${entityVars.color.concept}15`,
    color: entityVars.color.concept,
    borderColor: `${entityVars.color.concept}30`,
  },
  keyword: {
    backgroundColor: `${entityVars.color.keyword}15`,
    color: entityVars.color.keyword,
    borderColor: `${entityVars.color.keyword}30`,
  },
  continent: {
    backgroundColor: `${entityVars.color.continent}15`,
    color: entityVars.color.continent,
    borderColor: `${entityVars.color.continent}30`,
  },
  region: {
    backgroundColor: `${entityVars.color.region}15`,
    color: entityVars.color.region,
    borderColor: `${entityVars.color.region}30`,
  },
});

// Open access status styles
export const openAccessVariants = styleVariants({
  gold: {
    backgroundColor: `${entityVars.color.gold}15`,
    color: entityVars.color.gold,
    borderColor: `${entityVars.color.gold}30`,
  },
  green: {
    backgroundColor: `${entityVars.color.openAccess}15`,
    color: entityVars.color.openAccess,
    borderColor: `${entityVars.color.openAccess}30`,
  },
  hybrid: {
    backgroundColor: `${entityVars.color.hybrid}15`,
    color: entityVars.color.hybrid,
    borderColor: `${entityVars.color.hybrid}30`,
  },
  bronze: {
    backgroundColor: `${entityVars.color.bronze}15`,
    color: entityVars.color.bronze,
    borderColor: `${entityVars.color.bronze}30`,
  },
  closed: {
    backgroundColor: `${entityVars.color.closed}15`,
    color: entityVars.color.closed,
    borderColor: `${entityVars.color.closed}30`,
  },
});