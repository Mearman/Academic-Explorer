import { ActionIcon, Anchor, Badge, Group, Tooltip } from "@mantine/core";
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { IconCopy } from "@tabler/icons-react";
import React from "react";
import { validateExternalId } from "@academic-explorer/client";
import type { ObjectMatcher } from "../types";
import { convertToRelativeUrl, getIdColor } from "../utils";

// Constants for ID types
const SPECIAL_ID_TYPES = new Set(["orcid", "doi", "ror"]);

export const idObjectMatcher: ObjectMatcher = {
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
    fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const idObj = obj as Record<string, string>;
    return (
      <Group gap="xs" wrap="wrap">
        {Object.entries(idObj).map(([key, value]) =>
          value ? renderIdBadge({ key, value, onNavigate }) : null,
        )}
      </Group>
    );
  },
};

/**
 * Renders a single ID badge with appropriate linking and copy functionality
 */
function renderIdBadge({
  key,
  value,
  onNavigate,
}: {
  key: string;
  value: string;
  onNavigate?: (path: string) => void;
}): React.ReactNode {
  const displayKey = key.toUpperCase();
  const isSpecialId = SPECIAL_ID_TYPES.has(key);
  const relativeUrl = getRelativeUrlForId({ key, value });

  return (
    <Group key={key} gap="xs" wrap="nowrap">
      {renderBadgeLink({
        displayKey,
        value,
        key,
        relativeUrl,
        onNavigate,
        isSpecialId,
      })}
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
}

/**
 * Gets the relative URL for an ID if it should be linked
 */
function getRelativeUrlForId({
  key,
  value,
}: {
  key: string;
  value: string;
}): string | null {
  // Check if this is an OpenAlex ID that should be linked
  const validation = validateExternalId(value);
  if (validation.isValid && validation.type === "openalex") {
    return convertToRelativeUrl(`https://openalex.org/${value}`);
  }
  return null;
}

/**
 * Renders the appropriate badge link based on URL and navigation availability
 */
function renderBadgeLink({
  displayKey,
  value,
  key,
  relativeUrl,
  onNavigate,
  isSpecialId,
}: {
  displayKey: string;
  value: string;
  key: string;
  relativeUrl: string | null;
  onNavigate?: (path: string) => void;
  isSpecialId?: boolean;
}): React.ReactNode {
  const badgeProps = {
    variant: isSpecialId ? "filled" : ("light" as const),
    size: "sm" as const,
    color: getIdColor(key),
  };

  if (relativeUrl && onNavigate) {
    return (
      <Anchor
        href={relativeUrl}
        style={{ textDecoration: "none" }}
        onClick={(e) => {
          e.preventDefault();
          const routePath = relativeUrl.startsWith("#/")
            ? relativeUrl.slice(1)
            : relativeUrl;
          onNavigate(routePath);
        }}
      >
        <Badge {...badgeProps} style={{ cursor: "pointer" }}>
          {displayKey}: {value}
        </Badge>
      </Anchor>
    );
  }

  if (relativeUrl) {
    return (
      <Anchor
        href={relativeUrl}
        target={relativeUrl.startsWith("http") ? "_blank" : undefined}
        rel={relativeUrl.startsWith("http") ? "noopener noreferrer" : undefined}
        style={{ textDecoration: "none" }}
        aria-label={`Navigate to ${key} ${value}`}
      >
        <Badge {...badgeProps}>
          {displayKey}: {value}
        </Badge>
      </Anchor>
    );
  }

  return (
    <Badge {...badgeProps}>
      {displayKey}: {value}
    </Badge>
  );
}
