import { Card, Group, Title, Grid, Anchor, Paper, Text } from '@mantine/core';
import { 
  IconLink, 
  IconSearch,
  IconBrandWikipedia,
  IconWorld,
  IconExternalLink 
} from '@tabler/icons-react';

import type { Concept } from '@/lib/openalex/types';

interface ExternalLink {
  url: string;
  label: string;
  type: 'api' | 'wikipedia' | 'wikidata' | 'openalex';
  icon: React.ReactNode;
}

interface ConceptExternalLinksProps {
  concept: Concept;
}

export function ConceptExternalLinks({ concept }: ConceptExternalLinksProps) {
  const externalLinks: (ExternalLink | null)[] = [
    concept.works_api_url ? {
      url: concept.works_api_url,
      label: 'View Works (API)',
      type: 'api' as const,
      icon: <IconSearch size={16} />
    } : null,
    concept.ids?.wikipedia ? {
      url: concept.ids.wikipedia,
      label: 'Wikipedia Page',
      type: 'wikipedia' as const,
      icon: <IconBrandWikipedia size={16} />
    } : null,
    concept.wikidata ? {
      url: `https://www.wikidata.org/wiki/${concept.wikidata}`,
      label: 'Wikidata Entry',
      type: 'wikidata' as const,
      icon: <IconWorld size={16} />
    } : null,
    {
      url: `https://openalex.org/${concept.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const,
      icon: <IconExternalLink size={16} />
    }
  ].filter(Boolean);

  const getColor = (type: string) => {
    switch (type) {
      case 'api':
        return 'blue';
      case 'wikipedia':
        return 'gray';
      case 'wikidata':
        return 'green';
      default:
        return 'grape';
    }
  };

  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg">
        <IconLink size={20} />
        <Title order={2} size="lg">External Links & Resources</Title>
      </Group>
      
      <Grid>
        {externalLinks.map((link, index) => {
          if (!link) return null;
          
          return (
            <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4 }}>
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
                      borderColor: theme.colors[getColor(link.type)][5],
                    },
                  })}
                >
                  <Group>
                    {link.icon}
                    <Text size="sm" fw={500} c={getColor(link.type)}>
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