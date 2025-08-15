import { Card, Group, Title, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import React from 'react';

import type { Concept } from '@/lib/openalex/types';

interface ConceptDescriptionProps {
  concept: Concept;
}

/**
 * Display concept description
 */
export function ConceptDescription({ concept }: ConceptDescriptionProps) {
  if (!concept.description) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg">
        <IconInfoCircle size={20} />
        <Title order={2} size="lg">Description</Title>
      </Group>
      
      <Text size="md" lh={1.6} c="dark">
        {concept.description}
      </Text>
    </Card>
  );
}