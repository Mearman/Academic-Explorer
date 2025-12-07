/**
 * ESLint rule to completely ban re-exports from all files
 *
 * This rule prohibits all re-export patterns:
 * - `export * from "./module"`
 * - `export { foo, bar } from "./module"`
 * - `export { importedValue }` where the value was imported
 *
 * Files should only export what they define locally. This prevents
 * barrel file patterns and encourages direct imports throughout the codebase.
 */

import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/Mearman/BibGraph/blob/main/tools/eslint-rules/${name}.md`
);

export const noReexports = createRule({
  name: "no-reexports",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow all re-export patterns - files should only export what they define locally",
    },
    messages: {
      noReexportAll:
        "Re-exporting is not allowed. Remove 'export * from' and use direct imports instead. Source: '{{ source }}'.",
      noReexportNamed:
        "Re-exporting is not allowed. Remove 'export { {{ names }} } from {{ source }}' and use direct imports instead.",
      noExportImported:
        "Re-exporting imported values is not allowed. '{{ name }}' was imported from '{{ source }}'. Export values locally defined in this file only.",
    },
    schema: [],
    fixable: "code",
  },
  defaultOptions: [],
  create(context) {
    // Track imported names and their sources
    const importedNames = new Map<string, string>();

    return {
      // Track all imports to detect re-exports of imported values
      ImportDeclaration(node) {
        if (!node.source || typeof node.source.value !== "string") {
          return;
        }

        const source = node.source.value;

        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportSpecifier") {
            importedNames.set(specifier.local.name, source);
          } else if (specifier.type === "ImportDefaultSpecifier") {
            importedNames.set(specifier.local.name, source);
          } else if (specifier.type === "ImportNamespaceSpecifier") {
            importedNames.set(specifier.local.name, source);
          }
        }
      },

      // Handle `export * from "./module"` and `export * as X from "./module"`
      // Completely banned in all files including barrels
      ExportAllDeclaration(node) {
        if (!node.source || typeof node.source.value !== "string") {
          return;
        }

        const source = node.source.value;

        context.report({
          node,
          messageId: "noReexportAll",
          data: { source },
          fix(fixer) {
            // Remove the entire export statement including any trailing newline
            const sourceCode = context.sourceCode;
            const nextToken = sourceCode.getTokenAfter(node);
            const endRange = nextToken && nextToken.range[0] > node.range[1]
              ? node.range[1] + 1 // Include newline
              : node.range[1];
            return fixer.removeRange([node.range[0], endRange]);
          },
        });
      },

      // Handle `export { foo, bar } from "./module"` and `export { importedValue }`
      // Both patterns are banned in all files
      ExportNamedDeclaration(node) {
        // Case 1: Direct re-export with source: `export { x } from "./y"`
        if (node.source && typeof node.source.value === "string") {
          const source = node.source.value;

          if (node.specifiers.length === 0) {
            return;
          }

          const names = node.specifiers
            .map((spec) =>
              spec.exported.type === "Identifier"
                ? spec.exported.name
                : spec.exported.value
            )
            .join(", ");

          context.report({
            node,
            messageId: "noReexportNamed",
            data: { names, source },
            fix(fixer) {
              const sourceCode = context.sourceCode;
              const nextToken = sourceCode.getTokenAfter(node);
              const endRange = nextToken && nextToken.range[0] > node.range[1]
                ? node.range[1] + 1
                : node.range[1];
              return fixer.removeRange([node.range[0], endRange]);
            },
          });
          return;
        }

        // Case 2: Export without source - check if it's exporting imported values
        // `export { importedThing }` where importedThing was imported
        if (!node.source && node.specifiers.length > 0) {
          const exportedImports: Array<{ name: string; source: string; specifier: TSESTree.ExportSpecifier }> = [];

          for (const specifier of node.specifiers) {
            if (specifier.type !== "ExportSpecifier") continue;

            const localName = specifier.local.name;
            const importSource = importedNames.get(localName);

            if (importSource) {
              const exportedName =
                specifier.exported.type === "Identifier"
                  ? specifier.exported.name
                  : specifier.exported.value;
              exportedImports.push({ name: exportedName, source: importSource, specifier });
            }
          }

          // Report each exported import
          for (const { name, source, specifier } of exportedImports) {
            context.report({
              node: specifier,
              messageId: "noExportImported",
              data: { name, source },
              // Fix by removing the entire export statement if all specifiers are imports,
              // or by removing just this specifier if some are local
              fix(fixer) {
                // If all specifiers in this export are imported values, remove the whole statement
                if (exportedImports.length === node.specifiers.length) {
                  const sourceCode = context.sourceCode;
                  const nextToken = sourceCode.getTokenAfter(node);
                  const endRange = nextToken && nextToken.range[0] > node.range[1]
                    ? node.range[1] + 1
                    : node.range[1];
                  return fixer.removeRange([node.range[0], endRange]);
                }
                // Otherwise, we can't easily fix just one specifier - user needs to manually fix
                return null;
              },
            });
          }
        }
      },
    };
  },
});