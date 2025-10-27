/**
 * ESLint rule to prevent object/array creation in Zustand selectors
 * Specifically targets useStore(state => ...) patterns that create new objects
 */

import { ESLintUtils } from "@typescript-eslint/utils"

type MessageIds =
	| "selectorObjectCreation"
	| "selectorArrayMethods"
	| "selectorSpread"
	| "selectorObjectLiteral"

const ruleMessages = {
	selectorObjectCreation:
		"Avoid creating new objects/arrays in Zustand selectors. Use cached state or split into multiple stable selectors.",
	selectorArrayMethods:
		"Avoid array methods like .filter(), .map() in selectors. Use cached computed state instead.",
	selectorSpread:
		"Avoid spread operators in selectors that create new objects. Use direct property access or cached state.",
	selectorObjectLiteral:
		"Avoid object literals in selectors. Split into multiple selectors or use cached state.",
}

function isZustandSelector(node: any): boolean {
	// Check if this is a useStore call: useStore(state => ...)
	if (
		node.type === "CallExpression" &&
		node.callee &&
		node.callee.type === "Identifier" &&
		(node.callee.name === "useStore" || node.callee.name.endsWith("Store")) && // matches useGraphStore, useLayoutStore, etc.
		node.arguments?.length > 0
	) {
		const firstArg = node.arguments[0]
		return firstArg.type === "ArrowFunctionExpression" || firstArg.type === "FunctionExpression"
	}
	return false
}

function hasArrayMethods(node: any): boolean {
	const problematicMethods = [
		"filter",
		"map",
		"reduce",
		"forEach",
		"find",
		"some",
		"every",
		"slice",
		"concat",
		"flat",
		"flatMap",
		"sort",
		"reverse",
	]

	if (
		node.type === "CallExpression" &&
		node.callee &&
		node.callee.type === "MemberExpression" &&
		node.callee.property &&
		problematicMethods.includes(node.callee.property?.name)
	) {
		return true
	}

	return false
}

function hasObjectMethods(node: any): boolean {
	// Check for Object.values(), Object.keys(), Object.entries()
	if (
		node.type === "CallExpression" &&
		node.callee &&
		node.callee.type === "MemberExpression" &&
		node.callee.object &&
		node.callee.object.name === "Object" &&
		["values", "keys", "entries"].includes(node.callee.property?.name)
	) {
		return true
	}
	return false
}

function hasSpreadOperator(node: any): boolean {
	if (node.type === "ObjectExpression") {
		return node.properties?.some((prop: any) => prop.type === "SpreadElement") ?? false
	}
	if (node.type === "ArrayExpression") {
		return node.elements?.some((elem: any) => elem && elem.type === "SpreadElement") ?? false
	}
	return false
}

function checkSelectorFunction(context: any, selectorFunction: any): void {
	function traverse(node: any): void {
		if (!node) return

		// Check for array methods
		if (hasArrayMethods(node)) {
			context.report({
				node,
				messageId: "selectorArrayMethods",
			})
		}

		// Check for Object.values/keys/entries
		if (hasObjectMethods(node)) {
			context.report({
				node,
				messageId: "selectorArrayMethods",
			})
		}

		// Check for object literals
		if (node.type === "ObjectExpression") {
			context.report({
				node,
				messageId: "selectorObjectLiteral",
			})
		}

		// Check for array literals (less common but still problematic)
		if (node.type === "ArrayExpression") {
			context.report({
				node,
				messageId: "selectorObjectCreation",
			})
		}

		// Check for spread operators
		if (hasSpreadOperator(node)) {
			context.report({
				node,
				messageId: "selectorSpread",
			})
		}

		// Recursively check child nodes
		for (const key in node) {
			if (key === "parent") continue
			const child = node[key]
			if (Array.isArray(child)) {
				child.forEach(traverse)
			} else if (child && typeof child === "object" && child.type) {
				traverse(child)
			}
		}
	}

	// Only check the return statement/expression of the selector
	if (selectorFunction.body) {
		if (selectorFunction.body.type === "BlockStatement") {
			// Function body with explicit return
			traverse(selectorFunction.body)
		} else {
			// Arrow function with implicit return
			traverse(selectorFunction.body)
		}
	}
}

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`
)

export const noSelectorObjectCreationRule = createRule<[], MessageIds>({
	name: "no-selector-object-creation",
	meta: {
		type: "problem",
		docs: {
			description:
				"Prevent object/array creation in Zustand selectors that cause React 19 infinite loops",
		},
		fixable: undefined,
		schema: [],
		messages: ruleMessages,
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				if (isZustandSelector(node)) {
					const selectorFunction = node.arguments[0]
					checkSelectorFunction(context, selectorFunction)
				}
			},
		}
	},
})

export default {
	rules: {
		"no-selector-object-creation": noSelectorObjectCreationRule,
	},
}
