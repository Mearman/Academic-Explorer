/**
 * Example usage of entity card components
 *
 * This file demonstrates how to use the entity card components
 * in your application. These examples are for documentation purposes.
 *
 * Note: This file is meant to be used in the main application (apps/web)
 * where @tanstack/react-router is available.
 */

import type {
	Author,
	InstitutionEntity,
	Work,
} from "@academic-explorer/client";
import { EntityCardGrid, WorkCard } from "./index";

// Example 1: Display a single work card
export function SingleWorkExample({
  work,
  onNavigate,
}: {
  work: Work;
  onNavigate: (path: string) => void;
}) {
  return <WorkCard work={work} onNavigate={onNavigate} showAuthors={true} />;
}

// Example 2: Display a grid of mixed entities
export function MixedEntitiesExample({
  works,
  authors,
  institutions,
  onNavigate,
}: {
  works: Work[];
  authors: Author[];
  institutions: InstitutionEntity[];
  onNavigate: (path: string) => void;
}) {
  const allEntities = [...works, ...authors, ...institutions];

  return (
    <EntityCardGrid
      entities={allEntities}
      onNavigate={onNavigate}
      columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
      spacing="md"
    />
  );
}

// Example 3: Related authors section on a work page
export function RelatedAuthorsSection({
  authors,
  onNavigate,
}: {
  authors: Author[];
  onNavigate: (path: string) => void;
}) {
  return (
    <div>
      <h2>Authors</h2>
      <EntityCardGrid
        entities={authors}
        onNavigate={onNavigate}
        columns={{ base: 1, sm: 2, md: 3 }}
        spacing="sm"
      />
    </div>
  );
}

// Example 4: Search results display
export function SearchResults({
  results,
  onNavigate,
}: {
  results: Array<Work | Author | InstitutionEntity>;
  onNavigate: (path: string) => void;
}) {
  if (results.length === 0) {
    return <div>No results found</div>;
  }

  return (
    <div>
      <h2>{results.length} results</h2>
      <EntityCardGrid
        entities={results}
        onNavigate={onNavigate}
        columns={{ base: 1, sm: 2, lg: 3 }}
      />
    </div>
  );
}
