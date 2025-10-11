import { createRoot } from "react-dom/client";
import {
  createRouter,
  RouterProvider,
  createHashHistory,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
// DEBUGGING: Temporarily disable potentially problematic imports
// import { setupGlobalErrorHandling, logger } from "@academic-explorer/utils/logger"
// import { initializeNetworkMonitoring } from "./services/network-interceptor"
// import { GlobalErrorBoundary } from "./components/error/GlobalErrorBoundary"
// import { CacheInitializer } from "./components/cache/CacheInitializer"

// Import Mantine core styles
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// import { registerOpenAlexServiceWorker } from "@/lib/service-worker";

// Create Mantine theme matching design tokens
const theme = createTheme({
  primaryColor: "blue",
  fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  defaultRadius: "md",
  respectReducedMotion: true,
  autoContrast: true,

  colors: {
    blue: [
      "#eff6ff",
      "#dbeafe",
      "#bfdbfe",
      "#93c5fd",
      "#60a5fa",
      "#3b82f6",
      "#2563eb",
      "#1d4ed8",
      "#1e40af",
      "#1e3a8a",
    ],
    gray: [
      "#f9fafb",
      "#f3f4f6",
      "#e5e7eb",
      "#d1d5db",
      "#9ca3af",
      "#6b7280",
      "#4b5563",
      "#374151",
      "#1f2937",
      "#111827",
    ],
    work: [
      "#eff6ff",
      "#dbeafe",
      "#bfdbfe",
      "#93c5fd",
      "#60a5fa",
      "#3b82f6",
      "#2563eb",
      "#1d4ed8",
      "#1e40af",
      "#1e3a8a",
    ],
    author: [
      "#ecfdf5",
      "#d1fae5",
      "#a7f3d0",
      "#6ee7b7",
      "#34d399",
      "#10b981",
      "#059669",
      "#047857",
      "#065f46",
      "#064e3b",
    ],
    source: [
      "#f3f4ff",
      "#e2e8f0",
      "#cbd5e1",
      "#a855f7",
      "#9333ea",
      "#8b5cf6",
      "#7c3aed",
      "#6d28d9",
      "#5b21b6",
      "#4c1d95",
    ],
    institution: [
      "#fefce8",
      "#fef3c7",
      "#fde68a",
      "#fcd34d",
      "#fbbf24",
      "#f59e0b",
      "#d97706",
      "#b45309",
      "#92400e",
      "#78350f",
    ],
  },

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
import { useAppActivityStore } from "@/stores/app-activity-store";
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
