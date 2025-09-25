#!/usr/bin/env tsx
/**
 * Fast TypeScript type checking script for CI environments
 * Uses optimized settings to minimize compilation time
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

const start = performance.now();

console.log('🚀 Starting fast TypeScript compilation...');

try {
  // Use TypeScript build mode with aggressive optimizations
  execSync('npx tsc --build --incremental --verbose', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      // Disable TypeScript's built-in checks for faster compilation
      TS_NODE_TRANSPILE_ONLY: 'true',
      // Optimize for speed over safety
      TS_NODE_SKIP_IGNORE: 'true',
    }
  });

  const duration = performance.now() - start;
  console.log(`✅ TypeScript compilation completed in ${(duration / 1000).toFixed(2)}s`);
} catch (error) {
  const duration = performance.now() - start;
  console.error(`❌ TypeScript compilation failed after ${(duration / 1000).toFixed(2)}s`);
  process.exit(1);
}