import { Card, Grid, Group, Paper, Text, Title, Anchor } from '@mantine/core';
import { IconFileText } from '@tabler/icons-react';

import type { Work } from '@/lib/openalex/types';

interface WorkPublicationDetailsProps {
  work: Work;
}

export function WorkPublicationDetails({ work }: WorkPublicationDetailsProps) {
  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg">
        <IconFileText size={20} />
        <Title order={2} size="lg">Publication Details</Title>
      </Group>
      
      <Grid>
        {work.primary_location?.source && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" >
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Source Journal
              </Text>
              <Text size="sm" fw={500}>
                {work.primary_location.source.display_name}
              </Text>
            </Paper>
          </Grid.Col>
        )}
        
        {work.publication_date && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" >
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Publication Date
              </Text>
              <Text size="sm" fw={500}>
                {work.publication_date}
              </Text>
            </Paper>
          </Grid.Col>
        )}
        
        {work.ids.doi && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" >
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Digital Object Identifier
              </Text>
              <Anchor 
                href={`https://doi.org/${work.ids.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                fw={500}
                c="blue"
              >
                {work.ids.doi}
              </Anchor>
            </Paper>
          </Grid.Col>
        )}
        
        {work.language && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" >
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Language
              </Text>
              <Text size="sm" fw={500}>
                {work.language}
              </Text>
            </Paper>
          </Grid.Col>
        )}
      </Grid>
    </Card>
  );
}