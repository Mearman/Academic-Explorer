/**
 * Validation Log Viewer Component
 * 
 * Displays validation logs with filtering, searching, and detailed issue viewing.
 * Shows validation history and allows users to investigate data quality issues.
 */

import {
  Stack,
  Table,
  Text,
  Badge,
  Group,
  TextInput,
  Button,
  Pagination,
  Modal,
  ScrollArea,
  Paper,
  Title,
  ActionIcon,
  Tooltip,
  Alert,
  Accordion,
  Code,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSearch,
  IconFilter,
  IconEye,
  IconTrash,
  IconExternalLink,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useState, useMemo } from 'react';

import { useEntityValidationStore } from '@/stores/entity-validation-store';
import type {
  ValidationLogEntry,
  ValidationIssue,
  ValidationSeverity,
} from '@/types/entity-validation';

const ITEMS_PER_PAGE = 10;

export function ValidationLogViewer() {
  const {
    validationLogs,
    removeLogEntry,
    clearValidationLogs,
    resetFilter,
  } = useEntityValidationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLogEntry, setSelectedLogEntry] = useState<ValidationLogEntry | null>(null);
  const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure();

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    let filtered = validationLogs;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.batchResult.summary.totalIssues > 0 &&
        entry.batchResult.results.some(result =>
          result.entityId.toLowerCase().includes(query) ||
          result.entityDisplayName?.toLowerCase().includes(query) ||
          result.issues.some(issue =>
            issue.description.toLowerCase().includes(query) ||
            issue.fieldPath.toLowerCase().includes(query)
          )
        )
      );
    }

    return filtered;
  }, [validationLogs, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleViewDetails = (logEntry: ValidationLogEntry) => {
    setSelectedLogEntry(logEntry);
    openDetails();
  };

  const handleDeleteLog = (logEntryId: string) => {
    removeLogEntry(logEntryId);
    // Adjust current page if needed
    if (paginatedLogs.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (validationLogs.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Stack align="center" gap="md">
          <IconInfoCircle size={48} color="gray" />
          <Title order={3} c="dimmed">
            No Validation Logs
          </Title>
          <Text c="dimmed" ta="center">
            Validation logs will appear here when you validate entities.
            Visit entity pages to automatically validate them or use manual validation tools.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Validation Logs</Title>
        <Group>
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={clearValidationLogs}
            disabled={validationLogs.length === 0}
          >
            Clear All Logs
          </Button>
        </Group>
      </Group>

      {/* Search and Filters */}
      <Group>
        <TextInput
          placeholder="Search logs by entity ID, field, or description..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button
          variant="light"
          leftSection={<IconFilter size={16} />}
          onClick={resetFilter}
        >
          Reset Filters
        </Button>
      </Group>

      {/* Results count */}
      <Text size="sm" c="dimmed">
        Showing {paginatedLogs.length} of {filteredLogs.length} validation runs
      </Text>

      {/* Logs Table */}
      <ScrollArea>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Timestamp</Table.Th>
              <Table.Th>Entities</Table.Th>
              <Table.Th>Issues</Table.Th>
              <Table.Th>Duration</Table.Th>
              <Table.Th>Source</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedLogs.map((logEntry) => {
              const { batchResult, metadata } = logEntry;
              const { summary } = batchResult;

              return (
                <Table.Tr key={logEntry.id}>
                  <Table.Td>
                    <Text size="sm">
                      {formatTimestamp(batchResult.startedAt)}
                    </Text>
                  </Table.Td>
                  
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>
                        {summary.totalEntities} entities
                      </Text>
                      <Text size="xs" c="dimmed">
                        {summary.validEntities} valid, {summary.entitiesWithErrors} with errors
                      </Text>
                    </Stack>
                  </Table.Td>
                  
                  <Table.Td>
                    <Group gap="xs">
                      {summary.totalIssues > 0 ? (
                        <>
                          <Badge color="red" size="sm">
                            {summary.issuesBySeverity.error || 0} errors
                          </Badge>
                          <Badge color="orange" size="sm">
                            {summary.issuesBySeverity.warning || 0} warnings
                          </Badge>
                          <Badge color="blue" size="sm">
                            {summary.issuesBySeverity.info || 0} info
                          </Badge>
                        </>
                      ) : (
                        <Badge color="green" size="sm">
                          No issues
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  
                  <Table.Td>
                    <Text size="sm">
                      {batchResult.durationMs}ms
                    </Text>
                  </Table.Td>
                  
                  <Table.Td>
                    <Badge variant="light" size="sm">
                      {metadata.source}
                    </Badge>
                  </Table.Td>
                  
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="View details">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => handleViewDetails(logEntry)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete log">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDeleteLog(logEntry.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="center">
          <Pagination
            value={currentPage}
            onChange={setCurrentPage}
            total={totalPages}
            size="sm"
          />
        </Group>
      )}

      {/* Details Modal */}
      <Modal
        opened={detailsOpened}
        onClose={closeDetails}
        title="Validation Log Details"
        size="xl"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {selectedLogEntry && (
          <ValidationLogDetails logEntry={selectedLogEntry} />
        )}
      </Modal>
    </Stack>
  );
}

interface ValidationLogDetailsProps {
  logEntry: ValidationLogEntry;
}

function ValidationLogDetails({ logEntry }: ValidationLogDetailsProps) {
  const { batchResult, metadata } = logEntry;
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Stack gap="md">
      {/* Batch Summary */}
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Title order={4}>Batch Summary</Title>
          <Group>
            <Text size="sm">
              <strong>Started:</strong> {formatTimestamp(batchResult.startedAt)}
            </Text>
            <Text size="sm">
              <strong>Duration:</strong> {batchResult.durationMs}ms
            </Text>
            <Text size="sm">
              <strong>Source:</strong> {metadata.source}
            </Text>
          </Group>
          
          <Group>
            <Badge color="blue">
              {batchResult.summary.totalEntities} entities
            </Badge>
            <Badge color="green">
              {batchResult.summary.validEntities} valid
            </Badge>
            <Badge color="red">
              {batchResult.summary.entitiesWithErrors} with errors
            </Badge>
            <Badge color="orange">
              {batchResult.summary.entitiesWithWarnings} with warnings
            </Badge>
          </Group>
        </Stack>
      </Paper>

      {/* Entity Results */}
      <div>
        <Title order={4} mb="md">
          Entity Results
        </Title>
        
        <Accordion value={selectedResult} onChange={setSelectedResult}>
          {batchResult.results.map((result) => (
            <Accordion.Item key={result.entityId} value={result.entityId}>
              <Accordion.Control>
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>
                      {result.entityDisplayName || result.entityId}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {result.entityType} • {result.issues.length} issues
                    </Text>
                  </div>
                  
                  <Group gap="xs">
                    {result.isValid ? (
                      <Badge color="green" size="sm">Valid</Badge>
                    ) : (
                      <>
                        {result.issueCounts.errors > 0 && (
                          <Badge color="red" size="sm">
                            {result.issueCounts.errors} errors
                          </Badge>
                        )}
                        {result.issueCounts.warnings > 0 && (
                          <Badge color="orange" size="sm">
                            {result.issueCounts.warnings} warnings
                          </Badge>
                        )}
                        {result.issueCounts.info > 0 && (
                          <Badge color="blue" size="sm">
                            {result.issueCounts.info} info
                          </Badge>
                        )}
                      </>
                    )}
                    
                    <Tooltip label="View entity">
                      <ActionIcon
                        component={Link}
                        to={`/entity/${result.entityType}/${result.entityId}`}
                        size="sm"
                        variant="subtle"
                      >
                        <IconExternalLink size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Accordion.Control>
              
              <Accordion.Panel>
                {result.issues.length === 0 ? (
                  <Alert color="green" icon={<IconInfoCircle />}>
                    This entity passed all validation checks.
                  </Alert>
                ) : (
                  <Stack gap="md">
                    {result.issues.map((issue) => (
                      <ValidationIssueCard key={issue.id} issue={issue} />
                    ))}
                  </Stack>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </Stack>
  );
}

interface ValidationIssueCardProps {
  issue: ValidationIssue;
}

function ValidationIssueCard({ issue }: ValidationIssueCardProps) {
  const getSeverityColor = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error': return 'red';
      case 'warning': return 'orange';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Group>
            <Badge color={getSeverityColor(issue.severity)} size="sm">
              {issue.severity.toUpperCase()}
            </Badge>
            <Badge variant="light" size="sm">
              {issue.issueType.replace('_', ' ').toUpperCase()}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {new Date(issue.timestamp).toLocaleString()}
          </Text>
        </Group>
        
        <div>
          <Text size="sm" fw={500} mb="xs">
            Field: <Code>{issue.fieldPath}</Code>
          </Text>
          <Text size="sm">
            {issue.description}
          </Text>
        </div>
        
        {(issue.expectedType || issue.actualType || issue.actualValue !== undefined) && (
          <Stack gap="xs">
            {issue.expectedType && (
              <Text size="xs" c="dimmed">
                <strong>Expected:</strong> {issue.expectedType}
              </Text>
            )}
            {issue.actualType && (
              <Text size="xs" c="dimmed">
                <strong>Actual:</strong> {issue.actualType}
              </Text>
            )}
            {issue.actualValue !== undefined && (
              <Text size="xs" c="dimmed">
                <strong>Value:</strong> <Code>{JSON.stringify(issue.actualValue)}</Code>
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}