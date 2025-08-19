import React, { useMemo, useState } from 'react';

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
    availableEngines,
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
  const { currentEngine, availableEngines, switchEngine } = useGraphEngine();
  const { getAllCapabilities } = useEngineCapabilities();
  
  const engineOptions = useMemo(() => {
    const capabilities = getAllCapabilities();
    return capabilities.map(({ engineType, capabilities: caps }) => ({
      value: engineType,
      label: caps.displayName,
    }));
  }, [getAllCapabilities]);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.75rem', color: 'var(--color-text)', fontWeight: '500' }}>
        Engine:
      </label>
      <select 
        value={currentEngine}
        onChange={(e) => switchEngine(e.target.value as GraphEngineType)}
        style={{
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          backgroundColor: 'var(--color-cardBackground)',
          color: 'var(--color-text)',
          minWidth: '120px',
        }}
      >
        {engineOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// Settings Import/Export Utilities
// ============================================================================

export const exportSettings = (settings: GraphEngineSettings): string => {
  return JSON.stringify(settings, null, 2);
};

export const importSettings = (settingsJson: string): GraphEngineSettings | null => {
  try {
    const parsed = JSON.parse(settingsJson);
    // TODO: Add validation of the settings structure
    return parsed as GraphEngineSettings;
  } catch (error) {
    console.error('Failed to import settings:', error);
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