/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useMemo } from 'react';

import {
  FormSection,
  Select,
  NumberInput,
  Switch,
  RangeSlider,
  ValidationUtils,
  type ValidationResult,
  type SelectOption,
} from './ConfigFormControls';

// ============================================================================
// WebGL Configuration Types
// ============================================================================

export interface WebGLPerformanceConfig {
  // Rendering Performance
  maxFrameRate: number;
  vsync: boolean;
  renderingMode: 'immediate' | 'deferred' | 'adaptive';
  
  // Memory Management
  maxBufferSize: number;
  bufferPooling: boolean;
  autoGarbageCollection: boolean;
  memoryLimit: number; // MB
  
  // Level of Detail
  enableLOD: boolean;
  lodLevels: number;
  lodDistance: number;
  lodTransition: 'immediate' | 'smooth' | 'fade';
  
  // Frustum Culling
  frustumCulling: boolean;
  cullMargin: number;
  
  // Batch Processing
  batchRendering: boolean;
  maxBatchSize: number;
  instancedRendering: boolean;
}

export interface WebGLShaderConfig {
  // Vertex Shaders
  vertexShaderProfile: 'basic' | 'standard' | 'advanced' | 'custom';
  customVertexShader?: string;
  
  // Fragment Shaders
  fragmentShaderProfile: 'basic' | 'standard' | 'advanced' | 'custom';
  customFragmentShader?: string;
  
  // Shader Features
  enableShadows: boolean;
  shadowQuality: 'low' | 'medium' | 'high' | 'ultra';
  shadowMapSize: 512 | 1024 | 2048 | 4096;
  
  // Lighting
  enableLighting: boolean;
  lightingModel: 'phong' | 'blinn-phong' | 'pbr' | 'custom';
  ambientLight: number;
  directionalLight: boolean;
  
  // Effects
  enableAntialiasing: boolean;
  antialiasingMode: 'none' | 'fxaa' | 'msaa' | 'smaa' | 'taa';
  antialiasingQuality: 'low' | 'medium' | 'high' | 'ultra';
  
  // Post-processing
  enablePostProcessing: boolean;
  bloomEffect: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  
  // Edge Enhancement
  edgeDetection: boolean;
  edgeThickness: number;
  edgeColor: string;
}

export interface WebGLRenderingConfig {
  // Canvas Settings
  contextVersion: '1' | '2';
  preserveDrawingBuffer: boolean;
  premultipliedAlpha: boolean;
  antialias: boolean;
  
  // Clear Settings
  clearColor: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  clearDepth: number;
  clearStencil: number;
  
  // Depth Testing
  depthTest: boolean;
  depthFunc: 'never' | 'less' | 'equal' | 'lequal' | 'greater' | 'notequal' | 'gequal' | 'always';
  depthMask: boolean;
  
  // Blending
  blending: boolean;
  blendSrc: 'zero' | 'one' | 'src-alpha' | 'one-minus-src-alpha' | 'dst-alpha' | 'one-minus-dst-alpha';
  blendDst: 'zero' | 'one' | 'src-alpha' | 'one-minus-src-alpha' | 'dst-alpha' | 'one-minus-dst-alpha';
  blendEquation: 'add' | 'subtract' | 'reverse-subtract';
  
  // Culling
  cullFace: boolean;
  cullFaceMode: 'front' | 'back' | 'front-and-back';
  frontFace: 'cw' | 'ccw';
  
  // Viewport
  viewportScaling: 'none' | 'pixel-ratio' | 'custom';
  customViewportScale: number;
}

export interface CustomWebGLConfig {
  performance: WebGLPerformanceConfig;
  shaders: WebGLShaderConfig;
  rendering: WebGLRenderingConfig;
}

// ============================================================================
// Configuration Props
// ============================================================================

export interface CustomWebGLConfigProps {
  config: CustomWebGLConfig;
  onChange: (config: CustomWebGLConfig) => void;
  onValidationChange?: (validation: ValidationResult) => void;
  compact?: boolean;
  showPreview?: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const defaultCustomWebGLConfig: CustomWebGLConfig = {
  performance: {
    maxFrameRate: 60,
    vsync: true,
    renderingMode: 'adaptive',
    maxBufferSize: 32 * 1024 * 1024, // 32MB
    bufferPooling: true,
    autoGarbageCollection: true,
    memoryLimit: 512,
    enableLOD: true,
    lodLevels: 3,
    lodDistance: 1000,
    lodTransition: 'smooth',
    frustumCulling: true,
    cullMargin: 10,
    batchRendering: true,
    maxBatchSize: 1000,
    instancedRendering: true,
  },
  shaders: {
    vertexShaderProfile: 'standard',
    fragmentShaderProfile: 'standard',
    enableShadows: false,
    shadowQuality: 'medium',
    shadowMapSize: 1024,
    enableLighting: true,
    lightingModel: 'phong',
    ambientLight: 0.2,
    directionalLight: true,
    enableAntialiasing: true,
    antialiasingMode: 'fxaa',
    antialiasingQuality: 'medium',
    enablePostProcessing: false,
    bloomEffect: false,
    bloomIntensity: 1.0,
    bloomThreshold: 0.8,
    edgeDetection: false,
    edgeThickness: 1.0,
    edgeColor: '#000000',
  },
  rendering: {
    contextVersion: '2',
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
    antialias: true,
    clearColor: { r: 0.95, g: 0.95, b: 0.95, a: 1.0 },
    clearDepth: 1.0,
    clearStencil: 0,
    depthTest: true,
    depthFunc: 'lequal',
    depthMask: true,
    blending: true,
    blendSrc: 'src-alpha',
    blendDst: 'one-minus-src-alpha',
    blendEquation: 'add',
    cullFace: true,
    cullFaceMode: 'back',
    frontFace: 'ccw',
    viewportScaling: 'pixel-ratio',
    customViewportScale: 1.0,
  },
};

// ============================================================================
// Configuration Form Component
// ============================================================================

// eslint-disable-next-line max-lines-per-function
export function CustomWebGLConfig({
  config,
  onChange,
  onValidationChange,
  compact = false,
  showPreview = false,
}: CustomWebGLConfigProps) {
  
  // ============================================================================
  // Validation
  // ============================================================================
  
  const validation = useMemo(() => {
    const performanceValidation = ValidationUtils.combine(
      ValidationUtils.number(config.performance.maxFrameRate, { min: 1, max: 240 }, 'Max frame rate'),
      ValidationUtils.number(config.performance.memoryLimit, { min: 64, max: 4096 }, 'Memory limit'),
      ValidationUtils.number(config.performance.lodLevels, { min: 1, max: 10 }, 'LOD levels'),
      ValidationUtils.number(config.performance.maxBatchSize, { min: 1, max: 10000 }, 'Max batch size')
    );
    
    const shaderValidation = ValidationUtils.combine(
      ValidationUtils.number(config.shaders.ambientLight, { min: 0, max: 1 }, 'Ambient light'),
      ValidationUtils.number(config.shaders.bloomIntensity, { min: 0, max: 5 }, 'Bloom intensity'),
      ValidationUtils.number(config.shaders.bloomThreshold, { min: 0, max: 1 }, 'Bloom threshold'),
      ValidationUtils.number(config.shaders.edgeThickness, { min: 0.1, max: 10 }, 'Edge thickness'),
      ValidationUtils.color(config.shaders.edgeColor, 'Edge color')
    );
    
    const renderingValidation = ValidationUtils.combine(
      ValidationUtils.number(config.rendering.clearColor.r, { min: 0, max: 1 }, 'Clear color red'),
      ValidationUtils.number(config.rendering.clearColor.g, { min: 0, max: 1 }, 'Clear color green'),
      ValidationUtils.number(config.rendering.clearColor.b, { min: 0, max: 1 }, 'Clear color blue'),
      ValidationUtils.number(config.rendering.clearColor.a, { min: 0, max: 1 }, 'Clear color alpha'),
      ValidationUtils.number(config.rendering.customViewportScale, { min: 0.1, max: 4 }, 'Viewport scale')
    );
    
    return ValidationUtils.combine(performanceValidation, shaderValidation, renderingValidation);
  }, [config]);
  
  React.useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);
  
  // ============================================================================
  // Update Handlers
  // ============================================================================
  
  const updatePerformance = useCallback((updates: Partial<WebGLPerformanceConfig>) => {
    onChange({
      ...config,
      performance: { ...config.performance, ...updates },
    });
  }, [config, onChange]);
  
  const updateShaders = useCallback((updates: Partial<WebGLShaderConfig>) => {
    onChange({
      ...config,
      shaders: { ...config.shaders, ...updates },
    });
  }, [config, onChange]);
  
  const updateRendering = useCallback((updates: Partial<WebGLRenderingConfig>) => {
    onChange({
      ...config,
      rendering: { ...config.rendering, ...updates },
    });
  }, [config, onChange]);
  
  const updateClearColor = useCallback((key: keyof WebGLRenderingConfig['clearColor'], value: number) => {
    onChange({
      ...config,
      rendering: {
        ...config.rendering,
        clearColor: { ...config.rendering.clearColor, [key]: value },
      },
    });
  }, [config, onChange]);
  
  // ============================================================================
  // Option Lists
  // ============================================================================
  
  const renderingModeOptions: SelectOption[] = [
    { value: 'immediate', label: 'Immediate', description: 'Render everything every frame' },
    { value: 'deferred', label: 'Deferred', description: 'Batch operations for efficiency' },
    { value: 'adaptive', label: 'Adaptive', description: 'Automatically choose best method' },
  ];
  
  const shaderProfileOptions: SelectOption[] = [
    { value: 'basic', label: 'Basic', description: 'Simple flat shading' },
    { value: 'standard', label: 'Standard', description: 'Standard Phong lighting' },
    { value: 'advanced', label: 'Advanced', description: 'PBR with multiple features' },
    { value: 'custom', label: 'Custom', description: 'User-defined shaders' },
  ];
  
  const shadowQualityOptions: SelectOption[] = [
    { value: 'low', label: 'Low (256px)' },
    { value: 'medium', label: 'Medium (512px)' },
    { value: 'high', label: 'High (1024px)' },
    { value: 'ultra', label: 'Ultra (2048px)' },
  ];
  
  const lightingModelOptions: SelectOption[] = [
    { value: 'phong', label: 'Phong', description: 'Classic Phong lighting' },
    { value: 'blinn-phong', label: 'Blinn-Phong', description: 'Improved specular highlights' },
    { value: 'pbr', label: 'PBR', description: 'Physically Based Rendering' },
    { value: 'custom', label: 'Custom', description: 'User-defined lighting' },
  ];
  
  const antialiasingModeOptions: SelectOption[] = [
    { value: 'none', label: 'None' },
    { value: 'fxaa', label: 'FXAA', description: 'Fast post-process AA' },
    { value: 'msaa', label: 'MSAA', description: 'Hardware multisampling' },
    { value: 'smaa', label: 'SMAA', description: 'Enhanced morphological AA' },
    { value: 'taa', label: 'TAA', description: 'Temporal antialiasing' },
  ];
  
  const qualityOptions: SelectOption[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'ultra', label: 'Ultra' },
  ];
  
  const contextVersionOptions: SelectOption[] = [
    { value: '1', label: 'WebGL 1.0' },
    { value: '2', label: 'WebGL 2.0 (Recommended)' },
  ];
  
  const depthFuncOptions: SelectOption[] = [
    { value: 'never', label: 'Never' },
    { value: 'less', label: 'Less' },
    { value: 'equal', label: 'Equal' },
    { value: 'lequal', label: 'Less or Equal' },
    { value: 'greater', label: 'Greater' },
    { value: 'notequal', label: 'Not Equal' },
    { value: 'gequal', label: 'Greater or Equal' },
    { value: 'always', label: 'Always' },
  ];
  
  const blendFactorOptions: SelectOption[] = [
    { value: 'zero', label: 'Zero' },
    { value: 'one', label: 'One' },
    { value: 'src-alpha', label: 'Source Alpha' },
    { value: 'one-minus-src-alpha', label: '1 - Source Alpha' },
    { value: 'dst-alpha', label: 'Destination Alpha' },
    { value: 'one-minus-dst-alpha', label: '1 - Destination Alpha' },
  ];
  
  const blendEquationOptions: SelectOption[] = [
    { value: 'add', label: 'Add' },
    { value: 'subtract', label: 'Subtract' },
    { value: 'reverse-subtract', label: 'Reverse Subtract' },
  ];
  
  const _cullFaceModeOptions: SelectOption[] = [
    { value: 'front', label: 'Front' },
    { value: 'back', label: 'Back' },
    { value: 'front-and-back', label: 'Front and Back' },
  ];
  
  const _windingOrderOptions: SelectOption[] = [
    { value: 'cw', label: 'Clockwise' },
    { value: 'ccw', label: 'Counter-Clockwise' },
  ];
  
  const viewportScalingOptions: SelectOption[] = [
    { value: 'none', label: 'None (1:1)' },
    { value: 'pixel-ratio', label: 'Device Pixel Ratio' },
    { value: 'custom', label: 'Custom Scale' },
  ];
  
  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <div style={{ maxWidth: compact ? undefined : '600px' }}>
      {/* Performance Configuration */}
      <FormSection
        title="Performance Settings"
        description="Configure rendering performance and memory management"
        collapsible={compact}
        defaultExpanded={!compact}
      >
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <NumberInput
            label="Max Frame Rate"
            value={config.performance.maxFrameRate}
            onChange={(value) => updatePerformance({ maxFrameRate: value })}
            range={{ min: 1, max: 240, step: 1 }}
            unit="fps"
            validation={ValidationUtils.number(config.performance.maxFrameRate, { min: 1, max: 240 })}
            description="Target frames per second"
          />
          
          <Select
            label="Rendering Mode"
            value={config.performance.renderingMode}
            onChange={(value) => updatePerformance({ renderingMode: value as WebGLPerformanceConfig['renderingMode'] })}
            options={renderingModeOptions}
          />
          
          <NumberInput
            label="Memory Limit"
            value={config.performance.memoryLimit}
            onChange={(value) => updatePerformance({ memoryLimit: value })}
            range={{ min: 64, max: 4096, step: 64 }}
            unit="MB"
            validation={ValidationUtils.number(config.performance.memoryLimit, { min: 64, max: 4096 })}
          />
          
          <NumberInput
            label="Max Batch Size"
            value={config.performance.maxBatchSize}
            onChange={(value) => updatePerformance({ maxBatchSize: value })}
            range={{ min: 1, max: 10000, step: 100 }}
            unit="objects"
            validation={ValidationUtils.number(config.performance.maxBatchSize, { min: 1, max: 10000 })}
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <Switch
            label="VSync"
            checked={config.performance.vsync}
            onChange={(checked) => updatePerformance({ vsync: checked })}
            description="Synchronise with display refresh rate"
          />
          
          <Switch
            label="Buffer Pooling"
            checked={config.performance.bufferPooling}
            onChange={(checked) => updatePerformance({ bufferPooling: checked })}
            description="Reuse buffers to reduce memory allocation"
          />
          
          <Switch
            label="Auto Garbage Collection"
            checked={config.performance.autoGarbageCollection}
            onChange={(checked) => updatePerformance({ autoGarbageCollection: checked })}
            description="Automatically free unused GPU resources"
          />
          
          <Switch
            label="Instanced Rendering"
            checked={config.performance.instancedRendering}
            onChange={(checked) => updatePerformance({ instancedRendering: checked })}
            description="Use GPU instancing for repeated geometry"
          />
        </div>
        
        {/* Level of Detail Settings */}
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Level of Detail
        </h4>
        <Switch
          label="Enable LOD"
          checked={config.performance.enableLOD}
          onChange={(checked) => updatePerformance({ enableLOD: checked })}
          description="Reduce detail for distant objects"
        />
        
        {config.performance.enableLOD && (
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            <NumberInput
              label="LOD Levels"
              value={config.performance.lodLevels}
              onChange={(value) => updatePerformance({ lodLevels: value })}
              range={{ min: 1, max: 10, step: 1 }}
              validation={ValidationUtils.number(config.performance.lodLevels, { min: 1, max: 10 })}
            />
            
            <NumberInput
              label="LOD Distance"
              value={config.performance.lodDistance}
              onChange={(value) => updatePerformance({ lodDistance: value })}
              range={{ min: 100, max: 10000, step: 100 }}
              unit="units"
            />
          </div>
        )}
      </FormSection>
      
      {/* Shader Configuration */}
      <FormSection
        title="Shader Settings"
        description="Configure shaders, lighting, and visual effects"
        collapsible={compact}
        defaultExpanded={!compact}
      >
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <Select
            label="Vertex Shader Profile"
            value={config.shaders.vertexShaderProfile}
            onChange={(value) => updateShaders({ vertexShaderProfile: value as WebGLShaderConfig['vertexShaderProfile'] })}
            options={shaderProfileOptions}
          />
          
          <Select
            label="Fragment Shader Profile"
            value={config.shaders.fragmentShaderProfile}
            onChange={(value) => updateShaders({ fragmentShaderProfile: value as WebGLShaderConfig['fragmentShaderProfile'] })}
            options={shaderProfileOptions}
          />
        </div>
        
        {/* Lighting Settings */}
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Lighting
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <Switch
            label="Enable Lighting"
            checked={config.shaders.enableLighting}
            onChange={(checked) => updateShaders({ enableLighting: checked })}
          />
          
          {config.shaders.enableLighting && (
            <>
              <Select
                label="Lighting Model"
                value={config.shaders.lightingModel}
                onChange={(value) => updateShaders({ lightingModel: value as WebGLShaderConfig['lightingModel'] })}
                options={lightingModelOptions}
              />
              
              <RangeSlider
                label="Ambient Light"
                value={config.shaders.ambientLight}
                onChange={(value) => updateShaders({ ambientLight: value })}
                range={{ min: 0, max: 1, step: 0.1 }}
                validation={ValidationUtils.number(config.shaders.ambientLight, { min: 0, max: 1 })}
              />
              
              <Switch
                label="Directional Light"
                checked={config.shaders.directionalLight}
                onChange={(checked) => updateShaders({ directionalLight: checked })}
                description="Add main directional light source"
              />
            </>
          )}
        </div>
        
        {/* Shadow Settings */}
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Shadows
        </h4>
        <Switch
          label="Enable Shadows"
          checked={config.shaders.enableShadows}
          onChange={(checked) => updateShaders({ enableShadows: checked })}
        />
        
        {config.shaders.enableShadows && (
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            <Select
              label="Shadow Quality"
              value={config.shaders.shadowQuality}
              onChange={(value) => updateShaders({ shadowQuality: value as WebGLShaderConfig['shadowQuality'] })}
              options={shadowQualityOptions}
            />
            
            <Select
              label="Shadow Map Size"
              value={config.shaders.shadowMapSize.toString()}
              onChange={(value) => updateShaders({ shadowMapSize: parseInt(value, 10) as WebGLShaderConfig['shadowMapSize'] })}
              options={[
                { value: '512', label: '512px' },
                { value: '1024', label: '1024px' },
                { value: '2048', label: '2048px' },
                { value: '4096', label: '4096px' },
              ]}
            />
          </div>
        )}
        
        {/* Antialiasing Settings */}
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Antialiasing
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <Switch
            label="Enable Antialiasing"
            checked={config.shaders.enableAntialiasing}
            onChange={(checked) => updateShaders({ enableAntialiasing: checked })}
          />
          
          {config.shaders.enableAntialiasing && (
            <>
              <Select
                label="AA Mode"
                value={config.shaders.antialiasingMode}
                onChange={(value) => updateShaders({ antialiasingMode: value as WebGLShaderConfig['antialiasingMode'] })}
                options={antialiasingModeOptions}
              />
              
              <Select
                label="AA Quality"
                value={config.shaders.antialiasingQuality}
                onChange={(value) => updateShaders({ antialiasingQuality: value as WebGLShaderConfig['antialiasingQuality'] })}
                options={qualityOptions}
              />
            </>
          )}
        </div>
        
        {/* Post-processing Effects */}
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Post-Processing Effects
        </h4>
        <Switch
          label="Enable Post-Processing"
          checked={config.shaders.enablePostProcessing}
          onChange={(checked) => updateShaders({ enablePostProcessing: checked })}
        />
        
        {config.shaders.enablePostProcessing && (
          <div style={{ marginTop: '0.5rem' }}>
            <Switch
              label="Bloom Effect"
              checked={config.shaders.bloomEffect}
              onChange={(checked) => updateShaders({ bloomEffect: checked })}
              description="Add glowing effect to bright areas"
            />
            
            {config.shaders.bloomEffect && (
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <RangeSlider
                  label="Bloom Intensity"
                  value={config.shaders.bloomIntensity}
                  onChange={(value) => updateShaders({ bloomIntensity: value })}
                  range={{ min: 0, max: 5, step: 0.1 }}
                  validation={ValidationUtils.number(config.shaders.bloomIntensity, { min: 0, max: 5 })}
                />
                
                <RangeSlider
                  label="Bloom Threshold"
                  value={config.shaders.bloomThreshold}
                  onChange={(value) => updateShaders({ bloomThreshold: value })}
                  range={{ min: 0, max: 1, step: 0.05 }}
                  validation={ValidationUtils.number(config.shaders.bloomThreshold, { min: 0, max: 1 })}
                />
              </div>
            )}
          </div>
        )}
      </FormSection>
      
      {/* Rendering Configuration */}
      <FormSection
        title="Rendering Settings"
        description="Configure WebGL context and rendering pipeline"
        collapsible={compact}
        defaultExpanded={!compact}
      >
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <Select
            label="WebGL Version"
            value={config.rendering.contextVersion}
            onChange={(value) => updateRendering({ contextVersion: value as WebGLRenderingConfig['contextVersion'] })}
            options={contextVersionOptions}
            description="WebGL context version to use"
          />
          
          <Select
            label="Viewport Scaling"
            value={config.rendering.viewportScaling}
            onChange={(value) => updateRendering({ viewportScaling: value as WebGLRenderingConfig['viewportScaling'] })}
            options={viewportScalingOptions}
          />
        </div>
        
        {config.rendering.viewportScaling === 'custom' && (
          <NumberInput
            label="Custom Viewport Scale"
            value={config.rendering.customViewportScale}
            onChange={(value) => updateRendering({ customViewportScale: value })}
            range={{ min: 0.1, max: 4, step: 0.1 }}
            precision={1}
            validation={ValidationUtils.number(config.rendering.customViewportScale, { min: 0.1, max: 4 })}
          />
        )}
        
        {/* Clear Settings */}
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Background Color (RGBA)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
          <RangeSlider
            label="Red"
            value={config.rendering.clearColor.r}
            onChange={(value) => updateClearColor('r', value)}
            range={{ min: 0, max: 1, step: 0.01 }}
            validation={ValidationUtils.number(config.rendering.clearColor.r, { min: 0, max: 1 })}
          />
          <RangeSlider
            label="Green"
            value={config.rendering.clearColor.g}
            onChange={(value) => updateClearColor('g', value)}
            range={{ min: 0, max: 1, step: 0.01 }}
            validation={ValidationUtils.number(config.rendering.clearColor.g, { min: 0, max: 1 })}
          />
          <RangeSlider
            label="Blue"
            value={config.rendering.clearColor.b}
            onChange={(value) => updateClearColor('b', value)}
            range={{ min: 0, max: 1, step: 0.01 }}
            validation={ValidationUtils.number(config.rendering.clearColor.b, { min: 0, max: 1 })}
          />
          <RangeSlider
            label="Alpha"
            value={config.rendering.clearColor.a}
            onChange={(value) => updateClearColor('a', value)}
            range={{ min: 0, max: 1, step: 0.01 }}
            validation={ValidationUtils.number(config.rendering.clearColor.a, { min: 0, max: 1 })}
          />
        </div>
        
        {/* Depth Testing */}
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Depth Testing
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
          <Switch
            label="Enable Depth Test"
            checked={config.rendering.depthTest}
            onChange={(checked) => updateRendering({ depthTest: checked })}
            description="Enable depth buffer testing"
          />
          
          {config.rendering.depthTest && (
            <Select
              label="Depth Function"
              value={config.rendering.depthFunc}
              onChange={(value) => updateRendering({ depthFunc: value as WebGLRenderingConfig['depthFunc'] })}
              options={depthFuncOptions}
            />
          )}
        </div>
        
        {/* Blending */}
        <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '500' }}>
          Blending
        </h4>
        <Switch
          label="Enable Blending"
          checked={config.rendering.blending}
          onChange={(checked) => updateRendering({ blending: checked })}
          description="Enable alpha blending"
        />
        
        {config.rendering.blending && (
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            <Select
              label="Source Factor"
              value={config.rendering.blendSrc}
              onChange={(value) => updateRendering({ blendSrc: value as WebGLRenderingConfig['blendSrc'] })}
              options={blendFactorOptions}
            />
            
            <Select
              label="Destination Factor"
              value={config.rendering.blendDst}
              onChange={(value) => updateRendering({ blendDst: value as WebGLRenderingConfig['blendDst'] })}
              options={blendFactorOptions}
            />
            
            <Select
              label="Blend Equation"
              value={config.rendering.blendEquation}
              onChange={(value) => updateRendering({ blendEquation: value as WebGLRenderingConfig['blendEquation'] })}
              options={blendEquationOptions}
            />
          </div>
        )}
      </FormSection>
      
      {/* Preview Section */}
      {showPreview && (
        <FormSection title="Preview" description="Preview of current WebGL settings">
          <div
            style={{
              width: '100%',
              height: '200px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              backgroundColor: `rgba(${Math.round(config.rendering.clearColor.r * 255)}, ${Math.round(config.rendering.clearColor.g * 255)}, ${Math.round(config.rendering.clearColor.b * 255)}, ${config.rendering.clearColor.a})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-muted)',
            }}
          >
            WebGL Preview (Implementation needed)
          </div>
        </FormSection>
      )}
    </div>
  );
}

// ============================================================================
// Configuration Presets
// ============================================================================

export const webglConfigPresets: Record<string, { name: string; config: CustomWebGLConfig }> = {
  'performance': {
    name: 'Performance',
    config: {
      ...defaultCustomWebGLConfig,
      performance: {
        ...defaultCustomWebGLConfig.performance,
        maxFrameRate: 120,
        renderingMode: 'deferred',
        enableLOD: true,
        lodLevels: 4,
        batchRendering: true,
        instancedRendering: true,
      },
      shaders: {
        ...defaultCustomWebGLConfig.shaders,
        vertexShaderProfile: 'basic',
        fragmentShaderProfile: 'basic',
        enableShadows: false,
        enableAntialiasing: false,
        enablePostProcessing: false,
      },
    },
  },
  'quality': {
    name: 'High Quality',
    config: {
      ...defaultCustomWebGLConfig,
      shaders: {
        ...defaultCustomWebGLConfig.shaders,
        vertexShaderProfile: 'advanced',
        fragmentShaderProfile: 'advanced',
        enableShadows: true,
        shadowQuality: 'high',
        shadowMapSize: 2048,
        enableAntialiasing: true,
        antialiasingMode: 'smaa',
        antialiasingQuality: 'high',
        enablePostProcessing: true,
        bloomEffect: true,
      },
    },
  },
  'balanced': {
    name: 'Balanced',
    config: {
      ...defaultCustomWebGLConfig,
      performance: {
        ...defaultCustomWebGLConfig.performance,
        maxFrameRate: 60,
        renderingMode: 'adaptive',
        enableLOD: true,
        lodLevels: 3,
      },
      shaders: {
        ...defaultCustomWebGLConfig.shaders,
        enableShadows: true,
        shadowQuality: 'medium',
        enableAntialiasing: true,
        antialiasingMode: 'fxaa',
        antialiasingQuality: 'medium',
      },
    },
  },
};