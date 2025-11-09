/**
 * EntityDataDisplay Component
 *
 * Displays all entity data in a structured, readable format using native Mantine components.
 * Handles nested objects, arrays, and various data types.
 * Renders ALL fields from the API response.
 */

import React from "react";
import {
  Anchor,
  Badge,
  Code,
  Text,
  Card,
  CardSection,
  Stack,
  Flex,
  Group,
  List,
  Table,
  TableTbody,
  TableTr,
  TableTd,
  Container,
  Title,
  Divider,
  Box
} from "@mantine/core";
import {
  IconExternalLink,
  IconLink,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconKey,
  IconChartBar,
  IconNetwork,
  IconCalendar,
  IconWorld,
  IconClipboard,
  IconFile,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { convertOpenAlexToInternalLink, isOpenAlexId } from "@/utils/openalex-link-conversion";
import { useThemeColors } from "@/hooks/use-theme-colors";

interface ThemeColors {
  background: {
    primary: string;
  };
  border: {
    secondary: string;
  };
}

interface EntityDataDisplayProps {
  data: Record<string, unknown>;
  title?: string;
}

/**
 * Recursively renders data in a structured format
 */
function renderValue(value: unknown, depth: number = 0, colors?: ThemeColors): React.ReactNode {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return <Text c="dimmed" fs="italic" size="sm">null</Text>;
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return (
      <Badge
        color={value ? "green" : "red"}
        variant="light"
        size="sm"
        leftSection={value ? <IconCheck size={12} /> : <IconX size={12} />}
      >
        {value.toString()}
      </Badge>
    );
  }

  // Handle numbers
  if (typeof value === "number") {
    return (
      <Code
        variant="light"
        color="blue"
        ff="monospace"
        fw={600}
      >
        {value.toLocaleString()}
      </Code>
    );
  }

  // Handle strings
  if (typeof value === "string") {
    // Check if it's an OpenAlex URL or ID
    const converted = convertOpenAlexToInternalLink(value);

    if (converted.isOpenAlexLink) {
      // Internal OpenAlex link
      return (
        <Group gap="xs">
        <Anchor
          component={Link}
          to={converted.internalPath}
          c="blue"
          display="inline-flex"
          style={{ wordBreak: "break-word" }}
        >
          <IconLink size={16} />
          {value}
        </Anchor>
      </Group>
      );
    }

    // Handle other URLs (external links)
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <Group gap="xs">
        <Anchor
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          display="inline-flex"
          style={{ wordBreak: "break-word" }}
        >
          <IconExternalLink size={16} />
          {value}
        </Anchor>
      </Group>
      );
    }

    // Check if it's just an OpenAlex ID (without URL)
    if (isOpenAlexId(value)) {
      const idConverted = convertOpenAlexToInternalLink(value);
      return (
        <Group gap="xs">
        <Anchor
          component={Link}
          to={idConverted.internalPath}
          c="blue"
          display="inline-flex"
          style={{ wordBreak: "break-word" }}
        >
          <IconLink size={16} />
          {value}
        </Anchor>
      </Group>
      );
    }

    return <Text>{value}</Text>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Text c="dimmed" fs="italic" size="sm">[ ]</Text>;
    }

    // For primitive arrays, show inline
    if (value.every(item => typeof item !== "object" || item === null)) {
      return (
        <Flex wrap="wrap" gap="xs">
          {value.map((item, index) => (
            <Badge
              key={index}
              variant="light"
              color="gray"
              size="sm"
            >
              {renderValue(item, depth, colors)}
            </Badge>
          ))}
        </Flex>
      );
    }

    // For object arrays, show each item
    return (
      <Stack gap="md" mt="xs">
        {value.map((item, index) => (
          <Card key={index} withBorder p="md" bg={colors?.background.primary}>
            <Group gap="sm">
              <Badge
                circle
                size="lg"
                color="blue"
              >
                {index + 1}
              </Badge>
              <Box miw={0} style={{ flex: 1 }}>
                {renderValue(item, depth + 1, colors)}
              </Box>
            </Group>
          </Card>
        ))}
      </Stack>
    );
  }

  // Handle objects
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);

    if (entries.length === 0) {
      return <Text c="dimmed" fs="italic" size="sm">{"{ }"}</Text>;
    }

    return (
      <Table>
        <TableTbody>
          {entries.map(([key, val]) => (
            <TableTr key={key}>
              <TableTd w={150} ta="left" style={{ verticalAlign: "top" }}>
                <Text size="sm" fw={600} c="blue.7">
                  {key}
                </Text>
              </TableTd>
              <TableTd>
                {renderValue(val, depth + 1, colors)}
              </TableTd>
            </TableTr>
          ))}
        </TableTbody>
      </Table>
    );
  }

  // Fallback for unknown types
  return <Text c="dimmed" fs="italic">{String(value)}</Text>;
}

/**
 * Groups fields into logical sections for better organization
 */
function groupFields(data: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const groups: Record<string, Record<string, unknown>> = {
    "Basic Information": {},
    "Identifiers": {},
    "Metrics": {},
    "Relationships": {},
    "Dates": {},
    "Locations & Geo": {},
    "Other": {},
  };

  const identifierKeys = ["id", "ids", "doi", "orcid", "issn", "ror", "mag", "openalex_id", "pmid", "pmcid"];
  const metricKeys = ["cited_by_count", "works_count", "h_index", "i10_index", "counts_by_year", "summary_stats", "fwci", "citation_normalized_percentile", "cited_by_percentile_year"];
  const relationshipKeys = ["authorships", "institutions", "concepts", "topics", "keywords", "grants", "sustainable_development_goals", "mesh", "affiliations", "last_known_institutions", "primary_location", "locations", "best_oa_location", "alternate_host_venues"];
  const dateKeys = ["created_date", "updated_date", "publication_date", "publication_year"];
  const geoKeys = ["country_code", "countries_distinct_count", "geo", "latitude", "longitude"];
  const basicKeys = ["display_name", "title", "type", "description", "homepage_url", "image_url", "thumbnail_url", "is_oa", "oa_status", "has_fulltext"];

  Object.entries(data).forEach(([key, value]) => {
    if (identifierKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Identifiers"][key] = value;
    } else if (metricKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Metrics"][key] = value;
    } else if (relationshipKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Relationships"][key] = value;
    } else if (dateKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Dates"][key] = value;
    } else if (geoKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Locations & Geo"][key] = value;
    } else if (basicKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Basic Information"][key] = value;
    } else {
      groups["Other"][key] = value;
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(groupName => {
    if (Object.keys(groups[groupName]).length === 0) {
      delete groups[groupName];
    }
  });

  return groups;
}

// Section icons mapping
const sectionIcons: Record<string, React.ReactNode> = {
  "Basic Information": <IconInfoCircle size={20} />,
  "Identifiers": <IconKey size={20} />,
  "Metrics": <IconChartBar size={20} />,
  "Relationships": <IconNetwork size={20} />,
  "Dates": <IconCalendar size={20} />,
  "Locations & Geo": <IconWorld size={20} />,
  "Other": <IconClipboard size={20} />,
};

export function EntityDataDisplay({ data, title }: EntityDataDisplayProps) {
  const { colors } = useThemeColors();
  const groups = groupFields(data);

  return (
    <Container size="100%" p={0}>
      <Stack gap="xl">
        {title && (
          <Title order={1} size="h1" fw={700} mb="md">
            {title}
          </Title>
        )}

        {Object.entries(groups).map(([groupName, groupData]) => (
          <Card key={groupName} withBorder shadow="sm">
            <CardSection
              p="md"
              bg={colors?.background.primary}
              style={{ borderBottom: `1px solid ${colors?.border.secondary}` }}
            >
              <Group gap="sm" justify="space-between">
                <Group gap="sm">
                  <Box c="blue.6">
                    {sectionIcons[groupName] || <IconFile size={20} />}
                  </Box>
                  <Text size="xl" fw={600}>
                    {groupName}
                  </Text>
                </Group>
                <Badge
                  variant="light"
                  color="gray"
                  size="sm"
                >
                  {Object.keys(groupData).length} {Object.keys(groupData).length === 1 ? "field" : "fields"}
                </Badge>
              </Group>
            </CardSection>

            <CardSection p="lg">
              <Stack gap="md">
                {Object.entries(groupData).map(([key, value]) => (
                  <Card key={key} withBorder p="md" bg={colors?.background.primary}>
                    <Stack gap="xs">
                      <Text size="md" fw={600} c="blue.6">
                        {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                      <Box ml="xs" mt={2}>
                        {renderValue(value, 0, colors)}
                      </Box>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </CardSection>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
