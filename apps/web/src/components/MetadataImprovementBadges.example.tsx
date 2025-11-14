/**
 * MetadataImprovementBadges Usage Example
 *
 * This file demonstrates how to integrate the MetadataImprovementBadges component
 * into work detail pages.
 *
 * NOTE: This is an example file showing the intended usage pattern.
 * Actual integration into EntityDetailLayout will be done in a future commit.
 */

import { Stack, Title, Text } from "@mantine/core";
import { MetadataImprovementBadges } from "./MetadataImprovementBadges";

/**
 * Example 1: Basic usage in a work detail page
 *
 * This shows the simplest integration - just pass the work object
 * and the component handles everything else.
 */
export function BasicUsageExample() {
	// Example work with improved metadata
	const work = {
		id: "https://openalex.org/W2741809807",
		display_name: "Example Work with Improved Metadata",
		referenced_works_count: 25,
		locations_count: 4,
		is_xpac: false,
		// ... other work fields
	};

	return (
		<Stack gap="md">
			<Title order={2}>{work.display_name}</Title>

			{/* Improvement badges - renders automatically if improvements exist */}
			<MetadataImprovementBadges work={work} />

			<Text>Work content goes here...</Text>
		</Stack>
	);
}

/**
 * Example 2: Integration suggestion for EntityDetailLayout
 *
 * This shows where the badges would fit in the existing EntityDetailLayout structure.
 * The badges should appear prominently near the title for works with improvements.
 */
export function EntityDetailLayoutIntegrationExample() {
	return `
    {/* In EntityDetailLayout.tsx, after the entity type badge: */}

    <Stack gap="lg" flex={1}>
      <Badge
        size="xl"
        variant="light"
        color={getMantineColor(entityType)}
        leftSection={...}
      >
        {config.name}
      </Badge>

      <Title order={1} size="h1">
        {displayName}
      </Title>

      {/* NEW: Add metadata improvement badges for works */}
      {entityType === "work" && (
        <MetadataImprovementBadges
          work={data as WorkMetadata}
          data-testid="work-improvement-badges"
        />
      )}

      <Paper p="md" radius="lg" withBorder>
        {/* Entity ID and select fields info */}
      </Paper>
    </Stack>
  `;
}

/**
 * Example 3: Conditional rendering based on improvements
 *
 * This shows how to use the component with conditional rendering logic
 * if you need to show/hide surrounding UI elements.
 */
export function ConditionalRenderingExample() {
	const work = {
		referenced_works_count: 15,
		locations_count: 2,
		is_xpac: false,
	};

	// Import the detection utility if you need to check for improvements
	// before rendering surrounding UI
	// import { hasMetadataImprovements } from '@academic-explorer/utils';

	// Note: The component already handles null rendering internally,
	// so explicit conditional rendering is usually not needed
	return (
		<Stack gap="sm">
			{/* No need for conditional - component handles it */}
			<MetadataImprovementBadges work={work} />

			{/* Component returns null if no improvements, so no empty space is rendered */}
		</Stack>
	);
}

/**
 * Example 4: Integration in a work list view
 *
 * Shows how badges can be used in list views alongside work titles
 */
export function WorkListItemExample() {
	const work = {
		id: "https://openalex.org/W2741809807",
		display_name: "Machine Learning Approaches for Cultural Heritage",
		cited_by_count: 142,
		referenced_works_count: 38,
		locations_count: 3,
		is_xpac: false,
	};

	return (
		<Stack gap="xs">
			<Title order={4}>{work.display_name}</Title>

			{/* Badges in list view */}
			<MetadataImprovementBadges work={work} />

			<Text size="sm" c="dimmed">
				Cited by {work.cited_by_count} works
			</Text>
		</Stack>
	);
}
