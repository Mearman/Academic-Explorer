import { createRoot } from "react-dom/client";
import {
  createRouter,
  RouterProvider,
  createHashHistory,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { colors, typography } from "@academic-explorer/ui/theme";
// DEBUGGING: Temporarily disable potentially problematic imports
// import { setupGlobalErrorHandling, logger } from "@academic-explorer/utils/logger"
// import { initializeNetworkMonitoring } from "./services/network-interceptor"
// import { GlobalErrorBoundary } from "./components/error/GlobalErrorBoundary"
// import { CacheInitializer } from "./components/cache/CacheInitializer"

// Import Mantine core styles
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";

// import { registerOpenAlexServiceWorker } from "@/lib/service-worker";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Load persisted app activity events on app start
import { useAppActivityStore } from "@/stores/app-activity-store";

// Create Mantine theme using design tokens
const theme = createTheme({
  primaryColor: "blue",
  fontFamily: typography.fontFamily,
  defaultRadius: "md",
  respectReducedMotion: true,
  autoContrast: true,

  colors,

  components: {
    Card: {
      defaultProps: {
        withBorder: true,
        shadow: "sm",
      },
    },
    Button: {
      defaultProps: {
        variant: "filled",
      },
    },
  },
});

// DEBUGGING: Temporarily disable global initializations
// setupGlobalErrorHandling(logger)
// initializeNetworkMonitoring()

// Create QueryClient for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
    },
  },
});

// Create a new router instance with hash-based history for GitHub Pages
const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Navigation tracking is now handled by NavigationTracker component in MainLayout

// Load persisted app activity events on app start
useAppActivityStore.getState().loadEvents();

// Service worker registration handled by VitePWA plugin
// registerOpenAlexServiceWorker().then((registered) => {
//   if (registered) {
//     // Service worker registered successfully - API requests will be intercepted
//   }
// }).catch((error) => {
//   // Failed to register OpenAlex Service Worker - will fall back to direct API calls
//   void error; // Suppress unused variable warning
// });

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications />
      <RouterProvider router={router} />
    </MantineProvider>
  </QueryClientProvider>,
);
