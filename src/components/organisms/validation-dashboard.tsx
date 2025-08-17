/**
 * Validation Dashboard Component
 * 
 * Provides an overview of validation statistics, trends, and quick actions.
 * Shows summary cards, charts, and recent validation activity.
 */

import {
  SimpleGrid,
  Paper,
  Text,
  Title,
  Badge,
  Group,
  Stack,
  Progress,
  ThemeIcon,
  Button,
  Alert,
  Table,
  ScrollArea,
} from '@mantine/core';
import {
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconInfoCircle,
  IconActivity,
  IconDatabase,
  IconRefresh,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useEntityValidationStore } from '@/stores/entity-validation-store';
import type { ValidationSeverity } from '@/types/entity-validation';

export function ValidationDashboard() {
  const {
    validationLogs,
    getValidationStatistics,
    getValidationSummary,
  } = useEntityValidationStore();

  const statistics = useMemo(() => getValidationStatistics(), [getValidationStatistics]);
  const summary = useMemo(() => getValidationSummary(), [getValidationSummary]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getSeverityIcon = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error':
        return <IconX size={20} color="red" />;
      case 'warning':
        return <IconAlertTriangle size={20} color="orange" />;
      case 'info':
        return <IconInfoCircle size={20} color="blue" />;
      default:
        return <IconCheck size={20} color="green" />;
    }
  };

  return (
    <Stack gap="xl">
      <div>
        <Title order={3} mb="sm">
          Validation Overview
        </Title>
        <Text size="sm" c="dimmed">
          Summary of entity validation activity and data quality metrics.
        </Text>
      </div>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Total Entities Validated */}
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Entities Validated
              </Text>
              <Text size="xl" fw={700}>
                {summary.totalEntitiesValidated.toLocaleString()}
              </Text>
            </div>
            <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
              <IconDatabase size={20} />
            </ThemeIcon>
          </Group>
        </Paper>

        {/* Validation Runs */}
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Validation Runs
              </Text>
              <Text size="xl" fw={700}>
                {statistics.totalValidationRuns.toLocaleString()}
              </Text>
            </div>
            <ThemeIcon size="lg" radius="xl" variant="light" color="green">
              <IconActivity size={20} />
            </ThemeIcon>
          </Group>
        </Paper>

        {/* Total Issues */}
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Total Issues
              </Text>
              <Text size="xl" fw={700}>
                {summary.totalIssues.toLocaleString()}
              </Text>
            </div>
            <ThemeIcon size="lg" radius="xl" variant="light" color="orange">
              <IconAlertTriangle size={20} />
            </ThemeIcon>
          </Group>
        </Paper>

        {/* Success Rate */}
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Success Rate
              </Text>
              <Text size="xl" fw={700}>
                {summary.totalEntitiesValidated > 0 
                  ? Math.round(((summary.totalEntitiesValidated - summary.entitiesWithIssues) / summary.totalEntitiesValidated) * 100)
                  : 100}%
              </Text>
            </div>
            <ThemeIcon size="lg" radius="xl" variant="light" color="green">
              <IconCheck size={20} />
            </ThemeIcon>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Issue Breakdown */}
      {summary.totalIssues > 0 && (
        <Paper p="md" withBorder>
          <Title order={4} mb="md">
            Issue Severity Breakdown
          </Title>
          
          <Stack gap="md">
            {/* Errors */}
            <div>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconX size={16} color="red" />
                  <Text size="sm" fw={500}>
                    Errors
                  </Text>
                </Group>
                <Text size="sm" fw={500}>
                  {summary.issuesBySeverity.error || 0}
                </Text>
              </Group>
              <Progress
                value={summary.totalIssues > 0 ? ((summary.issuesBySeverity.error || 0) / summary.totalIssues) * 100 : 0}
                color="red"
                size="sm"
              />
            </div>

            {/* Warnings */}
            <div>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconAlertTriangle size={16} color="orange" />
                  <Text size="sm" fw={500}>
                    Warnings
                  </Text>
                </Group>
                <Text size="sm" fw={500}>
                  {summary.issuesBySeverity.warning || 0}
                </Text>
              </Group>
              <Progress
                value={summary.totalIssues > 0 ? ((summary.issuesBySeverity.warning || 0) / summary.totalIssues) * 100 : 0}
                color="orange"
                size="sm"
              />
            </div>

            {/* Info */}
            <div>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconInfoCircle size={16} color="blue" />
                  <Text size="sm" fw={500}>
                    Info
                  </Text>
                </Group>
                <Text size="sm" fw={500}>
                  {summary.issuesBySeverity.info || 0}
                </Text>
              </Group>
              <Progress
                value={summary.totalIssues > 0 ? ((summary.issuesBySeverity.info || 0) / summary.totalIssues) * 100 : 0}
                color="blue"
                size="sm"
              />
            </div>
          </Stack>
        </Paper>
      )}

      {/* Common Issue Types */}
      {statistics.commonIssueTypes.length > 0 && (
        <Paper p="md" withBorder>
          <Title order={4} mb="md">
            Most Common Issue Types
          </Title>
          
          <Stack gap="sm">
            {statistics.commonIssueTypes.slice(0, 5).map((issueType) => (
              <Group key={issueType.issueType} justify="space-between">
                <Text size="sm" tt="capitalize">
                  {issueType.issueType.replace('_', ' ')}
                </Text>
                <Group gap="xs">
                  <Badge variant="light" size="sm">
                    {issueType.count}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {issueType.percentage.toFixed(1)}%
                  </Text>
                </Group>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Recent Activity */}
      {statistics.recentActivity.length > 0 && (
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>
              Recent Validation Activity
            </Title>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconRefresh size={14} />}
              component={Link}
              to="/manage"
            >
              Refresh
            </Button>
          </Group>
          
          <ScrollArea>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Entity</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Issues</Table.Th>
                  <Table.Th>Time</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {statistics.recentActivity.slice(0, 8).map((activity, index) => (
                  <Table.Tr key={`${activity.entityId}-${index}`}>
                    <Table.Td>
                      <Group gap="xs">
                        {getSeverityIcon(activity.severity)}
                        <Text
                          size="sm"
                          component={Link}
                          to={`/entity/${activity.entityType}/${activity.entityId}`}
                          style={{ textDecoration: 'none' }}
                        >
                          {activity.entityId}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm">
                        {activity.entityType}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {activity.issueCount === 0 ? 'No issues' : `${activity.issueCount} issues`}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {formatTimestamp(activity.timestamp)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      )}

      {/* Empty State */}
      {validationLogs.length === 0 && (
        <Alert icon={<IconInfoCircle />} color="blue">
          <Stack gap="xs">
            <Text fw={500}>
              No validation data available
            </Text>
            <Text size="sm">
              Start validating entities to see validation statistics and trends here.
              Visit any entity page to automatically run validation, or use the manual validation tools.
            </Text>
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}