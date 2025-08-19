#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Coverage merger for combining Vitest and Playwright coverage reports
 * 
 * This script merges coverage data from:
 * - Unit tests (Vitest)
 * - Component tests (Vitest)
 * - Integration tests (Vitest) 
 * - E2E tests (Playwright)
 */

interface CoverageData {
	[filePath: string]: {
		path: string;
		statementMap: Record<string, any>;
		fnMap: Record<string, any>;
		branchMap: Record<string, any>;
		s: Record<string, number>;
		f: Record<string, number>;
		b: Record<string, number>;
	};
}

interface CoverageReport {
	[filePath: string]: CoverageData[string];
}

const COVERAGE_DIRS = [
	'coverage/unit',
	'coverage/component', 
	'coverage/integration',
	'coverage/e2e',
	'coverage/playwright', // Playwright coverage output
];

const OUTPUT_DIR = 'coverage/merged';
const JSON_OUTPUT = join(OUTPUT_DIR, 'coverage-final.json');

function mergeCoverageData(reports: CoverageReport[]): CoverageReport {
	const merged: CoverageReport = {};

	for (const report of reports) {
		for (const [filePath, data] of Object.entries(report)) {
			if (!merged[filePath]) {
				// First time seeing this file, clone the data
				merged[filePath] = JSON.parse(JSON.stringify(data));
			} else {
				// Merge statement counters
				for (const [key, count] of Object.entries(data.s)) {
					merged[filePath].s[key] = (merged[filePath].s[key] || 0) + count;
				}

				// Merge function counters
				for (const [key, count] of Object.entries(data.f)) {
					merged[filePath].f[key] = (merged[filePath].f[key] || 0) + count;
				}

				// Merge branch counters
				for (const [key, branchCounts] of Object.entries(data.b)) {
					if (!merged[filePath].b[key]) {
						merged[filePath].b[key] = [...branchCounts];
					} else {
						for (let i = 0; i < branchCounts.length; i++) {
							merged[filePath].b[key][i] = (merged[filePath].b[key][i] || 0) + (branchCounts[i] || 0);
						}
					}
				}
			}
		}
	}

	return merged;
}

function loadCoverageReport(dir: string): CoverageReport | null {
	const coverageFile = join(dir, 'coverage-final.json');
	
	if (!existsSync(coverageFile)) {
		console.log(`No coverage file found at: ${coverageFile}`);
		return null;
	}

	try {
		const content = readFileSync(coverageFile, 'utf-8');
		return JSON.parse(content) as CoverageReport;
	} catch (error) {
		console.error(`Error reading coverage file ${coverageFile}:`, error);
		return null;
	}
}

function generateSummary(merged: CoverageReport) {
	let totalStatements = 0;
	let coveredStatements = 0;
	let totalFunctions = 0;
	let coveredFunctions = 0;
	let totalBranches = 0;
	let coveredBranches = 0;

	for (const data of Object.values(merged)) {
		// Count statements
		for (const count of Object.values(data.s)) {
			totalStatements++;
			if (count > 0) coveredStatements++;
		}

		// Count functions
		for (const count of Object.values(data.f)) {
			totalFunctions++;
			if (count > 0) coveredFunctions++;
		}

		// Count branches
		for (const branchCounts of Object.values(data.b)) {
			if (Array.isArray(branchCounts)) {
				for (const count of branchCounts) {
					totalBranches++;
					if (count > 0) coveredBranches++;
				}
			}
		}
	}

	const stmtPct = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
	const funcPct = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0;
	const branchPct = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;

	console.log('\nMerged Coverage Summary:');
	console.log(`Statements: ${coveredStatements}/${totalStatements} (${stmtPct.toFixed(2)}%)`);
	console.log(`Functions: ${coveredFunctions}/${totalFunctions} (${funcPct.toFixed(2)}%)`);
	console.log(`Branches: ${coveredBranches}/${totalBranches} (${branchPct.toFixed(2)}%)`);
	console.log(`Lines: ${coveredStatements}/${totalStatements} (${stmtPct.toFixed(2)}%)`);
	
	return {
		statements: { total: totalStatements, covered: coveredStatements, pct: stmtPct },
		functions: { total: totalFunctions, covered: coveredFunctions, pct: funcPct },
		branches: { total: totalBranches, covered: coveredBranches, pct: branchPct },
		lines: { total: totalStatements, covered: coveredStatements, pct: stmtPct },
	};
}

function main() {
	console.log('Merging coverage reports...');

	// Load all coverage reports
	const reports: CoverageReport[] = [];
	
	for (const dir of COVERAGE_DIRS) {
		if (existsSync(dir)) {
			console.log(`Loading coverage from: ${dir}`);
			const report = loadCoverageReport(dir);
			if (report) {
				reports.push(report);
			}
		} else {
			console.log(`Coverage directory not found: ${dir}`);
		}
	}

	if (reports.length === 0) {
		console.error('No coverage reports found to merge');
		process.exit(1);
	}

	console.log(`Found ${reports.length} coverage report(s) to merge`);

	// Merge coverage data
	const merged = mergeCoverageData(reports);
	
	// Ensure output directory exists
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Write merged coverage JSON
	writeFileSync(JSON_OUTPUT, JSON.stringify(merged, null, 2));
	console.log(`Merged coverage written to: ${JSON_OUTPUT}`);

	// Generate and display summary
	generateSummary(merged);

	console.log('\nUse the following commands to generate reports:');
	console.log(`npx c8 report --reporter=html --reporter=lcov --reports-dir=${OUTPUT_DIR}`);
	console.log(`npx c8 report --reporter=text-summary --reports-dir=${OUTPUT_DIR}`);
}

if (require.main === module) {
	main();
}