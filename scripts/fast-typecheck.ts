#!/usr/bin/env tsx
/**
 * Fast TypeScript type checking script optimized for CI
 * Uses parallel processing and incremental builds for maximum speed
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { performance } from 'perf_hooks';

const TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes total timeout
const MAX_PARALLEL = 3; // Maximum parallel processes

interface Package {
  name: string;
  path: string;
  dependencies: string[];
}

// Define build order based on dependencies
const packages: Package[] = [
  { name: 'utils', path: 'packages/utils', dependencies: [] },
  { name: 'client', path: 'packages/client', dependencies: [] },
  { name: 'graph', path: 'packages/graph', dependencies: ['utils'] },
  { name: 'simulation', path: 'packages/simulation', dependencies: ['utils'] },
  { name: 'ui', path: 'packages/ui', dependencies: [] },
  { name: 'web', path: 'apps/web', dependencies: ['utils', 'client', 'graph', 'simulation', 'ui'] }
];

function runTypeCheck(pkg: Package): Promise<{ success: boolean; output: string; duration: number }> {
  return new Promise((resolve) => {
    const startTime = performance.now();

    console.log(`🔍 Type-checking ${pkg.name}...`);

    // Check if we have existing build info for faster incremental builds
    const hasBuildInfo = existsSync(`${pkg.path}/dist/.tsbuildinfo`);

    const args = [
      'tsc',
      '--noEmit',
      '--project', `${pkg.path}/tsconfig.json`,
      '--skipLibCheck', // Skip .d.ts files for speed
      '--assumeChangesOnlyAffectDirectDependencies', // Faster incremental builds
    ];

    if (hasBuildInfo) {
      args.push('--incremental');
    }

    const child = spawn('npx', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: TIMEOUT_MS / packages.length, // Per-package timeout
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      const duration = Math.round(performance.now() - startTime);
      const success = code === 0;

      if (success) {
        console.log(`✅ ${pkg.name} (${duration}ms)`);
      } else {
        console.log(`❌ ${pkg.name} failed (${duration}ms)`);
      }

      resolve({
        success,
        output: output + (errorOutput ? '\nSTDERR:\n' + errorOutput : ''),
        duration
      });
    });

    child.on('error', (error) => {
      const duration = Math.round(performance.now() - startTime);
      console.log(`💥 ${pkg.name} error (${duration}ms):`, error.message);

      resolve({
        success: false,
        output: `Error: ${error.message}`,
        duration
      });
    });
  });
}

async function main() {
  const startTime = performance.now();

  console.log('🚀 Starting optimized TypeScript type checking...');
  console.log(`📦 Processing ${packages.length} packages (max ${MAX_PARALLEL} parallel)`);

  const completed = new Set<string>();
  const results: Array<{ pkg: Package; success: boolean; duration: number }> = [];

  // Process packages respecting dependency order
  while (completed.size < packages.length) {
    // Find packages ready to process (dependencies completed)
    const ready = packages.filter(pkg =>
      !completed.has(pkg.name) &&
      pkg.dependencies.every(dep => completed.has(dep))
    );

    if (ready.length === 0) {
      console.log('❌ Circular dependency detected or all packages failed');
      break;
    }

    // Process up to MAX_PARALLEL packages in parallel
    const batch = ready.slice(0, MAX_PARALLEL);
    console.log(`\n🔄 Processing batch: ${batch.map(p => p.name).join(', ')}`);

    const promises = batch.map(runTypeCheck);
    const batchResults = await Promise.all(promises);

    // Update completed set and collect results
    for (let i = 0; i < batch.length; i++) {
      const pkg = batch[i];
      const result = batchResults[i];

      completed.add(pkg.name);
      results.push({ pkg, success: result.success, duration: result.duration });

      if (!result.success) {
        console.log(`\n❌ ${pkg.name} type checking failed:`);
        console.log(result.output);
      }
    }
  }

  const totalTime = Math.round(performance.now() - startTime);
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  console.log('\n📊 TypeScript Type Checking Summary:');
  console.log(`⏱️  Total time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
  console.log(`✅ Successful: ${successCount}/${packages.length}`);
  console.log(`❌ Failed: ${failCount}/${packages.length}`);

  if (failCount > 0) {
    console.log('\n💥 Type checking failed for some packages');
    const failed = results.filter(r => !r.success);
    failed.forEach(({ pkg }) => console.log(`   - ${pkg.name}`));
    process.exit(1);
  } else {
    console.log('\n🎉 All packages passed type checking!');

    // Show performance breakdown
    const fastest = results.sort((a, b) => a.duration - b.duration);
    console.log('\n⚡ Performance breakdown:');
    fastest.forEach(({ pkg, duration }) => {
      console.log(`   ${pkg.name}: ${duration}ms`);
    });

    process.exit(0);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Process interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Process terminated');
  process.exit(1);
});

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});