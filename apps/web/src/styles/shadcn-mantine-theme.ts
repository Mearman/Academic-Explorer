import { createTheme, MantineColorsTuple, rem } from '@mantine/core'

import { generateMantineColors } from './css-variable-resolver'

const shadcnColors = generateMantineColors()

// Convert shadcn palettes to MantineColorsTuple format
const createMantineColorTuple = (colors: string[]): MantineColorsTuple => [
  colors[0], colors[1], colors[2], colors[3], colors[4],
  colors[5], colors[6], colors[7], colors[8], colors[9], colors[10]
]

// Container sizes for custom Container component
const CONTAINER_SIZES: Record<string, string> = {
  xxs: rem("200px"),
  xs: rem("300px"),
  sm: rem("400px"),
  md: rem("500px"),
  lg: rem("600px"),
  xl: rem("1400px"),
  xxl: rem("1600px"),
}

// Helper to detect neutral colors
const isNeutralColor = (color?: string): boolean => {
  return color ? ["zinc", "slate", "gray", "neutral", "stone"].includes(color) : false
}

// Helper to get theme-aware color variable
const getThemeColor = (color: string | undefined, variant: 'filled' | 'light' | 'outline' | 'contrast', theme: any): string => {
  if (!color) return 'var(--mantine-primary-color-filled)'
  return `var(--mantine-color-${color}-${variant})`
}

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
  defaultRadius: 'sm',
  focusRing: 'never',
  autoContrast: true,
  luminanceThreshold: 0.3,

  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, Fira Code, Consolas, monospace',

  spacing: {
    '4xs': rem('2px'),
    '3xs': rem('4px'),
    '2xs': rem('8px'),
    xs: rem('10px'),
    sm: rem('12px'),
    md: rem('16px'),
    lg: rem('20px'),
    xl: rem('24px'),
    '2xl': rem('28px'),
    '3xl': rem('32px'),
    '4xl': rem('40px'),
  },

  fontSizes: {
    xs: rem('12px'),
    sm: rem('14px'),
    md: rem('16px'),
    lg: rem('18px'),
    xl: rem('20px'),
    '2xl': rem('24px'),
    '3xl': rem('30px'),
    '4xl': rem('36px'),
    '5xl': rem('48px'),
  },

  lineHeights: {
    xs: rem('18px'),
    sm: rem('20px'),
    md: rem('24px'),
    lg: rem('28px'),
  },

  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem('36px'), lineHeight: rem('44px'), fontWeight: '600' },
      h2: { fontSize: rem('30px'), lineHeight: rem('38px'), fontWeight: '600' },
      h3: { fontSize: rem('24px'), lineHeight: rem('32px'), fontWeight: '600' },
      h4: { fontSize: rem('20px'), lineHeight: rem('30px'), fontWeight: '600' },
    },
  },

  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
    xxl: '0 25px 50px rgba(0, 0, 0, 0.25)',
  },

  cursorType: 'pointer',

  components: {
    Container: {
      vars: (_, { size, fluid }) => ({
        root: {
          '--container-size': fluid
            ? '100%'
            : size !== undefined && size in CONTAINER_SIZES
              ? CONTAINER_SIZES[size]
              : rem(size),
        },
      }),
    },

    Button: {
      vars: (theme, props) => {
        const color = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        const variant = props.variant ?? 'filled'
        const isNeutralColor = color && ["zinc", "slate", "gray", "neutral", "stone"].includes(color)

        return {
          root: {
            '--button-color': (() => {
              if (variant === 'filled') {
                return color ? `var(--mantine-color-${color}-contrast)` : 'var(--mantine-primary-color-contrast)'
              }
              if (variant === 'white') {
                return isNeutralColor ? 'var(--mantine-color-black)' : undefined
              }
              return undefined
            })(),
          },
        }
      },
    },

    Card: {
      defaultProps: {
        p: 'xl',
        shadow: 'xl',
        withBorder: true,
      },
      styles: (theme) => ({
        root: {
          backgroundColor:
            theme.primaryColor === "rose" || theme.primaryColor === "green"
              ? "var(--mantine-color-secondary-filled)"
              : undefined,
        },
      }),
    },

    Paper: {
      defaultProps: {
        shadow: 'xl',
      },
      vars: (theme) => ({
        root: {
          'paper-bg': 'var(--mantine-color-body)',
          'paper-shadow': theme.shadows.md,
        },
      }),
    },

    Input: {
      vars: (theme, props) => {
        const hasError = props.error

        return {
          input: {
            'input-bg': 'var(--mantine-color-body)',
            'input-border-color': hasError
              ? theme.colors.red[6]
              : 'var(--mantine-color-default-border)',
            'input-placeholder-color': 'var(--mantine-color-placeholder)',
          }
        }
      },
    },

    Select: {
      defaultProps: {
        checkIconPosition: "right",
      },
      vars: (theme, props) => {
        const hasError = props.error

        return {
          input: {
            'select-bg': 'var(--mantine-color-body)',
            'select-border-color': hasError
              ? theme.colors.red[6]
              : 'var(--mantine-color-default-border)',
            'select-placeholder-color': 'var(--mantine-color-placeholder)',
          }
        }
      },
    },

    Textarea: {
      vars: (theme, props) => {
        const hasError = props.error

        return {
          textarea: {
            'textarea-bg': 'var(--mantine-color-body)',
            'textarea-border-color': hasError
              ? theme.colors.red[6]
              : 'var(--mantine-color-default-border)',
            'textarea-placeholder-color': 'var(--mantine-color-placeholder)',
          }
        }
      },
    },

    Checkbox: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        return {
          root: {
            '--checkbox-color': colorKey
              ? `var(--mantine-color-${colorKey}-filled)`
              : 'var(--mantine-primary-color-filled)',
            '--checkbox-icon-color': colorKey
              ? `var(--mantine-color-${colorKey}-contrast)`
              : 'var(--mantine-primary-color-contrast)',
          },
        }
      },
    },

    Radio: {
      vars: (theme, props) => ({
        root: {
          '--radio-color': props.color
            ? Object.keys(theme.colors).includes(props.color)
              ? `var(--mantine-color-${props.color}-filled)`
              : props.color
            : "var(--mantine-primary-color-filled)",
          '--radio-icon-color': props.color
            ? Object.keys(theme.colors).includes(props.color)
              ? `var(--mantine-color-${props.color}-contrast)`
              : props.color
            : "var(--mantine-primary-color-contrast)",
        },
      }),
    },

    Switch: {
      styles: () => ({
        thumb: {
          backgroundColor: "var(--mantine-color-default)",
          borderColor: "var(--mantine-color-default-border)",
        },
        track: {
          borderColor: "var(--mantine-color-default-border)",
        },
      }),
    },

    Modal: {
      defaultProps: {
        withBorder: true,
      },
      vars: (theme) => ({
        content: {
          'modal-bg': 'var(--mantine-color-body)',
          'modal-shadow': theme.shadows.xl,
        },
      }),
    },

    Drawer: {
      vars: (theme) => ({
        content: {
          'drawer-bg': 'var(--mantine-color-body)',
          'drawer-shadow': theme.shadows.lg,
        },
      }),
    },

    Popover: {
      vars: (theme) => ({
        dropdown: {
          'popover-bg': 'var(--mantine-color-body)',
          'popover-shadow': theme.shadows.lg,
        },
      }),
    },

    Tooltip: {
      vars: () => ({
        tooltip: {
          '--tooltip-bg': 'var(--mantine-primary-color-filled)',
          '--tooltip-color': 'var(--mantine-primary-color-contrast)',
        },
      }),
    },

    Notification: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        return {
          root: {
            '--notification-bg': colorKey ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
            '--notification-border': colorKey ? `var(--mantine-color-${colorKey}-outline)` : 'var(--mantine-primary-color-outline)',
            '--notification-color': colorKey ? `var(--mantine-color-${colorKey}-light-color)` : 'var(--mantine-primary-color-light-color)',
          }
        }
      },
    },

    Loader: {
      vars: (theme, props) => ({
        root: {
          'loader-color': theme.colors[props.color || 'primary'][6],
        },
      }),
    },

    ActionIcon: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey)
        const variant = props.variant ?? "filled"

        return {
          root: {
            '--ai-color': (() => {
              if (variant === "filled") {
                return colorKey
                  ? `var(--mantine-color-${colorKey}-contrast)`
                  : "var(--mantine-primary-color-contrast)"
              }
              if (variant === "white") {
                return isNeutralColor ? "var(--mantine-color-black)" : undefined
              }
              return undefined
            })(),
          },
        }
      }
    },

    Badge: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey)
        const variant = props.variant ?? "filled"

        return {
          root: {
            '--badge-bg': variant === "filled" && colorKey ? `var(--mantine-color-${colorKey}-filled)` : undefined,
            '--badge-color':
              variant === "filled"
                ? (colorKey ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)')
                : variant === "white"
                  ? (isNeutralColor ? `var(--mantine-color-black)` : undefined)
                  : undefined,
          },
        }
      },
    },

    Chip: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        const variant = props.variant ?? "filled"

        return {
          root: {
            '--chip-bg':
              variant !== "light"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-filled)`
                  : "var(--mantine-primary-color-filled)"
                : undefined,
            '--chip-color':
              variant === "filled"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-contrast)`
                  : "var(--mantine-primary-color-contrast)"
                : undefined,
          },
        }
      },
    },

    // Missing components from original theme
    Avatar: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey)
        const variant = props.variant ?? "light"

        return {
          root: {
            '--avatar-bg':
              variant === "filled"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-filled)`
                  : "var(--mantine-primary-color-filled)"
                : variant === "light"
                  ? colorKey
                    ? `var(--mantine-color-${colorKey}-light)`
                    : "var(--mantine-primary-color-light)"
                  : undefined,

            '--avatar-color':
              variant === "filled"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-contrast)`
                  : "var(--mantine-primary-color-contrast)"
                : variant === "light"
                  ? colorKey
                    ? `var(--mantine-color-${colorKey}-light-color)`
                    : "var(--mantine-primary-color-light-color)"
                  : variant === "white"
                    ? isNeutralColor
                      ? `var(--mantine-color-black)`
                      : colorKey
                        ? `var(--mantine-color-${colorKey}-outline)`
                        : "var(--mantine-primary-color-filled)"
                    : variant === "outline" || variant === "transparent"
                      ? colorKey
                        ? `var(--mantine-color-${colorKey}-outline)`
                        : "var(--mantine-primary-color-filled)"
                      : undefined,

            '--avatar-bd':
              variant === "outline"
                ? colorKey
                  ? `1px solid var(--mantine-color-${colorKey}-outline)`
                  : "1px solid var(--mantine-primary-color-filled)"
                : undefined,
          },
        }
      },
    },

    SegmentedControl: {
      vars: (theme, props) => ({
        root: {
          '--sc-color': props.color
            ? Object.keys(theme.colors).includes(props.color)
              ? ["zinc", "slate", "gray", "neutral", "stone"].includes(props.color)
                ? "var(--mantine-color-body)"
                : `var(--mantine-color-${props.color}-filled)`
              : props.color
            : "var(--mantine-color-default)",
        },
      }),
    },

    NavLink: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        const variant = props.variant ?? "light"

        return {
          root: {
            '--nl-color':
              variant === "filled" ? colorKey ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)' : undefined,
          },
          children: {},
        }
      },
    },

    Pagination: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined

        return {
          root: {
            '--pagination-active-color': colorKey
              ? `var(--mantine-color-${colorKey}-contrast)`
              : "var(--mantine-primary-color-contrast)",
          },
        }
      },
    },

    Stepper: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined

        return {
          root: {
            '--stepper-icon-color': colorKey
              ? `var(--mantine-color-${colorKey}-contrast)`
              : "var(--mantine-primary-color-contrast)",
          },
        }
      },
    },

    Alert: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey)
        const variant = props.variant ?? "light"

        return {
          root: {
            '--alert-color':
              variant === "filled"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-contrast)`
                  : "var(--mantine-primary-color-contrast)"
                : variant === "white"
                  ? (isNeutralColor
                    ? `var(--mantine-color-black)`
                    : undefined)
                  : undefined,
          },
        }
      },
    },

    Indicator: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined

        return {
          root: {
            '--indicator-text-color': colorKey
              ? `var(--mantine-color-${colorKey}-contrast)`
              : "var(--mantine-primary-color-contrast)",
          },
        }
      },
    },

    ThemeIcon: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey)
        const variant = props.variant ?? "filled"

        return {
          root: {
            '--ti-color': variant === "filled"
              ? (colorKey
                ? `var(--mantine-color-${colorKey}-contrast)`
                : "var(--mantine-primary-color-contrast)")
              : variant === "white"
                ? (isNeutralColor
                  ? `var(--mantine-color-black)`
                  : undefined)
                : undefined,
          },
        }
      },
    },

    Timeline: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined

        return {
          root: {
            '--tl-icon-color': colorKey ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)',
          },
        }
      },
    },

    Blockquote: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined

        return {
          root: {
            '--bq-bg-dark': colorKey ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
            '--bq-bg-light': colorKey ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
          },
        }
      },
    },

    Mark: {
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : 'yellow'
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey)

        return {
          root: {
            '--mark-bg-light': `var(--mantine-color-${colorKey}-${isNeutralColor ? '3' : 'filled-hover'})`,
            '--mark-bg-dark': `var(--mantine-color-${colorKey}-filled)`
          },
        }
      },
    },

    // Anchor component with default props
    Anchor: {
      defaultProps: {
        underline: "always",
      },
    },

    // Enhanced Box component with additional style props for inline style replacement
    Box: {
      vars: (theme, props) => ({
        root: {
          '--box-bg': props.bg ? `var(--mantine-color-${props.bg}-filled)` : undefined,
          '--box-bg-light': props.bg ? `var(--mantine-color-${props.bg}-light)` : undefined,
          '--box-bg-outline': props.bg ? `var(--mantine-color-${props.bg}-outline)` : undefined,
          '--box-color': props.c ? `var(--mantine-color-${props.c}-filled)` : undefined,
          '--box-border-color': props.bdColor ? `var(--mantine-color-${props.bdColor}-filled)` : undefined,
          '--box-cursor': props.cursor || undefined,
          '--box-position': props.pos || undefined,
          '--box-z-index': props.zIndex?.toString() || undefined,
          '--box-opacity': props.opacity?.toString() || undefined,
          '--box-user-select': props.userSelect || undefined,
          '--box-pointer-events': props.pointerEvents || undefined,
        }
      }),
      styles: {
        root: {
          backgroundColor: 'var(--box-bg)',
          color: 'var(--box-color)',
          cursor: 'var(--box-cursor)',
          position: 'var(--box-position)',
          zIndex: 'var(--box-z-index)',
          opacity: 'var(--box-opacity)',
          userSelect: 'var(--box-user-select)',
          pointerEvents: 'var(--box-pointer-events)',
        }
      }
    },

    // Enhanced Flex component with comprehensive flexbox props
    Flex: {
      vars: (theme, props) => ({
        root: {
          '--flex-direction': props.direction || 'row',
          '--flex-align': props.align || 'stretch',
          '--flex-justify': props.justify || 'flex-start',
          '--flex-wrap': props.wrap || 'nowrap',
          '--flex-gap': props.gap ? `var(--mantine-spacing-${props.gap})` : '0',
          '--flex-column-gap': props.gap ? `var(--mantine-spacing-${props.gap})` : '0',
          '--flex-row-gap': props.gap ? `var(--mantine-spacing-${props.gap})` : '0',
        }
      }),
      styles: {
        root: {
          display: 'flex',
          flexDirection: 'var(--flex-direction)',
          alignItems: 'var(--flex-align)',
          justifyContent: 'var(--flex-justify)',
          flexWrap: 'var(--flex-wrap)',
          gap: 'var(--flex-gap)',
          columnGap: 'var(--flex-column-gap)',
          rowGap: 'var(--flex-row-gap)',
        }
      }
    },

    // Enhanced Grid component for CSS Grid patterns
    Grid: {
      vars: (theme, props) => ({
        root: {
          '--grid-template-columns': props.templateColumns || undefined,
          '--grid-template-rows': props.templateRows || undefined,
          '--grid-gap': props.gap ? `var(--mantine-spacing-${props.gap})` : '0',
          '--grid-align-content': props.alignContent || 'start',
          '--grid-justify-content': props.justifyContent || 'start',
          '--grid-align-items': props.alignItems || 'stretch',
        }
      }),
      styles: {
        root: {
          display: 'grid',
          gridTemplateColumns: 'var(--grid-template-columns)',
          gridTemplateRows: 'var(--grid-template-rows)',
          gap: 'var(--grid-gap)',
          alignContent: 'var(--grid-align-content)',
          justifyContent: 'var(--grid-justify-content)',
          alignItems: 'var(--grid-align-items)',
        }
      }
    },

    // Enhanced Text component for typography props
    Text: {
      vars: (theme, props) => ({
        root: {
          '--text-font-size': props.size ? `var(--mantine-font-size-${props.size})` : undefined,
          '--text-font-weight': props.fw?.toString() || undefined,
          '--text-line-height': props.lh ? `var(--mantine-line-height-${props.lh})` : undefined,
          '--text-letter-spacing': props.ls ? `${props.ls}` : undefined,
          '--text-transform': props.tt || undefined,
          '--text-align': props.ta || undefined,
          '--text-decoration': props.td || undefined,
          '--text-white-space': props.ws || undefined,
          '--text-word-break': props.wb || undefined,
        }
      }),
      styles: {
        root: {
          fontSize: 'var(--text-font-size)',
          fontWeight: 'var(--text-font-weight)',
          lineHeight: 'var(--text-line-height)',
          letterSpacing: 'var(--text-letter-spacing)',
          textTransform: 'var(--text-transform)',
          textAlign: 'var(--text-align)',
          textDecoration: 'var(--text-decoration)',
          whiteSpace: 'var(--text-white-space)',
          wordBreak: 'var(--text-word-break)',
        }
      }
    },
  },
})