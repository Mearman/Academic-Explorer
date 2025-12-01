import { createTheme } from '@mantine/core'
import { foundationColors, foundationSettings } from './theme-base'
import { sharedComponents } from './shared-components'

// Radix-specific component overrides (minimal/unstyled)
const radixComponentOverrides = {
  Button: {
    styles: {
      root: {
        fontWeight: 400,
        transition: "all 0.1s ease",
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
      },
    },
  },
  Input: {
    styles: {
      input: {
        fontSize: "14px",
        lineHeight: "1.5",
        minHeight: "32px", // More compact for Radix
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
}

export const radixTheme = createTheme({
  colors: foundationColors,
  ...foundationSettings,
  // Radix doesn't need semantic tokens since it's unstyled
  components: {
    ...sharedComponents,
    // Apply Radix-specific overrides
    ...Object.fromEntries(
      Object.entries(radixComponentOverrides).map(([key, value]) => [
        key,
        {
          ...sharedComponents[key as keyof typeof sharedComponents],
          ...value,
        }
      ])
    ),
  },
})