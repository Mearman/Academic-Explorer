/**
 * ESLint rule to warn when functions have more than one parameter that isn't destructured.
 * Encourages better API design by promoting object parameters with destructuring.
 */

import { ESLintUtils } from "@typescript-eslint/utils";

type MessageIds = "useDestructuring";

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`,
);

export const preferDestructuredParamsRule = createRule<[], MessageIds>({
  name: "prefer-destructured-params",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Warn when functions have more than one parameter that isn't destructured",
    },
    fixable: undefined,
    schema: [],
    messages: {
      useDestructuring:
        "Functions with more than one parameter should use destructuring. Consider using an object parameter with destructuring instead of {{count}} separate parameters.",
    },
  },
  defaultOptions: [],

  create(context) {
    function isCallbackFunction(node: any): boolean {
      // Check if this function is directly passed as an argument
      if (node.parent && node.parent.type === "CallExpression") {
        return true;
      }

      // Check if this function is in an object literal (likely a callback)
      if (node.parent && node.parent.type === "Property") {
        return true;
      }

      // Check if this function is in an array literal
      if (node.parent && node.parent.type === "ArrayExpression") {
        return true;
      }

      // Check if this function is assigned to a variable (likely a callback)
      if (
        node.parent &&
        node.parent.type === "VariableDeclarator" &&
        node.parent.init === node
      ) {
        return true;
      }

      // Check if this function is assigned to an object property
      if (
        node.parent &&
        node.parent.type === "AssignmentExpression" &&
        node.parent.right === node
      ) {
        return true;
      }

      return false;
    }
    function checkFunction(node: any): void {
      const params = node.params;

      // Skip if function has 1 or fewer parameters
      if (params.length <= 1) {
        return;
      }

      // Check if the first parameter is destructured (ObjectPattern)
      const firstParam = params[0];
      if (firstParam.type === "ObjectPattern") {
        return; // Already using destructuring
      }

      // Check if function has rest parameters (...args) - this is acceptable
      const hasRestParam = params.some(
        (param: any) => param.type === "RestElement",
      );
      if (hasRestParam) {
        return;
      }

      // Skip if any parameter is an ObjectPattern (partial destructuring)
      const hasObjectPattern = params.some(
        (param: any) => param.type === "ObjectPattern",
      );
      if (hasObjectPattern) {
        return;
      }

      // Skip if any parameter has a default value - these are often acceptable
      const hasDefaultValue = params.some(
        (param: any) => param.type === "AssignmentPattern",
      );
      if (hasDefaultValue) {
        return;
      }

      // Skip callback functions (functions passed as arguments or assigned to variables)
      if (isCallbackFunction(node)) {
        return;
      }

      // Skip functions with more than 3 parameters - these are often API functions
      if (params.length > 3) {
        return;
      }

      // Skip functions that start with common API patterns
      if (params.length === 2) {
        const firstParamName =
          params[0].type === "Identifier" ? params[0].name : "";
        const secondParamName =
          params[1].type === "Identifier" ? params[1].name : "";

        // Skip common API patterns like (id, data), (type, config), etc.
        if (
          (firstParamName === "id" && secondParamName === "data") ||
          (firstParamName === "type" && secondParamName === "data") ||
          (firstParamName === "entityType" && secondParamName === "id") ||
          (firstParamName === "table" && secondParamName === "options") ||
          (firstParamName === "config" && secondParamName === "logger")
        ) {
          return;
        }
      }

      // Skip callback functions (functions passed as arguments or assigned to variables)
      // This includes functions in object literals, array literals, and function calls
      if (isCallbackFunction(node)) {
        return;
      }

      // Skip certain common patterns that are acceptable:
      // 1. Event handlers (e, event as first param)
      // 2. Callback functions with (error, result) pattern
      // 3. Mathematical functions with clear single-purpose params
      if (params.length === 2) {
        const firstParamName =
          firstParam.type === "Identifier" ? firstParam.name : "";
        const secondParam = params[1];
        const secondParamName =
          secondParam.type === "Identifier" ? secondParam.name : "";

        // Common event handler patterns
        if (
          firstParamName.match(/^(e|event|evt)$/i) ||
          // Common callback patterns
          firstParamName === "error" ||
          firstParamName === "err" ||
          // Mathematical/comparison functions
          (firstParamName === "a" && secondParamName === "b") ||
          (firstParamName === "x" && secondParamName === "y") ||
          // Array map/reduce/forEach patterns (item, index)
          secondParamName === "index" ||
          secondParamName === "i" ||
          // React forwardRef pattern (props, ref)
          (firstParamName === "props" && secondParamName === "ref")
        ) {
          return;
        }
      }

      // Report the violation
      context.report({
        node,
        messageId: "useDestructuring",
        data: {
          count: params.length,
        },
      });
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
      MethodDefinition: (node: any) => {
        if (
          node.value &&
          (node.value.type === "FunctionExpression" ||
            node.value.type === "ArrowFunctionExpression")
        ) {
          checkFunction(node.value);
        }
      },
    };
  },
});

export default {
  rules: {
    "prefer-destructured-params": preferDestructuredParamsRule,
  },
};
