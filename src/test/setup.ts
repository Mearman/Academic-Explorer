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
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Mock fetch for Node environment - MSW handles this

// Mock IndexedDB for tests
const mockIndexedDB = {
  open: vi.fn(() => Promise.resolve({
    objectStoreNames: {
      contains: vi.fn(() => false),
    },
    createObjectStore: vi.fn(),
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        add: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        getAll: vi.fn(() => Promise.resolve([])),
        getAllKeys: vi.fn(() => Promise.resolve([])),
      })),
      done: Promise.resolve(),
    })),
  })),
};

if (typeof window !== 'undefined') {
  (window as any).indexedDB = mockIndexedDB;
}

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