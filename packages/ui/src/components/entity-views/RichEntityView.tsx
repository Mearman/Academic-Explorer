import React from "react";
import { Card, Title, Badge, Group, Stack } from "@mantine/core";
import type { OpenAlexEntity } from "@academic-explorer/client";
import { getEntityType } from "@academic-explorer/client";
import { EntityFieldRenderer } from "./FieldRenderer";

interface RichEntityViewProps {
  entity: OpenAlexEntity;
  entityType?: string;
}

const RichEntityView: React.FC<RichEntityViewProps> = ({
  entity,
  entityType,
}) => {
  const detectedType = entityType || getEntityType(entity);

  // Get the primary display name/title for the header
  const getDisplayName = (
    entity: OpenAlexEntity | Record<string, unknown>,
  ): string => {
    const entityAny = entity as any; // Type assertion for flexible access
    return (
      entityAny.display_name ||
      entityAny.title ||
      entityAny.name ||
      `${detectedType} Entity`
    );
  };

  // Get key metrics for the header badges
  const getHeaderMetrics = (
    entity: OpenAlexEntity | Record<string, unknown>,
  ): Array<{ label: string; value: string | number; color?: string }> => {
    const metrics: Array<{
      label: string;
      value: string | number;
      color?: string;
    }> = [];
    const entityAny = entity as any; // Type assertion for flexible access

    if (entityAny.works_count !== undefined && entityAny.works_count !== null) {
      metrics.push({
        label: "Works",
        value: entityAny.works_count.toLocaleString(),
        color: "green",
      });
    }

    if (
      entityAny.cited_by_count !== undefined &&
      entityAny.cited_by_count !== null
    ) {
      metrics.push({
        label: "Citations",
        value: entityAny.cited_by_count.toLocaleString(),
        color: "orange",
      });
    }

    if (entityAny.publication_year) {
      metrics.push({
        label: "Year",
        value: entityAny.publication_year,
        color: "blue",
      });
    }

    if (entityAny.type) {
      metrics.push({
        label: "Type",
        value: entityAny.type,
        color: "purple",
      });
    }

    return metrics;
  };

  return (
    <Stack gap="md">
      {/* Header Card */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} mb="md">
          {getDisplayName(entity)}
        </Title>

        {getHeaderMetrics(entity).length > 0 && (
          <Group mb="md">
            {getHeaderMetrics(entity).map((metric, index) => (
              <Badge
                key={index}
                color={metric.color || "gray"}
                variant="light"
                size="lg"
              >
                {metric.label}: {metric.value}
              </Badge>
            ))}
          </Group>
        )}
      </Card>

      {/* Intelligent Field Rendering */}
      <EntityFieldRenderer entity={entity} />
    </Stack>
  );
};

export { RichEntityView };
