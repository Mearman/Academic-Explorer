import { Card, Group, Title, Badge, Grid, Paper, Text } from '@mantine/core';
import { IconGlobe } from '@tabler/icons-react';
import React from 'react';

import type { Concept } from '@/lib/openalex/types';

interface ConceptInternationalNamesProps {
  concept: Concept;
}

/**
 * Display international names for a concept
 */
export function ConceptInternationalNames({ concept }: ConceptInternationalNamesProps) {
  const internationalNames = concept.international?.display_name;
  
  if (!internationalNames || Object.keys(internationalNames).length === 0) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg">
        <IconGlobe size={20} />
        <Title order={2} size="lg">International Names</Title>
        <Badge variant="light" color="orange" radius="sm">
          {Object.keys(internationalNames).length} languages
        </Badge>
      </Group>
      
      <Grid>
        {Object.entries(internationalNames).slice(0, 12).map(([lang, name]) => (
          <Grid.Col key={lang} span={{ base: 12, sm: 6, md: 4 }}>
            <Paper p="md" withBorder radius="sm" bg="orange.0">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                {lang.toUpperCase()}
              </Text>
              <Text size="sm" fw={500}>
                {name}
              </Text>
              {concept.international?.description?.[lang] && (
                <Text size="xs" c="dimmed" mt="xs" lineClamp={2}>
                  {concept.international.description[lang]}
                </Text>
              )}
            </Paper>
          </Grid.Col>
        ))}
      </Grid>
      
      {Object.keys(internationalNames).length > 12 && (
        <Text size="sm" c="dimmed" mt="md" ta="center" fs="italic">
          Showing 12 of {Object.keys(internationalNames).length} languages
        </Text>
      )}
    </Card>
  );
}