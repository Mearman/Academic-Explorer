/// <reference types="vitest" />
import { defineConfig, mergeConfig } from "vite";
import baseConfig from "../../vite.config.base";

// Simple config for Nx compatibility - complex logic moved to separate files
export default defineConfig(() => {
  return mergeConfig(baseConfig, {
    // Nx-friendly configuration - no complex imports or git commands
    define: {
      // Add any global defines here if needed
    },
    // Add any additional config here if needed
  });
});
