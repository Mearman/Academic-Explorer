import { createTheme, MantineColorsTuple } from '@mantine/core';

// Custom colors based on your existing design tokens
const work: MantineColorsTuple = [
  '#eff6ff',
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6', // Your work color
  '#2563eb',
  '#1d4ed8',
  '#1e40af',
  '#1e3a8a'
];

const openAccess: MantineColorsTuple = [
  '#f0fdf4',
  '#dcfce7',
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#10b981', // Your openAccess color
  '#16a34a',
  '#15803d',
  '#166534',
  '#14532d'
];

const publisher: MantineColorsTuple = [
  '#fef2f2',
  '#fee2e2',
  '#fecaca',
  '#fca5a5',
  '#f87171',
  '#ef4444', // Your publisher color
  '#dc2626',
  '#b91c1c',
  '#991b1b',
  '#7f1d1d'
];

export const mantineTheme = createTheme({
  primaryColor: 'work',
  colors: {
    work,
    openAccess,
    publisher,
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  
  // Component-specific overrides
  components: {
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    },
    Group: {
      defaultProps: {
        gap: 'md',
      },
    },
    Stack: {
      defaultProps: {
        gap: 'md',
      },
    },
  },
  
  // Spacing that matches your design tokens
  spacing: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  
  // Typography scale
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
  
  // Border radius
  radius: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },
  
  // Shadows
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
});