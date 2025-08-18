import { Stack, Title, Text, Paper, Group, Button } from '@mantine/core';
import { IconPlus, IconSearch, IconBook } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import React from 'react';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

/**
 * Overview component for the Works section showing work-related statistics and actions
 */
export function WorksOverview() {
  const navigate = useNavigate();
  const { graph } = useEntityGraphStore();

  // Get works-related statistics from the graph
  const workVertices = Array.from(graph.vertices.values())
    .filter(vertex => vertex.entityType === EntityType.WORK);
  
  const workCount = workVertices.length;
  const recentWorks = workVertices
    .sort((a, b) => {
      const aVisited = a.lastVisited ? new Date(a.lastVisited).getTime() : 0;
      const bVisited = b.lastVisited ? new Date(b.lastVisited).getTime() : 0;
      return bVisited - aVisited;
    })
    .slice(0, 5);

  const handleSearchWorks = () => {
    navigate({ to: '/query' });
  };

  const handleViewWork = (workId: string) => {
    navigate({ to: `/works/${workId}` });
  };

  return (
    <Stack gap="lg" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconBook size={28} />
            Works Overview
          </Title>
          <Text c="dimmed" size="sm">
            Academic papers, articles, and publications
          </Text>
        </div>
        
        <Button 
          leftSection={<IconSearch size={16} />}
          onClick={handleSearchWorks}
        >
          Search Works
        </Button>
      </Group>

      {/* Statistics */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between">
          <div>
            <Text size="xl" fw={700}>
              {workCount}
            </Text>
            <Text size="sm" c="dimmed">
              Works in your exploration graph
            </Text>
          </div>
          
          {workCount > 0 && (
            <div>
              <Text size="sm" c="dimmed">
                Most recent visits
              </Text>
              <Text size="xs" c="dimmed">
                {recentWorks.length} recent works
              </Text>
            </div>
          )}
        </Group>
      </Paper>

      {/* Recent Works */}
      {recentWorks.length > 0 ? (
        <div>
          <Title order={4} mb="sm">Recently Explored Works</Title>
          <Stack gap="xs">
            {recentWorks.map((work) => (
              <Paper 
                key={work.id}
                withBorder 
                p="sm" 
                radius="md" 
                style={{ cursor: 'pointer' }}
                onClick={() => handleViewWork(work.id)}
              >
                <Group justify="space-between">
                  <div style={{ flex: 1 }}>
                    <Text fw={500} size="sm" lineClamp={2}>
                      {work.displayName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {work.metadata.publicationYear && `Published ${work.metadata.publicationYear}`}
                      {work.metadata.citedByCount && ` | ${work.metadata.citedByCount} citations`}
                      {work.visitCount && ` | Visited ${work.visitCount} times`}
                    </Text>
                  </div>
                  <Text size="xs" c="dimmed">
                    {work.lastVisited && new Date(work.lastVisited).toLocaleDateString()}
                  </Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        </div>
      ) : (
        <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
          <Stack align="center" gap="md">
            <IconBook size={48} style={{ opacity: 0.5 }} />
            <div>
              <Text fw={500} mb="xs">No works explored yet</Text>
              <Text size="sm" c="dimmed" mb="lg">
                Start exploring academic works to see them appear here and in the graph visualization
              </Text>
              <Button 
                leftSection={<IconSearch size={16} />}
                onClick={handleSearchWorks}
              >
                Search for Works
              </Button>
            </div>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}