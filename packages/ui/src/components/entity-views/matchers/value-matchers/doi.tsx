import { ActionIcon, Badge, Group } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import React from "react";
import type { ValueMatcher } from "../types";

export const doiMatcher: ValueMatcher = {
  name: "doi",
  priority: 10,
  detect: (value: unknown): boolean => {
    if (typeof value !== "string") return false;
    return /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i.test(value);
  },
  render: (
    value: unknown,
    fieldName: string,
    onNavigate?: (path: string) => void,
  ): React.ReactNode => {
    const doiValue = value as string;
    return (
      <Group gap="xs" wrap="nowrap">
        <Badge color="blue" variant="light">
          DOI: {doiValue}
        </Badge>
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
      </Group>
    );
  },
};
