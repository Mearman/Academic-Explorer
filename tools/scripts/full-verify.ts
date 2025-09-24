#!/usr/bin/env tsx
/**
 * Full Verification Script
 *
 * Runs comprehensive quality checks across the entire monorepo:
 * - TypeScript compilation (typecheck)
 * - Build verification (build)
 * - Test execution (test)
 * - Linting verification (lint)
 */

import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

interface VerificationResult {
  command: string;
  description: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
}

interface VerificationSummary {
  results: VerificationResult[];
  totalDuration: number;
  passedCount: number;
  failedCount: number;
  success: boolean;
}

class FullVerifier {
  private workspaceRoot: string;
  private verbose: boolean;
  private stopOnFailure: boolean;

  constructor(options: { verbose?: boolean; stopOnFailure?: boolean } = {}) {
    this.workspaceRoot = process.cwd();
    this.verbose = options.verbose ?? false;
    this.stopOnFailure = options.stopOnFailure ?? true;
  }

  /**
   * Run a command with comprehensive error handling and timing
   */
  private runCommand(
    command: string,
    description: string,
    timeoutMs = 300000
  ): VerificationResult {
    console.log(`🧪 ${description}...`);
    const startTime = performance.now();

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: this.workspaceRoot,
        timeout: timeoutMs,
        stdio: this.verbose ? 'inherit' : 'pipe'
      });

      const duration = Math.round(performance.now() - startTime);
      console.log(`✅ ${description} (${this.formatDuration(duration)})`);

      return {
        command,
        description,
        passed: true,
        duration,
        output: this.verbose ? undefined : output
      };

    } catch (error: unknown) {
      const duration = Math.round(performance.now() - startTime);
      const errorObj = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
        signal?: string;
        code?: number;
      };

      // Handle different error types
      let errorMessage = 'Unknown error';
      if (errorObj.signal === 'SIGTERM') {
        errorMessage = `Command timed out after ${this.formatDuration(timeoutMs)}`;
      } else if (errorObj.stdout || errorObj.stderr) {
        errorMessage = (errorObj.stderr || errorObj.stdout || '').trim();
      } else if (errorObj.message) {
        errorMessage = errorObj.message;
      }

      console.log(`❌ ${description} failed (${this.formatDuration(duration)})`);

      if (this.verbose && errorMessage) {
        console.log(`   Error: ${errorMessage.split('\n')[0]}`);
      }

      return {
        command,
        description,
        passed: false,
        duration,
        output: errorObj.stdout,
        error: errorMessage
      };
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  /**
   * Run the full verification pipeline
   */
  runFullVerification(): VerificationSummary {
    console.log('🏁 FULL MONOREPO VERIFICATION');
    console.log('='.repeat(60));
    console.log(`📁 Workspace: ${this.workspaceRoot}`);
    console.log(`🔧 Mode: ${this.verbose ? 'Verbose' : 'Standard'}`);
    console.log(`⚡ Stop on failure: ${this.stopOnFailure ? 'Yes' : 'No'}`);
    console.log('='.repeat(60));

    const checks: Array<{
      command: string;
      description: string;
      timeout?: number;
      critical?: boolean;
    }> = [
      {
        command: 'pnpm typecheck',
        description: 'TypeScript compilation check',
        timeout: 120000,
        critical: true
      },
      {
        command: 'pnpm build',
        description: 'Build verification',
        timeout: 300000,
        critical: true
      },
      {
        command: 'pnpm test',
        description: 'Test suite execution',
        timeout: 600000,
        critical: true
      },
      {
        command: 'pnpm lint',
        description: 'Linting verification',
        timeout: 180000,
        critical: true
      }
    ];

    const results: VerificationResult[] = [];
    const overallStartTime = performance.now();

    for (const check of checks) {
      const result = this.runCommand(
        check.command,
        check.description,
        check.timeout
      );

      results.push(result);

      // Stop on first critical failure if configured to do so
      if (!result.passed && check.critical && this.stopOnFailure) {
        console.log(`\n⏹️  Stopping verification after critical failure`);
        console.log(`💡 Fix the above issue and run again for complete verification`);
        break;
      }

      // Add separator between commands for clarity
      if (result !== results[results.length - 1]) {
        console.log('');
      }
    }

    const totalDuration = Math.round(performance.now() - overallStartTime);
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;
    const success = failedCount === 0;

    return {
      results,
      totalDuration,
      passedCount,
      failedCount,
      success
    };
  }

  /**
   * Display detailed results summary
   */
  displaySummary(summary: VerificationSummary): void {
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    // Overall results
    console.log(`⏱️  Total time: ${this.formatDuration(summary.totalDuration)}`);
    console.log(`✅ Passed: ${summary.passedCount}`);
    console.log(`❌ Failed: ${summary.failedCount}`);
    console.log(`🎯 Success rate: ${Math.round((summary.passedCount / summary.results.length) * 100)}%`);

    // Individual command results
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(60));

    summary.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const duration = this.formatDuration(result.duration);
      console.log(`${index + 1}. ${status} ${result.description} (${duration})`);

      if (!result.passed && result.error && !this.verbose) {
        // Show first line of error for quick diagnosis
        const firstErrorLine = result.error.split('\n').find(line => line.trim());
        if (firstErrorLine) {
          console.log(`   └─ ${firstErrorLine.substring(0, 100)}${firstErrorLine.length > 100 ? '...' : ''}`);
        }
      }
    });

    // Final status and next steps
    console.log('\n' + '='.repeat(60));

    if (summary.success) {
      console.log('🎉 ALL VERIFICATION CHECKS PASSED!');
      console.log('💚 Your codebase is ready for production.');
      console.log('🚀 You can safely proceed with deployment or merging.');
    } else {
      console.log('⚠️  VERIFICATION FAILED');
      console.log(`❌ ${summary.failedCount} out of ${summary.results.length} checks failed.`);

      console.log('\n🔧 NEXT STEPS:');

      const failedResults = summary.results.filter(r => !r.passed);
      failedResults.forEach((result, index) => {
        console.log(`${index + 1}. Fix issues in: ${result.description}`);
        if (!this.verbose && result.error) {
          console.log(`   Command: ${result.command}`);
        }
      });

      console.log('\n💡 DEBUGGING TIPS:');
      console.log('• Run with --verbose for detailed output');
      console.log('• Run individual commands to see full error details');
      console.log('• Check the specific package logs for more context');
      if (this.stopOnFailure) {
        console.log('• Use --no-stop-on-failure to see all failures at once');
      }
    }
  }

  /**
   * Display usage information
   */
  static displayUsage(): void {
    console.log('Full Verification Tool - Monorepo Quality Gate');
    console.log('');
    console.log('DESCRIPTION:');
    console.log('  Runs comprehensive quality checks across the entire monorepo:');
    console.log('  • TypeScript compilation (pnpm typecheck)');
    console.log('  • Build verification (pnpm build)');
    console.log('  • Test suite execution (pnpm test)');
    console.log('  • Linting verification (pnpm lint)');
    console.log('');
    console.log('USAGE:');
    console.log('  full-verify.ts [options]');
    console.log('');
    console.log('OPTIONS:');
    console.log('  --verbose              Show detailed output from all commands');
    console.log('  --no-stop-on-failure   Continue running all checks even after failures');
    console.log('  --help, -h             Show this help message');
    console.log('');
    console.log('EXIT CODES:');
    console.log('  0  All verification checks passed');
    console.log('  1  One or more verification checks failed');
    console.log('  2  Script execution error');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  ./full-verify.ts                    # Standard verification');
    console.log('  ./full-verify.ts --verbose          # Verbose output');
    console.log('  ./full-verify.ts --no-stop-on-failure  # See all failures');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  verbose: boolean;
  stopOnFailure: boolean;
  showHelp: boolean;
} {
  return {
    verbose: args.includes('--verbose') || args.includes('-v'),
    stopOnFailure: !args.includes('--no-stop-on-failure'),
    showHelp: args.includes('--help') || args.includes('-h')
  };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Show help if requested
  if (options.showHelp) {
    FullVerifier.displayUsage();
    process.exit(0);
  }

  console.log('🏁 Starting full monorepo verification...\n');

  const verifier = new FullVerifier({
    verbose: options.verbose,
    stopOnFailure: options.stopOnFailure
  });

  try {
    const summary = verifier.runFullVerification();
    verifier.displaySummary(summary);

    // Exit with appropriate code
    process.exit(summary.success ? 0 : 1);

  } catch (error) {
    console.error('\n💥 VERIFICATION SCRIPT ERROR:');
    console.error(error);
    console.error('\nThis indicates a problem with the verification script itself.');
    console.error('Please check the script configuration and try again.');
    process.exit(2);
  }
}

// Allow both direct execution and module import
import { fileURLToPath } from 'node:url';

if (import.meta.url && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { FullVerifier, type VerificationResult, type VerificationSummary };