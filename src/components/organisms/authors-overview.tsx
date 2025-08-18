import { Stack, Title, Text, Paper, Group, Button } from '@mantine/core';
import { IconSearch, IconUsers } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import React from 'react';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

/**
 * Overview component for the Authors section showing author-related statistics and actions
 */
export function AuthorsOverview() {
  const navigate = useNavigate();
  const { graph } = useEntityGraphStore();

  // Get authors-related statistics from the graph
  const authorVertices = Array.from(graph.vertices.values())
    .filter(vertex => vertex.entityType === EntityType.AUTHOR);
  
  const authorCount = authorVertices.length;
  const recentAuthors = authorVertices
    .sort((a, b) => {
      const aVisited = a.lastVisited ? new Date(a.lastVisited).getTime() : 0;
      const bVisited = b.lastVisited ? new Date(b.lastVisited).getTime() : 0;
      return bVisited - aVisited;
    })
    .slice(0, 5);

  const handleSearchAuthors = () => {
    navigate({ to: '/query' });
  };

  const handleViewAuthor = (authorId: string) => {
    navigate({ to: `/authors/${authorId}` });
  };

  return (
    <Stack gap="lg" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconUsers size={28} />
            Authors Overview
          </Title>
          <Text c="dimmed" size="sm">
            Researchers, academics, and publication authors
          </Text>
        </div>
        
        <Button 
          leftSection={<IconSearch size={16} />}
          onClick={handleSearchAuthors}
        >
          Search Authors
        </Button>
      </Group>

      {/* Statistics */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between">
          <div>
            <Text size="xl" fw={700}>
              {authorCount}
            </Text>
            <Text size="sm" c="dimmed">
              Authors in your exploration graph
            </Text>
          </div>
          
          {authorCount > 0 && (
            <div>
              <Text size="sm" c="dimmed">
                Most recent visits
              </Text>
              <Text size="xs" c="dimmed">
                {recentAuthors.length} recent authors
              </Text>
            </div>
          )}
        </Group>
      </Paper>

      {/* Recent Authors */}
      {recentAuthors.length > 0 ? (
        <div>
          <Title order={4} mb="sm">Recently Explored Authors</Title>
          <Stack gap="xs">
            {recentAuthors.map((author) => (
              <Paper 
                key={author.id}
                withBorder 
                p="sm" 
                radius="md" 
                style={{ cursor: 'pointer' }}
                onClick={() => handleViewAuthor(author.id)}
              >
                <Group justify="space-between">
                  <div style={{ flex: 1 }}>
                    <Text fw={500} size="sm" lineClamp={2}>
                      {author.displayName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {author.metadata.citedByCount && `${author.metadata.citedByCount} citations`}
                      {author.visitCount && ` | Visited ${author.visitCount} times`}
                    </Text>
                  </div>
                  <Text size="xs" c="dimmed">
                    {author.lastVisited && new Date(author.lastVisited).toLocaleDateString()}
                  </Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        </div>
      ) : (
        <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
          <Stack align="center" gap="md">
            <IconUsers size={48} style={{ opacity: 0.5 }} />
            <div>
              <Text fw={500} mb="xs">No authors explored yet</Text>
              <Text size="sm" c="dimmed" mb="lg">
                Start exploring researchers and authors to see them appear here and in the collaboration network
              </Text>
              <Button 
                leftSection={<IconSearch size={16} />}
                onClick={handleSearchAuthors}
              >
                Search for Authors
              </Button>
            </div>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}