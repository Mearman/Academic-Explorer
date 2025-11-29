import { cachedOpenAlex } from "@bibgraph/client";
import { DexieStorageProvider } from "@bibgraph/utils";
import { setupGlobalErrorHandling, logger } from "@bibgraph/utils/logger";
import { MantineProvider, createTheme } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRouter,
  RouterProvider,
  createHashHistory,
} from "@tanstack/react-router";
import posthog from "posthog-js";
import { createRoot } from "react-dom/client";

import { PostHogProvider } from "@/components/PostHogProvider";
import { StorageProviderWrapper } from "@/contexts/storage-provider-context";
import { AppActivityProvider } from "@/stores/app-activity-store";
import { LayoutProvider } from "@/stores/layout-store";
import { initWebVitals } from "@/utils/web-vitals";

import { routeTree } from "./routeTree.gen";
import { initializeNetworkMonitoring } from "./services/network-interceptor";

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
      const collapsedPattern = /(https?:\/)([^/])/;
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
    const collapsedPattern = /(^|\/)https?:\/([^/])/;
    if (collapsedPattern.test(fixedHash)) {
      fixedHash = fixedHash.replace(collapsedPattern, '$1https://$2');
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

// Import the Vanilla Extract theme adapter
import { mantineThemeClass, mantineVars } from "./styles/mantine-theme.css";
import { getMantineThemeTokens } from "./styles/mantine-theme-config";
import { themeClass } from "./styles/theme.css";

// Create Mantine theme using design tokens and Vanilla Extract integration
const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  respectReducedMotion: true,
  autoContrast: true,

  // Integrate Vanilla Extract theme variables using properly typed tokens
  colors: getMantineThemeTokens().colors,

  // Configure font family from Vanilla Extract theme
  fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",

  // Configure spacing using proper string values
  spacing: {
    xs: "0.625rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "2rem",
  },

  // Configure font sizes
  fontSizes: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
  },

  // Configure radius
  radius: {
    xs: "2px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
  },

  // Configure line heights
  lineHeights: {
    xs: "1",
    sm: "1.25",
    md: "1.5",
    lg: "1.75",
  },

  // Configure breakpoints
  breakpoints: {
    xs: "36em",
    sm: "48em",
    md: "62em",
    lg: "75em",
    xl: "88em",
  },

  // Configure headings with proper font weights
  headings: {
    fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "2.25rem", lineHeight: "1.25" },
      h2: { fontSize: "1.875rem", lineHeight: "1.25" },
      h3: { fontSize: "1.5rem", lineHeight: "1.25" },
      h4: { fontSize: "1.25rem", lineHeight: "1.25" },
      h5: { fontSize: "1.125rem", lineHeight: "1.25" },
      h6: { fontSize: "1rem", lineHeight: "1.25" },
    },
  },

  // Enhanced component configurations from the provided theme
  components: {
    ActionIcon: {
      styles: {
        root: {
          // sizes handled by Mantine's internal system
        },
      },
    },

    Alert: {
      styles: {
        root: {
          padding: "0.875rem 1rem",
          borderRadius: "0.5rem",
        },
        title: {
          fontWeight: "600",
        },
        message: {
          lineHeight: "1.5",
        },
      },
    },

    Anchor: {
      styles: {
        root: {
          textDecoration: "none",
          color: "var(--mantine-primary-color-6)",

          "&:hover": {
            textDecoration: "underline",
          },
        },
      },
    },

    Avatar: {
      styles: {
        placeholder: {
          backgroundColor: "var(--mantine-primary-color-light)",
          color: "var(--mantine-primary-color-light-color)",
        },
      },
    },

    Badge: {
      styles: {
        root: {
          textTransform: "none",
          fontWeight: "600",
          height: "auto",
          padding: "0 0.375rem",
        },
      },
    },

    Blockquote: {
      styles: {
        root: {
          borderLeftWidth: "0.25rem",
          borderLeftColor: "var(--mantine-primary-color-6)",
          backgroundColor: "var(--mantine-primary-color-light)",
          color: "var(--mantine-color-text)",
          padding: "1rem",
          borderRadius: "0.5rem",
          margin: "1rem 0",
        },
        icon: {
          color: "var(--mantine-primary-color-6)",
        },
      },
    },

    Button: {
      defaultProps: {
        variant: "filled",
      },
      styles: {
        root: {
          fontWeight: "600",
          borderRadius: "0.375rem",
        },
        section: {
          marginRight: "0.25rem",
        },
        leftSection: {
          marginRight: "0.5rem",
        },
        rightSection: {
          marginLeft: "0.5rem",
        },
      },
    },

    Card: {
      defaultProps: {
        withBorder: true,
        shadow: "sm",
      },
      styles: {
        root: {
          overflow: "visible",
        },
      },
    },

    Checkbox: {
      styles: {
        input: {
          borderColor: "var(--mantine-color-default-border)",
          borderRadius: "0.25rem",
        },
        label: {
          marginLeft: "0.5rem",
        },
      },
    },

    Chip: {
      styles: {
        root: {
          height: "auto",
          padding: "0.375rem 0.75rem",
          borderRadius: "0.5rem",
          fontWeight: "500",
        },
      },
    },

    Container: {
      styles: {
        root: {
          maxWidth: "var(--container-size, 1200px)",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        },
      },
    },

    Dialog: {
      styles: {
        content: {
          borderRadius: "0.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
        header: {
          borderBottom: "1px solid var(--mantine-color-default-border)",
          padding: "1.5rem 1.5rem 1rem",
        },
        body: {
          padding: "1.5rem",
        },
      },
    },

    Indicator: {
      styles: {
        indicator: {
          border: "2px solid var(--mantine-color-body)",
        },
      },
    },

    Mark: {
      styles: {
        root: {
          backgroundColor: "var(--mantine-primary-color-light)",
          color: "var(--mantine-primary-color-light-color)",
          padding: "0.125rem 0.25rem",
          borderRadius: "0.25rem",
        },
      },
    },

    NavLink: {
      styles: {
        root: {
          borderRadius: "0.375rem",
          fontWeight: "500",
          padding: "0.5rem 0.75rem",
          margin: "0.125rem 0",
        },
        label: {
          whiteSpace: "normal",
          lineHeight: "1.4",
        },
        description: {
          marginTop: "0.25rem",
        },
      },
    },

    Pagination: {
      styles: {
        control: {
          active: {
            backgroundColor: "var(--mantine-primary-color-6)",
            color: "white",
            borderColor: "var(--mantine-primary-color-6)",
          },
        },
        dots: {
          color: "var(--mantine-color-dimmed)",
        },
      },
    },

    Paper: {
      defaultProps: {
        shadow: "sm",
        withBorder: true,
      },
      styles: {
        root: {
          borderRadius: "0.5rem",
        },
      },
    },

    Radio: {
      styles: {
        radio: {
          borderColor: "var(--mantine-color-default-border)",
          borderRadius: "50%",
        },
        label: {
          marginLeft: "0.5rem",
        },
      },
    },

    SegmentedControl: {
      styles: {
        root: {
          backgroundColor: "var(--mantine-color-default)",
        },
        label: {
          fontWeight: "500",
        },
        control: {
          fontWeight: "500",
        },
      },
    },

    Select: {
      styles: {
        input: {
          borderRadius: "0.375rem",
        },
        option: {
          borderRadius: "0.25rem",
        },
      },
    },

    Stepper: {
      styles: {
        step: {
          stepBody: {
            color: "var(--mantine-color-dimmed)",
          },
        },
      },
    },

    Switch: {
      styles: {
        track: {
          backgroundColor: "var(--mantine-color-default-border)",
        },
      },
    },

    ThemeIcon: {
      styles: {
        root: {
          borderRadius: "0.375rem",
        },
      },
    },

    Timeline: {
      styles: {
        itemBullet: {
          backgroundColor: "var(--mantine-color-body)",
          border: "2px solid var(--mantine-color-default-border)",
        },
        item: {
          "&[data-active]": {
            ".mantine-Timeline-itemBullet": {
              borderColor: "var(--mantine-primary-color-6)",
              backgroundColor: "var(--mantine-primary-color-6)",
            },
          },
        },
      },
    },

    Tooltip: {
      defaultProps: {
        color: "dark",
        radius: "md",
      },
      styles: {
        tooltip: {
          fontSize: "0.75rem",
          fontWeight: "500",
          padding: "0.5rem 0.75rem",
        },
      },
    },
  },
});

// Initialize global error handling, network monitoring, and performance tracking
setupGlobalErrorHandling(logger);
initializeNetworkMonitoring();
initWebVitals();

// Configure static cache URL for deployed environments
// Works for both GitHub Pages (mearman.github.io) and custom domain (bibgraph.com)
const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'mearman.github.io' ||
  window.location.hostname === 'bibgraph.com' ||
  window.location.hostname.endsWith('.github.io')
);
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

if (isProduction) {
  cachedOpenAlex.updateConfig({
    staticCacheGitHubPagesUrl:
      "https://mearman.github.io/BibGraph/data/openalex/",
  });
  logger.debug("main", "Configured production static cache URL");
} else if (isLocalhost) {
  // Configure local static cache for dev server and E2E preview server
  // This enables the static cache tier to use committed cache files
  // Dev: served from public/data/openalex/ via Vite
  // E2E preview: served from dist/data/openalex/ via vite preview
  cachedOpenAlex.updateConfig({
    staticCacheGitHubPagesUrl: "/data/openalex/",
  });
  logger.debug("main", "Configured local static cache URL for development/E2E");
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

// Initialize OpenAlex client with settings from storage
(async () => {
  try {
    const { settingsStoreInstance } = await import("@/stores/settings-store");
    const { updateOpenAlexEmail, updateOpenAlexApiKey } = await import("@bibgraph/client");

    const settings = await settingsStoreInstance.getSettings();

    if (settings.politePoolEmail) {
      updateOpenAlexEmail(settings.politePoolEmail);
      logger.debug("main", "Initialized OpenAlex client with email from settings");
    }

    if (settings.apiKey) {
      updateOpenAlexApiKey(settings.apiKey);
      logger.debug("main", "Initialized OpenAlex client with API key from settings");
    }
  } catch (error) {
    logger.error("main", "Failed to initialize OpenAlex client with settings", { error });
  }
})();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

/**
 * React 19 error handlers for PostHog error tracking
 * These callbacks capture errors at different stages of React's error handling
 */
const reactErrorHandlers = {
  // Callback for errors not caught by an ErrorBoundary
  onUncaughtError: (error: unknown, errorInfo: { componentStack?: string }) => {
    logger.error("react", "Uncaught error in React component", {
      error,
      componentStack: errorInfo.componentStack,
    });

    // Send to PostHog if initialized
    if (posthog.__loaded) {
      posthog.captureException(error instanceof Error ? error : new Error(String(error)), {
        error_type: 'uncaught_react_error',
        component_stack: errorInfo.componentStack,
      });
    }
  },

  // Callback for errors caught by an ErrorBoundary
  onCaughtError: (error: unknown, errorInfo: { componentStack?: string }) => {
    logger.warn("react", "Error caught by ErrorBoundary", {
      error,
      componentStack: errorInfo.componentStack,
    });

    // Send to PostHog if initialized
    if (posthog.__loaded) {
      posthog.captureException(error instanceof Error ? error : new Error(String(error)), {
        error_type: 'caught_react_error',
        component_stack: errorInfo.componentStack,
      });
    }
  },

  // Callback for errors React automatically recovers from
  onRecoverableError: (error: unknown, errorInfo: { componentStack?: string }) => {
    logger.debug("react", "Recoverable React error", {
      error,
      componentStack: errorInfo.componentStack,
    });

    // Send to PostHog if initialized (with lower priority)
    if (posthog.__loaded) {
      posthog.captureException(error instanceof Error ? error : new Error(String(error)), {
        error_type: 'recoverable_react_error',
        component_stack: errorInfo.componentStack,
      });
    }
  },
};

createRoot(rootElement, reactErrorHandlers).render(
  <QueryClientProvider client={queryClient}>
    <PostHogProvider>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <ModalsProvider>
          <Notifications />
          <StorageProviderWrapper provider={storageProvider}>
            <LayoutProvider>
              <AppActivityProvider>
                <RouterProvider router={router} />
              </AppActivityProvider>
            </LayoutProvider>
          </StorageProviderWrapper>
        </ModalsProvider>
      </MantineProvider>
    </PostHogProvider>
  </QueryClientProvider>,
);
