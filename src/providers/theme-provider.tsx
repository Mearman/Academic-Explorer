/**
 * Theme Provider
 * 
 * Provides dynamic theme switching based on user preference and system settings.
 */

import { MantineProvider } from '@mantine/core';
import { useEffect, useState } from 'react';

import { mantineTheme } from '@/lib/mantine-theme';
import { useAppStore } from '@/stores/app-store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

function useSystemColorScheme(): 'light' | 'dark' {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return colorScheme;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useAppStore();
  const systemColorScheme = useSystemColorScheme();
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    switch (theme) {
      case 'light':
        setColorScheme('light');
        break;
      case 'dark':
        setColorScheme('dark');
        break;
      case 'system':
        setColorScheme(systemColorScheme);
        break;
      default:
        setColorScheme(systemColorScheme);
    }
  }, [theme, systemColorScheme]);

  return (
    <MantineProvider
      theme={mantineTheme}
      forceColorScheme={colorScheme}
    >
      {children}
    </MantineProvider>
  );
}