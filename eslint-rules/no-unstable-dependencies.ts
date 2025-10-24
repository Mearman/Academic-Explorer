/**
 * ESLint rule to detect unstable dependencies in React hooks
 * Prevents React 19 infinite loop issues from unstable references
 */

import { ESLintUtils } from "@typescript-eslint/utils"

type MessageIds =
	| "unstableComputed"
	| "objectArrayDependency"
	| "functionCallDependency"
	| "storeComputedFunction"

const ruleMessages = {
	unstableComputed:
		"Avoid computed values in hook dependencies. Use useMemo with stable dependencies instead.",
	objectArrayDependency:
		"Avoid object/array literals in hook dependencies. Extract to variables or use stable references.",
	functionCallDependency:
		"Avoid function calls in hook dependencies. Compute values outside or use useMemo.",
	storeComputedFunction:
		"Avoid store computed functions in hook dependencies. Use stable selectors instead.",
}

const REACT_HOOKS = [
	"useEffect",
	"useLayoutEffect",
	"useCallback",
	"useMemo",
	"useImperativeHandle",
	"useDebugValue",
]

function isObjectOrArrayLiteral(node: any): boolean {
	return node.type === "ObjectExpression" || node.type === "ArrayExpression"
}

function isFunctionCall(node: any): boolean {
	return node.type === "CallExpression"
}

function isComputedExpression(node: any): boolean {
	// Check for expressions that compute new values
	return (
		node.type === "BinaryExpression" ||
		node.type === "ConditionalExpression" ||
		node.type === "LogicalExpression" ||
		(node.type === "MemberExpression" && node.computed)
	)
}

function isStoreComputedFunction(node: any): boolean {
	// Check for patterns like store.getFilteredItems() or useStore(state => state.getItems())
	if (node.type === "CallExpression" && node.callee && node.callee.type === "MemberExpression") {
		const methodName = node.callee.property?.name || ""
		return /^(get|fetch|compute|calculate|filter|find)/i.test(methodName)
	}

	return false
}

function checkDependencyArray(context: any, dependencyArray: any): void {
	if (!dependencyArray || !dependencyArray.elements) return

	dependencyArray.elements.forEach((dep: any) => {
		if (!dep) return

		if (isObjectOrArrayLiteral(dep)) {
			context.report({
				node: dep,
				messageId: "objectArrayDependency",
			})
		} else if (isStoreComputedFunction(dep)) {
			context.report({
				node: dep,
				messageId: "storeComputedFunction",
			})
		} else if (isFunctionCall(dep)) {
			context.report({
				node: dep,
				messageId: "functionCallDependency",
			})
		} else if (isComputedExpression(dep)) {
			context.report({
				node: dep,
				messageId: "unstableComputed",
			})
		}
	})
}

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`
)

export const noUnstableDependenciesRule = createRule<[], MessageIds>({
	name: "no-unstable-dependencies",
	meta: {
		type: "problem",
		docs: {
			description: "Prevent unstable dependencies in React hooks that cause infinite loops",
		},
		fixable: undefined,
		schema: [],
		messages: ruleMessages,
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				// Check if this is a React hook call
				if (
					!node.callee ||
					node.callee.type !== "Identifier" ||
					!REACT_HOOKS.includes(node.callee.name)
				) {
					return
				}

				// Get the dependency array (usually the last argument for most hooks)
				const args = node.arguments
				if (args.length === 0) return

				let dependencyArray

				// For most hooks, dependencies are the second argument
				if (args.length >= 2) {
					dependencyArray = args[1]
				}

				// Special case for useMemo and useCallback - dependencies are second arg
				if (["useMemo", "useCallback"].includes(node.callee.name) && args.length >= 2) {
					dependencyArray = args[1]
				}

				// Special case for useEffect - dependencies are second arg
				if (node.callee.name === "useEffect" && args.length >= 2) {
					dependencyArray = args[1]
				}

				if (dependencyArray && dependencyArray.type === "ArrayExpression") {
					checkDependencyArray(context, dependencyArray)
				}
			},
		}
	},
})

export default {
	rules: {
		"no-unstable-dependencies": noUnstableDependenciesRule,
	},
}
