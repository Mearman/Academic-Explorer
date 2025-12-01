/**
 * Motif Detection Algorithm Item
 * Detects triangles, star patterns, co-citations, and bibliographic coupling
 *
 * @module components/algorithms/items/MotifDetectionItem
 */

import {
  Badge,
  Button,
  Card,
  Group,
  List,
  NumberInput,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { IconLink, IconStar } from '@tabler/icons-react';
import { useState } from 'react';

import {
  useTriangles,
  useStarPatterns,
  useCoCitations,
  useBibliographicCoupling,
} from '@/hooks/use-graph-algorithms';

import type { AlgorithmItemBaseProps } from '../types';

export function MotifDetectionItem({
  nodes,
  edges,
  onHighlightNodes,
}: AlgorithmItemBaseProps) {
  // Motif detection hooks
  const triangles = useTriangles(nodes, edges);
  const [starMinDegree, setStarMinDegree] = useState<number>(3);
  const [starType, setStarType] = useState<'in' | 'out'>('out');
  const starPatterns = useStarPatterns(nodes, edges, { minDegree: starMinDegree, type: starType });

  // Co-citation and bibliographic coupling
  const [coCitationMinCount, setCoCitationMinCount] = useState<number>(2);
  const coCitations = useCoCitations(nodes, edges, coCitationMinCount);
  const [bibCouplingMinShared, setBibCouplingMinShared] = useState<number>(2);
  const bibCoupling = useBibliographicCoupling(nodes, edges, bibCouplingMinShared);

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Detect common graph patterns: triangles (3-cliques) and star patterns (hub nodes).
      </Text>

      {/* Triangles */}
      <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="xs">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>Triangles (3-Cliques)</Text>
          <Badge variant="light">{triangles.count}</Badge>
        </Group>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Triangle Count</Text>
            <Badge size="xs" variant="outline">{triangles.count}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Global Clustering Coefficient</Text>
            <Tooltip label="Probability that two neighbors of a node are connected (0-1)">
              <Badge
                size="xs"
                variant="outline"
                color={triangles.clusteringCoefficient > 0.3 ? 'green' : triangles.clusteringCoefficient > 0.1 ? 'yellow' : 'gray'}
              >
                {(triangles.clusteringCoefficient * 100).toFixed(1)}%
              </Badge>
            </Tooltip>
          </Group>
          {triangles.triangles.length > 0 && (
            <Button
              variant="light"
              size="xs"
              onClick={() => {
                const uniqueNodes = new Set<string>();
                triangles.triangles.slice(0, 10).forEach(t => {
                  t.nodes.forEach(n => uniqueNodes.add(n));
                });
                onHighlightNodes?.(Array.from(uniqueNodes));
              }}
            >
              Highlight First 10 Triangles
            </Button>
          )}
        </Stack>
      </Card>

      {/* Star Patterns */}
      <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="xs">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>Star Patterns (Hub Nodes)</Text>
          <Badge variant="light">{starPatterns.count}</Badge>
        </Group>
        <Stack gap="xs">
          <NumberInput
            label="Minimum Degree"
            description="Nodes with at least this many connections"
            value={starMinDegree}
            onChange={(value) => setStarMinDegree(typeof value === 'number' ? value : 3)}
            min={2}
            max={20}
            step={1}
            size="xs"
          />
          <Select
            label="Star Type"
            data={[
              { value: 'out', label: 'Out-Star (outgoing edges)' },
              { value: 'in', label: 'In-Star (incoming edges)' },
            ]}
            value={starType}
            onChange={(value) => setStarType(value as 'in' | 'out')}
            size="xs"
          />
          {starPatterns.patterns.length > 0 && (
            <>
              <Text size="xs" c="dimmed">
                Found {starPatterns.count} hub nodes with {starMinDegree}+ connections
              </Text>
              <List spacing="xs" size="sm">
                {starPatterns.patterns.slice(0, 5).map((pattern) => (
                  <List.Item
                    key={pattern.hubId}
                    icon={
                      <ThemeIcon size={16} radius="xl" variant="light" color="orange">
                        <IconStar size={10} />
                      </ThemeIcon>
                    }
                    style={{ cursor: 'pointer' }}
                    onClick={() => onHighlightNodes?.([pattern.hubId, ...pattern.leafIds])}
                  >
                    <Text size="xs">
                      Hub {pattern.hubId.slice(0, 10)}... ({pattern.leafIds.length} leaves)
                    </Text>
                  </List.Item>
                ))}
                {starPatterns.patterns.length > 5 && (
                  <Text size="xs" c="dimmed">
                    +{starPatterns.patterns.length - 5} more hubs
                  </Text>
                )}
              </List>
            </>
          )}
        </Stack>
      </Card>

      {/* Co-Citations */}
      <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="xs">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>Co-Citations</Text>
          <Badge variant="light" color="cyan">{coCitations.pairs.length} pairs</Badge>
        </Group>
        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            Papers frequently cited together by other papers (indicates related research).
          </Text>
          <NumberInput
            label="Minimum Co-citation Count"
            description="Minimum times two papers must be cited together"
            value={coCitationMinCount}
            onChange={(value) => setCoCitationMinCount(typeof value === 'number' ? value : 2)}
            min={1}
            max={20}
            step={1}
            size="xs"
          />
          {coCitations.pairs.length > 0 && (
            <>
              <Text size="xs" c="dimmed">
                Found {coCitations.pairs.length} co-citation pairs
              </Text>
              <List spacing="xs" size="sm">
                {coCitations.pairs.slice(0, 5).map((pair) => (
                  <List.Item
                    key={`${pair.paper1Id}-${pair.paper2Id}`}
                    icon={
                      <ThemeIcon size={16} radius="xl" variant="light" color="cyan">
                        <IconLink size={10} />
                      </ThemeIcon>
                    }
                    style={{ cursor: 'pointer' }}
                    onClick={() => onHighlightNodes?.([pair.paper1Id, pair.paper2Id])}
                  >
                    <Text size="xs">
                      {pair.paper1Id.slice(0, 8)}... & {pair.paper2Id.slice(0, 8)}... ({pair.count}x)
                    </Text>
                  </List.Item>
                ))}
                {coCitations.pairs.length > 5 && (
                  <Text size="xs" c="dimmed">
                    +{coCitations.pairs.length - 5} more pairs
                  </Text>
                )}
              </List>
            </>
          )}
        </Stack>
      </Card>

      {/* Bibliographic Coupling */}
      <Card style={{ border: "1px solid var(--mantine-color-gray-3)" }} p="xs">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>Bibliographic Coupling</Text>
          <Badge variant="light" color="grape">{bibCoupling.pairs.length} pairs</Badge>
        </Group>
        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            Papers citing the same references (indicates similar research topics).
          </Text>
          <NumberInput
            label="Minimum Shared References"
            description="Minimum references two papers must share"
            value={bibCouplingMinShared}
            onChange={(value) => setBibCouplingMinShared(typeof value === 'number' ? value : 2)}
            min={1}
            max={20}
            step={1}
            size="xs"
          />
          {bibCoupling.pairs.length > 0 && (
            <>
              <Text size="xs" c="dimmed">
                Found {bibCoupling.pairs.length} coupled paper pairs
              </Text>
              <List spacing="xs" size="sm">
                {bibCoupling.pairs.slice(0, 5).map((pair) => (
                  <List.Item
                    key={`${pair.paper1Id}-${pair.paper2Id}`}
                    icon={
                      <ThemeIcon size={16} radius="xl" variant="light" color="grape">
                        <IconLink size={10} />
                      </ThemeIcon>
                    }
                    style={{ cursor: 'pointer' }}
                    onClick={() => onHighlightNodes?.([pair.paper1Id, pair.paper2Id])}
                  >
                    <Text size="xs">
                      {pair.paper1Id.slice(0, 8)}... & {pair.paper2Id.slice(0, 8)}... ({pair.sharedReferences} shared)
                    </Text>
                  </List.Item>
                ))}
                {bibCoupling.pairs.length > 5 && (
                  <Text size="xs" c="dimmed">
                    +{bibCoupling.pairs.length - 5} more pairs
                  </Text>
                )}
              </List>
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
