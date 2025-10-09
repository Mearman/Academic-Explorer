/**
 * Matchers for detecting and rendering specific data structures in OpenAlex entities
 */

import { validateExternalId } from "@academic-explorer/client";
import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Group,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconCopy, IconExternalLink } from "@tabler/icons-react";
import React from "react";

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
  id?: string;
  display_name: string;
  country_code: string;
}

interface TopicItem {
  id?: string;
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
    id?: string;
    display_name: string;
  };
  years: number[];
}

export interface ArrayMatcher {
  name: string;
  detect: (array: unknown[]) => boolean;
  render: (
    array: unknown[],
    fieldName: string,
    onNavigate?: (path: string) => void,
  ) => React.ReactNode;
  priority?: number; // Higher priority matchers are checked first
}

export interface ObjectMatcher {
  name: string;
  detect: (obj: unknown) => boolean;
  render: (
    obj: unknown,
    fieldName: string,
    onNavigate?: (path: string) => void,
  ) => React.ReactNode;
  priority?: number;
}

export interface ValueMatcher {
  name: string;
  detect: (value: unknown) => boolean;
  render: (
    value: unknown,
    fieldName: string,
    onNavigate?: (path: string) => void,
  ) => React.ReactNode;
  priority?: number;
}

const authorMatcher: ArrayMatcher = {
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
  render: (
    array: unknown[],
    _fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const authorArray = array as AuthorItem[];
    return (
      <Group gap="xs" wrap="wrap">
        {authorArray.map((authorship, index) => {
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
                if (onNavigate && author.id && author.id.startsWith("A")) {
                  onNavigate(`/authors/${author.id}`);
                }
              }}
            >
              {author.display_name}
              {positionLabel}
            </Badge>
          );
        })}
      </Group>
    );
  },
};

const institutionMatcher: ArrayMatcher = {
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
  render: (
    array: unknown[],
    _fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const institutionArray = array as InstitutionItem[];
    return (
      <Stack gap="xs">
        {institutionArray.map((institution, index) => (
          <Group key={index} justify="space-between" wrap="nowrap">
            {onNavigate && institution.id && institution.id.startsWith("I") ? (
              <Anchor
                href={`#/institutions/${institution.id}`}
                size="sm"
                style={{ flex: 1 }}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/institutions/${institution.id}`);
                }}
              >
                {institution.display_name}
              </Anchor>
            ) : (
              <Text size="sm" style={{ flex: 1 }}>
                {institution.display_name}
              </Text>
            )}
            {institution.country_code && (
              <Badge size="sm" variant="outline">
                {institution.country_code.toUpperCase()}
              </Badge>
            )}
          </Group>
        ))}
      </Stack>
    );
  },
};

const topicMatcher: ArrayMatcher = {
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
  render: (
    array: unknown[],
    _fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const topicArray = array as TopicItem[];
    return (
      <Group gap="xs" wrap="wrap">
        {topicArray.map((topic, index) =>
          onNavigate && topic.id && topic.id.startsWith("T") ? (
            <Anchor
              key={index}
              href={`#/topics/${topic.id}`}
              style={{ textDecoration: "none" }}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(`/topics/${topic.id}`);
              }}
            >
              <Badge
                variant="dot"
                size="sm"
                color={getTopicColor(topic)}
                style={{ cursor: "pointer" }}
              >
                {topic.display_name} ({topic.count})
              </Badge>
            </Anchor>
          ) : (
            <Badge
              key={index}
              variant="dot"
              size="sm"
              color={getTopicColor(topic)}
            >
              {topic.display_name} ({topic.count})
            </Badge>
          ),
        )}
      </Group>
    );
  },
};

const topicShareMatcher: ArrayMatcher = {
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
  render: (
    array: unknown[],
    _fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
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
              .map((topic, index) => (
                <Table.Tr key={topic.id || index}>
                  <Table.Td>
                    {onNavigate && topic.id && topic.id.startsWith("T") ? (
                      <Anchor
                        href={`#/topics/${topic.id}`}
                        size="sm"
                        fw={500}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(`/topics/${topic.id}`);
                        }}
                      >
                        {topic.display_name}
                      </Anchor>
                    ) : (
                      <Text size="sm" fw={500}>
                        {topic.display_name}
                      </Text>
                    )}
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
      </>
    );
  },
};

const citationHistoryMatcher: ArrayMatcher = {
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
              .map((count) => (
                <Table.Tr key={count.year}>
                  <Table.Td>{count.year}</Table.Td>
                  <Table.Td>{count.cited_by_count || 0}</Table.Td>
                  <Table.Td>{count.works_count || 0}</Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      </>
    );
  },
};

const conceptMatcher: ArrayMatcher = {
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
};

const entityIdArrayMatcher: ArrayMatcher = {
  name: "entity-id-array",
  priority: 5,
  detect: (array: unknown[]): boolean => {
    if (!Array.isArray(array) || array.length === 0) return false;

    // Check if all items are strings that look like OpenAlex IDs
    return array.every((item) => {
      if (typeof item !== "string") return false;
      const validation = validateExternalId(item);
      return validation.isValid && validation.type === "openalex";
    });
  },
  render: (
    array: unknown[],
    fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const idArray = array as string[];
    return (
      <Group gap="xs" wrap="wrap">
        {idArray.map((id, index) => {
          const relativeUrl = convertToRelativeUrl(
            `https://openalex.org/${id}`,
          );
          const entityType = getEntityTypeFromId(id);

          if (onNavigate && relativeUrl) {
            const routePath = relativeUrl.startsWith("#/") ? relativeUrl.slice(1) : relativeUrl;
            return (
              <Anchor
                key={index}
                href={relativeUrl}
                style={{ textDecoration: "none" }}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(routePath);
                }}
              >
                <Badge
                  variant="light"
                  size="sm"
                  color={getEntityColor(entityType)}
                  style={{ cursor: "pointer" }}
                >
                  {id}
                </Badge>
              </Anchor>
            );
          } else {
            return (
              <Badge
                key={index}
                variant="light"
                size="sm"
                color={getEntityColor(entityType)}
              >
                {id}
              </Badge>
            );
          }
        })}
      </Group>
    );
  },
};

const affiliationMatcher: ArrayMatcher = {
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
  render: (
    array: unknown[],
    _fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const affiliationArray = array as AffiliationItem[];
    return (
      <Stack gap="xs">
        {affiliationArray.map((affiliation, index) => (
          <Card key={index} padding="xs" radius="sm" withBorder>
            <Group justify="space-between" wrap="nowrap">
              {(() => {
                const institutionId = affiliation.institution?.id;
                const relativeUrl = institutionId
                  ? convertToRelativeUrl(institutionId)
                  : null;

                if (onNavigate && relativeUrl) {
                  // Strip the hash prefix for router navigation
                  const routePath = relativeUrl.startsWith("#/") ? relativeUrl.slice(1) : relativeUrl;
                  return (
                    <Anchor
                      href={relativeUrl}
                      size="sm"
                      style={{ flex: 1 }}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(routePath);
                      }}
                    >
                      {affiliation.institution?.display_name}
                    </Anchor>
                  );
                } else if (relativeUrl) {
                  return (
                    <Anchor href={relativeUrl} size="sm" style={{ flex: 1 }}>
                      {affiliation.institution?.display_name}
                    </Anchor>
                  );
                } else {
                  return (
                    <Text size="sm" style={{ flex: 1 }}>
                      {affiliation.institution?.display_name}
                    </Text>
                  );
                }
              })()}
              <Badge size="sm" variant="outline">
                {affiliation.years?.join("-") || "Unknown"}
              </Badge>
            </Group>
          </Card>
        ))}
      </Stack>
    );
  },
};

/**
 * Array Matchers - for detecting specific array structures
 */
export const arrayMatchers: ArrayMatcher[] = [
  // Author array matcher (from works.authorships)
  authorMatcher,

  // Institution array matcher (from authors.last_known_institutions)
  institutionMatcher,

  // Topic array matcher (from authors.topics or works.topics)
  topicMatcher,

  // Topic share array matcher (topic_share with hierarchical data)
  topicShareMatcher,

  // Citation history matcher (counts_by_year)
  citationHistoryMatcher,

  // Concept array matcher (x_concepts)
  conceptMatcher,

  // Affiliation array matcher (from authors.affiliations)
  affiliationMatcher,

  // Entity ID array matcher (referenced_works, etc.)
  entityIdArrayMatcher,
];

const idObjectMatcher = {
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
  render: (
    obj: unknown,
    _fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const idObj = obj as Record<string, string>;
    return (
      <Group gap="xs" wrap="wrap">
        {Object.entries(idObj).map(([key, value]) => {
          if (!value) return null;

          const displayKey = key.toUpperCase();
          const isSpecialId = key === "orcid" || key === "doi" || key === "ror";

          // Check if this is an OpenAlex ID that should be linked
          const validation = validateExternalId(value);
          let relativeUrl: string | null = null;

          if (validation.isValid) {
            if (validation.type === "openalex") {
              relativeUrl = convertToRelativeUrl(
                `https://openalex.org/${value}`,
              );
            }
            // ROR IDs in ID objects are not linked (handled specially)
          }

          return (
            <Group key={key} gap="xs" wrap="nowrap">
              {relativeUrl && onNavigate ? (
                <Anchor
                  href={relativeUrl}
                  style={{ textDecoration: "none" }}
                  onClick={(e) => {
                    e.preventDefault();
                    const routePath = relativeUrl.startsWith("#/") ? relativeUrl.slice(1) : relativeUrl;
                    onNavigate(routePath);
                  }}
                >
                  <Badge
                    variant={isSpecialId ? "filled" : "light"}
                    size="sm"
                    color={getIdColor(key)}
                    style={{ cursor: "pointer" }}
                  >
                    {displayKey}: {value}
                  </Badge>
                </Anchor>
              ) : relativeUrl ? (
                <Anchor
                  href={relativeUrl}
                  target={relativeUrl.startsWith("http") ? "_blank" : undefined}
                  rel={
                    relativeUrl.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
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
};
const summaryStatsMatcher = {
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
};
const entityObjectMatcher = {
  name: "entity-object",
  priority: 11, // Higher than id-object matcher
  detect: (obj: unknown): boolean => {
    if (typeof obj !== "object" || obj === null) return false;

    const objKeys = obj as Record<string, unknown>;
    return (
      "id" in objKeys &&
      "display_name" in objKeys &&
      typeof objKeys.id === "string" &&
      objKeys.id.startsWith("https://openalex.org/")
    );
  },
  render: (
    obj: unknown,
    _fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const entityObj = obj as Record<string, unknown>;
    const id = entityObj.id as string;
    const displayName = entityObj.display_name as string;

    const relativeUrl = convertToRelativeUrl(id);

    if (onNavigate && relativeUrl) {
      const routePath = relativeUrl.startsWith("#/") ? relativeUrl.slice(1) : relativeUrl;
      return (
        <Anchor
          href={relativeUrl}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            onNavigate(routePath);
          }}
        >
          {displayName}
        </Anchor>
      );
    } else {
      return <Text size="sm">{displayName}</Text>;
    }
  },
};

const geoDataMatcher = {
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
            <strong>Coordinates:</strong> {Number(geoObj.latitude).toFixed(4)},{" "}
            {Number(geoObj.longitude).toFixed(4)}
          </Text>
        )}
      </Group>
    );
  },
};
/**
 * Object Matchers - for detecting specific object structures
 */
export const objectMatchers: ObjectMatcher[] = [
  // Entity object matcher (source, publisher, funder objects)
  entityObjectMatcher,

  // ID object matcher (ids: { openalex, orcid, doi, etc. })
  idObjectMatcher,

  // Summary stats matcher (h_index, i10_index, etc.)
  summaryStatsMatcher,

  // Geographic data matcher
  geoDataMatcher,
];

const issnMatcher: ValueMatcher = {
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
};
const urlMatcher: ValueMatcher = {
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
  render: (
    value: unknown,
    _fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const urlValue = value as string;
    const relativeUrl = convertToRelativeUrl(urlValue);

    if (relativeUrl && onNavigate && (relativeUrl.startsWith("/") || relativeUrl.startsWith("#/"))) {
      // Use router navigation for internal routes
      // Strip the hash prefix for router navigation
      const routePath = relativeUrl.startsWith("#/") ? relativeUrl.slice(1) : relativeUrl;
      return (
        <Anchor
          href={relativeUrl}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(routePath);
          }}
          size="sm"
        >
          {urlValue}
        </Anchor>
      );
    } else if (relativeUrl) {
      // Use browser navigation for other internal links
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
};
const rorMatcher: ValueMatcher = {
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
};
const orcidMatcher: ValueMatcher = {
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
};
const doiMatcher: ValueMatcher = {
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
};
/**
 * Value Matchers - for detecting special value types
 */
export const valueMatchers: ValueMatcher[] = [
  // DOI matcher
  doiMatcher,

  // ORCID matcher
  orcidMatcher,

  // ROR matcher
  rorMatcher,

  // URL matcher
  urlMatcher,

  // ISSN matcher
  issnMatcher,
];

/**
 * URL conversion utilities for OpenAlex links using existing canonical route logic
 */
export function convertToRelativeUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Convert OpenAlex API URLs to entity routes
    if (urlObj.hostname === "api.openalex.org") {
      // Extract entity type from path (e.g., /works, /authors, etc.)
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        const entityType = pathParts[0]; // e.g., "works", "authors"
        const queryString = urlObj.search; // e.g., "?filter=author.id:A5017898742"
        return `#/${entityType}${queryString}`;
      }
      return null;
    }

    // Convert OpenAlex entity URLs to hash routes
    if (urlObj.hostname === "openalex.org") {
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length === 1) {
        const fullPath = pathParts[0];
        const route = determineCanonicalRoute(fullPath);
        return route ? `#${route}` : null;
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
    return `/${entityType}`;
  }

  // Handle entity paths (e.g., "W123456789", "works/W123456789")
  const pathSegments = path.split("/");
  if (pathSegments.length === 1) {
    // Single segment - check if it's an entity type or entity ID
    const segment = pathSegments[0];
    const firstChar = segment.charAt(0).toLowerCase();

    // If it starts with a letter that indicates an entity type, treat as entity type
    if (
      ["w", "a", "i", "s", "t", "p", "f"].includes(firstChar) &&
      segment.length > 1
    ) {
      // Check if this looks like an entity type (all lowercase, no numbers)
      if (/^[a-z]+$/.test(segment)) {
        return `/${segment}`;
      }
    }

    // Otherwise treat as entity ID
    const entityType = getEntityTypeFromId(segment);
    return `/${entityType}/${segment}`;
  } else if (pathSegments.length >= 2) {
    // Multi-segment path like "works/W123456789"
    const entityType = pathSegments[0];
    const entityId = pathSegments[1].split("?")[0]; // Remove query params for entity routes
    return `/${entityType}/${entityId}`;
  }

  return `/${path}`;
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

function getEntityColor(entityType: string): string {
  const colorMap: Record<string, string> = {
    works: "blue",
    authors: "green",
    institutions: "orange",
    sources: "purple",
    topics: "red",
    publishers: "teal",
    funders: "cyan",
  };
  return colorMap[entityType] || "gray";
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
