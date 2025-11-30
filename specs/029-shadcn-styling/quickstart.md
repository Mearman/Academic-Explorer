# Quickstart Guide: shadcn Styling Standardization

**Purpose**: Rapid setup guide for implementing shadcn-inspired theming with Mantine v7 + Vanilla Extract
**Target**: Developers implementing the 029-shadcn-styling feature
**Time Estimate**: 30-60 minutes initial setup

## Prerequisites

- Node.js 18+ and pnpm package manager
- Existing BibGraph codebase with Mantine UI
- TypeScript 5.9.2 and React 19
- Nx monorepo structure (apps/web, packages/*)

## Step 1: Install Dependencies

```bash
# Install Vanilla Extract core packages
pnpm add @vanilla-extract/css @vanilla-extract/vite-plugin @vanilla-extract/dynamic

# Install Vanilla Extract ecosystem packages
pnpm add @vanilla-extract/recipes @vanilla-extract/css-utils @vanilla-extract/sprinkles

# Ensure Mantine v7 is installed (upgrade if needed)
pnpm add @mantine/core@^7.0.0 @mantine/hooks@^7.0.0

# Install type checking for CSS
pnpm add -D @vanilla-extract/esbuild-plugin
```

## Step 2: Configure Vite for Vanilla Extract

Update `apps/web/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin({
      identifiers: process.env.NODE_ENV === 'development' ? 'debug' : 'short'
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vanilla-extract-themes': [
            './src/styles/themes/*.css.ts'
          ],
          'vanilla-extract-recipes': [
            './src/styles/recipes/*.css.ts'
          ]
        }
      }
    }
  }
})
```

## Step 3: Create Theme System

### 3.1 Create Theme Variables

Create `apps/web/src/styles/vars.css.ts`:

```typescript
import { createGlobalTheme } from '@vanilla-extract/css'

export const vars = createGlobalTheme(':root', {
  // Academic color palettes (from research theme files)
  colors: {
    // Academic entity colors - preserved for UI components
    works: '#1e40af',      // Blue palette
    authors: '#059669',    // Green palette
    sources: '#6d28d9',    // Violet palette
    institutions: '#ea580c', // Orange palette
    publishers: '#dc2626', // Red palette
    funders: '#ca8a04',    // Yellow palette
    topics: '#db2777',     // Pink palette
    concepts: '#7c3aed',  // Purple palette
    keywords: '#0d9488',   // Teal palette
    domains: '#0891b2',   // Cyan palette
    fields: '#4f46e5',     // Indigo palette
    subfields: '#e11d48', // Rose palette

    // UI color tokens
    brand: '#1e40af',
    brandHover: '#1d4ed8',
    brandActive: '#2563eb',
    academic: '#059669',
    academicHover: '#047857',
    academicActive: '#065f46',

    // Semantic colors
    background: '#ffffff',
    surface: '#f8f9fa',
    border: '#dee2e6',
    text: '#212529',
    textSecondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
  },

  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
  },

  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFont: 'Georgia, serif',
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    }
  },

  borderRadius: {
    sm: '0.25rem',   // 4px
    base: '0.375rem', // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
  },

  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }
})
```

### 3.2 Create Mantine Theme

Create `apps/web/src/styles/theme.ts`:

```typescript
import { createTheme } from '@mantine/core'
import { vars } from './vars.css'

export const bibgraphTheme = createTheme({
  colors: {
    brand: vars.colors.brand,
    brandHover: vars.colors.brandHover,
    brandActive: vars.colors.brandActive,
    academic: vars.colors.academic,
    academicHover: vars.colors.academicHover,
    academicActive: vars.colors.academicActive,

    // Map academic entity colors
    gray: [
      vars.colors.background,
      vars.colors.surface,
      vars.colors.border,
      vars.colors.textSecondary,
      vars.colors.text,
    ],

    // Semantic colors
    white: vars.colors.background,
    black: vars.colors.text,

    // Success, warning, error colors
    green: [vars.colors.success],
    yellow: [vars.colors.warning],
    red: [vars.colors.error],
  },

  fontFamily: vars.typography.fontFamily,
  fontFamilyMonospace: 'Fira Code, Consolas, monospace',

  spacing: {
    xs: parseFloat(vars.spacing.xs),
    sm: parseFloat(vars.spacing.sm),
    md: parseFloat(vars.spacing.md),
    lg: parseFloat(vars.spacing.lg),
    xl: parseFloat(vars.spacing.xl),
  },

  borderRadius: {
    xs: parseFloat(vars.borderRadius.sm),
    sm: parseFloat(vars.borderRadius.base),
    md: parseFloat(vars.borderRadius.md),
    lg: parseFloat(vars.borderRadius.lg),
    xl: parseFloat(vars.borderRadius.xl),
  },

  fontSizes: {
    xs: parseFloat(vars.typography.fontSize.xs),
    sm: parseFloat(vars.typography.fontSize.sm),
    base: parseFloat(vars.typography.fontSize.base),
    lg: parseFloat(vars.typography.fontSize.lg),
    xl: parseFloat(vars.typography.fontSize.xl),
    '2xl': parseFloat(vars.typography.fontSize['2xl']),
    '3xl': parseFloat(vars.typography.fontSize['3xl']),
  },

  headings: {
    fontFamily: vars.typography.headingFont,
    fontWeight: vars.typography.fontWeight.semibold,
    sizes: {
      h1: { fontSize: parseFloat(vars.typography.fontSize['3xl']) },
      h2: { fontSize: parseFloat(vars.typography.fontSize['2xl']) },
      h3: { fontSize: parseFloat(vars.typography.fontSize.xl) },
      h4: { fontSize: parseFloat(vars.typography.fontSize.lg) },
      h5: { fontSize: parseFloat(vars.typography.fontSize.base) },
      h6: { fontSize: parseFloat(vars.typography.fontSize.sm) },
    }
  },

  other: {
    colorScheme: 'light', // Will be updated by theme provider
  }
})

// Dark theme variant
export const bibgraphDarkTheme = createTheme({
  ...bibgraphTheme,
  colors: {
    ...bibgraphTheme.colors,
    dark: [
      '#1a1a1a', // background
      '#2d2d2d', // surface
      '#404040', // border
      '#a0a0a0', // textSecondary
      '#ffffff', // text
    ]
  },
  other: {
    colorScheme: 'dark'
  }
})
```

## Step 4: Create Component Recipes

### 4.1 Button Recipe with Enhanced Features

Create `apps/web/src/styles/recipes/button.css.ts`:

```typescript
import { recipe } from '@vanilla-extract/recipes'
import { calc, clamp } from '@vanilla-extract/css-utils'
import { vars } from '../vars.css'

export const buttonRecipe = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: vars.borderRadius.base,
    fontFamily: vars.typography.fontFamily,
    fontWeight: vars.typography.fontWeight.medium,
    fontSize: vars.typography.fontSize.base,
    lineHeight: vars.typography.lineHeight.normal,
    textDecoration: 'none',
    border: `2px solid transparent`,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    userSelect: 'none',
    minHeight: calc(vars.typography.fontSize.base * vars.typography.lineHeight.normal + calc(vars.spacing.sm * 2)),

    // Focus styles for accessibility
    '&:focus-visible': {
      outline: `2px solid ${vars.colors.brand}`,
      outlineOffset: '2px',
    },

    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    }
  },

  variants: {
    size: {
      xs: {
        padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
        fontSize: vars.typography.fontSize.xs,
        minHeight: calc(vars.typography.fontSize.xs * vars.typography.lineHeight.normal + calc(vars.spacing.xs * 2)),
      },
      sm: {
        padding: `${vars.spacing.sm} ${vars.spacing.md}`,
        fontSize: vars.typography.fontSize.sm,
        minHeight: calc(vars.typography.fontSize.sm * vars.typography.lineHeight.normal + calc(vars.spacing.sm * 2)),
      },
      md: {
        padding: `${vars.spacing.sm} ${vars.spacing.lg}`,
        fontSize: vars.typography.fontSize.base,
        minHeight: calc(vars.typography.fontSize.base * vars.typography.lineHeight.normal + calc(vars.spacing.sm * 2)),
      },
      lg: {
        padding: `${vars.spacing.md} ${vars.spacing.xl}`,
        fontSize: vars.typography.fontSize.lg,
        minHeight: calc(vars.typography.fontSize.lg * vars.typography.lineHeight.normal + calc(vars.spacing.md * 2)),
      },
      xl: {
        padding: `${vars.spacing.lg} ${vars.spacing['2xl']}`,
        fontSize: vars.typography.fontSize.xl,
        minHeight: calc(vars.typography.fontSize.xl * vars.typography.lineHeight.normal + calc(vars.spacing.lg * 2)),
      }
    },

    variant: {
      primary: {
        backgroundColor: vars.colors.brand,
        color: 'white',

        '&:hover:not(:disabled)': {
          backgroundColor: vars.colors.brandHover,
          transform: 'translateY(-1px)',
          boxShadow: vars.shadows.md,
        },

        '&:active:not(:disabled)': {
          backgroundColor: vars.colors.brandActive,
          transform: 'translateY(0)',
        }
      },

      secondary: {
        backgroundColor: 'transparent',
        color: vars.colors.brand,
        borderColor: vars.colors.brand,

        '&:hover:not(:disabled)': {
          backgroundColor: vars.colors.brand,
          color: 'white',
          transform: 'translateY(-1px)',
        },

        '&:active:not(:disabled)': {
          backgroundColor: vars.colors.brandActive,
          transform: 'translateY(0)',
        }
      },

      academic: {
        backgroundColor: vars.colors.academic,
        color: 'white',

        '&:hover:not(:disabled)': {
          backgroundColor: vars.colors.academicHover,
          transform: 'translateY(-1px)',
          boxShadow: vars.shadows.md,
        },

        '&:active:not(:disabled)': {
          backgroundColor: vars.colors.academicActive,
          transform: 'translateY(0)',
        }
      },

      outline: {
        backgroundColor: 'transparent',
        color: vars.colors.text,
        borderColor: vars.colors.border,

        '&:hover:not(:disabled)': {
          backgroundColor: vars.colors.surface,
          borderColor: vars.colors.textSecondary,
        }
      },

      ghost: {
        backgroundColor: 'transparent',
        color: vars.colors.textSecondary,

        '&:hover:not(:disabled)': {
          backgroundColor: vars.colors.surface,
          color: vars.colors.text,
        }
      }
    },

    fullWidth: {
      true: {
        width: '100%'
      }
    }
  },

  compoundVariants: [
    {
      variants: {
        size: ['lg', 'xl'],
        variant: ['primary', 'secondary', 'academic']
      },
      styles: {
        fontWeight: vars.typography.fontWeight.semibold,
        letterSpacing: '0.025em'
      }
    },
    {
      variants: {
        variant: ['primary', 'secondary', 'academic'],
        fullWidth: [true]
      },
      styles: {
        justifyContent: 'center'
      }
    }
  ],

  defaultVariants: {
    size: 'md',
    variant: 'primary'
  }
})
```

### 4.2 Card Recipe

Create `apps/web/src/styles/recipes/card.css.ts`:

```typescript
import { recipe } from '@vanilla-extract/recipes'
import { vars } from '../vars.css'

export const cardRecipe = recipe({
  base: {
    backgroundColor: vars.colors.background,
    border: `1px solid ${vars.colors.border}`,
    borderRadius: vars.borderRadius.lg,
    padding: vars.spacing.lg,
    boxShadow: vars.shadows.sm,
    transition: 'all 0.2s ease-in-out',

    '&:hover': {
      boxShadow: vars.shadows.md,
    }
  },

  variants: {
    variant: {
      default: {},
      elevated: {
        boxShadow: vars.shadows.md,

        '&:hover': {
          boxShadow: vars.shadows.lg,
        }
      },
      outlined: {
        border: `2px solid ${vars.colors.brand}`,
        boxShadow: 'none',
      },
      filled: {
        backgroundColor: vars.colors.surface,
        border: 'none',
      }
    },

    padding: {
      none: { padding: '0' },
      sm: { padding: vars.spacing.sm },
      md: { padding: vars.spacing.md },
      lg: { padding: vars.spacing.lg },
      xl: { padding: vars.spacing.xl }
    }
  },

  defaultVariants: {
    variant: 'default',
    padding: 'lg'
  }
})
```

### 4.3 Sprinkles for Layout Utilities

Create `apps/web/src/styles/sprinkles/layout.css.ts`:

```typescript
import { createSprinkles } from '@vanilla-extract/sprinkles'
import { vars } from '../vars.css'

export const layoutSprinkles = createSprinkles({
  // Display utilities
  display: {
    block: { display: 'block' },
    inlineBlock: { display: 'inline-block' },
    flex: { display: 'flex' },
    inlineFlex: { display: 'inline-flex' },
    grid: { display: 'grid' },
    hidden: { display: 'none' },
  },

  // Flexbox utilities
  flexDirection: {
    row: { flexDirection: 'row' },
    column: { flexDirection: 'column' },
    rowReverse: { flexDirection: 'row-reverse' },
    columnReverse: { flexDirection: 'column-reverse' },
  },

  alignItems: {
    start: { alignItems: 'flex-start' },
    center: { alignItems: 'center' },
    end: { alignItems: 'flex-end' },
    stretch: { alignItems: 'stretch' },
  },

  justifyContent: {
    start: { justifyContent: 'flex-start' },
    center: { justifyContent: 'center' },
    end: { justifyContent: 'flex-end' },
    between: { justifyContent: 'space-between' },
    around: { justifyContent: 'space-around' },
    evenly: { justifyContent: 'space-evenly' },
  },

  // Gap utilities
  gap: {
    xs: { gap: vars.spacing.xs },
    sm: { gap: vars.spacing.sm },
    md: { gap: vars.spacing.md },
    lg: { gap: vars.spacing.lg },
    xl: { gap: vars.spacing.xl },
  },

  // Text alignment
  textAlign: {
    left: { textAlign: 'left' },
    center: { textAlign: 'center' },
    right: { textAlign: 'right' },
    justify: { textAlign: 'justify' },
  },
})
```

Create `apps/web/src/styles/sprinkles/spacing.css.ts`:

```typescript
import { createSprinkles } from '@vanilla-extract/sprinkles'
import { vars } from '../vars.css'

export const spacingSprinkles = createSprinkles({
  // Margin utilities
  m: {
    0: { margin: '0' },
    xs: { margin: vars.spacing.xs },
    sm: { margin: vars.spacing.sm },
    md: { margin: vars.spacing.md },
    lg: { margin: vars.spacing.lg },
    xl: { margin: vars.spacing.xl },
  },

  // Padding utilities
  p: {
    0: { padding: '0' },
    xs: { padding: vars.spacing.xs },
    sm: { padding: vars.spacing.sm },
    md: { padding: vars.spacing.md },
    lg: { padding: vars.spacing.lg },
    xl: { padding: vars.spacing.xl },
  },
})
```

## Step 5: Apply Theme to Application

### 5.1 Update Main App

Update `apps/web/src/main.tsx`:

```typescript
import { MantineProvider } from '@mantine/core'
import { bibgraphTheme, bibgraphDarkTheme } from './styles/theme'
import { ThemeProvider, useTheme } from './providers/theme-provider'

// Theme provider component
function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useTheme()

  const theme = colorScheme === 'dark' ? bibgraphDarkTheme : bibgraphTheme

  return (
    <MantineProvider theme={theme}>
      {children}
    </MantineProvider>
  )
}

// Update your existing app structure
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <ThemeProvider>
    <AppThemeProvider>
      {/* Your existing app structure */}
      <RouterProvider router={router} />
    </AppThemeProvider>
  </ThemeProvider>
)
```

### 5.2 Create Theme Provider

Create `apps/web/src/providers/theme-provider.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react'

interface ThemeContextType {
  colorScheme: 'light' | 'dark'
  toggleColorScheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  colorScheme: 'light',
  toggleColorScheme: () => {}
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light')

  const toggleColorScheme = () => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light'
    setColorScheme(newScheme)

    // Persist to localStorage
    localStorage.setItem('color-scheme', newScheme)

    // Update document for CSS cascade
    document.documentElement.setAttribute('data-color-scheme', newScheme)
  }

  // Initialize from localStorage or system preference
  useEffect(() => {
    const saved = localStorage.getItem('color-scheme') as 'light' | 'dark' | null
    if (saved) {
      setColorScheme(saved)
    } else {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setColorScheme(prefersDark ? 'dark' : 'light')
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-color-scheme', colorScheme)
  }, [colorScheme])

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

## Step 6: Migrate a Component

### 6.1 Before (Current Component)

```typescript
// apps/web/src/components/Button.tsx
import { Button as MantineButton } from '@mantine/core'

export function Button({ children, size, variant, ...props }) {
  return (
    <MantineButton size={size} variant={variant} {...props}>
      {children}
    </MantineButton>
  )
}
```

### 6.2 After (Vanilla Extract Styled)

```typescript
// apps/web/src/components/Button.tsx
import { forwardRef } from 'react'
import { buttonRecipe } from '../styles/recipes/button.css'

interface ButtonProps {
  children: React.ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'academic' | 'outline' | 'ghost'
  fullWidth?: boolean
  disabled?: boolean
  onClick?: () => void
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, size, variant, fullWidth, disabled, onClick, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={buttonRecipe({ size, variant, fullWidth, disabled })}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
)
```

## Step 7: Add Tests

### 7.1 Component Test

Create `apps/web/src/components/Button.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '../providers/theme-provider'
import { Button } from './Button'

// Test wrapper with theme context
function renderWithTheme(component: React.ReactElement) {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  )
}

describe('Button', () => {
  it('renders with default styling', () => {
    renderWithTheme(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
  })

  it('applies size variants correctly', () => {
    renderWithTheme(<Button size="lg">Large Button</Button>)
    const button = screen.getByRole('button', { name: 'Large Button' })
    expect(button).toHaveClass(/button/)
  })

  it('applies variant styling', () => {
    renderWithTheme(<Button variant="academic">Academic Button</Button>)
    const button = screen.getByRole('button', { name: 'Academic Button' })
    expect(button).toBeInTheDocument()
  })

  it('handles disabled state', () => {
    renderWithTheme(<Button disabled>Disabled Button</Button>)
    const button = screen.getByRole('button', { name: 'Disabled Button' })
    expect(button).toBeDisabled()
  })
})
```

## Step 8: Validate Bundle Size

```bash
# Build the application
pnpm build

# Analyze bundle size
npx vite-bundle-analyzer dist

# Check theme-specific chunks
ls -la dist/assets/ | grep vanilla-extract
```

## Migration Checklist

- [ ] Dependencies installed (Vanilla Extract, Mantine v7)
- [ ] Vite configuration updated
- [ ] Theme variables and Mantine theme created
- [ ] Theme provider implemented
- [ ] Component recipes created
- [ ] At least one component migrated
- [ ] Tests written for migrated components
- [ ] Bundle size impact measured
- [ ] Theme switching performance tested

## Common Issues

### Issue: CSS not applying
**Solution**: Ensure Vite plugin is properly configured and `.css.ts` files are imported

### Issue: Theme switching not working
**Solution**: Verify ThemeProvider wraps the application and color scheme is applied to document

### Issue: Bundle size increased significantly
**Solution**: Check for unused styles and configure proper code splitting in Vite config

### Issue: TypeScript errors for CSS classes
**Solution**: Ensure `.css.ts` files are included in TypeScript configuration

## Next Steps

1. **Phase 1**: Migrate high-impact components (DataState, forms, navigation)
2. **Phase 2**: Create comprehensive recipe library
3. **Phase 3**: Migrate remaining components systematically
4. **Phase 4**: Remove Tailwind dependencies and optimize bundle

## Support

For issues or questions:
- Check [Vanilla Extract Documentation](https://vanilla-extract.style/)
- Review [Mantine v7 Migration Guide](https://mantine.dev/theming/migration/)
- Consult this spec's [research.md](./research.md) for technical decisions