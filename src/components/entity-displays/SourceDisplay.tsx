import { Stack, Text, Paper } from '@mantine/core';

import { TwoPaneLayout } from '@/components';
import type { Source } from '@/lib/openalex/types';

interface SourceDisplayProps {
  entity: Source;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function SourceDisplay({ entity: source, useTwoPaneLayout = false, graphPane }: SourceDisplayProps) {
  const sourceContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          {source.display_name}
        </Text>
        <Text c="dimmed" mb="xs">
          Source ID: {source.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {source.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {source.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Type: {source.type}
        </Text>
        {source.issn && (
          <Text c="dimmed" mb="xs">
            ISSN: {source.issn.join(', ')}
          </Text>
        )}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <TwoPaneLayout
        leftPane={sourceContent}
        rightPane={graphPane}
        stateKey={`source-${source.id}`}
        leftTitle={source.display_name}
        rightTitle="Related Entities"
        showHeaders={true}
        mobileTabLabels={{ left: 'Source', right: 'Graph' }}
        defaultSplit={65}
      />
    );
  }

  return sourceContent;
}