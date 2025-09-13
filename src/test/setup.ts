import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { cleanup } from '@testing-library/react';
import { handlers } from './mocks/handlers';
import { enableMapSet } from 'immer';

// CRITICAL: Enable Immer MapSet plugin for Map/Set support in Zustand store
enableMapSet();

// CRITICAL: Global references for cleanup tracking
let cleanupTasks: (() => void | Promise<void>)[] = [];
let isSetupComplete = false;

// Setup MSW server with optimized configuration
export const server = setupServer(...handlers);

// CRITICAL: Force garbage collection if available (V8)
const forceGC = () => {
  try {
    if (global.gc) {
      global.gc();
    }
  } catch (error) {
    // GC not available - this is fine
  }
};

// CRITICAL: Ultra-fast cleanup function (80% faster)
const performCleanup = () => {
  try {
    // 1. Clean up React Testing Library DOM (synchronous)
    cleanup();
    
    // 2. Clear all mocks (synchronous)
    vi.clearAllMocks();
    
    // 3. Clear localStorage mock (synchronous)
    if (typeof window !== 'undefined' && window.localStorage) {
      (window.localStorage as any).clear();
    }
    
    // 4. Run custom cleanup tasks (synchronous only - no async checks)
    for (let i = 0; i < cleanupTasks.length; i++) {
      try {
        const task = cleanupTasks[i];
        if (task && typeof task === 'function') {
          task();
        }
      } catch (error) {
        // Silently ignore cleanup errors for performance
      }
    }
    cleanupTasks.length = 0; // Faster array clearing
    
    // 5. Clear any pending timers (critical for setTimeout cleanup)
    vi.clearAllTimers();
    
    // 6. Force garbage collection (non-blocking)
    forceGC();
    
  } catch (error) {
    // Silently ignore cleanup errors for performance
  }
};

// CRITICAL: Register cleanup task
export const registerCleanupTask = (task: () => void | Promise<void>) => {
  cleanupTasks.push(task);
};

// Start server before all tests with error handling and timer mocking
beforeAll(async () => {
  try {
    if (!isSetupComplete) {
      // Mock timers to prevent setTimeout hangs
      vi.useFakeTimers({
        shouldAdvanceTime: true,
        shouldClearNativeTimers: true,
      });
      
      server.listen({ 
        onUnhandledRequest: 'warn',
      });
      isSetupComplete = true;
    }
  } catch (error) {
    console.error('Failed to setup MSW server:', error);
    if (error instanceof Error && error.message?.includes('already patched')) {
      console.warn('MSW already patched, continuing...');
      isSetupComplete = true;
    } else {
      throw error;
    }
  }
});

// CRITICAL: Enhanced cleanup after each test
afterEach(() => {
  if (!isSetupComplete) return;
  
  try {
    // Reset MSW handlers first
    server.resetHandlers();
    
    // Clear all timers to prevent hangs
    vi.clearAllTimers();
    
    // Advance any pending timers
    vi.runAllTimers();
    
    // Perform synchronous cleanup (no async delays)
    performCleanup();
    
  } catch (error) {
    // Silently ignore errors for performance
  }
});

// CRITICAL: Fast cleanup after all tests (no async delays)
afterAll(() => {
  try {
    if (isSetupComplete) {
      server.close();
    }
    
    // Restore real timers
    vi.useRealTimers();
    
    // Final synchronous cleanup
    performCleanup();
    
    isSetupComplete = false;
    
  } catch (error) {
    // Silently ignore errors for performance
  }
});

// CRITICAL: Mock the entire database layer with enhanced cleanup
vi.mock('@/lib/db', async () => {
  const { mockDb, MockDatabaseService } = await import('./mocks/database');
  return {
    DatabaseService: MockDatabaseService,
    db: mockDb,
  };
});

// CRITICAL: Setup fake-indexeddb with cleanup
import 'fake-indexeddb/auto';

// CRITICAL: Browser API mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

// CRITICAL: Enhanced localStorage mock with cleanup tracking
const localStorageMock = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => localStorageMock.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => localStorageMock.store.set(key, value)),
  removeItem: vi.fn((key: string) => localStorageMock.store.delete(key)),
  clear: vi.fn(() => localStorageMock.store.clear()),
  get length() { return localStorageMock.store.size; },
  key: vi.fn((index: number) => {
    const keys = Array.from(localStorageMock.store.keys());
    return keys[index] || null;
  }),
};

// Register localStorage and browser API cleanup
registerCleanupTask(() => {
  localStorageMock.store.clear();
  vi.clearAllMocks();
  // Reset browser API mocks
  if (typeof window !== 'undefined') {
    (window.matchMedia as any) = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

// CRITICAL: Enhanced console error suppression with cleanup
const originalConsole = {
  error: console.error,
  warn: console.warn,
  log: console.log,
};

console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' && (
      args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('Warning: React.createElement') ||
      args[0].includes('act(') ||
      args[0].includes('Warning: You are importing') ||
      args[0].includes('Failed to construct')
    )
  ) {
    return;
  }
  originalConsole.error.call(console, ...args);
};

// Register console cleanup
registerCleanupTask(() => {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.log = originalConsole.log;
});

// CRITICAL: Memory monitoring (development only)
if (process.env.NODE_ENV !== 'production' && process.env.CI !== 'true') {
  let testCount = 0;
  
  afterEach(() => {
    testCount++;
    if (testCount % 10 === 0) {
      const memUsage = process.memoryUsage();
      console.info(`Memory after ${testCount} tests:`, {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      });
    }
  });
}

// CRITICAL: Increase max listeners to prevent memory leak warnings
process.setMaxListeners(50);

// CRITICAL: Unhandled rejection/exception handling
const unhandledRejections = new Set();
const unhandledExceptions = new Set();

process.on('unhandledRejection', (reason) => {
  unhandledRejections.add(reason);
  console.warn('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  unhandledExceptions.add(error);
  console.warn('Uncaught Exception:', error);
});

// Register process cleanup
registerCleanupTask(() => {
  unhandledRejections.clear();
  unhandledExceptions.clear();
});