import { ActionIcon, Badge, Group } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import React from "react";
import type { ValueMatcher } from "../types";

export const rorMatcher: ValueMatcher = {
  name: "ror",
  priority: 8,
  detect: (value: unknown): boolean => {
    if (typeof value !== "string") return false;
    return /^0[a-zA-Z0-9]{8}$/.test(value);
  },
  render: ({
    value,
    _fieldName,
  }: {
    value: unknown;
    _fieldName: string;
  }): React.ReactNode => {
    const rorValue = value as string;
    return (
      <Group gap="xs" wrap="nowrap">
        <Badge color="orange" variant="light">
          ROR: {rorValue}
        </Badge>
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
      </Group>
    );
  },
};
