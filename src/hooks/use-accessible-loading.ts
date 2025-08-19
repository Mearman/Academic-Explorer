import { useState, useCallback } from 'react';

/**
 * Convenience hook for managing loading states with accessibility features
 */
export const useAccessibleLoading = ({
  announceStateChanges = true,
  verboseAnnouncements: _verboseAnnouncements = false,
}: {
  announceStateChanges?: boolean;
  verboseAnnouncements?: boolean;
} = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);
  const [progress, setProgress] = useState<number | undefined>(undefined);

  const startLoading = useCallback((label?: string) => {
    setIsLoading(true);
    setError(null);
    setProgress(undefined);
    
    if (announceStateChanges && label) {
      // Announce loading start
    }
  }, [announceStateChanges]);

  const stopLoading = useCallback((label?: string) => {
    setIsLoading(false);
    setProgress(100);
    
    if (announceStateChanges && label) {
      // Announce loading completion
    }
    
    // Reset progress after announcement
    setTimeout(() => setProgress(undefined), 1000);
  }, [announceStateChanges]);

  const setLoadingError = useCallback((newError: Error | string) => {
    setIsLoading(false);
    setError(newError);
    setProgress(undefined);
  }, []);

  const updateProgress = useCallback((newProgress: number) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
  }, []);

  const retry = useCallback(() => {
    setError(null);
    startLoading();
  }, [startLoading]);

  return {
    isLoading,
    error,
    progress,
    startLoading,
    stopLoading,
    setLoadingError,
    updateProgress,
    retry,
  };
};