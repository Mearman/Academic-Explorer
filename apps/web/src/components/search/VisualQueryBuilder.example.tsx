/**
 * Example usage of the VisualQueryBuilder component
 * This demonstrates how to integrate the visual query builder into your application
 */

import React, { useState } from "react";
import { Container, Title, Space, Group, Button, Code } from "@mantine/core";
import { VisualQueryBuilder, type VisualQuery } from "./VisualQueryBuilder";
import type { EntityType } from "@academic-explorer/client";
import { logger } from "@academic-explorer/utils";

export function VisualQueryBuilderExample() {
  const [entityType, setEntityType] = useState<EntityType>("works");
  const [currentQuery, setCurrentQuery] = useState<VisualQuery | null>(null);
  const [appliedQuery, setAppliedQuery] = useState<VisualQuery | null>(null);

  const handleQueryChange = (query: VisualQuery) => {
    setCurrentQuery(query);
  };

  const handleQueryApply = (query: VisualQuery) => {
    setAppliedQuery(query);
    // Here you would typically execute the query against the OpenAlex API
    logger.debug("visual-query-builder", "Applied query", { query });
  };

  const switchEntityType = (newType: EntityType) => {
    setEntityType(newType);
    setCurrentQuery(null);
    setAppliedQuery(null);
  };

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="lg">
        Visual Query Builder Demo
      </Title>

      <Group mb="lg">
        <Button
          variant={entityType === "works" ? "filled" : "outline"}
          onClick={() => switchEntityType("works")}
        >
          Works
        </Button>
        <Button
          variant={entityType === "authors" ? "filled" : "outline"}
          onClick={() => switchEntityType("authors")}
        >
          Authors
        </Button>
        <Button
          variant={entityType === "sources" ? "filled" : "outline"}
          onClick={() => switchEntityType("sources")}
        >
          Sources
        </Button>
        <Button
          variant={entityType === "institutions" ? "filled" : "outline"}
          onClick={() => switchEntityType("institutions")}
        >
          Institutions
        </Button>
      </Group>

      <VisualQueryBuilder
        entityType={entityType}
        onQueryChange={handleQueryChange}
        onApply={handleQueryApply}
      />

      <Space h="xl" />

      {currentQuery && (
        <div>
          <Title order={3} mb="md">
            Current Query Structure
          </Title>
          <Code block>
            {JSON.stringify(currentQuery, null, 2)}
          </Code>
        </div>
      )}

      <Space h="lg" />

      {appliedQuery && (
        <div>
          <Title order={3} mb="md">
            Applied Query (Ready for API Execution)
          </Title>
          <Code block>
            {JSON.stringify(appliedQuery, null, 2)}
          </Code>
        </div>
      )}
    </Container>
  );
}

// Example of how to convert the visual query to OpenAlex API parameters
export function convertQueryToOpenAlexParams(query: VisualQuery): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  // This is a placeholder implementation
  // In a real application, you would convert the visual query structure
  // to actual OpenAlex API filter parameters

  for (const group of query.groups) {
    if (group.chips.length === 0) continue;

    const filters: string[] = [];

    for (const chip of group.chips) {
      if (chip.type === "field" && chip.field) {
        // Convert field chips to filter parameters
        // Example: display_name field becomes a search parameter
        if (chip.field === "display_name") {
          filters.push(`display_name.search:${chip.label}`);
        } else if (chip.field === "publication_year") {
          filters.push(`publication_year:${chip.label}`);
        }
        // Add more field conversions as needed
      }
    }

    if (filters.length > 0) {
      // Combine filters with the group's logical operator
      const filterString = filters.join(`,${group.operator.toLowerCase()},`);
      params.filter = filterString;
    }
  }

  return params;
}

// Usage example:
/*
import { VisualQueryBuilderExample } from "./components/search/VisualQueryBuilder.example";

function App() {
  return (
    <MantineProvider>
      <VisualQueryBuilderExample />
    </MantineProvider>
  );
}
*/