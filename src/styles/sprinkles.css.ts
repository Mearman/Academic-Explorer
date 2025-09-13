import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { vars } from './theme.css';

// Define responsive properties
const responsiveProperties = defineProperties({
  conditions: {
    mobile: {},
    tablet: { '@media': 'screen and (min-width: 768px)' },
    desktop: { '@media': 'screen and (min-width: 1024px)' },
  },
  defaultCondition: 'mobile',
  properties: {
    display: ['none', 'flex', 'block', 'inline', 'inline-block', 'grid'],
    flexDirection: ['row', 'column'],
    justifyContent: [
      'stretch',
      'flex-start',
      'center',
      'flex-end',
      'space-around',
      'space-between',
    ],
    alignItems: ['stretch', 'flex-start', 'center', 'flex-end'],
    paddingTop: vars.space,
    paddingBottom: vars.space,
    paddingLeft: vars.space,
    paddingRight: vars.space,
    marginTop: vars.space,
    marginBottom: vars.space,
    marginLeft: vars.space,
    marginRight: vars.space,
    gap: vars.space,
    fontSize: vars.fontSize,
    fontWeight: vars.fontWeight,
    lineHeight: vars.lineHeight,
  },
  shorthands: {
    padding: ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'],
    paddingX: ['paddingLeft', 'paddingRight'],
    paddingY: ['paddingTop', 'paddingBottom'],
    margin: ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'],
    marginX: ['marginLeft', 'marginRight'],
    marginY: ['marginTop', 'marginBottom'],
  },
});

// Define color properties
const colorProperties = defineProperties({
  conditions: {
    lightMode: {},
    darkMode: { '@media': '(prefers-color-scheme: dark)' },
  },
  defaultCondition: 'lightMode',
  properties: {
    color: {
      primary: vars.color.text.primary,
      secondary: vars.color.text.secondary,
      tertiary: vars.color.text.tertiary,
      inverse: vars.color.text.inverse,
    },
    backgroundColor: {
      primary: vars.color.background.primary,
      secondary: vars.color.background.secondary,
      tertiary: vars.color.background.tertiary,
    },
    borderColor: vars.color.gray,
  },
});

// Define unresponsive properties
const unresponsiveProperties = defineProperties({
  properties: {
    borderRadius: vars.borderRadius,
    borderWidth: vars.borderWidth,
    cursor: ['default', 'pointer', 'wait', 'text'],
    position: ['relative', 'absolute', 'fixed', 'sticky'],
    top: vars.space,
    bottom: vars.space,
    left: vars.space,
    right: vars.space,
    zIndex: {
      0: '0',
      10: '10',
      20: '20',
      30: '30',
      40: '40',
      50: '50',
    },
    opacity: {
      0: '0',
      25: '0.25',
      50: '0.5',
      75: '0.75',
      100: '1',
    },
    pointerEvents: ['none', 'auto'],
    userSelect: ['none', 'auto'],
    overflow: ['visible', 'hidden', 'scroll', 'auto'],
    textAlign: ['left', 'center', 'right'],
    textTransform: ['none', 'uppercase', 'lowercase', 'capitalize'],
    textDecoration: ['none', 'underline', 'line-through'],
    whiteSpace: ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap'],
    wordBreak: ['normal', 'break-all', 'break-word'],
  },
});

// Create the sprinkles function
export const sprinkles = createSprinkles(
  responsiveProperties,
  colorProperties,
  unresponsiveProperties
);

// Export types for TypeScript
export type Sprinkles = Parameters<typeof sprinkles>[0];