import React, { useMemo, useState, useCallback } from 'react';

import { useEngineCapabilities } from './hooks/useEngineCapabilities';
import { useGraphEngine } from './hooks/useGraphEngine';
import type { 
  GraphEngineType, 
  GraphEngineTransitionOptions,
  GraphEngineSettings,
} from './provider';

// ============================================================================
// Component Props
// ============================================================================

export interface GraphEngineSettingsProps {
  /** Whether to show advanced settings */
  showAdvanced?: boolean;
  
  /** Callback when settings are changed */
  onSettingsChange?: (settings: Partial<GraphEngineSettings>) => void;
  
  /** Custom CSS class name */
  className?: string;
  
  /** Whether to show the settings in a compact layout */
  compact?: boolean;
}

// ============================================================================
// Settings Sections
// ============================================================================

interface SettingsSection {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSection) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '0.875rem', 
          fontWeight: '600',
          color: 'var(--color-text)'
        }}>
          {title}
        </h4>
        {description && (
          <p style={{ 
            margin: '0.25rem 0 0 0', 
            fontSize: '0.75rem', 
            color: 'var(--color-muted)',
            lineHeight: 1.4
          }}>
            {description}
          </p>
        )}
      </div>
      <div style={{ paddingLeft: '0.5rem' }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Settings Controls
// ============================================================================

interface SelectControlProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; description?: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function SelectControl({ label, value, options, onChange, disabled }: SelectControlProps) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '0.75rem', 
        fontWeight: '500',
        color: 'var(--color-text)',
        marginBottom: '0.25rem'
      }}>
        {label}
      </label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '0.5rem',
          fontSize: '0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          backgroundColor: 'var(--color-cardBackground)',
          color: 'var(--color-text)',
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface CheckboxControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

function CheckboxControl({ label, checked, onChange, description, disabled }: CheckboxControlProps) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ 
        display: 'flex', 
        alignItems: 'flex-start',
        gap: '0.5rem',
        fontSize: '0.75rem',
        color: 'var(--color-text)',
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}>
        <input 
          type="checkbox" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          style={{ marginTop: '0.1rem' }}
        />
        <div>
          <div style={{ fontWeight: '500' }}>{label}</div>
          {description && (
            <div style={{ 
              color: 'var(--color-muted)', 
              fontSize: '0.7rem',
              marginTop: '0.125rem',
              lineHeight: 1.3
            }}>
              {description}
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

interface NumberControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  unit?: string;
}

function NumberControl({ label, value, onChange, min, max, step = 1, disabled, unit }: NumberControlProps) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '0.75rem', 
        fontWeight: '500',
        color: 'var(--color-text)',
        marginBottom: '0.25rem'
      }}>
        {label} {unit && `(${unit})`}
      </label>
      <input 
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '0.5rem',
          fontSize: '0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          backgroundColor: 'var(--color-cardBackground)',
          color: 'var(--color-text)',
        }}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GraphEngineSettings({
  showAdvanced = false,
  onSettingsChange,
  className,
  compact = false,
}: GraphEngineSettingsProps) {
  const {
    settings,
    updateSettings,
    resetSettings,
    availableEngines: _availableEngines,
    currentEngine,
  } = useGraphEngine();
  
  const { getAllCapabilities } = useEngineCapabilities();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Engine options for dropdown
  const engineOptions = useMemo(() => {
    const capabilities = getAllCapabilities();
    return capabilities.map(({ engineType, capabilities: caps }) => ({
      value: engineType,
      label: caps.displayName,
      description: caps.description,
    }));
  }, [getAllCapabilities]);
  
  // Update settings handler
  const handleSettingsUpdate = (updates: Partial<GraphEngineSettings>) => {
    updateSettings(updates);
    onSettingsChange?.(updates);
  };
  
  // Transition settings
  const updateTransitionSettings = (updates: Partial<GraphEngineTransitionOptions>) => {
    handleSettingsUpdate({
      transitionSettings: {
        ...settings.transitionSettings,
        ...updates,
      },
    });
  };
  
  const containerStyle = {
    padding: compact ? '0.75rem' : '1rem',
    backgroundColor: 'var(--color-cardBackground)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '0.875rem',
  };
  
  return (
    <div className={className} style={containerStyle}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '1rem', 
          fontWeight: '600',
          color: 'var(--color-text)'
        }}>
          Graph Engine Settings
        </h3>
        <button
          onClick={() => setShowResetConfirm(true)}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.7rem',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: 'var(--color-muted)',
            cursor: 'pointer',
          }}
        >
          Reset to Defaults
        </button>
      </div>
      
      {/* Engine Selection */}
      <SettingsSection title="Engine Selection">
        <SelectControl
          label="Default Engine"
          value={settings.selectedEngine}
          options={engineOptions}
          onChange={(value) => handleSettingsUpdate({ selectedEngine: value as GraphEngineType })}
        />
      </SettingsSection>
      
      {/* Transition Settings */}
      <SettingsSection 
        title="Transition Animation"
        description="Configure how engine switches are animated"
      >
        <NumberControl
          label="Animation Duration"
          value={settings.transitionSettings.duration || 500}
          onChange={(value) => updateTransitionSettings({ duration: value })}
          min={0}
          max={2000}
          step={100}
          unit="ms"
        />
        
        <SelectControl
          label="Easing Function"
          value={settings.transitionSettings.easing || 'ease-in-out'}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'ease-in', label: 'Ease In' },
            { value: 'ease-out', label: 'Ease Out' },
            { value: 'ease-in-out', label: 'Ease In Out' },
          ]}
          onChange={(value) => updateTransitionSettings({ 
            easing: value as GraphEngineTransitionOptions['easing']
          })}
        />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <CheckboxControl
            label="Preserve Positions"
            checked={settings.transitionSettings.preservePositions ?? true}
            onChange={(checked) => updateTransitionSettings({ preservePositions: checked })}
            description="Keep vertex positions during engine switch"
          />
          
          <CheckboxControl
            label="Preserve Selection"
            checked={settings.transitionSettings.preserveSelection ?? true}
            onChange={(checked) => updateTransitionSettings({ preserveSelection: checked })}
            description="Maintain selected vertices and edges"
          />
        </div>
        
        <CheckboxControl
          label="Preserve Viewport"
          checked={settings.transitionSettings.preserveViewport ?? true}
          onChange={(checked) => updateTransitionSettings({ preserveViewport: checked })}
          description="Keep current zoom and pan position"
        />
      </SettingsSection>
      
      {/* Performance Settings */}
      {showAdvanced && (
        <SettingsSection 
          title="Performance Optimisation"
          description="Automatic engine switching based on graph size"
        >
          <CheckboxControl
            label="Auto-optimise Engine"
            checked={settings.performanceSettings.autoOptimise}
            onChange={(checked) => handleSettingsUpdate({
              performanceSettings: {
                ...settings.performanceSettings,
                autoOptimise: checked,
              },
            })}
            description="Automatically switch to faster engines for large graphs"
          />
          
          {settings.performanceSettings.autoOptimise && (
            <>
              <NumberControl
                label="Optimisation Threshold"
                value={settings.performanceSettings.autoOptimiseThreshold}
                onChange={(value) => handleSettingsUpdate({
                  performanceSettings: {
                    ...settings.performanceSettings,
                    autoOptimiseThreshold: value,
                  },
                })}
                min={100}
                max={100000}
                step={500}
                unit="vertices"
              />
              
              <SelectControl
                label="Large Graph Engine"
                value={settings.performanceSettings.largeGraphEngine}
                options={engineOptions}
                onChange={(value) => handleSettingsUpdate({
                  performanceSettings: {
                    ...settings.performanceSettings,
                    largeGraphEngine: value as GraphEngineType,
                  },
                })}
              />
            </>
          )}
        </SettingsSection>
      )}
      
      {/* User Preferences */}
      <SettingsSection 
        title="User Preferences"
        description="Interface and behaviour preferences"
      >
        <CheckboxControl
          label="Remember Engine Per Graph"
          checked={settings.userPreferences.rememberPerGraph}
          onChange={(checked) => handleSettingsUpdate({
            userPreferences: {
              ...settings.userPreferences,
              rememberPerGraph: checked,
            },
          })}
          description="Remember different engine choices for different graph types"
        />
        
        <CheckboxControl
          label="Show Transition Animations"
          checked={settings.userPreferences.showTransitions}
          onChange={(checked) => handleSettingsUpdate({
            userPreferences: {
              ...settings.userPreferences,
              showTransitions: checked,
            },
          })}
          description="Display animated transitions when switching engines"
        />
        
        <CheckboxControl
          label="Performance Warnings"
          checked={settings.userPreferences.showPerformanceWarnings}
          onChange={(checked) => handleSettingsUpdate({
            userPreferences: {
              ...settings.userPreferences,
              showPerformanceWarnings: checked,
            },
          })}
          description="Show warnings when graph size exceeds engine recommendations"
        />
      </SettingsSection>
      
      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div style={{
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
        }}>
          <div style={{
            padding: '1.5rem',
            backgroundColor: 'var(--color-cardBackground)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center',
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)' }}>
              Reset Settings
            </h4>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              This will reset all graph engine settings to their default values. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
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
              <button
                onClick={() => {
                  resetSettings();
                  setShowResetConfirm(false);
                  onSettingsChange?.(settings);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  border: '1px solid var(--color-error)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-error)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Current Engine Info */}
      {!compact && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: 'var(--color-muted)',
        }}>
          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
            Currently Active: {engineOptions.find(opt => opt.value === currentEngine)?.label}
          </div>
          <div>
            Settings are automatically saved to localStorage
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Settings Component
// ============================================================================

export function CompactGraphEngineSettings() {
  const { currentEngine, availableEngines: _availableEngines, switchEngine, isTransitioning } = useGraphEngine();
  const { getAllCapabilities } = useEngineCapabilities();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const engineOptions = useMemo(() => {
    const capabilities = getAllCapabilities();
    // List of actually implemented engines (from provider preloadEngine function)
    const implementedEngines: GraphEngineType[] = ['canvas-2d', 'd3-force', 'cytoscape', 'webgl'];
    
    return capabilities.map(({ engineType, capabilities: caps }) => ({
      value: engineType,
      label: caps.displayName,
      description: caps.description,
      maxVertices: caps.performance.maxVertices,
      performanceLevel: caps.performance.renderingSpeed > 3 ? 'high' : caps.performance.renderingSpeed > 2 ? 'medium' : 'low',
      isImplemented: implementedEngines.includes(engineType),
    }));
  }, [getAllCapabilities]);

  const currentEngineInfo = engineOptions.find(opt => opt.value === currentEngine);
  
  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top - 10 
    });
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const getStatusIndicator = (engine: typeof engineOptions[0]) => {
    if (!engine.isImplemented) return '🔜';
    if (engine.performanceLevel === 'high') return '⚡';
    if (engine.performanceLevel === 'medium') return '⚖️';
    return '🐌';
  };

  const getStatusColor = (engine: typeof engineOptions[0]) => {
    if (!engine.isImplemented) return 'var(--color-muted)';
    if (engine.performanceLevel === 'high') return 'var(--color-success)';
    if (engine.performanceLevel === 'medium') return 'var(--color-warning)';
    return 'var(--color-error)';
  };
  
  return (
    <>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        position: 'relative',
        padding: '0.25rem 0.5rem',
        backgroundColor: 'var(--color-cardBackground)',
        backdropFilter: 'blur(4px)',
        borderRadius: '6px',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}>
        <label style={{ 
          fontSize: '0.75rem', 
          color: 'var(--color-text)', 
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          <span>🎯</span>
          Engine:
        </label>
        <div style={{ position: 'relative' }}>
          <select 
            value={currentEngine}
            onChange={(e) => switchEngine(e.target.value as GraphEngineType)}
            disabled={isTransitioning}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="graph-engine-selector"
            style={{
              padding: '0.3rem 0.6rem',
              paddingRight: '1.8rem',
              fontSize: '0.75rem',
              fontWeight: '500',
              border: `2px solid ${isTransitioning ? 'var(--color-warning)' : 'var(--color-primary)'}`,
              borderRadius: '6px',
              backgroundColor: isTransitioning ? 'var(--color-warning-light)' : 'var(--color-background)',
              color: 'var(--color-text)',
              minWidth: '150px',
              cursor: isTransitioning ? 'not-allowed' : 'pointer',
              opacity: isTransitioning ? 0.7 : 1,
              transition: 'all 0.2s ease-in-out',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            title={currentEngineInfo?.description}
          >
            {engineOptions.map(option => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={!option.isImplemented}
              >
                {getStatusIndicator(option)} {option.label}
              </option>
            ))}
          </select>
          
          {/* Status indicator overlay */}
          <div style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.7rem',
            color: currentEngineInfo ? getStatusColor(currentEngineInfo) : 'var(--color-muted)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.125rem',
          }}>
            <span>{currentEngineInfo && getStatusIndicator(currentEngineInfo)}</span>
            {currentEngineInfo?.isImplemented && (
              <div 
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(currentEngineInfo),
                }}
              />
            )}
          </div>
          
          {/* Transition indicator */}
          {isTransitioning && (
            <div style={{
              position: 'absolute',
              left: '2px',
              top: '2px',
              right: '2px',
              bottom: '2px',
              borderRadius: '3px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-warning)',
              animation: 'pulse 1s infinite',
              pointerEvents: 'none',
            }} />
          )}
        </div>
        
        {/* Keyboard shortcut hint */}
        <div style={{ 
          fontSize: '0.65rem', 
          color: 'var(--color-primary)',
          backgroundColor: '#f0f9ff',
          padding: '0.125rem 0.25rem',
          borderRadius: '3px',
          border: '1px solid var(--color-primary)',
          fontWeight: '600',
          userSelect: 'none',
          fontFamily: 'monospace',
        }}>
          E
        </div>
      </div>
      
      {/* Enhanced tooltip */}
      {showTooltip && currentEngineInfo && (
        <div style={{
          position: 'fixed',
          left: tooltipPosition.x - 100,
          top: tooltipPosition.y,
          transform: 'translateX(-50%) translateY(-100%)',
          backgroundColor: 'var(--color-cardBackground)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          padding: '0.5rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          fontSize: '0.7rem',
          maxWidth: '200px',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
            {currentEngineInfo.label}
          </div>
          <div style={{ color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
            {currentEngineInfo.description}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
            <span>Max: {currentEngineInfo.maxVertices || '∞'}</span>
            <span>Perf: {currentEngineInfo.performanceLevel}</span>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// Settings Import/Export Utilities
// ============================================================================

export const exportSettings = (settings: GraphEngineSettings): string => {
  return JSON.stringify(settings, null, 2);
};

/**
 * Validates a GraphEngineSettings object structure
 */
const validateSettings = (obj: unknown): obj is GraphEngineSettings => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const settings = obj as any;

  // Validate selectedEngine
  const validEngines: GraphEngineType[] = [
    'canvas-2d', 'svg', 'webgl', 'd3-force', 'cytoscape', 'vis-network', 'xyflow'
  ];
  if (!validEngines.includes(settings.selectedEngine)) {
    return false;
  }

  // Validate engineConfigs
  if (!settings.engineConfigs || typeof settings.engineConfigs !== 'object') {
    return false;
  }

  // Validate transitionSettings
  if (!settings.transitionSettings || typeof settings.transitionSettings !== 'object') {
    return false;
  }

  const transition = settings.transitionSettings;
  if (transition.duration !== undefined && (typeof transition.duration !== 'number' || transition.duration < 0)) {
    return false;
  }

  if (transition.easing !== undefined) {
    const validEasings = ['ease-in-out', 'ease-in', 'ease-out', 'linear'];
    if (!validEasings.includes(transition.easing)) {
      return false;
    }
  }

  if (transition.preservePositions !== undefined && typeof transition.preservePositions !== 'boolean') {
    return false;
  }

  if (transition.preserveSelection !== undefined && typeof transition.preserveSelection !== 'boolean') {
    return false;
  }

  if (transition.preserveViewport !== undefined && typeof transition.preserveViewport !== 'boolean') {
    return false;
  }

  if (transition.effects !== undefined) {
    const effects = transition.effects;
    if (typeof effects !== 'object') {
      return false;
    }

    if (effects.fadeOut !== undefined && typeof effects.fadeOut !== 'boolean') {
      return false;
    }

    if (effects.fadeIn !== undefined && typeof effects.fadeIn !== 'boolean') {
      return false;
    }

    if (effects.scale !== undefined && typeof effects.scale !== 'boolean') {
      return false;
    }

    if (effects.slide !== undefined) {
      const validSlides = ['left', 'right', 'up', 'down'];
      if (!validSlides.includes(effects.slide)) {
        return false;
      }
    }
  }

  // Validate performanceSettings
  if (!settings.performanceSettings || typeof settings.performanceSettings !== 'object') {
    return false;
  }

  const performance = settings.performanceSettings;
  if (typeof performance.autoOptimise !== 'boolean') {
    return false;
  }

  if (typeof performance.autoOptimiseThreshold !== 'number' || performance.autoOptimiseThreshold < 0) {
    return false;
  }

  if (!validEngines.includes(performance.largeGraphEngine)) {
    return false;
  }

  // Validate userPreferences
  if (!settings.userPreferences || typeof settings.userPreferences !== 'object') {
    return false;
  }

  const prefs = settings.userPreferences;
  if (typeof prefs.rememberPerGraph !== 'boolean') {
    return false;
  }

  if (typeof prefs.showTransitions !== 'boolean') {
    return false;
  }

  if (typeof prefs.showPerformanceWarnings !== 'boolean') {
    return false;
  }

  return true;
};

export const importSettings = (settingsJson: string): GraphEngineSettings | null => {
  try {
    const parsed = JSON.parse(settingsJson);

    if (!validateSettings(parsed)) {
      console.warn('Invalid settings structure detected during import');
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('Failed to parse settings JSON:', error);
    return null;
  }
};

export const downloadSettingsFile = (settings: GraphEngineSettings, filename = 'graph-engine-settings.json') => {
  const dataStr = exportSettings(settings);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};