import { createTheme } from '@mantine/core'
import { foundationColors, foundationSettings } from './theme-base'
import { essentialComponents } from './essential-components'

// PURE MANTINE theme - uses only essential components, no styling overrides
// This achieves pure Mantine defaults + custom colors/border radius
export const mantineTheme = createTheme({
  colors: foundationColors,
  ...foundationSettings,
  components: essentialComponents, // ONLY essential components, no styling overrides
})