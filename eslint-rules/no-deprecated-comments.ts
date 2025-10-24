/**
 * ESLint rule to prevent @deprecated JSDoc tags and deprecated comments
 * Enforces removal of deprecated code instead of leaving it marked as deprecated
 */

import { ESLintUtils } from "@typescript-eslint/utils"

type MessageIds = "deprecatedTag" | "deprecatedComment"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`
)

export const noDeprecatedCommentsRule = createRule<[], MessageIds>({
	name: "no-deprecated-comments",
	meta: {
		type: "problem",
		docs: {
			description: "prevent @deprecated JSDoc tags and deprecated comments",
		},
		fixable: undefined,
		schema: [],
		messages: {
			deprecatedTag:
				"Do not use @deprecated tags. Remove deprecated code immediately instead of marking it as deprecated.",
			deprecatedComment:
				"Do not use 'deprecated' in comments. Remove deprecated code immediately instead of marking it as deprecated.",
		},
	},
	defaultOptions: [],
	create(context) {
		const sourceCode = context.getSourceCode()

		function checkComment(comment: { value: string; node?: unknown }): void {
			const commentText = comment.value.toLowerCase()

			// Check for @deprecated JSDoc tag
			if (commentText.includes("@deprecated")) {
				context.report({
					node: comment,
					messageId: "deprecatedTag",
				})
			}

			// Check for general deprecated mentions, but allow legitimate cases:
			// - "deprecation" (policy discussions)
			// - "deprecated api" (documenting external APIs)
			// - "deprecated or legacy" (describing exclusions)
			// - "// deprecated" (inline comments about external code)
			if (
				commentText.includes("deprecated") &&
				!commentText.includes("deprecation") &&
				!commentText.includes("deprecated api") &&
				!commentText.includes("deprecated or legacy") &&
				!commentText.match(/\/\/\s*deprecated/) &&
				!commentText.includes("not include deprecated")
			) {
				context.report({
					node: comment,
					messageId: "deprecatedComment",
				})
			}
		}

		return {
			Program() {
				const comments = sourceCode.getAllComments()
				comments.forEach(checkComment)
			},
		}
	},
})

export default {
	rules: {
		"no-deprecated-comments": noDeprecatedCommentsRule,
	},
}
