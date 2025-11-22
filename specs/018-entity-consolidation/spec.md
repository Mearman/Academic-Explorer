# Feature Specification: OpenAlex Entity Definition Consolidation

**Feature Branch**: `018-entity-consolidation`
**Created**: 2025-11-21
**Status**: Draft
**Input**: User description: "I think there are still many places we list the OpenAlex entity permutations, classifications, identifications, types, etc. Identify, unify, deduplicate and centralise them into the types package"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Source of Truth for Entity Definitions (Priority: P1)

As a developer working on the Bibliom codebase, I need all OpenAlex entity type definitions to exist in one canonical location so that changes to entity metadata propagate consistently across all packages without requiring updates in multiple places.

**Why this priority**: This is P1 because duplicated entity definitions create maintenance burden, risk of inconsistency, and potential bugs when definitions drift apart. Having already centralized entity metadata in spec-017, we need to eliminate remaining duplicates and ensure all packages reference the single source.

**Independent Test**: Can be fully tested by searching the entire codebase for entity type definitions (EntityType, entity type lists, ID prefixes) and verifying that all definitions reference `@academic-explorer/types` and no duplicates exist.

**Acceptance Scenarios**:

1. **Given** a developer searches for `EntityType` definitions, **When** they review all results, **Then** only one canonical definition exists in `packages/types/src/entities/entities.ts`
2. **Given** a developer searches for entity ID prefixes (W, A, S, I, etc.), **When** they review all results, **Then** all prefixes are sourced from `ENTITY_METADATA` in the types package
3. **Given** a developer updates entity metadata in the types package, **When** they rebuild the project, **Then** all packages automatically reflect the updated metadata
4. **Given** a developer adds a new entity type to the types package, **When** they run TypeScript type checking, **Then** any code using incomplete entity type unions fails to compile

---

### User Story 2 - Consistent Entity Metadata Across Packages (Priority: P1)

As a developer working on graph visualizations, entity detection, or storage operations, I need entity metadata (colors, icons, display names, ID prefixes) to be consistent across all packages so that the same entity type always has the same visual representation and behavior.

**Why this priority**: This is P1 because inconsistent metadata creates user-facing bugs (e.g., Works showing as blue in one component but green in another) and developer confusion when different packages have different entity definitions.

**Independent Test**: Can be fully tested by auditing all entity color, icon, and display name usage across packages and verifying they all resolve to the same centralized metadata values.

**Acceptance Scenarios**:

1. **Given** a Work entity is rendered in the graph package, **When** its color is determined, **Then** it uses the color defined in `ENTITY_METADATA.works.color`
2. **Given** an Author entity is displayed in the web UI, **When** its icon is rendered, **Then** it uses the icon defined in `ENTITY_METADATA.authors.icon`
3. **Given** a Source entity is shown in a list, **When** its display name is shown, **Then** it uses the plural form from `ENTITY_METADATA.sources.plural`
4. **Given** an Institution entity needs routing, **When** its route path is constructed, **Then** it uses `ENTITY_METADATA.institutions.routePath`

---

### User Story 3 - Type-Safe Entity Operations (Priority: P2)

As a developer implementing entity-related features, I need TypeScript to enforce that all entity type strings are valid members of the EntityType union so that invalid entity types are caught at compile time instead of causing runtime errors.

**Why this priority**: This is P2 because while important for developer experience and bug prevention, it's a quality-of-life improvement rather than a critical bug fix. P1 tasks ensure correctness; this ensures maintainability.

**Independent Test**: Can be fully tested by attempting to use invalid entity type strings in type-safe functions and verifying TypeScript compilation fails with clear error messages.

**Acceptance Scenarios**:

1. **Given** a developer calls `getEntityMetadata()` with an invalid type, **When** they compile TypeScript, **Then** compilation fails with a type error
2. **Given** a developer uses an entity type in a switch statement, **When** they forget to handle all cases, **Then** TypeScript exhaustiveness checking catches the omission
3. **Given** a developer imports an entity type constant, **When** they use autocomplete, **Then** their IDE suggests only valid entity types from the centralized definition
4. **Given** a function parameter is typed as `EntityType`, **When** a developer passes a string literal, **Then** TypeScript enforces the string is a valid entity type

---

### Edge Cases

- What happens when a package defines entity types as a subset (e.g., only works/authors/sources) but the types package contains all 12 types?
- How does the system handle deprecated entity type aliases (e.g., singular vs plural forms)?
- What happens when entity metadata fields differ across packages (e.g., graph package has color but utils package doesn't)?
- How does the system migrate from multiple EntityType definitions to a single source without breaking existing code?
- What happens when external libraries (Dexie schemas, MSW handlers) use hardcoded entity type strings?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST have exactly one canonical `EntityType` definition in `packages/types/src/entities/entities.ts`
- **FR-002**: All packages MUST import `EntityType` from `@academic-explorer/types` instead of defining it locally
- **FR-003**: System MUST provide helper functions (`isEntityType`, `toEntityType`, `detectEntityType`) in the types package for entity type validation and conversion
- **FR-004**: All entity metadata (colors, icons, display names, ID prefixes, route paths) MUST be sourced from `ENTITY_METADATA` in the types package
- **FR-005**: Package tsconfig files MUST include `@academic-explorer/types` in their project references to enable proper TypeScript module resolution
- **FR-006**: System MUST eliminate all duplicate `EntityType` definitions in `packages/graph/src/types/core.ts`, `packages/utils/src/storage/catalogue-db.ts`, and `packages/utils/src/cache-browser/types.ts`
- **FR-007**: System MUST maintain backward compatibility for existing imports by re-exporting types from the graph package (with deprecation warnings)
- **FR-008**: System MUST validate that all hardcoded entity type strings in test fixtures, MSW handlers, and database schemas match the canonical EntityType union

### Key Entities *(include if feature involves data)*

- **EntityType Union**: Canonical union type of all 12 OpenAlex entity types (works, authors, sources, institutions, topics, concepts, publishers, funders, keywords, domains, fields, subfields)
- **EntityMetadataEntry**: Comprehensive metadata structure containing displayName, plural, description, color, icon, idPrefix, routePath, and singularForm for each entity type
- **ENTITY_METADATA Constant**: Record mapping each EntityType to its EntityMetadataEntry, serving as the single source of truth for all entity-related metadata
- **Helper Functions**: Type guards (isEntityType), converters (toEntityType, toSingularForm), and detectors (detectEntityType) that operate on the canonical EntityType definition

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero duplicate `EntityType` definitions exist in the codebase (verified by grep/search)
- **SC-002**: All entity metadata references (colors, icons, display names) resolve to `ENTITY_METADATA` in the types package (verified by code audit)
- **SC-003**: TypeScript compilation passes with no errors after consolidation (verified by `pnpm typecheck`)
- **SC-004**: All 738 existing tests continue to pass after consolidation (verified by `pnpm test`)
- **SC-005**: Build completes successfully for all 8 projects (verified by `pnpm build`)
- **SC-006**: No hardcoded entity type strings exist outside of the types package definition (verified by grep with regex `type.*=.*["']works["']`)
- **SC-007**: Adding a new entity type requires changes in only one file (`packages/types/src/entities/entity-metadata.ts`)
- **SC-008**: IDE autocomplete suggests valid entity types when using EntityType-typed parameters (verified manually in VSCode/WebStorm)

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature eliminates type duplication and uses strict TypeScript union types to prevent invalid entity type usage
- **Test-First**: Existing test suite must pass; no new tests required as this is a refactoring task
- **Monorepo Architecture**: Changes span multiple packages (types, graph, utils, web) but maintain clear dependency hierarchy (all depend on types package)
- **Storage Abstraction**: Catalogue database entity types will reference the centralized definition instead of local duplicates
- **Performance & Memory**: No runtime performance impact; purely compile-time type safety improvements
- **Atomic Conventional Commits**: Implementation will be committed in logical chunks (e.g., "refactor(types): consolidate EntityType definitions", "refactor(graph): remove duplicate EntityType", "refactor(utils): import EntityType from types package")
- **Development-Stage Pragmatism**: Breaking changes acceptable in non-exported APIs; public APIs will maintain backward compatibility via re-exports
- **Test-First Bug Fixes**: If consolidation reveals entity type mismatches, regression tests will be written before fixes

## Assumptions

1. The existing `ENTITY_METADATA` in `packages/types/src/entities/entity-metadata.ts` (created in spec-017) is the correct single source of truth
2. All 12 entity types (works, authors, sources, institutions, topics, concepts, publishers, funders, keywords, domains, fields, subfields) are final and complete
3. Packages are allowed to depend on the types package without creating circular dependencies
4. TypeScript project references are properly configured to enable cross-package type resolution
5. Test fixtures and MSW handlers can be updated to import from the centralized definition without breaking test isolation
6. Database schemas (Dexie) can reference TypeScript types without requiring runtime imports

## Dependencies

- **Depends On**: Spec-017 (Entity Taxonomy Centralization) - must be complete as it created the initial `ENTITY_METADATA`
- **Blocks**: Future entity-related features that would benefit from having a single source of truth
- **Related**: Storage abstraction (spec-001), catalogue tests (spec-002), relationship visualization (spec-016)

## Out of Scope

- Adding new entity types beyond the existing 12
- Changing entity metadata values (colors, icons, display names) - only consolidating definitions
- Migrating OpenAlex API schemas or Zod validators
- Refactoring entity detection logic in `packages/graph/src/services/entity-detection-service.ts`
- Converting entity type strings in static JSON data files (`apps/web/public/data/openalex/**/*.json`)
- Updating documentation or CLAUDE.md files (separate task)
