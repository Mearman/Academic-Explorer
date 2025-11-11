/**
 * MSW Server Setup for Playwright Tests
 * Initializes MSW Node.js server to intercept OpenAlex API requests during E2E tests
 *
 * Feature: 005-test-environment-msw
 * Purpose: Fix 27 failing tests by mocking api.openalex.org responses
 */

import { setupServer } from 'msw/node';
import { openalexHandlers } from '../../src/test/msw/handlers';

/**
 * MSW server instance
 * Intercepts HTTP requests during Playwright test execution
 */
export const mswServer = setupServer(...openalexHandlers);

/**
 * Start MSW server to begin intercepting requests
 * Called in Playwright globalSetup before any tests run
 */
export function startMSWServer() {
  mswServer.listen({
    onUnhandledRequest: 'warn', // Warn about unmocked requests (helpful for debugging)
  });
  console.log('✅ MSW server started - intercepting api.openalex.org requests');
}

/**
 * Stop MSW server and clean up resources
 * Called in Playwright globalTeardown after all tests complete
 */
export function stopMSWServer() {
  mswServer.close();
  console.log('🛑 MSW server stopped');
}

/**
 * Reset MSW handlers to initial state
 * Useful between test suites to clear any handler overrides
 */
export function resetMSWHandlers() {
  mswServer.resetHandlers();
  console.log('🔄 MSW handlers reset');
}
