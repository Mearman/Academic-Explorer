#!/usr/bin/env tsx
/**
 * Optimized build script for Academic Explorer
 * Uses dependency-ordered parallel builds to minimize total build time
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

// Increase EventEmitter max listeners globally
EventEmitter.defaultMaxListeners = 50;
process.setMaxListeners(50);

const MAX_PARALLEL = 3; // Safe parallel limit for CI
const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes total timeout

console.log('🚀 Starting optimized build process...');

interface BuildPackage {
  name: string;
  dependencies: string[];
}

// Build order respecting dependencies
const buildOrder: BuildPackage[] = [
  { name: 'utils', dependencies: [] },
  { name: 'client', dependencies: [] },
  { name: 'graph', dependencies: ['utils'] },
  { name: 'simulation', dependencies: ['utils'] },
  { name: 'ui', dependencies: [] },
  { name: 'web', dependencies: ['utils', 'client', 'graph', 'simulation', 'ui'] }
];

function runBuild(packageName: string): Promise<{ success: boolean; duration: number }> {
  return new Promise((resolve) => {
    const startTime = performance.now();

    console.log(`🔨 Building ${packageName}...`);

    const child = spawn('npx', ['nx', 'build', packageName, '--verbose'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: TIMEOUT_MS / buildOrder.length, // Per-package timeout
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=6144',
        NX_DAEMON: 'false', // Disable daemon for CI stability
      }
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
      // Show progress for long-running builds
      if (data.toString().includes('✓') || data.toString().includes('Built')) {
        process.stdout.write('.');
      }
    });

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      const duration = Math.round(performance.now() - startTime);
      const success = code === 0;

      if (success) {
        console.log(`\n✅ ${packageName} built successfully (${duration}ms)`);
      } else {
        console.log(`\n❌ ${packageName} build failed (${duration}ms)`);
        console.log('STDOUT:', output);
        console.log('STDERR:', errorOutput);
      }

      resolve({ success, duration });
    });

    child.on('error', (error) => {
      const duration = Math.round(performance.now() - startTime);
      console.log(`\n💥 ${packageName} build error (${duration}ms):`, error.message);
      resolve({ success: false, duration });
    });
  });
}

async function buildInOrder() {
  const startTime = performance.now();
  const completed = new Set<string>();
  const results: Array<{ name: string; success: boolean; duration: number }> = [];

  console.log(`📦 Building ${buildOrder.length} packages (max ${MAX_PARALLEL} parallel)`);

  while (completed.size < buildOrder.length) {
    // Find packages ready to build (dependencies completed)
    const ready = buildOrder.filter(pkg =>
      !completed.has(pkg.name) &&
      pkg.dependencies.every(dep => completed.has(dep))
    );

    if (ready.length === 0) {
      console.log('❌ Build order issue or circular dependency detected');
      break;
    }

    // Build up to MAX_PARALLEL packages in parallel
    const batch = ready.slice(0, MAX_PARALLEL);
    console.log(`\n🔄 Building batch: ${batch.map(p => p.name).join(', ')}`);

    const promises = batch.map(pkg => runBuild(pkg.name));
    const batchResults = await Promise.all(promises);

    // Update completed set and collect results
    for (let i = 0; i < batch.length; i++) {
      const pkg = batch[i];
      const result = batchResults[i];

      completed.add(pkg.name);
      results.push({ name: pkg.name, success: result.success, duration: result.duration });
    }
  }

  const totalTime = Math.round(performance.now() - startTime);
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  console.log('\n📊 Build Summary:');
  console.log(`⏱️  Total time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
  console.log(`✅ Successful: ${successCount}/${buildOrder.length}`);
  console.log(`❌ Failed: ${failCount}/${buildOrder.length}`);

  if (failCount > 0) {
    console.log('\n💥 Build failed for packages:');
    const failed = results.filter(r => !r.success);
    failed.forEach(({ name }) => console.log(`   - ${name}`));
    process.exit(1);
  } else {
    console.log('\n🎉 All packages built successfully!');

    // Show performance breakdown
    console.log('\n⚡ Build times:');
    results.forEach(({ name, duration }) => {
      console.log(`   ${name}: ${duration}ms`);
    });

    process.exit(0);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Build interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Build terminated');
  process.exit(1);
});

// Start the optimized build process
buildInOrder().catch(error => {
  console.error('💥 Unexpected build error:', error);
  process.exit(1);
});