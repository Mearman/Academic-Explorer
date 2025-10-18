import { Anchor, Stack, Text } from "@mantine/core";
import React from "react";
import type { ArrayMatcher, AffiliationItem } from "../types";
import { extractEntityId } from "../utils";

export const affiliationMatcher: ArrayMatcher = {
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
  render: ({
    array,
    _fieldName,
    onNavigate,
  }: {
    array: unknown[];
    _fieldName: string;
    onNavigate?: (path: string) => void;
  }): React.ReactNode => {
    const affiliationArray = array as AffiliationItem[];

    return (
      <Stack gap="sm">
        {affiliationArray.map((affiliation, index) => {
          const institutionId = affiliation.institution?.id;
          const displayName =
            affiliation.institution?.display_name || "Unknown Institution";

          if (onNavigate && institutionId) {
            const entityId = extractEntityId(institutionId) || institutionId;
            return (
              <Anchor
                key={index}
                href={`/institutions/${entityId}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/institutions/${entityId}`);
                }}
              >
                {displayName}
              </Anchor>
            );
          } else {
            return <Text key={index}>{displayName}</Text>;
          }
        })}
      </Stack>
    );
  },
};
