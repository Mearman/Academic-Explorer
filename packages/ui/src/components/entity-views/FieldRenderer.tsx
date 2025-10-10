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
} from "./matchers/index";
import { formatFieldName, groupFields } from "./field-detection";

// Constants for repeated strings
const NOT_AVAILABLE_TEXT = "Not available";
const YES_TEXT = "Yes";
const NO_TEXT = "No";
const ADDITIONAL_INFORMATION_TITLE = "Additional Information";
const TECHNICAL_DETAILS_TITLE = "Technical Details";

interface FieldRendererProps {
  fieldName: string;
  value: unknown;
  onNavigate?: (path: string) => void;
}

/**
 * Renders a single field using the appropriate matcher
 */
export const FieldRenderer: React.FC<FieldRendererProps> = ({
  fieldName,
  value,
  onNavigate,
}) => {
  // Try value matchers first (for special types like DOI, ORCID, etc.)
  const valueMatcher = findValueMatcher(value, fieldName);
  if (valueMatcher) {
    return (
      <Box>
        <Text size="sm" fw={500} mb="xs">
          {formatFieldName(fieldName)}:
        </Text>
        {valueMatcher.render(value, fieldName, onNavigate)}
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
          {arrayMatcher.render(value, fieldName, onNavigate)}
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
          {objectMatcher.render(value, fieldName, onNavigate)}
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
  const matcher = findValueMatcher(value, "");
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
  // Handle null/undefined
  if (value === null || value === undefined) {
    return (
      <Text size="sm" c="dimmed">
        {NOT_AVAILABLE_TEXT}
      </Text>
    );
  }

  // Handle boolean values
  if (typeof value === "boolean") {
    return (
      <Text size="sm" c={value ? "green" : "red"}>
        {value ? YES_TEXT : NO_TEXT}
      </Text>
    );
  }

  // Handle numbers
  if (typeof value === "number") {
    return <Text size="sm">{value.toLocaleString()}</Text>;
  }

  // Handle strings with length-based formatting
  if (typeof value === "string") {
    return renderStringValue(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return <ArrayRenderer array={value} fieldName="" />;
  }

  // Handle objects
  if (typeof value === "object") {
    return (
      <ObjectRenderer obj={value as Record<string, unknown>} fieldName="" />
    );
  }

  // Fallback for other types
  return <Text size="sm">{String(value)}</Text>;
};

/**
 * Renders string values with appropriate formatting based on length
 */
function renderStringValue(value: string): React.ReactElement {
  const MAX_SHORT_LENGTH = 200;
  const MAX_DISPLAY_LENGTH = 500;

  if (value.length > MAX_SHORT_LENGTH) {
    const truncated =
      value.length > MAX_DISPLAY_LENGTH
        ? `${value.substring(0, MAX_DISPLAY_LENGTH)}...`
        : value;

    return (
      <Text size="sm" style={{ lineHeight: 1.6 }}>
        {truncated}
      </Text>
    );
  }

  return <Text size="sm">{value}</Text>;
}

/**
 * Renders all fields of an entity using intelligent grouping and prioritization
 */
export const EntityFieldRenderer: React.FC<{
  entity: OpenAlexEntity | Record<string, unknown>;
  onNavigate?: (path: string) => void;
}> = ({ entity, onNavigate }) => {
  const groupedFields = groupFields(entity);

  return (
    <Stack gap="lg">
      {/* High priority fields first */}
      {groupedFields.high.map(([fieldName, value]) => (
        <FieldRenderer
          key={fieldName}
          fieldName={fieldName}
          value={value}
          onNavigate={onNavigate}
        />
      ))}

      {/* Medium priority fields */}
      {groupedFields.medium.length > 0 && (
        <>
          <Divider />
          <Title order={4}>{ADDITIONAL_INFORMATION_TITLE}</Title>
          {groupedFields.medium.map(([fieldName, value]) => (
            <FieldRenderer
              key={fieldName}
              fieldName={fieldName}
              value={value}
              onNavigate={onNavigate}
            />
          ))}
        </>
      )}

      {/* Low priority fields */}
      {groupedFields.low.length > 0 && (
        <>
          <Divider />
          <Title order={5}>{TECHNICAL_DETAILS_TITLE}</Title>
          <Stack gap="xs">
            {groupedFields.low.map(([fieldName, value]) => (
              <FieldRenderer
                key={fieldName}
                fieldName={fieldName}
                value={value}
                onNavigate={onNavigate}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
};
