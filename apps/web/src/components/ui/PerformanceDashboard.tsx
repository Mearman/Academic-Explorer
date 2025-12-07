/**
 * Performance Dashboard - Real-time graph visualization performance monitoring
 *
 * Provides comprehensive performance metrics for graph rendering including
 * frame rates, memory usage, node counts, and optimization recommendations.
 */

import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Divider,
  Grid,
  Group,
  Indicator,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
  Tooltip} from "@mantine/core";
import {
  IconActivity,
  IconAlertTriangle,
  IconBolt,
  IconClock,
  IconDatabase,
  IconGraph,
  IconMemoryStick,
  IconRefresh,
  IconTrendingDown,
  IconTrendingUp} from "@tabler/icons-react";
import { useCallback,useEffect, useRef, useState } from "react";

// Performance metrics interface
interface PerformanceMetrics {
  // Rendering metrics
  currentFPS: number;
  averageFPS: number;
  frameTimeMs: number;
  droppedFrames: number;

  // Memory metrics
  memoryUsedMB: number;
  memoryLimitMB: number;
  memoryPressure: number;

  // Graph metrics
  nodeCount: number;
  edgeCount: number;
  visibleNodes: number;
  culledNodes: number;

  // Optimization metrics
  cullingEfficiency: number;
  renderTimeMs: number;
  updateTimeMs: number;

  // System metrics
  cpuUsage: number;
  networkRequests: number;
  timestamp: number;
}

// Performance level types
type PerformanceLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

// Alert level types
type AlertLevel = 'info' | 'warning' | 'error' | 'success';

// Dashboard props
interface PerformanceDashboardProps {
  /** Whether to show the dashboard in expanded mode */
  expanded?: boolean;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Maximum history points to keep */
  maxHistoryPoints?: number;
  /** Callback for performance optimization suggestions */
  onOptimize?: (suggestions: string[]) => void;
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  fps: {
    excellent: 60,
    good: 45,
    fair: 30,
    poor: 15,
    critical: 10
  },
  frameTime: {
    excellent: 16,
    good: 22,
    fair: 33,
    poor: 66,
    critical: 100
  },
  memory: {
    excellent: 0.3,
    good: 0.5,
    fair: 0.7,
    poor: 0.85,
    critical: 0.95
  }
} as const;

/**
 * Performance Dashboard Component
 *
 * Real-time monitoring dashboard for graph visualization performance
 * @param root0
 * @param root0.expanded
 * @param root0.refreshInterval
 * @param root0.maxHistoryPoints
 * @param root0.onOptimize
 */
// Metric card component (extracted to avoid nested component definition)
interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  level: PerformanceLevel;
  icon: React.ReactNode;
  description?: string;
}

const MetricCard = ({ title, value, unit, level, icon, description }: MetricCardProps) => (
  <Card p="md" withBorder>
    <Group justify="space-between" align="flex-start">
      <Stack gap="xs">
        <Group gap="xs">
          {icon}
          <Text size="sm" c="dimmed">{title}</Text>
        </Group>
        <Text size="lg" fw={500}>
          {value}{unit}
        </Text>
        {description && (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        )}
      </Stack>
      <Indicator
        size={12}
        color={getLevelColor(level)}
        processing={level === 'fair'}
      />
    </Group>
  </Card>
);

/**
 * Performance Dashboard Component
 *
 * Real-time monitoring dashboard for graph visualization performance
 * @param root0
 * @param root0.expanded
 * @param root0.maxHistoryPoints
 * @param root0.onOptimize
 */
export const PerformanceDashboard = ({
  expanded = false,
  maxHistoryPoints = 60,
  onOptimize
}: PerformanceDashboardProps) => {
  // State management
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    currentFPS: 60,
    averageFPS: 60,
    frameTimeMs: 16,
    droppedFrames: 0,
    memoryUsedMB: 0,
    memoryLimitMB: 4096,
    memoryPressure: 0,
    nodeCount: 0,
    edgeCount: 0,
    visibleNodes: 0,
    culledNodes: 0,
    cullingEfficiency: 0,
    renderTimeMs: 0,
    updateTimeMs: 0,
    cpuUsage: 0,
    networkRequests: 0,
    timestamp: Date.now()
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<Array<{ level: AlertLevel; message: string }>>([]);

  // Refs for performance tracking
  const frameCount = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  const animationFrameId = useRef<number>();
  const monitorIntervalId = useRef<NodeJS.Timeout>();

  // Get performance level
  const getPerformanceLevel = useCallback((metric: number, thresholds: typeof PERFORMANCE_THRESHOLDS.fps): PerformanceLevel => {
    if (metric >= thresholds.excellent) return 'excellent';
    if (metric >= thresholds.good) return 'good';
    if (metric >= thresholds.fair) return 'fair';
    if (metric >= thresholds.poor) return 'poor';
    return 'critical';
  }, []);

  // Get level color
  const getLevelColor = useCallback((level: PerformanceLevel): string => {
    switch (level) {
      case 'excellent': return 'green';
      case 'good': return 'teal';
      case 'fair': return 'yellow';
      case 'poor': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  }, []);

  // Calculate memory usage
  const calculateMemoryUsage = useCallback(() => {
    if ('memory' in performance && performance.memory) {
      const used = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limit = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const pressure = used / limit;

      return {
        used: Math.round(used),
        limit: Math.round(limit),
        pressure: Math.round(pressure * 100)
      };
    }
    return { used: 0, limit: 4096, pressure: 0 };
  }, []);

  // Performance monitoring loop
  const measurePerformance = useCallback(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTime.current;

    frameCount.current++;
    fpsHistory.current.push(1000 / deltaTime);

    if (fpsHistory.current.length > 60) {
      fpsHistory.current = fpsHistory.current.slice(-60);
    }

    // Calculate FPS
    const currentFPS = Math.round(1000 / deltaTime);
    const averageFPS = Math.round(
      fpsHistory.current.reduce((sum, fps) => sum + fps, 0) / fpsHistory.current.length
    );

    // Get memory usage
    const memUsage = calculateMemoryUsage();

    // Create new metrics
    const newMetrics: PerformanceMetrics = {
      currentFPS,
      averageFPS,
      frameTimeMs: Math.round(deltaTime),
      droppedFrames: Math.max(0, frameCount.current - averageFPS),
      memoryUsedMB: memUsage.used,
      memoryLimitMB: memUsage.limit,
      memoryPressure: memUsage.pressure,
      nodeCount: 0, // These would be populated by graph component
      edgeCount: 0,
      visibleNodes: 0,
      culledNodes: 0,
      cullingEfficiency: 0,
      renderTimeMs: 0,
      updateTimeMs: 0,
      cpuUsage: 0, // Would need special permission in real app
      networkRequests: 0, // Would be tracked from fetch interceptors
      timestamp: currentTime
    };

    setMetrics(newMetrics);
    lastFrameTime.current = currentTime;
    animationFrameId.current = requestAnimationFrame(measurePerformance);
  }, [calculateMemoryUsage, maxHistoryPoints]);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (monitorIntervalId.current) {
        clearInterval(monitorIntervalId.current);
      }
      setIsMonitoring(false);
    } else {
      frameCount.current = 0;
      fpsHistory.current = [];
      lastFrameTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(measurePerformance);
      setIsMonitoring(true);
    }
  }, [isMonitoring, measurePerformance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (monitorIntervalId.current) {
        clearInterval(monitorIntervalId.current);
      }
    };
  }, []);

  // Generate optimization suggestions
  useEffect(() => {
    const suggestions: string[] = [];
    const newAlerts: Array<{ level: AlertLevel; message: string }> = [];

    // FPS-based suggestions
    const fpsLevel = getPerformanceLevel(metrics.currentFPS, PERFORMANCE_THRESHOLDS.fps);
    if (fpsLevel === 'poor' || fpsLevel === 'critical') {
      suggestions.push('Consider reducing node count or enabling viewport culling');
      newAlerts.push({
        level: 'warning',
        message: `Low FPS detected: ${metrics.currentFPS}`
      });
    }

    // Memory-based suggestions
    const memLevel = getPerformanceLevel(1 - metrics.memoryPressure / 100, {
      excellent: 0.7, good: 0.5, fair: 0.3, poor: 0.15, critical: 0
    });
    if (memLevel === 'poor' || memLevel === 'critical') {
      suggestions.push('Memory pressure high - consider reducing graph complexity');
      newAlerts.push({
        level: 'error',
        message: `High memory usage: ${metrics.memoryUsedMB}MB`
      });
    }

    // Culling efficiency suggestions
    if (metrics.cullingEfficiency < 0.5 && metrics.nodeCount > 100) {
      suggestions.push('Enable or optimize viewport culling for better performance');
    }

    setAlerts(newAlerts);

    if (suggestions.length > 0 && onOptimize) {
      onOptimize(suggestions);
    }
  }, [metrics, getPerformanceLevel, onOptimize]);

  // Performance card component
  const MetricCard = ({
    title,
    value,
    unit,
    level,
    icon,
    description
  }: {
    title: string;
    value: number;
    unit: string;
    level: PerformanceLevel;
    icon: React.ReactNode;
    description?: string;
  }) => (
    <Card p="md" withBorder>
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs">
          <Group gap="xs">
            {icon}
            <Text size="sm" c="dimmed">{title}</Text>
          </Group>
          <Text size="lg" fw={500}>
            {value}{unit}
          </Text>
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </Stack>
        <Indicator
          size={12}
          color={getLevelColor(level)}
          processing={level === 'fair'}
        />
      </Group>
    </Card>
  );

  return (
    <Paper p="lg" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconActivity size={20} />
            <Title order={3}>Performance Dashboard</Title>
            {isMonitoring && (
              <Badge color="green" variant="light">
                Monitoring
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            <Tooltip label={isMonitoring ? "Stop monitoring" : "Start monitoring"}>
              <ActionIcon
                variant={isMonitoring ? "filled" : "outline"}
                color={isMonitoring ? "green" : "blue"}
                onClick={toggleMonitoring}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Stack gap="xs">
            {alerts.map((alert, index) => (
              <Alert
                key={index}
                variant="light"
                color={alert.level === 'error' ? 'red' : alert.level === 'warning' ? 'orange' : 'blue'}
                icon={<IconAlertTriangle size={16} />}
              >
                <Text size="sm">{alert.message}</Text>
              </Alert>
            ))}
          </Stack>
        )}

        {/* Performance Metrics Grid */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <MetricCard
              title="Frame Rate"
              value={metrics.currentFPS}
              unit=" FPS"
              level={getPerformanceLevel(metrics.currentFPS, PERFORMANCE_THRESHOLDS.fps)}
              icon={<IconBolt size={16} />}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <MetricCard
              title="Frame Time"
              value={metrics.frameTimeMs}
              unit="ms"
              level={getPerformanceLevel(metrics.frameTimeMs, PERFORMANCE_THRESHOLDS.frameTime)}
              icon={<IconClock size={16} />}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <MetricCard
              title="Memory Usage"
              value={metrics.memoryUsedMB}
              unit="MB"
              level={getPerformanceLevel(1 - metrics.memoryPressure / 100, {
                excellent: 0.7, good: 0.5, fair: 0.3, poor: 0.15, critical: 0
              })}
              icon={<IconMemoryStick size={16} />}
              description={`${metrics.memoryPressure}% of limit`}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
            <MetricCard
              title="Dropped Frames"
              value={metrics.droppedFrames}
              unit=""
              level={metrics.droppedFrames === 0 ? 'excellent' :
                     metrics.droppedFrames < 5 ? 'good' :
                     metrics.droppedFrames < 20 ? 'fair' : 'critical'}
              icon={<IconTrendingDown size={16} />}
            />
          </Grid.Col>
        </Grid>

        {/* Graph Metrics */}
        <Divider label="Graph Statistics" />
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card p="md" withBorder>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconGraph size={16} />
                  <Text size="sm" c="dimmed">Nodes</Text>
                </Group>
                <Text size="lg" fw={500}>{metrics.nodeCount}</Text>
                <Text size="xs" c="dimmed">
                  {metrics.visibleNodes} visible, {metrics.culledNodes} culled
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card p="md" withBorder>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconGraph size={16} />
                  <Text size="sm" c="dimmed">Edges</Text>
                </Group>
                <Text size="lg" fw={500}>{metrics.edgeCount}</Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card p="md" withBorder>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconTrendingUp size={16} />
                  <Text size="sm" c="dimmed">Culling Efficiency</Text>
                </Group>
                <Progress
                  value={metrics.cullingEfficiency * 100}
                  color={metrics.cullingEfficiency > 0.7 ? 'green' :
                         metrics.cullingEfficiency > 0.4 ? 'yellow' : 'red'}
                  size="sm"
                />
                <Text size="xs" c="dimmed">
                  {Math.round(metrics.cullingEfficiency * 100)}% nodes culled
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card p="md" withBorder>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconDatabase size={16} />
                  <Text size="sm" c="dimmed">Render Time</Text>
                </Group>
                <Text size="lg" fw={500}>{metrics.renderTimeMs}ms</Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Status Summary */}
        {!expanded && (
          <Card p="md" withBorder bg="blue.0">
            <Group justify="space-between" align="center">
              <Stack gap={0}>
                <Text size="sm" fw={500}>Overall Performance</Text>
                <Text size="xs" c="dimmed">
                  Based on FPS, memory usage, and rendering metrics
                </Text>
              </Stack>
              <Badge
                size="lg"
                color={getLevelColor(
                  getPerformanceLevel(
                    Math.min(metrics.currentFPS, 100 - metrics.memoryPressure),
                    PERFORMANCE_THRESHOLDS.fps
                  )
                )}
              >
                {getPerformanceLevel(
                  Math.min(metrics.currentFPS, 100 - metrics.memoryPressure),
                  PERFORMANCE_THRESHOLDS.fps
                ).toUpperCase()}
              </Badge>
            </Group>
          </Card>
        )}
      </Stack>
    </Paper>
  );
};

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<PerformanceMetrics[]>([]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordings([]);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const addRecording = useCallback((metrics: PerformanceMetrics) => {
    if (isRecording) {
      setRecordings(prev => [...prev, metrics]);
    }
  }, [isRecording]);

  return {
    isRecording,
    recordings,
    startRecording,
    stopRecording,
    addRecording
  };
};