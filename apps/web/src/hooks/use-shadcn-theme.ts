import { useMantineColorScheme, useMantineTheme } from '@mantine/core'
import { getAcademicEntityColors } from '@/styles/css-variable-resolver'

export const useShadcnTheme = () => {
  const { colorScheme } = useMantineColorScheme()
  const mantineTheme = useMantineTheme()

  // Resolve the actual color scheme when colorScheme is 'auto'
  const resolvedColorScheme = colorScheme === 'auto'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : colorScheme

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

  const getSemanticColor = (semanticKey: string): string => {
    switch (semanticKey) {
      case 'primary':
        return mantineTheme.colors.primary[6]
      case 'secondary':
        return mantineTheme.colors.secondary[6]
      case 'accent':
        return mantineTheme.colors.accent[6]
      case 'background':
        return colorScheme === 'dark' ? '#09090b' : '#ffffff'
      case 'foreground':
        return colorScheme === 'dark' ? '#fafafa' : '#09090b'
      case 'muted':
        return colorScheme === 'dark' ? '#71717a' : '#a1a1aa'
      case 'border':
        return colorScheme === 'dark' ? '#27272a' : '#e4e4e7'
      default:
        return mantineTheme.colors.primary[6]
    }
  }

  return {
    colorScheme: resolvedColorScheme,
    theme: mantineTheme,
    academicEntityColors,
    getEntityColor,
    getEntityColorVariant,
    getSemanticColor,
    isDark: resolvedColorScheme === 'dark',
    isLight: resolvedColorScheme === 'light',
  }
}