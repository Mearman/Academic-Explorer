#!/usr/bin/env tsx
/**
 * CLI wrapper for sync-targets generator
 *
 * Automatically adds empty targets to project.json files based on file patterns.
 * This ensures all projects have consistent targets that inherit from targetDefaults.
 *
 * Usage:
 *   pnpm tsx tools/generators/sync-targets/cli.ts [--dry-run]
 *   pnpm sync:targets [--dry-run]
 *
 * Targets added based on patterns:
 *   - barrelsby: {} - Projects with src/ directory
 *   - typecheck: {} - Projects with tsconfig.json (unless custom config exists)
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

interface ProjectJson {
	name?: string
	targets?: Record<string, unknown>
	[key: string]: unknown
}

interface TargetRule {
	name: string
	check: (projectPath: string, projectJson: ProjectJson) => boolean
	defaultValue: Record<string, unknown>
}

// Define target rules
const targetRules: TargetRule[] = [
	{
		name: "barrelsby",
		check: (projectPath: string) => {
			const srcDir = join(projectPath, "src")
			return existsSync(srcDir) && statSync(srcDir).isDirectory()
		},
		defaultValue: {},
	},
	{
		name: "typecheck",
		check: (projectPath: string, projectJson: ProjectJson) => {
			// Only add if there's a tsconfig.json and no custom typecheck config
			const hasTsconfig = existsSync(join(projectPath, "tsconfig.json"))
			const hasCustomTypecheck =
				projectJson.targets?.typecheck &&
				typeof projectJson.targets.typecheck === "object" &&
				Object.keys(projectJson.targets.typecheck as object).length > 0
			return hasTsconfig && !hasCustomTypecheck
		},
		defaultValue: {},
	},
]

// Get workspace root
const currentFileUrl = import.meta.url
const currentFilePath = fileURLToPath(currentFileUrl)
const workspaceRoot = join(dirname(currentFilePath), "../../..")

// Find all project.json files in apps/ and packages/
function findProjectJsonFiles(): string[] {
	const projectFiles: string[] = []

	for (const dir of ["apps", "packages"]) {
		const dirPath = join(workspaceRoot, dir)
		if (!existsSync(dirPath)) continue

		for (const projectDir of readdirSync(dirPath)) {
			const projectJsonPath = join(dirPath, projectDir, "project.json")
			if (existsSync(projectJsonPath)) {
				projectFiles.push(projectJsonPath)
			}
		}
	}

	return projectFiles
}

// Main sync function
function syncProjectTargets(dryRun: boolean): void {
	const projectFiles = findProjectJsonFiles()
	let modifiedCount = 0

	console.log(`Found ${projectFiles.length} project.json files`)
	console.log("")

	for (const projectJsonPath of projectFiles) {
		const projectPath = join(projectJsonPath, "..")
		const projectJson: ProjectJson = JSON.parse(readFileSync(projectJsonPath, "utf-8"))
		const projectName = projectJson.name || projectPath

		let modified = false
		const addedTargets: string[] = []

		// Initialize targets if not present
		if (!projectJson.targets) {
			projectJson.targets = {}
		}

		// Check each rule
		for (const rule of targetRules) {
			const shouldHaveTarget = rule.check(projectPath, projectJson)
			const hasTarget = rule.name in projectJson.targets

			if (shouldHaveTarget && !hasTarget) {
				projectJson.targets[rule.name] = rule.defaultValue
				addedTargets.push(rule.name)
				modified = true
			}
		}

		if (modified) {
			modifiedCount++
			console.log(`${dryRun ? "[DRY RUN] " : ""}${projectName}:`)
			console.log(`  Added targets: ${addedTargets.join(", ")}`)

			if (!dryRun) {
				// Reorder targets to put barrelsby and typecheck first
				const orderedTargets: Record<string, unknown> = {}
				const priorityOrder = ["barrelsby", "typecheck"]

				// Add priority targets first
				for (const target of priorityOrder) {
					if (target in projectJson.targets) {
						orderedTargets[target] = projectJson.targets[target]
					}
				}

				// Add remaining targets
				for (const [key, value] of Object.entries(projectJson.targets)) {
					if (!priorityOrder.includes(key)) {
						orderedTargets[key] = value
					}
				}

				projectJson.targets = orderedTargets

				writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2) + "\n")
			}
		}
	}

	console.log("")
	console.log(`${dryRun ? "[DRY RUN] Would modify" : "Modified"} ${modifiedCount} project(s)`)
}

// Run the CLI
const dryRun = process.argv.includes("--dry-run")

if (dryRun) {
	console.log("Running in dry-run mode (no changes will be made)")
	console.log("")
}

syncProjectTargets(dryRun)
