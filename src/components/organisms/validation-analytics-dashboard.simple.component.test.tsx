/**
 * Simple Validation Analytics Dashboard Tests
 * Tests TypeScript compilation and basic component structure
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { ValidationIssueType, ValidationSeverity } from '@/types/entity-validation';

// Create a simple test to verify the components can be imported and compiled
describe('ValidationAnalyticsDashboard - TypeScript Compilation', () => {
  test('should import ValidationMetricsCards without errors', async () => {
    const { ValidationMetricsCards } = await import('./validation-analytics-dashboard');
    expect(ValidationMetricsCards).toBeDefined();
  });

  test('should render ValidationMetricsCards with proper props', async () => {
    const { ValidationMetricsCards } = await import('./validation-analytics-dashboard');
    
    const metrics = {
      totalEntitiesValidated: 100,
      entitiesWithIssues: 20,
      totalIssues: 50,
      averageIssuesPerEntity: 0.5,
      validationSuccessRate: 0.8,
      mostCommonIssueType: ValidationIssueType.MISSING_FIELD,
    };

    render(
      <MantineProvider>
        <ValidationMetricsCards metrics={metrics} />
      </MantineProvider>
    );

    expect(screen.getByText('Total Entities')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('should render IssueTypeDistribution with proper props', async () => {
    const { IssueTypeDistribution } = await import('./validation-analytics-dashboard');
    
    const data = [
      { issueType: ValidationIssueType.MISSING_FIELD, count: 10, percentage: 50 },
      { issueType: ValidationIssueType.TYPE_MISMATCH, count: 10, percentage: 50 },
    ];

    render(
      <MantineProvider>
        <IssueTypeDistribution data={data} />
      </MantineProvider>
    );

    expect(screen.getByText('Issue Type Distribution')).toBeInTheDocument();
  });

  test('should render EntityTypeBreakdown with proper props', async () => {
    const { EntityTypeBreakdown } = await import('./validation-analytics-dashboard');
    
    const data = [
      { entityType: EntityType.WORK, errorCount: 5, warningCount: 3, totalCount: 8 },
      { entityType: EntityType.AUTHOR, errorCount: 2, warningCount: 1, totalCount: 3 },
    ];

    render(
      <MantineProvider>
        <EntityTypeBreakdown data={data} />
      </MantineProvider>
    );

    expect(screen.getByText('Issues by Entity Type')).toBeInTheDocument();
  });

  test('should verify all component exports exist', async () => {
    const module = await import('./validation-analytics-dashboard');
    
    expect(module.ValidationAnalyticsDashboard).toBeDefined();
    expect(module.ValidationMetricsCards).toBeDefined();
    expect(module.IssueTypeDistribution).toBeDefined();
    expect(module.EntityTypeBreakdown).toBeDefined();
    expect(module.ValidationTrendsChart).toBeDefined();
    expect(module.ValidationFilters).toBeDefined();
    expect(module.ExportValidationReport).toBeDefined();
    expect(module.ValidationPerformanceMetrics).toBeDefined();
  });
});