/**
 * FieldDisplay component - displays entity field values with on-demand fetching
 * Shows cached values or clickable placeholders for missing data
 */

import React, { useState } from "react";
import { Group, Text, Skeleton, ActionIcon, Tooltip } from "@mantine/core";
import { IconRefresh, IconClick } from "@tabler/icons-react";
import { useFieldFetch } from "@/hooks/use-field-fetch";
import type { EntityType } from "@/config/cache";

interface FieldDisplayProps {
  label: string;
  value: unknown;
  fieldName: string;
  entityId: string;
  entityType: EntityType;
  onDataFetched?: (data: unknown) => void;
  formatter?: (value: unknown) => React.ReactNode;
}

/**
 * Checks if a value is considered "empty" (undefined, null, empty string, empty array)
 */
const isEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

/**
 * Default formatter for field values
 */
const defaultFormatter = (value: unknown): React.ReactNode => {
  if (isEmpty(value)) return null;

  // Handle arrays
  if (Array.isArray(value)) {
    return value.length > 0 ? `${value.length} items` : null;
  }

  // Handle objects
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }

  // Handle primitives
  return String(value);
};

export const FieldDisplay: React.FC<FieldDisplayProps> = ({
  label,
  value,
  fieldName,
  entityId,
  entityType,
  onDataFetched,
  formatter = defaultFormatter,
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [hasBeenFetched, setHasBeenFetched] = useState(!isEmpty(value));

  const { fetchField, isFetching } = useFieldFetch({
    entityId,
    entityType,
    onSuccess: (data) => {
      // Extract the fetched field from the response
      const fetchedValue = (data as Record<string, unknown>)[fieldName];
      setCurrentValue(fetchedValue);
      setHasBeenFetched(true);

      if (onDataFetched) {
        onDataFetched(fetchedValue);
      }
    },
  });

  const handleFetchClick = async () => {
    await fetchField(fieldName);
  };

  const hasValue = !isEmpty(currentValue);

  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <Text size="sm" fw={500} style={{ minWidth: "120px" }}>
        {label}:
      </Text>

      {isFetching ? (
        <Skeleton height={20} width="100%" />
      ) : hasValue ? (
        <Text size="sm" style={{ flex: 1, wordBreak: "break-word" }}>
          {formatter(currentValue)}
        </Text>
      ) : (
        <Group gap="xs" style={{ flex: 1 }}>
          <Text size="sm" c="dimmed" fs="italic">
            {hasBeenFetched ? "No data" : "Not loaded"}
          </Text>
          {!hasBeenFetched && (
            <Tooltip label={`Click to fetch ${label.toLowerCase()}`}>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="blue"
                onClick={handleFetchClick}
                loading={isFetching}
              >
                <IconClick size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          {hasBeenFetched && (
            <Tooltip label="Retry fetch">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                onClick={handleFetchClick}
                loading={isFetching}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      )}
    </Group>
  );
};
