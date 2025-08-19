import { createContext } from 'react';

import type { NetworkContext } from '@/types/network';

export const NetworkProviderContext = createContext<NetworkContext | null>(null);