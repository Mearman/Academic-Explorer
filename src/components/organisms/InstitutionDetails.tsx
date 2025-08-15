import { Card, Group, Title, Grid, Paper, Text, Badge, Stack } from '@mantine/core';
import { IconInfoCircle, IconMapPin, IconId, IconCalendar } from '@tabler/icons-react';

import type { Institution } from '@/lib/openalex/types';

interface InstitutionDetailsProps {
  institution: Institution;
}

export function InstitutionDetails({ institution }: InstitutionDetailsProps) {
  return (
    <>
      {/* Institution Details */}
      <Card withBorder radius="md" p="xl">
        <Group mb="lg">
          <IconInfoCircle size={20} />
          <Title order={2} size="lg">Institution Details</Title>
        </Group>
        
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" bg="gray.0">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Institution Type
              </Text>
              <Badge 
                size="lg" 
                variant="light" 
                color="institution"
                radius="sm"
                tt="capitalize"
              >
                {institution.type}
              </Badge>
            </Paper>
          </Grid.Col>
          
          {institution.country_code && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Country Code
                </Text>
                <Text size="sm" fw={500}>
                  {institution.country_code}
                </Text>
              </Paper>
            </Grid.Col>
          )}
          
          {institution.ror && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  ROR Identifier
                </Text>
                <Text size="sm" fw={500} ff="mono">
                  {institution.ror}
                </Text>
              </Paper>
            </Grid.Col>
          )}
          
          {institution.type_id && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper p="md" withBorder radius="sm" bg="gray.0">
                <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  Type ID
                </Text>
                <Text size="sm" fw={500} ff="mono">
                  {institution.type_id}
                </Text>
              </Paper>
            </Grid.Col>
          )}
        </Grid>
      </Card>

      {/* Geographic Information */}
      {institution.geo && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconMapPin size={20} />
            <Title order={2} size="lg">Geographic Information</Title>
          </Group>
          
          <Grid>
            {institution.geo.city && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="blue.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    City
                  </Text>
                  <Text size="sm" fw={500}>
                    {institution.geo.city}
                  </Text>
                </Paper>
              </Grid.Col>
            )}
            
            {institution.geo.region && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="blue.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Region
                  </Text>
                  <Text size="sm" fw={500}>
                    {institution.geo.region}
                  </Text>
                </Paper>
              </Grid.Col>
            )}
            
            {institution.geo.country && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="blue.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Country
                  </Text>
                  <Text size="sm" fw={500}>
                    {institution.geo.country}
                  </Text>
                </Paper>
              </Grid.Col>
            )}
            
            {institution.geo.latitude && institution.geo.longitude && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="blue.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    Coordinates
                  </Text>
                  <Text size="sm" fw={500} ff="mono">
                    {institution.geo.latitude.toFixed(4)}, {institution.geo.longitude.toFixed(4)}
                  </Text>
                </Paper>
              </Grid.Col>
            )}
            
            {institution.geo.geonames_city_id && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder radius="sm" bg="blue.0">
                  <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                    GeoNames City ID
                  </Text>
                  <Text size="sm" fw={500} ff="mono">
                    {institution.geo.geonames_city_id}
                  </Text>
                </Paper>
              </Grid.Col>
            )}
          </Grid>
        </Card>
      )}

      {/* Alternative Names & Acronyms */}
      {((institution.display_name_alternatives?.length ?? 0) > 0 || (institution.display_name_acronyms?.length ?? 0) > 0) && (
        <Card withBorder radius="md" p="xl">
          <Group mb="lg">
            <IconId size={20} />
            <Title order={2} size="lg">Alternative Names & Acronyms</Title>
          </Group>
          
          <Stack gap="md">
            {institution.display_name_alternatives && institution.display_name_alternatives.length > 0 && (
              <div>
                <Text size="sm" fw={600} mb="xs" c="dimmed">
                  Alternative Names
                </Text>
                <Group gap="xs">
                  {institution.display_name_alternatives.map((name, index) => (
                    <Badge key={index} variant="outline" size="md" radius="sm">
                      {name}
                    </Badge>
                  ))}
                </Group>
              </div>
            )}
            
            {institution.display_name_acronyms && institution.display_name_acronyms.length > 0 && (
              <div>
                <Text size="sm" fw={600} mb="xs" c="dimmed">
                  Acronyms
                </Text>
                <Group gap="xs">
                  {institution.display_name_acronyms.map((acronym, index) => (
                    <Badge key={index} variant="filled" size="md" radius="sm">
                      {acronym}
                    </Badge>
                  ))}
                </Group>
              </div>
            )}
          </Stack>
        </Card>
      )}

      {/* Temporal Information */}
      <Card withBorder radius="md" p="xl">
        <Group mb="lg">
          <IconCalendar size={20} />
          <Title order={2} size="lg">Temporal Information</Title>
        </Group>
        
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" bg="gray.0">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Created Date
              </Text>
              <Text size="sm" fw={500}>
                {new Date(institution.created_date).toLocaleDateString()}
              </Text>
            </Paper>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" withBorder radius="sm" bg="gray.0">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="xs">
                Updated Date
              </Text>
              <Text size="sm" fw={500}>
                {new Date(institution.updated_date).toLocaleDateString()}
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Card>
    </>
  );
}