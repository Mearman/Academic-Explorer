#!/usr/bin/env tsx

/**
 * Quality thresholds configuration
 * Central place to manage all quality gate thresholds
 */

interface QualityThresholds {
	code: {
		maxWarnings: number
		maxErrors: number
		maxComplexity: number
	}
	coverage: {
		minLinesCoverage: number
		minFunctionsCoverage: number
		minBranchesCoverage: number
		minStatementsCoverage: number
	}
	performance: {
		maxBuildTimeMs: number
		maxBundleSizeKb: number
		maxLcpScore: number
	}
	security: {
		maxCriticalVulns: number
		maxHighVulns: number
		maxModerateVulns: number
	}
}

export const qualityThresholds: QualityThresholds = {
	code: {
		maxWarnings: 15,
		maxErrors: 0,
		maxComplexity: 10,
	},
	coverage: {
		minLinesCoverage: 70,
		minFunctionsCoverage: 70,
		minBranchesCoverage: 65,
		minStatementsCoverage: 70,
	},
	performance: {
		maxBuildTimeMs: 300000, // 5 minutes
		maxBundleSizeKb: 1024, // 1MB
		maxLcpScore: 2.5, // Largest Contentful Paint
	},
	security: {
		maxCriticalVulns: 0,
		maxHighVulns: 0,
		maxModerateVulns: 5,
	},
}

// Function to validate thresholds
export function validateThresholds(): boolean {
	console.log("🔍 Validating quality thresholds...")

	const issues: string[] = []

	// Validate code thresholds
	if (qualityThresholds.code.maxErrors > 0) {
		issues.push("Code quality should not allow any errors")
	}

	if (qualityThresholds.code.maxWarnings > 50) {
		issues.push("Warning threshold seems too high")
	}

	// Validate coverage thresholds
	if (qualityThresholds.coverage.minLinesCoverage < 60) {
		issues.push("Lines coverage threshold seems too low")
	}

	if (qualityThresholds.coverage.minBranchesCoverage < 50) {
		issues.push("Branches coverage threshold seems too low")
	}

	// Validate performance thresholds
	if (qualityThresholds.performance.maxBuildTimeMs > 600000) {
		issues.push("Build time threshold seems too high (10+ minutes)")
	}

	if (qualityThresholds.performance.maxBundleSizeKb > 2048) {
		issues.push("Bundle size threshold seems too large (2MB+)")
	}

	// Validate security thresholds
	if (qualityThresholds.security.maxCriticalVulns > 0) {
		issues.push("Should not allow any critical vulnerabilities")
	}

	if (qualityThresholds.security.maxHighVulns > 0) {
		issues.push("Should not allow any high severity vulnerabilities")
	}

	if (issues.length > 0) {
		console.log("⚠️ Threshold validation issues found:")
		issues.forEach((issue) => console.log(`   - ${issue}`))
		return false
	}

	console.log("✅ All quality thresholds are valid")
	return true
}

// Function to print current thresholds
export function printThresholds(): void {
	console.log("📊 Current Quality Thresholds:")
	console.log("================================")

	console.log("\n🔧 Code Quality:")
	console.log(`   Max Warnings: ${qualityThresholds.code.maxWarnings}`)
	console.log(`   Max Errors: ${qualityThresholds.code.maxErrors}`)
	console.log(`   Max Complexity: ${qualityThresholds.code.maxComplexity}`)

	console.log("\n🧪 Coverage:")
	console.log(`   Lines Coverage: ${qualityThresholds.coverage.minLinesCoverage}%`)
	console.log(`   Functions Coverage: ${qualityThresholds.coverage.minFunctionsCoverage}%`)
	console.log(`   Branches Coverage: ${qualityThresholds.coverage.minBranchesCoverage}%`)
	console.log(`   Statements Coverage: ${qualityThresholds.coverage.minStatementsCoverage}%`)

	console.log("\n🚀 Performance:")
	console.log(
		`   Max Build Time: ${qualityThresholds.performance.maxBuildTimeMs}ms (${Math.round(qualityThresholds.performance.maxBuildTimeMs / 1000 / 60)} minutes)`
	)
	console.log(`   Max Bundle Size: ${qualityThresholds.performance.maxBundleSizeKb}KB`)
	console.log(`   Max LCP Score: ${qualityThresholds.performance.maxLcpScore}s`)

	console.log("\n🔒 Security:")
	console.log(`   Max Critical Vulnerabilities: ${qualityThresholds.security.maxCriticalVulns}`)
	console.log(`   Max High Vulnerabilities: ${qualityThresholds.security.maxHighVulns}`)
	console.log(`   Max Moderate Vulnerabilities: ${qualityThresholds.security.maxModerateVulns}`)
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
	const command = process.argv[2]

	switch (command) {
		case "validate": {
			const isValid = validateThresholds()
			process.exit(isValid ? 0 : 1)
			// No break needed due to process.exit
		}
		case "print": {
			printThresholds()
			break
		}
		default:
			console.log("Usage:")
			console.log("  tsx tools/scripts/quality-thresholds.ts validate  # Validate thresholds")
			console.log("  tsx tools/scripts/quality-thresholds.ts print     # Print current thresholds")
			process.exit(1)
	}
}
