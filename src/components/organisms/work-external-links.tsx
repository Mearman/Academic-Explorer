import { 
  Anchor,
  Card,
  Grid,
  Group, 
  Paper,
  Text, 
  Title
} from '@mantine/core';
import { IconExternalLink, IconDownload, IconInfoCircle, IconLink } from '@tabler/icons-react';

import type { Work } from '@/lib/openalex/types';

interface WorkExternalLinksProps {
  work: Work;
}

function buildWorkExternalLinks(work: Work) {
  return [
    work.primary_location?.landing_page_url && {
      url: work.primary_location.landing_page_url,
      label: 'Publisher Page',
      type: 'publisher' as const
    },
    work.best_oa_location?.pdf_url && {
      url: work.best_oa_location.pdf_url,
      label: 'Free PDF Access',
      type: 'pdf' as const
    },
    {
      url: `https://openalex.org/${work.id}`,
      label: 'View on OpenAlex',
      type: 'openalex' as const
    }
  ].filter(Boolean);
}

function getWorkLinkIcon(type: string) {
  switch (type) {
    case 'pdf':
      return <IconDownload size={16} />;
    case 'publisher':
      return <IconExternalLink size={16} />;
    default:
      return <IconInfoCircle size={16} />;
  }
}

function getWorkLinkColor(type: string): string {
  switch (type) {
    case 'pdf':
      return 'openAccess';
    case 'publisher':
      return 'publisher';
    default:
      return 'work';
  }
}

function renderWorkLinkCard(link: { url: string; label: string; type: string }, index: number) {
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
          style={(theme) => {
            const color = getWorkLinkColor(link.type);
            return {
              transition: 'all 150ms ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows.md,
                borderColor: theme.colors[color]?.[5],
              },
            };
          }}
        >
          <Group>
            {getWorkLinkIcon(link.type)}
            <Text size="sm" fw={500} c={getWorkLinkColor(link.type)}>
              {link.label}
            </Text>
          </Group>
        </Paper>
      </Anchor>
    </Grid.Col>
  );
}

export function WorkExternalLinks({ work }: WorkExternalLinksProps) {
  const externalLinks = buildWorkExternalLinks(work);

  return (
    <Card withBorder radius="md" p="xl">
      <Group mb="lg">
        <IconLink size={20} />
        <Title order={2} size="lg">Access & Resources</Title>
      </Group>
      
      <Grid>
        {externalLinks.map((link, index) => {
          if (!link) return null;
          return renderWorkLinkCard(link, index);
        })}
      </Grid>
    </Card>
  );
}