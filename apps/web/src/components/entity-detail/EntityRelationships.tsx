/**
 * EntityRelationships Component
 *
 * Displays outbound and inbound relationships for any entity type.
 * Extracts relationship data from entity fields and organizes them by relationship type.
 */

import React from "react";
import {
  Anchor,
  Badge,
  Card,
  Stack,
  Group,
  Title,
  Text,
  Divider,
  Box,
  Table,
  TableTbody,
  TableTr,
  TableTd,
  TableThead,
  TableTh,
  Accordion,
  AccordionItem,
  AccordionControl,
  AccordionPanel,
} from "@mantine/core";
import {
  IconLink,
  IconArrowRight,
  IconArrowLeft,
  IconUsersGroup,
  IconBook,
  IconBuilding,
  IconBookmark,
  IconCash,
  IconTag,
  IconBulb,
  IconNetwork,
  IconExternalLink,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { convertOpenAlexToInternalLink } from "@/utils/openalex-link-conversion";
import { EntityType } from "./EntityTypeConfig";

interface EntityRelationshipsProps {
  data: Record<string, unknown>;
  entityType: EntityType | string;
  entityId: string;
}

interface Relationship {
  id: string;
  displayName: string;
  type: string;
  count?: number;
  metadata?: Record<string, unknown>;
}

interface RelationshipGroup {
  label: string;
  direction: "outbound" | "inbound";
  icon: React.ReactNode;
  relationships: Relationship[];
  description?: string;
  apiUrl?: string;
}

// Helper to safely access nested properties on unknown objects
function getProp(obj: unknown, prop: string): unknown {
  if (obj !== null && typeof obj === "object" && prop in obj) {
    return (obj as Record<string, unknown>)[prop];
  }
  return undefined;
}

function hasProps(obj: unknown, props: string[]): boolean {
  if (obj === null || typeof obj !== "object") return false;
  return props.every(prop => prop in obj);
}

/**
 * Extract outbound relationships from entity data
 */
function extractOutboundRelationships(
  data: Record<string, unknown>,
  entityType: EntityType | string
): RelationshipGroup[] {
  const groups: RelationshipGroup[] = [];

  // Common extraction logic for different entity types
  switch (entityType) {
    case "work":
      // Authors
      if (data.authorships && Array.isArray(data.authorships)) {
        const authors = data.authorships
          .map((authorship) => ({
            id: authorship.author?.id || "",
            displayName: authorship.author?.display_name || "Unknown Author",
            type: "author",
            metadata: {
              position: authorship.author_position,
              orcid: authorship.author?.orcid,
            },
          }))
          .filter((a) => a.id);

        if (authors.length > 0) {
          groups.push({
            label: "Authors",
            direction: "outbound",
            icon: <IconUsersGroup size={20} />,
            relationships: authors,
            description: `${authors.length} author${authors.length !== 1 ? "s" : ""}`,
          });
        }
      }

      // Published in (Source)
      const primaryLocation = data.primary_location;
      const source = getProp(primaryLocation, "source");
      const sourceId = getProp(source, "id");
      const sourceDisplayName = getProp(source, "display_name");
      if (typeof sourceId === "string" && typeof sourceDisplayName === "string") {
        groups.push({
          label: "Published In",
          direction: "outbound",
          icon: <IconBookmark size={20} />,
          relationships: [
            {
              id: sourceId,
              displayName: sourceDisplayName,
              type: "source",
            },
          ],
        });
      }

      // References (cited works)
      if (data.referenced_works && Array.isArray(data.referenced_works)) {
        const refCount = data.referenced_works.length;
        if (refCount > 0) {
          groups.push({
            label: "References",
            direction: "outbound",
            icon: <IconBook size={20} />,
            relationships: data.referenced_works.slice(0, 10).map((id: string) => ({
              id,
              displayName: id.split("/").pop() || id,
              type: "work",
            })),
            description: `${refCount} referenced work${refCount !== 1 ? "s" : ""}${refCount > 10 ? " (showing first 10)" : ""}`,
          });
        }
      }

      // Related works
      if (data.related_works && Array.isArray(data.related_works)) {
        const relCount = data.related_works.length;
        if (relCount > 0) {
          groups.push({
            label: "Related Works",
            direction: "outbound",
            icon: <IconNetwork size={20} />,
            relationships: data.related_works.slice(0, 10).map((id: string) => ({
              id,
              displayName: id.split("/").pop() || id,
              type: "work",
            })),
            description: `${relCount} related work${relCount !== 1 ? "s" : ""}${relCount > 10 ? " (showing first 10)" : ""}`,
          });
        }
      }

      // Funders
      if (data.grants && Array.isArray(data.grants)) {
        const funders = data.grants
          .map((grant) => ({
            id: grant.funder || "",
            displayName: grant.funder_display_name || "Unknown Funder",
            type: "funder",
            metadata: {
              awardId: grant.award_id,
            },
          }))
          .filter((f) => f.id);

        if (funders.length > 0) {
          groups.push({
            label: "Funded By",
            direction: "outbound",
            icon: <IconCash size={20} />,
            relationships: funders,
          });
        }
      }

      // Topics
      if (data.topics && Array.isArray(data.topics)) {
        const topics = data.topics
          .slice(0, 10)
          .map((topic) => ({
            id: topic.id || "",
            displayName: topic.display_name || "Unknown Topic",
            type: "topic",
            metadata: {
              score: topic.score,
            },
          }))
          .filter((t) => t.id);

        if (topics.length > 0) {
          groups.push({
            label: "Topics",
            direction: "outbound",
            icon: <IconBulb size={20} />,
            relationships: topics,
            description: data.topics.length > 10 ? `${data.topics.length} topics (showing first 10)` : undefined,
          });
        }
      }

      // Keywords
      if (Array.isArray(data.keywords)) {
        const keywords = data.keywords.slice(0, 20).map((keyword, index) => ({
          id: `keyword-${index}`,
          displayName: String(keyword),
          type: "keyword",
        }));

        if (keywords.length > 0) {
          groups.push({
            label: "Keywords",
            direction: "outbound",
            icon: <IconTag size={20} />,
            relationships: keywords,
            description: data.keywords.length > 20 ? `${data.keywords.length} keywords (showing first 20)` : undefined,
          });
        }
      }
      break;

    case "author":
      // Institutions (last known)
      if (data.last_known_institutions && Array.isArray(data.last_known_institutions)) {
        const institutions = data.last_known_institutions
          .map((inst) => ({
            id: inst.id || "",
            displayName: inst.display_name || "Unknown Institution",
            type: "institution",
            metadata: {
              ror: inst.ror,
              country: inst.country_code,
            },
          }))
          .filter((i) => i.id);

        if (institutions.length > 0) {
          groups.push({
            label: "Last Known Institutions",
            direction: "outbound",
            icon: <IconBuilding size={20} />,
            relationships: institutions,
          });
        }
      }

      // Affiliations
      if (data.affiliations && Array.isArray(data.affiliations)) {
        const affiliations = data.affiliations
          .map((aff) => ({
            id: aff.institution?.id || "",
            displayName: aff.institution?.display_name || "Unknown Institution",
            type: "institution",
            metadata: {
              years: aff.years?.join(", "),
            },
          }))
          .filter((a) => a.id);

        if (affiliations.length > 0) {
          groups.push({
            label: "Affiliations",
            direction: "outbound",
            icon: <IconBuilding size={20} />,
            relationships: affiliations,
            description: "Historical affiliations",
          });
        }
      }

      // Topics
      if (data.topics && Array.isArray(data.topics)) {
        const topics = data.topics
          .slice(0, 10)
          .map((topic) => ({
            id: topic.id || "",
            displayName: topic.display_name || "Unknown Topic",
            type: "topic",
            metadata: {
              count: topic.count,
            },
          }))
          .filter((t) => t.id);

        if (topics.length > 0) {
          groups.push({
            label: "Research Topics",
            direction: "outbound",
            icon: <IconBulb size={20} />,
            relationships: topics,
            description: data.topics.length > 10 ? `${data.topics.length} topics (showing first 10)` : undefined,
          });
        }
      }
      break;

    case "institution":
      // Associated institutions
      if (data.associated_institutions && Array.isArray(data.associated_institutions)) {
        const associated = data.associated_institutions
          .map((inst) => ({
            id: inst.id || "",
            displayName: inst.display_name || "Unknown Institution",
            type: "institution",
            metadata: {
              relationship: inst.relationship,
              ror: inst.ror,
            },
          }))
          .filter((i) => i.id);

        if (associated.length > 0) {
          groups.push({
            label: "Associated Institutions",
            direction: "outbound",
            icon: <IconBuilding size={20} />,
            relationships: associated,
          });
        }
      }

      // Parent institutions (lineage)
      if (data.lineage && Array.isArray(data.lineage)) {
        const parents = data.lineage
          .filter((id: string) => id !== data.id) // Exclude self
          .map((id: string) => ({
            id,
            displayName: id.split("/").pop() || id,
            type: "institution",
          }));

        if (parents.length > 0) {
          groups.push({
            label: "Parent Institutions",
            direction: "outbound",
            icon: <IconBuilding size={20} />,
            relationships: parents,
            description: "Institutional hierarchy",
          });
        }
      }

      // Topics
      if (data.topics && Array.isArray(data.topics)) {
        const topics = data.topics
          .slice(0, 10)
          .map((topic) => ({
            id: topic.id || "",
            displayName: topic.display_name || "Unknown Topic",
            type: "topic",
            metadata: {
              count: topic.count,
            },
          }))
          .filter((t) => t.id);

        if (topics.length > 0) {
          groups.push({
            label: "Research Topics",
            direction: "outbound",
            icon: <IconBulb size={20} />,
            relationships: topics,
            description: data.topics.length > 10 ? `${data.topics.length} topics (showing first 10)` : undefined,
          });
        }
      }
      break;

    case "source":
      // Publisher
      if (data.publisher && typeof data.publisher === "string") {
        groups.push({
          label: "Publisher",
          direction: "outbound",
          icon: <IconBookmark size={20} />,
          relationships: [
            {
              id: data.publisher,
              displayName: data.publisher,
              type: "publisher",
            },
          ],
        });
      }

      // Topics
      if (data.topics && Array.isArray(data.topics)) {
        const topics = data.topics
          .slice(0, 10)
          .map((topic) => ({
            id: topic.id || "",
            displayName: topic.display_name || "Unknown Topic",
            type: "topic",
            metadata: {
              count: topic.count,
            },
          }))
          .filter((t) => t.id);

        if (topics.length > 0) {
          groups.push({
            label: "Topics",
            direction: "outbound",
            icon: <IconBulb size={20} />,
            relationships: topics,
            description: data.topics.length > 10 ? `${data.topics.length} topics (showing first 10)` : undefined,
          });
        }
      }
      break;

    case "publisher":
      // Parent publisher
      if (data.parent_publisher && typeof data.parent_publisher === "string") {
        groups.push({
          label: "Parent Publisher",
          direction: "outbound",
          icon: <IconBuilding size={20} />,
          relationships: [
            {
              id: data.parent_publisher,
              displayName: data.parent_publisher.split("/").pop() || data.parent_publisher,
              type: "publisher",
            },
          ],
        });
      }

      // Lineage
      if (Array.isArray(data.lineage)) {
        const parents = data.lineage
          .filter((id) => id !== data.id) // Exclude self
          .map((id) => ({
            id: String(id),
            displayName: String(id).split("/").pop() || String(id),
            type: "publisher",
          }));

        if (parents.length > 0) {
          groups.push({
            label: "Publisher Hierarchy",
            direction: "outbound",
            icon: <IconBuilding size={20} />,
            relationships: parents,
          });
        }
      }
      break;

    case "topic":
      // Subfield
      const subfield = data.subfield;
      const subfieldId = getProp(subfield, "id");
      const subfieldName = getProp(subfield, "display_name");
      if (typeof subfieldId === "string" && typeof subfieldName === "string") {
        groups.push({
          label: "Subfield",
          direction: "outbound",
          icon: <IconBulb size={20} />,
          relationships: [
            {
              id: subfieldId,
              displayName: subfieldName,
              type: "topic",
            },
          ],
        });
      }

      // Field
      const field = data.field;
      const fieldId = getProp(field, "id");
      const fieldName = getProp(field, "display_name");
      if (typeof fieldId === "string" && typeof fieldName === "string") {
        groups.push({
          label: "Field",
          direction: "outbound",
          icon: <IconBulb size={20} />,
          relationships: [
            {
              id: fieldId,
              displayName: fieldName,
              type: "topic",
            },
          ],
        });
      }

      // Domain
      const domain = data.domain;
      const domainId = getProp(domain, "id");
      const domainName = getProp(domain, "display_name");
      if (typeof domainId === "string" && typeof domainName === "string") {
        groups.push({
          label: "Domain",
          direction: "outbound",
          icon: <IconBulb size={20} />,
          relationships: [
            {
              id: domainId,
              displayName: domainName,
              type: "topic",
            },
          ],
        });
      }

      // Siblings
      if (data.siblings && Array.isArray(data.siblings)) {
        const siblings = data.siblings
          .map((sibling) => ({
            id: sibling.id || "",
            displayName: sibling.display_name || "Unknown Topic",
            type: "topic",
          }))
          .filter((s) => s.id);

        if (siblings.length > 0) {
          groups.push({
            label: "Related Topics (Siblings)",
            direction: "outbound",
            icon: <IconBulb size={20} />,
            relationships: siblings,
          });
        }
      }
      break;

    case "concept":
      // Ancestors
      if (data.ancestors && Array.isArray(data.ancestors)) {
        const ancestors = data.ancestors
          .map((ancestor) => ({
            id: ancestor.id || "",
            displayName: ancestor.display_name || "Unknown Concept",
            type: "concept",
            metadata: {
              level: ancestor.level,
            },
          }))
          .filter((a) => a.id);

        if (ancestors.length > 0) {
          groups.push({
            label: "Parent Concepts",
            direction: "outbound",
            icon: <IconBulb size={20} />,
            relationships: ancestors,
          });
        }
      }

      // Related concepts
      if (data.related_concepts && Array.isArray(data.related_concepts)) {
        const related = data.related_concepts
          .slice(0, 10)
          .map((concept) => ({
            id: concept.id || "",
            displayName: concept.display_name || "Unknown Concept",
            type: "concept",
            metadata: {
              score: concept.score,
              level: concept.level,
            },
          }))
          .filter((c) => c.id);

        if (related.length > 0) {
          groups.push({
            label: "Related Concepts",
            direction: "outbound",
            icon: <IconBulb size={20} />,
            relationships: related,
            description: data.related_concepts.length > 10 ? `${data.related_concepts.length} concepts (showing first 10)` : undefined,
          });
        }
      }
      break;

    case "funder":
      // Topics
      if (data.topics && Array.isArray(data.topics)) {
        const topics = data.topics
          .slice(0, 10)
          .map((topic) => ({
            id: topic.id || "",
            displayName: topic.display_name || "Unknown Topic",
            type: "topic",
            metadata: {
              count: topic.count,
            },
          }))
          .filter((t) => t.id);

        if (topics.length > 0) {
          groups.push({
            label: "Funding Topics",
            direction: "outbound",
            icon: <IconBulb size={20} />,
            relationships: topics,
            description: data.topics.length > 10 ? `${data.topics.length} topics (showing first 10)` : undefined,
          });
        }
      }
      break;
  }

  return groups;
}

/**
 * Extract inbound relationships based on available API URLs
 */
function extractInboundRelationships(
  data: Record<string, unknown>,
  entityType: EntityType | string
): RelationshipGroup[] {
  const groups: RelationshipGroup[] = [];

  // Works relationship (most entities can have works)
  if (data.works_api_url && typeof data.works_api_url === "string") {
    const worksCount = typeof data.works_count === "number" ? data.works_count : undefined;
    groups.push({
      label: "Works",
      direction: "inbound",
      icon: <IconBook size={20} />,
      relationships: [],
      description: worksCount ? `${worksCount.toLocaleString()} work${worksCount !== 1 ? "s" : ""}` : "View works",
      apiUrl: data.works_api_url,
    });
  }

  // Cited by (for works)
  if (entityType === "work" && data.cited_by_api_url && typeof data.cited_by_api_url === "string") {
    const citedByCount = typeof data.cited_by_count === "number" ? data.cited_by_count : undefined;
    groups.push({
      label: "Cited By",
      direction: "inbound",
      icon: <IconBook size={20} />,
      relationships: [],
      description: citedByCount ? `${citedByCount.toLocaleString()} citation${citedByCount !== 1 ? "s" : ""}` : "View citations",
      apiUrl: data.cited_by_api_url,
    });
  }

  // Sources (for publishers)
  if (entityType === "publisher" && data.sources_api_url && typeof data.sources_api_url === "string") {
    const sourcesCount = typeof data.sources_count === "number" ? data.sources_count : undefined;
    groups.push({
      label: "Sources",
      direction: "inbound",
      icon: <IconBookmark size={20} />,
      relationships: [],
      description: sourcesCount ? `${sourcesCount.toLocaleString()} source${sourcesCount !== 1 ? "s" : ""}` : "View sources",
      apiUrl: data.sources_api_url,
    });
  }

  return groups;
}

/**
 * Render a single relationship
 */
function renderRelationship(relationship: Relationship) {
  const converted = convertOpenAlexToInternalLink(relationship.id);

  // Handle keywords (no link)
  if (relationship.type === "keyword") {
    return (
      <Badge key={relationship.id} variant="light" size="md">
        {relationship.displayName}
      </Badge>
    );
  }

  // Handle linked entities
  return (
    <Group key={relationship.id} gap="xs" wrap="nowrap">
      <Anchor
        component={Link}
        to={converted.internalPath}
        c="blue"
        size="sm"
        style={{ wordBreak: "break-word" }}
      >
        <Group gap={4}>
          <IconLink size={14} />
          <Text size="sm">{relationship.displayName}</Text>
        </Group>
      </Anchor>
      {relationship.metadata && Object.keys(relationship.metadata).length > 0 && (
        <Group gap={4}>
          {Object.entries(relationship.metadata).map(([key, value]) => {
            if (value === null || value === undefined) return null;
            return (
              <Badge key={key} size="xs" variant="light" color="gray">
                {key}: {String(value)}
              </Badge>
            );
          })}
        </Group>
      )}
    </Group>
  );
}

/**
 * Render a relationship group
 */
function renderRelationshipGroup(group: RelationshipGroup) {
  const directionIcon = group.direction === "outbound" ? <IconArrowRight size={16} /> : <IconArrowLeft size={16} />;

  return (
    <Card key={group.label} withBorder p="md">
      <Stack gap="sm">
        <Group gap="xs">
          {group.icon}
          {directionIcon}
          <Title order={4}>{group.label}</Title>
          {group.description && (
            <Badge variant="light" size="sm">
              {group.description}
            </Badge>
          )}
        </Group>

        {group.apiUrl ? (
          // For inbound relationships with API URLs
          <Anchor
            href={group.apiUrl}
            target="_blank"
            rel="noopener noreferrer"
            c="blue"
          >
            <Group gap="xs">
              <IconExternalLink size={16} />
              <Text size="sm">View all via OpenAlex API</Text>
            </Group>
          </Anchor>
        ) : (
          // For outbound relationships with actual data
          <Box>
            {group.relationships.length === 0 ? (
              <Text c="dimmed" fs="italic" size="sm">
                No relationships found
              </Text>
            ) : (
              <Stack gap="xs">
                {group.relationships.map((rel) => renderRelationship(rel))}
              </Stack>
            )}
          </Box>
        )}
      </Stack>
    </Card>
  );
}

/**
 * Main EntityRelationships component
 */
export function EntityRelationships({ data, entityType, entityId }: EntityRelationshipsProps) {
  const outboundGroups = extractOutboundRelationships(data, entityType);
  const inboundGroups = extractInboundRelationships(data, entityType);

  const hasOutbound = outboundGroups.length > 0;
  const hasInbound = inboundGroups.length > 0;

  if (!hasOutbound && !hasInbound) {
    return (
      <Card withBorder p="lg">
        <Text c="dimmed" fs="italic" ta="center">
          No relationships found for this entity
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={3}>
        <Group gap="xs">
          <IconNetwork size={24} />
          Entity Relationships
        </Group>
      </Title>

      <Accordion multiple defaultValue={hasOutbound ? ["outbound"] : hasInbound ? ["inbound"] : []}>
        {hasOutbound && (
          <AccordionItem value="outbound">
            <AccordionControl>
              <Group gap="xs">
                <IconArrowRight size={20} />
                <Title order={4}>
                  Outbound Relationships ({outboundGroups.length})
                </Title>
              </Group>
            </AccordionControl>
            <AccordionPanel>
              <Stack gap="md">
                {outboundGroups.map((group) => renderRelationshipGroup(group))}
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        )}

        {hasInbound && (
          <AccordionItem value="inbound">
            <AccordionControl>
              <Group gap="xs">
                <IconArrowLeft size={20} />
                <Title order={4}>
                  Inbound Relationships ({inboundGroups.length})
                </Title>
              </Group>
            </AccordionControl>
            <AccordionPanel>
              <Stack gap="md">
                {inboundGroups.map((group) => renderRelationshipGroup(group))}
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        )}
      </Accordion>
    </Stack>
  );
}
