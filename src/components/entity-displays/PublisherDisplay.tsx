import { Stack, Text, Paper } from '@mantine/core';

import { TwoPaneLayout } from '@/components';
import type { Publisher } from '@/lib/openalex/types';

interface PublisherDisplayProps {
  entity: Publisher;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function PublisherDisplay({ entity: publisher, useTwoPaneLayout = false, graphPane }: PublisherDisplayProps) {
  const publisherContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          {publisher.display_name}
        </Text>
        <Text c="dimmed" mb="xs">
          Publisher ID: {publisher.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {publisher.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {publisher.cited_by_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Hierarchy Level: {publisher.hierarchy_level}
        </Text>
        {publisher.country_codes && publisher.country_codes.length > 0 && (
          <Text c="dimmed" mb="xs">
            Countries: {publisher.country_codes.join(', ')}
          </Text>
        )}
        {publisher.parent_publisher && (
          <Text c="dimmed" mb="xs">
            Parent Publisher: {publisher.parent_publisher}
          </Text>
        )}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <TwoPaneLayout
        leftPane={publisherContent}
        rightPane={graphPane}
        stateKey={`publisher-${publisher.id}`}
        leftTitle={publisher.display_name}
        rightTitle="Related Entities"
        showHeaders={true}
        mobileTabLabels={{ left: 'Publisher', right: 'Graph' }}
        defaultSplit={65}
      />
    );
  }

  return publisherContent;
}