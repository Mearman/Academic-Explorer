/**
 * Validation Analytics Dashboard
 * 
 * Comprehensive dashboard for validation reporting and analytics,
 * including data visualization, trend analysis, and user interactions.
 */

import {
  Grid,
  Card,
  Text,
  Title,
  Group,
  Stack,
  Badge,
  Select,
  Button,
  Loader,
  Center,
  Alert,
  NumberFormatter,
  ActionIcon,
  MultiSelect,
  Switch,
  Divider,
  ThemeIcon,
} from '@mantine/core';
import { DatePickerInput, type DatesRangeValue } from '@mantine/dates';
import {
  IconChartLine,
  IconChartBar,
  IconDownload,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconFilter,
  IconClearAll,
} from '@tabler/icons-react';
import React, { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';
import type {
  ValidationExportConfig,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
  ValidationSeverity,
  ValidationExportFormat,
  getValidationSeverityColor,
} from '@/types/entity-validation';

// Main dashboard component
export function ValidationAnalyticsDashboard() {
  const {
    getValidationStatistics,
    getValidationSummary,
  } = useEntityValidationStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'issuesFound' | 'entitiesValidated' | 'validationRuns'>('issuesFound');

  const statistics = useMemo(() => getValidationStatistics(), [getValidationStatistics]);
  const summary = useMemo(() => getValidationSummary(), [getValidationSummary]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // In real implementation, would refresh data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  if (!statistics) {
    return (
      <Center h={400} data-testid="validation-dashboard-loading">
        <Stack align="center">
          <Loader size="lg" />
          <Text>Loading validation analytics...</Text>
        </Stack>
      </Center>
    );
  }

  if (statistics.totalValidationRuns === 0) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <ThemeIcon size={64} variant="light" color="gray">
            <IconChartLine size={32} />
          </ThemeIcon>
          <Title order={3}>No validation data available</Title>
          <Text c="dimmed" ta="center" maw={400}>
            Start validating entities to see analytics and insights about your data quality.
          </Text>
        </Stack>
      </Center>
    );
  }

  const metrics = {
    totalEntitiesValidated: statistics.totalEntitiesValidated,
    entitiesWithIssues: summary.entitiesWithIssues,
    totalIssues: statistics.totalIssuesFound,
    averageIssuesPerEntity: statistics.totalEntitiesValidated > 0 
      ? statistics.totalIssuesFound / statistics.totalEntitiesValidated 
      : 0,
    validationSuccessRate: statistics.totalEntitiesValidated > 0 
      ? (statistics.totalEntitiesValidated - summary.entitiesWithIssues) / statistics.totalEntitiesValidated 
      : 0,
    mostCommonIssueType: statistics.commonIssueTypes[0]?.issueType || ValidationIssueType.MISSING_FIELD,
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <Title order={2}>Validation Analytics</Title>
        <Group>
          <ActionIcon 
            variant="light" 
            onClick={handleRefresh} 
            loading={isRefreshing}
            disabled={isRefreshing}
          >
            <IconRefresh size={16} />
          </ActionIcon>
          <ExportValidationReport />
        </Group>
      </Group>

      {/* Filters */}
      <ValidationFilters />

      {/* Overview Metrics */}
      <div>
        <Title order={3} mb="md">Validation Overview</Title>
        <ValidationMetricsCards metrics={metrics} />
      </div>

      {/* Charts Grid */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <IssueTypeDistribution data={statistics.commonIssueTypes} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <EntityTypeBreakdown data={statistics.problematicEntityTypes} />
        </Grid.Col>
        <Grid.Col span={12}>
          <ValidationTrendsChart 
            data={statistics.trends} 
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
          />
        </Grid.Col>
      </Grid>

      {/* Performance and Recent Activity */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <ValidationPerformanceMetrics data={{
            averageValidationTime: 150,
            validationsPerSecond: 6.67,
            memoryUsage: 45.2,
            cacheHitRate: 0.85,
            errorRate: 0.02,
            successfulValidations: statistics.totalEntitiesValidated - summary.entitiesWithIssues,
            failedValidations: summary.entitiesWithIssues,
          }} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <RecentValidationActivity data={statistics.recentActivity} />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

// Metrics cards component
export function ValidationMetricsCards({ 
  metrics 
}: { 
  metrics: {
    totalEntitiesValidated: number;
    entitiesWithIssues: number;
    totalIssues: number;
    averageIssuesPerEntity: number;
    validationSuccessRate: number;
    mostCommonIssueType: ValidationIssueType;
  }
}) {
  const cards = [
    {
      title: 'Total Entities',
      value: metrics.totalEntitiesValidated,
      format: 'number',
      icon: IconChartBar,
      color: 'blue',
    },
    {
      title: 'Entities with Issues',
      value: metrics.entitiesWithIssues,
      format: 'number',
      icon: IconAlertTriangle,
      color: 'orange',
    },
    {
      title: 'Total Issues',
      value: metrics.totalIssues,
      format: 'number',
      icon: IconX,
      color: 'red',
    },
    {
      title: 'Success Rate',
      value: metrics.validationSuccessRate,
      format: 'percentage',
      icon: IconCheck,
      color: 'green',
    },
  ];

  return (
    <Grid>
      {cards.map((card, index) => (
        <Grid.Col key={index} span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  {card.title}
                </Text>
                <Text fw={700} size="xl">
                  {card.format === 'percentage' ? (
                    <NumberFormatter value={card.value * 100} suffix="%" decimalScale={1} />
                  ) : card.format === 'number' && card.value >= 1000 ? (
                    <NumberFormatter value={card.value} thousandSeparator />
                  ) : (
                    card.value.toLocaleString()
                  )}
                </Text>
              </div>
              <ThemeIcon color={card.color} variant="light" size={38} radius="md">
                <card.icon size={22} />
              </ThemeIcon>
            </Group>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );
}

// Issue type distribution pie chart
export function IssueTypeDistribution({ 
  data,
  onDrillDown 
}: { 
  data: Array<{
    issueType: ValidationIssueType;
    count: number;
    percentage: number;
  }>;
  onDrillDown?: (issueType: ValidationIssueType) => void;
}) {
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const chartData = data.map((item, index) => ({
    name: getIssueTypeDisplayName(item.issueType),
    value: item.count,
    percentage: item.percentage,
    color: colors[index % colors.length],
    issueType: item.issueType,
  }));

  return (
    <Card withBorder>
      <Title order={4} mb="md">Issue Type Distribution</Title>
      {data.length === 0 ? (
        <Center h={200}>
          <Text c="dimmed">No issues found</Text>
        </Center>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              // Custom label rendering handled by tooltip instead
              label={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  onClick={() => onDrillDown?.(entry.issueType)}
                  style={{ cursor: onDrillDown ? 'pointer' : 'default' }}
                  data-testid={`pie-segment-${entry.issueType.replace('_', '-')}`}
                />
              ))}
            </Pie>
            <RechartsTooltip 
              formatter={(value: number, name: string) => [
                `${value} issues`,
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

// Entity type breakdown bar chart
export function EntityTypeBreakdown({ 
  data 
}: { 
  data: Array<{
    entityType: EntityType;
    errorCount: number;
    warningCount: number;
    totalCount: number;
  }>;
}) {
  const [sortBy, setSortBy] = useState<'errorCount' | 'warningCount' | 'totalCount'>('totalCount');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [data, sortBy]);

  const chartData = sortedData.map(item => ({
    name: getEntityTypeDisplayName(item.entityType),
    errors: item.errorCount,
    warnings: item.warningCount,
    total: item.totalCount,
  }));

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>Issues by Entity Type</Title>
        <Select
          label="Sort by"
          data={[
            { value: 'totalCount', label: 'Total Count' },
            { value: 'errorCount', label: 'Error Count' },
            { value: 'warningCount', label: 'Warning Count' },
          ]}
          value={sortBy}
          onChange={(value) => setSortBy(value as typeof sortBy)}
          w={150}
          size="xs"
        />
      </Group>
      
      {data.length === 0 ? (
        <Center h={200}>
          <Text c="dimmed">No data available</Text>
        </Center>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="errors" fill="#ff6b6b" name="Errors" />
            <Bar dataKey="warnings" fill="#ffa726" name="Warnings" />
          </BarChart>
        </ResponsiveContainer>
      )}

      <Stack gap="xs" mt="md">
        {sortedData.map(item => (
          <Group key={item.entityType} justify="space-between" data-testid={`entity-breakdown-${item.entityType}`}>
            <Text size="sm">{getEntityTypeDisplayName(item.entityType)}</Text>
            <Group gap="xs">
              {item.errorCount > 0 && (
                <Badge color="red" variant="light" size="xs">
                  {item.errorCount} errors
                </Badge>
              )}
              {item.warningCount > 0 && (
                <Badge color="orange" variant="light" size="xs">
                  {item.warningCount} warnings
                </Badge>
              )}
            </Group>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

// Validation trends line chart
export function ValidationTrendsChart({ 
  data,
  selectedMetric = 'issuesFound',
  onMetricChange,
  onDateRangeChange 
}: { 
  data: Array<{
    date: string;
    validationRuns: number;
    issuesFound: number;
    entitiesValidated: number;
  }>;
  selectedMetric?: 'issuesFound' | 'entitiesValidated' | 'validationRuns';
  onMetricChange?: (metric: 'issuesFound' | 'entitiesValidated' | 'validationRuns') => void;
  onDateRangeChange?: (range: { start: string; end: string }) => void;
}) {
  const [dateRange, setDateRange] = useState<DatesRangeValue>([null, null]);

  const handleDateRangeChange = useCallback((dates: DatesRangeValue) => {
    setDateRange(dates);
    if (dates[0] && dates[1] && onDateRangeChange) {
      const startDate = typeof dates[0] === 'string' ? new Date(dates[0]) : dates[0];
      const endDate = typeof dates[1] === 'string' ? new Date(dates[1]) : dates[1];
      onDateRangeChange({
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      });
    }
  }, [onDateRangeChange]);

  const metricConfig = {
    issuesFound: { color: '#ff6b6b', label: 'Issues Found' },
    entitiesValidated: { color: '#51cf66', label: 'Entities Validated' },
    validationRuns: { color: '#339af0', label: 'Validation Runs' },
  };

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>Validation Trends</Title>
        <Group>
          <Select
            label="Select metric to display"
            data={[
              { value: 'issuesFound', label: 'Issues Found' },
              { value: 'entitiesValidated', label: 'Entities Validated' },
              { value: 'validationRuns', label: 'Validation Runs' },
            ]}
            value={selectedMetric}
            onChange={(value) => onMetricChange?.(value as typeof selectedMetric)}
            w={200}
            size="xs"
          />
          <DatePickerInput
            type="range"
            label="Date range"
            placeholder="Pick dates range"
            value={dateRange}
            onChange={handleDateRangeChange}
            size="xs"
            w={200}
            clearable
            allowSingleDateInRange
          />
        </Group>
      </Group>

      {data.length === 0 ? (
        <Center h={200}>
          <Stack align="center">
            <Text c="dimmed">No trend data available</Text>
            <Text size="xs" c="dimmed">
              Validation data will appear here as you run validations over time
            </Text>
          </Stack>
        </Center>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <RechartsTooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke={metricConfig[selectedMetric].color}
              strokeWidth={2}
              name={metricConfig[selectedMetric].label}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

// Validation filters component
export function ValidationFilters() {
  const { updateFilter, resetFilter } = useEntityValidationStore();
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [issueTypes, setIssueTypes] = useState<string[]>([]);
  const [severities, setSeverities] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DatesRangeValue>([null, null]);

  const handleEntityTypesChange = useCallback((values: string[]) => {
    setEntityTypes(values);
    updateFilter({ entityTypes: values as EntityType[] });
  }, [updateFilter]);

  const handleIssueTypesChange = useCallback((values: string[]) => {
    setIssueTypes(values);
    updateFilter({ issueTypes: values as ValidationIssueType[] });
  }, [updateFilter]);

  const handleSeveritiesChange = useCallback((values: string[]) => {
    setSeverities(values);
    updateFilter({ severities: values as ValidationSeverity[] });
  }, [updateFilter]);

  const handleDateRangeChange = useCallback((dates: DatesRangeValue) => {
    setDateRange(dates);
    if (dates[0] && dates[1]) {
      const startDate = typeof dates[0] === 'string' ? new Date(dates[0]) : dates[0];
      const endDate = typeof dates[1] === 'string' ? new Date(dates[1]) : dates[1];
      updateFilter({
        dateRange: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        },
      });
    }
  }, [updateFilter]);

  const handleReset = useCallback(() => {
    setEntityTypes([]);
    setIssueTypes([]);
    setSeverities([]);
    setDateRange([null, null]);
    resetFilter();
  }, [resetFilter]);

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Group>
          <IconFilter size={16} />
          <Text fw={500}>Filters</Text>
        </Group>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconClearAll size={14} />}
          onClick={handleReset}
        >
          Reset Filters
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MultiSelect
            label="Entity Types"
            data={[
              { value: EntityType.WORK, label: 'Works' },
              { value: EntityType.AUTHOR, label: 'Authors' },
              { value: EntityType.SOURCE, label: 'Sources' },
              { value: EntityType.INSTITUTION, label: 'Institutions' },
            ]}
            value={entityTypes}
            onChange={handleEntityTypesChange}
            placeholder="All types"
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MultiSelect
            label="Issue Types"
            data={[
              { value: ValidationIssueType.MISSING_FIELD, label: 'Missing Field' },
              { value: ValidationIssueType.TYPE_MISMATCH, label: 'Type Mismatch' },
              { value: ValidationIssueType.INVALID_FORMAT, label: 'Invalid Format' },
              { value: ValidationIssueType.EXTRA_FIELD, label: 'Extra Field' },
              { value: ValidationIssueType.VALUE_OUT_OF_RANGE, label: 'Out of Range' },
            ]}
            value={issueTypes}
            onChange={handleIssueTypesChange}
            placeholder="All types"
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <MultiSelect
            label="Severity Levels"
            data={[
              { value: ValidationSeverity.ERROR, label: 'Errors' },
              { value: ValidationSeverity.WARNING, label: 'Warnings' },
              { value: ValidationSeverity.INFO, label: 'Info' },
            ]}
            value={severities}
            onChange={handleSeveritiesChange}
            placeholder="All severities"
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <DatePickerInput
            type="range"
            label="Date Range"
            placeholder="Pick dates range"
            value={dateRange}
            onChange={handleDateRangeChange}
            clearable
            allowSingleDateInRange
          />
        </Grid.Col>
      </Grid>
    </Card>
  );
}

// Export validation report component
export function ExportValidationReport() {
  const { exportValidationData } = useEntityValidationStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ValidationExportFormat>(ValidationExportFormat.JSON);
  const [includeStatistics, setIncludeStatistics] = useState(true);
  const [includeEntityDetails, setIncludeEntityDetails] = useState(true);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      const config: ValidationExportConfig = {
        format: exportFormat,
        includeStatistics,
        includeEntityDetails,
      };

      await exportValidationData(config);
      setExportMessage({ type: 'success', text: 'Export completed successfully' });
    } catch {
      setExportMessage({ 
        type: 'error', 
        text: 'Export failed. Please try again.' 
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportValidationData, exportFormat, includeStatistics, includeEntityDetails]);

  return (
    <Card withBorder w={300}>
      <Stack gap="sm">
        <Title order={5}>Export Validation Report</Title>
        
        <Select
          label="Export Format"
          data={[
            { value: ValidationExportFormat.JSON, label: 'JSON' },
            { value: ValidationExportFormat.CSV, label: 'CSV' },
            { value: ValidationExportFormat.MARKDOWN, label: 'Markdown' },
            { value: ValidationExportFormat.XLSX, label: 'Excel' },
          ]}
          value={exportFormat}
          onChange={(value) => setExportFormat(value as ValidationExportFormat)}
        />

        <Stack gap="xs">
          <Switch
            label="Include Statistics"
            checked={includeStatistics}
            onChange={(event) => setIncludeStatistics(event.currentTarget.checked)}
          />
          <Switch
            label="Include Entity Details"
            checked={includeEntityDetails}
            onChange={(event) => setIncludeEntityDetails(event.currentTarget.checked)}
          />
        </Stack>

        <Button
          leftSection={<IconDownload size={16} />}
          onClick={handleExport}
          loading={isExporting}
          disabled={isExporting}
          fullWidth
        >
          {isExporting ? 'Exporting...' : 'Export Report'}
        </Button>

        {exportMessage && (
          <Alert
            color={exportMessage.type === 'success' ? 'green' : 'red'}
            icon={exportMessage.type === 'success' ? <IconCheck size={16} /> : <IconX size={16} />}
          >
            {exportMessage.text}
          </Alert>
        )}
      </Stack>
    </Card>
  );
}

// Performance metrics component
export function ValidationPerformanceMetrics({ 
  data 
}: { 
  data: {
    averageValidationTime: number;
    validationsPerSecond: number;
    memoryUsage: number;
    cacheHitRate: number;
    errorRate: number;
    successfulValidations: number;
    failedValidations: number;
  };
}) {
  const performanceIssues = useMemo(() => {
    const issues = [];
    if (data.averageValidationTime > 1000) issues.push('slow');
    if (data.cacheHitRate < 0.7) issues.push('cache');
    if (data.errorRate > 0.1) issues.push('errors');
    if (data.memoryUsage > 500) issues.push('memory');
    return issues;
  }, [data]);

  const recommendations = useMemo(() => {
    const recs = [];
    if (data.averageValidationTime > 1000) recs.push('Consider optimizing validation schemas');
    if (data.memoryUsage > 500) recs.push('Monitor memory usage - consider pagination');
    if (data.cacheHitRate < 0.7) recs.push('Improve cache strategy');
    return recs;
  }, [data]);

  return (
    <Card withBorder>
      <Title order={4} mb="md">Performance Metrics</Title>
      
      <Grid>
        <Grid.Col span={6}>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm">Average Validation Time</Text>
              <Text fw={700}>{data.averageValidationTime}ms</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Validations Per Second</Text>
              <Text fw={700}>{data.validationsPerSecond.toFixed(2)}/sec</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Memory Usage</Text>
              <Text fw={700}>{data.memoryUsage.toFixed(1)} MB</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Cache Hit Rate</Text>
              <Text fw={700}>{Math.round(data.cacheHitRate * 100)}%</Text>
            </Group>
          </Stack>
        </Grid.Col>
        <Grid.Col span={6}>
          <Stack gap="xs">
            {performanceIssues.map(issue => (
              <Alert
                key={issue}
                color="orange"
                data-testid={`performance-warning-${issue}`}
              >
                Performance issue detected: {issue}
              </Alert>
            ))}
          </Stack>
        </Grid.Col>
      </Grid>

      {recommendations.length > 0 && (
        <>
          <Divider my="md" />
          <Stack gap="xs">
            <Text fw={500} size="sm">Recommendations</Text>
            {recommendations.map((rec, index) => (
              <Text key={index} size="xs" c="dimmed">
                • {rec}
              </Text>
            ))}
          </Stack>
        </>
      )}
    </Card>
  );
}

// Recent validation activity component
function RecentValidationActivity({ 
  data 
}: { 
  data: Array<{
    timestamp: string;
    entityId: string;
    entityType: EntityType;
    issueCount: number;
    severity: ValidationSeverity;
  }>;
}) {
  return (
    <Card withBorder>
      <Title order={4} mb="md">Recent Activity</Title>
      
      {data.length === 0 ? (
        <Center h={200}>
          <Text c="dimmed" size="sm">No recent activity</Text>
        </Center>
      ) : (
        <Stack gap="xs">
          {data.slice(0, 10).map((activity, index) => (
            <Group key={index} justify="space-between">
              <div>
                <Text size="sm" truncate maw={150}>
                  {activity.entityId}
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(activity.timestamp).toLocaleString()}
                </Text>
              </div>
              <Group gap="xs">
                <Badge 
                  color={getValidationSeverityColor(activity.severity)} 
                  variant="light" 
                  size="xs"
                >
                  {activity.issueCount} issues
                </Badge>
              </Group>
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}

// Helper functions
function getIssueTypeDisplayName(issueType: ValidationIssueType): string {
  const names = {
    [ValidationIssueType.MISSING_FIELD]: 'Missing Field',
    [ValidationIssueType.EXTRA_FIELD]: 'Extra Field',
    [ValidationIssueType.TYPE_MISMATCH]: 'Type Mismatch',
    [ValidationIssueType.INVALID_FORMAT]: 'Invalid Format',
    [ValidationIssueType.VALUE_OUT_OF_RANGE]: 'Out of Range',
  };
  return names[issueType] || issueType;
}

function getEntityTypeDisplayName(entityType: EntityType): string {
  const names = {
    [EntityType.WORK]: 'Works',
    [EntityType.AUTHOR]: 'Authors',
    [EntityType.SOURCE]: 'Sources',
    [EntityType.INSTITUTION]: 'Institutions',
    [EntityType.PUBLISHER]: 'Publishers',
    [EntityType.FUNDER]: 'Funders',
    [EntityType.TOPIC]: 'Topics',
    [EntityType.CONCEPT]: 'Concepts',
    [EntityType.KEYWORD]: 'Keywords',
    [EntityType.CONTINENT]: 'Continents',
    [EntityType.REGION]: 'Regions',
  };
  return names[entityType] || entityType;
}