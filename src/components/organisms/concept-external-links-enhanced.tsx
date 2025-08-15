import { Card, Group, Title, Grid, Paper, Text, Anchor } from '@mantine/core';
import { 
  IconLink, 
  IconExternalLink, 
  IconSearch,
  IconBrandWikipedia,
  IconWorld
} from '@tabler/icons-react';
import React from 'react';

import type { Concept } from '@/lib/openalex/types';

interface ConceptExternalLinksEnhancedProps {
  concept: Concept;
}

/**
 * Build external links for concept
 */
function buildExternalLinks(concept: Concept) {
  return [
    concept.works_api_url && {
      url: concept.works_api_url,
      label: 'View Works (API)',
      type: 'api' as const,
      icon: <IconSearch size={16} />
    },
    concept.ids?.wikipedia && {
      url: concept.ids.wikipedia,
      label: 'Wikipedia Page',
      type: 'wikipedia' as const,
      icon: <IconBrandWikipedia size={16} />
    },
    concept.wikidata && {
      url: `https://www.wikidata.org/wiki/${concept.wikidata}`,
      label: 'Wikidata Entry',
      type: 'wikidata' as const,
      icon: <IconWorld size={16} />
    },
    {
      url: `https://openalex.org/${concept.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const,
      icon: <IconExternalLink size={16} />
    }
  ].filter(Boolean);
}

/**
 * Get color for external link type
 */
function getColor(type: string): string {
  switch (type) {
    case 'wikipedia':
      return 'orange';
    case 'wikidata':
      return 'blue';
    case 'api':
      return 'green';
    default:
      return 'concept';
  }
}

/**
 * Display external links for a concept
 */
export function ConceptExternalLinksEnhanced({ concept }: ConceptExternalLinksEnhancedProps) {
  const externalLinks = buildExternalLinks(concept);

  if (externalLinks.length === 0) {
    return null;
  }

  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg">
        <IconLink size={20} />
        <Title order={2} size="lg">External Resources</Title>
      </Group>
      
      <Grid>
        {externalLinks.map((link, index) => {
          if (!link) return null;
          
          const color = getColor(link.type);

          return (
            <Grid.Col key={index} span={{ base: 12, sm: 6, md: 3 }}>
              <Anchor
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Paper
                  p="md"
                  withBorder
                  radius="md"
                  style={(theme) => ({
                    transition: 'all 150ms ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows.md,
                      borderColor: theme.colors[color]?.[5],
                    },
                  })}
                >
                  <Group>
                    {link.icon}
                    <Text size="sm" fw={500} c={color}>
                      {link.label}
                    </Text>
                  </Group>
                </Paper>
              </Anchor>
            </Grid.Col>
          );
        })}
      </Grid>
    </Card>
  );
}