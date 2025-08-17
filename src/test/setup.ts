import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { cleanup } from '@testing-library/react';
import { handlers } from './mocks/handlers';

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

// CRITICAL: Enhanced cleanup function
const performCleanup = async () => {
  try {
    // 1. Clean up React Testing Library DOM
    cleanup();
    
    // 2. Clear all mocks
    vi.clearAllMocks();
    
    // 3. Clear mock database stores
    try {
      const { mockDb } = await import('./mocks/database');
      mockDb.clearAllStores();
    } catch (error) {
      // Ignore if mock database is not available
    }
    
    // 3. Clear localStorage mock
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        (window.localStorage as any).clear();
      } catch (error) {
        // Ignore localStorage errors
      }
    }
    
    // 4. Clear any cached modules
    vi.resetModules();
    
    // 5. Run custom cleanup tasks
    for (const task of cleanupTasks) {
      try {
        await task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    }
    cleanupTasks = [];
    
    // 6. Force garbage collection
    forceGC();
    
  } catch (error) {
    console.warn('Cleanup failed:', error);
  }
};

// CRITICAL: Register cleanup task
export const registerCleanupTask = (task: () => void | Promise<void>) => {
  cleanupTasks.push(task);
};

// Start server before all tests with error handling
beforeAll(async () => {
  try {
    if (!isSetupComplete) {
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
afterEach(async () => {
  if (!isSetupComplete) return;
  
  try {
    // Reset MSW handlers first
    server.resetHandlers();
    
    // Perform comprehensive cleanup
    await performCleanup();
    
    // Small delay to allow async cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
  } catch (error) {
    console.warn('afterEach cleanup failed:', error);
  }
});

// CRITICAL: Enhanced cleanup after all tests
afterAll(async () => {
  try {
    if (isSetupComplete) {
      server.close();
    }
    
    // Final comprehensive cleanup
    await performCleanup();
    
    // Allow time for final cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    isSetupComplete = false;
    
  } catch (error) {
    console.warn('afterAll cleanup failed:', error);
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

// Register localStorage cleanup
registerCleanupTask(() => {
  localStorageMock.store.clear();
  vi.clearAllMocks();
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