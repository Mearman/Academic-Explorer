# Entity Cards

Reusable card components for displaying OpenAlex entities in the Academic Explorer application.

## Components

### Base Components

#### `EntityCard`

Generic card component that can display any entity type with common fields like display_name, works_count, cited_by_count, and entity type badge.

```tsx
import { EntityCard } from "@academic-explorer/ui";

<EntityCard
  id="https://openalex.org/W2741809807"
  displayName="Example Work"
  entityType="works"
  worksCount={100}
  citedByCount={50}
  description="An example description"
  onNavigate={(path) => navigate({ to: path })}
/>;
```

#### `EntityCardGrid`

Grid layout component that displays collections of entity cards with responsive columns. Automatically selects the appropriate specialized card based on entity type.

```tsx
import { EntityCardGrid } from "@academic-explorer/ui";

<EntityCardGrid
  entities={[work1, author1, source1]}
  onNavigate={(path) => navigate(path)}
  columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
  spacing="md"
/>;
```

### Specialized Cards

#### `WorkCard`

Displays scholarly works with:

- Title and authors
- Publication year and venue
- Citation and reference counts
- Open access status
- DOI and work type

#### `AuthorCard`

Displays researchers with:

- Name and ORCID link
- Primary affiliation
- h-index and i10-index
- Works and citation counts

#### `InstitutionCard`

Displays institutions with:

- Name and location
- Institution type
- Works and citation counts

#### `SourceCard`

Displays journals and venues with:

- Name and publisher
- ISSN and source type
- Open access status
- APC pricing information

#### `TopicCard`

Displays research topics with:

- Name and description
- Field/subfield/domain hierarchy
- Keywords
- Works and citation counts

#### `PublisherCard`

Displays publishers with:

- Name and hierarchy level
- Country codes
- Sources and works counts

#### `FunderCard`

Displays funding organizations with:

- Name and homepage link
- Country and description
- Grants, works, and citation counts
- h-index and i10-index

## Usage in Entity Pages

All card components support an `onNavigate` callback for handling navigation:

```tsx
import { useNavigate } from "@tanstack/react-router";
import { WorkCard } from "@academic-explorer/ui";

const MyComponent = () => {
  const navigate = useNavigate();

  return <WorkCard work={work} onNavigate={(path) => navigate({ to: path })} />;
};
```

## Usage in List Pages

Use `EntityCardGrid` to display collections of mixed entity types:

```tsx
import { EntityCardGrid } from "@academic-explorer/ui";

<EntityCardGrid
  entities={searchResults}
  onNavigate={(path) => navigate({ to: path })}
  columns={{ base: 1, sm: 2, md: 3 }}
/>;
```

## Styling

All cards use Mantine components and follow the theme configuration. Cards are:

- Responsive
- Clickable (when `onNavigate` is provided)
- Consistent in layout and styling
- Support dark/light mode through Mantine theme

## Type Safety

All card components are fully typed with TypeScript and use entity types from `@academic-explorer/client`.
