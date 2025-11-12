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
    onUnhandledRequest(request, print) {
      // Log all unhandled requests for debugging
      const url = new URL(request.url);

      // Only warn about OpenAlex API requests (ignore other domains)
      if (url.hostname === 'api.openalex.org') {
        console.warn(`⚠️  UNMOCKED REQUEST: ${request.method} ${request.url}`);
        print.warning();
      }
    },
  });

  // Add request lifecycle logging for debugging
  mswServer.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.hostname === 'api.openalex.org') {
      console.log(`🔵 MSW intercepting: ${request.method} ${url.pathname}${url.search}`);
    }
  });

  mswServer.events.on('request:match', ({ request }) => {
    const url = new URL(request.url);
    if (url.hostname === 'api.openalex.org') {
      console.log(`✅ MSW matched handler: ${request.method} ${url.pathname}${url.search}`);
    }
  });

  mswServer.events.on('request:unhandled', ({ request }) => {
    const url = new URL(request.url);
    if (url.hostname === 'api.openalex.org') {
      console.error(`❌ MSW unhandled: ${request.method} ${url.pathname}${url.search}`);
    }
  });

  console.log('✅ MSW server started - intercepting api.openalex.org requests');
  console.log('🔍 Verbose logging enabled for debugging HTTP 403 errors');
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
