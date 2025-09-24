#!/usr/bin/env tsx
/**
 * Quick Verification Script
 *
 * Fast verification of the most common issues after lint fixes
 */

import { execSync } from 'node:child_process';

interface QuickCheckResult {
  command: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
}

class QuickVerifier {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = process.cwd();
  }

  /**
   * Run a command with timeout and capture results
   */
  private runCommand(command: string, description: string, timeoutMs = 30000): QuickCheckResult {
    console.log(`🧪 ${description}...`);
    const startTime = Date.now();

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: this.workspaceRoot,
        timeout: timeoutMs,
        stdio: 'pipe'
      });

      const duration = Date.now() - startTime;
      console.log(`✅ ${description} (${duration}ms)`);

      return {
        command,
        passed: true,
        duration,
        output
      };

    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorObj = error as { stdout?: string; stderr?: string; message?: string };
      const errorOutput = errorObj.stdout || errorObj.stderr || errorObj.message;

      console.log(`❌ ${description} failed (${duration}ms)`);

      return {
        command,
        passed: false,
        duration,
        output: errorObj.stdout,
        error: errorOutput
      };
    }
  }

  /**
   * Run essential verification checks
   */
  runQuickVerification(): QuickCheckResult[] {
    console.log('⚡ QUICK VERIFICATION - Essential Checks');
    console.log('='.repeat(50));

    const checks: Array<{ command: string; description: string; timeout?: number }> = [
      {
        command: 'pnpm lint --max-warnings=0',
        description: 'Workspace lint check',
        timeout: 60000
      },
      {
        command: 'pnpm typecheck',
        description: 'TypeScript compilation',
        timeout: 45000
      },
      {
        command: 'pnpm test --run --passWithNoTests',
        description: 'Unit tests',
        timeout: 120000
      }
    ];

    const results: QuickCheckResult[] = [];

    for (const check of checks) {
      const result = this.runCommand(check.command, check.description, check.timeout);
      results.push(result);

      // Stop on first failure for quick feedback
      if (!result.passed) {
        console.log(`\n⏹️  Stopping verification after first failure`);
        console.log(`💡 Fix the above issue and run again for complete verification`);
        break;
      }
    }

    return results;
  }

  /**
   * Run specific package verification
   */
  runPackageVerification(packageName: string): QuickCheckResult[] {
    console.log(`⚡ QUICK PACKAGE VERIFICATION: ${packageName}`);
    console.log('='.repeat(50));

    const checks = [
      {
        command: `npx nx lint ${packageName} --max-warnings=0`,
        description: `Lint ${packageName}`
      },
      {
        command: `npx nx typecheck ${packageName}`,
        description: `TypeScript ${packageName}`
      },
      {
        command: `npx nx build ${packageName}`,
        description: `Build ${packageName}`
      }
    ];

    const results: QuickCheckResult[] = [];

    for (const check of checks) {
      const result = this.runCommand(check.command, check.description);
      results.push(result);

      if (!result.passed) {
        console.log(`\n⏹️  ${packageName} verification failed`);
        break;
      }
    }

    return results;
  }

  /**
   * Display results summary
   */
  displaySummary(results: QuickCheckResult[]): void {
    console.log('\n📊 QUICK VERIFICATION SUMMARY');
    console.log('-'.repeat(40));

    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed === 0) {
      console.log('\n🎉 All quick checks passed!');
      console.log('💚 Your lint fixes are working correctly.');
    } else {
      console.log('\n⚠️  Some checks failed. Details:');

      results.forEach(result => {
        if (!result.passed) {
          console.log(`\n❌ ${result.command}`);
          if (result.error) {
            // Show first few lines of error for quick diagnosis
            const errorLines = result.error.split('\n').slice(0, 5);
            errorLines.forEach(line => {
              if (line.trim()) console.log(`   ${line}`);
            });

            const remainingLines = result.error.split('\n').length - 5;
            if (remainingLines > 0) {
              console.log(`   ... and ${remainingLines} more lines`);
            }
          }
        }
      });

      console.log('\n🔧 Next steps:');
      console.log('1. Fix the first failed check');
      console.log('2. Run quick-verify again');
      console.log('3. For detailed analysis: tools/scripts/verify-lint-fixes.ts');
    }
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const verifier = new QuickVerifier();

  try {
    let results: QuickCheckResult[];

    if (args.length > 0 && !args[0].startsWith('--')) {
      // Package-specific verification
      const packageName = args[0];
      results = verifier.runPackageVerification(packageName);
    } else {
      // Full workspace verification
      results = verifier.runQuickVerification();
    }

    verifier.displaySummary(results);

    // Exit with appropriate code
    const hasFailures = results.some(r => !r.passed);
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Quick verification failed:', error);
    process.exit(1);
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Quick Verification Tool');
  console.log('');
  console.log('Usage:');
  console.log('  quick-verify.ts                 # Verify entire workspace');
  console.log('  quick-verify.ts <package-name>  # Verify specific package');
  console.log('');
  console.log('Examples:');
  console.log('  quick-verify.ts');
  console.log('  quick-verify.ts web');
  console.log('  quick-verify.ts client');
  process.exit(0);
}

// Allow both direct execution and module import
import { fileURLToPath } from 'node:url';

if (import.meta.url && process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error);
  }
}

export { QuickVerifier };