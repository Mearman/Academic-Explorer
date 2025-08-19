import { Group, ActionIcon, Select, Tooltip, Divider } from '@mantine/core';
import { 
  IconMaximize, 
  IconMinimize, 
  IconRefresh, 
  IconDownload, 
  IconFileTypePng, 
  IconFileTypeSvg, 
  IconSearch, 
  IconSearchOff,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset
} from '@tabler/icons-react';
import React from 'react';

import type { GraphEngine } from './UniversalGraphContainer';

interface GraphToolbarProps {
  currentEngine: GraphEngine;
  availableEngines: GraphEngine[];
  isFullscreen: boolean;
  onEngineChange: (engineId: string) => void;
  onToggleFullscreen: () => void;
  onRegenerateLayout: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onToggleSearch?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  showSearch: boolean;
  zoom: number;
}

export function GraphToolbar({
  currentEngine,
  availableEngines,
  isFullscreen,
  onEngineChange,
  onToggleFullscreen,
  onRegenerateLayout,
  onExportPNG,
  onExportSVG,
  onToggleSearch,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  showSearch,
  zoom,
}: GraphToolbarProps) {
  // Filter to only supported engines
  const supportedEngines = availableEngines.filter(engine => engine.isSupported());
  
  // Prepare engine select data
  const engineSelectData = supportedEngines.map(engine => ({
    value: engine.id,
    label: `${engine.name} v${engine.version}`,
    group: engine.capabilities.performanceLevel,
    disabled: engine.isLoading || !!engine.error
  }));

  // Group engines by performance level for better UX
  const groupedEngineData = [
    // High performance engines first
    ...engineSelectData.filter(e => e.group === 'high'),
    // Medium performance engines
    ...engineSelectData.filter(e => e.group === 'medium'),
    // Low performance engines last
    ...engineSelectData.filter(e => e.group === 'low')
  ];

  return (
    <Group
      gap="xs"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Engine Selector */}
      <Select
        data={groupedEngineData}
        value={currentEngine.id}
        onChange={(value) => value && onEngineChange(value)}
        placeholder="Select graph engine"
        style={{ minWidth: '200px' }}
        comboboxProps={{
          withinPortal: true,
          shadow: 'md',
          transitionProps: { transition: 'fade', duration: 200 }
        }}
        renderOption={({ option }) => {
          const engine = supportedEngines.find(e => e.id === option.value);
          if (!engine) return option.label;
          
          return (
            <div>
              <div style={{ fontWeight: 500 }}>{engine.name}</div>
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--mantine-color-gray-6)',
                marginTop: '2px'
              }}>
                {engine.description}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--mantine-color-gray-5)',
                marginTop: '2px'
              }}>
                Max: {engine.capabilities.maxVertices || '∞'} vertices • 
                Performance: {engine.capabilities.performanceLevel}
              </div>
            </div>
          );
        }}
      />

      <Divider orientation="vertical" style={{ height: '24px' }} />

      {/* Zoom Controls */}
      {(onZoomIn || onZoomOut || onZoomReset) && (
        <>
          <Group gap="xs">
            {onZoomIn && (
              <Tooltip label="Zoom In (Ctrl/Cmd + +)">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={onZoomIn}
                  aria-label="Zoom in"
                >
                  <IconZoomIn size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {onZoomOut && (
              <Tooltip label="Zoom Out (Ctrl/Cmd + -)">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={onZoomOut}
                  aria-label="Zoom out"
                >
                  <IconZoomOut size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {onZoomReset && (
              <Tooltip label={`Reset Zoom (${Math.round(zoom * 100)}%)`}>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={onZoomReset}
                  aria-label="Reset zoom"
                >
                  <IconZoomReset size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
          <Divider orientation="vertical" style={{ height: '24px' }} />
        </>
      )}

      {/* Layout Controls */}
      <Tooltip label="Regenerate Layout (R)">
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={onRegenerateLayout}
          aria-label="Regenerate graph layout"
        >
          <IconRefresh size={16} />
        </ActionIcon>
      </Tooltip>

      {/* Search Control */}
      {onToggleSearch && (
        <Tooltip label={showSearch ? "Close Search (Esc)" : "Search Vertices (Ctrl/Cmd + F)"}>
          <ActionIcon
            variant={showSearch ? "filled" : "subtle"}
            size="sm"
            onClick={onToggleSearch}
            aria-label={showSearch ? "Close search" : "Open search"}
          >
            {showSearch ? <IconSearchOff size={16} /> : <IconSearch size={16} />}
          </ActionIcon>
        </Tooltip>
      )}

      <Divider orientation="vertical" style={{ height: '24px' }} />

      {/* Export Controls */}
      {(onExportPNG || onExportSVG) && (
        <Group gap="xs">
          {onExportPNG && (
            <Tooltip label="Export as PNG (Ctrl/Cmd + Shift + P)">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onExportPNG}
                aria-label="Export graph as PNG image"
              >
                <IconFileTypePng size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {onExportSVG && (
            <Tooltip label="Export as SVG (Ctrl/Cmd + Shift + S)">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onExportSVG}
                aria-label="Export graph as SVG vector"
              >
                <IconFileTypeSvg size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      )}

      {/* Fullscreen Toggle */}
      <Divider orientation="vertical" style={{ height: '24px' }} />
      <Tooltip label={isFullscreen ? "Exit Fullscreen (F11 or Esc)" : "Enter Fullscreen (F11)"}>
        <ActionIcon
          variant={isFullscreen ? "filled" : "subtle"}
          size="sm"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
