/**
 * Shortest Path Algorithm Item
 * Find shortest path between two nodes using Dijkstra's algorithm
 *
 * Supports weighted traversal with:
 * - Weight configuration (edge property or custom)
 * - Node type filtering (e.g., "path through authors only")
 * - Edge property filtering (score thresholds)
 *
 * @module components/algorithms/items/ShortestPathItem
 */

import {
  ENTITY_METADATA,
  ENTITY_TYPES,
  type EntityType,
  type WeightableEdgeProperty,
} from '@bibgraph/types';
import {
  Accordion,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCircleCheck,
  IconRoute,
  IconSettings,
} from '@tabler/icons-react';
import { useState, useMemo } from 'react';

import {
  findShortestPath,
  type PathResult,
  type WeightConfig,
  type EdgePropertyFilter,
} from '@/services/graph-algorithms';

import type { PathAlgorithmProps } from '../types';

/** Weight property options for the dropdown */
const WEIGHT_PROPERTY_OPTIONS: Array<{ value: WeightableEdgeProperty | 'none'; label: string; description: string }> = [
  { value: 'none', label: 'Uniform (hop count)', description: 'All edges have equal weight' },
  { value: 'score', label: 'Score', description: 'Topic relevance score' },
  { value: 'weight', label: 'Weight', description: 'Edge weight property' },
];

/** Entity type options for node filtering - derived from ENTITY_TYPES and ENTITY_METADATA */
const NODE_TYPE_OPTIONS = ENTITY_TYPES.map((entityType) => ({
  value: entityType,
  label: ENTITY_METADATA[entityType].plural,
}));

export function ShortestPathItem({
  nodes,
  edges,
  onHighlightPath,
  pathSource: controlledPathSource,
  pathTarget: controlledPathTarget,
  onPathSourceChange,
  onPathTargetChange,
}: PathAlgorithmProps) {
  // Path finding state - supports both controlled and uncontrolled modes
  const [internalPathSource, setInternalPathSource] = useState<string | null>(null);
  const [internalPathTarget, setInternalPathTarget] = useState<string | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [pathDirected, setPathDirected] = useState<boolean>(true);

  // Weight configuration state
  const [weightProperty, setWeightProperty] = useState<WeightableEdgeProperty | 'none'>('none');
  const [invertWeight, setInvertWeight] = useState<boolean>(false);

  // Node type filter state
  const [nodeTypes, setNodeTypes] = useState<EntityType[]>([]);

  // Edge filter state
  const [scoreMin, setScoreMin] = useState<number | undefined>(undefined);
  const [scoreMax, setScoreMax] = useState<number | undefined>(undefined);

  // Use controlled values if provided, otherwise use internal state
  const isControlled = controlledPathSource !== undefined || controlledPathTarget !== undefined;
  const pathSource = isControlled ? (controlledPathSource ?? null) : internalPathSource;
  const pathTarget = isControlled ? (controlledPathTarget ?? null) : internalPathTarget;

  const setPathSource = (value: string | null) => {
    if (onPathSourceChange) {
      onPathSourceChange(value);
    }
    if (!isControlled) {
      setInternalPathSource(value);
    }
  };

  const setPathTarget = (value: string | null) => {
    if (onPathTargetChange) {
      onPathTargetChange(value);
    }
    if (!isControlled) {
      setInternalPathTarget(value);
    }
  };

  // Create node options for select dropdowns
  const nodeOptions = useMemo(
    () =>
      nodes.map((node) => ({
        value: node.id,
        label: node.label || node.id,
      })),
    [nodes]
  );

  // Build weight config from UI state
  const weightConfig = useMemo((): WeightConfig | undefined => {
    if (weightProperty === 'none') return undefined;
    return {
      property: weightProperty,
      invert: invertWeight,
      defaultWeight: 1,
    };
  }, [weightProperty, invertWeight]);

  // Build edge filter from UI state
  const edgeFilter = useMemo((): EdgePropertyFilter | undefined => {
    if (scoreMin === undefined && scoreMax === undefined) return undefined;
    return {
      scoreMin,
      scoreMax,
    };
  }, [scoreMin, scoreMax]);

  // Handle path finding
  const handleFindPath = () => {
    if (pathSource && pathTarget) {
      const result = findShortestPath(nodes, edges, pathSource, pathTarget, {
        directed: pathDirected,
        weight: weightConfig,
        nodeTypes: nodeTypes.length > 0 ? nodeTypes : undefined,
        edgeFilter,
      });
      setPathResult(result);
      if (result.found && onHighlightPath) {
        onHighlightPath(result.path);
      }
    }
  };

  // Check if any advanced options are configured
  const hasAdvancedOptions = weightProperty !== 'none' || nodeTypes.length > 0 || scoreMin !== undefined || scoreMax !== undefined;

  return (
    <Stack gap="sm">
      <Select
        label="Source Node"
        placeholder="Select starting node"
        data={nodeOptions}
        value={pathSource}
        onChange={setPathSource}
        searchable
        clearable
      />
      <Select
        label="Target Node"
        placeholder="Select destination node"
        data={nodeOptions}
        value={pathTarget}
        onChange={setPathTarget}
        searchable
        clearable
      />
      <Switch
        label="Respect edge direction"
        description={pathDirected
          ? "Only traverse edges from source → target"
          : "Traverse edges in both directions"
        }
        checked={pathDirected}
        onChange={(e) => setPathDirected(e.currentTarget.checked)}
      />

      {/* Advanced Options */}
      <Accordion variant="separated">
        <Accordion.Item value="advanced">
          <Accordion.Control icon={<IconSettings size={16} />}>
            <Group gap="xs">
              <Text size="sm">Advanced Options</Text>
              {hasAdvancedOptions && (
                <Badge size="xs" variant="light" color="blue">
                  Active
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              {/* Weight Configuration */}
              <Stack gap="xs">
                <Text size="sm" fw={500}>Edge Weight</Text>
                <Select
                  label="Weight Property"
                  description="How to calculate path distance"
                  data={WEIGHT_PROPERTY_OPTIONS.map(opt => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  value={weightProperty}
                  onChange={(value) => setWeightProperty((value as WeightableEdgeProperty | 'none') ?? 'none')}
                />
                {weightProperty !== 'none' && (
                  <Checkbox
                    label="Invert weights"
                    description="Higher values = shorter path (for finding strongest connections)"
                    checked={invertWeight}
                    onChange={(e) => setInvertWeight(e.currentTarget.checked)}
                  />
                )}
              </Stack>

              {/* Node Type Filter */}
              <Stack gap="xs">
                <Text size="sm" fw={500}>Node Type Filter</Text>
                <MultiSelect
                  label="Allowed node types"
                  description="Only traverse through selected entity types (empty = all)"
                  placeholder="Select types..."
                  data={NODE_TYPE_OPTIONS.map(opt => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  value={nodeTypes}
                  onChange={(values) => setNodeTypes(values as EntityType[])}
                  clearable
                  searchable
                />
              </Stack>

              {/* Edge Score Filter */}
              <Stack gap="xs">
                <Text size="sm" fw={500}>Score Filter</Text>
                <Group grow>
                  <NumberInput
                    label="Min Score"
                    description="Only edges with score ≥"
                    placeholder="0.0"
                    min={0}
                    max={1}
                    step={0.1}
                    decimalScale={2}
                    value={scoreMin ?? ''}
                    onChange={(value) => setScoreMin(typeof value === 'number' ? value : undefined)}
                  />
                  <NumberInput
                    label="Max Score"
                    description="Only edges with score ≤"
                    placeholder="1.0"
                    min={0}
                    max={1}
                    step={0.1}
                    decimalScale={2}
                    value={scoreMax ?? ''}
                    onChange={(value) => setScoreMax(typeof value === 'number' ? value : undefined)}
                  />
                </Group>
              </Stack>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Button
        onClick={handleFindPath}
        disabled={!pathSource || !pathTarget}
        leftSection={<IconRoute size={16} />}
      >
        Find Path
      </Button>

      {pathResult && (
        <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="sm" bg="gray.0">
          {pathResult.found ? (
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500} c="green">
                  <IconCircleCheck size={16} style={{ verticalAlign: 'middle' }} /> Path Found
                </Text>
                <Badge variant="light">
                  {weightProperty === 'none'
                    ? `${pathResult.distance} hops`
                    : `${pathResult.distance.toFixed(3)} ${invertWeight ? '(inverted)' : ''}`
                  }
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Path: {pathResult.path.length} nodes
                {nodeTypes.length > 0 && ` (filtered to: ${nodeTypes.join(', ')})`}
              </Text>
            </Stack>
          ) : (
            <Stack gap="xs">
              <Text size="sm" c="red">
                <IconAlertCircle size={16} style={{ verticalAlign: 'middle' }} /> No path exists
              </Text>
              {(nodeTypes.length > 0 || edgeFilter) && (
                <Text size="xs" c="dimmed">
                  Try relaxing the advanced filters
                </Text>
              )}
            </Stack>
          )}
        </Card>
      )}
    </Stack>
  );
}
