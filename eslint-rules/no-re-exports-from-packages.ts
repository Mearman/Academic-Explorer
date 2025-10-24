import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://github.com/academic-explorer/eslint-rules/${name}`
)

export const rule = createRule({
	create(context) {
		const filename = context.filename || context.getFilename()

		// Allow re-exports in index files and types/index.ts files
		// These are commonly used for barrel exports in monorepos
		const isIndexFile = filename.endsWith("/index.ts") || filename.endsWith("/types/index.ts")

		return {
			ExportNamedDeclaration(node) {
				if (node.source && !isIndexFile) {
					const sourceValue = node.source.value

					// Check if it's re-exporting from an external package
					// External packages are those that start with @ or don't start with .
					if (
						typeof sourceValue === "string" &&
						!sourceValue.startsWith(".") &&
						!sourceValue.startsWith("/")
					) {
						context.report({
							node,
							messageId: "noReExportFromPackage",
							data: {
								source: sourceValue,
							},
						})
					}
				}
			},
			ExportAllDeclaration(node) {
				if (!isIndexFile) {
					const sourceValue = node.source.value

					// Check if it's re-exporting from an external package
					if (
						typeof sourceValue === "string" &&
						!sourceValue.startsWith(".") &&
						!sourceValue.startsWith("/")
					) {
						context.report({
							node,
							messageId: "noReExportFromPackage",
							data: {
								source: sourceValue,
							},
						})
					}
				}
			},
		}
	},
	name: "no-re-exports-from-packages",
	meta: {
		type: "problem",
		docs: {
			description: "Disallow re-exporting from external packages",
		},
		messages: {
			noReExportFromPackage:
				"Re-exporting from external package '{{ source }}' is not allowed. Import directly from the source package instead.",
		},
		schema: [],
	},
	defaultOptions: [],
})

export default {
	rules: {
		"no-re-exports-from-packages": rule,
	},
}
