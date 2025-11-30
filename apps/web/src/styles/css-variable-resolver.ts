import type { ShadcnPalette, ShadcnShade } from './shadcn-colors'
import { shadcnPalettes, shadcnSemanticColors } from './shadcn-colors'

export interface ThemeColors {
  [key: string]: string
}

export interface CSSVariableMapping {
  [palette: string]: {
    [shade: number]: string
  }
}

export const resolveSemanticColor = (
  semanticKey: string,
  mode: 'light' | 'dark'
): string => {
  const colorKey = shadcnSemanticColors[mode][semanticKey as keyof typeof shadcnSemanticColors.light]
  if (!colorKey) return ''

  const [palette, shade] = colorKey.split('.')
  return shadcnPalettes[palette as ShadcnPalette][parseInt(shade) as ShadcnShade]
}

export const generateCSSVariables = (mode: 'light' | 'dark'): ThemeColors => {
  const colors: ThemeColors = {}

  // Generate palette variables
  Object.entries(shadcnPalettes).forEach(([paletteName, shades]) => {
    shades.forEach((color, shadeIndex) => {
      colors[`--shadcn-${paletteName}-${shadeIndex * 50 + 50}`] = color
    })
  })

  // Generate semantic variables
  Object.entries(shadcnSemanticColors[mode]).forEach(([semanticKey, colorValue]) => {
    const [palette, shade] = colorValue.split('.')
    const color = shadcnPalettes[palette as ShadcnPalette][parseInt(shade) as ShadcnShade]
    colors[`--shadcn-${semanticKey}`] = color
  })

  return colors
}

export const generateMantineColors = (): Record<string, string[]> => {
  return Object.fromEntries(
    Object.entries(shadcnPalettes).map(([paletteName, shades]) => [
      paletteName,
      [...shades] // Convert readonly tuple to mutable array
    ])
  )
}

export const resolveThemeVariable = (
  palette: ShadcnPalette,
  shade: ShadcnShade,
  mode: 'light' | 'dark'
): string => {
  return `var(--shadcn-${palette}-${shade * 50 + 50})`
}

export const resolveCSSVariable = (variableName: string, mode: 'light' | 'dark'): string => {
  const lightVars = generateCSSVariables('light')
  const darkVars = generateCSSVariables('dark')
  return `var(--shadcn-${variableName})`
}

export const createCSSVariableString = (mode: 'light' | 'dark'): string => {
  const variables = generateCSSVariables(mode)
  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ')
}

export const getAcademicEntityColors = (mode: 'light' | 'dark') => ({
  work: 'blue',
  author: 'green',
  source: 'violet',
  institution: 'orange',
  concept: 'pink',
  topic: 'red',
  publisher: 'teal',
  funder: 'cyan',
  keyword: 'zinc'
})