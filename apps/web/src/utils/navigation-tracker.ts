/**
 * Navigation tracking utility for logging route changes
 */

import { appActivityStore } from "@/stores/app-activity-store";

export function setupNavigationTracking(router: any) {
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
        } else if (fromLocation.pathname) {
          fromPath = fromLocation.pathname + (fromLocation.search || "");
        } else {
          fromPath = String(fromLocation);
        }
      }

      // Only log if there's an actual navigation change
      if (fromPath && fromPath !== currentLocation) {
        // Use setTimeout to ensure the store is available
        setTimeout(() => {
          appActivityStore.logNavigation(fromPath, currentLocation);
        }, 0);
      }
    },
  );
}
