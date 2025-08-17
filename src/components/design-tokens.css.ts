import { createGlobalTheme, createThemeContract, createTheme } from '@vanilla-extract/css';

// Theme contract that defines the structure
const colorContract = createThemeContract({
  // Entity type colours (consistent across themes)
  work: null,
  author: null,
  source: null,
  institution: null,
  publisher: null,
  funder: null,
  topic: null,
  concept: null,
  keyword: null,
  continent: null,
  region: null,
  
  // Status colours (consistent across themes)
  openAccess: null,
  closed: null,
  hybrid: null,
  bronze: null,
  gold: null,
  
  // Theme-dependent UI colors
  background: null,
  border: null,
  borderHover: null,
  cardBackground: null,
  shadowColor: null,
  successBackground: null,
  warningBackground: null,
  errorBackground: null,
  infoBackground: null,
  warning: null,
  success: null,
  workDark: null,
  error: null,
  text: null,
  muted: null,
  subtle: null,
  accent: null,
});

// Light theme
export const lightTheme = createTheme(colorContract, {
  // Entity type colours
  work: '#3b82f6',        // Blue
  author: '#10b981',      // Green
  source: '#f59e0b',      // Yellow
  institution: '#8b5cf6', // Purple
  publisher: '#ef4444',   // Red
  funder: '#06b6d4',      // Cyan
  topic: '#f97316',       // Orange
  concept: '#84cc16',     // Lime
  keyword: '#ec4899',     // Pink
  continent: '#6366f1',   // Indigo
  region: '#14b8a6',      // Teal
  
  // Status colours
  openAccess: '#10b981',  // Green
  closed: '#ef4444',      // Red
  hybrid: '#f59e0b',      // Yellow
  bronze: '#cd7c0f',      // Bronze
  gold: '#eab308',        // Gold
  
  // Light theme UI colors
  background: '#ffffff',
  border: '#e5e7eb',
  borderHover: '#d1d5db',
  cardBackground: '#ffffff',
  shadowColor: '#00000010',
  successBackground: '#f0fdf4',
  warningBackground: '#fffbeb',
  errorBackground: '#fef2f2',
  infoBackground: '#f0f9ff',
  warning: '#f59e0b',
  success: '#10b981',
  workDark: '#1e40af',
  error: '#ef4444',
  text: '#1f2937',
  muted: '#6b7280',
  subtle: '#9ca3af',
  accent: '#1f2937',
});

// Dark theme
export const darkTheme = createTheme(colorContract, {
  // Entity type colours (same as light theme)
  work: '#60a5fa',        // Lighter blue for dark mode
  author: '#34d399',      // Lighter green
  source: '#fbbf24',      // Lighter yellow
  institution: '#a78bfa', // Lighter purple
  publisher: '#f87171',   // Lighter red
  funder: '#22d3ee',      // Lighter cyan
  topic: '#fb923c',       // Lighter orange
  concept: '#a3e635',     // Lighter lime
  keyword: '#f472b6',     // Lighter pink
  continent: '#818cf8',   // Lighter indigo
  region: '#2dd4bf',      // Lighter teal
  
  // Status colours (same as light theme)
  openAccess: '#34d399',  // Lighter green
  closed: '#f87171',      // Lighter red
  hybrid: '#fbbf24',      // Lighter yellow
  bronze: '#d97706',      // Lighter bronze
  gold: '#fbbf24',        // Lighter gold
  
  // Dark theme UI colors
  background: '#0f172a',
  border: '#334155',
  borderHover: '#475569',
  cardBackground: '#1e293b',
  shadowColor: '#00000040',
  successBackground: '#064e3b',
  warningBackground: '#451a03',
  errorBackground: '#450a0a',
  infoBackground: '#0c4a6e',
  warning: '#fbbf24',
  success: '#34d399',
  workDark: '#1e40af',
  error: '#f87171',
  text: '#f1f5f9',
  muted: '#94a3b8',
  subtle: '#64748b',
  accent: '#f1f5f9',
});

export const entityVars = createGlobalTheme(':root', {
  color: colorContract,
  
  spacing: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '32px',
    '5xl': '40px',
    '6xl': '48px',
    xxl: '64px',
  },
  
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    xxl: '3rem',      // 48px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  zIndex: {
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modal: '1040',
    popover: '1050',
    tooltip: '1060',
  },
});

