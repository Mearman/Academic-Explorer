import { Group, Stack, Text, Badge, SimpleGrid, Card } from '@mantine/core';
import { forwardRef } from 'react';


import type { ExternalIds } from '@/lib/openalex/types';

import { ExternalLink } from '../atoms/external-link';
import { Icon } from '../atoms/icon';
import type { ExternalLinksGroupProps, ExternalLinkProps } from '../types';

interface ProcessedLink {
  type: ExternalLinkProps['type'];
  href: string;
  label: string;
  category: string;
}

// Link categories for organizing external links
// Note: Not using Object.entries() to avoid type coercion issues
// const linkCategories = {
//   identifiers: ['doi', 'orcid', 'ror'],
//   knowledge: ['wikidata', 'wikipedia'],
//   web: ['website', 'email'],
// } as const;

const linkLabels = {
  doi: 'DOI',
  orcid: 'ORCID',
  ror: 'ROR',
  wikidata: 'Wikidata',
  wikipedia: 'Wikipedia',
  website: 'Website',
  email: 'Email',
} as const;

// Process external IDs into structured links
function processExternalIds(externalIds: ExternalIds): ProcessedLink[] {
  const processedLinks: ProcessedLink[] = [];

  Object.entries(externalIds).forEach(([key, value]) => {
    if (!value) return;

    const linkType = key as ExternalLinkProps['type'];
    
    // Handle arrays (like ISSN)
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item) {
          processedLinks.push({
            type: linkType,
            href: item,
            label: `${linkLabels[linkType] || linkType.toUpperCase()}${value.length > 1 ? ` ${index + 1}` : ''}`,
            category: getCategoryForLinkType(linkType),
          });
        }
      });
    } else if (typeof value === 'string') {
      processedLinks.push({
        type: linkType,
        href: value,
        label: linkLabels[linkType] || linkType.toUpperCase(),
        category: getCategoryForLinkType(linkType),
      });
    }
  });

  return processedLinks;
}

// Render empty state when no links are available
function renderEmptyState(
  ref: React.ForwardedRef<HTMLDivElement>,
  className: string | undefined,
  testId: string | undefined,
  props: React.HTMLAttributes<HTMLDivElement>
) {
  return (
    <Card
      ref={ref}
      className={className}
      data-testid={testId}
      withBorder
      style={{ borderStyle: 'dashed' }}
      p="xl"
      {...props}
    >
      <Group justify="center" gap="sm">
        <Icon name="info" size="sm" aria-hidden="true" />
        <Text size="sm" c="dimmed" fs="italic">No external links available</Text>
      </Group>
    </Card>
  );
}

// Render grouped layout (vertical or grid)
function renderGroupedLayout(
  ref: React.ForwardedRef<HTMLDivElement>,
  processedLinks: ProcessedLink[],
  layout: 'vertical' | 'grid',
  showLabels: boolean,
  className: string | undefined,
  testId: string | undefined,
  props: React.HTMLAttributes<HTMLDivElement>
) {
  const groupedLinks = groupLinksByCategory(processedLinks);
  
  return (
    <Stack
      ref={ref}
      className={className}
      data-testid={testId}
      gap="md"
      {...props}
    >
      {Object.entries(groupedLinks).map(([category, links]) => (
        <Stack key={category} gap="sm">
          <Group gap="sm">
            <Text size="sm" fw="600" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
            <Badge size="xs" color="blue" circle>
              {links.length}
            </Badge>
          </Group>
          {layout === 'grid' ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {links.map((link, index) => renderLinkItem(link, index, showLabels))}
            </SimpleGrid>
          ) : (
            <Stack gap="sm">
              {links.map((link, index) => renderLinkItem(link, index, showLabels))}
            </Stack>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

// Render simple horizontal layout
function renderHorizontalLayout(
  ref: React.ForwardedRef<HTMLDivElement>,
  processedLinks: ProcessedLink[],
  layout: 'horizontal',
  showLabels: boolean,
  className: string | undefined,
  testId: string | undefined,
  props: React.HTMLAttributes<HTMLDivElement>
) {
  return (
    <Group
      ref={ref}
      className={className}
      data-testid={testId}
      gap="md"
      align="center"
      wrap="wrap"
      {...props}
    >
      {processedLinks.map((link, index) => renderLinkItem(link, index, showLabels))}
    </Group>
  );
}

export const ExternalLinksGroup = forwardRef<HTMLDivElement, ExternalLinksGroupProps>(
  ({ 
    externalIds,
    layout = 'horizontal',
    showLabels = true,
    className,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const processedLinks = processExternalIds(externalIds);

    if (processedLinks.length === 0) {
      return renderEmptyState(ref, className, testId, props);
    }

    // Group links by category if layout is vertical or grid
    if (layout === 'vertical' || layout === 'grid') {
      return renderGroupedLayout(ref, processedLinks, layout, showLabels, className, testId, props);
    }

    // Simple horizontal layout
    return renderHorizontalLayout(ref, processedLinks, layout, showLabels, className, testId, props);
  }
);

ExternalLinksGroup.displayName = 'ExternalLinksGroup';

// Helper functions
function getCategoryForLinkType(linkType: string): string {
  // Check identifiers category
  if (linkType === 'doi' || linkType === 'orcid' || linkType === 'ror') {
    return 'identifiers';
  }
  
  // Check knowledge category
  if (linkType === 'wikidata' || linkType === 'wikipedia') {
    return 'knowledge';
  }
  
  // Check web category
  if (linkType === 'website' || linkType === 'email') {
    return 'web';
  }
  
  return 'other';
}

function groupLinksByCategory(links: ProcessedLink[]): Record<string, ProcessedLink[]> {
  return links.reduce((groups, link) => {
    const category = link.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(link);
    return groups;
  }, {} as Record<string, ProcessedLink[]>);
}

function renderLinkItem(link: ProcessedLink, index: number, showLabels: boolean) {
  return (
    <ExternalLink
      key={`${link.type}-${index}`}
      href={link.href}
      type={link.type}
      showIcon={true}
      external={true}
      style={{
        padding: showLabels ? undefined : 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
        fontSize: showLabels ? undefined : 'var(--mantine-font-size-sm)',
      }}
    >
      {showLabels ? link.label : undefined}
    </ExternalLink>
  );
}