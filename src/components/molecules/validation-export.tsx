/**
 * Validation Export Component
 * 
 * Provides export functionality for validation data in multiple formats.
 * Users can filter data before export and choose from different output formats.
 */

import {
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Select,
  MultiSelect,
  Switch,
  NumberInput,
  Divider,
  Alert,
  Progress,
  Badge,
} from '@mantine/core';
import {
  IconDownload,
  IconFileText,
  IconFileSpreadsheet,
  IconFileCode,
  IconInfoCircle,
  IconFilter,
} from '@tabler/icons-react';
import { useState } from 'react';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';
import {
  ValidationExportFormat,
  ValidationSeverity,
  ValidationIssueType,
} from '@/types/entity-validation';
import type {
  ValidationExportConfig,
  ValidationFilter,
} from '@/types/entity-validation';

const EXPORT_FORMAT_OPTIONS = [
  {
    value: ValidationExportFormat.JSON,
    label: 'JSON',
    description: 'Complete data with full details',
    icon: <IconFileCode size={16} />,
  },
  {
    value: ValidationExportFormat.CSV,
    label: 'CSV',
    description: 'Spreadsheet-compatible format',
    icon: <IconFileSpreadsheet size={16} />,
  },
  {
    value: ValidationExportFormat.MARKDOWN,
    label: 'Markdown',
    description: 'Human-readable report format',
    icon: <IconFileText size={16} />,
  },
] as const;

const SEVERITY_OPTIONS = [
  { value: 'error', label: 'Errors' },
  { value: 'warning', label: 'Warnings' },
  { value: 'info', label: 'Info' },
] as const;

const ISSUE_TYPE_OPTIONS = [
  { value: 'missing_field', label: 'Missing Fields' },
  { value: 'extra_field', label: 'Extra Fields' },
  { value: 'type_mismatch', label: 'Type Mismatches' },
  { value: 'invalid_format', label: 'Invalid Formats' },
  { value: 'value_out_of_range', label: 'Value Out of Range' },
] as const;

const ENTITY_TYPE_OPTIONS = [
  { value: 'work', label: 'Works' },
  { value: 'author', label: 'Authors' },
  { value: 'source', label: 'Sources' },
  { value: 'institution', label: 'Institutions' },
  { value: 'publisher', label: 'Publishers' },
  { value: 'funder', label: 'Funders' },
  { value: 'topic', label: 'Topics' },
  { value: 'concept', label: 'Concepts' },
] as const;

export function ValidationExport() {
  const { exportValidationData, getValidationSummary } = useEntityValidationStore();
  
  const [exportConfig, setExportConfig] = useState<ValidationExportConfig>({
    format: ValidationExportFormat.JSON,
    includeEntityDetails: true,
    includeStatistics: true,
    groupByEntityType: false,
    sortBy: 'timestamp',
    sortDirection: 'desc',
  });
  
  const [filters, setFilters] = useState<ValidationFilter>({
    limit: 1000,
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const summary = getValidationSummary();

  const handleFilterChange = (field: keyof ValidationFilter, value: ValidationFilter[keyof ValidationFilter]) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConfigChange = (field: keyof ValidationExportConfig, value: ValidationExportConfig[keyof ValidationExportConfig]) => {
    setExportConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportProgress(0);

      // Create final export config with filters
      const finalConfig: ValidationExportConfig = {
        ...exportConfig,
        filters,
      };

      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Export the data
      const exportedData = await exportValidationData(finalConfig);
      
      clearInterval(progressInterval);
      setExportProgress(100);

      // Create and download the file
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `validation-export-${timestamp}.${exportConfig.format}`;
      
      downloadFile(exportedData, filename, getContentType(exportConfig.format));

      // Reset progress after a short delay
      setTimeout(() => {
        setExportProgress(0);
        setIsExporting(false);
      }, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      setExportProgress(0);
      // TODO: Show error notification
    }
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getContentType = (format: ValidationExportFormat): string => {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'markdown':
        return 'text/markdown';
      default:
        return 'text/plain';
    }
  };

  const getEstimatedIssueCount = (): number => {
    // This is a simplified estimation
    // In a real implementation, you'd apply the filters to get an accurate count
    let estimatedCount = summary.totalIssues;
    
    if (filters.severities?.length) {
      const severityRatio = filters.severities.length / 3; // 3 total severities
      estimatedCount *= severityRatio;
    }
    
    if (filters.issueTypes?.length) {
      const typeRatio = filters.issueTypes.length / 5; // 5 total issue types
      estimatedCount *= typeRatio;
    }
    
    if (filters.entityTypes?.length) {
      const entityRatio = filters.entityTypes.length / 8; // 8 total entity types
      estimatedCount *= entityRatio;
    }
    
    if (filters.limit && filters.limit < estimatedCount) {
      estimatedCount = filters.limit;
    }
    
    return Math.round(estimatedCount);
  };

  if (summary.totalIssues === 0) {
    return (
      <Paper p="md" withBorder>
        <Alert icon={<IconInfoCircle />} color="blue">
          <Stack gap="xs">
            <Text fw={500}>
              No validation data to export
            </Text>
            <Text size="sm">
              Export functionality will be available once you have validation data.
              Visit entity pages to automatically validate them or use manual validation tools.
            </Text>
          </Stack>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <div>
          <Title order={4} mb="xs">
            Export Validation Data
          </Title>
          <Text size="sm" c="dimmed">
            Export validation issues and statistics in your preferred format.
          </Text>
        </div>

        {/* Export Format Selection */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Export Format
          </Text>
          <Group>
            {EXPORT_FORMAT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={exportConfig.format === option.value ? 'filled' : 'light'}
                leftSection={option.icon}
                onClick={() => handleConfigChange('format', option.value)}
                size="sm"
              >
                <div>
                  <Text size="sm" fw={500}>
                    {option.label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {option.description}
                  </Text>
                </div>
              </Button>
            ))}
          </Group>
        </div>

        <Divider />

        {/* Filters */}
        <div>
          <Group mb="sm">
            <IconFilter size={16} />
            <Text size="sm" fw={500}>
              Filters
            </Text>
          </Group>

          <Stack gap="sm">
            <Group grow>
              <MultiSelect
                label="Severity Levels"
                placeholder="All severities"
                data={SEVERITY_OPTIONS}
                value={filters.severities || []}
                onChange={(value) => handleFilterChange('severities', value.length ? value as ValidationSeverity[] : undefined)}
                clearable
              />
              
              <MultiSelect
                label="Issue Types"
                placeholder="All issue types"
                data={ISSUE_TYPE_OPTIONS}
                value={filters.issueTypes || []}
                onChange={(value) => handleFilterChange('issueTypes', value.length ? value as ValidationIssueType[] : undefined)}
                clearable
              />
            </Group>

            <Group grow>
              <MultiSelect
                label="Entity Types"
                placeholder="All entity types"
                data={ENTITY_TYPE_OPTIONS}
                value={filters.entityTypes || []}
                onChange={(value) => handleFilterChange('entityTypes', value.length ? value as EntityType[] : undefined)}
                clearable
              />
              
              <NumberInput
                label="Maximum Issues"
                placeholder="No limit"
                value={filters.limit}
                onChange={(value) => handleFilterChange('limit', value || undefined)}
                min={1}
                max={10000}
              />
            </Group>
          </Stack>
        </div>

        <Divider />

        {/* Export Options */}
        <div>
          <Text size="sm" fw={500} mb="sm">
            Export Options
          </Text>
          
          <Stack gap="sm">
            <Switch
              label="Include entity details"
              description="Include entity display names and URLs"
              checked={exportConfig.includeEntityDetails}
              onChange={(event) => handleConfigChange('includeEntityDetails', event.currentTarget.checked)}
            />
            
            <Switch
              label="Include statistics"
              description="Include summary statistics and counts"
              checked={exportConfig.includeStatistics}
              onChange={(event) => handleConfigChange('includeStatistics', event.currentTarget.checked)}
            />
            
            <Switch
              label="Group by entity type"
              description="Organize results by entity type"
              checked={exportConfig.groupByEntityType}
              onChange={(event) => handleConfigChange('groupByEntityType', event.currentTarget.checked)}
            />

            <Group grow>
              <Select
                label="Sort by"
                data={[
                  { value: 'timestamp', label: 'Timestamp' },
                  { value: 'severity', label: 'Severity' },
                  { value: 'entityType', label: 'Entity Type' },
                  { value: 'issueType', label: 'Issue Type' },
                ]}
                value={exportConfig.sortBy}
                onChange={(value) => value && handleConfigChange('sortBy', value as ValidationExportConfig['sortBy'])}
              />
              
              <Select
                label="Sort direction"
                data={[
                  { value: 'asc', label: 'Ascending' },
                  { value: 'desc', label: 'Descending' },
                ]}
                value={exportConfig.sortDirection}
                onChange={(value) => value && handleConfigChange('sortDirection', value as ValidationExportConfig['sortDirection'])}
              />
            </Group>
          </Stack>
        </div>

        <Divider />

        {/* Export Summary */}
        <Group justify="space-between">
          <div>
            <Text size="sm" fw={500}>
              Export Summary
            </Text>
            <Group gap="xs" mt="xs">
              <Badge variant="light">
                ~{getEstimatedIssueCount()} issues
              </Badge>
              <Badge variant="light">
                {exportConfig.format.toUpperCase()} format
              </Badge>
            </Group>
          </div>
          
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={handleExport}
            disabled={isExporting}
            loading={isExporting}
          >
            Export Data
          </Button>
        </Group>

        {/* Progress Bar */}
        {isExporting && (
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">
                Exporting validation data...
              </Text>
              <Text size="sm" c="dimmed">
                {exportProgress}%
              </Text>
            </Group>
            <Progress value={exportProgress} size="sm" />
          </div>
        )}
      </Stack>
    </Paper>
  );
}