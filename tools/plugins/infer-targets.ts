/**
 * Infer Targets Plugin
 *
 * Automatically infers targets for projects based on declarative rules in nx.json.
 * Targets are added at runtime - no need to define them in project.json.
 *
 * Configuration in nx.json:
 * {
 *   "plugins": [
 *     {
 *       "plugin": "./tools/plugins/infer-targets.ts",
 *       "options": {
 *         "rules": [
 *           { "target": "barrelsby", "when": { "pathExists": "src" } },
 *           { "target": "typecheck", "when": { "pathExists": "tsconfig.json" } },
 *           { "target": "storybook", "when": { "hasTag": "type:ui" } },
 *           { "target": "e2e", "when": { "hasAnyTag": ["type:app", "scope:web"] } }
 *         ]
 *       }
 *     }
 *   ]
 * }
 *
 * Supported conditions:
 * - pathExists: string - File/directory exists in project
 * - pathNotExists: string - File/directory doesn't exist
 * - hasTarget: string - Project has the specified target
 * - notHasTarget: string - Project doesn't have the target
 * - hasTag: string - Project has the specified tag
 * - notHasTag: string - Project doesn't have the tag
 * - hasAnyTag: string[] - Project has any of the tags
 * - hasAllTags: string[] - Project has all of the tags
 */

import {
	CreateNodesContextV2,
	CreateNodesResultV2,
	CreateNodesV2,
	createNodesFromFiles,
	ProjectConfiguration,
} from "@nx/devkit"
import { existsSync, statSync } from "fs"
import { dirname, join } from "path"

// Rule condition types
interface PathExistsCondition {
	pathExists: string
}

interface PathNotExistsCondition {
	pathNotExists: string
}

interface HasTargetCondition {
	hasTarget: string
}

interface NotHasTargetCondition {
	notHasTarget: string
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
	| HasTargetCondition
	| NotHasTargetCondition
	| HasTagCondition
	| NotHasTagCondition
	| HasAnyTagCondition
	| HasAllTagsCondition

interface TargetRule {
	target: string
	when: RuleCondition | RuleCondition[]
	value?: Record<string, unknown>
}

export interface InferTargetsPluginOptions {
	rules?: TargetRule[]
}

// Default rules if none specified
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

interface ProjectContext {
	projectRoot: string
	workspaceRoot: string
	existingTargets: Record<string, unknown>
	tags: string[]
}

function checkCondition(condition: RuleCondition, ctx: ProjectContext): boolean {
	if ("pathExists" in condition) {
		const fullPath = join(ctx.workspaceRoot, ctx.projectRoot, condition.pathExists)
		return existsSync(fullPath)
	}

	if ("pathNotExists" in condition) {
		const fullPath = join(ctx.workspaceRoot, ctx.projectRoot, condition.pathNotExists)
		return !existsSync(fullPath)
	}

	if ("hasTarget" in condition) {
		return condition.hasTarget in ctx.existingTargets
	}

	if ("notHasTarget" in condition) {
		return !(condition.notHasTarget in ctx.existingTargets)
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

function createNodesInternal(
	configFilePath: string,
	options: InferTargetsPluginOptions | undefined,
	context: CreateNodesContextV2
): CreateNodesResultV2[number][1] {
	const projectRoot = dirname(configFilePath)

	// Skip root project
	if (projectRoot === ".") {
		return {}
	}

	// Get rules from options or use defaults
	const rules = options?.rules ?? defaultRules

	// Read existing project.json to check for existing targets and tags
	const projectJsonPath = join(context.workspaceRoot, configFilePath)
	let existingTargets: Record<string, unknown> = {}
	let tags: string[] = []

	try {
		const projectJson = JSON.parse(
			require("fs").readFileSync(projectJsonPath, "utf-8")
		) as ProjectConfiguration
		existingTargets = projectJson.targets ?? {}
		tags = projectJson.tags ?? []
	} catch {
		// No project.json or invalid - continue with empty targets/tags
	}

	// Build project context for condition checking
	const ctx: ProjectContext = {
		projectRoot,
		workspaceRoot: context.workspaceRoot,
		existingTargets,
		tags,
	}

	// Evaluate rules and build targets
	const inferredTargets: Record<string, unknown> = {}

	for (const rule of rules) {
		// Skip if target already exists in project.json (let explicit config take precedence)
		if (rule.target in existingTargets) {
			continue
		}

		// Check if conditions are met
		if (checkAllConditions(rule.when, ctx)) {
			inferredTargets[rule.target] = rule.value ?? {}
		}
	}

	// Only return if we have inferred targets
	if (Object.keys(inferredTargets).length === 0) {
		return {}
	}

	return {
		projects: {
			[projectRoot]: {
				targets: inferredTargets,
			},
		},
	}
}

export const createNodesV2: CreateNodesV2<InferTargetsPluginOptions> = [
	"**/project.json",
	async (configFiles, options, context) => {
		return await createNodesFromFiles(
			(configFile, options, context) => createNodesInternal(configFile, options, context),
			configFiles,
			options,
			context
		)
	},
]
