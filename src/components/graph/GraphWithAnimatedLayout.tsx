/**
 * Example component showing how to integrate animated layout with existing graph
 * Drop-in replacement for standard graph components with animation support
 */

import React from 'react';
import { Group, Stack } from '@mantine/core';
import { AnimatedGraphControls } from './AnimatedGraphControls';
import { AnimatedLayoutProvider } from './AnimatedLayoutProvider';

interface GraphWithAnimatedLayoutProps {
  children: React.ReactNode;
  showControls?: boolean;
  controlsPosition?: 'top' | 'bottom' | 'left' | 'right';
  enabled?: boolean;
  onLayoutChange?: () => void;
  fitViewAfterLayout?: boolean;
  containerDimensions?: { width: number; height: number };
  className?: string;
  style?: React.CSSProperties;
}

export const GraphWithAnimatedLayout: React.FC<GraphWithAnimatedLayoutProps> = ({
  children,
  showControls = true,
  controlsPosition = 'top',
  enabled = true,
  onLayoutChange,
  fitViewAfterLayout = true,
  containerDimensions,
  className,
  style,
}) => {
  const controls = showControls ? (
    <AnimatedGraphControls
      enabled={enabled}
      onLayoutChange={onLayoutChange}
      fitViewAfterLayout={fitViewAfterLayout}
      containerDimensions={containerDimensions}
    />
  ) : null;

  const graphContent = (
    <AnimatedLayoutProvider
      enabled={enabled}
      onLayoutChange={onLayoutChange}
      fitViewAfterLayout={fitViewAfterLayout}
      containerDimensions={containerDimensions}
    >
      {children}
    </AnimatedLayoutProvider>
  );

  // Arrange controls and graph based on position
  const renderContent = () => {
    if (!showControls) {
      return graphContent;
    }

    switch (controlsPosition) {
      case 'top':
        return (
          <Stack gap="md">
            {controls}
            {graphContent}
          </Stack>
        );
      case 'bottom':
        return (
          <Stack gap="md">
            {graphContent}
            {controls}
          </Stack>
        );
      case 'left':
        return (
          <Group gap="md" align="flex-start">
            {controls}
            {graphContent}
          </Group>
        );
      case 'right':
        return (
          <Group gap="md" align="flex-start">
            {graphContent}
            {controls}
          </Group>
        );
      default:
        return (
          <Stack gap="md">
            {controls}
            {graphContent}
          </Stack>
        );
    }
  };

  return (
    <div className={className} style={style}>
      {renderContent()}
    </div>
  );
};

// Export individual components for granular usage
export { AnimatedGraphControls } from './AnimatedGraphControls';
export { AnimatedLayoutProvider } from './AnimatedLayoutProvider';