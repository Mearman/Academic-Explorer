import { Group, Text, Badge, Tooltip } from '@mantine/core';
import { 
  IconCpu,
  IconEye,
  IconUsers,
  IconNetwork,
  IconClock,
  IconFlame,
  IconDatabase
} from '@tabler/icons-react';
import React, { useMemo } from 'react';

import type { GraphEngine, GraphEnginePerformanceMetrics } from './UniversalGraphContainer';

interface GraphStatusBarProps {
  engine: GraphEngine;
  performanceMetrics: GraphEnginePerformanceMetrics | null;
  vertexCount: number;
  edgeCount: number;
  isSimulating: boolean;
}

// Format bytes to human readable format
function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format render time to human readable format
function formatRenderTime(milliseconds: number): string {
  if (milliseconds < 1) return `${(milliseconds * 1000).toFixed(0)}μs`;
  if (milliseconds < 1000) return `${milliseconds.toFixed(1)}ms`;
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

// Get performance level badge color
function getPerformanceLevelColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high': return 'green';
    case 'medium': return 'yellow';
    case 'low': return 'orange';
    default: return 'gray';
  }
}

// Get FPS status color
function getFpsStatusColor(fps?: number): string {
  if (!fps) return 'gray';
  if (fps >= 50) return 'green';
  if (fps >= 30) return 'yellow';
  if (fps >= 20) return 'orange';
  return 'red';
}

export function GraphStatusBar({
  engine,
  performanceMetrics,
  vertexCount,
  edgeCount,
  isSimulating,
}: GraphStatusBarProps) {
  // Calculate graph complexity score
  const complexityScore = useMemo(() => {
    const vertexScore = Math.log10(Math.max(1, vertexCount)) / 3; // 0-1 based on 1-1000 vertices
    const edgeScore = Math.log10(Math.max(1, edgeCount)) / 4; // 0-1 based on 1-10000 edges
    const complexity = (vertexScore + edgeScore) / 2;
    
    if (complexity < 0.3) return { level: 'Simple', color: 'green' };
    if (complexity < 0.6) return { level: 'Moderate', color: 'yellow' };
    if (complexity < 0.8) return { level: 'Complex', color: 'orange' };
    return { level: 'Very Complex', color: 'red' };
  }, [vertexCount, edgeCount]);

  // Check if graph exceeds engine limits
  const exceedsLimits = useMemo(() => {
    if (!engine.capabilities.maxVertices) return false;
    return vertexCount > engine.capabilities.maxVertices;
  }, [vertexCount, engine.capabilities.maxVertices]);

  return (
    <Group
      gap="md"
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        fontSize: '12px'
      }}
    >
      {/* Engine Information */}
      <Group gap="xs">
        <IconCpu size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
        <Text size="xs" fw={500}>{engine.name}</Text>
        <Badge 
          size="xs" 
          variant="light" 
          color={getPerformanceLevelColor(engine.capabilities.performanceLevel)}
        >
          {engine.capabilities.performanceLevel}
        </Badge>
      </Group>

      {/* Graph Statistics */}
      <Group gap="xs">
        <Tooltip label="Number of vertices (entities) in the graph">
          <Group gap={4}>
            <IconUsers size={14} style={{ color: 'var(--mantine-color-blue-6)' }} />
            <Text 
              size="xs" 
              c={exceedsLimits ? 'red' : 'dark'}
              fw={exceedsLimits ? 600 : 400}
            >
              {vertexCount.toLocaleString()}
            </Text>
          </Group>
        </Tooltip>
        
        <Tooltip label="Number of edges (relationships) in the graph">
          <Group gap={4}>
            <IconNetwork size={14} style={{ color: 'var(--mantine-color-green-6)' }} />
            <Text size="xs">{edgeCount.toLocaleString()}</Text>
          </Group>
        </Tooltip>
      </Group>

      {/* Complexity Indicator */}
      <Tooltip label={`Graph complexity based on vertex and edge count`}>
        <Badge 
          size="xs" 
          variant="light" 
          color={complexityScore.color}
        >
          {complexityScore.level}
        </Badge>
      </Tooltip>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <Group gap="xs">
          {/* Frame Rate */}
          {performanceMetrics.fps && (
            <Tooltip label={`Rendering frame rate: ${performanceMetrics.fps} FPS`}>
              <Group gap={4}>
                <IconEye 
                  size={14} 
                  style={{ color: `var(--mantine-color-${getFpsStatusColor(performanceMetrics.fps)}-6)` }} 
                />
                <Text 
                  size="xs" 
                  c={getFpsStatusColor(performanceMetrics.fps)}
                  fw={performanceMetrics.fps < 30 ? 600 : 400}
                >
                  {performanceMetrics.fps} FPS
                </Text>
              </Group>
            </Tooltip>
          )}

          {/* Render Time */}
          {performanceMetrics.renderTime > 0 && (
            <Tooltip label={`Last render time: ${formatRenderTime(performanceMetrics.renderTime)}`}>
              <Group gap={4}>
                <IconClock size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
                <Text size="xs">{formatRenderTime(performanceMetrics.renderTime)}</Text>
              </Group>
            </Tooltip>
          )}

          {/* Memory Usage */}
          {performanceMetrics.memoryUsage && (
            <Tooltip label={`JavaScript heap memory usage: ${formatBytes(performanceMetrics.memoryUsage)}`}>
              <Group gap={4}>
                <IconDatabase size={14} style={{ color: 'var(--mantine-color-grape-6)' }} />
                <Text size="xs">{formatBytes(performanceMetrics.memoryUsage)}</Text>
              </Group>
            </Tooltip>
          )}
        </Group>
      )}

      {/* Simulation Status */}
      {isSimulating && (
        <Tooltip label="Graph layout is being recalculated">
          <Badge 
            size="xs" 
            variant="light" 
            color="orange"
            style={{ animation: 'pulse 2s infinite' }}
          >
            <Group gap={4}>
              <IconFlame size={10} />
              Simulating
            </Group>
          </Badge>
        </Tooltip>
      )}

      {/* Warning for exceeding limits */}
      {exceedsLimits && (
        <Tooltip label={`Graph has ${vertexCount} vertices but engine supports max ${engine.capabilities.maxVertices}. Performance may be degraded.`}>
          <Badge size="xs" variant="light" color="red">
            Limit Exceeded
          </Badge>
        </Tooltip>
      )}
    </Group>
  );
}
