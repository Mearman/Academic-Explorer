import { ActionIcon, Badge, Group } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import React from "react";
import type { ValueMatcher } from "../types";

export const orcidMatcher: ValueMatcher = {
  name: "orcid",
  priority: 9,
  detect: (value: unknown): boolean => {
    if (typeof value !== "string") return false;
    return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(value);
  },
  render: ({
    value,
    fieldName,
  }: {
    value: unknown;
    fieldName: string;
  }): React.ReactNode => {
    const orcidValue = value as string;
    return (
      <Group gap="xs" wrap="nowrap">
        <Badge color="green" variant="light">
          ORCID: {orcidValue}
        </Badge>
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
      </Group>
    );
  },
};
