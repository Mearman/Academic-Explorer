/**
 * Temporary fallback sprinkles implementation
 * This bypasses Vanilla Extract configuration issues while maintaining API compatibility
 */

// Simple CSS class name generator as fallback
const generateCSSClass = (styles: Record<string, any>): string => {
  const className = Object.entries(styles)
    .map(([prop, value]) => `${prop}-${String(value).replace(/[^a-zA-Z0-9]/g, '-')}`)
    .join('-');

  // Apply styles inline for now as fallback
  return className;
};

// Fallback sprinkles function that generates inline styles
export const sprinkles = (styles: Record<string, any>) => {
  const inlineStyles: Record<string, string> = {};
  const className = generateCSSClass(styles);

  // Convert sprinkles properties to CSS
  Object.entries(styles).forEach(([key, value]) => {
    switch (key) {
      case 'display':
      case 'position':
      case 'cursor':
      case 'textAlign':
        inlineStyles[key] = value;
        break;
      case 'flexDirection':
        inlineStyles.flexDirection = value;
        break;
      case 'alignItems':
      case 'justifyContent':
      case 'flexWrap':
      case 'flexGrow':
      case 'flexShrink':
      case 'flexBasis':
        inlineStyles[key] = value;
        break;
      case 'width':
      case 'height':
      case 'minWidth':
      case 'maxWidth':
      case 'maxHeight':
        inlineStyles[key] = value;
        break;
      case 'padding':
      case 'paddingTop':
      case 'paddingBottom':
      case 'paddingLeft':
      case 'paddingRight':
      case 'margin':
      case 'marginTop':
      case 'marginBottom':
      case 'marginLeft':
      case 'marginRight':
      case 'gap':
        inlineStyles[key] = value;
        break;
      case 'borderWidth':
      case 'borderStyle':
      case 'borderRadius':
        inlineStyles[key] = value;
        break;
      case 'color':
      case 'backgroundColor':
      case 'borderColor':
        inlineStyles[key] = value;
        break;
      case 'fontSize':
      case 'fontWeight':
      case 'lineHeight':
      case 'fontFamily':
        inlineStyles[key] = value;
        break;
      case 'opacity':
      case 'zIndex':
        inlineStyles[key] = String(value);
        break;
      case 'top':
      case 'right':
      case 'bottom':
      case 'left':
        inlineStyles[key] = value;
        break;
      case 'overflow':
      case 'overflowX':
      case 'overflowY':
        inlineStyles[key] = value;
        break;
      case 'transition':
        inlineStyles[key] = value;
        break;
      case 'flex':
        inlineStyles.flex = value;
        break;
      case 'minHeight':
        if (value === 'full') inlineStyles.minHeight = '100vh';
        else inlineStyles.minHeight = value;
        break;
      case 'wordBreak':
        inlineStyles.wordBreak = value;
        break;
      default:
        // Handle color tokens
        if (value === 'textMuted') {
          inlineStyles.color = '#868e96';
        } else if (value === 'dimmed') {
          inlineStyles.color = '#868e96';
        } else if (value === 'border') {
          inlineStyles.borderColor = '#dee2e6';
        } else if (value === 'background') {
          inlineStyles.backgroundColor = '#ffffff';
        } else if (value === 'normal') {
          inlineStyles.transition = 'all 0.2s ease';
        } else {
          inlineStyles[key] = value;
        }
    }
  });

  // Apply inline styles directly to document head (temporary solution)
  if (typeof document !== 'undefined') {
    const existingStyle = document.getElementById(`temp-sprinkles-${className}`);
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = `temp-sprinkles-${className}`;
      style.textContent = `.${className} { ${Object.entries(inlineStyles).map(([k, v]) => `${k}: ${v}`).join('; ')} }`;
      document.head.appendChild(style);
    }
  }

  return className;
};

/**
 * Export the type for TypeScript support
 */
export type Sprinkles = Record<string, any>;