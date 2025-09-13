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

// Create Mantine theme
const theme = createTheme({
  /** Your theme configuration */
  primaryColor: 'blue',
  fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  defaultRadius: 'md',
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
