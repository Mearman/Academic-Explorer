# Feature Specification: Full OpenAlex Entity Type Support

**Feature Branch**: `019-full-entity-support`
**Created**: 2025-11-21
**Status**: Near Complete
**Progress**: 9/11 tasks (82%)
**Note**: Core implementation complete. Documentation tasks T010-T011 remain incomplete.
**Input**: User description: "ensure we have FULL support for ALL of these (including licenses) and have corresponding http://localhost:5173/#/{TYPE}/{ID} pages to support them"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access Keyword Entity Pages (Priority: P1)

A researcher exploring academic keywords wants to view detailed information about a specific keyword by navigating to its dedicated page using a direct URL.

**Why this priority**: Keywords are already partially implemented but lack the modern EntityDetailLayout component that provides relationship visualization, consistent UI, and proper loading/error states. This creates an inconsistent user experience compared to other entity types. Completing keyword support ensures UI consistency and delivers full relationship visualization capabilities.

**Independent Test**: Can be fully tested by navigating to `/keywords/{ID}` URLs and verifying that the page displays keyword data using the EntityDetailLayout component with proper loading states, error handling, and relationship visualization.

**Acceptance Scenarios**:

1. **Given** a valid keyword ID (e.g., "artificial-intelligence"), **When** user navigates to `/keywords/artificial-intelligence`, **Then** the keyword detail page displays using EntityDetailLayout with display name, metadata, and relationship components
2. **Given** an encoded keyword ID in the URL, **When** the page loads, **Then** the URL is automatically cleaned to use the decoded version
3. **Given** a keyword page is loaded, **When** user toggles between raw and rich view modes, **Then** the display switches between JSON and formatted EntityDataDisplay appropriately
4. **Given** a keyword with relationships, **When** the page loads, **Then** incoming and outgoing relationship sections display with proper counts and filtering options

---

### User Story 2 - Access Licenses Entity Pages (Priority: N/A - Not Applicable)

**Status**: ❌ **NOT APPLICABLE** - Licenses are not first-class OpenAlex entities

**Research Finding**: After investigating the OpenAlex API documentation and analyzing static cache data during Phase 0 research (T001-T002), it was determined that **licenses are NOT first-class OpenAlex entities**. Licenses appear only as string fields within Work and Source entities (specifically in the `Location.license` field).

**Impact**: This user story cannot be implemented as originally specified because:
1. OpenAlex does not provide a `/licenses` API endpoint
2. Licenses have no unique identifiers or dedicated entity structure
3. Licenses cannot be queried independently - they exist only as properties of works/sources
4. No relationship data exists for licenses in the OpenAlex data model

**Original Intent**: A researcher investigating open access licensing wants to view detailed information about specific license types by accessing dedicated license pages.

**Why this would have been valuable**: Licenses are referenced throughout OpenAlex data (in work locations, sources). Dedicated license pages would have enabled researchers to understand licensing patterns, view all works under a specific license, and analyze open access trends.

**Alternative Implementation**: To achieve similar research goals, users can:
1. Query works/sources filtered by license using OpenAlex API filter parameters
2. Analyze license distribution through work/source aggregations
3. Access license information directly from work/source entity pages

**Scope Adjustment**: Entity type support reduced from originally planned 13 types to 12 types (licenses excluded).

---

### User Story 3 - EntityType and Client Completeness (Priority: P1)

Developers and users expect all OpenAlex entity types to be consistently represented in the type system and API client, ensuring data integrity and preventing runtime errors when encountering new entity references.

**Why this priority**: Type completeness is foundational for all other features. Missing entity types in the EntityType union or API client methods cause TypeScript errors, runtime failures, and prevent users from accessing legitimate OpenAlex data. This must be resolved before implementing user-facing pages to ensure the entire system can handle all entity types correctly.

**Independent Test**: Can be fully tested by verifying TypeScript compilation succeeds, all entity types are present in EntityType union, all types have corresponding API client methods, and all types are included in routing/type guard systems.

**Acceptance Scenarios**:

1. **Given** the EntityType definition in packages/types, **When** TypeScript compilation runs, **Then** all 12 entity types are present in the union without errors (works, authors, sources, institutions, topics, concepts, publishers, funders, keywords, domains, fields, subfields)
2. **Given** the OpenAlex API client, **When** a developer calls client methods, **Then** methods exist for all 12 entity types with proper type signatures
3. **Given** entity type guard functions, **When** runtime type checking occurs, **Then** guards correctly identify all 12 entity types
4. **Given** the ENTITY_TYPE_CONFIGS object, **When** the application renders entity UI, **Then** configurations exist for all 12 types with appropriate icons and colors
5. **Given** autocomplete functionality, **When** users search for entities, **Then** autocomplete routes exist for all applicable entity types

---

### Edge Cases

- What happens when a keyword ID contains special characters or URL-unsafe characters?
  - System must URL-decode keyword IDs and handle percent-encoded characters
  - usePrettyUrl hook should normalize URLs to clean decoded versions

- What happens when a keyword has no associated works or relationships?
  - Empty state components should display appropriately
  - Relationship sections should hide gracefully when counts are zero
  - No errors should occur with empty relationship arrays

- What happens when fetching keyword data fails (404, network error, rate limit)?
  - ErrorState component displays with retry functionality
  - Loading states properly indicate async operations
  - Query retries according to client retry configuration

- What happens when users access taxonomy entities (domains, fields, subfields) expecting relationship visualization?
  - Current implementation correctly disables relationship components for taxonomy entities
  - These entities use hierarchical parent/child relationships, not edge-based relationships
  - This edge case is already handled correctly and should be preserved

## Requirements *(mandatory)*

### Functional Requirements

#### Entity Type System

- **FR-001**: System MUST include all 12 OpenAlex entity types in the EntityType union: works, authors, sources, institutions, topics, concepts, publishers, funders, keywords, domains, fields, subfields
- **FR-002**: System MUST provide TypeScript type definitions for all 12 entity types with Zod schema validation
- **FR-003**: System MUST include all 12 entity types in the OpenAlexEntity union type
- **FR-004**: System MUST include all 12 entity types in the EntityTypeMap mapping

#### API Client Support

- **FR-005**: OpenAlex API client MUST provide methods to fetch data for all 12 entity types
- **FR-006**: Client methods MUST support the select parameter for field-level caching on all applicable entity types
- **FR-007**: Client methods MUST handle URL construction correctly for numeric IDs (domains, fields, subfields) vs alphanumeric IDs (keywords)
- **FR-008**: Client MUST apply consistent retry logic and rate limiting across all entity type endpoints

#### Routing and Navigation

- **FR-009**: System MUST provide route files for keyword entities at `/keywords/{keywordId}`
- **FR-010**: Routes MUST use EntityDetailLayout component for consistent UI presentation
- **FR-011**: Routes MUST implement URL decoding via decodeEntityId utility
- **FR-012**: Routes MUST implement pretty URL normalization via usePrettyUrl hook
- **FR-013**: All entity routes MUST support the select query parameter for field-level data fetching

#### UI and Presentation

- **FR-014**: Keyword pages MUST migrate from legacy EntityDataDisplay to EntityDetailLayout component
- **FR-015**: All entity pages MUST display LoadingState during data fetching
- **FR-016**: All entity pages MUST display ErrorState on fetch failures with retry functionality
- **FR-017**: Entity pages MUST support view mode toggle between raw JSON and rich formatted display

#### Relationship Visualization

- **FR-018**: Keyword pages MUST display IncomingRelationships and OutgoingRelationships components
- **FR-019**: Keyword pages MUST display RelationshipCounts component showing incoming/outgoing totals
- **FR-020**: Relationship components MUST handle empty relationship arrays gracefully (zero counts, hidden sections)

#### Type Guards and Utilities

- **FR-021**: Type guard functions (isEntityType, isOpenAlexId) MUST recognize all 12 entity types
- **FR-022**: URL handling utilities MUST correctly parse and format URLs for all entity types
- **FR-023**: Storage provider interface MUST support caching for all 12 entity types

### Key Entities *(include if feature involves data)*

- **Keyword**: Represents research keywords with display name, citation counts, works count, year-by-year statistics; relationships to works, topics, and concepts
- **EntityType**: Discriminated union type representing all 12 OpenAlex entity categories; used for type-safe routing, API calls, and UI rendering
- **EntityTypeConfig**: Configuration object mapping each entity type to display metadata (name, icon, color); ensures consistent UI presentation across all entity types
- **EntityTypeMap**: TypeScript mapped type linking entity type strings to their corresponding TypeScript interfaces; enables type-safe generic functions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 12 entity types compile without TypeScript errors in strict mode
- **SC-002**: Users can navigate to keyword pages via direct URLs and view complete entity data with relationship visualization
- **SC-003**: Entity detail pages load and display data within 3 seconds under normal network conditions
- **SC-004**: Entity pages handle loading states gracefully with visual indicators visible within 200ms of navigation
- **SC-005**: Entity pages recover from fetch errors with retry buttons that successfully reload data on second attempt
- **SC-006**: All entity routes support the select parameter and fetch only requested fields (verified via network inspection)
- **SC-007**: Full validation pipeline (typecheck + lint + test + build) completes successfully with zero errors
- **SC-008**: All pre-existing tests continue to pass after changes (zero regressions)
- **SC-009**: New entity pages meet accessibility standards (WCAG 2.1 AA) verified via jest-axe in component tests

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature uses strict TypeScript with no `any` types; EntityType union is exhaustive; all entity interfaces derive from Zod schemas with runtime validation
- **Test-First**: User stories include testable acceptance scenarios; implementation will include component tests for new routes, integration tests for API client methods, and E2E tests for page navigation
- **Monorepo Architecture**:
  - EntityType and Zod schemas remain in `packages/types/src/entities/entities.ts` as canonical source
  - API client methods added to `packages/client/src/client.ts` with endpoint-specific handlers
  - Routes added to `apps/web/src/routes/{entityType}/` following existing patterns
  - UI configs remain in `apps/web/src/components/entity-detail/EntityTypeConfig.tsx`
  - Packages MUST NOT re-export EntityType from other internal packages (Constitution Principle III compliance)
- **Storage Abstraction**: Feature uses storage provider interface for entity caching; no direct Dexie/IndexedDB access in new code
- **Performance & Memory**: Success criteria include 3-second load time; tests run serially to prevent OOM; entity pages use React Query for efficient caching
- **Atomic Conventional Commits**: Implementation will use conventional commits (feat, fix, refactor) with atomic scope; each entity type addition committed separately
- **Development-Stage Pragmatism**: Breaking changes to EntityType union are acceptable; no backwards compatibility required for entity type additions; Constitution Principle VII compliance
- **Test-First Bug Fixes**: Any bugs discovered during implementation will have regression tests written before fixes
- **Deployment Readiness**: Implementation must resolve all TypeScript errors; all tests must pass; entire monorepo must build successfully on completion
- **Continuous Execution**: Implementation will proceed through all phases (clarify → plan → tasks → implement) automatically if no outstanding questions after `/speckit.plan`
