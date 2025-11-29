/**
 * ESLint rule to prevent re-exporting from non-barrel files
 *
 * Non-barrel files (not index.ts) should only export things they define locally.
 * Re-exporting from other modules should only happen in barrel files (index.ts).
 * This includes:
 * - `export * from "./module"`
 * - `export { foo } from "./module"`
 * - `export { importedThing }` where importedThing was imported
 *
 * This rule auto-fixes by removing the offending re-export statement.
 */

import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import * as path from "path";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/Mearman/BibGraph/blob/main/tools/eslint-rules/${name}.md`
);

export const noReexportFromNonBarrel = createRule({
  name: "no-reexport-from-non-barrel",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow re-exporting from non-barrel files (only index.ts should re-export)",
    },
    messages: {
      noReexport:
        "Non-barrel files should not re-export from other modules. Only export what is defined in this file. Remove this re-export of '{{ name }}' from '{{ source }}'.",
      noReexportAll:
        "Non-barrel files should not use 'export * from'. Only barrel files (index.ts) should aggregate exports. Remove this re-export from '{{ source }}'.",
      noExportImported:
        "Non-barrel files should not export imported values. '{{ name }}' was imported from '{{ source }}' and should not be re-exported here.",
    },
    schema: [],
    fixable: "code",
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename;
    const basename = path.basename(filename);

    // Only apply to non-barrel files (not index.ts)
    if (basename === "index.ts" || basename === "index.tsx") {
      return {};
    }

    // Track imported names and their sources
    const importedNames = new Map<string, string>();

    return {
      // Track all imports
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

      // Handle `export * from "./module"` - always wrong in non-barrel files
      // But allow `export * as Name from "./module"` (namespace exports)
      ExportAllDeclaration(node) {
        if (!node.source || typeof node.source.value !== "string") {
          return;
        }

        // Allow namespace exports: `export * as Namespace from "./module"`
        // These are different from `export * from` - they create organized namespaces
        if (node.exported) {
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
      ExportNamedDeclaration(node) {
        // Case 1: Direct re-export with source: `export { x } from "./y"`
        if (node.source && typeof node.source.value === "string") {
          const source = node.source.value;

          // Allow type-only re-exports from external packages (not relative imports)
          // e.g., `export type { MantineColor } from "@mantine/core"`
          // But disallow `export type { Foo } from "./local-module"` to prevent barrel duplicates
          if (node.exportKind === "type" && !source.startsWith(".")) {
            return;
          }

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
            messageId: "noReexport",
            data: { name: names, source },
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
