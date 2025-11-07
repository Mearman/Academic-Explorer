import { useEffect } from "react";

/**
 * Hook to fix browser address bar display issues with collapsed protocol slashes
 *
 * Browsers sometimes normalize URLs with consecutive slashes in hash routes,
 * causing https://doi.org/... to display as https:/doi.org/...
 * This hook detects and immediately corrects such display issues.
 */
export function useUrlNormalization(): void {
  useEffect(() => {
    // This hook is now deprecated - URL normalization has been moved to
    // the root route's beforeLoad function for more reliable processing
    // before React components mount.
  }, []);
}