import { formatFiles, getProjects, readNxJson, Tree, updateJson } from "@nx/devkit"
import type { SyncGeneratorResult } from "nx/src/utils/sync-generators"
import { existsSync } from "fs"
import { join } from "path"

export interface SyncTargetsGeneratorSchema {
	dryRun?: boolean
}

interface ProjectJson {
	name?: string
	targets?: Record<string, unknown>
	tags?: string[]
	[key: string]: unknown
}

// Rule condition types (same as infer-targets plugin)
interface PathExistsCondition {
	pathExists: string
}

interface PathNotExistsCondition {
	pathNotExists: string
}

interface HasTagCondition {
	hasTag: string
}

interface NotHasTagCondition {
	notHasTag: string
}

interface HasAnyTagCondition {
	hasAnyTag: string[]
}

interface HasAllTagsCondition {
	hasAllTags: string[]
}

type RuleCondition =
	| PathExistsCondition
	| PathNotExistsCondition
	| HasTagCondition
	| NotHasTagCondition
	| HasAnyTagCondition
	| HasAllTagsCondition

interface TargetRule {
	target: string
	when: RuleCondition | RuleCondition[]
	value?: Record<string, unknown>
}

interface InferTargetsPluginOptions {
	rules?: TargetRule[]
}

interface ProjectContext {
	tree: Tree
	projectRoot: string
	tags: string[]
}

// Default rules if none found in nx.json
const defaultRules: TargetRule[] = [
	{
		target: "barrelsby",
		when: { pathExists: "src" },
		value: {},
	},
	{
		target: "typecheck",
		when: { pathExists: "tsconfig.json" },
		value: {},
	},
]

function checkCondition(condition: RuleCondition, ctx: ProjectContext): boolean {
	if ("pathExists" in condition) {
		const fullPath = `${ctx.projectRoot}/${condition.pathExists}`
		return ctx.tree.exists(fullPath)
	}

	if ("pathNotExists" in condition) {
		const fullPath = `${ctx.projectRoot}/${condition.pathNotExists}`
		return !ctx.tree.exists(fullPath)
	}

	if ("hasTag" in condition) {
		return ctx.tags.includes(condition.hasTag)
	}

	if ("notHasTag" in condition) {
		return !ctx.tags.includes(condition.notHasTag)
	}

	if ("hasAnyTag" in condition) {
		return condition.hasAnyTag.some((tag) => ctx.tags.includes(tag))
	}

	if ("hasAllTags" in condition) {
		return condition.hasAllTags.every((tag) => ctx.tags.includes(tag))
	}

	return false
}

function checkAllConditions(conditions: RuleCondition | RuleCondition[], ctx: ProjectContext): boolean {
	const conditionArray = Array.isArray(conditions) ? conditions : [conditions]
	return conditionArray.every((c) => checkCondition(c, ctx))
}

/**
 * Gets the target rules from nx.json plugin configuration
 */
function getRulesFromNxJson(tree: Tree): TargetRule[] {
	const nxJson = readNxJson(tree)

	if (!nxJson?.plugins) {
		return defaultRules
	}

	// Find the infer-targets plugin configuration
	for (const plugin of nxJson.plugins) {
		if (typeof plugin === "object" && plugin !== null) {
			const pluginPath = (plugin as { plugin?: string }).plugin
			if (pluginPath?.includes("infer-targets")) {
				const options = (plugin as { options?: InferTargetsPluginOptions }).options
				if (options?.rules) {
					return options.rules
				}
			}
		}
	}

	return defaultRules
}

/**
 * Sync Targets Generator
 *
 * Automatically adds empty targets to project.json files based on declarative rules.
 * Rules are read from nx.json plugin configuration (same as infer-targets plugin).
 *
 * This generator is useful when you want targets explicitly in project.json
 * (for visibility, IDE support, etc.) rather than just inferred at runtime.
 *
 * Usage:
 * - nx sync (runs automatically as global sync generator)
 * - nx generate @academic-explorer/generators:sync-targets
 */
// eslint-disable-next-line import/no-default-export -- Nx generator convention
export default async function syncTargetsGenerator(
	tree: Tree,
	_options?: SyncTargetsGeneratorSchema
): Promise<SyncGeneratorResult> {
	const projects = getProjects(tree)
	const rules = getRulesFromNxJson(tree)
	const outOfSyncProjects: string[] = []

	for (const [projectName, projectConfig] of projects) {
		const projectJsonPath = `${projectConfig.root}/project.json`

		// Skip if no project.json (might be package.json based)
		if (!tree.exists(projectJsonPath)) {
			continue
		}

		// Skip root project
		if (projectConfig.root === ".") {
			continue
		}

		const projectJson = JSON.parse(tree.read(projectJsonPath, "utf-8")!) as ProjectJson
		const missingTargets: string[] = []

		// Initialize targets if not present
		if (!projectJson.targets) {
			projectJson.targets = {}
		}

		// Build project context for condition checking
		const ctx: ProjectContext = {
			tree,
			projectRoot: projectConfig.root,
			tags: projectJson.tags ?? [],
		}

		// Check each rule
		for (const rule of rules) {
			const hasTarget = rule.target in projectJson.targets

			// Skip if target already exists
			if (hasTarget) {
				continue
			}

			// Check if conditions are met
			if (checkAllConditions(rule.when, ctx)) {
				missingTargets.push(rule.target)
			}
		}

		if (missingTargets.length > 0) {
			outOfSyncProjects.push(`${projectName} (missing: ${missingTargets.join(", ")})`)

			// Update the project.json
			updateJson(tree, projectJsonPath, (json: ProjectJson) => {
				if (!json.targets) {
					json.targets = {}
				}

				// Add missing targets
				for (const targetName of missingTargets) {
					const rule = rules.find((r) => r.target === targetName)
					if (rule) {
						json.targets[targetName] = rule.value ?? {}
					}
				}

				// Reorder targets to put rule-based targets first
				const orderedTargets: Record<string, unknown> = {}
				const priorityOrder = rules.map((r) => r.target)

				// Add priority targets first
				for (const target of priorityOrder) {
					if (target in json.targets) {
						orderedTargets[target] = json.targets[target]
					}
				}

				// Add remaining targets
				for (const [key, value] of Object.entries(json.targets)) {
					if (!priorityOrder.includes(key)) {
						orderedTargets[key] = value
					}
				}

				json.targets = orderedTargets
				return json
			})
		}
	}

	// Format files if changes were made
	if (outOfSyncProjects.length > 0) {
		await formatFiles(tree)
	}

	// Return SyncGeneratorResult
	return {
		outOfSyncMessage:
			outOfSyncProjects.length > 0
				? `The following projects are missing required targets:\n${outOfSyncProjects.map((p) => `  - ${p}`).join("\n")}\n\nRun 'nx sync' to add them automatically.`
				: undefined,
	}
}
