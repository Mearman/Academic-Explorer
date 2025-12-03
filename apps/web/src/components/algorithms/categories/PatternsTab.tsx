/**
 * Patterns Tab
 * Motifs, triangles, and citation patterns
 * @module components/algorithms/categories/PatternsTab
 *
 * ## Current Patterns
 * - Triangles (3-cliques) - clustering coefficient analysis
 * - Star patterns - hub node detection
 * - Co-citations - papers cited together
 * - Bibliographic coupling - papers citing same references
 *
 * ## Future Pattern Algorithms
 * - K-cliques (k > 3) - larger complete subgraphs
 * - Chain detection - linear path patterns
 * - Feed-forward loops - directed motifs common in citation networks
 * - Bipartite patterns - two-mode network structures
 * - Dense subgraph detection - quasi-cliques, dense cores
 * - Frequent subgraph mining - recurring structural patterns
 * - Butterfly patterns - 4-node bipartite motifs
 */

import { Accordion, Badge } from '@mantine/core';
import { IconTriangle } from '@tabler/icons-react';

import { useTriangles } from '@/hooks/use-graph-algorithms';

import { MotifDetectionItem } from '../items';
import type { CategoryTabProps } from '../types';

export const PatternsTab = ({
  nodes,
  edges,
  onHighlightNodes,
}: CategoryTabProps) => {
  // Get triangle count for badge
  const triangles = useTriangles(nodes, edges);

  return (
    <Accordion multiple defaultValue={['motifs']}>
      <Accordion.Item value="motifs">
        <Accordion.Control icon={<IconTriangle size={18} />}>
          Motif Detection
          <Badge ml="xs" size="sm" variant="light">
            {triangles.count} triangles
          </Badge>
        </Accordion.Control>
        <Accordion.Panel>
          <MotifDetectionItem
            nodes={nodes}
            edges={edges}
            onHighlightNodes={onHighlightNodes}
          />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};
