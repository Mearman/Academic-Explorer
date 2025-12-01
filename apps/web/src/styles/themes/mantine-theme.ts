import { createTheme } from '@mantine/core'
import { foundationColors, foundationSettings } from './theme-base'
import { sharedComponents } from './shared-components'

// Mantine-specific component overrides
const mantineComponentOverrides = {
  Button: {
    styles: {
      root: {
        fontWeight: 600,
        textTransform: "none",
        letterSpacing: "0.025em",
        transition: "all 0.2s ease",
      },
    },
  },
  Card: {
    styles: {
      root: {
        boxShadow: "var(--mantine-shadow-md)",
      },
    },
  },
  Input: {
    styles: {
      input: {
        fontSize: "14px",
        lineHeight: "1.5",
        minHeight: "36px",
      },
    },
  },
}

export const mantineTheme = createTheme({
  colors: foundationColors,
  ...foundationSettings,
  components: {
    ...sharedComponents,
    // Apply mantine-specific overrides
    ...Object.fromEntries(
      Object.entries(mantineComponentOverrides).map(([key, value]) => [
        key,
        {
          ...sharedComponents[key as keyof typeof sharedComponents],
          ...value,
        }
      ])
    ),
  },
})