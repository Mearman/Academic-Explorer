import { Card, Group, Title, Grid, Paper, Text, Anchor } from '@mantine/core';
import { 
  IconLink, 
  IconExternalLink, 
  IconWorldWww, 
  IconCertificate, 
  IconFileText 
} from '@tabler/icons-react';
import React from 'react';

import type { Source } from '@/lib/openalex/types';

interface SourceExternalLinksProps {
  source: Source;
}

/**
 * Build external links for source
 */
function buildExternalLinks(source: Source) {
  return [
    source.homepage_url && {
      url: source.homepage_url,
      label: 'Source Homepage',
      type: 'homepage' as const
    },
    source.issn_l && {
      url: `https://portal.issn.org/resource/ISSN/${source.issn_l}`,
      label: 'ISSN Portal',
      type: 'issn' as const
    },
    source.is_in_doaj && {
      url: `https://doaj.org/toc/${source.issn_l}`,
      label: 'Directory of Open Access Journals',
      type: 'doaj' as const
    },
    {
      url: `https://openalex.org/${source.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);
}

/**
 * Get icon for external link type
 */
function getExternalLinkIcon(type: string) {
  switch (type) {
    case 'homepage':
      return <IconWorldWww size={16} />;
    case 'issn':
      return <IconCertificate size={16} />;
    case 'doaj':
      return <IconFileText size={16} />;
    default:
      return <IconExternalLink size={16} />;
  }
}

/**
 * Get color for external link type
 */
function getExternalLinkColor(type: string): string {
  switch (type) {
    case 'homepage':
      return 'blue';
    case 'issn':
      return 'purple';
    case 'doaj':
      return 'openAccess';
    default:
      return 'source';
  }
}

/**
 * Display external links for a source
 */
export function SourceExternalLinks({ source }: SourceExternalLinksProps) {
  const externalLinks = buildExternalLinks(source);

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
          
          const color = getExternalLinkColor(link.type);

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
                      borderColor: theme.colors[color]?.[5],
                    },
                  })}
                >
                  <Group>
                    {getExternalLinkIcon(link.type)}
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