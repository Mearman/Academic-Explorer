import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/Mearman/BibGraph/blob/main/tools/eslint-rules/${name}.md`
);

export const noDeprecated = createRule({
  name: "no-deprecated",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow the use of deprecated APIs",
    },
    messages: {
      deprecated: "{{symbol}} is deprecated{{reason}}",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    function getDeprecationMessage(symbol: ts.Symbol): string | undefined {
      const tags = symbol.getJsDocTags();
      for (const tag of tags) {
        if (tag.name === "deprecated") {
          return tag.text?.map((part) => part.text).join("") ?? "";
        }
      }
      return undefined;
    }

    function checkDeprecation(node: TSESTree.Node, symbolName: string) {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      const symbol = checker.getSymbolAtLocation(tsNode);

      if (!symbol) {
        return;
      }

      // Check if the symbol itself is deprecated
      const deprecationMessage = getDeprecationMessage(symbol);
      if (deprecationMessage !== undefined) {
        context.report({
          node,
          messageId: "deprecated",
          data: {
            symbol: symbolName,
            reason: deprecationMessage ? `: ${deprecationMessage}` : "",
          },
        });
        return;
      }

      // Check if the aliased symbol is deprecated (for imports)
      // Only call getAliasedSymbol if the symbol is actually an alias
      if (symbol.flags & ts.SymbolFlags.Alias) {
        const aliasedSymbol = checker.getAliasedSymbol(symbol);
        if (aliasedSymbol && aliasedSymbol !== symbol) {
          const aliasedDeprecation = getDeprecationMessage(aliasedSymbol);
          if (aliasedDeprecation !== undefined) {
            context.report({
              node,
              messageId: "deprecated",
              data: {
                symbol: symbolName,
                reason: aliasedDeprecation ? `: ${aliasedDeprecation}` : "",
              },
            });
          }
        }
      }
    }

    // Standard DOM APIs that should never be flagged as deprecated
    const standardDOMAPIs = new Set([
      "querySelector",
      "querySelectorAll",
      "getElementById",
      "getElementsByClassName",
      "getElementsByTagName",
      "addEventListener",
      "removeEventListener",
      "createElement",
    ]);

    return {
      Identifier(node: TSESTree.Identifier) {
        // Skip standard DOM APIs that are incorrectly flagged
        if (standardDOMAPIs.has(node.name)) {
          return;
        }

        // Skip if this identifier is a declaration
        const parent = node.parent;
        if (
          parent?.type === "FunctionDeclaration" ||
          parent?.type === "VariableDeclarator" ||
          parent?.type === "ClassDeclaration" ||
          parent?.type === "MethodDefinition" ||
          parent?.type === "PropertyDefinition"
        ) {
          // Skip the name being declared
          if (
            (parent.type === "FunctionDeclaration" && parent.id === node) ||
            (parent.type === "VariableDeclarator" && parent.id === node) ||
            (parent.type === "ClassDeclaration" && parent.id === node) ||
            (parent.type === "MethodDefinition" && parent.key === node) ||
            (parent.type === "PropertyDefinition" && parent.key === node)
          ) {
            return;
          }
        }

        checkDeprecation(node, node.name);
      },
    };
  },
});
