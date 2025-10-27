/**
 * Service Worker Registration for OpenAlex API Interception
 */

import { logger } from "@academic-explorer/utils";

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register the OpenAlex service worker
 */
export async function registerOpenAlexServiceWorker(): Promise<boolean> {
  // Only register in browser environment
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    logger.debug("sw", "Service Worker not supported in this environment");
    return false;
  }

  try {
    // Check if we're in development mode
    const isDevelopment =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.port === "5173";

    // Only register in development for now (where we have the Vite middleware)
    if (!isDevelopment) {
      logger.debug("sw", "Service Worker registration skipped in production");
      return false;
    }

    logger.debug("sw", "Registering OpenAlex Service Worker");

    // Register the service worker
    // In development, vite-plugin-pwa serves the service worker at a different path
    const serviceWorkerPath = isDevelopment
      ? "/dev-sw.js?dev-sw"
      : "/openalex-sw.js";
    swRegistration = await navigator.serviceWorker.register(serviceWorkerPath, {
      scope: "/",
    });

    logger.debug("sw", "Service Worker registered successfully", {
      scope: swRegistration.scope,
      state: swRegistration.active?.state,
    });

    // Listen for updates
    swRegistration.addEventListener("updatefound", () => {
      logger.debug("sw", "Service Worker update found");
      const newWorker = swRegistration?.installing;

      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            logger.debug("sw", "New Service Worker available");
            // Could notify user of update here
          }
        });
      }
    });

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      logger.debug("sw", "Service Worker controller changed - reloading page");
      window.location.reload();
    });

    return true;
  } catch (error) {
    logger.error("sw", "Failed to register Service Worker", { error });
    return false;
  }
}

/**
 * Unregister the OpenAlex service worker
 */
export async function unregisterOpenAlexServiceWorker(): Promise<boolean> {
  if (!swRegistration) {
    return true;
  }

  try {
    const unregistered = await swRegistration.unregister();
    logger.debug("sw", "Service Worker unregistered", {
      success: unregistered,
    });
    swRegistration = null;
    return unregistered;
  } catch (error) {
    logger.error("sw", "Failed to unregister Service Worker", { error });
    return false;
  }
}

/**
 * Get service worker registration status
 */
export function getServiceWorkerStatus(): {
  supported: boolean;
  registered: boolean;
  active: boolean;
  scope?: string;
} {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return {
      active: false,
      registered: false,
      supported: false,
    };
  }

  return {
    active: !!swRegistration?.active,
    registered: !!swRegistration,
    scope: swRegistration?.scope,
    supported: true,
  };
}
