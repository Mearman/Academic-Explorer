/**
 * Route Coverage Calculator
 *
 * Analyzes E2E test coverage across all application routes.
 * Compares defined routes against test files to calculate coverage percentage.
 *
 * @module coverage/calculate-route-coverage
 * @see spec-020 Phase 7: T085-T089 Coverage Reporting
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * All application routes defined in the TanStack Router
 */
const ROUTE_MANIFEST = {
	// Entity Index Routes (12 types)
	entityIndex: [
		{ route: '/works', pattern: /works|work-type|incoming-/ },
		{ route: '/authors', pattern: /author|incoming-authorships/ },
		{ route: '/institutions', pattern: /institution|incoming-affiliations/ },
		{ route: '/sources', pattern: /source|incoming-publications/ },
		{ route: '/topics', pattern: /topic/ },
		{ route: '/funders', pattern: /funder|incoming-funding/ },
		{ route: '/publishers', pattern: /publisher/ },
		{ route: '/concepts', pattern: /concept/ },
		{ route: '/keywords', pattern: /keyword/ },
		{ route: '/domains', pattern: /domains\.e2e/ },
		{ route: '/fields', pattern: /fields\.e2e/ },
		{ route: '/subfields', pattern: /subfields\.e2e/ },
	],

	// Entity Detail Routes (12 types)
	entityDetail: [
		{ route: '/works/:id', pattern: /works|graph-interaction|work-type/ },
		{ route: '/authors/:id', pattern: /author-verification|author-routes/ },
		{ route: '/institutions/:id', pattern: /institution|ror/ },
		{ route: '/sources/:id', pattern: /source|issn/ },
		{ route: '/topics/:id', pattern: /topic/ },
		{ route: '/funders/:id', pattern: /funder/ },
		{ route: '/publishers/:id', pattern: /publisher/ },
		{ route: '/concepts/:id', pattern: /concept/ },
		{ route: '/keywords/:id', pattern: /keyword/ },
		{ route: '/domains/:id', pattern: /domains\.e2e/ },
		{ route: '/fields/:id', pattern: /fields\.e2e/ },
		{ route: '/subfields/:id', pattern: /subfields\.e2e/ },
	],

	// Utility Routes
	utility: [
		{ route: '/', pattern: /homepage|index\.e2e/ },
		{ route: '/browse', pattern: /browse/ },
		{ route: '/search', pattern: /search/ },
		{ route: '/explore', pattern: /explore/ },
		{ route: '/settings', pattern: /settings/ },
		{ route: '/about', pattern: /about/ },
		{ route: '/cache', pattern: /cache/ },
		{ route: '/history', pattern: /history/ },
		{ route: '/bookmarks', pattern: /bookmark/ },
		{ route: '/catalogue', pattern: /catalogue|catalog/ },
		{ route: '/autocomplete', pattern: /autocomplete/ },
	],

	// Special Routes
	special: [
		{ route: '/openalex-url/*', pattern: /openalex-url|url-routing/ },
		{ route: '/doi/:doi', pattern: /doi/ },
		{ route: '/orcid/:orcid', pattern: /orcid/ },
		{ route: '/ror/:ror', pattern: /ror/ },
		{ route: '/issn/:issn', pattern: /issn/ },
		{ route: '/https/*', pattern: /https|url-redirect/ },
		{ route: '/:externalId', pattern: /external.*id|external-canonical/ },
	],

	// Error Routes
	error: [
		{ route: '/error-test', pattern: /error-test/ },
		{ route: '404', pattern: /error-404/ },
		{ route: '500', pattern: /error-500/ },
		{ route: 'network-error', pattern: /error-network/ },
		{ route: 'timeout', pattern: /error-timeout/ },
	],
} as const;

type RouteCategory = keyof typeof ROUTE_MANIFEST;

interface CoverageResult {
	category: string;
	route: string;
	covered: boolean;
	testFiles: string[];
}

interface CoverageSummary {
	totalRoutes: number;
	coveredRoutes: number;
	coveragePercentage: number;
	byCategory: Record<string, { total: number; covered: number; percentage: number }>;
	results: CoverageResult[];
}

/**
 * Find all E2E test files in the project
 */
function findTestFiles(baseDir: string): string[] {
	const testFiles: string[] = [];
	const e2eDir = path.join(baseDir, 'apps/web/e2e');
	const srcE2eDir = path.join(baseDir, 'apps/web/src/test/e2e');

	const findFiles = (dir: string) => {
		if (!fs.existsSync(dir)) return;
		const files = fs.readdirSync(dir, { withFileTypes: true });
		for (const file of files) {
			const filePath = path.join(dir, file.name);
			if (file.isDirectory()) {
				findFiles(filePath);
			} else if (file.name.endsWith('.e2e.test.ts')) {
				testFiles.push(filePath);
			}
		}
	};

	findFiles(e2eDir);
	findFiles(srcE2eDir);

	return testFiles;
}

/**
 * Check if a route is covered by any test file
 */
function isRouteCovered(
	route: { route: string; pattern: RegExp },
	testFiles: string[]
): { covered: boolean; matchingFiles: string[] } {
	const matchingFiles = testFiles.filter((file) => {
		const fileName = path.basename(file).toLowerCase();
		const content = fs.readFileSync(file, 'utf-8').toLowerCase();
		return route.pattern.test(fileName) || route.pattern.test(content);
	});

	return {
		covered: matchingFiles.length > 0,
		matchingFiles: matchingFiles.map((f) => path.relative(process.cwd(), f)),
	};
}

/**
 * Calculate route coverage
 */
function calculateCoverage(baseDir: string): CoverageSummary {
	const testFiles = findTestFiles(baseDir);
	const results: CoverageResult[] = [];
	const byCategory: CoverageSummary['byCategory'] = {};

	let totalRoutes = 0;
	let coveredRoutes = 0;

	for (const [category, routes] of Object.entries(ROUTE_MANIFEST)) {
		let categoryTotal = 0;
		let categoryCovered = 0;

		for (const route of routes) {
			const { covered, matchingFiles } = isRouteCovered(route, testFiles);

			results.push({
				category,
				route: route.route,
				covered,
				testFiles: matchingFiles,
			});

			totalRoutes++;
			categoryTotal++;

			if (covered) {
				coveredRoutes++;
				categoryCovered++;
			}
		}

		byCategory[category] = {
			total: categoryTotal,
			covered: categoryCovered,
			percentage: Math.round((categoryCovered / categoryTotal) * 100),
		};
	}

	return {
		totalRoutes,
		coveredRoutes,
		coveragePercentage: Math.round((coveredRoutes / totalRoutes) * 100),
		byCategory,
		results,
	};
}

/**
 * Generate markdown report
 */
function generateReport(coverage: CoverageSummary): string {
	let report = `# Route Coverage Report

**Generated**: ${new Date().toISOString()}
**Total Routes**: ${coverage.totalRoutes}
**Covered Routes**: ${coverage.coveredRoutes}
**Coverage**: ${coverage.coveragePercentage}%

## Summary by Category

| Category | Total | Covered | Coverage |
|----------|-------|---------|----------|
`;

	for (const [category, stats] of Object.entries(coverage.byCategory)) {
		const emoji = stats.percentage === 100 ? '✅' : stats.percentage >= 80 ? '🟡' : '🔴';
		report += `| ${category} | ${stats.total} | ${stats.covered} | ${emoji} ${stats.percentage}% |\n`;
	}

	report += `\n## Detailed Coverage\n\n`;

	let currentCategory = '';
	for (const result of coverage.results) {
		if (result.category !== currentCategory) {
			currentCategory = result.category;
			report += `\n### ${currentCategory}\n\n`;
		}

		const status = result.covered ? '✅' : '❌';
		report += `- ${status} \`${result.route}\``;

		if (result.covered && result.testFiles.length > 0) {
			report += ` (${result.testFiles.length} test${result.testFiles.length > 1 ? 's' : ''})`;
		}

		report += '\n';
	}

	report += `\n## Uncovered Routes\n\n`;

	const uncovered = coverage.results.filter((r) => !r.covered);
	if (uncovered.length === 0) {
		report += 'All routes are covered! 🎉\n';
	} else {
		for (const result of uncovered) {
			report += `- \`${result.route}\` (${result.category})\n`;
		}
	}

	return report;
}

// Main execution
function main() {
	// Decode URL-encoded path (handles spaces in directory names)
	const scriptDir = decodeURIComponent(path.dirname(new URL(import.meta.url).pathname));
	const baseDir = path.resolve(scriptDir, '../../..');
	const coverage = calculateCoverage(baseDir);
	const report = generateReport(coverage);

	console.log(report);

	// Save report to file
	const reportPath = path.join(scriptDir, 'route-coverage-report.md');
	fs.writeFileSync(reportPath, report);
	console.log(`\nReport saved to: ${reportPath}`);
}

// Run main when executed directly
main();

export { calculateCoverage, generateReport, ROUTE_MANIFEST };
export type { CoverageResult, CoverageSummary };
