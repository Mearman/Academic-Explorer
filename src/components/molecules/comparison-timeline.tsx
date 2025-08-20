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
  SegmentedControl as _SegmentedControl,
  ActionIcon,
  Tooltip,
  Card
} from '@mantine/core';
import { 
  IconDownload,
  IconSettings,
  IconEyeOff as _IconEyeOff,
  IconTrendingUp as _IconTrendingUp
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
  metadata?: Record<string, unknown>;
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

// Hook for timeline state management
const useComparisonTimelineState = (data: TimelineSeriesData[], layout: 'overlay' | 'stacked' | 'separate') => {
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>(
    data.map(series => series.entityId)
  );
  const [currentLayout, setCurrentLayout] = useState(layout);
  
  return {
    selectedEntityIds,
    setSelectedEntityIds,
    currentLayout,
    setCurrentLayout,
  };
};

// Hook for timeline handlers
const useComparisonTimelineHandlers = (
  state: ReturnType<typeof useComparisonTimelineState>,
  processedData: TimelineSeriesData[],
  onEntitySelect?: (entityIds: string[]) => void,
  onLayoutChange?: (layout: 'overlay' | 'stacked' | 'separate') => void,
  onExport?: (format: string, data: TimelineSeriesData[]) => void
) => {
  const { setSelectedEntityIds, setCurrentLayout } = state;
  
  const handleEntitySelection = useCallback((entityIds: string[]) => {
    setSelectedEntityIds(entityIds);
    onEntitySelect?.(entityIds);
  }, [onEntitySelect, setSelectedEntityIds]);
  
  const handleLayoutChange = useCallback((newLayout: string) => {
    const layoutValue = newLayout as 'overlay' | 'stacked' | 'separate';
    setCurrentLayout(layoutValue);
    onLayoutChange?.(layoutValue);
  }, [onLayoutChange, setCurrentLayout]);
  
  const handleExport = useCallback((format: string) => {
    onExport?.(format, processedData);
  }, [onExport, processedData]);
  
  return {
    handleEntitySelection,
    handleLayoutChange,
    handleExport,
  };
};

export function ComparisonTimeline(props: ComparisonTimelineProps) {
  const {
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
    ...restProps
  } = props;
  
  const state = useComparisonTimelineState(data, layout);
  const metricDef = useMemo(() => getMetricDefinition(metric), [metric]);
  const processedData = useMemo(() => 
    processTimelineData(data, state.selectedEntityIds),
    [data, state.selectedEntityIds]
  );
  const handlers = useComparisonTimelineHandlers(state, processedData, onEntitySelect, onLayoutChange, onExport);
  
  // Handle special states
  if (loading) {
    return <ComparisonTimelineLoading className={className} testId={testId} {...restProps} />;
  }
  
  if (error) {
    return <ComparisonTimelineError error={error} className={className} testId={testId} {...restProps} />;
  }
  
  if (data.length === 0) {
    return <ComparisonTimelineEmpty className={className} testId={testId} {...restProps} />;
  }
  
  return (
    <ComparisonTimelineContent
      data={processedData}
      metric={metric}
      metricDef={metricDef}
      title={title}
      description={description}
      state={state}
      handlers={handlers}
      showTrendLines={showTrendLines}
      showConfidenceIntervals={showConfidenceIntervals}
      showEntitySelector={showEntitySelector}
      showExportOptions={showExportOptions}
      animate={animate}
      size={size}
      onPointHover={onPointHover}
      onPointClick={onPointClick}
      className={className}
      testId={testId}
      {...restProps}
    />
  );
};

// Loading state component
interface ComparisonTimelineLoadingProps {
  className?: string;
  testId?: string;
  [key: string]: unknown;
}

const ComparisonTimelineLoading = ({ className, testId, ...props }: ComparisonTimelineLoadingProps) => (
  <Box className={className} data-testid={testId} {...props}>
    <LoadingSkeleton height="400px" />
    <Text size="sm" c="dimmed" ta="center" mt="md">
      Loading timeline data...
    </Text>
  </Box>
);

// Error state component
interface ComparisonTimelineErrorProps {
  error: string;
  className?: string;
  testId?: string;
  [key: string]: unknown;
}

const ComparisonTimelineError = ({ error, className, testId, ...props }: ComparisonTimelineErrorProps) => (
  <Box className={className} data-testid={testId} {...props}>
    <ErrorMessage message={error} />
  </Box>
);

// Empty state component
interface ComparisonTimelineEmptyProps {
  className?: string;
  testId?: string;
  [key: string]: unknown;
}

const ComparisonTimelineEmpty = ({ className, testId, ...props }: ComparisonTimelineEmptyProps) => (
  <Box className={className} data-testid={testId} {...props}>
    <Alert title="No Timeline Data" color="gray">
      No timeline data available for comparison. Add entities with temporal data to see their patterns over time.
    </Alert>
  </Box>
);

// Content component interface
interface ComparisonTimelineContentProps {
  data: TimelineSeriesData[];
  metric: string;
  metricDef: ReturnType<typeof getMetricDefinition>;
  title?: string;
  description?: string;
  state: ReturnType<typeof useComparisonTimelineState>;
  handlers: ReturnType<typeof useComparisonTimelineHandlers>;
  showTrendLines: boolean;
  showConfidenceIntervals: boolean;
  showEntitySelector: boolean;
  showExportOptions: boolean;
  animate: boolean;
  size: SizeVariant;
  onPointHover?: (point: TimelineDataPoint, series: TimelineSeriesData) => void;
  onPointClick?: (point: TimelineDataPoint, series: TimelineSeriesData) => void;
  className?: string;
  testId?: string;
  [key: string]: unknown;
}

// Content component implementation
const ComparisonTimelineContent = ({ 
  data, 
  _metric, 
  metricDef, 
  title, 
  description, 
  state, 
  handlers, 
  _showTrendLines,
  _showConfidenceIntervals,
  showEntitySelector,
  showExportOptions,
  _animate,
  size,
  _onPointHover,
  _onPointClick,
  className, 
  testId, 
  ...props 
}: ComparisonTimelineContentProps) => {
  const { selectedEntityIds, currentLayout: _currentLayout } = state;
  const { handleEntitySelection, handleLayoutChange: _handleLayoutChange, handleExport } = handlers;

  // Define chart dimensions based on size
  const CHART_HEIGHT = {
    xs: 200,
    sm: 250,
    md: 300,
    lg: 400,
    xl: 500
  };

  return (
    <Box className={className} data-testid={testId} {...props}>
      <Card withBorder>
        <Stack gap="lg">
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
                data={data.map(d => ({ 
                  value: d.entityId, 
                  label: d.entityName || d.entityId 
                }))}
                clearable
                searchable
                maxDropdownHeight={300}
              />
            )}
          </Group>
          
          {/* Chart container */}
          <Box 
            style={{
              height: CHART_HEIGHT[size],
              width: '100%',
              backgroundColor: 'var(--mantine-color-gray-0)',
              borderRadius: 'var(--mantine-radius-md)',
              padding: 'var(--mantine-spacing-md)',
              border: '1px solid var(--mantine-color-gray-3)',
            }}
          >
            {/* Chart placeholder */}
            <Text ta="center" c="dimmed" py="xl">
              Chart visualization would be rendered here
            </Text>
          </Box>
          
          {/* Footer with entity summary and year range */}
          <Group justify="space-between" align="center" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
            {/* Summary stats */}
            <Group gap="md">
              <Text size="xs" c="dimmed">
                {data.length} {data.length === 1 ? 'entity' : 'entities'}
              </Text>
              {data.length > 0 && data[0].dataPoints.length > 0 && (
                <Text size="xs" c="dimmed">
                  {Math.min(...data.map(s => Math.min(...s.dataPoints.map(p => p.year))))} - {Math.max(...data.map(s => Math.max(...s.dataPoints.map(p => p.year))))}
                </Text>
              )}
            </Group>
          </Group>
        </Stack>
      </Card>
    </Box>
  );
};