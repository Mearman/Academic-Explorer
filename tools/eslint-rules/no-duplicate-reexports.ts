/**
 * ESLint rule to detect duplicate re-exports from barrel files
 *
 * When multiple files `export * from "./x"` statements bring in the same named export,
 * it causes conflicts. This rule detects when a file re-exports a name that is already
 * exported by another re-exported module.
 */

import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import * as ts from "typescript";
import * as path from "path";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/Mearman/BibGraph/blob/main/tools/eslint-rules/${name}.md`
);

interface ReExportSource {
  node: TSESTree.ExportAllDeclaration | TSESTree.ExportNamedDeclaration;
  source: string;
  exportedNames: Set<string>;
}

export const noDuplicateReexports = createRule({
  name: "no-duplicate-reexports",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow duplicate named exports from re-exported modules in barrel files",
    },
    messages: {
      duplicateExport:
        "Duplicate export '{{ name }}' - already exported from '{{ originalSource }}', also found in '{{ duplicateSource }}'",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename;

    // Only check barrel files (index.ts files)
    if (!filename.endsWith("index.ts")) {
      return {};
    }

    const parserServices = ESLintUtils.getParserServices(context);
    const program = parserServices.program;
    const checker = program.getTypeChecker();

    // Track all exports from each re-export source
    const reExportSources: ReExportSource[] = [];
    // Track which names have been exported and from where
    const exportedNamesMap = new Map<string, string>();

    /**
     * Get the resolved file path for an import/export source
     */
    function resolveModulePath(source: string): string | null {
      const sourceFile = program.getSourceFile(filename);
      if (!sourceFile) return null;

      const resolvedModule = ts.resolveModuleName(
        source,
        filename,
        program.getCompilerOptions(),
        ts.sys
      );

      if (resolvedModule.resolvedModule) {
        return resolvedModule.resolvedModule.resolvedFileName;
      }

      // Fallback: try to resolve relative paths manually
      if (source.startsWith("./") || source.startsWith("../")) {
        const dir = path.dirname(filename);
        const resolved = path.resolve(dir, source);
        // Try common extensions
        for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          const fullPath = resolved + ext;
          if (program.getSourceFile(fullPath)) {
            return fullPath;
          }
        }
        // Try without extension if already has one
        if (program.getSourceFile(resolved)) {
          return resolved;
        }
      }

      return null;
    }

    /**
     * Get all exported names from a source file
     */
    function getExportedNames(sourceFilePath: string): Set<string> {
      const names = new Set<string>();
      const sourceFile = program.getSourceFile(sourceFilePath);

      if (!sourceFile) return names;

      const symbol = checker.getSymbolAtLocation(sourceFile);
      if (!symbol) return names;

      const exports = checker.getExportsOfModule(symbol);
      for (const exp of exports) {
        names.add(exp.getName());
      }

      return names;
    }

    return {
      // Handle `export * from "./module"`
      ExportAllDeclaration(node) {
        if (!node.source || typeof node.source.value !== "string") {
          return;
        }

        const source = node.source.value;
        const resolvedPath = resolveModulePath(source);

        if (!resolvedPath) {
          // Can't resolve, skip
          return;
        }

        const exportedNames = getExportedNames(resolvedPath);

        // Check for duplicates
        for (const name of exportedNames) {
          const existingSource = exportedNamesMap.get(name);
          if (existingSource) {
            context.report({
              node,
              messageId: "duplicateExport",
              data: {
                name,
                originalSource: existingSource,
                duplicateSource: source,
              },
            });
          } else {
            exportedNamesMap.set(name, source);
          }
        }

        reExportSources.push({
          node,
          source,
          exportedNames,
        });
      },

      // Handle `export { foo, bar } from "./module"`
      ExportNamedDeclaration(node) {
        // Only handle re-exports (with source), not local exports
        if (!node.source || typeof node.source.value !== "string") {
          // This is a local export, track it
          for (const specifier of node.specifiers) {
            const name =
              specifier.exported.type === "Identifier"
                ? specifier.exported.name
                : specifier.exported.value;

            const existingSource = exportedNamesMap.get(name);
            if (existingSource) {
              context.report({
                node: specifier,
                messageId: "duplicateExport",
                data: {
                  name,
                  originalSource: existingSource,
                  duplicateSource: "(local)",
                },
              });
            } else {
              exportedNamesMap.set(name, "(local)");
            }
          }
          return;
        }

        const source = node.source.value;

        // Track each named export
        for (const specifier of node.specifiers) {
          const name =
            specifier.exported.type === "Identifier"
              ? specifier.exported.name
              : specifier.exported.value;

          const existingSource = exportedNamesMap.get(name);
          if (existingSource) {
            context.report({
              node: specifier,
              messageId: "duplicateExport",
              data: {
                name,
                originalSource: existingSource,
                duplicateSource: source,
              },
            });
          } else {
            exportedNamesMap.set(name, source);
          }
        }
      },
    };
  },
});
