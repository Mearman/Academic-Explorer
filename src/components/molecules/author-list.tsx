import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { IconUser, IconBuilding } from '@tabler/icons-react';
import React from 'react';

import type { Authorship } from '@/lib/openalex/types';

import { EntityLink } from '../atoms/entity-link';

interface AuthorListProps {
  authorships: Authorship[];
  showInstitutions?: boolean;
  showPositions?: boolean;
  maxAuthors?: number;
  variant?: 'compact' | 'detailed';
}

// Get badge color based on author position
function getPositionBadgeColor(position: string): string {
  switch (position) {
    case 'first': return 'blue';
    case 'last': return 'green';
    default: return 'gray';
  }
}

// Render author badges (position, corresponding, ORCID)
function renderAuthorBadges(authorship: Authorship, showPositions: boolean) {
  return (
    <>
      {showPositions && (
        <Badge
          size="xs"
          variant="light"
          color={getPositionBadgeColor(authorship.author_position)}
        >
          {authorship.author_position}
        </Badge>
      )}
      
      {authorship.is_corresponding && (
        <Badge size="xs" variant="light" color="orange">
          Corresponding
        </Badge>
      )}

      {authorship.author.orcid && (
        <Badge size="xs" variant="outline" color="gray">
          ORCID
        </Badge>
      )}
    </>
  );
}

// Render institution item (using the simplified institution structure from Authorship)
function renderInstitution(institution: Authorship['institutions'][0], index: number, totalCount: number) {
  return (
    <React.Fragment key={institution.id}>
      <EntityLink
        entityId={institution.id}
        displayName={institution.display_name}
        size="xs"
        color="dimmed"
      />
      {institution.country_code && (
        <Badge size="xs" variant="dot" color="gray">
          {institution.country_code}
        </Badge>
      )}
      {index < totalCount - 1 && (
        <Text size="xs" c="dimmed">|</Text>
      )}
    </React.Fragment>
  );
}

// Render institutions section
function renderInstitutions(authorship: Authorship, showInstitutions: boolean) {
  if (!showInstitutions || authorship.institutions.length === 0) {
    return null;
  }

  return (
    <Group gap="xs" pl="md">
      <IconBuilding size={14} />
      <Group gap="xs" wrap="wrap">
        {authorship.institutions.map((institution, index) =>
          renderInstitution(institution, index, authorship.institutions.length)
        )}
      </Group>
    </Group>
  );
}

// Render raw affiliations if available
function renderRawAffiliations(authorship: Authorship) {
  if (authorship.raw_affiliation_strings.length === 0) {
    return null;
  }

  return (
    <Text size="xs" c="dimmed" fs="italic" pl="md">
      Raw affiliations: {authorship.raw_affiliation_strings.join('; ')}
    </Text>
  );
}

// Render compact variant author item
function renderCompactAuthor(authorship: Authorship, index: number, totalDisplayed: number) {
  return (
    <React.Fragment key={authorship.author.id}>
      <EntityLink
        entityId={authorship.author.id}
        displayName={authorship.author.display_name}
        size="sm"
        weight={500}
      />
      {index < totalDisplayed - 1 && (
        <Text size="sm" c="dimmed">,</Text>
      )}
    </React.Fragment>
  );
}

// Render detailed variant author item
function renderDetailedAuthor(authorship: Authorship, showInstitutions: boolean, showPositions: boolean) {
  return (
    <Paper key={authorship.author.id} p="md" withBorder radius="sm" bg="gray.0">
      <Stack gap="xs">
        <Group gap="sm">
          <IconUser size={16} />
          <EntityLink
            entityId={authorship.author.id}
            displayName={authorship.author.display_name}
            size="sm"
            weight={500}
          />
          {renderAuthorBadges(authorship, showPositions)}
        </Group>

        {renderInstitutions(authorship, showInstitutions)}
        {renderRawAffiliations(authorship)}
      </Stack>
    </Paper>
  );
}

// Render hidden count message
function renderHiddenCount(hiddenCount: number, displayedCount: number, totalCount: number) {
  if (hiddenCount <= 0) return null;

  return (
    <Text size="sm" c="dimmed" ta="center" fs="italic">
      Showing {displayedCount} of {totalCount} authors
    </Text>
  );
}

export function AuthorList({ 
  authorships, 
  showInstitutions = true, 
  showPositions = true,
  maxAuthors,
  variant = 'detailed'
}: AuthorListProps) {
  const displayedAuthorships = maxAuthors ? authorships.slice(0, maxAuthors) : authorships;
  const hiddenCount = maxAuthors && authorships.length > maxAuthors ? authorships.length - maxAuthors : 0;

  if (variant === 'compact') {
    return (
      <Group gap="xs" wrap="wrap">
        {displayedAuthorships.map((authorship, index) =>
          renderCompactAuthor(authorship, index, displayedAuthorships.length)
        )}
        {hiddenCount > 0 && (
          <Text size="sm" c="dimmed" fs="italic">
            +{hiddenCount} more
          </Text>
        )}
      </Group>
    );
  }

  return (
    <Stack gap="md">
      {displayedAuthorships.map((authorship) =>
        renderDetailedAuthor(authorship, showInstitutions, showPositions)
      )}
      {renderHiddenCount(hiddenCount, displayedAuthorships.length, authorships.length)}
    </Stack>
  );
}