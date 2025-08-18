import { Card, Group, Paper, Text, Title } from '@mantine/core';
import { IconFileText, IconInfoCircle } from '@tabler/icons-react';

import type { Work } from '@/lib/openalex/types';
import { reconstructAbstract } from '@/lib/openalex/utils/transformers';

interface WorkAbstractProps {
  work: Work;
}

function renderAbstractContent(work: Work) {
  if (!work.abstract_inverted_index) return null;
  
  const reconstructedAbstract = reconstructAbstract(work.abstract_inverted_index);
  
  if (reconstructedAbstract) {
    return (
      <>
        <Group mb="md">
          <IconInfoCircle size={16} color="blue" />
          <Text size="sm" c="dimmed" fs="italic">
            Abstract reconstructed from inverted index ({Object.keys(work.abstract_inverted_index).length} unique terms)
          </Text>
        </Group>
        <Text size="sm" style={{ lineHeight: 1.6 }}>
          {reconstructedAbstract}
        </Text>
      </>
    );
  } else {
    return (
      <Group mb="md">
        <IconInfoCircle size={16} color="orange" />
        <Text size="sm" c="dimmed" fs="italic">
          Unable to reconstruct abstract from inverted index.
        </Text>
      </Group>
    );
  }
}

export function WorkAbstract({ work }: WorkAbstractProps) {
  if (!work.abstract_inverted_index) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="xl" >
      <Group mb="lg">
        <IconFileText size={20} />
        <Title order={2} size="lg">Abstract</Title>
      </Group>
      
      <Paper p="lg" radius="md" withBorder>
        {renderAbstractContent(work)}
      </Paper>
    </Card>
  );
}