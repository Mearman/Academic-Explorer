/**
 * Comparison summary component
 * Displays high-level insights and statistics from comparison analysis
 */

import { 
  Card, 
  Group, 
  Stack, 
  Text, 
  Badge, 
  List, 
  Alert,
  UnstyledButton,
  Progress,
  Divider,
  Box,
  Grid
} from '@mantine/core';
import { forwardRef } from 'react';

import { 
  LoadingSkeleton,
  ErrorMessage,
  Icon,
  MetricBadge
} from '@/components';
import type { ComparisonAnalysis, ComparisonInsight } from '@/hooks/use-comparison-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { formatNumber } from '@/lib/openalex/utils/transformers';

import type { SizeVariant } from '../types';

export interface ComparisonSummaryProps {
  /** Comparison analysis data */
  analysis: ComparisonAnalysis | null;
  /** Layout style */
  layout?: 'detailed' | 'compact';
  /** Whether to show confidence indicators */
  showConfidence?: boolean;
  /** Size variant */
  size?: SizeVariant;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Callback when insight is clicked */
  onInsightClick?: (insight: ComparisonInsight) => void;
  /** Callback when top performer is clicked */
  onTopPerformerClick?: (entityId: string, metric: string) => void;
  /** Custom class name */
  className?: string;
  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Get insight icon based on type
 */
function getInsightIcon(type: ComparisonInsight['type']): string {
  switch (type) {
    case 'leader': return 'trophy';
    case 'outlier': return 'alert-triangle';
    case 'trend': return 'trending-up';
    case 'statistical': return 'chart-line';
    case 'temporal': return 'clock';
    default: return 'info-circle';
  }
}

/**
 * Get insight color based on type
 */
function getInsightColor(type: ComparisonInsight['type']): string {
  switch (type) {
    case 'leader': return 'green';
    case 'outlier': return 'orange';
    case 'trend': return 'blue';
    case 'statistical': return 'purple';
    case 'temporal': return 'cyan';
    default: return 'gray';
  }
}

/**
 * Format entity type for display
 */
function formatEntityType(entityType: EntityType, count: number): string {
  const types: Record<EntityType, string> = {
    [EntityType.AUTHOR]: count === 1 ? 'author' : 'authors',
    [EntityType.WORK]: count === 1 ? 'work' : 'works',
    [EntityType.SOURCE]: count === 1 ? 'source' : 'sources',
    [EntityType.INSTITUTION]: count === 1 ? 'institution' : 'institutions',
    [EntityType.PUBLISHER]: count === 1 ? 'publisher' : 'publishers',
    [EntityType.FUNDER]: count === 1 ? 'funder' : 'funders',
    [EntityType.TOPIC]: count === 1 ? 'topic' : 'topics',
    [EntityType.CONCEPT]: count === 1 ? 'concept' : 'concepts',
    [EntityType.KEYWORD]: count === 1 ? 'keyword' : 'keywords',
    [EntityType.CONTINENT]: count === 1 ? 'continent' : 'continents',
    [EntityType.REGION]: count === 1 ? 'region' : 'regions'
  };
  
  return types[entityType] || entityType.toLowerCase();
}

/**
 * Get metric display name
 */
function getMetricDisplayName(metric: string): string {
  const names: Record<string, string> = {
    citedByCount: 'Citations',
    worksCount: 'Works',
    hIndex: 'H-Index',
    i10Index: 'i10-Index',
    twoYearMeanCitedness: '2-Year Mean',
    fwci: 'FWCI',
    referencedWorksCount: 'References',
    institutionsDistinctCount: 'Institutions',
    countriesDistinctCount: 'Countries',
    publicationYear: 'Publication Year'
  };
  
  return names[metric] || metric;
}

/**
 * Group insights by type
 */
function groupInsights(insights: ComparisonInsight[]): Record<string, ComparisonInsight[]> {
  const groups: Record<string, ComparisonInsight[]> = {};
  
  insights.forEach(insight => {
    if (!groups[insight.type]) {
      groups[insight.type] = [];
    }
    groups[insight.type].push(insight);
  });
  
  return groups;
}

// eslint-disable-next-line max-lines-per-function
export const ComparisonSummary = forwardRef<HTMLDivElement, ComparisonSummaryProps>(({
  analysis,
  layout = 'detailed',
  showConfidence = false,
  size = 'md',
  loading = false,
  error,
  onInsightClick,
  onTopPerformerClick,
  className,
  'data-testid': testId,
  ...props
}, ref) => {
  
  // Handle loading state
  if (loading) {
    return (
      <Card ref={ref} className={className} data-testid={testId} {...props}>
        <LoadingSkeleton height="150" />
        <Text size="sm" c="dimmed" ta="center" mt="md">
          Loading summary...
        </Text>
      </Card>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <Card ref={ref} className={className} data-testid={testId} {...props}>
        <ErrorMessage message={error} />
      </Card>
    );
  }
  
  // Handle empty state
  if (!analysis) {
    return (
      <Card ref={ref} className={className} data-testid={testId} {...props}>
        <Alert title="No Analysis Available" color="gray">
          No comparison data available. Add entities to generate analysis.
        </Alert>
      </Card>
    );
  }
  
  const entityTypeText = formatEntityType(analysis.entityType, analysis.entityCount);
  const groupedInsights = groupInsights(analysis.insights);
  
  // Render compact layout
  if (layout === 'compact') {
    return (
      <Card ref={ref} className={className} data-testid={testId} padding="sm" {...props}>
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text size={size} fw="bold">
              Comparing {analysis.entityCount} {entityTypeText}
            </Text>
            <Group gap="xs" mt="xs">
              <MetricBadge 
                value={analysis.summary.averageCitations}
                label="Avg Citations"
                format="compact"
                size="sm"
              />
              {analysis.insights.length > 0 && (
                <Badge size="sm" color="blue">
                  {analysis.insights.length} insights
                </Badge>
              )}
            </Group>
          </div>
          
          {analysis.summary.hasCompleteData ? (
            <Badge color="green" size="sm">Complete Data</Badge>
          ) : (
            <Badge color="orange" size="sm">Incomplete Data</Badge>
          )}
        </Group>
      </Card>
    );
  }
  
  // Render detailed layout
  return (
    <Card 
      ref={ref} 
      className={className} 
      data-testid={testId} 
      aria-label="Comparison summary"
      {...props}
    >
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Text size="lg" fw="bold">
              Comparing {analysis.entityCount} {entityTypeText}
            </Text>
            <Text size="sm" c="dimmed">
              Analysis of {analysis.summary.totalEntities} entities
            </Text>
          </div>
          
          {analysis.summary.hasCompleteData ? (
            <Badge color="green">Complete Data</Badge>
          ) : (
            <Badge color="orange">Incomplete Data</Badge>
          )}
        </Group>
        
        {/* Summary Statistics */}
        <div>
          <Text size="md" fw="bold" mb="sm">Summary Statistics</Text>
          <Grid>
            <Grid.Col span={4}>
              <Stack gap="xs" align="center">
                <Text size="xl" fw="bold" c="blue">
                  {formatNumber(analysis.summary.averageCitations)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Average Citations
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={4}>
              <Stack gap="xs" align="center">
                <Text size="xl" fw="bold" c="green">
                  {formatNumber(analysis.summary.medianCitations)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Median Citations
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={4}>
              <Stack gap="xs" align="center">
                <Text size="xl" fw="bold" c="orange">
                  {formatNumber(analysis.spreads.citedByCount.range)}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Citation Range
                </Text>
              </Stack>
            </Grid.Col>
          </Grid>
        </div>
        
        <Divider />
        
        {/* Top Performers */}
        <div>
          <Text size="md" fw="bold" mb="sm">Top Performers</Text>
          <Stack gap="xs">
            {Object.entries(analysis.topPerformers).map(([metric, entityId]) => (
              <Group key={metric} justify="space-between">
                <Text size="sm" c="dimmed">
                  {getMetricDisplayName(metric)} Leader
                </Text>
                <UnstyledButton
                  onClick={() => entityId && onTopPerformerClick?.(entityId, metric)}
                  style={{ 
                    color: 'var(--mantine-color-blue-6)',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  <Text size="sm" fw="bold">
                    {entityId}
                  </Text>
                </UnstyledButton>
              </Group>
            ))}
          </Stack>
        </div>
        
        <Divider />
        
        {/* Key Insights */}
        {analysis.insights.length > 0 && (
          <div>
            <Text size="md" fw="bold" mb="sm">Key Insights</Text>
            
            {Object.entries(groupedInsights).map(([type, insights]) => (
              <Box key={type} mb="md">
                <Text size="sm" fw="bold" c={getInsightColor(type as ComparisonInsight['type'])} mb="xs">
                  {type.charAt(0).toUpperCase() + type.slice(1)}s
                </Text>
                
                <List size="sm" spacing="xs" role="list">
                  {insights.map((insight, index) => (
                    <List.Item 
                      key={index}
                      icon={
                        <Icon 
                          name={getInsightIcon(insight.type)} 
                          size="sm" 
                          color={getInsightColor(insight.type)}
                        />
                      }
                    >
                      <Group gap="xs" wrap="nowrap">
                        <UnstyledButton
                          onClick={() => onInsightClick?.(insight)}
                          style={{ flex: 1, textAlign: 'left' }}
                        >
                          <Text size="sm">{insight.message}</Text>
                        </UnstyledButton>
                        
                        {showConfidence && (
                          <Badge size="xs" color="gray">
                            {Math.round(insight.confidence * 100)}%
                          </Badge>
                        )}
                      </Group>
                      
                      {showConfidence && (
                        <Progress 
                          value={insight.confidence * 100} 
                          size="xs" 
                          color={getInsightColor(insight.type)}
                          mt="xs"
                        />
                      )}
                    </List.Item>
                  ))}
                </List>
              </Box>
            ))}
          </div>
        )}
      </Stack>
    </Card>
  );
});

ComparisonSummary.displayName = 'ComparisonSummary';