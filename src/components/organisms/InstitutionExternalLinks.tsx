import { Card, Group, Title, Grid, Anchor, Paper, Text } from '@mantine/core';
import { 
  IconLink, 
  IconGlobe, 
  IconBuildingBank, 
  IconWorld, 
  IconExternalLink 
} from '@tabler/icons-react';

import type { Institution } from '@/lib/openalex/types';

interface ExternalLink {
  url: string;
  label: string;
  type: 'homepage' | 'ror' | 'wikidata' | 'wikipedia' | 'openalex';
}

interface InstitutionExternalLinksProps {
  institution: Institution;
}

export function InstitutionExternalLinks({ institution }: InstitutionExternalLinksProps) {
  const externalLinks: (ExternalLink | null)[] = [
    institution.homepage_url ? {
      url: institution.homepage_url,
      label: 'Institution Homepage',
      type: 'homepage' as const
    } : null,
    institution.ror ? {
      url: `https://ror.org/${institution.ror}`,
      label: 'ROR Profile',
      type: 'ror' as const
    } : null,
    institution.ids?.wikidata ? {
      url: `https://www.wikidata.org/wiki/${institution.ids.wikidata}`,
      label: 'Wikidata',
      type: 'wikidata' as const
    } : null,
    institution.ids?.wikipedia ? {
      url: `https://en.wikipedia.org/wiki/${institution.ids.wikipedia}`,
      label: 'Wikipedia',
      type: 'wikipedia' as const
    } : null,
    {
      url: `https://openalex.org/${institution.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);

  const getIcon = (type: string) => {
    switch (type) {
      case 'homepage':
        return <IconGlobe size={16} />;
      case 'ror':
        return <IconBuildingBank size={16} />;
      case 'wikidata':
      case 'wikipedia':
        return <IconWorld size={16} />;
      default:
        return <IconExternalLink size={16} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'homepage':
        return 'blue';
      case 'ror':
        return 'orange';
      case 'wikidata':
      case 'wikipedia':
        return 'green';
      default:
        return 'institution';
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
                    {getIcon(link.type)}
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