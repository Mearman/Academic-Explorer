/**
 * External Links Section
 * Provides links to external resources and services
 */

import React from "react";
import {
  IconExternalLink,
  IconLink,
  IconFileText,
  IconSchool,
} from "@tabler/icons-react";
import { Button, Divider, Text } from "@mantine/core";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { useLayoutState } from "@/stores/layout-store";
import { useGraphStore } from "@/stores/graph-store";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphNode } from "@academic-explorer/graph";

interface ExternalLinksSectionProps {
  className?: string;
}

export const ExternalLinksSection: React.FC<ExternalLinksSectionProps> = ({
  className = "",
}) => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  // Get entity to display - priority: hovered > selected > preview
  const graphStore = useGraphStore();
  const { hoveredNodeId, selectedNodeId, nodes } = graphStore;

  const { previewEntityId } = useLayoutState();

  // Determine which entity to show
  const displayEntityId = hoveredNodeId ?? selectedNodeId ?? previewEntityId;
  const entityNode = displayEntityId ? nodes[displayEntityId] : undefined;

  const handleLinkClick = ({ url, linkType }) => {
    logger.debug("ui", `Opening external link: ${linkType}`, {
      url,
      entityId: displayEntityId,
      linkType,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Type guards for safe URL handling
  const isString = (value: unknown): value is string => {
    return typeof value === "string" && value.length > 0;
  };

  const isValidUrl = (value: unknown): value is string => {
    if (!isString(value)) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const isIdsRecord = (value: unknown): value is Record<string, unknown> => {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  };

  // Type guard for IDs object with specific properties
  const isIdsWithWikipedia = (
    ids: Record<string, unknown>,
  ): ids is Record<string, unknown> & { wikipedia: unknown } => {
    return "wikipedia" in ids;
  };

  const isIdsWithWikidata = (
    ids: Record<string, unknown>,
  ): ids is Record<string, unknown> & { wikidata: unknown } => {
    return "wikidata" in ids;
  };

  const generateLinks = (entity: GraphNode) => {
    const links: Array<{
      label: string;
      url: string;
      icon: React.ReactNode;
      description: string;
      type: string;
    }> = [];

    // OpenAlex link (always available if we have an entity)
    if (entity.id) {
      links.push({
        label: "View in OpenAlex",
        url: `https://openalex.org/${entity.id}`,
        icon: <IconSchool size={16} />,
        description: "Open in OpenAlex database",
        type: "openalex",
      });
    }

    // DOI link for works - access entityData safely
    const { entityData } = entity;
    if (
      entity.entityType === "works" &&
      entityData?.["doi"] &&
      isValidUrl(entityData["doi"])
    ) {
      links.push({
        label: "DOI Resolver",
        url: entityData["doi"],
        icon: <IconFileText size={16} />,
        description: "View full article via DOI",
        type: "doi",
      });
    }

    // ORCID link for authors
    if (
      entity.entityType === "authors" &&
      entityData?.["orcid"] &&
      isValidUrl(entityData["orcid"])
    ) {
      links.push({
        label: "ORCID Profile",
        url: entityData["orcid"],
        icon: <IconExternalLink size={16} />,
        description: "View ORCID researcher profile",
        type: "orcid",
      });
    }

    // Homepage/website links
    if (
      entityData?.["homepage_url"] &&
      isValidUrl(entityData["homepage_url"])
    ) {
      try {
        const domain = new URL(entityData["homepage_url"]).hostname;
        links.push({
          label: `Visit ${domain}`,
          url: entityData["homepage_url"],
          icon: <IconLink size={16} />,
          description: "Official website",
          type: "homepage",
        });
      } catch {
        // Invalid URL, skip
      }
    }

    // Publisher website for sources
    if (
      entity.entityType === "sources" &&
      entityData?.["homepage_url"] &&
      isValidUrl(entityData["homepage_url"])
    ) {
      links.push({
        label: "Publisher Website",
        url: entityData["homepage_url"],
        icon: <IconLink size={16} />,
        description: "View publisher's website",
        type: "publisher",
      });
    }

    // Wikipedia link
    const idsRecord = entityData?.["ids"];
    if (
      isIdsRecord(idsRecord) &&
      isIdsWithWikipedia(idsRecord) &&
      isValidUrl(idsRecord.wikipedia)
    ) {
      links.push({
        label: "Wikipedia",
        url: idsRecord.wikipedia,
        icon: <IconExternalLink size={16} />,
        description: "View Wikipedia article",
        type: "wikipedia",
      });
    }

    // Wikidata link
    if (
      isIdsRecord(idsRecord) &&
      isIdsWithWikidata(idsRecord) &&
      isValidUrl(idsRecord.wikidata)
    ) {
      links.push({
        label: "Wikidata",
        url: idsRecord.wikidata,
        icon: <IconExternalLink size={16} />,
        description: "View Wikidata entry",
        type: "wikidata",
      });
    }

    return links;
  };

  if (!displayEntityId || !entityNode) {
    return (
      <div
        className={className}
        style={{
          padding: "24px",
          textAlign: "center",
          color: colors.text.secondary,
        }}
      >
        <IconExternalLink
          size={48}
          style={{
            opacity: 0.3,
            marginBottom: "12px",
          }}
        />
        <div
          style={{
            fontSize: "14px",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          No Entity Selected
        </div>
        <div
          style={{
            fontSize: "12px",
            opacity: 0.7,
            lineHeight: 1.4,
          }}
        >
          Select an entity to view external links and resources
        </div>
      </div>
    );
  }

  const links = generateLinks(entityNode);

  if (links.length === 0) {
    return (
      <div className={className} style={{ padding: "16px" }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "12px",
            color: colors.text.primary,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconExternalLink size={16} />
          External Links
        </div>

        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: colors.text.secondary,
            backgroundColor: colors.background.secondary,
            borderRadius: "8px",
          }}
        >
          <Text size="sm" c="dimmed">
            No external links available for this entity
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ padding: "16px" }}>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "12px",
          color: colors.text.primary,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <IconExternalLink size={16} />
        External Links
      </div>

      {/* Academic Resources */}
      <CollapsibleSection
        title="Academic Resources"
        icon={<IconSchool size={14} />}
        defaultExpanded={true}
        storageKey="external-links-academic"
      >
        <div style={{ marginTop: "12px" }}>
          {links
            .filter((link) => ["openalex", "doi", "orcid"].includes(link.type))
            .map((link) => (
              <div key={link.type} style={{ marginBottom: "8px" }}>
                <Button
                  variant="light"
                  size="sm"
                  leftSection={link.icon}
                  rightSection={<IconExternalLink size={12} />}
                  onClick={() => {
                    handleLinkClick({ url: link.url, linkType: link.type });
                  }}
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    height: "auto",
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 500 }}>{link.label}</div>
                    <Text size="xs" c="dimmed" style={{ marginTop: "2px" }}>
                      {link.description}
                    </Text>
                  </div>
                </Button>
              </div>
            ))}
        </div>
      </CollapsibleSection>

      {links.filter((link) => !["openalex", "doi", "orcid"].includes(link.type))
        .length > 0 && (
        <>
          <Divider style={{ margin: "16px 0" }} />

          {/* Web Resources */}
          <CollapsibleSection
            title="Web Resources"
            icon={<IconLink size={14} />}
            defaultExpanded={false}
            storageKey="external-links-web"
          >
            <div style={{ marginTop: "12px" }}>
              {links
                .filter(
                  (link) => !["openalex", "doi", "orcid"].includes(link.type),
                )
                .map((link) => (
                  <div key={link.type} style={{ marginBottom: "8px" }}>
                    <Button
                      variant="light"
                      size="sm"
                      leftSection={link.icon}
                      rightSection={<IconExternalLink size={12} />}
                      onClick={() => {
                        handleLinkClick({ url: link.url, linkType: link.type });
                      }}
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        height: "auto",
                        padding: "8px 12px",
                      }}
                    >
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 500 }}>{link.label}</div>
                        <Text size="xs" c="dimmed" style={{ marginTop: "2px" }}>
                          {link.description}
                        </Text>
                      </div>
                    </Button>
                  </div>
                ))}
            </div>
          </CollapsibleSection>
        </>
      )}

      {/* Usage Tips */}
      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          backgroundColor: colors.background.secondary,
          borderRadius: "6px",
        }}
      >
        <Text size="xs" c="dimmed" style={{ marginBottom: "8px" }}>
          Tips
        </Text>
        <Text size="xs" c="dimmed">
          • Links open in new tabs for easy reference
          <br />
          • Academic resources provide authoritative data
          <br />• Web resources offer additional context
        </Text>
      </div>
    </div>
  );
};
