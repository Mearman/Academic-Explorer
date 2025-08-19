/**
 * Comparison metrics grid component
 * Displays comparison metrics in table or card format with sorting and interaction
 */

import { 
  Table, 
  Card, 
  Group, 
  Stack, 
  Text, 
  Center, 
  Box,
  Alert,
  Skeleton
} from '@mantine/core';
import { useState, useMemo } from 'react';

import { 
  ComparisonMetricValue,
  LoadingSkeleton,
  ErrorMessage
} from '@/components';
import type { ComparisonMetrics } from '@/hooks/use-comparison-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

import type { SizeVariant } from '../types';

export interface ComparisonMetricsGridProps {
  /** Array of comparison metrics to display */
  metrics: ComparisonMetrics[];
  /** Layout style */
  layout?: 'table' | 'cards' | 'compact';
  /** Whether to show rank indicators */
  showRanks?: boolean;
  /** Whether to show percentiles in ranks */
  showPercentiles?: boolean;
  /** Whether to emphasize extreme values */
  emphasizeExtremes?: boolean;
  /** Entity ID to highlight */
  highlightedEntity?: string;
  /** Metric to sort by */
  sortBy?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Size variant */
  size?: SizeVariant;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Callback when entity is clicked */
  onEntityClick?: (entityId: string) => void;
  /** Callback when metric is clicked */
  onMetricClick?: (entityId: string, metricKey: string) => void;
  /** Custom class name */
  className?: string;
  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Get metric definition for display
 */
function getMetricDefinition(key: string, entityType: EntityType): {
  label: string;
  description: string;
  format: string;
} {
  const definitions: Record<string, Record<string, { label: string; description: string; format: string }>> = {
    [EntityType.AUTHOR]: {
      citedByCount: { label: 'Citations', description: 'Total citations received', format: 'number' },
      worksCount: { label: 'Works', description: 'Number of published works', format: 'number' },
      hIndex: { label: 'H-Index', description: 'h-index metric', format: 'number' },
      i10Index: { label: 'i10-Index', description: 'i10-index metric', format: 'number' },
      twoYearMeanCitedness: { label: '2-Year Mean', description: '2-year mean citedness', format: 'decimal' }
    },
    [EntityType.WORK]: {
      citedByCount: { label: 'Citations', description: 'Number of citations', format: 'number' },
      fwci: { label: 'FWCI', description: 'Field-weighted citation impact', format: 'decimal' },
      referencedWorksCount: { label: 'References', description: 'Number of referenced works', format: 'number' },
      institutionsDistinctCount: { label: 'Institutions', description: 'Number of distinct institutions', format: 'number' },
      countriesDistinctCount: { label: 'Countries', description: 'Number of distinct countries', format: 'number' },
      publicationYear: { label: 'Publication Year', description: 'Year of publication', format: 'year' }
    },
    [EntityType.SOURCE]: {
      citedByCount: { label: 'Citations', description: 'Total citations received', format: 'number' },
      worksCount: { label: 'Works', description: 'Number of published works', format: 'number' },
      hIndex: { label: 'H-Index', description: 'h-index metric', format: 'number' },
      i10Index: { label: 'i10-Index', description: 'i10-index metric', format: 'number' }
    },
    [EntityType.INSTITUTION]: {
      citedByCount: { label: 'Citations', description: 'Total citations received', format: 'number' },
      worksCount: { label: 'Works', description: 'Number of published works', format: 'number' }
    }
  };

  return definitions[entityType]?.[key] || {
    label: key,
    description: `${key} metric`,
    format: 'number'
  };
}

/**
 * Extract and sort metric keys from comparison metrics
 */
function getMetricKeys(metrics: ComparisonMetrics[]): string[] {
  if (metrics.length === 0) return [];
  
  const allKeys = new Set<string>();
  metrics.forEach(metric => {
    Object.keys(metric.metrics).forEach(key => {
      if (metric.metrics[key as keyof typeof metric.metrics]) {
        allKeys.add(key);
      }
    });
  });
  
  // Define order of common metrics
  const metricOrder = [
    'citedByCount',
    'worksCount', 
    'hIndex',
    'i10Index',
    'twoYearMeanCitedness',
    'fwci',
    'referencedWorksCount',
    'institutionsDistinctCount',
    'countriesDistinctCount',
    'publicationYear'
  ];
  
  return Array.from(allKeys).sort((a, b) => {
    const aIndex = metricOrder.indexOf(a);
    const bIndex = metricOrder.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Sort metrics by specified criteria
 */
function sortMetrics(
  metrics: ComparisonMetrics[],
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): ComparisonMetrics[] {
  if (!sortBy) return metrics;
  
  return [...metrics].sort((a, b) => {
    const aMetric = a.metrics[sortBy as keyof typeof a.metrics];
    const bMetric = b.metrics[sortBy as keyof typeof b.metrics];
    
    if (!aMetric || !bMetric) return 0;
    
    const aValue = aMetric.value;
    const bValue = bMetric.value;
    
    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
}

export function ComparisonMetricsGrid({
  metrics,
  layout = 'table',
  showRanks = false,
  showPercentiles = false,
  emphasizeExtremes = false,
  highlightedEntity,
  sortBy,
  sortOrder = 'desc',
  size = 'md',
  loading = false,
  error,
  onEntityClick,
  onMetricClick,
  className,
  'data-testid': testId,
  ...props
}: ComparisonMetricsGridProps) {
  
  // Handle loading state
  if (loading) {
    return (
      <Box className={className} data-testid={testId} {...props}>
        <LoadingSkeleton height="200" />
        <Text size="sm" c="dimmed" ta="center" mt="md">
          Loading comparison metrics...
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
  if (metrics.length === 0) {
    return (
      <Box className={className} data-testid={testId} {...props}>
        <Alert title="No Metrics Available" color="gray">
          No metrics to compare. Add entities to the comparison to see their metrics.
        </Alert>
      </Box>
    );
  }
  
  // Handle single entity state
  if (metrics.length === 1) {
    return (
      <Box className={className} data-testid={testId} {...props}>
        <Alert title="Single Entity" color="blue">
          Add more entities to compare their metrics side by side.
        </Alert>
      </Box>
    );
  }
  
  const entityType = metrics[0].entityType;
  const metricKeys = getMetricKeys(metrics);
  const sortedMetrics = sortMetrics(metrics, sortBy, sortOrder);
  
  // Render table layout
  if (layout === 'table') {
    return (
      <Box className={className} data-testid={testId} {...props}>
        <Table 
          highlightOnHover
          aria-label={`Comparison metrics for ${metrics.length} ${entityType.toLowerCase()}s`}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Entity</Table.Th>
              {metricKeys.map(key => {
                const def = getMetricDefinition(key, entityType);
                return (
                  <Table.Th key={key} title={def.description}>
                    {def.label}
                  </Table.Th>
                );
              })}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedMetrics.map(metric => (
              <Table.Tr 
                key={metric.entityId}
                style={{
                  backgroundColor: highlightedEntity === metric.entityId 
                    ? 'var(--mantine-color-blue-light)' 
                    : undefined
                }}
              >
                <Table.Td>
                  <Text 
                    fw="bold" 
                    size={size}
                    style={{ cursor: onEntityClick ? 'pointer' : undefined }}
                    onClick={() => onEntityClick?.(metric.entityId)}
                  >
                    {metric.entityName}
                  </Text>
                </Table.Td>
                {metricKeys.map(key => {
                  const metricData = metric.metrics[key as keyof typeof metric.metrics];
                  if (!metricData) {
                    return <Table.Td key={key}>—</Table.Td>;
                  }
                  
                  return (
                    <Table.Td key={key}>
                      <ComparisonMetricValue
                        metric={metricData}
                        showRank={showRanks}
                        showPercentile={showPercentiles}
                        totalEntities={metrics.length}
                        emphasizeExtreme={emphasizeExtremes}
                        size={size}
                        layout="compact"
                        onClick={() => onMetricClick?.(metric.entityId, key)}
                      />
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    );
  }
  
  // Render cards layout
  if (layout === 'cards') {
    return (
      <Box className={className} data-testid={testId} {...props}>
        <Group gap="md" align="stretch">
          {sortedMetrics.map(metric => (
            <Card 
              key={metric.entityId}
              shadow="sm"
              padding="md"
              style={{
                flex: 1,
                minWidth: '200px',
                border: highlightedEntity === metric.entityId 
                  ? '2px solid var(--mantine-color-blue-6)' 
                  : undefined
              }}
            >
              <Stack gap="sm">
                <Text 
                  fw="bold" 
                  size={size}
                  ta="center"
                  style={{ cursor: onEntityClick ? 'pointer' : undefined }}
                  onClick={() => onEntityClick?.(metric.entityId)}
                >
                  {metric.entityName}
                </Text>
                
                {metricKeys.map(key => {
                  const metricData = metric.metrics[key as keyof typeof metric.metrics];
                  const def = getMetricDefinition(key, entityType);
                  
                  if (!metricData) return null;
                  
                  return (
                    <ComparisonMetricValue
                      key={key}
                      metric={metricData}
                      label={def.label}
                      showRank={showRanks}
                      showPercentile={showPercentiles}
                      totalEntities={metrics.length}
                      emphasizeExtreme={emphasizeExtremes}
                      size={size}
                      layout="vertical"
                      onClick={() => onMetricClick?.(metric.entityId, key)}
                    />
                  );
                })}
              </Stack>
            </Card>
          ))}
        </Group>
      </Box>
    );
  }
  
  // Render compact layout
  return (
    <Box className={className} data-testid={testId} {...props}>
      <Stack gap="xs">
        {sortedMetrics.map(metric => (
          <Group 
            key={metric.entityId}
            justify="space-between"
            p="sm"
            style={{
              border: '1px solid var(--mantine-color-gray-3)',
              borderRadius: 'var(--mantine-radius-sm)',
              backgroundColor: highlightedEntity === metric.entityId 
                ? 'var(--mantine-color-blue-light)' 
                : undefined
            }}
          >
            <Text 
              fw="bold" 
              size={size}
              style={{ cursor: onEntityClick ? 'pointer' : undefined }}
              onClick={() => onEntityClick?.(metric.entityId)}
            >
              {metric.entityName}
            </Text>
            
            <Group gap="md">
              {metricKeys.slice(0, 3).map(key => {
                const metricData = metric.metrics[key as keyof typeof metric.metrics];
                const def = getMetricDefinition(key, entityType);
                
                if (!metricData) return null;
                
                return (
                  <ComparisonMetricValue
                    key={key}
                    metric={metricData}
                    label={def.label}
                    showRank={showRanks}
                    totalEntities={metrics.length}
                    size="sm"
                    layout="compact"
                    onClick={() => onMetricClick?.(metric.entityId, key)}
                  />
                );
              })}
            </Group>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}