#!/usr/bin/env tsx

import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

/**
 * E2E Test Runner
 * Starts dev server, waits for it to be ready, runs E2E tests, then cleans up
 */
class E2ETestRunner {
  private devServerProcess: ChildProcess | null = null;
  private readonly port = 5173;
  private readonly maxWaitTime = 60000; // 60 seconds
  private readonly checkInterval = 1000; // 1 second

  constructor() {
    // Setup cleanup handlers
    this.setupCleanupHandlers();
  }

  /**
   * Setup cleanup signal handlers
   */
  private setupCleanupHandlers(): void {
    const cleanup = () => {
      console.log('\n🛑 Cleaning up...');
      if (this.devServerProcess && !this.devServerProcess.killed) {
        this.devServerProcess.kill('SIGTERM');
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGQUIT', cleanup);
  }

  /**
   * Check if the dev server is ready by making a simple HTTP request
   */
  private async isServerReady(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.port}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Wait for the dev server to be ready
   */
  private async waitForServer(): Promise<void> {
    console.log(`⏳ Waiting for dev server on port ${this.port}...`);

    const startTime = Date.now();
    while (Date.now() - startTime < this.maxWaitTime) {
      if (await this.isServerReady()) {
        console.log('✅ Dev server is ready!');
        return;
      }
      await setTimeout(this.checkInterval);
    }

    throw new Error(`Dev server did not start within ${this.maxWaitTime}ms`);
  }

  /**
   * Check if port is available
   */
  private async isPortAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.port}`, {
        signal: AbortSignal.timeout(1000)
      });
      return false; // Port is occupied
    } catch {
      return true; // Port is available
    }
  }

  /**
   * Start the development server
   */
  private async startDevServer(): Promise<void> {
    console.log('🚀 Starting development server...');

    // Check if port is already occupied
    if (!(await this.isPortAvailable())) {
      console.log(`⚠️  Port ${this.port} is already in use, attempting to use existing server...`);
      if (await this.isServerReady()) {
        console.log('✅ Using existing dev server!');
        return;
      } else {
        throw new Error(`Port ${this.port} is occupied but server is not responding properly`);
      }
    }

    this.devServerProcess = spawn('vite', [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: process.platform !== 'win32'
    });

    // Handle server output
    this.devServerProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ready')) {
        console.log('📡 Dev server started');
      }
    });

    this.devServerProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      if (!error.includes('warning')) {
        console.error('⚠️  Dev server error:', error);
      }
    });

    this.devServerProcess.on('error', (error) => {
      console.error('💥 Failed to start dev server:', error);
      throw error;
    });

    // Wait for server to be ready
    await this.waitForServer();
  }

  /**
   * Run the E2E tests
   */
  private async runTests(): Promise<number> {
    console.log('🧪 Running E2E tests...');

    return new Promise((resolve, reject) => {
      const testProcess = spawn('vitest', ['run', '--project=e2e'], {
        stdio: 'inherit',
        shell: true
      });

      testProcess.on('error', (error) => {
        console.error('💥 Failed to run tests:', error);
        reject(error);
      });

      testProcess.on('exit', (code, signal) => {
        if (signal) {
          console.log(`📋 Tests terminated by signal: ${signal}`);
          reject(new Error(`Tests terminated by signal: ${signal}`));
        } else {
          console.log(`📋 Tests completed with exit code: ${code}`);
          resolve(code || 0);
        }
      });
    });
  }

  /**
   * Run the complete E2E test process
   */
  public async run(): Promise<number> {
    try {
      await this.startDevServer();
      const exitCode = await this.runTests();
      return exitCode;
    } catch (error) {
      console.error('💥 E2E test run failed:', error);
      return 1;
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting E2E test runner...');
  const runner = new E2ETestRunner();
  const exitCode = await runner.run();
  console.log(`🏁 E2E test runner finished with exit code: ${exitCode}`);
  process.exit(exitCode);
}

// Run if called directly
const currentFile = fileURLToPath(import.meta.url);
const runningFile = resolve(process.argv[1]);

if (currentFile === runningFile) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

export { E2ETestRunner };