/**
 * MSW server setup for testing environments
 * Configures Mock Service Worker for Node.js test environments
 */

import { setupServer } from "msw/node";
import { openalexHandlers } from "./handlers";

/**
 * MSW server instance for Node.js test environments
 * Used in component, integration, and e2e tests
 */
export const server = setupServer(...openalexHandlers);

/**
 * Start MSW server before all tests
 */
export const startMockServer = () => {
  server.listen({
    onUnhandledRequest: "warn" // Log warnings for unhandled requests
  });
};

/**
 * Stop MSW server after all tests
 */
export const stopMockServer = () => {
  server.close();
};

/**
 * Reset handlers between tests
 */
export const resetMockServer = () => {
  server.resetHandlers();
};