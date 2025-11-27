import { formatFiles, getProjects, readNxJson, Tree, updateJson } from "@nx/devkit"
import type { SyncGeneratorResult } from "nx/src/utils/sync-generators"

export interface SyncTargetsGeneratorSchema {
	dryRun?: boolean
}

interface ProjectJson {
	name?: string
	targets?: Record<string, unknown>
	tags?: string[]
	[key: string]: unknown
}

// ============================================================================
// JSON Logic Types (same as infer-targets plugin)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonLogicValue = any
type JsonLogicRule = JsonLogicValue | { [operator: string]: JsonLogicValue }

interface TargetRule {
	target: string
	when: JsonLogicRule | JsonLogicRule[]
	value?: Record<string, unknown>
}

interface InferTargetsPluginOptions {
	rules?: TargetRule[]
}

// Data context for JSON Logic evaluation
interface DataContext {
	tags: string[]
	targets: string[]
	root: string
	name: string
	"": JsonLogicValue
}

interface FsContext {
	tree: Tree
	projectRoot: string
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

// ============================================================================
// JSON Logic Evaluator
// ============================================================================

function getVar(data: DataContext, path: JsonLogicValue): JsonLogicValue {
	if (path === "" || path === null || path === undefined) {
		return data[""]
	}
	if (typeof path === "number") {
		const arr = data[""]
		return Array.isArray(arr) ? arr[path] : undefined
	}
	if (typeof path !== "string") {
		return undefined
	}

	const parts = path.split(".")
	let current: JsonLogicValue = data
	for (const part of parts) {
		if (current === null || current === undefined) {
			return undefined
		}
		current = current[part]
	}
	return current
}

function evaluate(rule: JsonLogicRule, data: DataContext, fsContext: FsContext): JsonLogicValue {
	if (rule === null || rule === undefined) {
		return rule
	}
	if (typeof rule !== "object") {
		return rule
	}
	if (Array.isArray(rule)) {
		return rule.map((r) => evaluate(r, data, fsContext))
	}

	const operators = Object.keys(rule)
	if (operators.length !== 1) {
		return rule
	}

	const op = operators[0]
	const args = rule[op]

	const evalArg = (arg: JsonLogicValue): JsonLogicValue => evaluate(arg, data, fsContext)
	const evalArgs = (): JsonLogicValue[] =>
		Array.isArray(args) ? args.map(evalArg) : [evalArg(args)]

	switch (op) {
		// ========== Data Access ==========
		case "var": {
			const path = evalArg(args)
			return getVar(data, path)
		}

		case "missing": {
			const keys = Array.isArray(args) ? args : [args]
			return keys.filter((key) => {
				const val = getVar(data, evalArg(key))
				return val === null || val === undefined || val === ""
			})
		}

		case "missing_some": {
			const [minRequired, keys] = Array.isArray(args) ? args : [1, [args]]
			const evalKeys = Array.isArray(keys) ? keys : [keys]
			const missing = evalKeys.filter((key) => {
				const val = getVar(data, evalArg(key))
				return val === null || val === undefined || val === ""
			})
			const present = evalKeys.length - missing.length
			return present >= minRequired ? [] : missing
		}

		// ========== Logical Operators ==========
		case "and": {
			const conditions = Array.isArray(args) ? args : [args]
			let result: JsonLogicValue = true
			for (const cond of conditions) {
				result = evalArg(cond)
				if (!result) return result
			}
			return result
		}

		case "or": {
			const conditions = Array.isArray(args) ? args : [args]
			let result: JsonLogicValue = false
			for (const cond of conditions) {
				result = evalArg(cond)
				if (result) return result
			}
			return result
		}

		case "!":
		case "not": {
			const val = Array.isArray(args) ? evalArg(args[0]) : evalArg(args)
			return !val
		}

		case "!!": {
			const val = Array.isArray(args) ? evalArg(args[0]) : evalArg(args)
			return !!val
		}

		case "if": {
			const conditions = Array.isArray(args) ? args : [args]
			for (let i = 0; i < conditions.length - 1; i += 2) {
				if (evalArg(conditions[i])) {
					return evalArg(conditions[i + 1])
				}
			}
			if (conditions.length % 2 === 1) {
				return evalArg(conditions[conditions.length - 1])
			}
			return null
		}

		// ========== Comparison Operators ==========
		case "==": {
			const [a, b] = evalArgs()
			// eslint-disable-next-line eqeqeq
			return a == b
		}

		case "===": {
			const [a, b] = evalArgs()
			return a === b
		}

		case "!=": {
			const [a, b] = evalArgs()
			// eslint-disable-next-line eqeqeq
			return a != b
		}

		case "!==": {
			const [a, b] = evalArgs()
			return a !== b
		}

		case "<": {
			const vals = evalArgs()
			if (vals.length === 2) return vals[0] < vals[1]
			if (vals.length === 3) return vals[0] < vals[1] && vals[1] < vals[2]
			return false
		}

		case "<=": {
			const vals = evalArgs()
			if (vals.length === 2) return vals[0] <= vals[1]
			if (vals.length === 3) return vals[0] <= vals[1] && vals[1] <= vals[2]
			return false
		}

		case ">": {
			const vals = evalArgs()
			if (vals.length === 2) return vals[0] > vals[1]
			if (vals.length === 3) return vals[0] > vals[1] && vals[1] > vals[2]
			return false
		}

		case ">=": {
			const vals = evalArgs()
			if (vals.length === 2) return vals[0] >= vals[1]
			if (vals.length === 3) return vals[0] >= vals[1] && vals[1] >= vals[2]
			return false
		}

		// ========== Numeric Operators ==========
		case "max": {
			const vals = evalArgs()
			return Math.max(...vals.map(Number))
		}

		case "min": {
			const vals = evalArgs()
			return Math.min(...vals.map(Number))
		}

		case "+": {
			const vals = evalArgs()
			if (vals.length === 1) return Number(vals[0])
			return vals.reduce((sum, v) => sum + Number(v), 0)
		}

		case "-": {
			const vals = evalArgs()
			if (vals.length === 1) return -Number(vals[0])
			return Number(vals[0]) - Number(vals[1])
		}

		case "*": {
			const vals = evalArgs()
			return vals.reduce((prod, v) => prod * Number(v), 1)
		}

		case "/": {
			const [a, b] = evalArgs()
			return Number(a) / Number(b)
		}

		case "%": {
			const [a, b] = evalArgs()
			return Number(a) % Number(b)
		}

		// ========== Array/String Operators ==========
		case "in": {
			const [needle, haystack] = evalArgs()
			if (Array.isArray(haystack)) return haystack.includes(needle)
			if (typeof haystack === "string") return haystack.includes(String(needle))
			return false
		}

		case "some": {
			const [arr, condition] = Array.isArray(args) ? args : [args, true]
			const evalArr = evalArg(arr)
			if (!Array.isArray(evalArr)) return false
			return evalArr.some((item) => {
				const itemData = { ...data, "": item }
				return !!evaluate(condition, itemData, fsContext)
			})
		}

		case "all": {
			const [arr, condition] = Array.isArray(args) ? args : [args, true]
			const evalArr = evalArg(arr)
			if (!Array.isArray(evalArr)) return false
			if (evalArr.length === 0) return false
			return evalArr.every((item) => {
				const itemData = { ...data, "": item }
				return !!evaluate(condition, itemData, fsContext)
			})
		}

		case "none": {
			const [arr, condition] = Array.isArray(args) ? args : [args, true]
			const evalArr = evalArg(arr)
			if (!Array.isArray(evalArr)) return true
			return !evalArr.some((item) => {
				const itemData = { ...data, "": item }
				return !!evaluate(condition, itemData, fsContext)
			})
		}

		case "map": {
			const [arr, mapper] = Array.isArray(args) ? args : [args, { var: "" }]
			const evalArr = evalArg(arr)
			if (!Array.isArray(evalArr)) return []
			return evalArr.map((item) => {
				const itemData = { ...data, "": item }
				return evaluate(mapper, itemData, fsContext)
			})
		}

		case "filter": {
			const [arr, condition] = Array.isArray(args) ? args : [args, true]
			const evalArr = evalArg(arr)
			if (!Array.isArray(evalArr)) return []
			return evalArr.filter((item) => {
				const itemData = { ...data, "": item }
				return !!evaluate(condition, itemData, fsContext)
			})
		}

		case "reduce": {
			const [arr, reducer, initial] = Array.isArray(args) ? args : [args, { var: "current" }, 0]
			const evalArr = evalArg(arr)
			const evalInitial = evalArg(initial)
			if (!Array.isArray(evalArr)) return evalInitial
			return evalArr.reduce((acc, item) => {
				const itemData = { ...data, "": item, current: acc, accumulator: acc }
				return evaluate(reducer, itemData, fsContext)
			}, evalInitial)
		}

		case "merge": {
			const vals = evalArgs()
			return vals.flat()
		}

		// ========== String Operators ==========
		case "cat": {
			const vals = evalArgs()
			return vals.map(String).join("")
		}

		case "substr": {
			const vals = evalArgs()
			const str = String(vals[0])
			const start = Number(vals[1])
			const length = vals.length > 2 ? Number(vals[2]) : undefined
			const actualStart = start < 0 ? Math.max(0, str.length + start) : start
			if (length === undefined) return str.substring(actualStart)
			if (length < 0) return str.substring(actualStart, str.length + length)
			return str.substring(actualStart, actualStart + length)
		}

		// ========== Miscellaneous ==========
		case "log": {
			const val = evalArg(Array.isArray(args) ? args[0] : args)
			console.log("JsonLogic log:", val)
			return val
		}

		// ========== Extensions ==========
		case "xor": {
			const conditions = Array.isArray(args) ? args : [args]
			const results = conditions.map((c) => !!evalArg(c))
			const trueCount = results.filter(Boolean).length
			return trueCount === 1
		}

		case "pathExists": {
			const path = evalArg(args)
			const fullPath = `${fsContext.projectRoot}/${path}`
			return fsContext.tree.exists(fullPath)
		}

		// ========== Convenience Shortcuts ==========
		case "hasTag": {
			const tag = evalArg(args)
			return data.tags.includes(String(tag))
		}

		case "hasTarget": {
			const target = evalArg(args)
			return data.targets.includes(String(target))
		}

		case "hasAnyTag": {
			const tags = evalArg(args)
			if (!Array.isArray(tags)) return false
			return tags.some((tag) => data.tags.includes(String(tag)))
		}

		case "hasAllTags": {
			const tags = evalArg(args)
			if (!Array.isArray(tags)) return false
			return tags.every((tag) => data.tags.includes(String(tag)))
		}

		default:
			return rule
	}
}

function checkCondition(rule: JsonLogicRule, data: DataContext, fsContext: FsContext): boolean {
	return !!evaluate(rule, data, fsContext)
}

function checkAllConditions(
	conditions: JsonLogicRule | JsonLogicRule[],
	data: DataContext,
	fsContext: FsContext
): boolean {
	const conditionArray = Array.isArray(conditions) ? conditions : [conditions]
	return conditionArray.every((c) => checkCondition(c, data, fsContext))
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
 * Uses JSON Logic (jsonlogic.com) compliant syntax for conditions.
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
	tree: Tree
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

		const content = tree.read(projectJsonPath, "utf-8")
		if (!content) {
			continue
		}
		const projectJson = JSON.parse(content) as ProjectJson
		const missingTargets: string[] = []

		// Initialize targets if not present
		if (!projectJson.targets) {
			projectJson.targets = {}
		}

		// Build data context for JSON Logic evaluation
		const data: DataContext = {
			tags: projectJson.tags ?? [],
			targets: Object.keys(projectJson.targets),
			root: projectConfig.root,
			name: projectJson.name ?? projectName,
			"": undefined,
		}

		const fsContext: FsContext = {
			tree,
			projectRoot: projectConfig.root,
		}

		// Check each rule
		for (const rule of rules) {
			const hasTarget = rule.target in projectJson.targets

			// Skip if target already exists
			if (hasTarget) {
				continue
			}

			// Check if conditions are met
			if (checkAllConditions(rule.when, data, fsContext)) {
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
