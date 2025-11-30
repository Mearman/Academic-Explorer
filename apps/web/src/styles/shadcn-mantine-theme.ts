import { createTheme, MantineColorsTuple } from '@mantine/core'
import { generateMantineColors } from './css-variable-resolver'

const shadcnColors = generateMantineColors()

// Convert shadcn palettes to MantineColorsTuple format
const createMantineColorTuple = (colors: string[]): MantineColorsTuple => [
  colors[0], colors[1], colors[2], colors[3], colors[4],
  colors[5], colors[6], colors[7], colors[8], colors[9], colors[10]
]

export const shadcnMantineTheme = createTheme({
  colors: {
    // All shadcn color palettes
    zinc: createMantineColorTuple(shadcnColors.zinc),
    slate: createMantineColorTuple(shadcnColors.slate),
    stone: createMantineColorTuple(shadcnColors.stone),
    red: createMantineColorTuple(shadcnColors.red),
    orange: createMantineColorTuple(shadcnColors.orange),
    amber: createMantineColorTuple(shadcnColors.amber),
    yellow: createMantineColorTuple(shadcnColors.yellow),
    lime: createMantineColorTuple(shadcnColors.lime),
    green: createMantineColorTuple(shadcnColors.green),
    emerald: createMantineColorTuple(shadcnColors.emerald),
    teal: createMantineColorTuple(shadcnColors.teal),
    cyan: createMantineColorTuple(shadcnColors.cyan),
    sky: createMantineColorTuple(shadcnColors.sky),
    blue: createMantineColorTuple(shadcnColors.blue),
    indigo: createMantineColorTuple(shadcnColors.indigo),
    violet: createMantineColorTuple(shadcnColors.violet),
    purple: createMantineColorTuple(shadcnColors.purple),
    fuchsia: createMantineColorTuple(shadcnColors.fuchsia),
    pink: createMantineColorTuple(shadcnColors.pink),
    rose: createMantineColorTuple(shadcnColors.rose),

    // Semantic colors with shadcn mappings
    primary: createMantineColorTuple(shadcnColors.stone),
    secondary: createMantineColorTuple(shadcnColors.zinc),
    accent: createMantineColorTuple(shadcnColors.zinc),
    neutral: createMantineColorTuple(shadcnColors.zinc),
    destructive: createMantineColorTuple(shadcnColors.red),
    success: createMantineColorTuple(shadcnColors.green),
    warning: createMantineColorTuple(shadcnColors.orange),
    info: createMantineColorTuple(shadcnColors.blue),

    // Academic entity colors
    work: createMantineColorTuple(shadcnColors.blue),
    author: createMantineColorTuple(shadcnColors.green),
    source: createMantineColorTuple(shadcnColors.violet),
    institution: createMantineColorTuple(shadcnColors.orange),
    concept: createMantineColorTuple(shadcnColors.pink),
    topic: createMantineColorTuple(shadcnColors.red),
    publisher: createMantineColorTuple(shadcnColors.teal),
    funder: createMantineColorTuple(shadcnColors.cyan),
    keyword: createMantineColorTuple(shadcnColors.zinc),
  },

  primaryColor: 'stone',
  defaultRadius: 'md',

  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, Fira Code, Consolas, monospace',

  spacing: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },

  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },

  lineHeights: {
    xs: '1.25',
    sm: '1.375',
    base: '1.5',
    lg: '1.625',
    xl: '1.75',
  },

  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  components: {
    Button: {
      vars: (theme, props) => {
        const variant = props.variant
        const color = props.color || 'primary'

        if (variant === 'filled') {
          return {
            'button-bg': theme.colors[color][6],
            'button-hover': theme.colors[color][7],
            'button-color': 'white',
          }
        }

        if (variant === 'light') {
          return {
            'button-bg': theme.colors[color][0],
            'button-hover': theme.colors[color][1],
            'button-color': theme.colors[color][9],
          }
        }

        if (variant === 'outline') {
          return {
            'button-border': theme.colors[color][4],
            'button-hover': theme.colors[color][0],
            'button-color': theme.colors[color][9],
          }
        }

        if (variant === 'subtle') {
          return {
            'button-bg': 'transparent',
            'button-hover': theme.colors[color][0],
            'button-color': theme.colors[color][7],
          }
        }

        return {}
      },
    },

    Card: {
      vars: (theme) => ({
        'card-bg': 'var(--mantine-color-body)',
        'card-border': 'var(--mantine-color-default-border)',
      }),
    },

    Paper: {
      vars: (theme) => ({
        'paper-bg': 'var(--mantine-color-body)',
        'paper-shadow': theme.shadows.md,
      }),
    },

    Input: {
      vars: (theme, props) => {
        const hasError = props.error

        return {
          'input-bg': 'var(--mantine-color-body)',
          'input-border-color': hasError
            ? theme.colors.red[6]
            : 'var(--mantine-color-default-border)',
          'input-placeholder-color': 'var(--mantine-color-placeholder)',
        }
      },
    },

    Select: {
      vars: (theme, props) => {
        const hasError = props.error

        return {
          'select-bg': 'var(--mantine-color-body)',
          'select-border-color': hasError
            ? theme.colors.red[6]
            : 'var(--mantine-color-default-border)',
          'select-placeholder-color': 'var(--mantine-color-placeholder)',
        }
      },
    },

    Textarea: {
      vars: (theme, props) => {
        const hasError = props.error

        return {
          'textarea-bg': 'var(--mantine-color-body)',
          'textarea-border-color': hasError
            ? theme.colors.red[6]
            : 'var(--mantine-color-default-border)',
          'textarea-placeholder-color': 'var(--mantine-color-placeholder)',
        }
      },
    },

    Checkbox: {
      vars: (theme, props) => ({
        'checkbox-bg': props.checked
          ? theme.colors[props.color || 'primary'][6]
          : 'var(--mantine-color-body)',
        'checkbox-border-color': props.checked
          ? theme.colors[props.color || 'primary'][6]
          : 'var(--mantine-color-default-border)',
      }),
    },

    Radio: {
      vars: (theme, props) => ({
        'radio-bg': props.checked
          ? theme.colors[props.color || 'primary'][6]
          : 'var(--mantine-color-body)',
        'radio-border-color': props.checked
          ? theme.colors[props.color || 'primary'][6]
          : 'var(--mantine-color-default-border)',
      }),
    },

    Switch: {
      vars: (theme, props) => ({
        'switch-track-bg': props.checked
          ? theme.colors[props.color || 'primary'][6]
          : 'var(--mantine-color-default-border)',
        'switch-thumb-bg': props.checked
          ? 'white'
          : 'var(--mantine-color-body)',
      }),
    },

    Modal: {
      vars: (theme) => ({
        'modal-bg': 'var(--mantine-color-body)',
        'modal-shadow': theme.shadows.xl,
      }),
    },

    Drawer: {
      vars: (theme) => ({
        'drawer-bg': 'var(--mantine-color-body)',
        'drawer-shadow': theme.shadows.lg,
      }),
    },

    Popover: {
      vars: (theme) => ({
        'popover-bg': 'var(--mantine-color-body)',
        'popover-shadow': theme.shadows.lg,
      }),
    },

    Tooltip: {
      vars: (theme) => ({
        'tooltip-bg': theme.colors.dark[9],
        'tooltip-color': 'white',
      }),
    },

    Notification: {
      vars: (theme, props) => {
        const color = props.color || 'blue'

        return {
          'notification-bg': theme.colors[color][0],
          'notification-border': theme.colors[color][4],
          'notification-color': theme.colors[color][9],
        }
      },
    },

    Loader: {
      vars: (theme, props) => ({
        'loader-color': theme.colors[props.color || 'primary'][6],
      }),
    },

    ActionIcon: {
      vars: (theme, props) => {
        const variant = props.variant
        const color = props.color || 'primary'

        if (variant === 'filled') {
          return {
            'action-icon-bg': theme.colors[color][6],
            'action-icon-hover': theme.colors[color][7],
            'action-icon-color': 'white',
          }
        }

        if (variant === 'light') {
          return {
            'action-icon-bg': theme.colors[color][0],
            'action-icon-hover': theme.colors[color][1],
            'action-icon-color': theme.colors[color][9],
          }
        }

        if (variant === 'outline') {
          return {
            'action-icon-border': theme.colors[color][4],
            'action-icon-hover': theme.colors[color][0],
            'action-icon-color': theme.colors[color][9],
          }
        }

        if (variant === 'subtle') {
          return {
            'action-icon-bg': 'transparent',
            'action-icon-hover': theme.colors[color][0],
            'action-icon-color': theme.colors[color][7],
          }
        }

        return {}
      },
    },

    Badge: {
      vars: (theme, props) => {
        const variant = props.variant
        const color = props.color || 'gray'

        if (variant === 'filled') {
          return {
            'badge-bg': theme.colors[color][6],
            'badge-color': 'white',
          }
        }

        if (variant === 'light') {
          return {
            'badge-bg': theme.colors[color][0],
            'badge-color': theme.colors[color][9],
          }
        }

        if (variant === 'outline') {
          return {
            'badge-border': theme.colors[color][4],
            'badge-color': theme.colors[color][7],
          }
        }

        if (variant === 'dot') {
          return {
            'badge-dot-color': theme.colors[color][6],
            'badge-color': theme.colors[color][7],
          }
        }

        return {}
      },
    },

    Chip: {
      vars: (theme, props) => {
        const variant = props.variant
        const color = props.color || 'primary'
        const checked = props.checked

        if (variant === 'filled') {
          return {
            'chip-bg': checked
              ? theme.colors[color][6]
              : 'var(--mantine-color-default-hover)',
            'chip-color': checked
              ? 'white'
              : 'var(--mantine-color-default-color)',
          }
        }

        if (variant === 'light') {
          return {
            'chip-bg': checked
              ? theme.colors[color][0]
              : 'var(--mantine-color-default-hover)',
            'chip-color': theme.colors[color][9],
          }
        }

        if (variant === 'outline') {
          return {
            'chip-border': checked
              ? theme.colors[color][4]
              : 'var(--mantine-color-default-border)',
            'chip-color': theme.colors[color][7],
          }
        }

        return {}
      },
    },
  },
})