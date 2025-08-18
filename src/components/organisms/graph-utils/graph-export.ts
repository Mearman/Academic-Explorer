/**
 * Utilities for exporting graph visualizations as PNG or SVG
 */

export interface ExportOptions {
  filename?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  scale?: number;
}

/**
 * Export SVG element as PNG image
 */
export async function exportGraphAsPNG(
  svgElement: SVGSVGElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = 'graph-export.png',
    width = svgElement.clientWidth || 800,
    height = svgElement.clientHeight || 600,
    backgroundColor = '#ffffff',
    scale = 2, // High DPI for better quality
  } = options;

  try {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Set canvas dimensions with scale for high DPI
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    // Scale the context to match
    context.scale(scale, scale);

    // Set background color
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    // Clone SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Set explicit dimensions on the clone
    svgClone.setAttribute('width', width.toString());
    svgClone.setAttribute('height', height.toString());
    
    // Remove any transform attributes that might cause issues
    svgClone.style.transform = '';
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create image and draw to canvas
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          context.drawImage(img, 0, 0, width, height);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              downloadBlob(blob, filename);
              resolve();
            } else {
              reject(new Error('Failed to create PNG blob'));
            }
          }, 'image/png');
          
          // Clean up
          URL.revokeObjectURL(svgUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load SVG image'));
        URL.revokeObjectURL(svgUrl);
      };
      
      img.src = svgUrl;
    });
  } catch (error) {
    console.error('Failed to export PNG:', error);
    throw error;
  }
}

/**
 * Export SVG element as SVG file
 */
export function exportGraphAsSVG(
  svgElement: SVGSVGElement,
  options: ExportOptions = {}
): void {
  const {
    filename = 'graph-export.svg',
    width = svgElement.clientWidth || 800,
    height = svgElement.clientHeight || 600,
  } = options;

  try {
    // Clone SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Set explicit dimensions
    svgClone.setAttribute('width', width.toString());
    svgClone.setAttribute('height', height.toString());
    
    // Add XML namespace if not present
    if (!svgClone.hasAttribute('xmlns')) {
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    
    // Remove any transform styles that might cause issues
    svgClone.style.transform = '';
    
    // Add CSS styles inline for better compatibility
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleElement.textContent = getInlineStyles();
    svgClone.insertBefore(styleElement, svgClone.firstChild);
    
    // Serialize SVG
    const svgData = new XMLSerializer().serializeToString(svgClone);
    
    // Create blob and download
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Failed to export SVG:', error);
    throw error;
  }
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Get inline CSS styles for SVG export
 * This ensures the exported SVG maintains its appearance
 */
function getInlineStyles(): string {
  return `
    .graph-vertex {
      stroke: #374151;
      stroke-width: 2;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .graph-vertex-directly-visited {
      stroke-width: 3;
    }
    
    .graph-vertex-discovered {
      stroke-width: 1;
      opacity: 0.8;
    }
    
    .graph-vertex-selected {
      stroke: #3b82f6;
      stroke-width: 3;
    }
    
    .graph-vertex-hovered {
      stroke: #1d4ed8;
      stroke-width: 4;
    }
    
    .graph-edge {
      stroke: #6b7280;
      stroke-width: 1;
      fill: none;
      opacity: 0.6;
    }
    
    .graph-edge-highlighted {
      stroke: #3b82f6;
      stroke-width: 2;
      opacity: 1;
    }
    
    .graph-vertex-label {
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      font-size: 12px;
      text-anchor: middle;
      fill: #374151;
      pointer-events: none;
    }
    
    .graph-visit-count {
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      font-size: 10px;
      text-anchor: middle;
      fill: #ffffff;
      font-weight: bold;
      pointer-events: none;
    }
  `;
}

/**
 * Generate a timestamp-based filename
 */
export function generateExportFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}-${timestamp}.${extension}`;
}

/**
 * Get the optimal export dimensions based on the graph content
 */
export function getOptimalExportDimensions(
  svgElement: SVGSVGElement,
  padding: number = 50
): { width: number; height: number } {
  try {
    const bbox = svgElement.getBBox();
    return {
      width: Math.max(800, bbox.width + padding * 2),
      height: Math.max(600, bbox.height + padding * 2),
    };
  } catch {
    // Fallback to default dimensions if getBBox fails
    return { width: 800, height: 600 };
  }
}