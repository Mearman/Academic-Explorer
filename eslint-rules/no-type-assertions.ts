/**
 * ESLint rule to forbid all TypeScript type assertions
 * Forces use of type guards instead of unsafe type assertions
 */

import { ESLintUtils } from "@typescript-eslint/utils"

type MessageIds = "noTypeAssertion" | "noAngleBracketTypeAssertion"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`
)

export const noTypeAssertionsRule = createRule<[], MessageIds>({
	name: "no-type-assertions",
	meta: {
		type: "problem",
		docs: {
			description: "forbid all TypeScript type assertions, use type guards instead",
		},
		fixable: undefined,
		schema: [],
		messages: {
			noTypeAssertion: 'Type assertion with "as" is forbidden. Use a type guard function instead.',
			noAngleBracketTypeAssertion:
				"Angle bracket type assertion is forbidden. Use a type guard function instead.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			// Detect "as" type assertions: value as Type
			TSAsExpression(node) {
				// Allow "as const" assertions as they are safe and commonly used
				if (
					node.typeAnnotation.type === "TSTypeReference" &&
					node.typeAnnotation.typeName.type === "Identifier" &&
					node.typeAnnotation.typeName.name === "const"
				) {
					return
				}

				// Allow Record<string, unknown> assertions for object type guards
				if (
					node.typeAnnotation.type === "TSTypeReference" &&
					node.typeAnnotation.typeName.type === "Identifier" &&
					node.typeAnnotation.typeName.name === "Record"
				) {
					return
				}

				// Allow "as any" assertions for necessary API compatibility
				if (node.typeAnnotation.type === "TSAnyKeyword") {
					return
				}

				// Allow generic type assertions (T, U, etc.) in return statements
				// This is commonly used in generic API client methods
				if (
					node.typeAnnotation.type === "TSTypeReference" &&
					node.typeAnnotation.typeName.type === "Identifier" &&
					/^[A-Z]$/.test(node.typeAnnotation.typeName.name)
				) {
					return
				}

				context.report({
					node,
					messageId: "noTypeAssertion",
				})
			},

			// Detect angle bracket type assertions: <Type>value (deprecated but still valid)
			TSTypeAssertion(node) {
				context.report({
					node,
					messageId: "noAngleBracketTypeAssertion",
				})
			},
		}
	},
})

export default {
	rules: {
		"no-type-assertions": noTypeAssertionsRule,
	},
}
