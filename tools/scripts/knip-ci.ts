#!/usr/bin/env tsx

/**
 * CI-friendly knip runner for Research Projects
 *
 * This script runs knip and reports findings as warnings rather than failures,
 * making it suitable for research projects where some unused code is expected
 * during active development and experimentation.
 */

import { execSync } from 'child_process';

interface KnipResults {
  unusedFiles: number;
  unusedDependencies: number;
  unresolvedImports: number;
  unusedExports: number;
  unusedTypes: number;
}

function parseKnipOutput(output: string): KnipResults {
  const results: KnipResults = {
    unusedFiles: 0,
    unusedDependencies: 0,
    unresolvedImports: 0,
    unusedExports: 0,
    unusedTypes: 0
  };

  const lines = output.split('\n');

  for (const line of lines) {
    if (line.includes('Unused files (')) {
      const match = line.match(/Unused files \((\d+)\)/);
      if (match) results.unusedFiles = parseInt(match[1], 10);
    } else if (line.includes('Unused dependencies (')) {
      const match = line.match(/Unused dependencies \((\d+)\)/);
      if (match) results.unusedDependencies = parseInt(match[1], 10);
    } else if (line.includes('Unresolved imports (')) {
      const match = line.match(/Unresolved imports \((\d+)\)/);
      if (match) results.unresolvedImports = parseInt(match[1], 10);
    } else if (line.includes('Unused exports (')) {
      const match = line.match(/Unused exports \((\d+)\)/);
      if (match) results.unusedExports = parseInt(match[1], 10);
    } else if (line.includes('Unused exported types (')) {
      const match = line.match(/Unused exported types \((\d+)\)/);
      if (match) results.unusedTypes = parseInt(match[1], 10);
    }
  }

  return results;
}

function formatSummary(results: KnipResults): string {
  const total = results.unusedFiles + results.unusedDependencies +
               results.unresolvedImports + results.unusedExports + results.unusedTypes;

  if (total === 0) {
    return '✅ No unused code detected';
  }

  const parts: string[] = [];
  if (results.unusedFiles > 0) parts.push(`${results.unusedFiles} unused files`);
  if (results.unusedDependencies > 0) parts.push(`${results.unusedDependencies} unused dependencies`);
  if (results.unresolvedImports > 0) parts.push(`${results.unresolvedImports} unresolved imports`);
  if (results.unusedExports > 0) parts.push(`${results.unusedExports} unused exports`);
  if (results.unusedTypes > 0) parts.push(`${results.unusedTypes} unused types`);

  return `⚠️  Found ${total} issues: ${parts.join(', ')}`;
}

function assessSeverity(results: KnipResults): 'info' | 'warning' | 'error' {
  // For research projects, most findings are informational
  const criticalIssues = results.unresolvedImports; // Only unresolved imports are critical

  if (criticalIssues > 5) return 'error';
  if (criticalIssues > 0) return 'warning';
  return 'info';
}

async function runKnipCI(): Promise<void> {
  console.log('🔍 Running knip analysis for CI...');

  try {
    // Run knip and capture output with timeout
    const _output = execSync('knip', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
      timeout: 60000, // 60 second timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    console.log('✅ No issues detected by knip');
    process.exit(0);

  } catch (error: unknown) {
    // Knip found issues - parse and assess them
    const execError = error as { stdout?: string; stderr?: string };
    const output = execError.stdout || execError.stderr || '';
    const results = parseKnipOutput(output);
    const summary = formatSummary(results);
    const severity = assessSeverity(results);

    console.log('\n=== Knip Analysis Results ===');
    console.log(summary);

    if (severity === 'error') {
      console.error(`❌ Critical issues found: ${results.unresolvedImports} unresolved imports`);
      console.log('\n❌ Too many critical issues found. Please review unresolved imports.');
      console.log('Unresolved imports can indicate missing dependencies or configuration issues.');
      process.exit(1);
    } else if (severity === 'warning') {
      console.warn(`⚠️  Some issues found but within acceptable limits for research project`);
      console.log('\n⚠️  Some issues found but within acceptable limits for research project.');
      console.log('Consider reviewing unresolved imports when convenient.');
    } else {
      console.log('ℹ️  Issues found are normal for active research development');
      console.log('\n ℹ️  Issues found are normal for active research development.');
      console.log('Unused exports and files are expected during experimentation.');
    }

    console.log('\n--- Detailed Results ---');
    console.log(output);

    // Always exit successfully for research projects unless critical issues
    process.exit(0);
  }
}

// Run the CI check
if (import.meta.url === `file://${process.argv[1]}`) {
  runKnipCI().catch((error) => {
    console.error('❌ Failed to run knip CI check:', error);
    process.exit(1);
  });
}