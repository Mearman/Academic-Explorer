import { createTheme } from '@mantine/core'
import { foundationColors, foundationSettings, shadcnSemanticTokens } from './theme-base'
import { essentialComponents } from './essential-components'
import { shadcnComponents } from './shadcn-components'

export const shadcnTheme = createTheme({
  colors: foundationColors,
  ...foundationSettings,
  other: shadcnSemanticTokens,
  components: {
    ...essentialComponents,
    ...shadcnComponents, // Additive layer on top of Mantine
  },
})