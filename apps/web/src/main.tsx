import { createRoot } from "react-dom/client";
import {
  createRouter,
  RouterProvider,
  createHashHistory,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { setupGlobalErrorHandling, logger } from "@academic-explorer/utils/logger";
import { DexieStorageProvider } from "@academic-explorer/utils";
import { StorageProviderWrapper } from "@/contexts/storage-provider-context";
import { initializeNetworkMonitoring } from "./services/network-interceptor";
import { initWebVitals } from "@/utils/web-vitals";
import { cachedOpenAlex } from "@academic-explorer/client";

// Fix URL display issues immediately when page loads
// This runs before React mounts to fix browser address bar display
if (typeof window !== "undefined") {
  const currentHash = window.location.hash;

  logger.debug("routing", "main.tsx URL processing started", {
    currentHash,
    href: window.location.href
  });

  if (currentHash && currentHash !== "#") {
    let fixedHash = currentHash;
    let needsUpdate = false;

    // First, fix double hash issue (##/... should become #/...)
    if (currentHash.startsWith("##")) {
      fixedHash = "#" + currentHash.substring(2);
      needsUpdate = true;
      logger.debug("routing", "Fixed double hash:", { original: currentHash, clean: fixedHash });
    }

    // Only decode regular URLs, not external canonical IDs - let usePrettyUrl hook handle those
    // This prevents routing interference while still allowing pretty URL display via React hooks
    if (!needsUpdate && currentHash.includes("%")) {
      const hashParts = fixedHash.split("/");
      const entityType = hashParts[1]; // works, authors, institutions, etc.
      const encodedId = hashParts.slice(2).join("/"); // Join the rest with slashes

      // Only decode if this is NOT an external canonical ID URL pattern
      // External canonical IDs will be handled by the usePrettyUrl hook in React components
      if (entityType && encodedId && !encodedId.match(/^(https?%3A%2F%2F|orcid%3A|ror%3A|doi%3A)/i)) {
        try {
          const decodedId = decodeURIComponent(encodedId);

          // Only update if the decoded version is different and contains protocols
          if (decodedId !== encodedId && (decodedId.includes("://") || decodedId.includes(":/"))) {
            const hashQueryParams = currentHash.includes("?")
              ? "?" + currentHash.split("?").slice(1).join("?")
              : "";

            fixedHash = `#/${entityType}/${decodedId}${hashQueryParams}`;
            needsUpdate = true;

            logger.debug("routing", "Converting encoded URL to pretty URL:", {
              original: currentHash,
              fixed: fixedHash,
              encodedId,
              decodedId
            });
          }
        } catch (error) {
          // If decoding fails, continue with normal processing
          logger.debug("routing", "Failed to decode URL:", { error, encodedId });
        }
      }
      // Skip processing external canonical IDs here - let React hooks handle pretty URL display
    }

    // Check for collapsed protocol slashes in the (potentially updated) hash
    if (!needsUpdate) {
      const collapsedPattern = /(https?:\/)([^\/])/;
      if (collapsedPattern.test(fixedHash)) {
        // Fix collapsed patterns in the hash portion only
        fixedHash = fixedHash
          .replace(/https?:\/(?!\/)/g, 'https://')
          .replace(/http?:\/(?!\/)/g, 'http://')
          .replace(/ror:\/(?!\/)/g, 'ror://');

        needsUpdate = true;

        logger.debug("routing", "Fixing collapsed URL display in hash:", {
          original: currentHash,
          fixed: fixedHash
        });
      }
    }

    // Apply the update if needed
    if (needsUpdate && fixedHash !== currentHash) {
      // Ensure we have a single hash, not double hash
      const cleanHash = fixedHash.startsWith("#") ? fixedHash : "#" + fixedHash;
      const newUrl = window.location.pathname + window.location.search + cleanHash;

      logger.debug("routing", "Applying URL fix:", {
        original: currentHash,
        fixed: fixedHash,
        clean: cleanHash,
        final: newUrl
      });

      // Use history.replaceState to update URL without page reload
      window.history.replaceState(window.history.state, "", newUrl);

      logger.debug("routing", "URL fix applied, new location:", {
        href: window.location.href,
        hash: window.location.hash
      });
    } else {
      logger.debug("routing", "No URL fix needed:", {
        currentHash,
        needsUpdate
      });
    }
  } else {
    logger.debug("routing", "No hash to process");
  }
}

// Add a persistent URL fixer that runs after page load
// This catches any URL issues that weren't handled by the initial fix
if (typeof window !== "undefined") {
  const fixUrlDisplay = () => {
    const currentHash = window.location.hash;
    if (!currentHash || currentHash === "#") return;

    let needsUpdate = false;
    let fixedHash = currentHash;

    // Fix double hash
    if (currentHash.startsWith("##")) {
      fixedHash = "#" + currentHash.substring(2);
      needsUpdate = true;
    }

    // Fix collapsed protocol slashes
    const collapsedPattern = /(^|\/)(https?:\/)([^\/])/;
    if (collapsedPattern.test(fixedHash)) {
      fixedHash = fixedHash.replace(collapsedPattern, '$1$2/$3');
      needsUpdate = true;
    }

    // Apply fix if needed
    if (needsUpdate && fixedHash !== currentHash) {
      const newUrl = window.location.pathname + window.location.search + fixedHash;
      window.history.replaceState(window.history.state, "", newUrl);
      logger.debug("routing", "URL fix applied:", { original: currentHash, fixed: fixedHash });
    }
  };

  // Run immediately and then periodically for the first few seconds
  setTimeout(fixUrlDisplay, 100);
  setTimeout(fixUrlDisplay, 500);
  setTimeout(fixUrlDisplay, 1000);
  setTimeout(fixUrlDisplay, 2000);
}

// Import Mantine core styles
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";

// Import { registerOpenAlexServiceWorker } from "@/lib/service-worker";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Load persisted app activity events on app start
import { AppActivityProvider } from "@/stores/app-activity-store";
import { LayoutProvider } from "@/stores/layout-store";
import { GraphProvider } from "@/stores/graph-store";

// Create Mantine theme using design tokens
const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  respectReducedMotion: true,
  autoContrast: true,

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

// Initialize global error handling, network monitoring, and performance tracking
setupGlobalErrorHandling(logger);
initializeNetworkMonitoring();
initWebVitals();

// Configure static cache URL for GitHub Pages deployment
// Detect GitHub Pages deployment by checking if the base path includes the repo name
const isGitHubPages = import.meta.env.BASE_URL.includes("/Academic-Explorer/");
if (isGitHubPages) {
  cachedOpenAlex.updateConfig({
    staticCacheGitHubPagesUrl:
      "https://mearman.github.io/Academic-Explorer/data/openalex/",
  });
  logger.debug("main", "Configured GitHub Pages static cache URL");
}

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

// App activity events will be loaded by the AppActivityProvider

// Service worker registration handled by VitePWA plugin
// registerOpenAlexServiceWorker().then((registered) => {
//   if (registered) {
//     // Service worker registered successfully - API requests will be intercepted
//   }
// }).catch((error) => {
//   // Failed to register OpenAlex Service Worker - will fall back to direct API calls
//   void error; // Suppress unused variable warning
// });

// Create and initialize storage provider
const storageProvider = new DexieStorageProvider(logger);

// Initialize special system lists (Bookmarks, History) before app starts
storageProvider.initializeSpecialLists().catch((error) => {
  logger.error("main", "Failed to initialize special lists", { error });
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ModalsProvider>
        <Notifications />
        <StorageProviderWrapper provider={storageProvider}>
          <GraphProvider>
            <LayoutProvider>
              <AppActivityProvider>
                <RouterProvider router={router} />
              </AppActivityProvider>
            </LayoutProvider>
          </GraphProvider>
        </StorageProviderWrapper>
      </ModalsProvider>
    </MantineProvider>
  </QueryClientProvider>,
);
