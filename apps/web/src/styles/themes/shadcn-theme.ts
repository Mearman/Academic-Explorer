import { createTheme } from '@mantine/core'
import { foundationColors, foundationSettings, shadcnSemanticTokens } from './theme-base'
import { sharedComponents } from './shared-components'

// shadcn-specific component overrides
const shadcnComponentOverrides = {
  Button: {
    styles: {
      root: {
        fontWeight: 500,
        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
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
}

export const shadcnTheme = createTheme({
  colors: foundationColors,
  ...foundationSettings,
  // Add shadcn semantic tokens
  other: shadcnSemanticTokens,
  components: {
    ...sharedComponents,
    // Apply shadcn-specific overrides
    ...Object.fromEntries(
      Object.entries(shadcnComponentOverrides).map(([key, value]) => [
        key,
        {
          ...sharedComponents[key as keyof typeof sharedComponents],
          ...value,
        }
      ])
    ),
  },
})