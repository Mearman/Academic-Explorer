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
  const store = useAppActivityStore();
  store.logApiCall(entityType, entityId, queryParams);

  return null; // This component doesn't render anything
}

/**
 * Hook to track API calls
 */
export function useApiCallTracker() {
  const store = useAppActivityStore();

  return {
    trackApiCall: ({
      entityType,
      entityId,
      queryParams,
    }: {
      entityType: string;
      entityId?: string;
      queryParams?: Record<string, unknown>;
    }) => {
      store.logApiCall(entityType, entityId, queryParams);
    },
  };
}
