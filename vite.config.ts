/// <reference types="vitest" />
import { defineConfig } from 'vite'

// Workspace-level Vite configuration
// Individual apps have their own vite.config.ts files
export default defineConfig({
  // Basic workspace-level configuration
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },

  // Workspace-level test configuration for shared testing
  test: {
    // Global test configuration that can be extended by individual apps
    globals: false, // Apps should configure this individually
    environment: 'node', // Default for workspace-level tests

    // Shared test exclusions
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.nx/**',
    ],
  },
})