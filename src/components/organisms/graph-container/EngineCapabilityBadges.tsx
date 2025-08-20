/**
 * Engine Capability Badges Component
 * 
 * Visual indicators of engine features and capabilities.
 * Displays badges for supported features with appropriate styling and icons.
 */

import { clsx } from 'clsx';
import React from 'react';

import type { GraphEngineCapabilities } from '../graph-engines/provider';

import {
  capabilityBadges,
  capabilityBadge,
  badgeIcon,
} from './components.css';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EngineCapabilityBadgesProps {
  /** Engine capabilities to display */
  capabilities: GraphEngineCapabilities;
  
  /** Whether to use compact layout */
  compact?: boolean;
  
  /** Maximum number of badges to show */
  maxBadges?: number;
  
  /** Custom CSS class name */
  className?: string;
  
  /** Test ID for automation */
  'data-testid'?: string;
}

interface CapabilityConfig {
  key: keyof GraphEngineCapabilities['features'] | string;
  label: string;
  icon: string;
  getValue: (capabilities: GraphEngineCapabilities) => boolean | number | string;
  getIntensity?: (value: boolean | number | string) => 'low' | 'medium' | 'high';
  tooltip?: string;
}

// ============================================================================
// Capability Configurations
// ============================================================================

const CAPABILITY_CONFIGS: CapabilityConfig[] = [
  {
    key: 'animations',
    label: 'Animations',
    icon: 'ANIM',
    getValue: (caps) => caps.features.animations,
    tooltip: 'Supports real-time animations and transitions',
  },
  {
    key: 'zoomPan',
    label: 'Zoom & Pan',
    icon: 'ZOOM',
    getValue: (caps) => caps.features.zoomPan,
    tooltip: 'Supports interactive zooming and panning',
  },
  {
    key: 'vertexDragging',
    label: 'Dragging',
    icon: 'DRAG',
    getValue: (caps) => caps.features.vertexDragging,
    tooltip: 'Supports vertex dragging interactions',
  },
  {
    key: 'clustering',
    label: 'Clustering',
    icon: 'CLSTR',
    getValue: (caps) => caps.features.clustering,
    tooltip: 'Supports node clustering and grouping',
  },
  {
    key: 'customVertexShapes',
    label: 'Custom Shapes',
    icon: 'SHAPE',
    getValue: (caps) => caps.features.customVertexShapes,
    tooltip: 'Supports custom vertex shapes and styling',
  },
  {
    key: 'edgeLabels',
    label: 'Edge Labels',
    icon: 'LABEL',
    getValue: (caps) => caps.features.edgeLabels,
    tooltip: 'Supports labels on edges',
  },
  {
    key: 'levelOfDetail',
    label: 'LOD',
    icon: 'LOD',
    getValue: (caps) => caps.features.levelOfDetail,
    tooltip: 'Level-of-detail rendering for performance',
  },
  {
    key: 'hardwareAcceleration',
    label: 'GPU',
    icon: 'GPU',
    getValue: (caps) => caps.performance.hardwareAccelerated,
    tooltip: 'Hardware acceleration support',
  },
  {
    key: 'memoryEfficiency',
    label: 'Memory',
    icon: 'MEM',
    getValue: (caps) => caps.performance.memoryEfficiency,
    getIntensity: (value) => {
      const rating = value as number;
      if (rating >= 4) return 'high';
      if (rating >= 3) return 'medium';
      return 'low';
    },
    tooltip: 'Memory efficiency rating',
  },
  {
    key: 'renderingSpeed',
    label: 'Speed',
    icon: 'SPEED',
    getValue: (caps) => caps.performance.renderingSpeed,
    getIntensity: (value) => {
      const rating = value as number;
      if (rating >= 4) return 'high';
      if (rating >= 3) return 'medium';
      return 'low';
    },
    tooltip: 'Rendering speed rating',
  },
];

const EXPORT_CONFIGS: CapabilityConfig[] = [
  {
    key: 'png',
    label: 'PNG',
    icon: 'PNG',
    getValue: (caps) => caps.features.export.png,
    tooltip: 'PNG image export support',
  },
  {
    key: 'svg',
    label: 'SVG',
    icon: 'SVG',
    getValue: (caps) => caps.features.export.svg,
    tooltip: 'SVG vector export support',
  },
  {
    key: 'pdf',
    label: 'PDF',
    icon: 'PDF',
    getValue: (caps) => caps.features.export.pdf,
    tooltip: 'PDF document export support',
  },
  {
    key: 'json',
    label: 'JSON',
    icon: 'JSON',
    getValue: (caps) => caps.features.export.json,
    tooltip: 'JSON data export support',
  },
];

// ============================================================================
// Component Implementation
// ============================================================================

export function EngineCapabilityBadges({
  capabilities,
  compact = false,
  maxBadges,
  className,
  'data-testid': testId = 'engine-capability-badges',
}: EngineCapabilityBadgesProps): React.JSX.Element {
  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const renderCapabilityBadge = (config: CapabilityConfig) => {
    const value = config.getValue(capabilities);
    const isSupported = Boolean(value);
    const intensity = config.getIntensity?.(value);
    
    // For numeric values, show the rating
    const displayValue = typeof value === 'number' ? `${value}/5` : null;
    
    return (
      <div
        key={config.key}
        className={capabilityBadge({
          supported: isSupported,
          intensity,
        })}
        title={config.tooltip}
        aria-label={`${config.label}: ${isSupported ? 'supported' : 'not supported'}${displayValue ? ` (${displayValue})` : ''}`}
        data-testid={`${testId}-${config.key}`}
      >
        <span className={badgeIcon} aria-hidden="true">
          {config.icon}
        </span>
        
        <span>
          {config.label}
          {displayValue && (
            <span style={{ marginLeft: '4px', fontSize: '0.9em' }}>
              {displayValue}
            </span>
          )}
        </span>
      </div>
    );
  };
  
  // ============================================================================
  // Badge Selection Logic
  // ============================================================================
  
  const selectedConfigs = React.useMemo(() => {
    // Combine main capabilities and export capabilities
    const allConfigs = compact ? 
      [...CAPABILITY_CONFIGS.slice(0, 6), ...EXPORT_CONFIGS.slice(0, 2)] : 
      [...CAPABILITY_CONFIGS, ...EXPORT_CONFIGS];
    
    // Filter by supported capabilities if compact mode
    let filteredConfigs = compact ? 
      allConfigs.filter(config => Boolean(config.getValue(capabilities))) :
      allConfigs;
    
    // Apply max badges limit
    if (maxBadges && filteredConfigs.length > maxBadges) {
      // Prioritize most important capabilities
      const priorityOrder = [
        'animations', 'zoomPan', 'vertexDragging', 'hardwareAcceleration',
        'clustering', 'customVertexShapes', 'levelOfDetail', 'memoryEfficiency',
        'renderingSpeed', 'edgeLabels', 'png', 'svg', 'pdf', 'json'
      ];
      
      filteredConfigs = filteredConfigs
        .sort((a, b) => {
          const aIndex = priorityOrder.indexOf(a.key);
          const bIndex = priorityOrder.indexOf(b.key);
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        })
        .slice(0, maxBadges);
    }
    
    return filteredConfigs;
  }, [capabilities, compact, maxBadges]);
  
  // ============================================================================
  // Performance Summary
  // ============================================================================
  
  const performanceSummary = React.useMemo(() => {
    const { performance } = capabilities;
    const avgRating = (performance.memoryEfficiency + performance.renderingSpeed) / 2;
    
    let status: string;
    let emoji: string;
    
    if (avgRating >= 4) {
      status = 'Excellent';
      emoji = 'STAR';
    } else if (avgRating >= 3) {
      status = 'Good';
      emoji = 'GOOD';
    } else if (avgRating >= 2) {
      status = 'Average';
      emoji = 'WARN';
    } else {
      status = 'Limited';
      emoji = 'SLOW';
    }
    
    return { status, emoji, avgRating };
  }, [capabilities]);
  
  // ============================================================================
  // Render
  // ============================================================================
  
  if (selectedConfigs.length === 0) {
    return (
      <div
        className={clsx(capabilityBadges, className)}
        data-testid={testId}
      >
        <div
          className={capabilityBadge({ supported: false })}
          title="No capabilities available"
        >
          <span className={badgeIcon}>NO</span>
          <span>No features</span>
        </div>
      </div>
    );
  }
  
  return (
    <div
      className={clsx(capabilityBadges, className)}
      data-testid={testId}
      aria-label="Engine capabilities"
    >
      {/* Performance Summary (compact mode) */}
      {compact && (
        <div
          className={capabilityBadge({ supported: true, intensity: 'high' })}
          title={`Overall performance: ${performanceSummary.status} (${performanceSummary.avgRating.toFixed(1)}/5)`}
          data-testid={`${testId}-performance-summary`}
        >
          <span className={badgeIcon} aria-hidden="true">
            {performanceSummary.emoji}
          </span>
          <span>{performanceSummary.status}</span>
        </div>
      )}
      
      {/* Capability Badges */}
      {selectedConfigs.map(renderCapabilityBadge)}
      
      {/* More indicator */}
      {maxBadges && CAPABILITY_CONFIGS.length + EXPORT_CONFIGS.length > maxBadges && (
        <div
          className={capabilityBadge({ supported: true, intensity: 'medium' })}
          title={`${CAPABILITY_CONFIGS.length + EXPORT_CONFIGS.length - maxBadges} more capabilities available`}
          data-testid={`${testId}-more-indicator`}
        >
          <span className={badgeIcon} aria-hidden="true">
            PLUS
          </span>
          <span>
            +{CAPABILITY_CONFIGS.length + EXPORT_CONFIGS.length - maxBadges} more
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Display Name
// ============================================================================

EngineCapabilityBadges.displayName = 'EngineCapabilityBadges';

// Named export only - no default export