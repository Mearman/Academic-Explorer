import { useEffect, useState } from 'react';

import { useAppStore } from '@/stores/app-store';

/**
 * Hook to safely use Zustand store with SSR/SSG
 * Prevents hydration mismatches by returning undefined on server
 */
export function useStore<T>(selector: (state: ReturnType<typeof useAppStore>) => T): T | undefined {
  const [isClient, setIsClient] = useState(false);
  const result = useAppStore(selector);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? result : undefined;
}