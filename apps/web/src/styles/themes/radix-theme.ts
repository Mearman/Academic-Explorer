import { createTheme } from '@mantine/core'

import { essentialComponents } from './essential-components'
import { radixComponents } from './radix-components'
import { foundationColors, foundationSettings } from './theme-base'

export const radixTheme = createTheme({
  colors: foundationColors,
  ...foundationSettings,
  other: {
    // Override shadcn CSS properties to use Mantine equivalents (globalStyle in shadcn-theme.css.ts sets body color)
    '--shadcn-background': 'var(--mantine-color-body)',
    '--shadcn-foreground': 'var(--mantine-color-text)',
    '--shadcn-card': 'initial',
    '--shadcn-card-foreground': 'initial',
    '--shadcn-popover': 'initial',
    '--shadcn-popover-foreground': 'initial',
    '--shadcn-primary': 'initial',
    '--shadcn-primary-foreground': 'initial',
    '--shadcn-secondary': 'initial',
    '--shadcn-secondary-foreground': 'initial',
    '--shadcn-muted': 'initial',
    '--shadcn-muted-foreground': 'initial',
    '--shadcn-accent': 'initial',
    '--shadcn-accent-foreground': 'initial',
    '--shadcn-destructive': 'initial',
    '--shadcn-destructive-foreground': 'initial',
    '--shadcn-border': 'initial',
    '--shadcn-input': 'initial',
    '--shadcn-ring': 'initial',
    '--shadcn-radius': 'initial',
    '--shadcn-background-dark': 'initial',
    '--shadcn-foreground-dark': 'initial',
    '--shadcn-card-dark': 'initial',
    '--shadcn-card-foreground-dark': 'initial',
    '--shadcn-popover-dark': 'initial',
    '--shadcn-popover-foreground-dark': 'initial',
    '--shadcn-primary-dark': 'initial',
    '--shadcn-primary-foreground-dark': 'initial',
    '--shadcn-secondary-dark': 'initial',
    '--shadcn-secondary-foreground-dark': 'initial',
    '--shadcn-muted-dark': 'initial',
    '--shadcn-muted-foreground-dark': 'initial',
    '--shadcn-accent-dark': 'initial',
    '--shadcn-accent-foreground-dark': 'initial',
    '--shadcn-destructive-dark': 'initial',
    '--shadcn-destructive-foreground-dark': 'initial',
    '--shadcn-border-dark': 'initial',
    '--shadcn-input-dark': 'initial',
    '--shadcn-ring-dark': 'initial',
  },
  components: {
    ...essentialComponents,
    ...radixComponents, // Minimal additive layer on top of Mantine
  },
})