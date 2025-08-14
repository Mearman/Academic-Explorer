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

// Mock IndexedDB
const mockIDBRequest = {
  result: undefined,
  error: null,
  onsuccess: null,
  onerror: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const mockIDBObjectStore = {
  add: vi.fn(() => mockIDBRequest),
  put: vi.fn(() => mockIDBRequest),
  get: vi.fn(() => mockIDBRequest),
  delete: vi.fn(() => mockIDBRequest),
  clear: vi.fn(() => mockIDBRequest),
  count: vi.fn(() => mockIDBRequest),
  getAll: vi.fn(() => mockIDBRequest),
  getAllKeys: vi.fn(() => mockIDBRequest),
  index: vi.fn(() => ({
    get: vi.fn(() => mockIDBRequest),
    getAll: vi.fn(() => mockIDBRequest),
    getAllKeys: vi.fn(() => mockIDBRequest),
  })),
  createIndex: vi.fn(),
  deleteIndex: vi.fn(),
};

const mockIDBTransaction = {
  objectStore: vi.fn(() => mockIDBObjectStore),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  oncomplete: null,
  onerror: null,
  onabort: null,
};

const mockIDBDatabase = {
  transaction: vi.fn(() => mockIDBTransaction),
  createObjectStore: vi.fn(() => mockIDBObjectStore),
  deleteObjectStore: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const mockIDBOpenDBRequest = {
  ...mockIDBRequest,
  onupgradeneeded: null,
  onblocked: null,
};

const mockIndexedDB = {
  open: vi.fn(() => {
    const request = { ...mockIDBOpenDBRequest };
    // Simulate successful database opening
    setTimeout(() => {
      request.result = mockIDBDatabase;
      if (request.onsuccess) request.onsuccess({ target: request } as any);
    }, 0);
    return request;
  }),
  deleteDatabase: vi.fn(() => mockIDBRequest),
  databases: vi.fn(() => Promise.resolve([])),
  cmp: vi.fn(),
};

// Setup IndexedDB mock in global scope
Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

Object.defineProperty(globalThis, 'IDBKeyRange', {
  value: {
    bound: vi.fn(),
    only: vi.fn(),
    lowerBound: vi.fn(),
    upperBound: vi.fn(),
  },
  writable: true,
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
  Object.defineProperty(window, 'indexedDB', {
    value: mockIndexedDB,
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