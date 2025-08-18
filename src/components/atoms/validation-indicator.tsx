/**
 * Validation Indicator Component
 * 
 * Shows validation status for entities with badges and tooltips.
 * Displays validation results inline with entity information.
 */

import {
  Badge,
  Tooltip,
  Group,
  ActionIcon,
  Text,
  Stack,
} from '@mantine/core';
import {
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import type { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityValidationStore } from '@/stores/entity-validation-store';
import { getValidationSeverityColor } from '@/types/entity-validation';
import type { EntityValidationResult, ValidationSettings } from '@/types/entity-validation';

interface ValidationIndicatorProps {
  /** Entity ID to show validation for */
  entityId: string;
  /** Entity type */
  entityType: EntityType;
  /** Display size */
  size?: 'xs' | 'sm' | 'md';
  /** Show detailed tooltip */
  showDetails?: boolean;
  /** Show link to manage page */
  showManageLink?: boolean;
}

// Helper functions for ValidationIndicator
function getIconSize(size: 'xs' | 'sm' | 'md'): number {
  switch (size) {
    case 'xs': return 12;
    case 'sm': return 14;
    case 'md': return 16;
    default: return 14;
  }
}

function createStatusIcon(hasIssues: boolean, highestSeverity: string | null, size: 'xs' | 'sm' | 'md') {
  const iconSize = getIconSize(size);
  
  if (!hasIssues) {
    return <IconCheck size={iconSize} />;
  }

  switch (highestSeverity) {
    case 'error':
      return <IconX size={iconSize} />;
    case 'warning':
      return <IconAlertTriangle size={iconSize} />;
    case 'info':
      return <IconInfoCircle size={iconSize} />;
    default:
      return <IconCheck size={iconSize} />;
  }
}

function createStatusText(hasIssues: boolean, validationResult: EntityValidationResult, validationSettings: ValidationSettings): string {
  if (!hasIssues) return 'Valid';
  
  const counts = {
    errors: validationResult.issueCounts.errors,
    warnings: validationResult.issueCounts.warnings,
    info: validationResult.issueCounts.info,
  };

  const parts = [];
  if (counts.errors > 0) parts.push(`${counts.errors} error${counts.errors > 1 ? 's' : ''}`);
  if (counts.warnings > 0) parts.push(`${counts.warnings} warning${counts.warnings > 1 ? 's' : ''}`);
  if (counts.info > 0 && validationSettings.showInfo) parts.push(`${counts.info} info`);

  return parts.join(', ');
}

function createTooltipContent(showDetails: boolean, statusText: string, validationResult: EntityValidationResult, showManageLink: boolean) {
  if (!showDetails) return statusText;

  return (
    <Stack gap="xs" maw={300}>
      <Text size="sm" fw={500}>
        Validation Status
      </Text>
      <Text size="xs">
        {statusText}
      </Text>
      {validationResult.validatedAt && (
        <Text size="xs" c="dimmed">
          Validated: {new Date(validationResult.validatedAt).toLocaleString()}
        </Text>
      )}
      {showManageLink && (
        <Text size="xs" c="blue" style={{ cursor: 'pointer' }}>
          Click to view details in Manage tab
        </Text>
      )}
    </Stack>
  );
}

// Custom hook for validation indicator logic
function useValidationIndicatorData(entityId: string, entityType: EntityType) {
  const {
    validationSettings,
    getValidationResult,
    hasValidationIssues,
    getEntityIssueCount,
    getEntityHighestSeverity,
  } = useEntityValidationStore();

  const validationResult = useMemo(() => getValidationResult(entityId), [getValidationResult, entityId]);
  const hasIssues = useMemo(() => hasValidationIssues(entityId), [hasValidationIssues, entityId]);
  const issueCount = useMemo(() => getEntityIssueCount(entityId), [getEntityIssueCount, entityId]);
  const highestSeverity = useMemo(() => getEntityHighestSeverity(entityId), [getEntityHighestSeverity, entityId]);

  const shouldShow = validationSettings.enabled && 
    validationSettings.showValidationIndicators &&
    validationSettings.validatedEntityTypes.includes(entityType) &&
    !!validationResult;

  return {
    validationSettings,
    validationResult,
    hasIssues,
    issueCount,
    highestSeverity,
    shouldShow,
  };
}

export function ValidationIndicator({
  entityId,
  entityType,
  size = 'sm',
  showDetails = true,
  showManageLink = false,
}: ValidationIndicatorProps) {
  const {
    validationSettings,
    validationResult,
    hasIssues,
    issueCount,
    highestSeverity,
    shouldShow,
  } = useValidationIndicatorData(entityId, entityType);

  if (!shouldShow || !validationResult) {
    return null;
  }

  const statusIcon = createStatusIcon(hasIssues, highestSeverity, size);
  const statusColor = hasIssues ? (highestSeverity ? getValidationSeverityColor(highestSeverity) : 'gray') : 'green';
  const statusText = createStatusText(hasIssues, validationResult, validationSettings);
  const tooltipContent = createTooltipContent(showDetails, statusText, validationResult, showManageLink);

  const indicator = (
    <Badge
      color={statusColor}
      variant="light"
      size={size}
      leftSection={statusIcon}
    >
      {hasIssues ? issueCount : '[CHECK]'}
    </Badge>
  );

  return showManageLink ? (
    <Tooltip label={tooltipContent} multiline>
      <ActionIcon component={Link} to="/manage" variant="transparent" size="sm">
        {indicator}
      </ActionIcon>
    </Tooltip>
  ) : (
    <Tooltip label={tooltipContent} multiline>
      {indicator}
    </Tooltip>
  );
}

/**
 * Compact validation indicator that shows only a colored dot
 */
interface ValidationDotProps {
  entityId: string;
  entityType: EntityType;
  size?: number;
}

export function ValidationDot({ entityId, entityType, size = 8 }: ValidationDotProps) {
  const {
    validationSettings,
    hasValidationIssues,
    getEntityHighestSeverity,
  } = useEntityValidationStore();

  const hasIssues = useMemo(() => hasValidationIssues(entityId), [hasValidationIssues, entityId]);
  const highestSeverity = useMemo(() => getEntityHighestSeverity(entityId), [getEntityHighestSeverity, entityId]);

  // Don't show if validation is disabled or not configured for this entity type
  if (!validationSettings.enabled || 
      !validationSettings.showValidationIndicators ||
      !validationSettings.validatedEntityTypes.includes(entityType)) {
    return null;
  }

  const getColor = () => {
    if (!hasIssues) return 'green';
    return highestSeverity ? getValidationSeverityColor(highestSeverity) : 'gray';
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: `var(--mantine-color-${getColor()}-6)`,
        display: 'inline-block',
      }}
    />
  );
}

/**
 * Summary validation indicator for groups of entities
 */
interface ValidationSummaryProps {
  entityIds: string[];
  entityType: EntityType;
}

// Helper function for ValidationSummary
function calculateValidationSummary(
  entityIds: string[], 
  getValidationResult: (id: string) => EntityValidationResult | null
) {
  let validCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  let validatedCount = 0;

  for (const entityId of entityIds) {
    const result = getValidationResult(entityId);
    if (result) {
      validatedCount++;
      if (result.isValid) {
        validCount++;
      } else {
        errorCount += result.issueCounts.errors;
        warningCount += result.issueCounts.warnings;
        infoCount += result.issueCounts.info;
      }
    }
  }

  return {
    total: entityIds.length,
    validated: validatedCount,
    valid: validCount,
    errors: errorCount,
    warnings: warningCount,
    info: infoCount,
  };
}

export function ValidationSummary({ entityIds, entityType }: ValidationSummaryProps) {
  const {
    validationSettings,
    getValidationResult,
  } = useEntityValidationStore();

  const summary = useMemo(() => {
    if (!validationSettings.enabled || !validationSettings.validatedEntityTypes.includes(entityType)) {
      return null;
    }

    return calculateValidationSummary(entityIds, getValidationResult);
  }, [entityIds, entityType, validationSettings, getValidationResult]);

  if (!summary || summary.validated === 0) {
    return null;
  }

  return (
    <Group gap="xs">
      <Text size="xs" c="dimmed">
        Validation:
      </Text>
      
      {summary.valid > 0 && (
        <Badge color="green" variant="light" size="xs">
          {summary.valid} valid
        </Badge>
      )}
      
      {summary.errors > 0 && (
        <Badge color="red" variant="light" size="xs">
          {summary.errors} errors
        </Badge>
      )}
      
      {summary.warnings > 0 && (
        <Badge color="orange" variant="light" size="xs">
          {summary.warnings} warnings
        </Badge>
      )}
      
      {summary.info > 0 && validationSettings.showInfo && (
        <Badge color="blue" variant="light" size="xs">
          {summary.info} info
        </Badge>
      )}
      
      <Text size="xs" c="dimmed">
        ({summary.validated}/{summary.total} validated)
      </Text>
    </Group>
  );
}