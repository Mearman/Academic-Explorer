/**
 * ESLint rule to discourage logger.info usage and suggest appropriate logging levels
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Discourage logger.info usage to reduce log noise',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: null,
    schema: [],
    messages: {
      avoidLoggerInfo: 'Avoid logger.info() as it creates log noise. Use logger.debug() for development details, logger.warn() for issues, or logger.error() for failures.',
    },
  },

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
};