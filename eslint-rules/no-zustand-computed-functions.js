/**
 * ESLint rule to prevent computed functions in Zustand stores that return new objects
 * Prevents React 19 + Zustand + Immer infinite loop issues
 */

const ruleMessages = {
  computedFunction: 'Avoid computed functions in Zustand stores that return new objects. Use cached state + recomputation pattern instead.',
  arrayObjectCreation: 'Avoid creating new arrays/objects in store getters. Cache the result in state and recompute on mutations.',
  filterMapReduce: 'Array methods like .filter(), .map(), .reduce() in store getters create new objects. Use cached computed state instead.'
};

function isZustandStoreCall(node) {
  // Check if this is inside a create() call from zustand
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'CallExpression' &&
        parent.callee &&
        parent.callee.name === 'create') {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function hasArrayObjectMethods(node) {
  // Check for .filter(), .map(), .reduce(), Object.values(), Object.keys(), etc.
  const problematicMethods = [
    'filter', 'map', 'reduce', 'forEach', 'find', 'some', 'every',
    'slice', 'concat', 'flat', 'flatMap'
  ];

  if (node.type === 'CallExpression' &&
      node.callee &&
      node.callee.property &&
      problematicMethods.includes(node.callee.property.name)) {
    return true;
  }

  // Check for Object.values(), Object.keys(), Object.entries()
  if (node.type === 'CallExpression' &&
      node.callee &&
      node.callee.type === 'MemberExpression' &&
      node.callee.object &&
      node.callee.object.name === 'Object' &&
      ['values', 'keys', 'entries'].includes(node.callee.property.name)) {
    return true;
  }

  return false;
}

function hasObjectArrayLiteralCreation(node) {
  // Check for object literals {} or array literals []
  return node.type === 'ObjectExpression' || node.type === 'ArrayExpression';
}

function checkFunctionBody(context, functionNode) {
  if (!functionNode.body) return;

  // Walk through function body to find problematic patterns
  function traverse(node) {
    if (!node) return;

    // Check for array/object methods that create new instances
    if (hasArrayObjectMethods(node)) {
      context.report({
        node,
        messageId: 'filterMapReduce'
      });
    }

    // Check for direct object/array creation in return statements
    if (node.type === 'ReturnStatement' && node.argument) {
      if (hasObjectArrayLiteralCreation(node.argument)) {
        context.report({
          node: node.argument,
          messageId: 'arrayObjectCreation'
        });
      }
    }

    // Recursively check child nodes
    for (const key in node) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(traverse);
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child);
      }
    }
  }

  traverse(functionNode.body);
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent computed functions in Zustand stores that cause React 19 infinite loops',
      category: 'Possible Errors',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: ruleMessages
  },

  create(context) {
    return {
      Property(node) {
        // Only check properties inside Zustand stores
        if (!isZustandStoreCall(node)) return;

        // Check for getter-style property names that suggest computed functions
        const getterPatterns = /^(get|fetch|compute|calculate|filter|find)/i;
        const isGetterName = node.key &&
                            node.key.type === 'Identifier' &&
                            getterPatterns.test(node.key.name);

        // Check if property value is a function
        const isFunctionValue = node.value &&
                               (node.value.type === 'FunctionExpression' ||
                                node.value.type === 'ArrowFunctionExpression');

        if (isGetterName && isFunctionValue) {
          // Report the computed function pattern
          context.report({
            node: node.key,
            messageId: 'computedFunction'
          });

          // Also check the function body for problematic patterns
          checkFunctionBody(context, node.value);
        } else if (isFunctionValue) {
          // Even if not a getter name, check function body for problems
          checkFunctionBody(context, node.value);
        }
      }
    };
  }
};