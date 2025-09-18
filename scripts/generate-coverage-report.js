#!/usr/bin/env node
/**
 * Generate coverage report for GitHub Actions
 * Reads coverage-summary.json and outputs formatted report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THRESHOLDS = {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80,
};

function getStatusIcon(actual, threshold) {
  return actual >= threshold ? '✅' : '❌';
}

function getStatusText(actual, threshold) {
  return actual >= threshold ? 'Pass' : 'Fail';
}

function generateReport(coverageData, format = 'summary') {
  const total = coverageData.total;

  const metrics = [
    { name: 'Lines', key: 'lines', actual: total.lines.pct, threshold: THRESHOLDS.lines },
    { name: 'Functions', key: 'functions', actual: total.functions.pct, threshold: THRESHOLDS.functions },
    { name: 'Branches', key: 'branches', actual: total.branches.pct, threshold: THRESHOLDS.branches },
    { name: 'Statements', key: 'statements', actual: total.statements.pct, threshold: THRESHOLDS.statements },
  ];

  if (format === 'summary') {
    console.log('| Metric | Coverage | Status |');
    console.log('|--------|----------|--------|');

    metrics.forEach(metric => {
      const icon = getStatusIcon(metric.actual, metric.threshold);
      console.log(`| ${metric.name} | ${metric.actual}% | ${icon} |`);
    });
  } else if (format === 'pr-comment') {
    console.log('## Coverage Report\n');
    console.log('| Metric | Coverage | Status |');
    console.log('|--------|----------|--------|');

    metrics.forEach(metric => {
      const status = `${getStatusIcon(metric.actual, metric.threshold)} ${getStatusText(metric.actual, metric.threshold)}`;
      console.log(`| ${metric.name} | ${metric.actual}% | ${status} |`);
    });

    console.log(`\n**Thresholds:** Lines ≥${THRESHOLDS.lines}%, Functions ≥${THRESHOLDS.functions}%, Branches ≥${THRESHOLDS.branches}%, Statements ≥${THRESHOLDS.statements}%`);
  }
}

function main() {
  const format = process.argv[2] || 'summary';
  const coverageFile = process.argv[3] || 'coverage-reports/coverage-summary.json';

  if (!fs.existsSync(coverageFile)) {
    console.error(`Coverage file not found: ${coverageFile}`);
    if (format === 'summary') {
      console.log('| Metric | Coverage | Status |');
      console.log('|--------|----------|--------|');
      console.log('| No coverage data | - | ❌ |');
    } else {
      console.log('## Coverage Report\n\n❌ No coverage data found');
    }
    process.exit(1);
  }

  try {
    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    generateReport(coverageData, format);
  } catch (error) {
    console.error(`Error reading coverage file: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateReport, THRESHOLDS };