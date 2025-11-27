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
 *           { "target": "lint", "when": { "not": { "hasTag": "no-lint" } } },
 *           { "target": "e2e", "when": { "or": [{ "hasTag": "type:app" }, { "hasTag": "scope:e2e" }] } }
 *         ]
 *       }
 *     }
 *   ]
 * }
 *
 * Primitive conditions:
 * - pathExists: string - File/directory exists in project
 * - hasTarget: string - Project has the specified target
 * - hasTag: string - Project has the specified tag
 * - hasAnyTag: string[] - Project has any of the tags
 * - hasAllTags: string[] - Project has all of the tags
 *
 * Logical operators (JSON Logic-inspired, recursive):
 * - not: Condition - Negates a condition
 * - and: Condition[] - All conditions must be true
 * - or: Condition[] - At least one condition must be true
 * - xor: Condition[] - Exactly one condition must be true (A ⊕ B)
 *
 * Examples:
 * - { "not": { "pathExists": ".eslintrc.js" } }
 * - { "and": [{ "pathExists": "src" }, { "hasTag": "type:lib" }] }
 * - { "or": [{ "hasTag": "type:app" }, { "hasTag": "type:e2e" }] }
 * - { "xor": [{ "hasTag": "scope:web" }, { "hasTag": "scope:cli" }] }
 */

import {
	CreateNodesContextV2,
	CreateNodesResultV2,
	CreateNodesV2,
	createNodesFromFiles,
	ProjectConfiguration,
} from "@nx/devkit"
import { existsSync } from "fs"
import { dirname, join } from "path"

// ============================================================================
// Condition Types - JSON Logic-inspired syntax
// ============================================================================

// Primitive conditions (base building blocks)
interface PathExistsCondition {
	pathExists: string
}

interface HasTargetCondition {
	hasTarget: string
}

interface HasTagCondition {
	hasTag: string
}

interface HasAnyTagCondition {
	hasAnyTag: string[]
}

interface HasAllTagsCondition {
	hasAllTags: string[]
}

type PrimitiveCondition =
	| PathExistsCondition
	| HasTargetCondition
	| HasTagCondition
	| HasAnyTagCondition
	| HasAllTagsCondition

// Logical operators (recursive)
interface NotCondition {
	not: RuleCondition
}

interface AndCondition {
	and: RuleCondition[]
}

interface OrCondition {
	or: RuleCondition[]
}

// XOR: exactly one condition is true
// A ⊕ B = (A ∨ B) ∧ ¬(A ∧ B)
interface XorCondition {
	xor: RuleCondition[]
}

type LogicalCondition = NotCondition | AndCondition | OrCondition | XorCondition

// Combined type
type RuleCondition = PrimitiveCondition | LogicalCondition

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
	// Logical operators (recursive)
	if ("not" in condition) {
		return !checkCondition(condition.not, ctx)
	}

	if ("and" in condition) {
		return condition.and.every((c) => checkCondition(c, ctx))
	}

	if ("or" in condition) {
		return condition.or.some((c) => checkCondition(c, ctx))
	}

	if ("xor" in condition) {
		// XOR: exactly one condition is true
		// A ⊕ B = (A ∨ B) ∧ ¬(A ∧ B)
		const results = condition.xor.map((c) => checkCondition(c, ctx))
		const trueCount = results.filter(Boolean).length
		return trueCount === 1
	}

	// Primitive conditions
	if ("pathExists" in condition) {
		const fullPath = join(ctx.workspaceRoot, ctx.projectRoot, condition.pathExists)
		return existsSync(fullPath)
	}

	if ("hasTarget" in condition) {
		return condition.hasTarget in ctx.existingTargets
	}

	if ("hasTag" in condition) {
		return ctx.tags.includes(condition.hasTag)
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
