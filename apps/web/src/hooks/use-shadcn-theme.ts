import { useMantineColorScheme, useMantineTheme } from '@mantine/core'
import { getAcademicEntityColors } from '@/styles/css-variable-resolver'
import { shadcnPalettes, type ShadcnPalette } from '@/styles/shadcn-colors'

export const useShadcnTheme = () => {
  const { colorScheme } = useMantineColorScheme()
  const mantineTheme = useMantineTheme()

  // Resolve the actual color scheme when colorScheme is 'auto'
  const resolvedColorScheme = colorScheme === 'auto'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : colorScheme

  // Get selected color palette from localStorage
  const getColorPalette = (): ShadcnPalette => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bibgraph-color-palette')
      if (saved && saved in shadcnPalettes) {
        return saved as ShadcnPalette
      }
    }
    return 'blue' // default palette
  }

  const selectedPalette = getColorPalette()

  const academicEntityColors = getAcademicEntityColors(resolvedColorScheme)

  const getEntityColor = (entityType: keyof typeof academicEntityColors): string => {
    const colorKey = academicEntityColors[entityType]
    return mantineTheme.colors[colorKey][6] // Use shade 6 for primary entity colors
  }

  const getEntityColorVariant = (
    entityType: keyof typeof academicEntityColors,
    variant: number = 6
  ): string => {
    const colorKey = academicEntityColors[entityType]
    return mantineTheme.colors[colorKey][variant]
  }

  const getPaletteColor = (palette: ShadcnPalette = selectedPalette, shade: number = 6): string => {
    return shadcnPalettes[palette][shade] || shadcnPalettes.blue[shade]
  }

  const getSemanticColor = (semanticKey: string): string => {
    switch (semanticKey) {
      case 'primary':
        return getPaletteColor()
      case 'secondary':
        return shadcnPalettes.zinc[6]
      case 'accent':
        return getPaletteColor(selectedPalette, 5)
      case 'background':
        return resolvedColorScheme === 'dark' ? shadcnPalettes.slate[10] : shadcnPalettes.slate[0]
      case 'foreground':
        return resolvedColorScheme === 'dark' ? shadcnPalettes.slate[0] : shadcnPalettes.slate[9]
      case 'muted':
        return resolvedColorScheme === 'dark' ? shadcnPalettes.zinc[5] : shadcnPalettes.zinc[4]
      case 'border':
        return resolvedColorScheme === 'dark' ? shadcnPalettes.zinc[8] : shadcnPalettes.zinc[2]
      default:
        return getPaletteColor()
    }
  }

  return {
    colorScheme: resolvedColorScheme,
    theme: mantineTheme,
    academicEntityColors,
    selectedPalette,
    getEntityColor,
    getEntityColorVariant,
    getPaletteColor,
    getSemanticColor,
    isDark: resolvedColorScheme === 'dark',
    isLight: resolvedColorScheme === 'light',
  }
}