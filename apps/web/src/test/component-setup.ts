/**
 * Component test setup file
 * Configures jest-dom matchers and component mocks for component tests with vitest
 */

import "@testing-library/jest-dom/vitest";
import { setupAllTestMocks } from './utils';

// Setup all component mocks for testing
setupAllTestMocks();