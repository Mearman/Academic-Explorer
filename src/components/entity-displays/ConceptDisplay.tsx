import { Stack, Text, Paper } from '@mantine/core';

import { TwoPaneLayout } from '@/components';
import type { Concept } from '@/lib/openalex/types';

interface ConceptDisplayProps {
  entity: Concept;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function ConceptDisplay({ entity: concept, useTwoPaneLayout = false, graphPane }: ConceptDisplayProps) {
  const conceptContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          {concept.display_name}
        </Text>
        <Text c="dimmed" mb="xs">
          Concept ID: {concept.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {concept.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {concept.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Level: {concept.level}
        </Text>
        {concept.description && (
          <Text c="dimmed" mb="xs">
            Description: {concept.description}
          </Text>
        )}
        {concept.wikidata && (
          <Text c="dimmed" mb="xs">
            Wikidata: {concept.wikidata}
          </Text>
        )}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <TwoPaneLayout
        leftPane={conceptContent}
        rightPane={graphPane}
        stateKey={`concept-${concept.id}`}
        leftTitle={concept.display_name}
        rightTitle="Related Entities"
        showHeaders={true}
        mobileTabLabels={{ left: 'Concept', right: 'Graph' }}
        defaultSplit={65}
      />
    );
  }

  return conceptContent;
}