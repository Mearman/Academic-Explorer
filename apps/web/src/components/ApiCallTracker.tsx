/**
 * API Call Tracker component that logs OpenAlex API calls to activity store
 */

import { useAppActivityStore } from "@/stores/app-activity-store";

export interface ApiCallTrackerProps {
  entityType: string;
  entityId?: string;
  queryParams?: Record<string, unknown>;
}

/**
 * Component that logs API calls when rendered
 * Use this to track when API calls are made
 */
export function ApiCallTracker({
  entityType,
  entityId,
  queryParams,
}: ApiCallTrackerProps) {
  // Log the API call when component mounts
  const store = useAppActivityStore.getState();
  store.addEvent({
    type: "api",
    category: "data",
    event: "api_call",
    description: `API call to ${entityType}${entityId ? `/${entityId}` : ""}`,
    severity: "info",
    metadata: {
      entityType,
      entityId,
      queryParams,
    },
  });

  return null; // This component doesn't render anything
}

/**
 * Hook to track API calls
 */
export function useApiCallTracker() {
  const store = useAppActivityStore.getState();

  return {
    trackApiCall: (
      entityType: string,
      entityId?: string,
      queryParams?: Record<string, unknown>,
    ) => {
      store.addEvent({
        type: "api",
        category: "data",
        event: "api_call",
        description: `API call to ${entityType}${entityId ? `/${entityId}` : ""}`,
        severity: "info",
        metadata: {
          entityType,
          entityId,
          queryParams,
        },
      });
    },
  };
}
