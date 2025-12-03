/**
 * ViewModeToggle - Switch between 2D and 3D visualization modes
 *
 * Provides a visual toggle for switching graph visualization modes,
 * with WebGL availability detection and informative tooltips.
 */

import type { ViewMode } from '@bibgraph/types';
import { detectWebGLCapabilities } from '@bibgraph/utils';
import { Box,SegmentedControl, Tooltip } from '@mantine/core';
import { IconAlertTriangle,IconCube, IconSquare } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

export interface ViewModeToggleProps {
  /** Current view mode */
  value: ViewMode;
  /** Callback when mode changes */
  onChange: (mode: ViewMode) => void;
  /** Disable the toggle entirely */
  disabled?: boolean;
  /** Size of the control */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Full width mode */
  fullWidth?: boolean;
}

export const ViewModeToggle = ({
  value,
  onChange,
  disabled = false,
  size = 'sm',
  fullWidth = false,
}: ViewModeToggleProps) => {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [webglReason, setWebglReason] = useState<string>('');

  // Check WebGL availability on mount
  useEffect(() => {
    const result = detectWebGLCapabilities();
    setWebglAvailable(result.available);
    setWebglReason(result.reason ?? '');
  }, []);

  // Show loading state while checking
  if (webglAvailable === null) {
    return (
      <SegmentedControl
        size={size}
        fullWidth={fullWidth}
        disabled
        data={[
          { label: '2D', value: '2D' },
          { label: '3D', value: '3D' },
        ]}
        value="2D"
      />
    );
  }

  // Disable 3D option if WebGL unavailable
  const is3DDisabled = !webglAvailable || disabled;

  const data = [
    {
      value: '2D' as const,
      label: (
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--mantine-spacing-xs)',
          }}
        >
          <IconSquare size={14} />
          <span>2D</span>
        </Box>
      ),
    },
    {
      value: '3D' as const,
      label: is3DDisabled ? (
        <Tooltip
          label={webglReason || '3D visualization is not available'}
          position="top"
          withArrow
          multiline
          w={220}
        >
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--mantine-spacing-xs)',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            <IconCube size={14} />
            <span>3D</span>
            {!webglAvailable && <IconAlertTriangle size={12} />}
          </Box>
        </Tooltip>
      ) : (
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--mantine-spacing-xs)',
          }}
        >
          <IconCube size={14} />
          <span>3D</span>
        </Box>
      ),
      disabled: is3DDisabled,
    },
  ];

  return (
    <SegmentedControl
      data-testid="view-mode-toggle"
      size={size}
      fullWidth={fullWidth}
      value={value}
      onChange={(val) => {
        // Only allow change to 3D if WebGL is available
        if (val === '3D' && is3DDisabled) {
          return;
        }
        onChange(val as ViewMode);
      }}
      data={data}
      disabled={disabled}
    />
  );
};
