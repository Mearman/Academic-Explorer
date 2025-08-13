import { style, styleVariants } from '@vanilla-extract/css';
import { entityVars } from '../design-tokens.css';

export const base = style({
  display: 'inline-flex',
  alignItems: 'center',
  textDecoration: 'none',
  fontWeight: entityVars.fontWeight.medium,
  borderRadius: entityVars.borderRadius.sm,
  transition: entityVars.transition.fast,
  gap: entityVars.spacing.sm,
  
  ':hover': {
    textDecoration: 'underline',
  },
  
  ':focus-visible': {
    outline: `2px solid ${entityVars.color.accent}`,
    outlineOffset: '2px',
  },
  
  ':visited': {
    color: 'inherit',
  },
});

export const linkTypeVariants = styleVariants({
  doi: {
    color: entityVars.color.work,
    ':hover': {
      color: `color-mix(in srgb, ${entityVars.color.work} 80%, black)`,
    },
  },
  orcid: {
    color: entityVars.color.author,
    ':hover': {
      color: `color-mix(in srgb, ${entityVars.color.author} 80%, black)`,
    },
  },
  ror: {
    color: entityVars.color.institution,
    ':hover': {
      color: `color-mix(in srgb, ${entityVars.color.institution} 80%, black)`,
    },
  },
  wikidata: {
    color: entityVars.color.concept,
    ':hover': {
      color: `color-mix(in srgb, ${entityVars.color.concept} 80%, black)`,
    },
  },
  wikipedia: {
    color: entityVars.color.topic,
    ':hover': {
      color: `color-mix(in srgb, ${entityVars.color.topic} 80%, black)`,
    },
  },
  website: {
    color: entityVars.color.accent,
    ':hover': {
      color: `color-mix(in srgb, ${entityVars.color.accent} 80%, ${entityVars.color.work})`,
    },
  },
  email: {
    color: entityVars.color.funder,
    ':hover': {
      color: `color-mix(in srgb, ${entityVars.color.funder} 80%, black)`,
    },
  },
});

export const iconStyle = style({
  width: '16px',
  height: '16px',
  flexShrink: 0,
  marginRight: entityVars.spacing.xs,
});

export const externalIconStyle = style({
  width: '12px',
  height: '12px',
  marginLeft: entityVars.spacing.xs,
  opacity: 0.7,
});

export const buttonStyle = style({
  padding: `${entityVars.spacing.sm} ${entityVars.spacing.md}`,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.borderRadius.md,
  cursor: 'pointer',
  
  ':hover': {
    backgroundColor: `color-mix(in srgb, ${entityVars.color.cardBackground} 95%, ${entityVars.color.border})`,
    borderColor: entityVars.color.borderHover,
  },
});

export const compactStyle = style({
  fontSize: entityVars.fontSize.sm,
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
});

export const fullWidthStyle = style({
  width: '100%',
  justifyContent: 'flex-start',
});