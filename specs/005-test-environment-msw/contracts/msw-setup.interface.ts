/**
 * MSW Setup Interface Contract
 *
 * Defines the contract for initializing and managing MSW server lifecycle
 * in Playwright global setup/teardown.
 *
 * Feature: 005-test-environment-msw
 * Phase: Phase 1 Design
 */

import type { SetupServer } from 'msw/node';
import type { RequestHandler } from 'msw';

/**
 * MSW Server Lifecycle Manager
 *
 * Handles initialization, configuration, and teardown of MSW server
 * for Playwright E2E tests.
 */
export interface MSWServerManager {
  /**
   * Initialize MSW server with OpenAlex API handlers
   *
   * @param handlers - Array of MSW request handlers
   * @param options - Server configuration options
   * @returns Initialized MSW server instance
   *
   * @example
   * const server = manager.initialize(openalexHandlers, {
   *   onUnhandledRequest: 'warn'
   * });
   */
  initialize(
    handlers: RequestHandler[],
    options?: MSWServerOptions
  ): SetupServer;

  /**
   * Start MSW server to begin intercepting requests
   *
   * Called in Playwright globalSetup before any tests run.
   *
   * @throws Error if server is already running
   */
  start(): void;

  /**
   * Stop MSW server and clean up resources
   *
   * Called in Playwright globalTeardown after all tests complete.
   */
  stop(): void;

  /**
   * Get current server status
   *
   * @returns true if server is running, false otherwise
   */
  isRunning(): boolean;

  /**
   * Reset MSW handlers to initial state
   *
   * Useful between test suites to clear any handler overrides.
   */
  resetHandlers(): void;
}

/**
 * MSW Server Configuration Options
 */
export interface MSWServerOptions {
  /**
   * How to handle requests that don't match any handlers
   *
   * - 'error': Throw error (strict mode)
   * - 'warn': Log warning (default for tests)
   * - 'bypass': Allow request to pass through to real API
   */
  onUnhandledRequest?: 'error' | 'warn' | 'bypass';

  /**
   * Custom error handler for MSW server errors
   *
   * @param error - Error that occurred
   */
  onError?: (error: Error) => void;

  /**
   * Enable verbose logging for debugging
   *
   * Default: false (only errors and warnings)
   */
  verbose?: boolean;
}

/**
 * MSW Handler Validation
 *
 * Ensures handlers conform to expected patterns before server initialization.
 */
export interface HandlerValidator {
  /**
   * Validate that handlers cover required OpenAlex API endpoints
   *
   * @param handlers - Handlers to validate
   * @returns Validation result with missing endpoints if any
   *
   * @example
   * const result = validator.validate(openalexHandlers);
   * if (!result.valid) {
   *   console.error('Missing endpoints:', result.missingEndpoints);
   * }
   */
  validate(handlers: RequestHandler[]): HandlerValidationResult;

  /**
   * Required OpenAlex API endpoints for tests
   */
  requiredEndpoints: readonly string[];
}

/**
 * Handler Validation Result
 */
export interface HandlerValidationResult {
  /** Whether all required endpoints are covered */
  valid: boolean;

  /** Endpoints that have handlers */
  coveredEndpoints: string[];

  /** Required endpoints missing handlers */
  missingEndpoints: string[];

  /** Optional warnings (e.g., duplicate handlers) */
  warnings?: string[];
}

/**
 * Fixture Loader Interface (Optional - for static JSON fixtures)
 *
 * Used when tests require specific entity data that mock factories cannot generate.
 */
export interface FixtureLoader {
  /**
   * Load Work entity fixture by ID
   *
   * @param id - OpenAlex Work ID (e.g., "W123456789")
   * @returns Work entity or null if fixture not found
   */
  loadWork(id: string): unknown | null;

  /**
   * Load Author entity fixture by ID
   *
   * @param id - OpenAlex Author ID (e.g., "A123456789")
   * @returns Author entity or null if fixture not found
   */
  loadAuthor(id: string): unknown | null;

  /**
   * Load Institution entity fixture by ID
   *
   * @param id - OpenAlex Institution ID (e.g., "I123456789")
   * @returns Institution entity or null if fixture not found
   */
  loadInstitution(id: string): unknown | null;

  /**
   * Check if static fixture exists for entity
   *
   * @param type - Entity type
   * @param id - Entity ID
   * @returns true if fixture file exists
   */
  hasFixture(type: 'work' | 'author' | 'institution', id: string): boolean;

  /**
   * List all available fixture IDs for entity type
   *
   * @param type - Entity type
   * @returns Array of fixture IDs
   */
  listFixtures(type: 'work' | 'author' | 'institution'): string[];
}

/**
 * Mock Factory Interface
 *
 * Defines contract for programmatic mock entity generation.
 * Already implemented in apps/web/src/test/msw/handlers.ts
 */
export interface MockFactory {
  /**
   * Create mock Work entity with dynamic ID
   *
   * @param id - Work ID (e.g., "W123")
   * @returns Complete Work entity matching OpenAlex schema
   */
  createMockWork(id: string): unknown;

  /**
   * Create mock Author entity with dynamic ID
   *
   * @param id - Author ID (e.g., "A123")
   * @returns Complete Author entity matching OpenAlex schema
   */
  createMockAuthor(id: string): unknown;

  /**
   * Create mock Institution entity with dynamic ID
   *
   * @param id - Institution ID (e.g., "I123")
   * @returns Complete Institution entity matching OpenAlex schema
   */
  createMockInstitution(id: string): unknown;
}

/**
 * Global Setup Return Type
 *
 * Used to pass MSW server instance from globalSetup to globalTeardown.
 */
export interface PlaywrightGlobalState {
  /** MSW server instance */
  mswServer: SetupServer;

  /** Timestamp when setup completed */
  setupTimestamp: string;

  /** Test environment information */
  environment: {
    nodeVersion: string;
    playwrightVersion: string;
    mswVersion: string;
  };
}
