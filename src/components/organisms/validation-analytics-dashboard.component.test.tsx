/**
 * Validation Analytics Dashboard Component Tests
 * 
 * Tests for the validation reporting and analytics dashboard components,
 * including data visualization, trend analysis, and user interactions.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type {
  ValidationStatistics,
  ValidationLogEntry,
  BatchValidationResult,
  EntityValidationResult,
} from '@/types/entity-validation';
import {
  ValidationIssueType,
  ValidationSeverity,
} from '@/types/entity-validation';

// Import components to test (these will be implemented)
import {
  ValidationAnalyticsDashboard,
  ValidationTrendsChart,
  ValidationMetricsCards,
  IssueTypeDistribution,
  EntityTypeBreakdown,
  ValidationPerformanceMetrics,
  ValidationFilters,
  ExportValidationReport,
} from './validation-analytics-dashboard';

// Mock the validation store
const mockValidationStore = {
  getValidationStatistics: vi.fn(),
  getValidationLogs: vi.fn(),
  getValidationSummary: vi.fn(),
  exportValidationData: vi.fn(),
  updateFilter: vi.fn(),
  resetFilter: vi.fn(),
};

vi.mock('@/stores/entity-validation-store', () => ({
  useEntityValidationStore: () => mockValidationStore,
}));

describe('ValidationAnalyticsDashboard', () => {
  const mockStatistics: ValidationStatistics = {
    totalValidationRuns: 150,
    totalEntitiesValidated: 2500,
    totalIssuesFound: 350,
    commonIssueTypes: [
      { issueType: ValidationIssueType.MISSING_FIELD, count: 120, percentage: 34.3 },
      { issueType: ValidationIssueType.TYPE_MISMATCH, count: 100, percentage: 28.6 },
      { issueType: ValidationIssueType.INVALID_FORMAT, count: 80, percentage: 22.9 },
      { issueType: ValidationIssueType.EXTRA_FIELD, count: 30, percentage: 8.6 },
      { issueType: ValidationIssueType.VALUE_OUT_OF_RANGE, count: 20, percentage: 5.7 },
    ],
    problematicEntityTypes: [
      { entityType: EntityType.WORK, errorCount: 200, warningCount: 100, totalCount: 300 },
      { entityType: EntityType.AUTHOR, errorCount: 30, warningCount: 15, totalCount: 45 },
      { entityType: EntityType.SOURCE, errorCount: 5, warningCount: 0, totalCount: 5 },
    ],
    trends: [
      { date: '2023-01-01', validationRuns: 10, issuesFound: 25, entitiesValidated: 150 },
      { date: '2023-01-02', validationRuns: 12, issuesFound: 30, entitiesValidated: 180 },
      { date: '2023-01-03', validationRuns: 15, issuesFound: 35, entitiesValidated: 220 },
    ],
    recentActivity: [
      {
        timestamp: '2023-01-03T12:00:00.000Z',
        entityId: 'W1234567890',
        entityType: EntityType.WORK,
        issueCount: 3,
        severity: ValidationSeverity.ERROR,
      },
      {
        timestamp: '2023-01-03T11:30:00.000Z',
        entityId: 'A1234567890',
        entityType: EntityType.AUTHOR,
        issueCount: 1,
        severity: ValidationSeverity.WARNING,
      },
    ],
  };

  beforeEach(() => {
    mockValidationStore.getValidationStatistics.mockReturnValue(mockStatistics);
    mockValidationStore.getValidationSummary.mockReturnValue({
      totalEntitiesValidated: 2500,
      entitiesWithIssues: 450,
      totalIssues: 350,
      issuesBySeverity: {
        [ValidationSeverity.ERROR]: 200,
        [ValidationSeverity.WARNING]: 120,
        [ValidationSeverity.INFO]: 30,
      },
      issuesByType: {
        [ValidationIssueType.MISSING_FIELD]: 120,
        [ValidationIssueType.TYPE_MISMATCH]: 100,
        [ValidationIssueType.INVALID_FORMAT]: 80,
        [ValidationIssueType.EXTRA_FIELD]: 30,
        [ValidationIssueType.VALUE_OUT_OF_RANGE]: 20,
      },
    });
  });

  test('should render dashboard with all components', () => {
    render(<ValidationAnalyticsDashboard />);

    expect(screen.getByText('Validation Analytics')).toBeInTheDocument();
    expect(screen.getByText('Validation Overview')).toBeInTheDocument();
    expect(screen.getByText('Issue Distribution')).toBeInTheDocument();
    expect(screen.getByText('Trends')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  test('should display key metrics correctly', () => {
    render(<ValidationAnalyticsDashboard />);

    expect(screen.getByText('2,500')).toBeInTheDocument(); // Total entities
    expect(screen.getByText('350')).toBeInTheDocument(); // Total issues
    expect(screen.getByText('150')).toBeInTheDocument(); // Validation runs
  });

  test('should handle loading state', () => {
    mockValidationStore.getValidationStatistics.mockReturnValue(null);
    
    render(<ValidationAnalyticsDashboard />);

    expect(screen.getByTestId('validation-dashboard-loading')).toBeInTheDocument();
  });

  test('should handle empty state', () => {
    const emptyStatistics: ValidationStatistics = {
      totalValidationRuns: 0,
      totalEntitiesValidated: 0,
      totalIssuesFound: 0,
      commonIssueTypes: [],
      problematicEntityTypes: [],
      trends: [],
      recentActivity: [],
    };

    mockValidationStore.getValidationStatistics.mockReturnValue(emptyStatistics);
    
    render(<ValidationAnalyticsDashboard />);

    expect(screen.getByText('No validation data available')).toBeInTheDocument();
    expect(screen.getByText('Start validating entities to see analytics')).toBeInTheDocument();
  });
});

describe('ValidationMetricsCards', () => {
  test('should display all metric cards', () => {
    const metrics = {
      totalEntitiesValidated: 2500,
      entitiesWithIssues: 450,
      totalIssues: 350,
      averageIssuesPerEntity: 0.14,
      validationSuccessRate: 0.82,
      mostCommonIssueType: ValidationIssueType.MISSING_FIELD,
    };

    render(<ValidationMetricsCards metrics={metrics} />);

    expect(screen.getByText('2,500')).toBeInTheDocument();
    expect(screen.getByText('450')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument(); // Success rate
  });

  test('should format large numbers correctly', () => {
    const metrics = {
      totalEntitiesValidated: 1234567,
      entitiesWithIssues: 123456,
      totalIssues: 12345,
      averageIssuesPerEntity: 0.01,
      validationSuccessRate: 0.999,
      mostCommonIssueType: ValidationIssueType.TYPE_MISMATCH,
    };

    render(<ValidationMetricsCards metrics={metrics} />);

    expect(screen.getByText('1.23M')).toBeInTheDocument();
    expect(screen.getByText('123.5K')).toBeInTheDocument();
    expect(screen.getByText('12.3K')).toBeInTheDocument();
  });

  test('should show trend indicators', () => {
    const metricsWithTrends = {
      totalEntitiesValidated: 2500,
      entitiesWithIssues: 450,
      totalIssues: 350,
      trends: {
        totalEntitiesValidated: { change: 15.5, direction: 'up' },
        entitiesWithIssues: { change: -8.2, direction: 'down' },
        totalIssues: { change: -12.1, direction: 'down' },
      },
    };

    render(<ValidationMetricsCards metrics={metricsWithTrends} />);

    expect(screen.getByText('+15.5%')).toBeInTheDocument();
    expect(screen.getByText('-8.2%')).toBeInTheDocument();
    expect(screen.getByText('-12.1%')).toBeInTheDocument();
  });
});

describe('IssueTypeDistribution', () => {
  test('should render pie chart with issue type data', () => {
    const issueData = [
      { issueType: ValidationIssueType.MISSING_FIELD, count: 120, percentage: 34.3 },
      { issueType: ValidationIssueType.TYPE_MISMATCH, count: 100, percentage: 28.6 },
      { issueType: ValidationIssueType.INVALID_FORMAT, count: 80, percentage: 22.9 },
    ];

    render(<IssueTypeDistribution data={issueData} />);

    expect(screen.getByText('Issue Type Distribution')).toBeInTheDocument();
    expect(screen.getByText('Missing Field')).toBeInTheDocument();
    expect(screen.getByText('34.3%')).toBeInTheDocument();
    expect(screen.getByText('Type Mismatch')).toBeInTheDocument();
    expect(screen.getByText('28.6%')).toBeInTheDocument();
  });

  test('should handle hover interactions', async () => {
    const issueData = [
      { issueType: ValidationIssueType.MISSING_FIELD, count: 120, percentage: 34.3 },
      { issueType: ValidationIssueType.TYPE_MISMATCH, count: 100, percentage: 28.6 },
    ];

    render(<IssueTypeDistribution data={issueData} />);

    const chartSegment = screen.getByTestId('pie-segment-missing-field');
    await userEvent.hover(chartSegment);

    await waitFor(() => {
      expect(screen.getByText('120 issues (34.3%)')).toBeInTheDocument();
    });
  });

  test('should support drilling down into issue details', async () => {
    const onDrillDown = vi.fn();
    const issueData = [
      { issueType: ValidationIssueType.MISSING_FIELD, count: 120, percentage: 34.3 },
    ];

    render(<IssueTypeDistribution data={issueData} onDrillDown={onDrillDown} />);

    const chartSegment = screen.getByTestId('pie-segment-missing-field');
    await userEvent.click(chartSegment);

    expect(onDrillDown).toHaveBeenCalledWith(ValidationIssueType.MISSING_FIELD);
  });
});

describe('ValidationTrendsChart', () => {
  const trendData = [
    { date: '2023-01-01', validationRuns: 10, issuesFound: 25, entitiesValidated: 150 },
    { date: '2023-01-02', validationRuns: 12, issuesFound: 30, entitiesValidated: 180 },
    { date: '2023-01-03', validationRuns: 15, issuesFound: 35, entitiesValidated: 220 },
  ];

  test('should render line chart with trend data', () => {
    render(<ValidationTrendsChart data={trendData} />);

    expect(screen.getByText('Validation Trends')).toBeInTheDocument();
    expect(screen.getByText('Issues Found')).toBeInTheDocument();
    expect(screen.getByText('Entities Validated')).toBeInTheDocument();
  });

  test('should allow metric selection', async () => {
    render(<ValidationTrendsChart data={trendData} />);

    const metricSelect = screen.getByLabelText('Select metric to display');
    await userEvent.click(metricSelect);
    await userEvent.click(screen.getByText('Validation Runs'));

    expect(screen.getByDisplayValue('Validation Runs')).toBeInTheDocument();
  });

  test('should support date range filtering', async () => {
    const onDateRangeChange = vi.fn();
    render(
      <ValidationTrendsChart 
        data={trendData} 
        onDateRangeChange={onDateRangeChange}
      />
    );

    const startDateInput = screen.getByLabelText('Start date');
    const endDateInput = screen.getByLabelText('End date');

    await userEvent.clear(startDateInput);
    await userEvent.type(startDateInput, '2023-01-01');
    await userEvent.clear(endDateInput);
    await userEvent.type(endDateInput, '2023-01-02');

    await waitFor(() => {
      expect(onDateRangeChange).toHaveBeenCalledWith({
        start: '2023-01-01',
        end: '2023-01-02',
      });
    });
  });

  test('should handle empty trend data', () => {
    render(<ValidationTrendsChart data={[]} />);

    expect(screen.getByText('No trend data available')).toBeInTheDocument();
    expect(screen.getByText('Validation data will appear here as you run validations over time')).toBeInTheDocument();
  });
});

describe('EntityTypeBreakdown', () => {
  const entityData = [
    { entityType: EntityType.WORK, errorCount: 200, warningCount: 100, totalCount: 300 },
    { entityType: EntityType.AUTHOR, errorCount: 30, warningCount: 15, totalCount: 45 },
    { entityType: EntityType.SOURCE, errorCount: 5, warningCount: 0, totalCount: 5 },
  ];

  test('should render bar chart with entity type data', () => {
    render(<EntityTypeBreakdown data={entityData} />);

    expect(screen.getByText('Issues by Entity Type')).toBeInTheDocument();
    expect(screen.getByText('Works')).toBeInTheDocument();
    expect(screen.getByText('Authors')).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();
  });

  test('should show error and warning counts', () => {
    render(<EntityTypeBreakdown data={entityData} />);

    expect(screen.getByText('200 errors')).toBeInTheDocument();
    expect(screen.getByText('100 warnings')).toBeInTheDocument();
    expect(screen.getByText('30 errors')).toBeInTheDocument();
    expect(screen.getByText('15 warnings')).toBeInTheDocument();
  });

  test('should support sorting by different criteria', async () => {
    render(<EntityTypeBreakdown data={entityData} />);

    const sortSelect = screen.getByLabelText('Sort by');
    await userEvent.click(sortSelect);
    await userEvent.click(screen.getByText('Error Count'));

    // Verify that Works (200 errors) appears first
    const entityItems = screen.getAllByTestId(/^entity-breakdown-/);
    expect(entityItems[0]).toHaveTextContent('Works');
  });
});

describe('ValidationFilters', () => {
  test('should render all filter controls', () => {
    render(<ValidationFilters />);

    expect(screen.getByLabelText('Entity Types')).toBeInTheDocument();
    expect(screen.getByLabelText('Issue Types')).toBeInTheDocument();
    expect(screen.getByLabelText('Severity Levels')).toBeInTheDocument();
    expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
  });

  test('should handle entity type selection', async () => {
    render(<ValidationFilters />);

    const entityTypeSelect = screen.getByLabelText('Entity Types');
    await userEvent.click(entityTypeSelect);
    await userEvent.click(screen.getByText('Works'));
    await userEvent.click(screen.getByText('Authors'));

    expect(mockValidationStore.updateFilter).toHaveBeenCalledWith({
      entityTypes: [EntityType.WORK, EntityType.AUTHOR],
    });
  });

  test('should handle issue type filtering', async () => {
    render(<ValidationFilters />);

    const issueTypeSelect = screen.getByLabelText('Issue Types');
    await userEvent.click(issueTypeSelect);
    await userEvent.click(screen.getByText('Missing Field'));

    expect(mockValidationStore.updateFilter).toHaveBeenCalledWith({
      issueTypes: [ValidationIssueType.MISSING_FIELD],
    });
  });

  test('should handle severity filtering', async () => {
    render(<ValidationFilters />);

    const severitySelect = screen.getByLabelText('Severity Levels');
    await userEvent.click(severitySelect);
    await userEvent.click(screen.getByText('Errors'));
    await userEvent.click(screen.getByText('Warnings'));

    expect(mockValidationStore.updateFilter).toHaveBeenCalledWith({
      severities: [ValidationSeverity.ERROR, ValidationSeverity.WARNING],
    });
  });

  test('should handle date range filtering', async () => {
    render(<ValidationFilters />);

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');

    await userEvent.type(startDateInput, '2023-01-01');
    await userEvent.type(endDateInput, '2023-01-31');

    expect(mockValidationStore.updateFilter).toHaveBeenCalledWith({
      dateRange: {
        from: '2023-01-01',
        to: '2023-01-31',
      },
    });
  });

  test('should reset all filters', async () => {
    render(<ValidationFilters />);

    const resetButton = screen.getByText('Reset Filters');
    await userEvent.click(resetButton);

    expect(mockValidationStore.resetFilter).toHaveBeenCalled();
  });
});

describe('ExportValidationReport', () => {
  test('should render export options', () => {
    render(<ExportValidationReport />);

    expect(screen.getByText('Export Validation Report')).toBeInTheDocument();
    expect(screen.getByLabelText('Export Format')).toBeInTheDocument();
    expect(screen.getByText('Include Statistics')).toBeInTheDocument();
    expect(screen.getByText('Include Entity Details')).toBeInTheDocument();
  });

  test('should handle format selection', async () => {
    render(<ExportValidationReport />);

    const formatSelect = screen.getByLabelText('Export Format');
    await userEvent.click(formatSelect);
    await userEvent.click(screen.getByText('CSV'));

    expect(screen.getByDisplayValue('CSV')).toBeInTheDocument();
  });

  test('should handle export execution', async () => {
    mockValidationStore.exportValidationData.mockResolvedValue('exported-data');
    
    render(<ExportValidationReport />);

    const exportButton = screen.getByText('Export Report');
    await userEvent.click(exportButton);

    await waitFor(() => {
      expect(mockValidationStore.exportValidationData).toHaveBeenCalled();
    });

    expect(screen.getByText('Export completed successfully')).toBeInTheDocument();
  });

  test('should handle export errors', async () => {
    mockValidationStore.exportValidationData.mockRejectedValue(new Error('Export failed'));
    
    render(<ExportValidationReport />);

    const exportButton = screen.getByText('Export Report');
    await userEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export failed. Please try again.')).toBeInTheDocument();
    });
  });

  test('should show loading state during export', async () => {
    mockValidationStore.exportValidationData.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(<ExportValidationReport />);

    const exportButton = screen.getByText('Export Report');
    await userEvent.click(exportButton);

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(exportButton).toBeDisabled();
  });
});

describe('ValidationPerformanceMetrics', () => {
  const performanceData = {
    averageValidationTime: 150, // ms
    validationsPerSecond: 6.67,
    memoryUsage: 45.2, // MB
    cacheHitRate: 0.85,
    errorRate: 0.02,
    successfulValidations: 2450,
    failedValidations: 50,
  };

  test('should display performance metrics', () => {
    render(<ValidationPerformanceMetrics data={performanceData} />);

    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument(); // Average time
    expect(screen.getByText('6.67/sec')).toBeInTheDocument(); // Validations per second
    expect(screen.getByText('45.2 MB')).toBeInTheDocument(); // Memory usage
    expect(screen.getByText('85%')).toBeInTheDocument(); // Cache hit rate
  });

  test('should highlight performance issues', () => {
    const poorPerformanceData = {
      ...performanceData,
      averageValidationTime: 5000, // Very slow
      cacheHitRate: 0.3, // Low cache hit rate
      errorRate: 0.15, // High error rate
    };

    render(<ValidationPerformanceMetrics data={poorPerformanceData} />);

    expect(screen.getByText('5,000ms')).toBeInTheDocument();
    expect(screen.getByTestId('performance-warning-slow')).toBeInTheDocument();
    expect(screen.getByTestId('performance-warning-cache')).toBeInTheDocument();
    expect(screen.getByTestId('performance-warning-errors')).toBeInTheDocument();
  });

  test('should show performance recommendations', () => {
    const poorPerformanceData = {
      ...performanceData,
      averageValidationTime: 3000,
      memoryUsage: 512, // High memory usage
    };

    render(<ValidationPerformanceMetrics data={poorPerformanceData} />);

    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Consider optimizing validation schemas')).toBeInTheDocument();
    expect(screen.getByText('Monitor memory usage - consider pagination')).toBeInTheDocument();
  });
});