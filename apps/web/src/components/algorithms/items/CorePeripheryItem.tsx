/**
 * Core-Periphery Decomposition Algorithm Item
 * Identifies densely connected core nodes and sparsely connected periphery nodes
 * @module components/algorithms/items/CorePeripheryItem
 */

import {
  Badge,
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useState } from 'react';

import { useCorePeriphery } from '@/hooks/use-graph-algorithms';

import { CORE_PERIPHERY, QUALITY_THRESHOLDS } from '../constants';
import type { AlgorithmItemBaseProps } from '../types';

export const CorePeripheryItem = ({
  nodes,
  edges,
  onHighlightNodes,
}: AlgorithmItemBaseProps) => {
  const [coreThreshold, setCoreThreshold] = useState<number>(CORE_PERIPHERY.THRESHOLD_DEFAULT);
  const corePeriphery = useCorePeriphery(nodes, edges, coreThreshold);

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Identifies densely connected core nodes and sparsely connected periphery nodes
        (Borgatti-Everett model).
      </Text>
      <NumberInput
        label="Core Threshold"
        description="Coreness score above this = core member (0-1)"
        value={coreThreshold}
        onChange={(value) => setCoreThreshold(typeof value === 'number' ? value : CORE_PERIPHERY.THRESHOLD_DEFAULT)}
        min={CORE_PERIPHERY.THRESHOLD_MIN}
        max={CORE_PERIPHERY.THRESHOLD_MAX}
        step={CORE_PERIPHERY.THRESHOLD_STEP}
        decimalScale={2}
      />

      {corePeriphery ? (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Core Nodes</Text>
            <Badge color="blue" variant="light">{corePeriphery.coreNodes.length}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Periphery Nodes</Text>
            <Badge color="gray" variant="light">{corePeriphery.peripheryNodes.length}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Fit Quality</Text>
            <Tooltip label="Correlation with ideal core-periphery structure (-1 to 1)">
              <Badge
                color={corePeriphery.fitQuality > QUALITY_THRESHOLDS.CORE_PERIPHERY_FIT.GOOD ? 'green' : (corePeriphery.fitQuality > QUALITY_THRESHOLDS.CORE_PERIPHERY_FIT.FAIR ? 'yellow' : 'red')}
                variant="light"
              >
                {corePeriphery.fitQuality.toFixed(3)}
              </Badge>
            </Tooltip>
          </Group>
          <Group gap="xs">
            <Button
              variant="light"
              size="xs"
              color="blue"
              onClick={() => onHighlightNodes?.(corePeriphery.coreNodes)}
            >
              Highlight Core
            </Button>
            <Button
              variant="light"
              size="xs"
              color="gray"
              onClick={() => onHighlightNodes?.(corePeriphery.peripheryNodes)}
            >
              Highlight Periphery
            </Button>
          </Group>
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          Requires at least 3 nodes for core-periphery analysis.
        </Text>
      )}
    </Stack>
  );
};
