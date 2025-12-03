import { createTheme } from '@mantine/core'

import { essentialComponents } from './essential-components'
import { shadcnComponents } from './shadcn-components'
import { foundationColors, foundationSettings, shadcnSemanticTokens } from './theme-base'

export const shadcnTheme = createTheme({
  colors: foundationColors,
  ...foundationSettings,
  other: shadcnSemanticTokens,
  components: {
    ...essentialComponents,
    ...shadcnComponents, // Additive layer on top of Mantine
  },
})