import { ActionIcon, Anchor, Badge, Group, Tooltip } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import React from "react";
import { validateExternalId } from "@academic-explorer/client";
import type { ObjectMatcher } from "../types";
import { convertToRelativeUrl, getIdColor } from "../utils";

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

          if (validation.isValid && validation.type === "openalex") {
            relativeUrl = convertToRelativeUrl(`https://openalex.org/${value}`);
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
                    const routePath = relativeUrl.startsWith("#/")
                      ? relativeUrl.slice(1)
                      : relativeUrl;
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
