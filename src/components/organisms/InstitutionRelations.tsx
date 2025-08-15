import { Card, Group, Title, Stack, Paper, Text, Badge, List } from '@mantine/core';
import { IconBuildingBank, IconBooks, IconTags } from '@tabler/icons-react';

import type { Institution } from '@/lib/openalex/types';

interface InstitutionRelationsProps {
  institution: Institution;
}

export function InstitutionRelations({ institution }: InstitutionRelationsProps) {
  return (
    <>
      {/* Associated Institutions */}
      {institution.associated_institutions && institution.associated_institutions.length > 0 && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconBuildingBank size={20} />
            <Title order={2} size="lg">Associated Institutions</Title>
          </Group>
          
          <Stack gap="sm">
            {institution.associated_institutions.map((assocInst, index) => (
              <Paper key={index} p="md" withBorder radius="sm" bg="orange.0">
                <Group justify="space-between" align="flex-start">
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {assocInst.display_name}
                    </Text>
                    <Group gap="xs">
                      <Badge size="sm" variant="outline">
                        {assocInst.relationship}
                      </Badge>
                      {assocInst.country_code && (
                        <Badge size="sm" variant="light">
                          {assocInst.country_code}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                  {assocInst.ror && (
                    <Text size="xs" c="dimmed" ff="mono">
                      {assocInst.ror}
                    </Text>
                  )}
                </Group>
              </Paper>
            ))}
          </Stack>
        </Card>
      )}

      {/* Repositories */}
      {institution.repositories && institution.repositories.length > 0 && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconBooks size={20} />
            <Title order={2} size="lg">Repositories</Title>
          </Group>
          
          <List spacing="sm" size="sm" center>
            {institution.repositories.map((repo, index) => (
              <List.Item key={index}>
                <Text ff="mono" size="sm">{repo}</Text>
              </List.Item>
            ))}
          </List>
        </Card>
      )}

      {/* Research Topics */}
      {institution.topics && institution.topics.length > 0 && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconTags size={20} />
            <Title order={2} size="lg">Research Topics</Title>
          </Group>
          
          <Group gap="sm">
            {institution.topics.map((topic) => (
              <Badge
                key={topic.id}
                variant="light"
                size="md"
                radius="sm"
                color="institution"
              >
                {topic.display_name}
              </Badge>
            ))}
          </Group>
        </Card>
      )}
    </>
  );
}