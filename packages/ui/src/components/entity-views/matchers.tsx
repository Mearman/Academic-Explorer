/**
 * Matchers for detecting and rendering specific data structures in OpenAlex entities
 */

import React from "react";
import {
  Badge,
  Group,
  Table,
  Text,
  Card,
  Stack,
  Box,
  Anchor,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import { IconCopy, IconExternalLink } from "@tabler/icons-react";

export interface ArrayMatcher {
  name: string;
  detect: (array: any[]) => boolean;
  render: (array: any[], fieldName: string) => React.ReactNode;
  priority?: number; // Higher priority matchers are checked first
}

export interface ObjectMatcher {
  name: string;
  detect: (obj: any) => boolean;
  render: (obj: any, fieldName: string) => React.ReactNode;
  priority?: number;
}

export interface ValueMatcher {
  name: string;
  detect: (value: any) => boolean;
  render: (value: any, fieldName: string) => React.ReactNode;
  priority?: number;
}

/**
 * Array Matchers - for detecting specific array structures
 */
export const arrayMatchers: ArrayMatcher[] = [
  // Author array matcher (from works.authorships)
  {
    name: "authors",
    priority: 10,
    detect: (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "author" in first &&
        "author_position" in first &&
        typeof first.author === "object" &&
        first.author?.display_name
      );
    },
    render: (array: any[], fieldName: string) => (
      <Group gap="xs" wrap="wrap">
        {array.slice(0, 10).map((authorship: any, index: number) => {
          const { author } = authorship;
          const position = authorship.author_position;
          const positionLabel =
            position === "first"
              ? " (First)"
              : position === "last"
                ? " (Last)"
                : "";

          return (
            <Badge
              key={index}
              variant="outline"
              size="sm"
              style={{ cursor: "pointer" }}
              onClick={() => {
                // Could navigate to author page
                console.log("Navigate to author:", author.id);
              }}
            >
              {author.display_name}
              {positionLabel}
            </Badge>
          );
        })}
        {array.length > 10 && (
          <Badge variant="outline" size="sm">
            +{array.length - 10} more
          </Badge>
        )}
      </Group>
    ),
  },

  // Institution array matcher (from authors.last_known_institutions)
  {
    name: "institutions",
    priority: 9,
    detect: (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "display_name" in first &&
        "country_code" in first
      );
    },
    render: (array: any[], fieldName: string) => (
      <Stack gap="xs">
        {array.slice(0, 5).map((institution: any, index: number) => (
          <Group key={index} justify="space-between" wrap="nowrap">
            <Text size="sm" style={{ flex: 1 }}>
              {institution.display_name}
            </Text>
            {institution.country_code && (
              <Badge size="sm" variant="outline">
                {institution.country_code.toUpperCase()}
              </Badge>
            )}
          </Group>
        ))}
        {array.length > 5 && (
          <Text size="sm" c="dimmed">
            +{array.length - 5} more institutions
          </Text>
        )}
      </Stack>
    ),
  },

  // Topic array matcher (from authors.topics or works.topics)
  {
    name: "topics",
    priority: 8,
    detect: (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "display_name" in first &&
        "count" in first
      );
    },
    render: (array: any[], fieldName: string) => (
      <Group gap="xs" wrap="wrap">
        {array.slice(0, 8).map((topic: any, index: number) => (
          <Badge
            key={index}
            variant="dot"
            size="sm"
            color={getTopicColor(topic)}
          >
            {topic.display_name} ({topic.count})
          </Badge>
        ))}
        {array.length > 8 && (
          <Badge variant="outline" size="sm">
            +{array.length - 8} more
          </Badge>
        )}
      </Group>
    ),
  },

  // Citation history matcher (counts_by_year)
  {
    name: "citation-history",
    priority: 10,
    detect: (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "year" in first &&
        "cited_by_count" in first
      );
    },
    render: (array: any[], fieldName: string) => (
      <Box style={{ maxHeight: "300px", overflow: "auto" }}>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Year</Table.Th>
              <Table.Th>Citations</Table.Th>
              <Table.Th>Works</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {array
              .sort((a, b) => b.year - a.year)
              .slice(0, 10)
              .map((count: any) => (
                <Table.Tr key={count.year}>
                  <Table.Td>{count.year}</Table.Td>
                  <Table.Td>{count.cited_by_count || 0}</Table.Td>
                  <Table.Td>{count.works_count || 0}</Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
        {array.length > 10 && (
          <Text size="sm" c="dimmed" mt="xs">
            Showing 10 most recent years of {array.length} total
          </Text>
        )}
      </Box>
    ),
  },

  // Concept array matcher (x_concepts)
  {
    name: "concepts",
    priority: 7,
    detect: (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "display_name" in first &&
        "level" in first &&
        "score" in first
      );
    },
    render: (array: any[], fieldName: string) => (
      <Group gap="xs" wrap="wrap">
        {array
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map((concept: any, index: number) => (
            <Badge
              key={index}
              variant="light"
              size="sm"
              color={getConceptColor(concept.level)}
            >
              {concept.display_name} ({(concept.score * 100).toFixed(0)}%)
            </Badge>
          ))}
        {array.length > 6 && (
          <Badge variant="outline" size="sm">
            +{array.length - 6} more
          </Badge>
        )}
      </Group>
    ),
  },

  // Affiliation array matcher (from authors.affiliations)
  {
    name: "affiliations",
    priority: 6,
    detect: (array: any[]) => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "institution" in first &&
        "years" in first
      );
    },
    render: (array: any[], fieldName: string) => (
      <Stack gap="xs">
        {array.slice(0, 3).map((affiliation: any, index: number) => (
          <Card key={index} padding="xs" radius="sm" withBorder>
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" style={{ flex: 1 }}>
                {affiliation.institution?.display_name}
              </Text>
              <Badge size="sm" variant="outline">
                {affiliation.years?.join("-") || "Unknown"}
              </Badge>
            </Group>
          </Card>
        ))}
        {array.length > 3 && (
          <Text size="sm" c="dimmed">
            +{array.length - 3} more affiliations
          </Text>
        )}
      </Stack>
    ),
  },
];

/**
 * Object Matchers - for detecting specific object structures
 */
export const objectMatchers: ObjectMatcher[] = [
  // ID object matcher (ids: { openalex, orcid, doi, etc. })
  {
    name: "id-object",
    priority: 10,
    detect: (obj: any) => {
      if (typeof obj !== "object" || obj === null) return false;

      const keys = Object.keys(obj);
      return keys.some(
        (key) =>
          key === "openalex" ||
          key === "orcid" ||
          key === "doi" ||
          key === "ror" ||
          key === "issn" ||
          key === "scopus",
      );
    },
    render: (obj: any, fieldName: string) => (
      <Group gap="xs" wrap="wrap">
        {Object.entries(obj).map(([key, value]: [string, any]) => {
          if (!value) return null;

          const displayKey = key.toUpperCase();
          const isSpecialId = key === "orcid" || key === "doi" || key === "ror";

          return (
            <Group key={key} gap="xs" wrap="nowrap">
              <Badge
                variant={isSpecialId ? "filled" : "light"}
                size="sm"
                color={getIdColor(key)}
              >
                {displayKey}: {value}
              </Badge>
              <Tooltip label="Copy to clipboard">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => navigator.clipboard.writeText(value)}
                >
                  <IconCopy size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        })}
      </Group>
    ),
  },

  // Summary stats matcher (h_index, i10_index, etc.)
  {
    name: "summary-stats",
    priority: 9,
    detect: (obj: any) => {
      if (typeof obj !== "object" || obj === null) return false;

      return (
        "h_index" in obj || "i10_index" in obj || "2yr_mean_citedness" in obj
      );
    },
    render: (obj: any, fieldName: string) => (
      <Group gap="md">
        {obj.h_index !== undefined && (
          <Badge color="purple" variant="light" size="lg">
            H-index: {obj.h_index}
          </Badge>
        )}
        {obj.i10_index !== undefined && (
          <Badge color="purple" variant="light" size="lg">
            i10-index: {obj.i10_index}
          </Badge>
        )}
        {obj["2yr_mean_citedness"] !== undefined && (
          <Badge color="purple" variant="light" size="lg">
            2yr Mean Citedness: {obj["2yr_mean_citedness"].toFixed(2)}
          </Badge>
        )}
      </Group>
    ),
  },

  // Geographic data matcher
  {
    name: "geo-data",
    priority: 8,
    detect: (obj: any) => {
      if (typeof obj !== "object" || obj === null) return false;

      return "city" in obj || "country_code" in obj || "latitude" in obj;
    },
    render: (obj: any, fieldName: string) => (
      <Group gap="md">
        {obj.city && (
          <Text size="sm">
            <strong>City:</strong> {obj.city}
          </Text>
        )}
        {obj.country_code && (
          <Text size="sm">
            <strong>Country:</strong> {obj.country_code.toUpperCase()}
          </Text>
        )}
        {obj.latitude && obj.longitude && (
          <Text size="sm">
            <strong>Coordinates:</strong> {obj.latitude.toFixed(4)},{" "}
            {obj.longitude.toFixed(4)}
          </Text>
        )}
      </Group>
    ),
  },
];

/**
 * Value Matchers - for detecting special value types
 */
export const valueMatchers: ValueMatcher[] = [
  // DOI matcher
  {
    name: "doi",
    priority: 10,
    detect: (value: any) => {
      if (typeof value !== "string") return false;
      return /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i.test(value);
    },
    render: (value: any, fieldName: string) => (
      <Group gap="xs" wrap="nowrap">
        <Badge color="blue" variant="light">
          DOI: {value}
        </Badge>
        <Tooltip label="Open in DOI resolver">
          <ActionIcon
            size="sm"
            variant="subtle"
            component="a"
            href={`https://doi.org/${value}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconExternalLink size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    ),
  },

  // ORCID matcher
  {
    name: "orcid",
    priority: 9,
    detect: (value: any) => {
      if (typeof value !== "string") return false;
      return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(value);
    },
    render: (value: any, fieldName: string) => (
      <Group gap="xs" wrap="nowrap">
        <Badge color="green" variant="light">
          ORCID: {value}
        </Badge>
        <Tooltip label="Open in ORCID">
          <ActionIcon
            size="sm"
            variant="subtle"
            component="a"
            href={`https://orcid.org/${value}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconExternalLink size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    ),
  },

  // ROR matcher
  {
    name: "ror",
    priority: 8,
    detect: (value: any) => {
      if (typeof value !== "string") return false;
      return /^0[a-zA-Z0-9]{8}$/.test(value);
    },
    render: (value: any, fieldName: string) => (
      <Group gap="xs" wrap="nowrap">
        <Badge color="orange" variant="light">
          ROR: {value}
        </Badge>
        <Tooltip label="Open in ROR">
          <ActionIcon
            size="sm"
            variant="subtle"
            component="a"
            href={`https://ror.org/${value}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconExternalLink size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    ),
  },

  // URL matcher
  {
    name: "url",
    priority: 7,
    detect: (value: any) => {
      if (typeof value !== "string") return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    render: (value: any, fieldName: string) => (
      <Anchor href={value} target="_blank" rel="noopener noreferrer" size="sm">
        {value}
      </Anchor>
    ),
  },

  // ISSN matcher
  {
    name: "issn",
    priority: 6,
    detect: (value: any) => {
      if (typeof value !== "string") return false;
      return /^\d{4}-\d{3}[\dX]$/.test(value);
    },
    render: (value: any, fieldName: string) => (
      <Badge color="teal" variant="light">
        ISSN: {value}
      </Badge>
    ),
  },
];

/**
 * Helper functions for styling
 */
function getTopicColor(topic: any): string {
  const colors = ["blue", "green", "orange", "red", "purple", "cyan"];
  const score = topic.count || 0;
  return colors[Math.min(Math.floor(score / 10), colors.length - 1)];
}

function getConceptColor(level: number): string {
  const colors = ["gray", "blue", "green", "orange", "red"];
  return colors[Math.min(level, colors.length - 1)];
}

function getIdColor(key: string): string {
  const colorMap: Record<string, string> = {
    openalex: "blue",
    orcid: "green",
    doi: "purple",
    ror: "orange",
    issn: "teal",
    scopus: "red",
    mag: "gray",
    wikipedia: "blue",
    wikidata: "blue",
  };
  return colorMap[key] || "gray";
}

/**
 * Find the best matcher for a given value
 */
export function findArrayMatcher(array: any[]): ArrayMatcher | null {
  const sortedMatchers = arrayMatchers.sort(
    (a, b) => (b.priority || 0) - (a.priority || 0),
  );

  for (const matcher of sortedMatchers) {
    if (matcher.detect(array)) {
      return matcher;
    }
  }
  return null;
}

export function findObjectMatcher(obj: any): ObjectMatcher | null {
  const sortedMatchers = objectMatchers.sort(
    (a, b) => (b.priority || 0) - (a.priority || 0),
  );

  for (const matcher of sortedMatchers) {
    if (matcher.detect(obj)) {
      return matcher;
    }
  }
  return null;
}

export function findValueMatcher(value: any): ValueMatcher | null {
  const sortedMatchers = valueMatchers.sort(
    (a, b) => (b.priority || 0) - (a.priority || 0),
  );

  for (const matcher of sortedMatchers) {
    if (matcher.detect(value)) {
      return matcher;
    }
  }
  return null;
}
