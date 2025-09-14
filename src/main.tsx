import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider, createHashHistory } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { Spotlight } from '@mantine/spotlight'

// Import Mantine core styles
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/spotlight/styles.css'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create Mantine theme matching design tokens
const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  defaultRadius: 'md',

  // Academic entity colors matching theme.css.ts
  colors: {
    // Override default colors to match design tokens
    blue: [
      '#eff6ff', // 50
      '#dbeafe', // 100
      '#bfdbfe', // 200
      '#93c5fd', // 300
      '#60a5fa', // 400
      '#3b82f6', // 500 - primary
      '#2563eb', // 600
      '#1d4ed8', // 700
      '#1e40af', // 800
      '#1e3a8a', // 900
    ],
    gray: [
      '#f9fafb', // 50
      '#f3f4f6', // 100
      '#e5e7eb', // 200
      '#d1d5db', // 300
      '#9ca3af', // 400
      '#6b7280', // 500
      '#4b5563', // 600
      '#374151', // 700
      '#1f2937', // 800
      '#111827', // 900
    ],
    // Entity-specific colors
    work: [
      '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa',
      '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'
    ],
    author: [
      '#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399',
      '#10b981', '#059669', '#047857', '#065f46', '#064e3b'
    ],
    source: [
      '#f3f4ff', '#e2e8f0', '#cbd5e1', '#a855f7', '#9333ea',
      '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'
    ],
    institution: [
      '#fefce8', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24',
      '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'
    ],
  },

  // Component-specific theme overrides
  components: {
    Card: {
      defaultProps: {
        withBorder: true,
        shadow: 'sm',
      },
    },
    Button: {
      defaultProps: {
        variant: 'filled',
      },
    },
  },
})

// Create a new query client for data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    },
  },
})

// Create a new router instance with hash-based history for GitHub Pages
const router = createRouter({
  routeTree,
  history: createHashHistory(),
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
      <Spotlight
        actions={[]}
        searchProps={{
          leftSection: <span>🔍</span>,
          placeholder: 'Search Academic Explorer...',
        }}
        nothingFound="Nothing found..."
        highlightQuery
      />
    </MantineProvider>
  </StrictMode>,
)
