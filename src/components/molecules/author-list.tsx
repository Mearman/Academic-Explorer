import React from 'react';
import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { IconUser, IconBuilding } from '@tabler/icons-react';
import { EntityLink } from '../atoms/entity-link';
import type { Authorship } from '@/lib/openalex/types';

interface AuthorListProps {
  authorships: Authorship[];
  showInstitutions?: boolean;
  showPositions?: boolean;
  maxAuthors?: number;
  variant?: 'compact' | 'detailed';
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
      <Group gap="xs" wrap>
        {displayedAuthorships.map((authorship, index) => (
          <React.Fragment key={authorship.author.id}>
            <EntityLink
              entityId={authorship.author.id}
              displayName={authorship.author.display_name}
              size="sm"
              weight={500}
            />
            {index < displayedAuthorships.length - 1 && (
              <Text size="sm" c="dimmed">,</Text>
            )}
          </React.Fragment>
        ))}
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
      {displayedAuthorships.map((authorship) => (
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
              
              {showPositions && (
                <Badge
                  size="xs"
                  variant="light"
                  color={
                    authorship.author_position === 'first' ? 'blue' :
                    authorship.author_position === 'last' ? 'green' : 'gray'
                  }
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
            </Group>

            {showInstitutions && authorship.institutions.length > 0 && (
              <Group gap="xs" pl="md">
                <IconBuilding size={14} />
                <Group gap="xs" wrap>
                  {authorship.institutions.map((institution, index) => (
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
                      {index < authorship.institutions.length - 1 && (
                        <Text size="xs" c="dimmed">•</Text>
                      )}
                    </React.Fragment>
                  ))}
                </Group>
              </Group>
            )}

            {authorship.raw_affiliation_strings.length > 0 && (
              <Text size="xs" c="dimmed" fs="italic" pl="md">
                Raw affiliations: {authorship.raw_affiliation_strings.join('; ')}
              </Text>
            )}
          </Stack>
        </Paper>
      ))}
      
      {hiddenCount > 0 && (
        <Text size="sm" c="dimmed" ta="center" fs="italic">
          Showing {displayedAuthorships.length} of {authorships.length} authors
        </Text>
      )}
    </Stack>
  );
}