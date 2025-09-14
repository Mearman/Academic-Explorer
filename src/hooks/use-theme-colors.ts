/**
 * Theme colors utility hook
 * Provides consistent access to theme colors across light and dark modes
 */

import { useMantineColorScheme, useMantineTheme } from '@mantine/core';
import type { EntityType } from '@/lib/graph/types';

export function useThemeColors() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  // Resolve the actual color scheme when colorScheme is 'auto'
  const resolvedColorScheme = colorScheme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : colorScheme;

  const isDark = resolvedColorScheme === 'dark';

  // Base color utilities
  const getColor = (color: string, shade: number = 5) => {
    return theme.colors[color]?.[shade] || color;
  };

  // Semantic colors that adapt to light/dark mode
  const colors = {
    // Text colors - using Mantine CSS variables for better theme integration
    text: {
      primary: 'var(--mantine-color-text)',
      secondary: isDark ? theme.colors.gray[3] : theme.colors.gray[6],
      tertiary: isDark ? theme.colors.gray[4] : theme.colors.gray[5],
      inverse: isDark ? theme.colors.gray[9] : theme.colors.gray[0],
    },

    // Background colors - using Mantine CSS variables for better theme integration
    background: {
      primary: 'var(--mantine-color-body)',
      secondary: isDark ? theme.colors.gray[8] : theme.colors.gray[0],
      tertiary: isDark ? theme.colors.gray[7] : theme.colors.gray[1],
      overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)',
      blur: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    },

    // Border colors - using Mantine CSS variables for better theme integration
    border: {
      primary: 'var(--mantine-color-default-border)',
      secondary: isDark ? theme.colors.gray[6] : theme.colors.gray[3],
    },

    // Semantic colors
    primary: theme.colors.blue[5],
    success: theme.colors.green?.[5] || '#10b981',
    warning: theme.colors.yellow?.[5] || '#f59e0b',
    error: theme.colors.red?.[5] || '#ef4444',
    info: theme.colors.blue[5],

    // Academic entity colors
    entity: {
      work: theme.colors.blue[5],
      author: theme.colors.author?.[5] || '#10b981',
      source: theme.colors.source?.[5] || '#8b5cf6',
      institution: theme.colors.institution?.[5] || '#f59e0b',
      concept: theme.colors.red?.[5] || '#ef4444',
      topic: theme.colors.red?.[5] || '#ef4444',
      publisher: theme.colors.cyan?.[5] || '#06b6d4',
      funder: theme.colors.pink?.[5] || '#ec4899',
    },
  };

  // Type guard for valid entity color keys
  const isValidEntityColorKey = (key: string): key is keyof typeof colors.entity => {
    const validKeys = [
      'work', 'author', 'source', 'institution', 'concept', 'topic', 'publisher', 'funder'
    ];
    return validKeys.includes(key);
  };

  // Entity color utilities
  const getEntityColor = (entityType: EntityType | string): string => {
    const normalizedType = entityType.toLowerCase();

    if (isValidEntityColorKey(normalizedType)) {
      return colors.entity[normalizedType];
    }

    return colors.primary;
  };

  const getEntityColorShade = (entityType: EntityType | string, shade: number = 5): string => {
    const normalizedType = entityType.toLowerCase();

    const colorMap: Record<string, string> = {
      work: 'blue',
      works: 'blue',
      author: 'author',
      authors: 'author',
      source: 'source',
      sources: 'source',
      institution: 'institution',
      institutions: 'institution',
      concept: 'red',
      concepts: 'red',
      topic: 'red',
      topics: 'red',
      publisher: 'cyan',
      publishers: 'cyan',
      funder: 'pink',
      funders: 'pink',
    };

    const colorKey = colorMap[normalizedType] || 'blue';
    return getColor(colorKey, shade);
  };

  return {
    colors,
    getColor,
    getEntityColor,
    getEntityColorShade,
    isDark,
    theme,
  };
}