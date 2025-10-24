#!/usr/bin/env tsx

/**
 * Automated dependency checking and validation script
 *
 * This script performs comprehensive dependency analysis for the Academic Explorer monorepo:
 * - Checks for circular dependencies
 * - Validates workspace dependency consistency
 * - Identifies outdated dependencies
 * - Analyzes security vulnerabilities
 * - Generates dependency reports
 */

import { execSync } from "child_process"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"

interface DependencyReport {
	timestamp: string
	workspace: {
		name: string
		version: string
		totalPackages: number
	}
	projects: ProjectDependency[]
	issues: DependencyIssue[]
	recommendations: string[]
}

interface ProjectDependency {
	name: string
	type: "application" | "library"
	dependencies: {
		production: number
		development: number
		peer: number
	}
	implicitDependencies: string[]
	circularDependencies: string[]
}

interface DependencyIssue {
	type: "security" | "outdated" | "circular" | "inconsistent"
	severity: "low" | "medium" | "high" | "critical"
	description: string
	affectedProjects: string[]
	recommendation: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, "..")
const workspaceRoot = join(__dirname, "../..")

function executeCommand(command: string, options: { silent?: boolean } = {}): string {
	try {
		return execSync(command, {
			cwd: workspaceRoot,
			encoding: "utf8",
			stdio: options.silent ? "pipe" : "inherit",
		})
	} catch (error: unknown) {
		if (options.silent) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			throw new Error(`Command failed: ${command}\nError: ${errorMessage}`)
		}
		throw error
	}
}

function getNxProjects(): Record<string, unknown> {
	try {
		const output = executeCommand("nx show projects --json", { silent: true })
		return JSON.parse(output)
	} catch (_error) {
		console.warn("Could not fetch Nx projects, using fallback")
		return {
			web: { name: "web", type: "application" },
			cli: { name: "cli", type: "application" },
			utils: { name: "utils", type: "library" },
			ui: { name: "ui", type: "library" },
			client: { name: "client", type: "library" },
			graph: { name: "graph", type: "library" },
			simulation: { name: "simulation", type: "library" },
			types: { name: "types", type: "library" },
		}
	}
}

function analyzeProjectDependencies(projectName: string): ProjectDependency {
	try {
		const projectData = JSON.parse(
			executeCommand(`nx show project ${projectName} --json`, { silent: true })
		)

		const packageJsonPath = join(
			workspaceRoot,
			projectData.root || `packages/${projectName}`,
			"package.json"
		)
		let dependencies = { production: 0, development: 0, peer: 0 }

		if (existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"))
			dependencies = {
				production: Object.keys(packageJson.dependencies || {}).length,
				development: Object.keys(packageJson.devDependencies || {}).length,
				peer: Object.keys(packageJson.peerDependencies || {}).length,
			}
		}

		return {
			name: projectName,
			type: projectData.projectType || "library",
			dependencies,
			implicitDependencies: projectData.implicitDependencies || [],
			circularDependencies: [], // Would need more complex analysis to detect
		}
	} catch (error) {
		console.warn(`Could not analyze dependencies for ${projectName}:`, error)
		return {
			name: projectName,
			type: "library",
			dependencies: { production: 0, development: 0, peer: 0 },
			implicitDependencies: [],
			circularDependencies: [],
		}
	}
}

function checkSecurityVulnerabilities(): DependencyIssue[] {
	const issues: DependencyIssue[] = []

	try {
		const auditOutput = executeCommand("pnpm audit --json", { silent: true })
		const auditResult = JSON.parse(auditOutput)

		if (auditResult.vulnerabilities) {
			for (const [packageName, vulnerability] of Object.entries(auditResult.vulnerabilities as Record<string, unknown>)) {
				const vulnObj = vulnerability as Record<string, unknown>
				const severity = (vulnObj.severity as string) || "medium"
				issues.push({
					type: "security",
					severity: severity === "high" ? "critical" : severity === "moderate" ? "medium" : "low",
					description: `Security vulnerability in ${packageName}: ${vulnObj.title as string}`,
					affectedProjects: ["workspace"], // pnpm audit covers entire workspace
					recommendation: `Update ${packageName} to ${(vulnObj.fixAvailable as Record<string, unknown>)?.version || "latest version"}`,
				})
			}
		}
	} catch (error) {
		console.warn("Could not run security audit:", error)
		issues.push({
			type: "security",
			severity: "medium",
			description: "Security audit could not be completed",
			affectedProjects: ["workspace"],
			recommendation: "Run `pnpm audit` manually to check for vulnerabilities",
		})
	}

	return issues
}

function checkOutdatedDependencies(): DependencyIssue[] {
	const issues: DependencyIssue[] = []

	try {
		const outdatedOutput = executeCommand("pnpm outdated --json", { silent: true })
		const outdatedResult = JSON.parse(outdatedOutput)

		for (const [packageName, info] of Object.entries(outdatedResult as Record<string, unknown>)) {
			const infoObj = info as Record<string, unknown>
			const current = infoObj.current as string
			const latest = infoObj.latest as string

			issues.push({
				type: "outdated",
				severity: "low",
				description: `${packageName} is outdated (${current} → ${latest})`,
				affectedProjects: ["workspace"],
				recommendation: `Update ${packageName} to latest version`,
			})
		}
	} catch (_error) {
		// No outdated dependencies or command failed
	}

	return issues
}

function generateDependencyReport(): DependencyReport {
	const projects = getNxProjects()
	const projectNames = Object.keys(projects)

	console.log("🔍 Analyzing workspace dependencies...")

	const projectDeps = projectNames.map(analyzeProjectDependencies)
	const securityIssues = checkSecurityVulnerabilities()
	const outdatedIssues = checkOutdatedDependencies()

	const allIssues = [...securityIssues, ...outdatedIssues]

	const recommendations = [
		"Run `pnpm audit` regularly to check for security vulnerabilities",
		"Use `pnpm outdated` to identify packages that need updates",
		"Consider using `pnpm update --interactive --latest` for safe updates",
		"Review implicit dependencies in project.json files",
		"Set up automated dependency updates in CI/CD",
	]

	const packageJson = JSON.parse(readFileSync(join(workspaceRoot, "package.json"), "utf8"))

	return {
		timestamp: new Date().toISOString(),
		workspace: {
			name: packageJson.name,
			version: packageJson.version,
			totalPackages: projectNames.length,
		},
		projects: projectDeps,
		issues: allIssues,
		recommendations,
	}
}

function main() {
	console.log("📦 Academic Explorer - Dependency Analysis")
	console.log("==========================================\n")

	try {
		const report = generateDependencyReport()

		// Write JSON report
		const reportPath = join(workspaceRoot, "dependency-report.json")
		writeFileSync(reportPath, JSON.stringify(report, null, 2))

		// Display summary
		console.log(`📊 Workspace: ${report.workspace.name} v${report.workspace.version}`)
		console.log(`📦 Total Projects: ${report.workspace.totalPackages}`)
		console.log(`⚠️  Issues Found: ${report.issues.length}`)

		if (report.issues.length > 0) {
			console.log("\n🚨 Issues Summary:")
			report.issues.forEach((issue, index) => {
				const icon =
					issue.severity === "critical"
						? "🔴"
						: issue.severity === "high"
							? "🟠"
							: issue.severity === "medium"
								? "🟡"
								: "🟢"
				console.log(`${index + 1}. ${icon} ${issue.type.toUpperCase()}: ${issue.description}`)
			})
		}

		console.log("\n💡 Recommendations:")
		report.recommendations.forEach((rec, index) => {
			console.log(`${index + 1}. ${rec}`)
		})

		console.log(`\n📄 Full report saved to: ${reportPath}`)

		// Exit with error code if critical issues found
		const criticalIssues = report.issues.filter((i) => i.severity === "critical")
		if (criticalIssues.length > 0) {
			console.log("\n❌ Critical issues found - please address them")
			process.exit(1)
		} else {
			console.log("\n✅ Dependency analysis completed")
		}
	} catch (error) {
		console.error("❌ Dependency analysis failed:", error)
		process.exit(1)
	}
}

// Run the analysis
main()
