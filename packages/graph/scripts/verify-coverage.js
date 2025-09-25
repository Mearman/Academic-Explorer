#!/usr/bin/env node

/**
 * Verify Phase 2 component coverage and compliance
 *
 * This script verifies that all Phase 2 components are included in coverage
 * and meet the required thresholds.
 *
 * Usage:
 *   node scripts/verify-coverage.js [coverage-summary.json]
 */

const fs = require('fs');
const path = require('path');

// Define Phase 2 components that must have coverage
const PHASE_2_COMPONENTS = [
  'src/providers/base-provider.ts',
  'src/providers/openalex-provider.ts',
  'src/services/entity-resolver-interface.ts',
  // Note: index.ts files are typically excluded from coverage as they're just re-exports
];

// Minimum coverage thresholds for different component types
const COMPONENT_THRESHOLDS = {
  providers: { statements: 95, branches: 95, functions: 95, lines: 95 },
  services: { statements: 95, branches: 95, functions: 95, lines: 95 },
  hooks: { statements: 90, branches: 90, functions: 90, lines: 90 },
  forces: { statements: 85, branches: 85, functions: 85, lines: 85 },
  default: { statements: 90, branches: 90, functions: 90, lines: 90 }
};

function getComponentType(filePath) {
  if (filePath.includes('/providers/')) return 'providers';
  if (filePath.includes('/services/')) return 'services';
  if (filePath.includes('/hooks/')) return 'hooks';
  if (filePath.includes('/forces/')) return 'forces';
  return 'default';
}

function getThresholds(componentType) {
  return COMPONENT_THRESHOLDS[componentType] || COMPONENT_THRESHOLDS.default;
}

function verifyCoverage(coveragePath = './coverage/coverage-summary.json') {
  console.log('🔍 Verifying Phase 2 component coverage...\n');

  // Check if coverage file exists
  if (!fs.existsSync(coveragePath)) {
    console.error(`❌ Coverage file not found: ${coveragePath}`);
    console.error('Run tests with coverage first: pnpm test:coverage');
    process.exit(1);
  }

  let coverage;
  try {
    coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Failed to parse coverage file: ${error.message}`);
    process.exit(1);
  }

  let allPassed = true;
  const results = [];

  // Check total coverage first
  console.log('📊 Overall Coverage:');
  const total = coverage.total;
  console.log(`  Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
  console.log(`  Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
  console.log(`  Functions: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
  console.log(`  Lines: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
  console.log();

  // Verify each Phase 2 component
  console.log('🧩 Phase 2 Component Coverage:');

  for (const component of PHASE_2_COMPONENTS) {
    const componentType = getComponentType(component);
    const thresholds = getThresholds(componentType);

    // Find the component in coverage data
    // Coverage keys may be absolute paths, so we need to match by suffix
    const coverageKey = Object.keys(coverage).find(key =>
      key.endsWith(component) || key.includes(component.replace('src/', ''))
    );

    if (!coverageKey) {
      console.log(`  ❌ ${component} - NOT FOUND in coverage data`);
      results.push({ component, status: 'missing', reason: 'Not found in coverage data' });
      allPassed = false;
      continue;
    }

    const componentCoverage = coverage[coverageKey];
    const failures = [];

    // Check each metric
    ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
      const actual = componentCoverage[metric].pct;
      const required = thresholds[metric];

      if (actual < required) {
        failures.push(`${metric}: ${actual}% < ${required}%`);
      }
    });

    if (failures.length === 0) {
      console.log(`  ✅ ${component} - All thresholds met`);
      console.log(`    S: ${componentCoverage.statements.pct}% B: ${componentCoverage.branches.pct}% F: ${componentCoverage.functions.pct}% L: ${componentCoverage.lines.pct}%`);
      results.push({ component, status: 'passed' });
    } else {
      console.log(`  ❌ ${component} - Thresholds not met:`);
      failures.forEach(failure => console.log(`    ${failure}`));
      results.push({ component, status: 'failed', failures });
      allPassed = false;
    }
  }

  console.log();

  // Check for other important files in coverage
  console.log('📋 Additional Coverage Analysis:');

  const allFiles = Object.keys(coverage).filter(key => key !== 'total');
  const phase2Files = allFiles.filter(file =>
    file.includes('/providers/') ||
    file.includes('/services/') ||
    file.includes('/hooks/') ||
    file.includes('/forces/')
  );

  console.log(`  Total files in coverage: ${allFiles.length}`);
  console.log(`  Phase 2 component files: ${phase2Files.length}`);

  // List files that may need attention
  const lowCoverageFiles = allFiles.filter(file => {
    const fileCoverage = coverage[file];
    return (
      fileCoverage.statements.pct < 80 ||
      fileCoverage.branches.pct < 80 ||
      fileCoverage.functions.pct < 80 ||
      fileCoverage.lines.pct < 80
    );
  });

  if (lowCoverageFiles.length > 0) {
    console.log(`\n⚠️  Files with coverage below 80%:`);
    lowCoverageFiles.forEach(file => {
      const fileCoverage = coverage[file];
      console.log(`  ${file}:`);
      console.log(`    S: ${fileCoverage.statements.pct}% B: ${fileCoverage.branches.pct}% F: ${fileCoverage.functions.pct}% L: ${fileCoverage.lines.pct}%`);
    });
  }

  // Summary
  console.log('\n📈 Coverage Verification Summary:');
  console.log(`  Phase 2 Components Checked: ${PHASE_2_COMPONENTS.length}`);
  console.log(`  Passed: ${results.filter(r => r.status === 'passed').length}`);
  console.log(`  Failed: ${results.filter(r => r.status === 'failed').length}`);
  console.log(`  Missing: ${results.filter(r => r.status === 'missing').length}`);

  if (allPassed) {
    console.log('\n✅ All Phase 2 components meet coverage requirements!');

    // Generate a summary report
    const reportPath = './coverage/phase2-verification.json';
    const report = {
      timestamp: new Date().toISOString(),
      status: 'passed',
      totalCoverage: total,
      components: results,
      thresholds: COMPONENT_THRESHOLDS
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Verification report saved to: ${reportPath}`);

    return true;
  } else {
    console.log('\n❌ Some Phase 2 components do not meet coverage requirements.');
    console.log('Please add tests for the failing components or adjust coverage thresholds.');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  const coveragePath = process.argv[2] || './coverage/coverage-summary.json';
  const success = verifyCoverage(coveragePath);
  process.exit(success ? 0 : 1);
}

module.exports = { verifyCoverage, PHASE_2_COMPONENTS, COMPONENT_THRESHOLDS };