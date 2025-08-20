/**
 * Theme Provider
 * 
 * Provides dynamic theme switching based on user preference and system settings.
 * Enhanced with error boundaries and fallbacks for robust initialization.
 */

import { MantineProvider } from '@mantine/core';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { lightTheme, darkTheme } from '@/components/design-tokens.css';
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

/**
 * Safe theme provider that handles store initialization errors
 */
function SafeThemeProviderContent({ children }: ThemeProviderProps) {
  const systemColorScheme = useSystemColorScheme();
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [storeTheme, setStoreTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Safely access the app store with error handling
  useEffect(() => {
    try {
      const { theme } = useAppStore.getState();
      setStoreTheme(theme);
    } catch (error) {
      console.warn('[ThemeProvider] Failed to access app store, using system theme:', error);
      setStoreTheme('system');
    }
  }, []);

  // Subscribe to store changes safely
  useEffect(() => {
    try {
      const unsubscribe = useAppStore.subscribe((state) => {
        setStoreTheme(state.theme);
      });
      return unsubscribe;
    } catch (error) {
      console.warn('[ThemeProvider] Failed to subscribe to app store:', error);
      return () => {};
    }
  }, []);

  useEffect(() => {
    switch (storeTheme) {
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
  }, [storeTheme, systemColorScheme]);

  // Apply theme class to document
  useEffect(() => {
    try {
      const themeClass = colorScheme === 'dark' ? darkTheme : lightTheme;
      document.documentElement.className = themeClass;
    } catch (error) {
      console.warn('[ThemeProvider] Failed to apply theme class:', error);
    }
  }, [colorScheme]);

  return (
    <MantineProvider
      theme={mantineTheme}
      forceColorScheme={colorScheme}
    >
      {children}
    </MantineProvider>
  );
}

/**
 * Fallback provider for when MantineProvider fails to initialize
 */
function _FallbackThemeProvider({ children }: ThemeProviderProps) {
  console.warn('[ThemeProvider] Using fallback provider due to initialization error');
  
  return (
    <MantineProvider theme={mantineTheme}>
      {children}
    </MantineProvider>
  );
}

/**
 * Error fallback component
 */
function ThemeProviderErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  console.error('[ThemeProvider] Error boundary caught:', error);
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', margin: '10px' }}>
      <h3>Theme Provider Error</h3>
      <p>Failed to initialize theme provider: {error.message}</p>
      <button onClick={resetErrorBoundary} style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}>
        Retry
      </button>
    </div>
  );
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ThemeProviderErrorFallback}
      onError={(error: Error) => {
        console.error('[ThemeProvider] Error boundary triggered:', error);
      }}
    >
      <SafeThemeProviderContent>{children}</SafeThemeProviderContent>
    </ErrorBoundary>
  );
}