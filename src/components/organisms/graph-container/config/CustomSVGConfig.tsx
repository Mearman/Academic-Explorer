import React, { useCallback, useMemo } from 'react';

import {
  FormSection,
  Select,
  NumberInput,
  Switch,
  TextInput,
  ColorPicker,
  ValidationUtils,
  type ValidationResult,
  type SelectOption,
} from './ConfigFormControls';

// ============================================================================
// SVG Configuration Types
// ============================================================================

export interface SVGRenderingConfig {
  // SVG Rendering Settings
  vectorisation: 'precise' | 'optimised' | 'minimal';
  strokeRendering: 'crisp' | 'smooth' | 'auto';
  textRendering: 'precise' | 'speed' | 'legible';
  
  // Export Settings
  exportFormat: 'svg' | 'pdf' | 'eps';
  embedFonts: boolean;
  optimiseOutput: boolean;
  includeMetadata: boolean;
  
  // Styling Options
  useWebFonts: boolean;
  customCSS: string;
  inlineStyles: boolean;
  
  // Performance Settings
  levelOfDetail: boolean;
  maxDetailLevel: number;
  simplifyPaths: boolean;
  pathPrecision: number;
}

export interface SVGLayoutConfig {
  // Canvas Settings
  canvasWidth: number;
  canvasHeight: number;
  viewBoxAuto: boolean;
  preserveAspectRatio: 'none' | 'xMidYMid meet' | 'xMidYMid slice';
  
  // Margins and Padding
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  
  // Grid and Guides
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  showGuides: boolean;
}

export interface SVGVisualConfig {
  // Vertex Styling
  vertexDefaults: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    radius: number;
    opacity: number;
  };
  
  // Edge Styling  
  edgeDefaults: {
    stroke: string;
    strokeWidth: number;
    strokeDasharray: string;
    opacity: number;
    markerEnd: 'none' | 'arrow' | 'circle' | 'square';
  };
  
  // Labels
  labelDefaults: {
    fontFamily: string;
    fontSize: number;
    fill: string;
    textAnchor: 'start' | 'middle' | 'end';
    dominantBaseline: 'auto' | 'middle' | 'hanging';
  };
  
  // Themes
  theme: 'default' | 'dark' | 'light' | 'high-contrast' | 'custom';
  customTheme?: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface CustomSVGConfig {
  rendering: SVGRenderingConfig;
  layout: SVGLayoutConfig;
  visual: SVGVisualConfig;
}

// ============================================================================
// Configuration Props
// ============================================================================

export interface CustomSVGConfigProps {
  config: CustomSVGConfig;
  onChange: (config: CustomSVGConfig) => void;
  onValidationChange?: (validation: ValidationResult) => void;
  compact?: boolean;
  showPreview?: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const defaultCustomSVGConfig: CustomSVGConfig = {
  rendering: {
    vectorisation: 'optimised',
    strokeRendering: 'crisp',
    textRendering: 'legible',
    exportFormat: 'svg',
    embedFonts: true,
    optimiseOutput: true,
    includeMetadata: false,
    useWebFonts: false,
    customCSS: '',
    inlineStyles: true,
    levelOfDetail: true,
    maxDetailLevel: 3,
    simplifyPaths: false,
    pathPrecision: 2,
  },
  layout: {
    canvasWidth: 1200,
    canvasHeight: 800,
    viewBoxAuto: true,
    preserveAspectRatio: 'xMidYMid meet',
    margins: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    },
    showGrid: false,
    gridSize: 20,
    gridColor: '#e5e7eb',
    showGuides: false,
  },
  visual: {
    vertexDefaults: {
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 1,
      radius: 8,
      opacity: 1,
    },
    edgeDefaults: {
      stroke: '#6b7280',
      strokeWidth: 1,
      strokeDasharray: '',
      opacity: 0.8,
      markerEnd: 'arrow',
    },
    labelDefaults: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 12,
      fill: '#374151',
      textAnchor: 'middle',
      dominantBaseline: 'middle',
    },
    theme: 'default',
  },
};

// ============================================================================
// Configuration Form Component
// ============================================================================

export function CustomSVGConfig({
  config,
  onChange,
  onValidationChange,
  compact = false,
  showPreview = false,
}: CustomSVGConfigProps) {
  
  // ============================================================================
  // Validation
  // ============================================================================
  
  const validation = useMemo(() => {
    const canvasValidation = ValidationUtils.combine(
      ValidationUtils.number(config.layout.canvasWidth, { min: 100, max: 10000 }, 'Canvas width'),
      ValidationUtils.number(config.layout.canvasHeight, { min: 100, max: 10000 }, 'Canvas height')
    );
    
    const marginValidation = ValidationUtils.combine(
      ValidationUtils.number(config.layout.margins.top, { min: 0, max: 200 }, 'Top margin'),
      ValidationUtils.number(config.layout.margins.right, { min: 0, max: 200 }, 'Right margin'),
      ValidationUtils.number(config.layout.margins.bottom, { min: 0, max: 200 }, 'Bottom margin'),
      ValidationUtils.number(config.layout.margins.left, { min: 0, max: 200 }, 'Left margin')
    );
    
    const visualValidation = ValidationUtils.combine(
      ValidationUtils.color(config.visual.vertexDefaults.fill, 'Vertex fill'),
      ValidationUtils.color(config.visual.vertexDefaults.stroke, 'Vertex stroke'),
      ValidationUtils.color(config.visual.edgeDefaults.stroke, 'Edge stroke'),
      ValidationUtils.color(config.visual.labelDefaults.fill, 'Label fill'),
      ValidationUtils.number(config.visual.vertexDefaults.radius, { min: 1, max: 50 }, 'Vertex radius'),
      ValidationUtils.number(config.visual.labelDefaults.fontSize, { min: 8, max: 72 }, 'Font size')
    );
    
    return ValidationUtils.combine(canvasValidation, marginValidation, visualValidation);
  }, [config]);
  
  React.useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);
  
  // ============================================================================
  // Update Handlers
  // ============================================================================
  
  const updateRendering = useCallback((updates: Partial<SVGRenderingConfig>) => {
    onChange({
      ...config,
      rendering: { ...config.rendering, ...updates },
    });
  }, [config, onChange]);
  
  const updateLayout = useCallback((updates: Partial<SVGLayoutConfig>) => {
    onChange({
      ...config,
      layout: { ...config.layout, ...updates },
    });
  }, [config, onChange]);
  
  const updateMargins = useCallback((key: keyof SVGLayoutConfig['margins'], value: number) => {
    onChange({
      ...config,
      layout: {
        ...config.layout,
        margins: { ...config.layout.margins, [key]: value },
      },
    });
  }, [config, onChange]);
  
  const updateVisual = useCallback((updates: Partial<SVGVisualConfig>) => {
    onChange({
      ...config,
      visual: { ...config.visual, ...updates },
    });
  }, [config, onChange]);
  
  const updateVertexDefaults = useCallback((updates: Partial<SVGVisualConfig['vertexDefaults']>) => {
    onChange({
      ...config,
      visual: {
        ...config.visual,
        vertexDefaults: { ...config.visual.vertexDefaults, ...updates },
      },
    });
  }, [config, onChange]);
  
  const updateEdgeDefaults = useCallback((updates: Partial<SVGVisualConfig['edgeDefaults']>) => {
    onChange({
      ...config,
      visual: {
        ...config.visual,
        edgeDefaults: { ...config.visual.edgeDefaults, ...updates },
      },
    });
  }, [config, onChange]);
  
  const updateLabelDefaults = useCallback((updates: Partial<SVGVisualConfig['labelDefaults']>) => {
    onChange({
      ...config,
      visual: {
        ...config.visual,
        labelDefaults: { ...config.visual.labelDefaults, ...updates },
      },
    });
  }, [config, onChange]);
  
  // ============================================================================
  // Option Lists
  // ============================================================================
  
  const vectorisationOptions: SelectOption[] = [
    { value: 'precise', label: 'Precise', description: 'Highest quality, largest file size' },
    { value: 'optimised', label: 'Optimised', description: 'Balanced quality and size' },
    { value: 'minimal', label: 'Minimal', description: 'Smallest size, reduced quality' },
  ];
  
  const strokeRenderingOptions: SelectOption[] = [
    { value: 'crisp', label: 'Crisp Edges', description: 'Sharp, pixel-aligned lines' },
    { value: 'smooth', label: 'Smooth', description: 'Anti-aliased rendering' },
    { value: 'auto', label: 'Auto', description: 'Browser decides best method' },
  ];
  
  const textRenderingOptions: SelectOption[] = [
    { value: 'precise', label: 'Precise', description: 'Exact positioning and spacing' },
    { value: 'speed', label: 'Speed', description: 'Optimised for performance' },
    { value: 'legible', label: 'Legible', description: 'Optimised for readability' },
  ];
  
  const exportFormatOptions: SelectOption[] = [
    { value: 'svg', label: 'SVG', description: 'Scalable Vector Graphics' },
    { value: 'pdf', label: 'PDF', description: 'Portable Document Format' },
    { value: 'eps', label: 'EPS', description: 'Encapsulated PostScript' },
  ];
  
  const aspectRatioOptions: SelectOption[] = [
    { value: 'none', label: 'None', description: 'Stretch to fill' },
    { value: 'xMidYMid meet', label: 'Fit (Meet)', description: 'Scale to fit within bounds' },
    { value: 'xMidYMid slice', label: 'Fill (Slice)', description: 'Scale to fill, may crop' },
  ];
  
  const markerOptions: SelectOption[] = [
    { value: 'none', label: 'None' },
    { value: 'arrow', label: 'Arrow' },
    { value: 'circle', label: 'Circle' },
    { value: 'square', label: 'Square' },
  ];
  
  const textAnchorOptions: SelectOption[] = [
    { value: 'start', label: 'Start (Left)' },
    { value: 'middle', label: 'Middle (Center)' },
    { value: 'end', label: 'End (Right)' },
  ];
  
  const baselineOptions: SelectOption[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'middle', label: 'Middle' },
    { value: 'hanging', label: 'Hanging' },
  ];
  
  const themeOptions: SelectOption[] = [
    { value: 'default', label: 'Default' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'high-contrast', label: 'High Contrast' },
    { value: 'custom', label: 'Custom' },
  ];
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div style={{ maxWidth: compact ? undefined : '600px' }}>
      {/* Rendering Configuration */}
      <FormSection
        title="SVG Rendering"
        description="Configure how the SVG is generated and optimised"
        collapsible={compact}
        defaultExpanded={!compact}
      >
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <Select
            label="Vectorisation Quality"
            value={config.rendering.vectorisation}
            onChange={(value) => updateRendering({ vectorisation: value as SVGRenderingConfig['vectorisation'] })}
            options={vectorisationOptions}
            description="Balance between quality and file size"
          />
          
          <Select
            label="Stroke Rendering"
            value={config.rendering.strokeRendering}
            onChange={(value) => updateRendering({ strokeRendering: value as SVGRenderingConfig['strokeRendering'] })}
            options={strokeRenderingOptions}
          />
          
          <Select
            label="Text Rendering"
            value={config.rendering.textRendering}
            onChange={(value) => updateRendering({ textRendering: value as SVGRenderingConfig['textRendering'] })}
            options={textRenderingOptions}
          />
          
          <Select
            label="Export Format"
            value={config.rendering.exportFormat}
            onChange={(value) => updateRendering({ exportFormat: value as SVGRenderingConfig['exportFormat'] })}
            options={exportFormatOptions}
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <Switch
            label="Embed Fonts"
            checked={config.rendering.embedFonts}
            onChange={(checked) => updateRendering({ embedFonts: checked })}
            description="Include fonts in the SVG file"
          />
          
          <Switch
            label="Optimise Output"
            checked={config.rendering.optimiseOutput}
            onChange={(checked) => updateRendering({ optimiseOutput: checked })}
            description="Compress and optimise the generated SVG"
          />
          
          <Switch
            label="Include Metadata"
            checked={config.rendering.includeMetadata}
            onChange={(checked) => updateRendering({ includeMetadata: checked })}
            description="Add creation and modification metadata"
          />
          
          <Switch
            label="Use Web Fonts"
            checked={config.rendering.useWebFonts}
            onChange={(checked) => updateRendering({ useWebFonts: checked })}
            description="Load fonts from web sources"
          />
        </div>
        
        {config.rendering.useWebFonts && (
          <TextInput
            label="Custom CSS"
            value={config.rendering.customCSS}
            onChange={(value) => updateRendering({ customCSS: value })}
            placeholder="@import url('https://fonts.googleapis.com/css2?family=...');"
            description="Additional CSS for web fonts and styling"
          />
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <NumberInput
            label="Path Precision"
            value={config.rendering.pathPrecision}
            onChange={(value) => updateRendering({ pathPrecision: value })}
            range={{ min: 0, max: 10, step: 1 }}
            description="Decimal places for path coordinates"
          />
          
          <NumberInput
            label="Max Detail Level"
            value={config.rendering.maxDetailLevel}
            onChange={(value) => updateRendering({ maxDetailLevel: value })}
            range={{ min: 1, max: 10, step: 1 }}
            description="Maximum level of detail for complex shapes"
          />
        </div>
        
        <Switch
          label="Level of Detail"
          checked={config.rendering.levelOfDetail}
          onChange={(checked) => updateRendering({ levelOfDetail: checked })}
          description="Reduce detail at lower zoom levels"
        />
      </FormSection>
      
      {/* Layout Configuration */}
      <FormSection
        title="Canvas & Layout"
        description="Configure the SVG canvas size and layout properties"
        collapsible={compact}
        defaultExpanded={!compact}
      >
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <NumberInput
            label="Canvas Width"
            value={config.layout.canvasWidth}
            onChange={(value) => updateLayout({ canvasWidth: value })}
            range={{ min: 100, max: 10000, step: 10 }}
            unit="px"
            validation={ValidationUtils.number(config.layout.canvasWidth, { min: 100, max: 10000 }, 'Canvas width')}
          />
          
          <NumberInput
            label="Canvas Height"
            value={config.layout.canvasHeight}
            onChange={(value) => updateLayout({ canvasHeight: value })}
            range={{ min: 100, max: 10000, step: 10 }}
            unit="px"
            validation={ValidationUtils.number(config.layout.canvasHeight, { min: 100, max: 10000 }, 'Canvas height')}
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <Switch
            label="Auto ViewBox"
            checked={config.layout.viewBoxAuto}
            onChange={(checked) => updateLayout({ viewBoxAuto: checked })}
            description="Automatically calculate viewBox from content"
          />
          
          <Select
            label="Aspect Ratio"
            value={config.layout.preserveAspectRatio}
            onChange={(value) => updateLayout({ preserveAspectRatio: value as SVGLayoutConfig['preserveAspectRatio'] })}
            options={aspectRatioOptions}
            description="How to handle aspect ratio scaling"
          />
        </div>
        
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Margins
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
          <NumberInput
            label="Top"
            value={config.layout.margins.top}
            onChange={(value) => updateMargins('top', value)}
            range={{ min: 0, max: 200, step: 5 }}
            unit="px"
          />
          <NumberInput
            label="Right"
            value={config.layout.margins.right}
            onChange={(value) => updateMargins('right', value)}
            range={{ min: 0, max: 200, step: 5 }}
            unit="px"
          />
          <NumberInput
            label="Bottom"
            value={config.layout.margins.bottom}
            onChange={(value) => updateMargins('bottom', value)}
            range={{ min: 0, max: 200, step: 5 }}
            unit="px"
          />
          <NumberInput
            label="Left"
            value={config.layout.margins.left}
            onChange={(value) => updateMargins('left', value)}
            range={{ min: 0, max: 200, step: 5 }}
            unit="px"
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <Switch
            label="Show Grid"
            checked={config.layout.showGrid}
            onChange={(checked) => updateLayout({ showGrid: checked })}
            description="Display background grid for alignment"
          />
          
          {config.layout.showGrid && (
            <>
              <NumberInput
                label="Grid Size"
                value={config.layout.gridSize}
                onChange={(value) => updateLayout({ gridSize: value })}
                range={{ min: 5, max: 100, step: 5 }}
                unit="px"
              />
              
              <ColorPicker
                label="Grid Color"
                value={config.layout.gridColor}
                onChange={(value) => updateLayout({ gridColor: value })}
              />
            </>
          )}
        </div>
      </FormSection>
      
      {/* Visual Styling */}
      <FormSection
        title="Visual Styling"
        description="Configure default appearance for vertices, edges, and labels"
        collapsible={compact}
        defaultExpanded={!compact}
      >
        <Select
          label="Theme"
          value={config.visual.theme}
          onChange={(value) => updateVisual({ theme: value as SVGVisualConfig['theme'] })}
          options={themeOptions}
          description="Predefined colour schemes"
        />
        
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Vertex Defaults
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr', gap: '1rem' }}>
          <ColorPicker
            label="Fill Color"
            value={config.visual.vertexDefaults.fill}
            onChange={(value) => updateVertexDefaults({ fill: value })}
            validation={ValidationUtils.color(config.visual.vertexDefaults.fill)}
          />
          
          <ColorPicker
            label="Stroke Color"
            value={config.visual.vertexDefaults.stroke}
            onChange={(value) => updateVertexDefaults({ stroke: value })}
            validation={ValidationUtils.color(config.visual.vertexDefaults.stroke)}
          />
          
          <NumberInput
            label="Radius"
            value={config.visual.vertexDefaults.radius}
            onChange={(value) => updateVertexDefaults({ radius: value })}
            range={{ min: 1, max: 50, step: 1 }}
            unit="px"
            validation={ValidationUtils.number(config.visual.vertexDefaults.radius, { min: 1, max: 50 })}
          />
        </div>
        
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Edge Defaults
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr', gap: '1rem' }}>
          <ColorPicker
            label="Stroke Color"
            value={config.visual.edgeDefaults.stroke}
            onChange={(value) => updateEdgeDefaults({ stroke: value })}
            validation={ValidationUtils.color(config.visual.edgeDefaults.stroke)}
          />
          
          <NumberInput
            label="Stroke Width"
            value={config.visual.edgeDefaults.strokeWidth}
            onChange={(value) => updateEdgeDefaults({ strokeWidth: value })}
            range={{ min: 0.1, max: 10, step: 0.1 }}
            unit="px"
            precision={1}
          />
          
          <Select
            label="Arrow Style"
            value={config.visual.edgeDefaults.markerEnd}
            onChange={(value) => updateEdgeDefaults({ markerEnd: value as SVGVisualConfig['edgeDefaults']['markerEnd'] })}
            options={markerOptions}
          />
        </div>
        
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Label Defaults
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <TextInput
            label="Font Family"
            value={config.visual.labelDefaults.fontFamily}
            onChange={(value) => updateLabelDefaults({ fontFamily: value })}
            placeholder="system-ui, sans-serif"
            description="CSS font family specification"
          />
          
          <NumberInput
            label="Font Size"
            value={config.visual.labelDefaults.fontSize}
            onChange={(value) => updateLabelDefaults({ fontSize: value })}
            range={{ min: 8, max: 72, step: 1 }}
            unit="px"
            validation={ValidationUtils.number(config.visual.labelDefaults.fontSize, { min: 8, max: 72 })}
          />
          
          <ColorPicker
            label="Text Color"
            value={config.visual.labelDefaults.fill}
            onChange={(value) => updateLabelDefaults({ fill: value })}
            validation={ValidationUtils.color(config.visual.labelDefaults.fill)}
          />
          
          <Select
            label="Text Anchor"
            value={config.visual.labelDefaults.textAnchor}
            onChange={(value) => updateLabelDefaults({ textAnchor: value as SVGVisualConfig['labelDefaults']['textAnchor'] })}
            options={textAnchorOptions}
            description="Horizontal text alignment"
          />
        </div>
      </FormSection>
      
      {/* Preview Section */}
      {showPreview && (
        <FormSection title="Preview" description="Preview of current SVG styling">
          <div
            style={{
              width: '100%',
              height: '200px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              backgroundColor: 'var(--color-cardBackground)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-muted)',
            }}
          >
            SVG Preview (Implementation needed)
          </div>
        </FormSection>
      )}
    </div>
  );
}

// ============================================================================
// Configuration Presets
// ============================================================================

export const svgConfigPresets: Record<string, { name: string; config: CustomSVGConfig }> = {
  'high-quality': {
    name: 'High Quality',
    config: {
      ...defaultCustomSVGConfig,
      rendering: {
        ...defaultCustomSVGConfig.rendering,
        vectorisation: 'precise',
        strokeRendering: 'smooth',
        textRendering: 'precise',
        embedFonts: true,
        pathPrecision: 4,
      },
    },
  },
  'web-optimised': {
    name: 'Web Optimised',
    config: {
      ...defaultCustomSVGConfig,
      rendering: {
        ...defaultCustomSVGConfig.rendering,
        vectorisation: 'optimised',
        optimiseOutput: true,
        pathPrecision: 2,
        levelOfDetail: true,
      },
    },
  },
  'minimal': {
    name: 'Minimal Size',
    config: {
      ...defaultCustomSVGConfig,
      rendering: {
        ...defaultCustomSVGConfig.rendering,
        vectorisation: 'minimal',
        optimiseOutput: true,
        embedFonts: false,
        includeMetadata: false,
        pathPrecision: 1,
        simplifyPaths: true,
      },
    },
  },
};