/**
 * Navigation tracking utility for logging route changes
 */

// App activity store import available for navigation tracking
// import { useAppActivityStore } from "@/stores/app-activity-store";

export function setupNavigationTracking(router: {
  subscribe: (event: string, callback: (event: { toLocation: unknown; fromLocation: unknown }) => void) => void;
  history: { location: { pathname: string; search: string } };
}) {
  // Use onAfterNavigate for cleaner data after navigation completes
  router.subscribe(
    "onAfterNavigate",
    ({ toLocation: _toLocation, fromLocation }) => {
      // Get the current location from the router's history
      const currentLocation =
        router.history.location.pathname + router.history.location.search;

      // Construct from location
      let fromPath: string | null = null;
      if (fromLocation) {
        if (typeof fromLocation === "string") {
          fromPath = fromLocation;
        } else if (typeof fromLocation === "object" && fromLocation !== null && "pathname" in fromLocation) {
          const loc = fromLocation as { pathname?: string; search?: string };
          fromPath = (loc.pathname || "") + (loc.search || "");
        } else {
          fromPath = String(fromLocation);
        }
      }

      // Only log if there's an actual navigation change
      if (fromPath && fromPath !== currentLocation) {
        // Use setTimeout to ensure the store is available
        setTimeout(() => {
          // TODO: Update to use React hook properly when this is used in a React component
          console.warn("Navigation tracking needs to be refactored to use React hooks");
        }, 0);
      }
    },
  );
}
