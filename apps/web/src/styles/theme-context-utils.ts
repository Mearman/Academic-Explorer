// Theme context utilities - separated from theme definitions

// Border radius value mappings (matching Tailwind CSS)
export const radiusValues = {
  xs: "2px",   // rounded-sm
  sm: "4px",   // rounded (default)
  md: "6px",   // rounded-md
  lg: "8px",   // rounded-lg
  xl: "12px",  // rounded-xl
  "2xl": "16px", // rounded-2xl
  "3xl": "24px", // rounded-3xl
  full: "9999px", // rounded-full
} as const

// Component library theme overrides for dynamic border radius
export const createComponentLibraryOverrides = (borderRadius: keyof typeof radiusValues) => ({
  mantine: {
    components: {
      Button: {
        styles: {
          root: {
            fontWeight: 600,
            textTransform: "none",
            letterSpacing: "0.025em",
            transition: "all 0.2s ease",
            borderRadius: radiusValues[borderRadius],
          },
        },
      },
      Card: {
        styles: {
          root: {
            boxShadow: "var(--mantine-shadow-md)",
            borderRadius: radiusValues[borderRadius],
          },
        },
      },
      Input: {
        styles: {
          input: {
            fontSize: "14px",
            lineHeight: "1.5",
            minHeight: "36px",
            borderRadius: radiusValues[borderRadius],
          },
        },
      },
    },
  },
  shadcn: {
    components: {
      Button: {
        styles: {
          root: {
            fontWeight: 500,
            transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
            borderRadius: radiusValues[borderRadius],
            fontFamily: 'inherit',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
        },
      },
      Card: {
        styles: {
          root: {
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            borderRadius: radiusValues[borderRadius],
            backgroundColor: 'hsl(var(--shadcn-card))',
            border: '1px solid hsl(var(--shadcn-border))',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          },
        },
      },
      Input: {
        styles: {
          input: {
            fontSize: "14px",
            lineHeight: "1.5",
            minHeight: "40px", // h-10 in shadcn
            borderRadius: radiusValues[borderRadius],
            backgroundColor: 'hsl(var(--shadcn-background))',
            border: '1px solid hsl(var(--shadcn-border))',
            '&:focus': {
              borderColor: 'hsl(var(--shadcn-ring))',
              boxShadow: '0 0 0 3px hsl(var(--shadcn-ring) / 0.1)',
              outline: 'none',
            },
            '&:focus-visible': {
              outline: '2px solid hsl(var(--shadcn-ring))',
              outlineOffset: '2px',
            },
          },
        },
      },
    },
  },
  radix: {
    components: {
      Button: {
        styles: {
          root: {
            fontWeight: 400,
            transition: "all 0.1s ease",
            borderRadius: radiusValues[borderRadius],
            fontFamily: 'inherit',
            // Radix is unstyled by default - minimal styling
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'pointer',
            '&:disabled': {
              opacity: '0.5',
              cursor: 'not-allowed',
            },
            '&:focus-visible': {
              outline: '2px solid hsl(var(--shadcn-ring))',
              outlineOffset: '2px',
            },
          },
        },
      },
      Card: {
        styles: {
          root: {
            // Radix is unstyled - absolutely minimal
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            borderRadius: radiusValues[borderRadius],
          },
        },
      },
      Input: {
        styles: {
          input: {
            fontSize: "14px",
            lineHeight: "1.5",
            minHeight: "32px", // More compact for Radix
            borderRadius: radiusValues[borderRadius],
            // Radix is unstyled - minimal browser defaults
            background: 'white',
            border: '1px solid #ccc',
            padding: '0 8px',
            '&:focus': {
              outline: '2px solid hsl(var(--shadcn-ring))',
              outlineOffset: '2px',
              borderColor: 'hsl(var(--shadcn-ring))',
            },
            '&:disabled': {
              opacity: '0.5',
              cursor: 'not-allowed',
              backgroundColor: '#f5f5f5',
            },
          },
        },
      },
    },
  },
})