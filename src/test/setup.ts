import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Setup MSW server
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test
afterEach(async () => {
  server.resetHandlers();
  vi.clearAllMocks();
  
  // Clear the mock database stores
  try {
    const { mockDb } = await import('./mocks/database');
    mockDb.clearAllStores();
  } catch (error) {
    // Ignore if mock database is not available
  }
});

// Clean up after all tests
afterAll(async () => {
  server.close();
  // Give time for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Mock fetch for Node environment - MSW handles this

// Mock the entire database layer to avoid IndexedDB issues
vi.mock('@/lib/db', async () => {
  const { mockDb, MockDatabaseService } = await import('./mocks/database');
  return {
    DatabaseService: MockDatabaseService,
    db: mockDb,
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
}

// Suppress console errors in tests (optional)
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render')
  ) {
    return;
  }
  originalError.call(console, ...args);
};