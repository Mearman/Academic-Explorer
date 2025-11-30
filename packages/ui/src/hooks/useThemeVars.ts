/**
 * Hook for accessing shadcn theme variables in UI components
 * Provides typed access to theme colors and ensures consistency
 */

import { useMantineTheme } from '@mantine/core';

/**
 * Hook to access shadcn theme variables with type safety
 * Returns functions to get theme-aware color values
 */
export function useThemeVars() {
  const theme = useMantineTheme();

  /**
   * Get a shadcn theme variable value
   */
  const getThemeVar = (variableName: string): string => {
    return `var(--shadcn-${variableName})`;
  };

  /**
   * Get academic entity color mapping
   */
  const getEntityColor = (entityType: string): string => {
    const entityColors: Record<string, string> = {
      works: 'blue',
      authors: 'green',
      sources: 'violet',
      institutions: 'orange',
      concepts: 'pink',
      topics: 'red',
      publishers: 'teal',
      funders: 'cyan',
      keywords: 'zinc',
    };

    return getThemeVar(entityColors[entityType] || 'gray');
  };

  /**
   * Get semantic color with fallback
   */
  const getSemanticColor = (colorType: 'primary' | 'secondary' | 'muted' | 'destructive' | 'success' | 'warning'): string => {
    return getThemeVar(colorType);
  };

  return {
    getThemeVar,
    getEntityColor,
    getSemanticColor,

    // Pre-defined semantic variables
    foreground: getThemeVar('foreground'),
    mutedForeground: getThemeVar('muted-foreground'),
    background: getThemeVar('background'),
    muted: getThemeVar('muted'),
    border: getThemeVar('border'),
    primary: getThemeVar('primary'),
    secondary: getThemeVar('secondary'),
    destructive: getThemeVar('destructive'),
    success: getThemeVar('success'),
    warning: getThemeVar('warning'),

    // Academic entity colors
    work: getEntityColor('works'),
    author: getEntityColor('authors'),
    source: getEntityColor('sources'),
    institution: getEntityColor('institutions'),
    concept: getEntityColor('concepts'),
    topic: getEntityColor('topics'),
    publisher: getEntityColor('publishers'),
    funder: getEntityColor('funders'),
    keyword: getEntityColor('keywords'),
  };
}