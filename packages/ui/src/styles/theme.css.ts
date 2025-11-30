/**
 * Vanilla Extract styles for UI package components
 * Complements the shadcn theme with reusable style compositions
 */

import { createVar, fallbackVar, style } from '@vanilla-extract/css';

// Theme variable references for Vanilla Extract
export const themeVars = {
  // Semantic colors
  foreground: createVar('foreground'),
  mutedForeground: createVar('muted-foreground'),
  background: createVar('background'),
  muted: createVar('muted'),
  border: createVar('border'),
  destructive: createVar('destructive'),
  success: createVar('success'),
  warning: createVar('warning'),
  primary: createVar('primary'),

  // Academic entity colors
  work: createVar('work'),
  author: createVar('author'),
  source: createVar('source'),
  institution: createVar('institution'),
  concept: createVar('concept'),
  topic: createVar('topic'),
  publisher: createVar('publisher'),
  funder: createVar('funder'),
  keyword: createVar('keyword'),
};

// Card styles with theme integration
export const cardStyles = {
  base: style({
    backgroundColor: fallbackVar(themeVars.background, 'white'),
    borderColor: fallbackVar(themeVars.border, '#e5e7eb'),
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  }),

  interactive: style({
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    ':hover': {
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
      borderColor: fallbackVar(themeVars.primary, '#3b82f6'),
    },
  }),

  elevated: style({
    boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    borderRadius: '12px',
  }),
};

// Entity-specific styles
export const entityStyles = {
  // Entity type badges with academic colors
  entityBadge: style({
    backgroundColor: fallbackVar(themeVars.work, '#e5e7eb'),
    color: 'white',
    fontWeight: '500',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    lineHeight: 1.2,
  }),

  entityCard: style({
    backgroundColor: fallbackVar(themeVars.background, 'white'),
    borderColor: fallbackVar(themeVars.border, '#e5e7eb'),
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    borderLeftWidth: '4px',
    borderLeftColor: fallbackVar(themeVars.work, '#3b82f6'),
  }),
};

// Text styles with theme support
export const textStyles = {
  primary: style({
    color: fallbackVar(themeVars.foreground, '#1f2937'),
    fontWeight: '500',
  }),

  secondary: style({
    color: fallbackVar(themeVars.mutedForeground, '#6b7280'),
    fontSize: '14px',
  }),

  description: style({
    color: fallbackVar(themeVars.mutedForeground, '#6b7280'),
    fontSize: '14px',
    lineHeight: 1.5,
  }),

  muted: style({
    color: fallbackVar(themeVars.mutedForeground, '#6b7280'),
    fontSize: '13px',
  }),
};

// Status indicator styles
export const statusStyles = {
  success: style({
    backgroundColor: fallbackVar(themeVars.success, '#10b981'),
    color: 'white',
  }),

  warning: style({
    backgroundColor: fallbackVar(themeVars.warning, '#f59e0b'),
    color: 'white',
  }),

  error: style({
    backgroundColor: fallbackVar(themeVars.destructive, '#ef4444'),
    color: 'white',
  }),

  info: style({
    backgroundColor: fallbackVar(themeVars.primary, '#3b82f6'),
    color: 'white',
  }),
};

// Layout styles
export const layoutStyles = {
  section: style({
    backgroundColor: fallbackVar(themeVars.background, 'white'),
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
    border: `1px solid ${fallbackVar(themeVars.border, '#e5e7eb')}`,
  }),

  compact: style({
    padding: '12px',
  }),

  spacious: style({
    padding: '32px',
  }),
};

// Form element styles
export const formStyles = {
  input: style({
    backgroundColor: fallbackVar(themeVars.background, 'white'),
    borderColor: fallbackVar(themeVars.border, '#e5e7eb'),
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    transition: 'border-color 0.2s ease-in-out',
    ':focus': {
      outline: 'none',
      borderColor: fallbackVar(themeVars.primary, '#3b82f6'),
      boxShadow: `0 0 0 1px ${fallbackVar(themeVars.primary, '#3b82f6')}`,
    },
  }),

  inputError: style({
    borderColor: fallbackVar(themeVars.destructive, '#ef4444'),
  }),
};

// Utility styles
export const utilityStyles = {
  truncate: style({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),

  multilineClamp2: style({
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),

  multilineClamp3: style({
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),

  srOnly: style({
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  }),
};