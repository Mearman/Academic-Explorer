/**
 * Reusable field rendering components that use the intelligent matcher system
 */

import React from "react";
import { Text, Group, Stack, Box, Card, Title, Divider } from "@mantine/core";
import type { OpenAlexEntity } from "@academic-explorer/client";
import {
  findArrayMatcher,
  findObjectMatcher,
  findValueMatcher,
} from "./matchers";
import {
  formatFieldName,
  groupFields,
  type FieldPriority,
} from "./field-detection";

interface FieldRendererProps {
  fieldName: string;
  value: unknown;
}

/**
 * Convert FieldPriority to numeric priority for matchers
 */
function priorityToNumber(priority: FieldPriority): number {
  switch (priority) {
    case "high":
      return 10;
    case "medium":
      return 5;
    case "low":
      return 1;
    default:
      return 5;
  }
}

/**
 * Renders a single field using the appropriate matcher
 */
export const FieldRenderer: React.FC<FieldRendererProps> = ({
  fieldName,
  value,
}) => {
  // Try value matchers first (for special types like DOI, ORCID, etc.)
  const valueMatcher = findValueMatcher(value);
  if (valueMatcher) {
    return (
      <Box>
        <Text size="sm" fw={500} mb="xs">
          {formatFieldName(fieldName)}:
        </Text>
        {valueMatcher.render(value, fieldName)}
      </Box>
    );
  }

  // Try array matchers
  if (Array.isArray(value)) {
    const arrayMatcher = findArrayMatcher(value);
    if (arrayMatcher) {
      return (
        <Box>
          <Text size="sm" fw={500} mb="xs">
            {formatFieldName(fieldName)}:
          </Text>
          {arrayMatcher.render(value, fieldName)}
        </Box>
      );
    }
  }

  // Try object matchers
  if (typeof value === "object" && value !== null) {
    const objectMatcher = findObjectMatcher(value);
    if (objectMatcher) {
      return (
        <Box>
          <Text size="sm" fw={500} mb="xs">
            {formatFieldName(fieldName)}:
          </Text>
          {objectMatcher.render(value, fieldName)}
        </Box>
      );
    }
  }

  // Fallback to default rendering
  return (
    <Box>
      <Text size="sm" fw={500} mb="xs">
        {formatFieldName(fieldName)}:
      </Text>
      <DefaultValueRenderer value={value} />
    </Box>
  );
};

/**
 * Renders an array of fields
 */
export const ArrayRenderer: React.FC<{
  array: unknown[];
  fieldName: string;
}> = ({ array, fieldName }) => {
  const matcher = findArrayMatcher(array);
  if (matcher) {
    return matcher.render(array, fieldName);
  }

  // Fallback: render as list
  return (
    <Stack gap="xs">
      {array.map((item, index) => (
        <Card key={index} padding="xs" radius="sm" withBorder>
          <ValueRenderer value={item} />
        </Card>
      ))}
    </Stack>
  );
};

/**
 * Renders an object of fields
 */
export const ObjectRenderer: React.FC<{
  obj: Record<string, unknown>;
  fieldName: string;
}> = ({ obj, fieldName }) => {
  const matcher = findObjectMatcher(obj);
  if (matcher) {
    return matcher.render(obj, fieldName);
  }

  // Fallback: render as key-value pairs
  return (
    <Stack gap="xs">
      {Object.entries(obj).map(([key, value]) => (
        <Group key={key} justify="space-between" wrap="nowrap">
          <Text size="sm" fw={500}>
            {formatFieldName(key)}:
          </Text>
          <Box style={{ flex: 1, marginLeft: "8px" }}>
            <ValueRenderer value={value} />
          </Box>
        </Group>
      ))}
    </Stack>
  );
};

/**
 * Renders a single value
 */
export const ValueRenderer: React.FC<{ value: unknown }> = ({ value }) => {
  const matcher = findValueMatcher(value);
  if (matcher) {
    return matcher.render(value, "");
  }

  return <DefaultValueRenderer value={value} />;
};

/**
 * Default renderer for values that don't have special matchers
 */
export const DefaultValueRenderer: React.FC<{ value: unknown }> = ({
  value,
}) => {
  if (value === null || value === undefined) {
    return (
      <Text size="sm" c="dimmed">
        Not available
      </Text>
    );
  }

  if (typeof value === "boolean") {
    return (
      <Text size="sm" c={value ? "green" : "red"}>
        {value ? "Yes" : "No"}
      </Text>
    );
  }

  if (typeof value === "number") {
    return <Text size="sm">{value.toLocaleString()}</Text>;
  }

  if (typeof value === "string") {
    // Check if it's a long string (likely abstract or description)
    if (value.length > 200) {
      return (
        <Text size="sm" style={{ lineHeight: 1.6 }}>
          {value.length > 500 ? `${value.substring(0, 500)}...` : value}
        </Text>
      );
    }
    return <Text size="sm">{value}</Text>;
  }

  if (Array.isArray(value)) {
    return <ArrayRenderer array={value} fieldName="" />;
  }

  if (typeof value === "object" && value !== null) {
    return (
      <ObjectRenderer obj={value as Record<string, unknown>} fieldName="" />
    );
  }

  return <Text size="sm">{String(value)}</Text>;
};

/**
 * Renders all fields of an entity using intelligent grouping and prioritization
 */
export const EntityFieldRenderer: React.FC<{
  entity: OpenAlexEntity | Record<string, unknown>;
}> = ({ entity }) => {
  const groupedFields = groupFields(entity);

  return (
    <Stack gap="lg">
      {/* High priority fields first */}
      {groupedFields.high.map(([fieldName, value]) => (
        <FieldRenderer key={fieldName} fieldName={fieldName} value={value} />
      ))}

      {/* Medium priority fields */}
      {groupedFields.medium.length > 0 && (
        <>
          <Divider />
          <Title order={4}>Additional Information</Title>
          {groupedFields.medium.map(([fieldName, value]) => (
            <FieldRenderer
              key={fieldName}
              fieldName={fieldName}
              value={value}
            />
          ))}
        </>
      )}

      {/* Low priority fields */}
      {groupedFields.low.length > 0 && (
        <>
          <Divider />
          <Title order={5}>Technical Details</Title>
          <Stack gap="xs">
            {groupedFields.low.map(([fieldName, value]) => (
              <FieldRenderer
                key={fieldName}
                fieldName={fieldName}
                value={value}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
};
