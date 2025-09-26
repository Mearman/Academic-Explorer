/**
 * ESLint rule to warn when functions have more than one parameter that isn't destructured.
 * Encourages better API design by promoting object parameters with destructuring.
 */

import { ESLintUtils } from '@typescript-eslint/utils';

type MessageIds = 'useDestructuring';

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`
);

export const preferDestructuredParamsRule = createRule<[], MessageIds>({
  name: 'prefer-destructured-params',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when functions have more than one parameter that isn\'t destructured',
    },
    fixable: null,
    schema: [],
    messages: {
      useDestructuring: 'Functions with more than one parameter should use destructuring. Consider using an object parameter with destructuring instead of {{count}} separate parameters.',
    },
  },
  defaultOptions: [],
  create(context) {
    function checkFunction(node: any): void {
      const params = node.params;

      // Skip if function has 1 or fewer parameters
      if (params.length <= 1) {
        return;
      }

      // Check if the first parameter is destructured (ObjectPattern)
      const firstParam = params[0];
      if (firstParam.type === 'ObjectPattern') {
        return; // Already using destructuring
      }

      // Check if function has rest parameters (...args) - this is acceptable
      const hasRestParam = params.some((param: any) => param.type === 'RestElement');
      if (hasRestParam) {
        return;
      }

      // Skip if any parameter is an ObjectPattern (partial destructuring)
      const hasObjectPattern = params.some((param: any) => param.type === 'ObjectPattern');
      if (hasObjectPattern) {
        return;
      }

      // Skip certain common patterns that are acceptable:
      // 1. Event handlers (e, event as first param)
      // 2. Callback functions with (error, result) pattern
      // 3. Mathematical functions with clear single-purpose params
      if (params.length === 2) {
        const firstParamName = firstParam.type === 'Identifier' ? firstParam.name : '';
        const secondParam = params[1];
        const secondParamName = secondParam.type === 'Identifier' ? secondParam.name : '';

        // Common event handler patterns
        if (firstParamName.match(/^(e|event|evt)$/i) ||
            // Common callback patterns
            firstParamName === 'error' || firstParamName === 'err' ||
            // Mathematical/comparison functions
            (firstParamName === 'a' && secondParamName === 'b') ||
            (firstParamName === 'x' && secondParamName === 'y')) {
          return;
        }
      }

      // Report the violation
      context.report({
        node,
        messageId: 'useDestructuring',
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
        if (node.value && (node.value.type === 'FunctionExpression' || node.value.type === 'ArrowFunctionExpression')) {
          checkFunction(node.value);
        }
      },
    };
  },
});

export default {
  rules: {
    'prefer-destructured-params': preferDestructuredParamsRule,
  },
};