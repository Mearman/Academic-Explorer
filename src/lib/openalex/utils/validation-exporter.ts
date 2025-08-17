/**
 * Validation Data Exporter
 * 
 * Handles exporting validation data in different formats (JSON, CSV, Markdown).
 * Provides formatting and filtering capabilities for validation reports.
 */

import type {
  ValidationIssue,
  EntityValidationResult,
  ValidationExportConfig,
  ValidationExportFormat,
  ValidationFilter,
} from '@/types/entity-validation';

type OrganizedValidationData = 
  | { issues: ValidationIssue[]; results: EntityValidationResult[] }
  | { issuesByType: Record<string, ValidationIssue[]>; resultsByType: Record<string, EntityValidationResult[]> };

interface ExportData {
  exportInfo: {
    timestamp: string;
    format: string;
    version: string;
    config: ValidationExportConfig;
    filters?: ValidationFilter;
    options?: {
      includeEntityDetails?: boolean;
      includeStatistics?: boolean;
      groupByEntityType?: boolean;
      [key: string]: unknown;
    };
  };
  data: OrganizedValidationData;
  // Optional properties that may be added based on config
  issues?: ValidationIssue[];
  results?: EntityValidationResult[];
  issuesByEntityType?: Record<string, ValidationIssue[]>;
  resultsByEntityType?: Record<string, EntityValidationResult[]>;
  statistics?: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    uniqueEntities: number;
  };
}

/**
 * Export validation data in the specified format
 */
export async function exportValidationData(
  issues: ValidationIssue[],
  results: EntityValidationResult[],
  config: ValidationExportConfig
): Promise<string> {
  // Apply sorting
  const sortedIssues = sortIssues(issues, config);
  
  // Apply grouping if requested
  const organizedData = config.groupByEntityType 
    ? groupByEntityType(sortedIssues, results)
    : { issues: sortedIssues, results };

  switch (config.format) {
    case 'json':
      return exportAsJson(organizedData, config);
    case 'csv':
      return exportAsCsv(sortedIssues, config);
    case 'markdown':
      return exportAsMarkdown(organizedData, config);
    default:
      throw new Error(`Unsupported export format: ${config.format}`);
  }
}

/**
 * Sort issues based on configuration
 */
function sortIssues(issues: ValidationIssue[], config: ValidationExportConfig): ValidationIssue[] {
  const sorted = [...issues];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (config.sortBy) {
      case 'timestamp':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'severity': {
        // Order: error > warning > info
        const severityOrder = { error: 3, warning: 2, info: 1 };
        comparison = severityOrder[b.severity] - severityOrder[a.severity];
        break;
      }
      case 'entityType':
        comparison = a.entityType.localeCompare(b.entityType);
        break;
      case 'issueType':
        comparison = a.issueType.localeCompare(b.issueType);
        break;
      default:
        comparison = 0;
    }
    
    return config.sortDirection === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}

/**
 * Group data by entity type
 */
function groupByEntityType(
  issues: ValidationIssue[], 
  results: EntityValidationResult[]
) {
  const groupedIssues = issues.reduce((groups, issue) => {
    const key = issue.entityType;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(issue);
    return groups;
  }, {} as Record<string, ValidationIssue[]>);
  
  const groupedResults = results.reduce((groups, result) => {
    const key = result.entityType;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(result);
    return groups;
  }, {} as Record<string, EntityValidationResult[]>);
  
  return { issuesByType: groupedIssues, resultsByType: groupedResults };
}

/**
 * Export as JSON format
 */
function exportAsJson(
  data: OrganizedValidationData,
  config: ValidationExportConfig
): string {
  const exportData: ExportData = {
    exportInfo: {
      timestamp: new Date().toISOString(),
      format: 'json',
      version: '1.0',
      config,
      filters: config.filters,
      options: {
        includeEntityDetails: config.includeEntityDetails,
        includeStatistics: config.includeStatistics,
        groupByEntityType: config.groupByEntityType,
        sortBy: config.sortBy,
        sortDirection: config.sortDirection,
      },
    },
    data,
  };

  if (config.groupByEntityType && 'issuesByType' in data) {
    exportData.issuesByEntityType = data.issuesByType;
    if (config.includeEntityDetails) {
      exportData.resultsByEntityType = data.resultsByType;
    }
  } else if ('issues' in data) {
    exportData.issues = data.issues;
    if (config.includeEntityDetails) {
      exportData.results = data.results;
    }
  }

  if (config.includeStatistics) {
    const allIssues = 'issues' in data 
      ? data.issues 
      : Object.values(data.issuesByType).flat();
    exportData.statistics = calculateStatistics(allIssues);
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export as CSV format
 */
function exportAsCsv(
  issues: ValidationIssue[],
  config: ValidationExportConfig
): string {
  const headers = [
    'Entity ID',
    'Entity Type',
    'Entity Display Name',
    'Issue Type',
    'Severity',
    'Field Path',
    'Description',
    'Expected Type',
    'Actual Type',
    'Actual Value',
    'Timestamp',
  ];

  if (config.includeEntityDetails) {
    headers.push('Entity URL');
  }

  const rows = issues.map(issue => {
    const row = [
      escapeCSV(issue.entityId),
      escapeCSV(issue.entityType),
      escapeCSV(issue.entityDisplayName || ''),
      escapeCSV(issue.issueType),
      escapeCSV(issue.severity),
      escapeCSV(issue.fieldPath),
      escapeCSV(issue.description),
      escapeCSV(issue.expectedType || ''),
      escapeCSV(issue.actualType || ''),
      escapeCSV(issue.actualValue !== undefined ? JSON.stringify(issue.actualValue) : ''),
      escapeCSV(issue.timestamp),
    ];

    if (config.includeEntityDetails) {
      row.push(escapeCSV(issue.entityUrl || ''));
    }

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export as Markdown format
 */
function exportAsMarkdown(
  data: OrganizedValidationData,
  config: ValidationExportConfig
): string {
  const timestamp = new Date().toISOString();
  let markdown = `# Validation Report\n\n`;
  markdown += `**Generated:** ${timestamp}\n`;
  markdown += `**Format:** Markdown\n\n`;

  // Add statistics if requested
  if (config.includeStatistics) {
    const issues = 'issues' in data 
      ? data.issues 
      : Object.values(data.issuesByType).flat();
    const stats = calculateStatistics(issues);
    
    markdown += `## Summary Statistics\n\n`;
    markdown += `- **Total Issues:** ${stats.totalIssues}\n`;
    markdown += `- **Errors:** ${stats.errorCount}\n`;
    markdown += `- **Warnings:** ${stats.warningCount}\n`;
    markdown += `- **Info:** ${stats.infoCount}\n`;
    markdown += `- **Unique Entities:** ${stats.uniqueEntities}\n\n`;
  }

  // Add issues
  if (config.groupByEntityType && 'issuesByType' in data) {
    for (const [entityType, issues] of Object.entries(data.issuesByType)) {
      markdown += `## ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Issues\n\n`;
      markdown += formatIssuesAsMarkdown(issues as ValidationIssue[], config);
      markdown += '\n';
    }
  } else if ('issues' in data) {
    markdown += `## Validation Issues\n\n`;
    markdown += formatIssuesAsMarkdown(data.issues, config);
  }

  return markdown;
}

/**
 * Format issues as markdown table
 */
function formatIssuesAsMarkdown(
  issues: ValidationIssue[],
  config: ValidationExportConfig
): string {
  if (issues.length === 0) {
    return '_No issues found._\n';
  }

  let markdown = `| Entity | Issue Type | Severity | Field | Description |\n`;
  markdown += `|--------|------------|----------|-------|-------------|\n`;

  for (const issue of issues) {
    const entityDisplay = config.includeEntityDetails && issue.entityDisplayName 
      ? `${issue.entityDisplayName} (${issue.entityId})`
      : issue.entityId;
    
    markdown += `| ${escapeMarkdown(entityDisplay)} `;
    markdown += `| ${escapeMarkdown(issue.issueType.replace('_', ' '))} `;
    markdown += `| ${escapeMarkdown(issue.severity.toUpperCase())} `;
    markdown += `| \`${escapeMarkdown(issue.fieldPath)}\` `;
    markdown += `| ${escapeMarkdown(issue.description)} |\n`;
  }

  return markdown;
}

/**
 * Calculate statistics for the given issues
 */
function calculateStatistics(issues: ValidationIssue[]) {
  const stats = {
    totalIssues: issues.length,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    uniqueEntities: new Set<string>(),
    issueTypeBreakdown: {} as Record<string, number>,
    entityTypeBreakdown: {} as Record<string, number>,
  };

  for (const issue of issues) {
    // Count by severity
    switch (issue.severity) {
      case 'error':
        stats.errorCount++;
        break;
      case 'warning':
        stats.warningCount++;
        break;
      case 'info':
        stats.infoCount++;
        break;
    }

    // Track unique entities
    stats.uniqueEntities.add(issue.entityId);

    // Count by issue type
    stats.issueTypeBreakdown[issue.issueType] = 
      (stats.issueTypeBreakdown[issue.issueType] || 0) + 1;

    // Count by entity type
    stats.entityTypeBreakdown[issue.entityType] = 
      (stats.entityTypeBreakdown[issue.entityType] || 0) + 1;
  }

  return {
    ...stats,
    uniqueEntities: stats.uniqueEntities.size,
  };
}

/**
 * Escape CSV values
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Escape markdown special characters
 */
function escapeMarkdown(value: string): string {
  return value
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  format: ValidationExportFormat,
  filters?: { entityTypes?: string[]; severities?: string[]; [key: string]: unknown }
): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  let filename = `validation-export-${timestamp}`;
  
  // Add filter info to filename if applicable
  if (filters?.entityTypes?.length === 1) {
    filename += `-${filters.entityTypes[0]}`;
  }
  
  if (filters?.severities?.length === 1) {
    filename += `-${filters.severities[0]}`;
  }
  
  return `${filename}.${format}`;
}