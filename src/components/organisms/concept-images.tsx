import { Card, Group, Title, Grid, Paper, Text, Anchor } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import React from 'react';

import type { Concept } from '@/lib/openalex/types';

interface ConceptImagesProps {
  concept: Concept;
}

/**
 * Display concept images (thumbnail and full)
 */
export function ConceptImages({ concept }: ConceptImagesProps) {
  if (!concept.image_url && !concept.image_thumbnail_url) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg">
        <IconPhoto size={20} />
        <Title order={2} size="lg">Concept Images</Title>
      </Group>
      
      <Grid>
        {concept.image_thumbnail_url && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Thumbnail Image
              </Text>
              <Anchor 
                href={concept.image_thumbnail_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img 
                  src={concept.image_thumbnail_url} 
                  alt={`Thumbnail for ${concept.display_name}`}
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                />
              </Anchor>
            </Paper>
          </Grid.Col>
        )}
        
        {concept.image_url && concept.image_url !== concept.image_thumbnail_url && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Full Image
              </Text>
              <Anchor 
                href={concept.image_url}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                fw={500}
                c="blue"
              >
                View Full Image
              </Anchor>
            </Paper>
          </Grid.Col>
        )}
      </Grid>
    </Card>
  );
}