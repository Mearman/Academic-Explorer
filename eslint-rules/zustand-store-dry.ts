/**
 * ESLint rule to prevent direct create() usage in app layer, enforcing DRY store patterns
 * Allows create() usage in tests for isolated testing
 */

import { ESLintUtils } from "@typescript-eslint/utils";

type MessageIds = "noDirectCreate";

const ruleMessages = {
  noDirectCreate:
    "Avoid direct create() usage in app layer. Use shared store abstractions from @academic-explorer packages instead.",
};

function isTestFile(filename: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
}

function isLibraryFile(filename: string): boolean {
  // Allow direct create() usage in library packages that provide abstractions
  return /packages\/utils/.test(filename);
}

function isZustandCreateCall(node: any): boolean {
  // Check if this is a call to create() from zustand
  return (
    node.type === "CallExpression" &&
    node.callee &&
    node.callee.name === "create"
  );
}

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`,
);

export const zustandStoreDryRule = createRule<[], MessageIds>({
  name: "zustand-store-dry",
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent direct create() usage in app layer to enforce DRY store patterns",
    },
    fixable: undefined,
    schema: [],
    messages: ruleMessages,
  },
  defaultOptions: [],
  create(context) {
    const filename = context.getFilename();

    // Skip test files and library files - allow direct create() usage in tests and libraries
    if (isTestFile(filename) || isLibraryFile(filename)) {
      return {};
    }

    return {
      CallExpression(node) {
        if (isZustandCreateCall(node)) {
          context.report({
            node,
            messageId: "noDirectCreate",
          });
        }
      },
    };
  },
});

export default {
  rules: {
    "zustand-store-dry": zustandStoreDryRule,
  },
};
