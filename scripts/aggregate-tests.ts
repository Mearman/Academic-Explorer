#!/usr/bin/env node

/**
 * Test result aggregator for Nx + Vitest workspace
 * Aggregates test results from multiple projects into a unified report
 */

import { execSync } from "child_process"
import { readFileSync } from "fs"
import path from "path"

const WORKSPACE_ROOT = path.resolve(__dirname, "..")

function runNxTests() {
	try {
		console.log("🚀 Running tests with Nx...")

		// Run tests with Nx and capture output
		const output = execSync(
			"NX_DAEMON=false nx run-many -t test --output-style=stream -- --reporter=json --reporter=verbose",
			{
				cwd: WORKSPACE_ROOT,
				encoding: "utf8",
				stdio: "pipe",
				timeout: 300000, // 5 minutes
			}
		)

		console.log("✅ All tests completed successfully")
		return output
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error("❌ Test execution failed:", message)
		throw error
	}
}

function aggregateCoverage() {
	try {
		console.log("📊 Aggregating coverage reports...")

		// Check if coverage directories exist and aggregate
		const coverageDirs = [
			"apps/web/coverage",
			"packages/client/coverage",
			"packages/graph/coverage",
			"packages/simulation/coverage",
			"packages/ui/coverage",
			"packages/utils/coverage",
			"apps/cli/coverage",
		]

		const coverageReports = coverageDirs
			.map((dir) => path.join(WORKSPACE_ROOT, dir, "coverage-final.json"))
			.filter((file) => {
				try {
					readFileSync(file)
					return true
				} catch {
					return false
				}
			})

		if (coverageReports.length === 0) {
			console.log("ℹ️  No coverage reports found")
			return
		}

		console.log(`📈 Found ${coverageReports.length} coverage reports to aggregate`)

		// You could use a tool like istanbul-combine or similar here
		// For now, just log the summary
		coverageReports.forEach((report) => {
			console.log(`  ✓ ${path.relative(WORKSPACE_ROOT, report)}`)
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.warn("⚠️  Coverage aggregation failed:", message)
	}
}

function main() {
	try {
		const startTime = Date.now()

		// Option 1: Use Vitest workspace mode (recommended)
		if (process.argv.includes("--workspace")) {
			console.log("🎯 Using Vitest workspace mode for aggregated results")
			execSync("vitest --run --config vite.config.base.ts --reporter=verbose", {
				cwd: WORKSPACE_ROOT,
				stdio: "inherit",
			})
		}
		// Option 2: Use Nx with result aggregation
		else {
			runNxTests()
			aggregateCoverage()
		}

		const duration = ((Date.now() - startTime) / 1000).toFixed(2)
		console.log(`\n🎉 Test execution completed in ${duration}s`)
	} catch (_error) {
		console.error("\n💥 Test execution failed")
		process.exit(1)
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main()
}
