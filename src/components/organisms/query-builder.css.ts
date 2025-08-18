import { style } from '@vanilla-extract/css';

import { entityVars } from '../design-tokens.css';

export const container = style({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: entityVars.spacing.md,
});

export const header = style({
  flexShrink: 0,
  borderBottom: `1px solid ${entityVars.color.border}`,
  paddingBottom: entityVars.spacing.md,
  marginBottom: entityVars.spacing.md,
});

export const formCard = style({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0, // Allow form to shrink
  overflow: 'auto',
});