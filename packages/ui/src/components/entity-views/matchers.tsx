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
  Anchor,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import { IconCopy, IconExternalLink } from "@tabler/icons-react";
import { validateExternalId } from "@academic-explorer/client/utils/id-resolver";

interface TopicShareItem {
  id: string;
  display_name: string;
  value: number;
  subfield: {
    display_name: string;
  };
  field: {
    display_name: string;
  };
  domain: {
    display_name: string;
  };
}

interface AuthorItem {
  author: {
    display_name: string;
    id: string;
  };
  author_position: string;
}

interface InstitutionItem {
  display_name: string;
  country_code: string;
}

interface TopicItem {
  display_name: string;
  count: number;
}

interface CitationHistoryItem {
  year: number;
  cited_by_count: number;
  works_count: number;
}

interface ConceptItem {
  display_name: string;
  level: number;
  score: number;
}

interface AffiliationItem {
  institution: {
    display_name: string;
  };
  years: number[];
}

export interface ArrayMatcher {
  name: string;
  detect: (array: unknown[]) => boolean;
  render: (array: unknown[], fieldName: string) => React.ReactNode;
  priority?: number; // Higher priority matchers are checked first
}

export interface ObjectMatcher {
  name: string;
  detect: (obj: unknown) => boolean;
  render: (obj: unknown, fieldName: string) => React.ReactNode;
  priority?: number;
}

export interface ValueMatcher {
  name: string;
  detect: (value: unknown) => boolean;
  render: (value: unknown, fieldName: string) => React.ReactNode;
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
    detect: (array: unknown[]): boolean => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0] as Record<string, unknown>;
      return (
        typeof first === "object" &&
        first !== null &&
        "author" in first &&
        "author_position" in first &&
        typeof first.author === "object" &&
        first.author !== null &&
        (first.author as Record<string, unknown>).display_name !== undefined
      );
    },
    render: (array: unknown[], _fieldName: string): React.ReactNode => {
      const authorArray = array as AuthorItem[];
      return (
        <Group gap="xs" wrap="wrap">
          {authorArray.slice(0, 10).map((authorship, index) => {
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
                  // TODO: Implement navigation to author page
                }}
              >
                {author.display_name}
                {positionLabel}
              </Badge>
            );
          })}
          {authorArray.length > 10 && (
            <Badge variant="outline" size="sm">
              +{authorArray.length - 10} more
            </Badge>
          )}
        </Group>
      );
    },
  },

  // Institution array matcher (from authors.last_known_institutions)
  {
    name: "institutions",
    priority: 9,
    detect: (array: unknown[]): boolean => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "display_name" in first &&
        "country_code" in first
      );
    },
    render: (array: unknown[], _fieldName: string): React.ReactNode => {
      const institutionArray = array as InstitutionItem[];
      return (
        <Stack gap="xs">
          {institutionArray.slice(0, 5).map((institution, index) => (
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
          {institutionArray.length > 5 && (
            <Text size="sm" c="dimmed">
              +{institutionArray.length - 5} more institutions
            </Text>
          )}
        </Stack>
      );
    },
  },

  // Topic array matcher (from authors.topics or works.topics)
  {
    name: "topics",
    priority: 8,
    detect: (array: unknown[]): boolean => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "display_name" in first &&
        "count" in first
      );
    },
    render: (array: unknown[], _fieldName: string): React.ReactNode => {
      const topicArray = array as TopicItem[];
      return (
        <Group gap="xs" wrap="wrap">
          {topicArray.map((topic, index) => (
            <Badge
              key={index}
              variant="dot"
              size="sm"
              color={getTopicColor(topic)}
            >
              {topic.display_name} ({topic.count})
            </Badge>
          ))}
        </Group>
      );
    },
  },

  // Topic share array matcher (topic_share with hierarchical data)
  {
    name: "topic-share",
    priority: 9,
    detect: (array: unknown[]): boolean => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "id" in first &&
        "display_name" in first &&
        "value" in first &&
        "subfield" in first &&
        "field" in first &&
        "domain" in first
      );
    },
    render: (array: unknown[], _fieldName: string): React.ReactNode => {
      const topicArray = array as TopicShareItem[];
      return (
        <>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Topic</Table.Th>
                <Table.Th>Share</Table.Th>
                <Table.Th>Subfield</Table.Th>
                <Table.Th>Field</Table.Th>
                <Table.Th>Domain</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {topicArray
                .sort((a, b) => (b.value || 0) - (a.value || 0))
                .slice(0, 15)
                .map((topic, index) => (
                  <Table.Tr key={topic.id || index}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {topic.display_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="blue" size="sm">
                        {(topic.value * 1_000_000).toFixed()}%
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {topic.subfield?.display_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {topic.field?.display_name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {topic.domain?.display_name}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
          {topicArray.length > 15 && (
            <Text size="sm" c="dimmed" mt="xs">
              Showing top 15 topics by share of {topicArray.length} total
            </Text>
          )}
        </>
      );
    },
  },

  // Citation history matcher (counts_by_year)
  {
    name: "citation-history",
    priority: 10,
    detect: (array: unknown[]): boolean => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "year" in first &&
        "cited_by_count" in first
      );
    },
    render: (array: unknown[], _fieldName: string): React.ReactNode => {
      const citationArray = array as CitationHistoryItem[];
      return (
        <>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Year</Table.Th>
                <Table.Th>Citations</Table.Th>
                <Table.Th>Works</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {citationArray
                .sort((a, b) => b.year - a.year)
                .slice(0, 10)
                .map((count) => (
                  <Table.Tr key={count.year}>
                    <Table.Td>{count.year}</Table.Td>
                    <Table.Td>{count.cited_by_count || 0}</Table.Td>
                    <Table.Td>{count.works_count || 0}</Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
          {citationArray.length > 10 && (
            <Text size="sm" c="dimmed" mt="xs">
              Showing 10 most recent years of {citationArray.length} total
            </Text>
          )}
        </>
      );
    },
  },

  // Concept array matcher (x_concepts)
  {
    name: "concepts",
    priority: 7,
    detect: (array: unknown[]): boolean => {
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
    render: (array: unknown[], _fieldName: string): React.ReactNode => {
      const conceptArray = array as ConceptItem[];
      return (
        <Group gap="xs" wrap="wrap">
          {conceptArray
            .sort((a, b) => b.score - a.score)
            .map((concept, index) => (
              <Badge
                key={index}
                variant="light"
                size="sm"
                color={getConceptColor(concept.level)}
              >
                {concept.display_name} ({concept.score.toFixed(0)}%)
              </Badge>
            ))}
        </Group>
      );
    },
  },

  // Affiliation array matcher (from authors.affiliations)
  {
    name: "affiliations",
    priority: 6,
    detect: (array: unknown[]): boolean => {
      if (!Array.isArray(array) || array.length === 0) return false;

      const first = array[0];
      return (
        typeof first === "object" &&
        first !== null &&
        "institution" in first &&
        "years" in first
      );
    },
    render: (array: unknown[], _fieldName: string): React.ReactNode => {
      const affiliationArray = array as AffiliationItem[];
      return (
        <Stack gap="xs">
          {affiliationArray.slice(0, 3).map((affiliation, index) => (
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
          {affiliationArray.length > 3 && (
            <Text size="sm" c="dimmed">
              +{affiliationArray.length - 3} more affiliations
            </Text>
          )}
        </Stack>
      );
    },
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
    detect: (obj: unknown): boolean => {
      if (typeof obj !== "object" || obj === null) return false;

      const keys = Object.keys(obj as Record<string, unknown>);
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
    render: (obj: unknown, _fieldName: string): React.ReactNode => {
      const idObj = obj as Record<string, string>;
      return (
        <Group gap="xs" wrap="wrap">
          {Object.entries(idObj).map(([key, value]) => {
            if (!value) return null;

            const displayKey = key.toUpperCase();
            const isSpecialId =
              key === "orcid" || key === "doi" || key === "ror";

            // Check if this is an OpenAlex ID that should be linked
            const validation = validateExternalId(value);
            let relativeUrl: string | null = null;

            if (validation.isValid) {
              if (validation.type === "openalex") {
                relativeUrl = convertToRelativeUrl(
                  `https://openalex.org/${value}`,
                );
              } else if (validation.type === "ror") {
                // For ROR IDs, we can't easily resolve to OpenAlex institution IDs
                // in the UI layer, so we'll link to external ROR page for now
                relativeUrl = null;
              }
            }

            return (
              <Group key={key} gap="xs" wrap="nowrap">
                {relativeUrl ? (
                  <Anchor
                    href={relativeUrl}
                    style={{ textDecoration: "none" }}
                    aria-label={`Navigate to ${key} ${value}`}
                  >
                    <Badge
                      variant={isSpecialId ? "filled" : "light"}
                      size="sm"
                      color={getIdColor(key)}
                    >
                      {displayKey}: {value}
                    </Badge>
                  </Anchor>
                ) : (
                  <Badge
                    variant={isSpecialId ? "filled" : "light"}
                    size="sm"
                    color={getIdColor(key)}
                  >
                    {displayKey}: {value}
                  </Badge>
                )}
                <Tooltip label="Copy to clipboard">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => navigator.clipboard.writeText(value)}
                    aria-label={`Copy ${key} ${value} to clipboard`}
                  >
                    <IconCopy size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            );
          })}
        </Group>
      );
    },
  },

  // Summary stats matcher (h_index, i10_index, etc.)
  {
    name: "summary-stats",
    priority: 9,
    detect: (obj: unknown): boolean => {
      if (typeof obj !== "object" || obj === null) return false;

      const objKeys = obj as Record<string, unknown>;
      return (
        "h_index" in objKeys ||
        "i10_index" in objKeys ||
        "2yr_mean_citedness" in objKeys
      );
    },
    render: (obj: unknown, _fieldName: string): React.ReactNode => {
      const statsObj = obj as Record<string, number>;
      return (
        <Group gap="md">
          {statsObj.h_index !== undefined && (
            <Badge color="purple" variant="light" size="lg">
              H-index: {statsObj.h_index}
            </Badge>
          )}
          {statsObj.i10_index !== undefined && (
            <Badge color="purple" variant="light" size="lg">
              i10-index: {statsObj.i10_index}
            </Badge>
          )}
          {statsObj["2yr_mean_citedness"] !== undefined && (
            <Badge color="purple" variant="light" size="lg">
              2yr Mean Citedness: {statsObj["2yr_mean_citedness"].toFixed(2)}
            </Badge>
          )}
        </Group>
      );
    },
  },

  // Geographic data matcher
  {
    name: "geo-data",
    priority: 8,
    detect: (obj: unknown): boolean => {
      if (typeof obj !== "object" || obj === null) return false;

      const objKeys = obj as Record<string, unknown>;
      return (
        "city" in objKeys || "country_code" in objKeys || "latitude" in objKeys
      );
    },
    render: (obj: unknown, _fieldName: string): React.ReactNode => {
      const geoObj = obj as Record<string, string | number>;
      return (
        <Group gap="md">
          {geoObj.city && (
            <Text size="sm">
              <strong>City:</strong> {geoObj.city}
            </Text>
          )}
          {geoObj.country_code && (
            <Text size="sm">
              <strong>Country:</strong>{" "}
              {geoObj.country_code.toString().toUpperCase()}
            </Text>
          )}
          {geoObj.latitude && geoObj.longitude && (
            <Text size="sm">
              <strong>Coordinates:</strong> {Number(geoObj.latitude).toFixed(4)}
              , {Number(geoObj.longitude).toFixed(4)}
            </Text>
          )}
        </Group>
      );
    },
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
    detect: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i.test(value);
    },
    render: (value: unknown, _fieldName: string): React.ReactNode => {
      const doiValue = value as string;
      return (
        <Group gap="xs" wrap="nowrap">
          <Badge color="blue" variant="light">
            DOI: {doiValue}
          </Badge>
          <Tooltip label="Open in DOI resolver">
            <ActionIcon
              size="sm"
              variant="subtle"
              component="a"
              href={`https://doi.org/${doiValue}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open DOI ${doiValue} in external resolver`}
            >
              <IconExternalLink size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );
    },
  },

  // ORCID matcher
  {
    name: "orcid",
    priority: 9,
    detect: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(value);
    },
    render: (value: unknown, _fieldName: string): React.ReactNode => {
      const orcidValue = value as string;
      return (
        <Group gap="xs" wrap="nowrap">
          <Badge color="green" variant="light">
            ORCID: {orcidValue}
          </Badge>
          <Tooltip label="Open in ORCID">
            <ActionIcon
              size="sm"
              variant="subtle"
              component="a"
              href={`https://orcid.org/${orcidValue}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ORCID ${orcidValue} in external profile`}
            >
              <IconExternalLink size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );
    },
  },

  // ROR matcher
  {
    name: "ror",
    priority: 8,
    detect: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return /^0[a-zA-Z0-9]{8}$/.test(value);
    },
    render: (value: unknown, _fieldName: string): React.ReactNode => {
      const rorValue = value as string;
      return (
        <Group gap="xs" wrap="nowrap">
          <Badge color="orange" variant="light">
            ROR: {rorValue}
          </Badge>
          <Tooltip label="Open in ROR">
            <ActionIcon
              size="sm"
              variant="subtle"
              component="a"
              href={`https://ror.org/${rorValue}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ROR ${rorValue} in external registry`}
            >
              <IconExternalLink size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );
    },
  },

  // URL matcher
  {
    name: "url",
    priority: 7,
    detect: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    render: (value: unknown, _fieldName: string): React.ReactNode => {
      const urlValue = value as string;
      const relativeUrl = convertToRelativeUrl(urlValue);

      if (relativeUrl) {
        // Use relative URL for OpenAlex links
        return (
          <Anchor href={relativeUrl} size="sm">
            {urlValue}
          </Anchor>
        );
      } else {
        // Use external link for other URLs
        return (
          <Anchor
            href={urlValue}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            {urlValue}
          </Anchor>
        );
      }
    },
  },

  // ISSN matcher
  {
    name: "issn",
    priority: 6,
    detect: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return /^\d{4}-\d{3}[\dX]$/.test(value);
    },
    render: (value: unknown, _fieldName: string): React.ReactNode => {
      const issnValue = value as string;
      return (
        <Badge color="teal" variant="light">
          ISSN: {issnValue}
        </Badge>
      );
    },
  },
];

/**
 * URL conversion utilities for OpenAlex links using existing canonical route logic
 */
export function convertToRelativeUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Convert OpenAlex API URLs to relative paths
    if (urlObj.hostname === "api.openalex.org") {
      const path = urlObj.pathname.substring(1); // Remove leading slash
      const { search } = urlObj;
      // For API URLs, preserve the full path with query parameters
      return `./${path}${search}`;
    }

    // Convert OpenAlex entity URLs to relative paths
    if (urlObj.hostname === "openalex.org") {
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length === 1) {
        const fullPath = pathParts[0];
        return determineCanonicalRoute(fullPath);
      }
    }

    // For ROR URLs, we need special handling - they should link to institutions
    // But we can't resolve ROR to OpenAlex ID here, so we'll handle this in the matcher
    if (urlObj.hostname === "ror.org") {
      return null; // Will be handled specially in the matcher
    }

    return null; // Not an OpenAlex URL
  } catch {
    return null; // Invalid URL
  }
}

export function isOpenAlexUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === "api.openalex.org" ||
      urlObj.hostname === "openalex.org" ||
      urlObj.hostname === "ror.org"
    );
  } catch {
    return false;
  }
}

/**
 * Determine the canonical relative route for a given path (adapted from redirect-test-utils)
 */
export function determineCanonicalRoute(path: string): string {
  // Handle paths that start with entity type (e.g., "works?filter=...")
  if (path.includes("?")) {
    const [entityType] = path.split("?");
    return `./${entityType}`;
  }

  // Handle entity paths (e.g., "W123456789", "works/W123456789")
  const pathSegments = path.split("/");
  if (pathSegments.length === 1) {
    // Single segment like "W123456789" - extract entity type from first character
    const entityId = pathSegments[0];
    const entityType = getEntityTypeFromId(entityId);
    return `./${entityType}/${entityId}`;
  } else if (pathSegments.length >= 2) {
    // Multi-segment path like "works/W123456789"
    const entityType = pathSegments[0];
    const entityId = pathSegments[1].split("?")[0]; // Remove query params for entity routes
    return `./${entityType}/${entityId}`;
  }

  return `./${path}`;
}

/**
 * Extract entity type from OpenAlex ID prefix
 */
function getEntityTypeFromId(id: string): string {
  const firstChar = id.charAt(0).toLowerCase();
  switch (firstChar) {
    case "w":
      return "works";
    case "a":
      return "authors";
    case "i":
      return "institutions";
    case "s":
      return "sources";
    case "t":
      return "topics";
    case "p":
      return "publishers";
    case "f":
      return "funders";
    default:
      return "works"; // fallback
  }
}

/**
 * Helper functions for styling
 */
function getTopicColor(topic: TopicItem): string {
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
export function findArrayMatcher(array: unknown[]): ArrayMatcher | null {
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

export function findObjectMatcher(obj: unknown): ObjectMatcher | null {
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

export function findValueMatcher(value: unknown): ValueMatcher | null {
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
