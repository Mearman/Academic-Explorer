/**
 * Test utilities barrel export
 * Exports all test utilities from the utils directory
 */

// Component mocks
export {
  mockXYFlow,
  mockD3Force,
  mockWebWorker,
  mockCanvas,
  mockIndexedDB,
  setupComponentMocks,
  resetComponentMocks,
} from "./component-mocks";

// Store mocks
export {
  createMockStore,
  createMockLayoutStore,
  createMockSettingsStore,
  createMockExpansionSettingsStore,
  mockStoreModule,
  withMockStores,
  resetMockStores,
} from "./store-mocks";

// Router mocks
export {
  createMockRouter,
  createMockNavigation,
  createMockRouteContext,
  createMockMatch,
  withMockRouter,
  mockRouterHooks,
  setupRouterMocks,
  resetRouterMocks,
} from "./router-mocks";

// Import the setup functions for use in setupAllTestMocks
import { setupComponentMocks } from "./component-mocks";
import { setupRouterMocks } from "./router-mocks";

/**
 * Setup all test mocks for component testing
 * This function combines all mock setup functions
 */
export const setupAllTestMocks = () => {
  setupComponentMocks();
  setupRouterMocks();
};