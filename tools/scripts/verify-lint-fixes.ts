#!/usr/bin/env tsx
/**
 * Systematic Lint Verification Strategy
 *
 * This script provides a systematic approach to verify all lint fixes
 * across the monorepo packages without conflicts.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface PackageInfo {
  name: string;
  path: string;
  hasLint: boolean;
  hasTypecheck: boolean;
  hasBuild: boolean;
}

interface VerificationResult {
  package: string;
  lint: {
    passed: boolean;
    errors: number;
    warnings: number;
    output?: string;
  };
  typecheck: {
    passed: boolean;
    errors: number;
    output?: string;
  };
  build: {
    passed: boolean;
    output?: string;
  };
}

class LintVerificationStrategy {
  private workspaceRoot: string;
  private packages: PackageInfo[] = [];

  constructor() {
    this.workspaceRoot = process.cwd();
    console.log(`🔍 Starting lint verification from: ${this.workspaceRoot}`);
  }

  /**
   * Discover all packages in the workspace
   */
  private discoverPackages(): void {
    console.log('\n📦 Discovering packages...');

    try {
      // Get package list from nx
      const nxOutput = execSync('npx nx show projects --json', {
        encoding: 'utf-8',
        cwd: this.workspaceRoot
      });

      const projectNames = JSON.parse(nxOutput) as string[];

      for (const projectName of projectNames) {
        // Check different possible project locations

        let projectPath: string | null = null;
        let projectJson: { targets?: Record<string, unknown> } | null = null;

        // Try different locations
        const possiblePaths = [
          join(this.workspaceRoot, 'apps', projectName),
          join(this.workspaceRoot, 'packages', projectName),
          join(this.workspaceRoot, 'tools')
        ];

        for (const path of possiblePaths) {
          const jsonPath = join(path, 'project.json');
          if (existsSync(jsonPath)) {
            projectPath = path;
            projectJson = JSON.parse(readFileSync(jsonPath, 'utf-8'));
            break;
          }
        }

        if (!projectPath || !projectJson) {
          console.log(`⚠️  Could not find project.json for ${projectName}`);
          continue;
        }

        const targets = projectJson.targets || {};

        this.packages.push({
          name: projectName,
          path: projectPath,
          hasLint: !!targets['lint'],
          hasTypecheck: !!targets['typecheck'],
          hasBuild: !!targets['build']
        });
      }

      console.log(`✅ Discovered ${this.packages.length} packages`);
      this.packages.forEach(pkg => {
        console.log(`   - ${pkg.name} (lint: ${pkg.hasLint ? '✓' : '✗'}, typecheck: ${pkg.hasTypecheck ? '✓' : '✗'}, build: ${pkg.hasBuild ? '✓' : '✗'})`);
      });

    } catch (error) {
      console.error('❌ Failed to discover packages:', error);
      throw error;
    }
  }

  /**
   * Run lint verification for a single package
   */
  private verifyPackageLint(pkg: PackageInfo): VerificationResult['lint'] {
    if (!pkg.hasLint) {
      return { passed: true, errors: 0, warnings: 0, output: 'No lint target configured' };
    }

    try {
      const output = execSync(`npx nx lint ${pkg.name}`, {
        encoding: 'utf-8',
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });

      return {
        passed: true,
        errors: 0,
        warnings: 0,
        output
      };
    } catch (error: unknown) {
      const output = (error as { stdout?: string; message?: string }).stdout || (error as Error).message;

      // Parse ESLint output for error/warning counts
      const errorMatch = output.match(/(\d+)\s+error/);
      const warningMatch = output.match(/(\d+)\s+warning/);

      return {
        passed: false,
        errors: errorMatch ? parseInt(errorMatch[1]) : 1,
        warnings: warningMatch ? parseInt(warningMatch[1]) : 0,
        output
      };
    }
  }

  /**
   * Run TypeScript compilation verification for a single package
   */
  private verifyPackageTypecheck(pkg: PackageInfo): VerificationResult['typecheck'] {
    if (!pkg.hasTypecheck) {
      return { passed: true, errors: 0, output: 'No typecheck target configured' };
    }

    try {
      const output = execSync(`npx nx typecheck ${pkg.name}`, {
        encoding: 'utf-8',
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });

      return {
        passed: true,
        errors: 0,
        output
      };
    } catch (error: unknown) {
      const output = (error as { stdout?: string; message?: string }).stdout || (error as Error).message;

      // Count TypeScript errors
      const errorLines = output.split('\n').filter((line: string) =>
        line.includes('error TS') || line.includes(': error')
      );

      return {
        passed: false,
        errors: errorLines.length,
        output
      };
    }
  }

  /**
   * Run build verification for a single package
   */
  private verifyPackageBuild(pkg: PackageInfo): VerificationResult['build'] {
    if (!pkg.hasBuild) {
      return { passed: true, output: 'No build target configured' };
    }

    try {
      const output = execSync(`npx nx build ${pkg.name}`, {
        encoding: 'utf-8',
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });

      return {
        passed: true,
        output
      };
    } catch (error: unknown) {
      return {
        passed: false,
        output: (error as { stdout?: string; message?: string }).stdout || (error as Error).message
      };
    }
  }

  /**
   * Run comprehensive verification for all packages
   */
  runVerification(): VerificationResult[] {
    this.discoverPackages();

    console.log('\n🧪 Running verification tests...\n');

    const results: VerificationResult[] = [];

    for (const pkg of this.packages) {
      console.log(`📋 Verifying ${pkg.name}...`);

      const result: VerificationResult = {
        package: pkg.name,
        lint: { passed: true, errors: 0, warnings: 0 },
        typecheck: { passed: true, errors: 0 },
        build: { passed: true }
      };

      // Step 1: Lint check
      console.log(`   🔍 Running lint...`);
      result.lint = this.verifyPackageLint(pkg);

      if (result.lint.passed) {
        console.log(`   ✅ Lint passed`);
      } else {
        console.log(`   ❌ Lint failed: ${result.lint.errors} errors, ${result.lint.warnings} warnings`);
      }

      // Step 2: TypeScript check
      console.log(`   🔧 Running typecheck...`);
      result.typecheck = this.verifyPackageTypecheck(pkg);

      if (result.typecheck.passed) {
        console.log(`   ✅ TypeScript compilation passed`);
      } else {
        console.log(`   ❌ TypeScript compilation failed: ${result.typecheck.errors} errors`);
      }

      // Step 3: Build check (only if lint and typecheck pass)
      if (result.lint.passed && result.typecheck.passed) {
        console.log(`   🏗️  Running build...`);
        result.build = this.verifyPackageBuild(pkg);

        if (result.build.passed) {
          console.log(`   ✅ Build passed`);
        } else {
          console.log(`   ❌ Build failed`);
        }
      } else {
        console.log(`   ⏭️  Skipping build due to lint/typecheck failures`);
        result.build = { passed: false, output: 'Skipped due to lint/typecheck failures' };
      }

      results.push(result);
      console.log();
    }

    return results;
  }

  /**
   * Generate verification summary report
   */
  generateSummaryReport(results: VerificationResult[]): void {
    console.log('\n📊 VERIFICATION SUMMARY REPORT');
    console.log('='.repeat(50));

    const totalPackages = results.length;
    const lintPassed = results.filter(r => r.lint.passed).length;
    const typecheckPassed = results.filter(r => r.typecheck.passed).length;
    const buildPassed = results.filter(r => r.build.passed).length;

    console.log(`\n📦 Packages: ${totalPackages}`);
    console.log(`🔍 Lint:      ${lintPassed}/${totalPackages} passed`);
    console.log(`🔧 Typecheck: ${typecheckPassed}/${totalPackages} passed`);
    console.log(`🏗️  Build:     ${buildPassed}/${totalPackages} passed`);

    // Detailed breakdown
    console.log('\n📋 DETAILED BREAKDOWN');
    console.log('-'.repeat(50));

    for (const result of results) {
      const lintStatus = result.lint.passed ? '✅' : '❌';
      const typecheckStatus = result.typecheck.passed ? '✅' : '❌';
      const buildStatus = result.build.passed ? '✅' : '❌';

      console.log(`${result.package.padEnd(20)} | ${lintStatus} | ${typecheckStatus} | ${buildStatus}`);

      // Show error details for failed packages
      if (!result.lint.passed && result.lint.errors > 0) {
        console.log(`  └─ Lint: ${result.lint.errors} errors, ${result.lint.warnings} warnings`);
      }

      if (!result.typecheck.passed && result.typecheck.errors > 0) {
        console.log(`  └─ TypeScript: ${result.typecheck.errors} errors`);
      }
    }

    // Failed packages section
    const failedPackages = results.filter(r => !r.lint.passed || !r.typecheck.passed || !r.build.passed);

    if (failedPackages.length > 0) {
      console.log('\n❌ FAILED PACKAGES');
      console.log('-'.repeat(50));

      for (const result of failedPackages) {
        console.log(`\n📦 ${result.package}`);

        if (!result.lint.passed) {
          console.log(`   🔍 Lint Issues (${result.lint.errors} errors, ${result.lint.warnings} warnings):`);
          if (result.lint.output) {
            const lines = result.lint.output.split('\n').slice(-10); // Show last 10 lines
            lines.forEach(line => {
              if (line.trim()) console.log(`      ${line}`);
            });
          }
        }

        if (!result.typecheck.passed) {
          console.log(`   🔧 TypeScript Issues (${result.typecheck.errors} errors):`);
          if (result.typecheck.output) {
            const lines = result.typecheck.output.split('\n').slice(-10); // Show last 10 lines
            lines.forEach(line => {
              if (line.trim()) console.log(`      ${line}`);
            });
          }
        }

        if (!result.build.passed) {
          console.log(`   🏗️  Build Issues:`);
          if (result.build.output) {
            const lines = result.build.output.split('\n').slice(-10); // Show last 10 lines
            lines.forEach(line => {
              if (line.trim()) console.log(`      ${line}`);
            });
          }
        }
      }
    }

    // Success message
    if (failedPackages.length === 0) {
      console.log('\n🎉 ALL PACKAGES PASSED VERIFICATION!');
      console.log('✨ Lint fixes are working correctly across the entire monorepo.');
    } else {
      console.log(`\n⚠️  ${failedPackages.length} packages require attention.`);
      console.log('🔧 Please address the issues above before proceeding.');
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * Run quick smoke test to verify basic functionality
   */
  runSmokeTest(): void {
    console.log('\n💨 SMOKE TEST - Basic Functionality Check');
    console.log('-'.repeat(50));

    try {
      // Test workspace-level commands
      console.log('🧪 Testing workspace-level lint...');
      execSync('pnpm lint --max-warnings=0', {
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });
      console.log('✅ Workspace lint passed');

      console.log('🧪 Testing workspace-level typecheck...');
      execSync('pnpm typecheck', {
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });
      console.log('✅ Workspace typecheck passed');

      console.log('🧪 Testing workspace-level build...');
      execSync('pnpm build', {
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });
      console.log('✅ Workspace build passed');

      console.log('\n🎉 SMOKE TEST PASSED - All basic functionality is working!');

    } catch (error: unknown) {
      console.log('\n❌ SMOKE TEST FAILED');
      console.log('Error output:');
      console.log((error as { stdout?: string; message?: string }).stdout || (error as Error).message);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
function main() {
  console.log('🚀 LINT VERIFICATION STRATEGY');
  console.log('='.repeat(50));

  const verifier = new LintVerificationStrategy();

  try {
    // Step 1: Run smoke test
    verifier.runSmokeTest();

    // Step 2: Run detailed verification
    const results = verifier.runVerification();

    // Step 3: Generate report
    verifier.generateSummaryReport(results);

    // Exit with appropriate code
    const hasFailures = results.some(r => !r.lint.passed || !r.typecheck.passed || !r.build.passed);
    process.exit(hasFailures ? 1 : 0);

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

export { LintVerificationStrategy };