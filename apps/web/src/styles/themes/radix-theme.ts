import { createTheme } from '@mantine/core'
import { foundationColors, foundationSettings } from './theme-base'
import { essentialComponents } from './essential-components'
import { radixComponents } from './radix-components'

export const radixTheme = createTheme({
  colors: foundationColors,
  ...foundationSettings,
  components: {
    ...essentialComponents,
    ...radixComponents, // Minimal additive layer on top of Mantine
  },
})