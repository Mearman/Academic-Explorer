import { Stack } from "@mantine/core";
import React from "react";
import { EntityCard } from "../../../cards/EntityCard";
import type { ArrayMatcher, AuthorItem } from "../types";
import { extractEntityId } from "../utils";

export const authorMatcher: ArrayMatcher = {
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
      <Stack gap="sm">
        {authorArray.map((authorship, index) => {
          const { author } = authorship;
          const position = authorship.author_position;
          const positionLabel =
            position === "first"
              ? " (First)"
              : position === "last"
                ? " (Last)"
                : "";

          const entityId = extractEntityId(author.id) || author.id;
          return (
            <EntityCard
              key={index}
              id={entityId}
              displayName={author.display_name + positionLabel}
              entityType="authors"
              onNavigate={onNavigate}
              href={entityId ? `#/authors/${entityId}` : undefined}
            />
          );
        })}
      </Stack>
    );
  },
};
