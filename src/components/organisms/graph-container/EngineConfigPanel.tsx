/* eslint-disable react-refresh/only-export-components */
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

const _downloadConfigurationFile = (config: GlobalEngineConfig, filename?: string) => {
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

// Hook for panel logic
const useEngineConfigPanel = (props: EngineConfigPanelProps) => {
  const { onChange, onValidationChange, defaultCollapsed = false } = props;
  
  const {
    availableEngines,
    currentEngine: _currentEngine,
    settings: _engineProviderSettings,
    updateSettings: updateEngineProviderSettings,
    getEnginePerformanceScore,
  } = useGraphEngine();
  
  const [config, setConfig] = useState<GlobalEngineConfig>(defaultGlobalEngineConfig);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeTab, setActiveTab] = useState<'global' | 'engine-specific'>('global');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return {
    config,
    setConfig,
    isCollapsed,
    setIsCollapsed,
    activeTab,
    setActiveTab,
    showImportDialog,
    setShowImportDialog,
    fileInputRef,
    availableEngines,
    getEnginePerformanceScore,
    updateEngineProviderSettings,
    onChange,
    onValidationChange,
  };
};

// Hook for engine options
const useEngineOptions = (availableEngines: GraphEngineType[], getEnginePerformanceScore: (engine: GraphEngineType) => number) => {
  return useMemo<SelectOption[]>(() => {
    return availableEngines.map((engineType) => {
      const score = getEnginePerformanceScore(engineType);
      return {
        value: engineType,
        label: engineType.charAt(0).toUpperCase() + engineType.slice(1).replace('-', ' '),
        description: `Performance score: ${score}`,
      };
    });
  }, [availableEngines, getEnginePerformanceScore]);
};

// Hook for validation
const useEngineConfigValidation = (config: GlobalEngineConfig, onValidationChange?: (validation: ValidationResult) => void) => {
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
  
  return validation;
};

// Hook for event handlers
const useEngineConfigHandlers = (panelState: ReturnType<typeof useEngineConfigPanel>) => {
  const { config, setConfig, onChange, updateEngineProviderSettings, setShowImportDialog, fileInputRef: _fileInputRef } = panelState;
  
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
  }, [config, onChange, updateEngineProviderSettings, setConfig]);
  
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
      }
    };
    reader.readAsText(file);
    setShowImportDialog(false);
  }, [setConfig, onChange, setShowImportDialog]);
  
  const handleImport = useCallback(() => {
    setShowImportDialog(true);
  }, [setShowImportDialog]);
  
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'engine-config.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [config]);
  
  const handleResetToDefaults = useCallback(() => {
    setConfig(defaultGlobalEngineConfig);
    onChange?.(defaultGlobalEngineConfig);
  }, [setConfig, onChange]);
  
  const handleLoadPreset = useCallback((presetKey: string, engineType: GraphEngineType) => {
    if (engineType === 'svg') {
      const preset = svgConfigPresets[presetKey];
      if (preset) {
        handleEngineConfigChange(engineType, preset.config);
      }
    } else if (engineType === 'webgl') {
      const preset = webglConfigPresets[presetKey];
      if (preset) {
        handleEngineConfigChange(engineType, preset.config);
      }
    }
  }, [handleEngineConfigChange]);
  
  return {
    handleConfigChange,
    handleEngineConfigChange,
    handleImportFile,
    handleImport,
    handleExport,
    handleResetToDefaults,
    handleLoadPreset,
  };
};

// Hook for rendering engine-specific config
const useRenderEngineSpecificConfig = (
  config: GlobalEngineConfig, 
  handleEngineConfigChange: (engineType: GraphEngineType, engineConfig: unknown) => void,
  compact: boolean,
  showPreview?: boolean
) => {
  return useCallback(() => {
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
              fontSize: '0.875rem',
              border: '1px dashed var(--color-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--color-background)',
            }}
          >
            Configuration options for {config.selectedEngine} are not yet implemented.
            <br />
            This engine uses default settings.
          </div>
        );
      
      default:
        return (
          <div style={{ color: 'var(--color-error)', fontSize: '0.875rem' }}>
            Unknown engine type: {config.selectedEngine}
          </div>
        );
    }
  }, [config, handleEngineConfigChange, compact, showPreview]);
};

export function EngineConfigPanel(props: EngineConfigPanelProps) {
  const {
    compact = false,
    className,
    collapsible = false,
  } = props;
  
  const panelState = useEngineConfigPanel(props);
  const { config } = panelState;
  
  const _validation = useEngineConfigValidation(config, panelState.onValidationChange);
  const engineOptions = useEngineOptions(panelState.availableEngines, panelState.getEnginePerformanceScore);
  const handlers = useEngineConfigHandlers(panelState);
  
  const renderEngineSpecificConfig = useRenderEngineSpecificConfig(config, handlers.handleEngineConfigChange, compact, props.showPreview);
  const styles = useEngineConfigPanelStyles(compact);
  
  return (
    <EngineConfigPanelLayout
      collapsible={collapsible}
      isCollapsed={panelState.isCollapsed}
      setIsCollapsed={panelState.setIsCollapsed}
      className={className}
      styles={styles}
      config={config}
      activeTab={panelState.activeTab}
      setActiveTab={panelState.setActiveTab}
      showImportDialog={panelState.showImportDialog}
      setShowImportDialog={panelState.setShowImportDialog}
      fileInputRef={panelState.fileInputRef}
      handlers={handlers}
      engineOptions={engineOptions}
      compact={compact}
      renderEngineSpecificConfig={renderEngineSpecificConfig}
    />
  );
};

// Hook for component styles
const useEngineConfigPanelStyles = (compact: boolean) => {
  return useMemo(() => ({
    container: {
      backgroundColor: 'var(--color-cardBackground)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: compact ? '0.75rem 1rem' : '1rem 1.25rem',
      backgroundColor: 'var(--color-background)',
      borderBottom: '1px solid var(--color-border)',
    },
    title: {
      margin: 0,
      fontSize: compact ? '1rem' : '1.125rem',
      fontWeight: '600',
      color: 'var(--color-text)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    content: {
      padding: compact ? '0.75rem 1rem' : '1rem 1.25rem',
    },
    tab: {
      display: 'flex',
      marginBottom: '1.5rem',
      borderBottom: '1px solid var(--color-border)',
    },
    tabButton: (active: boolean) => ({
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      color: active ? 'var(--color-primary)' : 'var(--color-muted)',
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
      cursor: 'pointer',
      transition: 'color 0.15s ease-in-out, border-color 0.15s ease-in-out',
    }),
  }), [compact]);
};

// Main layout component
interface EngineConfigPanelLayoutProps {
  collapsible: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  className?: string;
  styles: ReturnType<typeof useEngineConfigPanelStyles>;
  config: GlobalEngineConfig;
  activeTab: 'global' | 'engine-specific';
  setActiveTab: (tab: 'global' | 'engine-specific') => void;
  showImportDialog: boolean;
  setShowImportDialog: (show: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handlers: ReturnType<typeof useEngineConfigHandlers>;
  engineOptions: SelectOption[];
  compact: boolean;
  renderEngineSpecificConfig: () => React.ReactNode;
}

const EngineConfigPanelLayout = (props: EngineConfigPanelLayoutProps) => {
  const {
    collapsible, isCollapsed, setIsCollapsed, className, styles, config,
    activeTab, setActiveTab, showImportDialog, setShowImportDialog,
    fileInputRef, handlers, engineOptions, compact, renderEngineSpecificConfig
  } = props;
  
  if (collapsible && isCollapsed) {
    return (
      <EngineConfigPanelCollapsed
        className={className}
        styles={styles}
        config={config}
        setIsCollapsed={setIsCollapsed}
      />
    );
  }
  
  return (
    <div className={className} style={styles.container}>
      <EngineConfigPanelHeader
        styles={styles}
        collapsible={collapsible}
        setIsCollapsed={setIsCollapsed}
        handlers={handlers}
      />
      
      <EngineConfigPanelContent
        styles={styles}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        handlers={handlers}
        engineOptions={engineOptions}
        compact={compact}
        renderEngineSpecificConfig={renderEngineSpecificConfig}
        handleLoadPreset={handlers.handleLoadPreset}
      />
      
      <EngineConfigPanelImportDialog
        showImportDialog={showImportDialog}
        setShowImportDialog={setShowImportDialog}
        fileInputRef={fileInputRef}
        handleImportFile={handlers.handleImportFile}
      />
    </div>
  );
};

// Collapsed state component
interface EngineConfigPanelCollapsedProps {
  className?: string;
  styles: ReturnType<typeof useEngineConfigPanelStyles>;
  config: GlobalEngineConfig;
  setIsCollapsed: (collapsed: boolean) => void;
}

const EngineConfigPanelCollapsed = ({ className, styles, config, setIsCollapsed }: EngineConfigPanelCollapsedProps) => (
  <div className={className} style={styles.container}>
    <div
      style={{ ...styles.header, cursor: 'pointer' }}
      onClick={() => setIsCollapsed(false)}
    >
      <h3 style={styles.title}>
        ⚙️ Engine Configuration
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>▶</span>
      </h3>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
        {config.selectedEngine}
      </div>
    </div>
  </div>
);

// Header component
interface EngineConfigPanelHeaderProps {
  styles: ReturnType<typeof useEngineConfigPanelStyles>;
  collapsible: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  handlers: ReturnType<typeof useEngineConfigHandlers>;
}

const EngineConfigPanelHeader = ({ styles, collapsible, setIsCollapsed, handlers }: EngineConfigPanelHeaderProps) => (
  <div style={styles.header}>
    <h3
      style={styles.title}
      onClick={collapsible ? () => setIsCollapsed(true) : undefined}
    >
      ⚙️ Engine Configuration
      {collapsible && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', cursor: 'pointer' }}>▼</span>
      )}
    </h3>
    
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button
        onClick={handlers.handleImport}
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
        onClick={handlers.handleExport}
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
        onClick={handlers.handleResetToDefaults}
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
);

// Content component
interface EngineConfigPanelContentProps {
  styles: ReturnType<typeof useEngineConfigPanelStyles>;
  activeTab: 'global' | 'engine-specific';
  setActiveTab: (tab: 'global' | 'engine-specific') => void;
  config: GlobalEngineConfig;
  handlers: ReturnType<typeof useEngineConfigHandlers>;
  engineOptions: SelectOption[];
  compact: boolean;
  renderEngineSpecificConfig: () => React.ReactNode;
  handleLoadPreset: (presetKey: string, engineType: GraphEngineType) => void;
}

const EngineConfigPanelContent = ({ 
  styles, 
  activeTab, 
  setActiveTab, 
  config, 
  handlers, 
  engineOptions, 
  compact, 
  renderEngineSpecificConfig,
  handleLoadPreset 
}: EngineConfigPanelContentProps) => {
  const { handleConfigChange } = handlers;

  return (
    <div>
      <div style={styles.content}>
        {/* Tabs */}
        <div style={styles.tab}>
          <button
            onClick={() => setActiveTab('global')}
            style={styles.tabButton(activeTab === 'global')}
          >
            Global Settings
          </button>
          <button
            onClick={() => setActiveTab('engine-specific')}
            style={styles.tabButton(activeTab === 'engine-specific')}
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
    </div>
  );
};

// Import Dialog component
interface EngineConfigPanelImportDialogProps {
  showImportDialog: boolean;
  setShowImportDialog: (show: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const EngineConfigPanelImportDialog = ({ 
  showImportDialog, 
  setShowImportDialog, 
  fileInputRef, 
  handleImportFile 
}: EngineConfigPanelImportDialogProps) => {
  if (!showImportDialog) return null;

  return (
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
  );
};