/**
 * Comparison timeline component
 * Visualizes temporal patterns across compared entities with interactive overlays
 */

import { 
  Box,
  Stack,
  Group,
  Text,
  Title,
  Alert,
  MultiSelect,
  SegmentedControl,
  ActionIcon,
  Tooltip,
  Card
} from '@mantine/core';
import { 
  IconDownload,
  IconSettings,
  IconEye,
  IconEyeOff,
  IconTrendingUp
} from '@tabler/icons-react';
import { useState, useMemo, useCallback } from 'react';

import { 
  LoadingSkeleton,
  ErrorMessage
} from '@/components';
import { getEntityColour } from '@/components/design-tokens.utils';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

import type { SizeVariant } from '../types';

export interface TimelineDataPoint {
  /** Year of the data point */
  year: number;
  /** Numeric value for the metric */
  value: number;
  /** Display label for tooltips */
  label: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface TimelineSeriesData {
  /** Unique identifier for the entity */
  entityId: string;
  /** Display name for the entity */
  entityName: string;
  /** Entity type for styling */
  entityType?: EntityType;
  /** Array of data points */
  dataPoints: TimelineDataPoint[];
  /** Series colour override */
  colour?: string;
  /** Whether series is visible */
  visible?: boolean;
}

export interface ComparisonTimelineProps {
  /** Timeline data for all entities */
  data: TimelineSeriesData[];
  /** Metric being visualized */
  metric: string;
  /** Chart title */
  title?: string;
  /** Chart description */
  description?: string;
  /** Layout mode for multiple series */
  layout?: 'overlay' | 'stacked' | 'separate';
  /** Whether to show trend lines */
  showTrendLines?: boolean;
  /** Whether to show confidence intervals */
  showConfidenceIntervals?: boolean;
  /** Whether to show entity selector */
  showEntitySelector?: boolean;
  /** Whether to show export options */
  showExportOptions?: boolean;
  /** Whether to animate transitions */
  animate?: boolean;
  /** Size variant */
  size?: SizeVariant;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Callback when point is hovered */
  onPointHover?: (point: TimelineDataPoint, series: TimelineSeriesData) => void;
  /** Callback when point is clicked */
  onPointClick?: (point: TimelineDataPoint, series: TimelineSeriesData) => void;
  /** Callback when entity selection changes */
  onEntitySelect?: (selectedEntityIds: string[]) => void;
  /** Callback when layout changes */
  onLayoutChange?: (layout: 'overlay' | 'stacked' | 'separate') => void;
  /** Callback when export is requested */
  onExport?: (format: string, data: TimelineSeriesData[]) => void;
  /** Custom class name */
  className?: string;
  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Get metric definition for display
 */
function getMetricDefinition(metric: string): {
  label: string;
  description: string;
  unit?: string;
} {
  const definitions: Record<string, { label: string; description: string; unit?: string }> = {
    works_count: { 
      label: 'Works Published', 
      description: 'Number of published works over time',
      unit: 'works'
    },
    cited_by_count: { 
      label: 'Citations Received', 
      description: 'Total citations received over time',
      unit: 'citations'
    },
    h_index: { 
      label: 'H-Index', 
      description: 'H-index progression over time'
    },
    collaboration_count: { 
      label: 'Collaborations', 
      description: 'Number of unique collaborators over time',
      unit: 'collaborators'
    }
  };

  return definitions[metric] || {
    label: metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: `${metric} over time`
  };
}

/**
 * Generate colours for timeline series
 */
function generateSeriesColour(entityType?: EntityType, index?: number): string {
  if (entityType) {
    return getEntityColour(entityType);
  }
  
  // Fallback colour palette for timeline series
  const colours = [
    '#3B82F6', // blue
    '#EF4444', // red  
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16'  // lime
  ];
  
  return colours[index! % colours.length];
}

/**
 * Process timeline data for visualization
 */
function processTimelineData(
  data: TimelineSeriesData[],
  visibleEntityIds?: string[]
): TimelineSeriesData[] {
  return data
    .filter(series => 
      !visibleEntityIds || visibleEntityIds.includes(series.entityId)
    )
    .map((series, index) => ({
      ...series,
      colour: series.colour || generateSeriesColour(series.entityType, index),
      visible: series.visible !== false
    }))
    .filter(series => series.visible);
}

export function ComparisonTimeline({
  data,
  metric,
  title,
  description,
  layout = 'overlay',
  showTrendLines = false,
  showConfidenceIntervals = false,
  showEntitySelector = false,
  showExportOptions = false,
  animate = true,
  size = 'md',
  loading = false,
  error,
  onPointHover,
  onPointClick,
  onEntitySelect,
  onLayoutChange,
  onExport,
  className,
  'data-testid': testId,
  ...props
}: ComparisonTimelineProps) {
  
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>(
    data.map(series => series.entityId)
  );
  const [currentLayout, setCurrentLayout] = useState(layout);
  
  const metricDef = useMemo(() => getMetricDefinition(metric), [metric]);
  
  const processedData = useMemo(() => 
    processTimelineData(data, selectedEntityIds),
    [data, selectedEntityIds]
  );
  
  // Handle entity selection
  const handleEntitySelection = useCallback((entityIds: string[]) => {
    setSelectedEntityIds(entityIds);
    onEntitySelect?.(entityIds);
  }, [onEntitySelect]);
  
  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: string) => {
    const layoutValue = newLayout as 'overlay' | 'stacked' | 'separate';
    setCurrentLayout(layoutValue);
    onLayoutChange?.(layoutValue);
  }, [onLayoutChange]);
  
  // Handle export
  const handleExport = useCallback((format: string) => {
    onExport?.(format, processedData);
  }, [onExport, processedData]);
  
  // Handle loading state
  if (loading) {
    return (
      <Box className={className} data-testid={testId} {...props}>
        <LoadingSkeleton height="400px" />
        <Text size="sm" c="dimmed" ta="center" mt="md">
          Loading timeline data...
        </Text>
      </Box>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <Box className={className} data-testid={testId} {...props}>
        <ErrorMessage message={error} />
      </Box>
    );
  }
  
  // Handle empty state
  if (data.length === 0) {
    return (
      <Box className={className} data-testid={testId} {...props}>
        <Alert title="No Timeline Data" color="gray">
          No timeline data available for comparison. Add entities with temporal data to see their patterns over time.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box className={className} data-testid={testId} {...props}>
      <Card shadow="sm" padding="md" withBorder>
        <Stack gap="md">
          {/* Header with title and controls */}
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs" style={{ flex: 1 }}>
              {title && (
                <Title order={3} size="h4">
                  {title}
                </Title>
              )}
              <Text size="sm" c="dimmed">
                {description || metricDef.description}
              </Text>
            </Stack>
            
            {/* Action buttons */}
            <Group gap="xs">
              {showExportOptions && (
                <Tooltip label="Export timeline">
                  <ActionIcon
                    variant="subtle"
                    size="lg"
                    aria-label="Export timeline"
                    onClick={() => handleExport('svg')}
                  >
                    <IconDownload size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              
              <Tooltip label="Chart settings">
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  aria-label="Chart settings"
                >
                  <IconSettings size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          
          {/* Controls */}
          <Group justify="space-between" align="center" wrap="wrap">
            {/* Entity selector */}
            {showEntitySelector && (
              <MultiSelect
                label="Select entities to display"
                placeholder="Choose entities..."
                value={selectedEntityIds}
                onChange={handleEntitySelection}
                data={data.map(series => ({
                  value: series.entityId,
                  label: series.entityName
                }))}
                size="sm"
                style={{ minWidth: '200px' }}
                aria-label="Select entities to display in timeline"
              />
            )}
            
            {/* Layout selector */}
            <SegmentedControl
              value={currentLayout}
              onChange={handleLayoutChange}
              data={[
                { label: 'Overlay', value: 'overlay' },
                { label: 'Stacked', value: 'stacked' },
                { label: 'Separate', value: 'separate' }
              ]}
              size="sm"
              aria-label="Timeline layout mode"
            />
            
            {/* Trend indicator */}
            {showTrendLines && (
              <Group gap="xs">
                <IconTrendingUp size={16} />
                <Text size="xs" c="dimmed">
                  Trend lines enabled
                </Text>
              </Group>
            )}
          </Group>
          
          {/* Timeline chart */}
          <Box
            style={{ 
              minHeight: size === 'sm' ? 300 : size === 'lg' ? 500 : 400,
              position: 'relative'
            }}
          >
{/* Placeholder timeline chart component */}
            <Box
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'var(--mantine-color-gray-0)',
                border: '1px dashed var(--mantine-color-gray-3)',
                borderRadius: 'var(--mantine-radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '1rem'
              }}
              aria-label={`${title || metricDef.label} timeline chart showing ${metricDef.label.toLowerCase()} over time for ${processedData.length} entities`}
              tabIndex={0}
              data-layout={currentLayout}
              data-show-trend-lines={showTrendLines}
              data-show-confidence-intervals={showConfidenceIntervals}
              data-animate={animate}
              data-size={size}
              data-testid="d3-timeline-chart"
              onClick={(e) => {
                // Prevent chart-level click handler when clicking on data points
                if (e.target !== e.currentTarget) return;
              }}
              onMouseEnter={(e) => {
                // Prevent chart-level hover handler when hovering on data points
                if (e.target !== e.currentTarget) return;
              }}
            >
              <Text size="lg" fw="bold" c="dimmed">
                Timeline Chart
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Interactive timeline visualization will be rendered here
              </Text>
              {/* Mock data points for testing */}
              {processedData.map((series, index) => (
                <Box key={series.entityId} data-testid={`timeline-series-${index}`}>
                  <Text size="sm" data-testid="series-name">{series.entityName}</Text>
                  {series.dataPoints.map((point, pointIndex) => (
                    <Box 
                      key={`${series.entityId}-${point.year}-${pointIndex}`}
                      data-testid={`data-point-${series.entityId}-${point.year}`}
                      onClick={() => onPointClick?.(point, series)}
                      onMouseEnter={() => onPointHover?.(point, series)}
                      style={{ 
                        cursor: 'pointer',
                        padding: '2px 4px',
                        margin: '1px',
                        backgroundColor: 'var(--mantine-color-blue-light)',
                        borderRadius: '2px',
                        fontSize: '10px',
                        display: 'inline-block'
                      }}
                    >
                      {point.year}: {point.value}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
          
          {/* Legend and summary stats */}
          <Group justify="space-between" align="center" wrap="wrap">
            {/* Entity legend */}
            <Group gap="sm">
              {processedData.slice(0, 5).map((series, index) => (
                <Group key={series.entityId} gap="xs">
                  <Box
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: series.colour
                    }}
                  />
                  <Text size="xs" truncate style={{ maxWidth: '100px' }}>
                    {series.entityName}
                  </Text>
                </Group>
              ))}
              {processedData.length > 5 && (
                <Text size="xs" c="dimmed">
                  +{processedData.length - 5} more
                </Text>
              )}
            </Group>
            
            {/* Summary stats */}
            <Group gap="md">
              <Text size="xs" c="dimmed">
                {processedData.length} {processedData.length === 1 ? 'entity' : 'entities'}
              </Text>
              {processedData.length > 0 && processedData[0].dataPoints.length > 0 && (
                <Text size="xs" c="dimmed">
                  {Math.min(...processedData.map(s => Math.min(...s.dataPoints.map(p => p.year))))} - {Math.max(...processedData.map(s => Math.max(...s.dataPoints.map(p => p.year))))}
                </Text>
              )}
            </Group>
          </Group>
        </Stack>
      </Card>
    </Box>
  );
}