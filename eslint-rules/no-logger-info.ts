/**
 * ESLint rule to discourage logger.info usage and suggest appropriate logging levels
 */

import { ESLintUtils } from '@typescript-eslint/utils';

type MessageIds = 'avoidLoggerInfo';

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/Mearman/Academic-Explorer/blob/main/eslint-rules/${name}.ts`
);

export const noLoggerInfoRule = createRule<[], MessageIds>({
  name: 'no-logger-info',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Discourage logger.info usage to reduce log noise',
    },
    fixable: null,
    schema: [],
    messages: {
      avoidLoggerInfo: 'Avoid logger.info() as it creates log noise. Use logger.debug() for development details, logger.warn() for issues, or logger.error() for failures.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        // Check for logger.info() calls
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'logger' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'info'
        ) {
          context.report({
            node,
            messageId: 'avoidLoggerInfo',
          });
        }
      },
    };
  },
});

export default {
  rules: {
    'no-logger-info': noLoggerInfoRule,
  },
};