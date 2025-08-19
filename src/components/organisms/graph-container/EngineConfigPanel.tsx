import React, { useCallback, useMemo, useState, useRef } from 'react';

import { useGraphEngine } from '../graph-engines/hooks/useGraphEngine';
import type { GraphEngineType, GraphEngineCapabilities } from '../graph-engines/provider';

import {
  FormSection,
  Select,
  Switch,
  ValidationUtils,
  type ValidationResult,
  type SelectOption,
} from './config/ConfigFormControls';
import { CustomSVGConfig, defaultCustomSVGConfig, svgConfigPresets } from './config/CustomSVGConfig';
import { CustomWebGLConfig, defaultCustomWebGLConfig, webglConfigPresets } from './config/WebGLConfig';

// ============================================================================
// Engine Configuration Types
// ============================================================================

export interface EngineSpecificConfig {
  'svg': CustomSVGConfig;
  'webgl': CustomWebGLConfig;
  'canvas-2d': Record<string, unknown>;
  'd3-force': Record<string, unknown>;
  'cytoscape': Record<string, unknown>;
  'vis-network': Record<string, unknown>;
}

export interface GlobalEngineConfig {
  // Engine Selection
  selectedEngine: GraphEngineType;
  autoSwitchThreshold: number;
  autoSwitchEnabled: boolean;
  
  // Performance Monitoring
  performanceMonitoring: boolean;
  showPerformanceWarnings: boolean;
  logPerformanceMetrics: boolean;
  
  // Transition Settings
  enableTransitions: boolean;
  transitionDuration: number;
  preserveSelection: boolean;
  preserveViewport: boolean;
  
  // Engine-specific configurations
  engineConfigs: EngineSpecificConfig;
}

// ============================================================================
// Component Props
// ============================================================================

export interface EngineConfigPanelProps {
  /** Whether to show the panel in compact mode */
  compact?: boolean;
  
  /** Whether to show advanced configuration options */
  showAdvanced?: boolean;
  
  /** Whether to show real-time configuration preview */
  showPreview?: boolean;
  
  /** Callback when configuration changes */
  onChange?: (config: GlobalEngineConfig) => void;
  
  /** Callback when validation state changes */
  onValidationChange?: (validation: ValidationResult) => void;
  
  /** Custom CSS class name */
  className?: string;
  
  /** Whether the panel is collapsible */
  collapsible?: boolean;
  
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const defaultGlobalEngineConfig: GlobalEngineConfig = {
  selectedEngine: 'canvas-2d',
  autoSwitchThreshold: 1000,
  autoSwitchEnabled: true,
  performanceMonitoring: true,
  showPerformanceWarnings: true,
  logPerformanceMetrics: false,
  enableTransitions: true,
  transitionDuration: 300,
  preserveSelection: true,
  preserveViewport: true,
  engineConfigs: {
    'svg': defaultCustomSVGConfig,
    'webgl': defaultCustomWebGLConfig,
    'canvas-2d': {},
    'd3-force': {},
    'cytoscape': {},
    'vis-network': {},
  },
};

// ============================================================================
// Import/Export Utilities
// ============================================================================

export interface ConfigurationFile {
  version: string;
  timestamp: string;
  config: GlobalEngineConfig;
  metadata: {
    userAgent: string;
    engineCapabilities: Array<{
      type: GraphEngineType;
      available: boolean;
      capabilities?: GraphEngineCapabilities;
    }>;
  };
}

const exportConfiguration = (config: GlobalEngineConfig): string => {
  const configFile: ConfigurationFile = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    config,
    metadata: {
      userAgent: navigator.userAgent,
      engineCapabilities: [], // Will be populated by the component
    },
  };
  
  return JSON.stringify(configFile, null, 2);
};

const importConfiguration = (jsonString: string): GlobalEngineConfig | null => {
  try {
    const configFile: ConfigurationFile = JSON.parse(jsonString);
    
    // Basic validation
    if (!configFile.config || typeof configFile.config !== 'object') {
      throw new Error('Invalid configuration format');
    }
    
    // Merge with defaults to ensure all required fields exist
    return {
      ...defaultGlobalEngineConfig,
      ...configFile.config,
      engineConfigs: {
        ...defaultGlobalEngineConfig.engineConfigs,
        ...configFile.config.engineConfigs,
      },
    };
  } catch (error) {
    console.error('Failed to import configuration:', error);
    return null;
  }
};

const downloadConfigurationFile = (config: GlobalEngineConfig, filename?: string) => {
  const configData = exportConfiguration(config);
  const blob = new Blob([configData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `graph-engine-config-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================================================
// Main Configuration Panel Component
// ============================================================================

export function EngineConfigPanel({
  compact = false,
  showAdvanced = false,
  showPreview = false,
  onChange,
  onValidationChange,
  className,
  collapsible = false,
  defaultCollapsed = false,
}: EngineConfigPanelProps) {
  
  // ============================================================================
  // State and Hooks
  // ============================================================================
  
  const {
    availableEngines,
    currentEngine,
    settings: engineProviderSettings,
    updateSettings: updateEngineProviderSettings,
    getEnginePerformanceScore,
  } = useGraphEngine();
  
  const [config, setConfig] = useState<GlobalEngineConfig>(defaultGlobalEngineConfig);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeTab, setActiveTab] = useState<'global' | 'engine-specific'>('global');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ============================================================================
  // Engine Options
  // ============================================================================
  
  const engineOptions = useMemo<SelectOption[]>(() => {
    return availableEngines.map((engineType) => {
      const score = getEnginePerformanceScore(engineType);
      return {
        value: engineType,
        label: engineType.charAt(0).toUpperCase() + engineType.slice(1).replace('-', ' '),
        description: `Performance score: ${score}`,
      };
    });
  }, [availableEngines, getEnginePerformanceScore]);
  
  // ============================================================================
  // Validation
  // ============================================================================
  
  const validation = useMemo(() => {
    const globalValidation = ValidationUtils.combine(
      ValidationUtils.number(config.autoSwitchThreshold, { min: 10, max: 100000 }, 'Auto-switch threshold'),
      ValidationUtils.number(config.transitionDuration, { min: 0, max: 5000 }, 'Transition duration')
    );
    
    return globalValidation;
  }, [config]);
  
  React.useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);
  
  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handleConfigChange = useCallback((updates: Partial<GlobalEngineConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange?.(newConfig);
    
    // Sync with engine provider if engine selection changed
    if (updates.selectedEngine) {
      updateEngineProviderSettings({
        selectedEngine: updates.selectedEngine,
      });
    }
  }, [config, onChange, updateEngineProviderSettings]);
  
  const handleEngineConfigChange = useCallback((engineType: GraphEngineType, engineConfig: unknown) => {
    handleConfigChange({
      engineConfigs: {
        ...config.engineConfigs,
        [engineType]: engineConfig,
      },
    });
  }, [config.engineConfigs, handleConfigChange]);
  
  const handleImportFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const importedConfig = importConfiguration(content);
      
      if (importedConfig) {
        setConfig(importedConfig);
        onChange?.(importedConfig);
        alert('Configuration imported successfully!');
      } else {
        alert('Failed to import configuration. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    setShowImportDialog(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);
  
  const handleExport = useCallback(() => {
    downloadConfigurationFile(config);
  }, [config]);
  
  const handleLoadPreset = useCallback((presetKey: string, engineType: GraphEngineType) => {
    let presetConfig: unknown;
    
    if (engineType === 'svg' && presetKey in svgConfigPresets) {
      presetConfig = svgConfigPresets[presetKey].config;
    } else if (engineType === 'webgl' && presetKey in webglConfigPresets) {
      presetConfig = webglConfigPresets[presetKey].config;
    }
    
    if (presetConfig) {
      handleEngineConfigChange(engineType, presetConfig);
    }
  }, [handleEngineConfigChange]);
  
  const handleResetToDefaults = useCallback(() => {
    if (confirm('Reset all configuration to defaults? This cannot be undone.')) {
      setConfig(defaultGlobalEngineConfig);
      onChange?.(defaultGlobalEngineConfig);
    }
  }, [onChange]);
  
  // ============================================================================
  // Render Engine-Specific Configuration
  // ============================================================================
  
  const renderEngineSpecificConfig = useCallback(() => {
    switch (config.selectedEngine) {
      case 'svg':
        return (
          <CustomSVGConfig
            config={config.engineConfigs.svg}
            onChange={(svgConfig) => handleEngineConfigChange('svg', svgConfig)}
            compact={compact}
            showPreview={showPreview}
          />
        );
      
      case 'webgl':
        return (
          <CustomWebGLConfig
            config={config.engineConfigs.webgl}
            onChange={(webglConfig) => handleEngineConfigChange('webgl', webglConfig)}
            compact={compact}
            showPreview={showPreview}
          />
        );
      
      case 'canvas-2d':
      case 'd3-force':
      case 'cytoscape':
      case 'vis-network':
        return (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--color-muted)',
              backgroundColor: 'var(--color-cardBackground)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Configuration for {config.selectedEngine} engine is not yet implemented.
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem' }}>
              This engine uses default settings.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  }, [config.selectedEngine, config.engineConfigs, handleEngineConfigChange, compact, showPreview]);
  
  // ============================================================================
  // Component Styles
  // ============================================================================
  
  const containerStyle = useMemo(() => ({
    backgroundColor: 'var(--color-cardBackground)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    overflow: 'hidden',
  }), []);
  
  const headerStyle = useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: compact ? '0.75rem 1rem' : '1rem 1.25rem',
    backgroundColor: 'var(--color-background)',
    borderBottom: '1px solid var(--color-border)',
  }), [compact]);
  
  const titleStyle = useMemo(() => ({
    margin: 0,
    fontSize: compact ? '1rem' : '1.125rem',
    fontWeight: '600',
    color: 'var(--color-text)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  }), [compact]);
  
  const contentStyle = useMemo(() => ({
    padding: compact ? '0.75rem 1rem' : '1rem 1.25rem',
  }), [compact]);
  
  const tabStyle = useMemo(() => ({
    display: 'flex',
    marginBottom: '1.5rem',
    borderBottom: '1px solid var(--color-border)',
  }), []);
  
  const tabButtonStyle = (active: boolean) => ({
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: active ? 'var(--color-primary)' : 'var(--color-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s ease-in-out, border-color 0.15s ease-in-out',
  });
  
  // ============================================================================
  // Render
  // ============================================================================
  
  if (collapsible && isCollapsed) {
    return (
      <div className={className} style={containerStyle}>
        <div
          style={{ ...headerStyle, cursor: 'pointer' }}
          onClick={() => setIsCollapsed(false)}
        >
          <h3 style={titleStyle}>
            ⚙️ Engine Configuration
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>▶</span>
          </h3>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            {config.selectedEngine}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={className} style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3
          style={titleStyle}
          onClick={collapsible ? () => setIsCollapsed(true) : undefined}
        >
          ⚙️ Engine Configuration
          {collapsible && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', cursor: 'pointer' }}>▼</span>
          )}
        </h3>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowImportDialog(true)}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            Import
          </button>
          
          <button
            onClick={handleExport}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            Export
          </button>
          
          <button
            onClick={handleResetToDefaults}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              border: '1px solid var(--color-error)',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: 'var(--color-error)',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div style={contentStyle}>
        {/* Tabs */}
        <div style={tabStyle}>
          <button
            onClick={() => setActiveTab('global')}
            style={tabButtonStyle(activeTab === 'global')}
          >
            Global Settings
          </button>
          <button
            onClick={() => setActiveTab('engine-specific')}
            style={tabButtonStyle(activeTab === 'engine-specific')}
          >
            {config.selectedEngine.charAt(0).toUpperCase() + config.selectedEngine.slice(1)} Settings
          </button>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'global' ? (
          <div>
            {/* Engine Selection */}
            <FormSection
              title="Engine Selection"
              description="Choose the primary rendering engine"
              collapsible={compact}
              defaultExpanded={!compact}
            >
              <Select
                label="Active Engine"
                value={config.selectedEngine}
                onChange={(value) => handleConfigChange({ selectedEngine: value as GraphEngineType })}
                options={engineOptions}
                description="Current rendering engine"
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <Switch
                  label="Auto-Switch Enabled"
                  checked={config.autoSwitchEnabled}
                  onChange={(checked) => handleConfigChange({ autoSwitchEnabled: checked })}
                  description="Automatically switch engines based on graph size"
                />
                
                {config.autoSwitchEnabled && (
                  <input
                    type="number"
                    value={config.autoSwitchThreshold}
                    onChange={(e) => handleConfigChange({ autoSwitchThreshold: parseInt(e.target.value, 10) })}
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-cardBackground)',
                      color: 'var(--color-text)',
                    }}
                    placeholder="Vertex threshold"
                  />
                )}
              </div>
            </FormSection>
            
            {/* Performance Settings */}
            <FormSection
              title="Performance Monitoring"
              description="Configure performance tracking and warnings"
              collapsible={compact}
              defaultExpanded={!compact}
            >
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <Switch
                  label="Performance Monitoring"
                  checked={config.performanceMonitoring}
                  onChange={(checked) => handleConfigChange({ performanceMonitoring: checked })}
                  description="Track rendering performance metrics"
                />
                
                <Switch
                  label="Performance Warnings"
                  checked={config.showPerformanceWarnings}
                  onChange={(checked) => handleConfigChange({ showPerformanceWarnings: checked })}
                  description="Show warnings for performance issues"
                />
                
                <Switch
                  label="Log Metrics"
                  checked={config.logPerformanceMetrics}
                  onChange={(checked) => handleConfigChange({ logPerformanceMetrics: checked })}
                  description="Log performance data to console"
                />
              </div>
            </FormSection>
            
            {/* Transition Settings */}
            <FormSection
              title="Engine Transitions"
              description="Configure engine switching animations"
              collapsible={compact}
              defaultExpanded={!compact}
            >
              <Switch
                label="Enable Transitions"
                checked={config.enableTransitions}
                onChange={(checked) => handleConfigChange({ enableTransitions: checked })}
                description="Animate engine switches"
              />
              
              {config.enableTransitions && (
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <input
                    type="number"
                    value={config.transitionDuration}
                    onChange={(e) => handleConfigChange({ transitionDuration: parseInt(e.target.value, 10) })}
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-cardBackground)',
                      color: 'var(--color-text)',
                    }}
                    placeholder="Duration (ms)"
                  />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Switch
                      label="Preserve Selection"
                      checked={config.preserveSelection}
                      onChange={(checked) => handleConfigChange({ preserveSelection: checked })}
                    />
                    
                    <Switch
                      label="Preserve Viewport"
                      checked={config.preserveViewport}
                      onChange={(checked) => handleConfigChange({ preserveViewport: checked })}
                    />
                  </div>
                </div>
              )}
            </FormSection>
          </div>
        ) : (
          <div>
            {/* Engine-Specific Configuration */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '500', color: 'var(--color-text)' }}>
                  {config.selectedEngine.charAt(0).toUpperCase() + config.selectedEngine.slice(1)} Configuration
                </h4>
                
                {/* Preset Selector */}
                {(config.selectedEngine === 'svg' || config.selectedEngine === 'webgl') && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleLoadPreset(e.target.value, config.selectedEngine);
                        e.target.value = '';
                      }
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--color-cardBackground)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <option value="">Load Preset...</option>
                    {config.selectedEngine === 'svg' &&
                      Object.entries(svgConfigPresets).map(([key, preset]) => (
                        <option key={key} value={key}>
                          {preset.name}
                        </option>
                      ))}
                    {config.selectedEngine === 'webgl' &&
                      Object.entries(webglConfigPresets).map(([key, preset]) => (
                        <option key={key} value={key}>
                          {preset.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>
              
              {renderEngineSpecificConfig()}
            </div>
          </div>
        )}
      </div>
      
      {/* Import Dialog */}
      {showImportDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowImportDialog(false)}
        >
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--color-cardBackground)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              maxWidth: '400px',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)' }}>
              Import Configuration
            </h4>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              Select a JSON configuration file to import engine settings.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              style={{ marginBottom: '1rem' }}
            />
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowImportDialog(false)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}