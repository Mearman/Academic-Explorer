import { style } from '@vanilla-extract/css';
import { vars } from './theme.css';
import { sprinkles } from './sprinkles.css';

export const navigation = style([
  sprinkles({
    display: 'flex',
    gap: 4,
    paddingX: 4,
    paddingY: 3,
  }),
  {
    borderBottom: `${vars.borderWidth[1]} solid ${vars.color.gray[200]}`,
  },
]);

export const navLink = style([
  sprinkles({
    color: 'primary',
    paddingX: 3,
    paddingY: 2,
    borderRadius: 'md',
    textDecoration: 'none',
    fontSize: 'sm',
    fontWeight: 'medium',
  }),
  {
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: vars.color.gray[100],
      color: vars.color.primary[700],
    },
    selectors: {
      '&.active': {
        backgroundColor: vars.color.primary[100],
        color: vars.color.primary[700],
        fontWeight: vars.fontWeight.semibold,
      },
    },
  },
]);

export const main = style([
  sprinkles({
    padding: 4,
  }),
  {
    minHeight: 'calc(100vh - 60px)', // Adjust based on navigation height
  },
]);

export const pageTitle = style([
  sprinkles({
    fontSize: '2xl',
    fontWeight: 'bold',
    marginBottom: 4,
  }),
]);

export const pageDescription = style([
  sprinkles({
    fontSize: 'md',
    color: 'secondary',
    marginBottom: 6,
    lineHeight: 'relaxed',
  }),
]);

export const card = style([
  sprinkles({
    backgroundColor: 'primary',
    borderRadius: 'lg',
    padding: 4,
    marginBottom: 4,
  }),
  {
    border: `${vars.borderWidth[1]} solid ${vars.color.gray[200]}`,
    boxShadow: vars.shadow.sm,
    transition: 'all 0.2s ease',
    ':hover': {
      boxShadow: vars.shadow.md,
      borderColor: vars.color.gray[300],
    },
  },
]);

export const cardTitle = style([
  sprinkles({
    fontSize: 'lg',
    fontWeight: 'semibold',
    marginBottom: 2,
  }),
]);

export const cardContent = style([
  sprinkles({
    fontSize: 'sm',
    color: 'secondary',
    lineHeight: 'relaxed',
  }),
]);

export const loadingSpinner = style([
  sprinkles({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  }),
]);

export const errorMessage = style([
  sprinkles({
    padding: 4,
    borderRadius: 'md',
    fontSize: 'sm',
  }),
  {
    color: vars.color.error,
    backgroundColor: '#fef2f2',
    border: `${vars.borderWidth[1]} solid #fecaca`,
  },
]);