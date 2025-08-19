import { useContext } from 'react';

import { NetworkProviderContext } from '@/contexts/network-provider.context';
import type { NetworkContext } from '@/types/network';

/**
 * Hook to use network context
 */
export function useNetworkContext(): NetworkContext {
  const context = useContext(NetworkProviderContext);
  
  if (!context) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  
  return context;
}

/**
 * Hook to get network context safely with optional fallback
 */
export function useNetworkContextOptional(): NetworkContext | null {
  return useContext(NetworkProviderContext);
}