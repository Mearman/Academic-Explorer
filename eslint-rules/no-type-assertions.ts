/**
 * ESLint rule to forbid all TypeScript type assertions
 * Forces use of type guards instead of unsafe type assertions
 */

import { ESLintUtils } from "@typescript-eslint/utils";

type MessageIds = "noTypeAssertion" | "noAngleBracketTypeAssertion";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`,
);

export const noTypeAssertionsRule = createRule<[], MessageIds>({
  name: "no-type-assertions",
  meta: {
    type: "problem",
    docs: {
      description:
        "forbid all TypeScript type assertions, use type guards instead",
    },
    fixable: undefined,
    schema: [],
    messages: {
      noTypeAssertion:
        'Type assertion with "as" is forbidden. Use a type guard function instead.',
      noAngleBracketTypeAssertion:
        "Angle bracket type assertion is forbidden. Use a type guard function instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Detect "as" type assertions: value as Type
      TSAsExpression(node) {
        context.report({
          node,
          messageId: "noTypeAssertion",
        });
      },

      // Detect angle bracket type assertions: <Type>value (deprecated but still valid)
      TSTypeAssertion(node) {
        context.report({
          node,
          messageId: "noAngleBracketTypeAssertion",
        });
      },
    };
  },
});

export default {
  rules: {
    "no-type-assertions": noTypeAssertionsRule,
  },
};
