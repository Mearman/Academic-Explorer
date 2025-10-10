import { Stack } from "@mantine/core";
import React from "react";
import { EntityCard } from "../../../cards/EntityCard";
import type { ArrayMatcher, InstitutionItem } from "../types";
import { extractEntityId } from "../utils";

export const institutionMatcher: ArrayMatcher = {
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
      <Stack gap="sm">
        {institutionArray.map((institution, index) => {
          const entityId = institution.id
            ? extractEntityId(institution.id) || institution.id
            : `institution-${institution.display_name}`;
          return (
            <EntityCard
              key={index}
              id={entityId}
              displayName={institution.display_name}
              entityType="institutions"
              description={
                institution.country_code
                  ? institution.country_code.toUpperCase()
                  : undefined
              }
              onNavigate={onNavigate}
              href={
                institution.id
                  ? `#/institutions/${extractEntityId(institution.id) || institution.id}`
                  : undefined
              }
            />
          );
        })}
      </Stack>
    );
  },
};
