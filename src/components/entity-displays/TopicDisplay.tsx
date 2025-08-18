import { Stack, Text, Paper } from '@mantine/core';

import { TwoPaneLayout } from '@/components';
import type { Topic } from '@/lib/openalex/types';

interface TopicDisplayProps {
  entity: Topic;
  useTwoPaneLayout?: boolean;
  graphPane?: React.ReactNode;
}

export function TopicDisplay({ entity: topic, useTwoPaneLayout = false, graphPane }: TopicDisplayProps) {
  const topicContent = (
    <Stack gap="xl">
      <Paper p="xl" withBorder>
        <Text size="xl" fw={700} mb="md">
          {topic.display_name}
        </Text>
        <Text c="dimmed" mb="xs">
          Topic ID: {topic.id}
        </Text>
        <Text c="dimmed" mb="xs">
          Works Count: {topic.works_count ?? 0}
        </Text>
        <Text c="dimmed" mb="xs">
          Citations: {topic.cited_by_count ?? 0}
        </Text>
        {topic.field && (
          <Text c="dimmed" mb="xs">
            Field: {topic.field.display_name}
          </Text>
        )}
        {topic.subfield && (
          <Text c="dimmed" mb="xs">
            Subfield: {topic.subfield.display_name}
          </Text>
        )}
        {topic.domain && (
          <Text c="dimmed" mb="xs">
            Domain: {topic.domain.display_name}
          </Text>
        )}
      </Paper>
    </Stack>
  );

  if (useTwoPaneLayout && graphPane) {
    return (
      <TwoPaneLayout
        leftPane={topicContent}
        rightPane={graphPane}
        stateKey={`topic-${topic.id}`}
        leftTitle={topic.display_name}
        rightTitle="Related Entities"
        showHeaders={true}
        mobileTabLabels={{ left: 'Topic', right: 'Graph' }}
        defaultSplit={65}
      />
    );
  }

  return topicContent;
}