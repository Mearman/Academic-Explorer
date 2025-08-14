import { createGlobalTheme } from '@vanilla-extract/css';

export const entityVars = createGlobalTheme(':root', {
  color: {
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
    
    // UI elements
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
    
    // Text variants
    muted: '#6b7280',
    subtle: '#9ca3af',
    accent: '#1f2937',
  },
  
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

