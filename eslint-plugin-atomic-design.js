/**
 * Custom ESLint Plugin for Atomic Design Methodology
 * Enforces specific Atomic Design patterns and conventions
 */

const path = require('path');
const fs = require('fs');

/**
 * Get the atomic design level from file path
 */
function getAtomicLevel(filePath) {
  const normalizedPath = path.normalize(filePath);
  
  if (normalizedPath.includes('/components/atoms/')) return 'atom';
  if (normalizedPath.includes('/components/molecules/')) return 'molecule';
  if (normalizedPath.includes('/components/organisms/')) return 'organism';
  if (normalizedPath.includes('/components/templates/')) return 'template';
  if (normalizedPath.includes('/routes/')) return 'page';
  
  return null;
}

/**
 * Check if component follows proper naming conventions
 */
function isValidComponentName(fileName, atomicLevel) {
  const baseName = path.basename(fileName, path.extname(fileName));
  
  // Should be PascalCase
  const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(baseName);
  
  // Atoms should be simple names (Button, Input, etc.)
  if (atomicLevel === 'atom') {
    return isPascalCase && baseName.length <= 15;
  }
  
  // Molecules can be compound names (SearchBox, FormField, etc.)
  if (atomicLevel === 'molecule') {
    return isPascalCase && baseName.length <= 25;
  }
  
  // Higher levels can have longer, more descriptive names
  return isPascalCase;
}

/**
 * Check if component has proper file structure
 */
function hasProperFileStructure(filePath) {
  const dir = path.dirname(filePath);
  const componentName = path.basename(dir);
  
  // Check for required files
  const tsxFile = path.join(dir, `${componentName}.tsx`);
  const cssFile = path.join(dir, `${componentName}.css.ts`);
  const testFile = path.join(dir, `${componentName}.test.tsx`);
  
  return {
    hasTsx: fs.existsSync(tsxFile),
    hasCss: fs.existsSync(cssFile),
    hasTest: fs.existsSync(testFile)
  };
}

module.exports = {
  rules: {
    /**
     * Enforce proper component naming conventions for each atomic level
     */
    'atomic-naming-convention': {
      type: 'problem',
      docs: {
        description: 'Enforce Atomic Design naming conventions',
        category: 'Possible Errors',
      },
      fixable: null,
      schema: [],
      
      create(context) {
        return {
          Program(node) {
            const filePath = context.getFilename();
            const atomicLevel = getAtomicLevel(filePath);
            
            if (!atomicLevel) return;
            
            const fileName = path.basename(filePath);
            const componentName = path.basename(fileName, path.extname(fileName));
            
            if (!isValidComponentName(componentName, atomicLevel)) {
              context.report({
                node,
                message: `${atomicLevel} component "${componentName}" should follow proper naming conventions. ${atomicLevel}s should use PascalCase and be appropriately named for their complexity level.`
              });
            }
          }
        };
      }
    },

    /**
     * Ensure atoms are stateless (with exceptions for basic UI state)
     */
    'atoms-should-be-stateless': {
      type: 'suggestion',
      docs: {
        description: 'Atoms should be stateless components',
        category: 'Best Practices',
      },
      fixable: null,
      schema: [],
      
      create(context) {
        return {
          CallExpression(node) {
            const filePath = context.getFilename();
            const atomicLevel = getAtomicLevel(filePath);
            
            if (atomicLevel !== 'atom') return;
            
            // Check for complex state management hooks
            const complexHooks = ['useReducer', 'useContext', 'useEffect'];
            
            if (
              node.callee.type === 'Identifier' &&
              complexHooks.includes(node.callee.name)
            ) {
              context.report({
                node,
                message: `Atom components should avoid complex state management. Consider moving ${node.callee.name} to a higher-level component.`
              });
            }
          }
        };
      }
    },

    /**
     * Enforce component complexity limits based on atomic level
     */
    'atomic-complexity-limits': {
      type: 'suggestion',
      docs: {
        description: 'Enforce complexity limits for different atomic levels',
        category: 'Best Practices',
      },
      fixable: null,
      schema: [],
      
      create(context) {
        const complexityLimits = {
          atom: 5,
          molecule: 10,
          organism: 15,
          template: 8,
          page: 20
        };
        
        let currentComplexity = 0;
        
        return {
          Program() {
            currentComplexity = 0;
          },
          
          // Track complexity indicators
          FunctionDeclaration() { currentComplexity++; },
          ArrowFunctionExpression() { currentComplexity++; },
          ConditionalExpression() { currentComplexity++; },
          LogicalExpression() { currentComplexity++; },
          CallExpression(node) {
            // Hook calls add complexity
            if (node.callee.type === 'Identifier' && node.callee.name.startsWith('use')) {
              currentComplexity++;
            }
          },
          
          'Program:exit'() {
            const filePath = context.getFilename();
            const atomicLevel = getAtomicLevel(filePath);
            
            if (!atomicLevel) return;
            
            const limit = complexityLimits[atomicLevel];
            
            if (currentComplexity > limit) {
              context.report({
                loc: { line: 1, column: 0 },
                message: `${atomicLevel} component complexity (${currentComplexity}) exceeds recommended limit (${limit}). Consider breaking into smaller components.`
              });
            }
          }
        };
      }
    },

    /**
     * Ensure proper file structure for components
     */
    'atomic-file-structure': {
      type: 'suggestion',
      docs: {
        description: 'Enforce proper file structure for atomic components',
        category: 'Best Practices',
      },
      fixable: null,
      schema: [],
      
      create(context) {
        return {
          Program(node) {
            const filePath = context.getFilename();
            const atomicLevel = getAtomicLevel(filePath);
            
            if (!atomicLevel) return;
            
            const structure = hasProperFileStructure(filePath);
            
            if (!structure.hasCss && atomicLevel !== 'page') {
              context.report({
                node,
                message: `${atomicLevel} components should have a corresponding CSS file for styling consistency.`
              });
            }
            
            if (!structure.hasTest) {
              context.report({
                node,
                message: `${atomicLevel} components should have corresponding test files.`
              });
            }
          }
        };
      }
    },

    /**
     * Prevent business logic in atoms and molecules
     */
    'no-business-logic-in-atoms': {
      type: 'problem',
      docs: {
        description: 'Atoms and molecules should not contain business logic',
        category: 'Possible Errors',
      },
      fixable: null,
      schema: [],
      
      create(context) {
        const businessLogicPatterns = [
          /api\./,
          /fetch/,
          /axios/,
          /localStorage/,
          /sessionStorage/,
          /\.post\(/,
          /\.get\(/,
          /\.put\(/,
          /\.delete\(/
        ];
        
        return {
          CallExpression(node) {
            const filePath = context.getFilename();
            const atomicLevel = getAtomicLevel(filePath);
            
            if (atomicLevel !== 'atom' && atomicLevel !== 'molecule') return;
            
            const code = context.getSourceCode().getText(node);
            
            if (businessLogicPatterns.some(pattern => pattern.test(code))) {
              context.report({
                node,
                message: `${atomicLevel}s should not contain business logic. Move API calls and data manipulation to organisms or pages.`
              });
            }
          }
        };
      }
    }
  }
};