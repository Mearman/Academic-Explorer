/**
 * Infer Targets Plugin
 *
 * Automatically infers targets for projects based on declarative rules in nx.json.
 * Uses JSON Logic (jsonlogic.com) fully compliant syntax for conditions.
 *
 * Data context available via `var`:
 * - tags: string[] - Project tags
 * - targets: string[] - Existing target names
 * - root: string - Project root path
 * - name: string - Project name
 *
 * Configuration in nx.json:
 * {
 *   "plugins": [
 *     {
 *       "plugin": "./tools/plugins/infer-targets.ts",
 *       "options": {
 *         "rules": [
 *           { "target": "barrelsby", "when": { "pathExists": "src" } },
 *           { "target": "typecheck", "when": { "in": ["type:lib", { "var": "tags" }] } },
 *           { "target": "e2e", "when": { "some": [{ "var": "tags" }, { "in": [{ "var": "" }, ["type:app", "type:e2e"]] }] } }
 *         ]
 *       }
 *     }
 *   ]
 * }
 *
 * JSON Logic operators (jsonlogic.com fully compliant):
 *
 * Data Access:
 * - var: Access data ({ "var": "tags" }, { "var": "" } for iteration context)
 * - missing: Returns array of missing keys ({ "missing": ["a", "b"] })
 * - missing_some: Returns missing if below minimum ({ "missing_some": [2, ["a", "b", "c"]] })
 *
 * Logic/Boolean:
 * - if: Conditional ({ "if": [cond, then, else] })
 * - ==, ===, !=, !==: Equality operators
 * - !, !!: Negation and double-negation (truthy cast)
 * - or, and: Logical operators (short-circuit evaluation)
 *
 * Numeric:
 * - <, >, <=, >=: Comparison (supports 3-arg between: { "<": [1, x, 10] })
 * - max, min: Maximum/minimum of values
 * - +, -, *, /, %: Arithmetic operators
 *
 * Array:
 * - in: Array membership or substring check
 * - some, all, none: Test array elements against condition
 * - map: Transform array elements ({ "map": [arr, mapper] })
 * - filter: Keep elements passing test ({ "filter": [arr, condition] })
 * - reduce: Combine elements ({ "reduce": [arr, reducer, initial] })
 * - merge: Flatten arrays ({ "merge": [[1,2], [3,4]] } → [1,2,3,4])
 *
 * String:
 * - cat: Concatenate strings ({ "cat": ["a", "b"] } → "ab")
 * - substr: Extract substring ({ "substr": [str, start, length?] })
 *
 * Miscellaneous:
 * - log: Console log and pass through value
 *
 * Extensions:
 * - xor: Exactly one condition true (A ⊕ B)
 * - pathExists: File/directory exists in project
 *
 * Convenience shortcuts (sugar for common patterns):
 * - hasTag: string → { "in": [tag, { "var": "tags" }] }
 * - hasTarget: string → { "in": [target, { "var": "targets" }] }
 * - hasAnyTag: string[] → { "some": [tags, { "in": [{ "var": "" }, { "var": "tags" }] }] }
 * - hasAllTags: string[] → { "all": [tags, { "in": [{ "var": "" }, { "var": "tags" }] }] }
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
// JSON Logic Types
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonLogicValue = any
type JsonLogicRule = JsonLogicValue | { [operator: string]: JsonLogicValue }

interface TargetRule {
	target: string
	when: JsonLogicRule | JsonLogicRule[]
	value?: Record<string, unknown>
}

export interface InferTargetsPluginOptions {
	rules?: TargetRule[]
}

// Data context for JSON Logic evaluation
interface DataContext {
	tags: string[]
	targets: string[]
	root: string
	name: string
	// For iteration context (e.g., inside some/all/none)
	"": JsonLogicValue
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

// ============================================================================
// JSON Logic Evaluator
// ============================================================================

function getVar(data: DataContext, path: JsonLogicValue): JsonLogicValue {
	if (path === "" || path === null || path === undefined) {
		return data[""]
	}
	if (typeof path === "number") {
		// Array index access
		const arr = data[""]
		return Array.isArray(arr) ? arr[path] : undefined
	}
	if (typeof path !== "string") {
		return undefined
	}

	// Dot notation path traversal
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

function evaluate(
	rule: JsonLogicRule,
	data: DataContext,
	fsContext: { workspaceRoot: string; projectRoot: string }
): JsonLogicValue {
	// Primitives pass through
	if (rule === null || rule === undefined) {
		return rule
	}
	if (typeof rule !== "object") {
		return rule
	}
	if (Array.isArray(rule)) {
		return rule.map((r) => evaluate(r, data, fsContext))
	}

	// Get the operator (first key)
	const operators = Object.keys(rule)
	if (operators.length !== 1) {
		// Not a valid operation, return as-is
		return rule
	}

	const op = operators[0]
	const args = rule[op]

	// Helper to evaluate args
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
			// Returns array of keys that are missing (null/undefined) in data
			const keys = Array.isArray(args) ? args : [args]
			return keys.filter((key) => {
				const val = getVar(data, evalArg(key))
				return val === null || val === undefined || val === ""
			})
		}

		case "missing_some": {
			// { "missing_some": [min_required, ["a", "b", "c"]] }
			// Returns empty array if at least min_required keys are present
			// Otherwise returns the missing keys
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
			// Else clause (odd number of args)
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
			if (vals.length === 2) {
				return vals[0] < vals[1]
			}
			// Between: a < b < c
			if (vals.length === 3) {
				return vals[0] < vals[1] && vals[1] < vals[2]
			}
			return false
		}

		case "<=": {
			const vals = evalArgs()
			if (vals.length === 2) {
				return vals[0] <= vals[1]
			}
			if (vals.length === 3) {
				return vals[0] <= vals[1] && vals[1] <= vals[2]
			}
			return false
		}

		case ">": {
			const vals = evalArgs()
			if (vals.length === 2) {
				return vals[0] > vals[1]
			}
			if (vals.length === 3) {
				return vals[0] > vals[1] && vals[1] > vals[2]
			}
			return false
		}

		case ">=": {
			const vals = evalArgs()
			if (vals.length === 2) {
				return vals[0] >= vals[1]
			}
			if (vals.length === 3) {
				return vals[0] >= vals[1] && vals[1] >= vals[2]
			}
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
			// Single arg: cast to number
			if (vals.length === 1) {
				return Number(vals[0])
			}
			// Multiple args: sum
			return vals.reduce((sum, v) => sum + Number(v), 0)
		}

		case "-": {
			const vals = evalArgs()
			// Single arg: negate
			if (vals.length === 1) {
				return -Number(vals[0])
			}
			// Two args: subtract
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
			if (Array.isArray(haystack)) {
				return haystack.includes(needle)
			}
			if (typeof haystack === "string") {
				return haystack.includes(String(needle))
			}
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
			if (evalArr.length === 0) return false // JSON Logic: all([]) = false
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
			// { "reduce": [array, mapper, initial] }
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
			// Merge multiple arrays into one
			const vals = evalArgs()
			return vals.flat()
		}

		// ========== String Operators ==========
		case "cat": {
			// Concatenate all arguments as strings
			const vals = evalArgs()
			return vals.map(String).join("")
		}

		case "substr": {
			// { "substr": [string, start, length?] }
			const vals = evalArgs()
			const str = String(vals[0])
			const start = Number(vals[1])
			const length = vals.length > 2 ? Number(vals[2]) : undefined

			// Handle negative start (from end)
			const actualStart = start < 0 ? Math.max(0, str.length + start) : start

			if (length === undefined) {
				return str.substring(actualStart)
			}
			// Handle negative length (characters from end to stop before)
			if (length < 0) {
				return str.substring(actualStart, str.length + length)
			}
			return str.substring(actualStart, actualStart + length)
		}

		// ========== Miscellaneous ==========
		case "log": {
			// Log to console and pass through the value
			const val = evalArg(Array.isArray(args) ? args[0] : args)
			console.log("JsonLogic log:", val)
			return val
		}

		// ========== Extensions ==========
		case "xor": {
			// Exactly one condition is true: A ⊕ B = (A ∨ B) ∧ ¬(A ∧ B)
			const conditions = Array.isArray(args) ? args : [args]
			const results = conditions.map((c) => !!evalArg(c))
			const trueCount = results.filter(Boolean).length
			return trueCount === 1
		}

		case "pathExists": {
			const path = evalArg(args)
			const fullPath = join(fsContext.workspaceRoot, fsContext.projectRoot, String(path))
			return existsSync(fullPath)
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
			// Unknown operator - return as-is
			return rule
	}
}

// ============================================================================
// Plugin Implementation
// ============================================================================

function checkCondition(
	rule: JsonLogicRule,
	data: DataContext,
	fsContext: { workspaceRoot: string; projectRoot: string }
): boolean {
	return !!evaluate(rule, data, fsContext)
}

function checkAllConditions(
	conditions: JsonLogicRule | JsonLogicRule[],
	data: DataContext,
	fsContext: { workspaceRoot: string; projectRoot: string }
): boolean {
	const conditionArray = Array.isArray(conditions) ? conditions : [conditions]
	return conditionArray.every((c) => checkCondition(c, data, fsContext))
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
	let projectName = projectRoot.split("/").pop() ?? projectRoot

	try {
		const projectJson = JSON.parse(
			require("fs").readFileSync(projectJsonPath, "utf-8")
		) as ProjectConfiguration
		existingTargets = projectJson.targets ?? {}
		tags = projectJson.tags ?? []
		projectName = projectJson.name ?? projectName
	} catch {
		// No project.json or invalid - continue with empty targets/tags
	}

	// Build data context for JSON Logic evaluation
	const data: DataContext = {
		tags,
		targets: Object.keys(existingTargets),
		root: projectRoot,
		name: projectName,
		"": undefined,
	}

	const fsContext = {
		workspaceRoot: context.workspaceRoot,
		projectRoot,
	}

	// Evaluate rules and build targets
	const inferredTargets: Record<string, unknown> = {}

	for (const rule of rules) {
		// Skip if target already exists in project.json (let explicit config take precedence)
		if (rule.target in existingTargets) {
			continue
		}

		// Check if conditions are met
		if (checkAllConditions(rule.when, data, fsContext)) {
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
