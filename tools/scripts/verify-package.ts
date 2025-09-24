#!/usr/bin/env tsx
/**
 * Individual Package Verification Script
 *
 * Verifies lint fixes for a specific package with detailed output
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface PackageVerificationOptions {
  package: string;
  verbose?: boolean;
  skipBuild?: boolean;
  maxWarnings?: number;
}

class PackageVerifier {
  private workspaceRoot: string;
  private packageName: string;
  private verbose: boolean;
  private skipBuild: boolean;
  private maxWarnings: number;

  constructor(options: PackageVerificationOptions) {
    this.workspaceRoot = process.cwd();
    this.packageName = options.package;
    this.verbose = options.verbose || false;
    this.skipBuild = options.skipBuild || false;
    this.maxWarnings = options.maxWarnings || 0;
  }

  /**
   * Check if package exists and has required configuration
   */
  private validatePackage(): boolean {
    const possiblePaths = [
      join(this.workspaceRoot, 'apps', this.packageName),
      join(this.workspaceRoot, 'packages', this.packageName),
      join(this.workspaceRoot, 'tools')
    ];

    for (const path of possiblePaths) {
      const projectJsonPath = join(path, 'project.json');
      if (existsSync(projectJsonPath)) {
        console.log(`✅ Found package: ${this.packageName} at ${path}`);
        return true;
      }
    }

    console.error(`❌ Package '${this.packageName}' not found in workspace`);
    return false;
  }

  /**
   * Run ESLint with detailed output parsing
   */
  private runLintCheck(): { passed: boolean; details: unknown } {
    console.log('\n🔍 Running ESLint...');

    try {
      const command = `npx nx lint ${this.packageName} --max-warnings=${this.maxWarnings}`;
      console.log(`Command: ${command}`);

      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });

      if (this.verbose) {
        console.log('Lint output:');
        console.log(output);
      }

      console.log('✅ ESLint passed with no issues');
      return {
        passed: true,
        details: { errors: 0, warnings: 0, output }
      };

    } catch (error: unknown) {
      const errorObj = error as { stdout?: string; stderr?: string; message?: string };
      const output = errorObj.stdout || errorObj.stderr || errorObj.message || 'Unknown error';

      console.log('❌ ESLint found issues:');
      console.log(output);

      // Parse ESLint output for detailed analysis
      const lines = output.split('\n');
      const problemLines = lines.filter((line: string) =>
        line.includes('error') || line.includes('warning')
      );

      const errorCount = (output.match(/(\d+)\s+error/g) || [])
        .reduce((sum: number, match: string) => {
          const numberMatch = match.match(/\d+/);
          return sum + (numberMatch ? parseInt(numberMatch[0]) : 0);
        }, 0);

      const warningCount = (output.match(/(\d+)\s+warning/g) || [])
        .reduce((sum: number, match: string) => {
          const numberMatch = match.match(/\d+/);
          return sum + (numberMatch ? parseInt(numberMatch[0]) : 0);
        }, 0);

      console.log(`\n📊 Summary: ${errorCount} errors, ${warningCount} warnings`);

      // Group issues by rule
      const ruleIssues: Record<string, string[]> = {};
      problemLines.forEach(line => {
        const ruleMatch = line.match(/\s+([a-zA-Z/@-]+)\s*$/);
        if (ruleMatch) {
          const rule = ruleMatch[1];
          if (!ruleIssues[rule]) ruleIssues[rule] = [];
          ruleIssues[rule].push(line.trim());
        }
      });

      if (Object.keys(ruleIssues).length > 0) {
        console.log('\n🔍 Issues by rule:');
        Object.entries(ruleIssues).forEach(([rule, issues]) => {
          console.log(`  ${rule}: ${issues.length} issues`);
          if (this.verbose) {
            issues.slice(0, 3).forEach(issue => {
              console.log(`    - ${issue}`);
            });
            if (issues.length > 3) {
              console.log(`    ... and ${issues.length - 3} more`);
            }
          }
        });
      }

      return {
        passed: false,
        details: { errors: errorCount, warnings: warningCount, output, ruleIssues }
      };
    }
  }

  /**
   * Run TypeScript compilation check
   */
  private runTypecheckCheck(): { passed: boolean; details: unknown } {
    console.log('\n🔧 Running TypeScript compilation...');

    try {
      const command = `npx nx typecheck ${this.packageName}`;
      console.log(`Command: ${command}`);

      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });

      if (this.verbose) {
        console.log('TypeScript output:');
        console.log(output);
      }

      console.log('✅ TypeScript compilation passed');
      return {
        passed: true,
        details: { errors: 0, output }
      };

    } catch (error: unknown) {
      const errorObj = error as { stdout?: string; stderr?: string; message?: string };
      const output = errorObj.stdout || errorObj.stderr || errorObj.message || 'Unknown error';

      console.log('❌ TypeScript compilation failed:');
      console.log(output);

      // Parse TypeScript errors
      const errorLines = output.split('\n').filter((line: string) =>
        line.includes('error TS') || line.includes(': error')
      );

      const errorCount = errorLines.length;

      console.log(`\n📊 Summary: ${errorCount} TypeScript errors`);

      // Group errors by type
      const errorTypes: Record<string, string[]> = {};
      errorLines.forEach(line => {
        const errorMatch = line.match(/error TS(\d+):/);
        if (errorMatch) {
          const errorCode = `TS${errorMatch[1]}`;
          if (!errorTypes[errorCode]) errorTypes[errorCode] = [];
          errorTypes[errorCode].push(line.trim());
        }
      });

      if (Object.keys(errorTypes).length > 0) {
        console.log('\n🔍 Errors by type:');
        Object.entries(errorTypes).forEach(([errorCode, errors]) => {
          console.log(`  ${errorCode}: ${errors.length} errors`);
          if (this.verbose) {
            errors.slice(0, 2).forEach(error => {
              console.log(`    - ${error}`);
            });
            if (errors.length > 2) {
              console.log(`    ... and ${errors.length - 2} more`);
            }
          }
        });
      }

      return {
        passed: false,
        details: { errors: errorCount, output, errorTypes }
      };
    }
  }

  /**
   * Run build check
   */
  private runBuildCheck(): { passed: boolean; details: unknown } {
    if (this.skipBuild) {
      console.log('\n⏭️  Skipping build check (--skip-build flag)');
      return { passed: true, details: { skipped: true } };
    }

    console.log('\n🏗️  Running build...');

    try {
      const command = `npx nx build ${this.packageName}`;
      console.log(`Command: ${command}`);

      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });

      if (this.verbose) {
        console.log('Build output:');
        console.log(output);
      }

      console.log('✅ Build completed successfully');
      return {
        passed: true,
        details: { output }
      };

    } catch (error: unknown) {
      const errorObj = error as { stdout?: string; stderr?: string; message?: string };
      const output = errorObj.stdout || errorObj.stderr || errorObj.message || 'Unknown error';

      console.log('❌ Build failed:');
      console.log(output);

      return {
        passed: false,
        details: { output }
      };
    }
  }

  /**
   * Run complete verification
   */
  verify(): boolean {
    console.log(`🚀 VERIFYING PACKAGE: ${this.packageName}`);
    console.log('='.repeat(50));

    // Step 1: Validate package exists
    if (!this.validatePackage()) {
      return false;
    }

    let allPassed = true;

    // Step 2: Lint check
    const lintResult = this.runLintCheck();
    if (!lintResult.passed) {
      allPassed = false;
    }

    // Step 3: TypeScript check
    const typecheckResult = this.runTypecheckCheck();
    if (!typecheckResult.passed) {
      allPassed = false;
    }

    // Step 4: Build check (only if previous steps passed)
    let buildResult = { passed: true, details: { skipped: true } };
    if (lintResult.passed && typecheckResult.passed && !this.skipBuild) {
      buildResult = this.runBuildCheck();
      if (!buildResult.passed) {
        allPassed = false;
      }
    } else if (!lintResult.passed || !typecheckResult.passed) {
      console.log('\n⏭️  Skipping build due to previous failures');
    }

    // Summary
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('-'.repeat(30));
    console.log(`Package: ${this.packageName}`);
    console.log(`Lint:    ${lintResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Types:   ${typecheckResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Build:   ${buildResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Overall: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);

    if (!allPassed) {
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      if (!lintResult.passed) {
        console.log(`  - Fix ESLint issues: npx nx lint ${this.packageName} --fix`);
      }
      if (!typecheckResult.passed) {
        console.log(`  - Fix TypeScript errors in source files`);
      }
      if (!buildResult.passed && !buildResult.details.skipped) {
        console.log(`  - Fix build issues`);
      }
    }

    return allPassed;
  }
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: verify-package.ts <package-name> [options]');
    console.log('Options:');
    console.log('  --verbose     Show detailed output');
    console.log('  --skip-build  Skip build verification');
    console.log('  --max-warnings <n>  Maximum allowed warnings (default: 0)');
    console.log('');
    console.log('Examples:');
    console.log('  verify-package.ts web');
    console.log('  verify-package.ts client --verbose');
    console.log('  verify-package.ts ui --skip-build --max-warnings 5');
    process.exit(1);
  }

  const packageName = args[0];
  const verbose = args.includes('--verbose');
  const skipBuild = args.includes('--skip-build');

  const maxWarningsIndex = args.findIndex(arg => arg === '--max-warnings');
  const maxWarnings = maxWarningsIndex !== -1 && args[maxWarningsIndex + 1]
    ? parseInt(args[maxWarningsIndex + 1])
    : 0;

  const verifier = new PackageVerifier({
    package: packageName,
    verbose,
    skipBuild,
    maxWarnings
  });

  try {
    const success = verifier.verify();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
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

export { PackageVerifier };