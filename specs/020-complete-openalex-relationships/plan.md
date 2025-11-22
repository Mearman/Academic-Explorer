# Implementation Plan: Complete OpenAlex Relationship Support

**Branch**: `020-complete-openalex-relationships` | **Date**: 2025-11-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-complete-openalex-relationships/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement detection and visualization for all remaining OpenAlex relationship types across 12 entity types. This feature adds support for 10+ missing relationship categories including work funding (grants), work keywords, legacy concepts, entity-topic relationships with metadata (count/score), institutional repositories, and cross-entity role mappings. The implementation extends the existing relationship detection service with 6 new analyzer methods and enhances MinimalEntityData interfaces with relationship fields for all entity types. Success criteria include 100% detection accuracy, sub-5-second performance for 25+ relationships, and complete backward compatibility with existing graph visualization.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled (`strict: true`, `strictNullChecks: true`, `noImplicitAny: false`)

**Primary Dependencies**:
- `@academic-explorer/client` (OpenAlex API client with caching)
- `@academic-explorer/graph` (graph data structures, relationship types)
- `@academic-explorer/types` (shared type definitions)
- React 19 (for visualization components)
- Mantine UI (for relationship display components)

**Storage**: IndexedDB via Dexie (storage provider interface abstraction) - No new storage operations required, uses existing graph data structures in memory

**Testing**: Vitest (serial execution), @testing-library/react, MSW for API mocking, fake-indexeddb for storage tests

**Target Platform**: Web browser (Chrome, Firefox, Safari, Edge - ES2022 target)

**Project Type**: Monorepo web application (apps/web + packages/client, graph, types, ui, utils)

**Performance Goals**:
- Relationship detection <2 seconds per entity load
- Graph rendering <5 seconds for entities with 25+ relationships
- 100% detection accuracy (no false negatives for API-provided data)
- Memory efficient (no memory leaks from relationship tracking)

**Constraints**:
- Serial test execution only (parallel causes OOM errors with 8GB heap)
- No `any` types permitted (strict TypeScript enforcement)
- All changes must maintain passing typecheck/test/build pipeline
- Must not break existing relationship detection (16 existing types)

**Scale/Scope**:
- 10+ new relationship types across 12 OpenAlex entity types
- 36 functional requirements
- 8 prioritized user stories (P1: funding/keywords, P2: entity topics, P3: legacy/specialized)
- 6 new analyzer helper methods in relationship-detection-service.ts
- 6+ MinimalEntityData interface extensions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Bibliom Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types planned. All relationship data structures will use proper typed interfaces (GrantRelationship, KeywordRelationship, TopicWithMetadata, etc.). Unknown data from API will use `unknown` with type guards.

2. **Test-First Development**: ✅ Tests will be written and verified to FAIL before implementation begins. Test pattern: `[component].[type].test.ts` (e.g., `relationship-detection.unit.test.ts`, `grant-visualization.component.test.tsx`)

3. **Monorepo Architecture**: ✅ Changes isolated to:
   - `apps/web/src/services/relationship-detection-service.ts` (detection logic)
   - `packages/client/src/advanced-field-selection.ts` (API field selections)
   - `packages/types/src/` (MinimalEntityData interfaces)
   - No new packages created. No re-exports between internal packages.

4. **Storage Abstraction**: ✅ No new storage operations required. Relationship detection operates on in-memory graph data structures provided by existing storage layer.

5. **Performance & Memory**: ✅ Tests run serially (maxConcurrency: 1). Performance success criteria defined (SC-009: <5s for 25+ relationships). No heavy computation requiring Web Workers.

6. **Atomic Conventional Commits**: ✅ Commits will be incremental and atomic:
   - `feat(client): add grants/keywords/concepts to works field selections`
   - `feat(types): extend MinimalEntityData with relationship fields`
   - `feat(web): implement analyzeGrantRelationshipsForWork helper`
   - Spec changes committed after each phase: `docs(spec-020): complete Phase X`

7. **Development-Stage Pragmatism**: ✅ Breaking changes acceptable if needed for MinimalEntityData interfaces. No backward compatibility required during development.

8. **Test-First Bug Fixes**: ✅ Any bugs discovered during implementation will have regression tests written before fixes.

9. **Deployment Readiness**: ✅ All packages must pass `pnpm validate` before work is complete. Pre-existing issues must be resolved or documented.

10. **Continuous Execution**: ✅ Work will continue without pausing through all phases. After `/speckit.plan`, will automatically invoke `/speckit.tasks` then `/speckit.implement` if no blockers exist.

**Complexity Justification Required?** NO
- No new packages/apps added
- No new storage provider implementations required
- No new worker threads needed
- Extends existing relationship detection service following established patterns
- Follows YAGNI: only implementing relationships that exist in OpenAlex API

## Project Structure

### Documentation (this feature)

```text
specs/020-complete-openalex-relationships/
├── spec.md              # Feature specification (COMPLETE)
├── checklists/
│   └── requirements.md  # Specification quality checklist (COMPLETE)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (NEXT)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (relationship analyzer contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/
├── client/
│   └── src/
│       ├── advanced-field-selection.ts  # ADD: grants, keywords, concepts, topics fields
│       └── entities/
│           ├── works.ts                 # MODIFY: Add relationship field fetching
│           ├── authors.ts               # MODIFY: Add topics field fetching
│           ├── sources.ts               # MODIFY: Add topics field fetching
│           └── institutions.ts          # MODIFY: Add repositories/roles field fetching
│
├── types/
│   └── src/
│       ├── minimal-entity-data.ts       # MODIFY: Add relationship fields to interfaces
│       ├── grants.ts                    # ADD: Grant type definitions
│       ├── keywords.ts                  # ADD: Keyword type definitions
│       └── repositories.ts              # ADD: Repository type definitions
│
├── graph/
│   └── src/
│       └── types.ts                     # VERIFY: RelationType enum has all required types
│
└── ui/
    └── src/
        └── components/
            └── relationship/            # EXTEND: May need new visualization components

apps/
└── web/
    └── src/
        ├── services/
        │   ├── relationship-detection-service.ts  # MODIFY: Add 6 new analyzer methods
        │   ├── graph-data-service.ts              # VERIFY: Integration with new relationships
        │   └── entity-data-service.ts             # VERIFY: Field fetching complete
        │
        ├── components/
        │   └── relationship/
        │       ├── IncomingRelationships.tsx      # VERIFY: Handles new relationship types
        │       ├── OutgoingRelationships.tsx      # VERIFY: Handles new relationship types
        │       └── RelationshipSection.tsx        # VERIFY: Label mapping for new types
        │
        └── routes/
            ├── works/$_.lazy.tsx        # VERIFY: New relationships displayed
            ├── authors/$_.lazy.tsx      # VERIFY: Topic relationships displayed
            ├── sources/$sourceId.lazy.tsx        # VERIFY: Topic relationships displayed
            └── institutions/$_.lazy.tsx  # VERIFY: Repository/role relationships displayed

tests/
└── [co-located with source files using pattern: *.unit.test.ts, *.component.test.tsx, *.integration.test.ts]
```

**Structure Decision**: Monorepo web application structure. Changes span multiple packages but follow existing architectural patterns:
- **packages/client**: API field selection extensions (what to fetch)
- **packages/types**: Type definitions for relationship data
- **apps/web/src/services**: Relationship detection logic (how to analyze)
- **apps/web/src/components**: Visualization integration (how to display)

This avoids creating new packages and extends existing functionality in-place.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution principles satisfied by design.

---

## Phase 0: Research

**Objective**: Resolve all NEEDS CLARIFICATION markers from Technical Context. Identify best practices for implementing OpenAlex relationship detection.

### Research Tasks

1. **OpenAlex Grant Data Structure**
   - Investigate work.grants[] API response format
   - Document grant object fields: funder ID, funder display name, award ID
   - Verify grant data availability across entity types
   - Research: curl works endpoint with grants filter, examine response structure

2. **OpenAlex Keyword Data Structure**
   - Investigate work.keywords[] API response format
   - Document keyword object fields: ID, display name, score
   - Verify keyword completeness (some works may lack keywords)
   - Research: curl works endpoint with keywords, examine data quality

3. **OpenAlex Concept Data Structure (Legacy)**
   - Investigate work.concepts[] API response format (deprecated but still in data)
   - Document concept fields: ID, display name, level, score, wikidata
   - Understand difference between concepts (legacy) and topics (current)
   - Research: curl works with both concepts and topics to compare

4. **OpenAlex Topic Metadata Structure**
   - Investigate author.topics[], source.topics[], institution.topics[] formats
   - Document topic metadata: count (publication volume), score (relevance strength)
   - Understand nested topic structure: subfield, field, domain
   - Research: curl author/source/institution endpoints with topics parameter

5. **OpenAlex Repository Relationships**
   - Investigate institution.repositories[] format
   - Document repository object fields: source ID, host organization data
   - Understand when institutions host repositories
   - Research: curl institutions endpoint with repositories filter

6. **OpenAlex Role Relationships**
   - Investigate institution.roles[], funder.roles[], publisher.roles[] formats
   - Document cross-entity role mappings (institution also acts as funder/publisher)
   - Understand role object structure: ID, type, entity references
   - Research: curl institutions with roles parameter

7. **RelationType Enum Review**
   - Verify packages/graph/src/types.ts has all required RelationType values
   - Check if FUNDED_BY, KEYWORD, CONCEPT, TOPIC, REPOSITORY, ROLE types exist
   - Identify any missing enum values that need to be added
   - Research: read RelationType enum definition, cross-reference with spec requirements

8. **Relationship Detection Patterns**
   - Review existing analyzer methods in relationship-detection-service.ts
   - Document patterns: analyzeAuthorshipsForWork, analyzeTopicRelationshipsForWork
   - Understand edge creation logic: when/how edges are added to graph
   - Research: read relationship-detection-service.ts implementation

9. **MinimalEntityData Interface Patterns**
   - Review existing MinimalEntityData interfaces in packages/types
   - Document field naming patterns, optional vs required fields
   - Understand how relationship fields are structured (arrays of relationship objects)
   - Research: read types package, examine existing entity interfaces

10. **Field Selection Configuration**
    - Review ADVANCED_FIELD_SELECTIONS in packages/client/src/advanced-field-selection.ts
    - Document how fields are added to minimal/standard/full selection sets
    - Understand field selection hierarchy and when each level is used
    - Research: read advanced-field-selection.ts, trace usage in fetchMinimalEntityData

**Output**: `research.md` with all 10 research tasks documented. Each task should have:
- Decision: What structure/pattern was chosen
- Rationale: Why this approach was selected
- Alternatives considered: What other options were evaluated
- Code examples: Relevant snippets from OpenAlex API responses or existing codebase

---

## Phase 1: Design Artifacts

**Objective**: Generate data models, API contracts, and quickstart documentation based on research findings.

### Phase 1.1: Data Model Design

**Output**: `data-model.md` documenting:

1. **Grant Relationship Model**
   ```typescript
   interface GrantRelationship {
     funder: string;           // OpenAlex funder ID (e.g., "F4320332161")
     funder_display_name: string;
     award_id?: string;        // Optional grant/award identifier
   }
   ```

2. **Keyword Relationship Model**
   ```typescript
   interface KeywordRelationship {
     id: string;               // OpenAlex keyword ID
     display_name: string;
     score?: number;           // Relevance score (0-1)
   }
   ```

3. **Concept Relationship Model** (Legacy)
   ```typescript
   interface ConceptRelationship {
     id: string;               // OpenAlex concept ID (deprecated)
     display_name: string;
     level: number;            // Hierarchy level (0-5)
     score: number;            // Relevance score (0-1)
     wikidata?: string;        // Wikidata URI
   }
   ```

4. **Topic with Metadata Model**
   ```typescript
   interface TopicWithMetadata {
     id: string;               // OpenAlex topic ID
     display_name: string;
     count?: number;           // Publication count in this topic
     score?: number;           // Relevance/strength score
     subfield?: {              // Nested taxonomy structure
       id: string;
       display_name: string;
     };
     field?: {
       id: string;
       display_name: string;
     };
     domain?: {
       id: string;
       display_name: string;
     };
   }
   ```

5. **Repository Relationship Model**
   ```typescript
   interface RepositoryRelationship {
     id: string;               // OpenAlex source ID (repository)
     display_name: string;
     host_organization?: string;      // Hosting institution ID
     host_organization_name?: string;
     host_organization_lineage?: string[];
   }
   ```

6. **Role Relationship Model**
   ```typescript
   interface RoleRelationship {
     id: string;               // Cross-entity ID (funder, publisher, institution)
     role: 'funder' | 'publisher' | 'institution';
     works_count?: number;
   }
   ```

7. **MinimalEntityData Extensions**
   - Document which fields get added to which entity types
   - Works: grants, keywords, concepts
   - Authors/Sources/Institutions: topics (with metadata)
   - Institutions: repositories, roles
   - Funders/Publishers: roles

### Phase 1.2: API Contracts

**Output**: `contracts/` directory with:

1. **relationship-analyzer.contract.ts** - TypeScript interfaces for analyzer methods:
   ```typescript
   interface RelationshipAnalyzer {
     analyzeGrantRelationshipsForWork(work: MinimalEntityData): GraphEdge[];
     analyzeKeywordRelationshipsForWork(work: MinimalEntityData): GraphEdge[];
     analyzeConceptRelationshipsForWork(work: MinimalEntityData): GraphEdge[];
     analyzeTopicRelationshipsForEntity(entity: MinimalEntityData, entityType: EntityType): GraphEdge[];
     analyzeRepositoryRelationshipsForInstitution(institution: MinimalEntityData): GraphEdge[];
     analyzeRoleRelationshipsForEntity(entity: MinimalEntityData, entityType: EntityType): GraphEdge[];
   }
   ```

2. **field-selection.contract.ts** - Field selection extensions:
   ```typescript
   interface WorksFieldSelection {
     minimal: string[];  // Add: 'grants', 'keywords', 'concepts'
     standard: string[];
     full: string[];
   }

   interface AuthorFieldSelection {
     minimal: string[];  // Add: 'topics'
     // ...
   }
   // Similar for sources, institutions
   ```

3. **minimal-entity-data.contract.ts** - Interface extensions:
   ```typescript
   interface MinimalWorkData {
     // Existing fields...
     grants?: GrantRelationship[];
     keywords?: KeywordRelationship[];
     concepts?: ConceptRelationship[];
   }

   interface MinimalAuthorData {
     // Existing fields...
     topics?: TopicWithMetadata[];
   }
   // Similar for sources, institutions
   ```

### Phase 1.3: Quickstart Documentation

**Output**: `quickstart.md` documenting:

1. **Quick Reference**: 5-minute guide to relationship types
2. **Common Patterns**: Example analyzer method implementations
3. **Testing Checklist**: Steps to verify relationship detection
4. **Troubleshooting**: Common issues (missing fields, null data, edge creation failures)

### Phase 1.4: Update Agent Context

Run `.specify/scripts/bash/update-agent-context.sh claude` to update `CLAUDE.md` with:
- New relationship types supported
- Phase completion status
- Technical decisions from research phase

---

## Phase 2: Task Generation

**Note**: This phase is executed by `/speckit.tasks` command (NOT part of `/speckit.plan`).

The `/speckit.tasks` command will:
1. Break down implementation into atomic tasks
2. Organize tasks by phase (Setup → User Stories → Testing → Integration → Deployment)
3. Create dependency order (tests before implementation, field selection before detection)
4. Generate `tasks.md` with 60-100 actionable tasks

Expected task structure:
- **Phase 0**: Setup (verify RelationType enum, create type files)
- **Phase 1**: Field selection extensions (client package)
- **Phase 2**: Type definitions (types package)
- **Phase 3**: Analyzer method implementations (web services)
- **Phase 4**: Visualization integration (web components)
- **Phase 5**: Testing (unit, component, integration, E2E)
- **Phase 6**: Quality gates (typecheck, lint, build, validate)
- **Phase 7**: Documentation and deployment

---

## Implementation Phases Preview

**Phase 0: Setup & Type Definitions** (~10 tasks)
- Verify RelationType enum completeness
- Create relationship type definition files
- Update MinimalEntityData interfaces
- Add relationship fields to entity types

**Phase 1: API Field Selection** (~8 tasks)
- Add grants/keywords/concepts to ADVANCED_FIELD_SELECTIONS.works
- Add topics to ADVANCED_FIELD_SELECTIONS for authors/sources/institutions
- Add repositories/roles to ADVANCED_FIELD_SELECTIONS.institutions
- Update fetchMinimalEntityData calls to include new fields

**Phase 2: User Story 1 - Work Funding (P1)** (~10 tasks)
- Implement analyzeGrantRelationshipsForWork
- Add grant relationship detection to detectRelationships
- Create/update visualization components for funding relationships
- Write unit tests for grant analyzer
- Write component tests for grant visualization
- Write E2E tests for funding flow

**Phase 3: User Story 2 - Work Keywords (P1)** (~8 tasks)
- Implement analyzeKeywordRelationshipsForWork
- Add keyword relationship detection
- Update visualization for keyword relationships
- Write tests (unit, component, E2E)

**Phase 4: User Story 3-5 - Entity Topics (P2)** (~12 tasks)
- Implement analyzeTopicRelationshipsForEntity (reusable for authors/sources/institutions)
- Add topic detection with metadata (count, score)
- Update visualization for topic strength indicators
- Write tests for all three entity types

**Phase 5: User Story 6 - Legacy Concepts (P3)** (~8 tasks)
- Implement analyzeConceptRelationshipsForWork
- Add concept detection (distinguish from topics)
- Update visualization to show both concepts and topics
- Write tests

**Phase 6: User Story 7-8 - Repositories & Roles (P3)** (~10 tasks)
- Implement analyzeRepositoryRelationshipsForInstitution
- Implement analyzeRoleRelationshipsForEntity
- Add cross-entity role connection logic
- Update visualization for institutional relationships
- Write tests

**Phase 7: Integration & Quality** (~15 tasks)
- Integration tests across all relationship types
- Performance tests (25+ relationships <5s)
- Accessibility tests (WCAG 2.1 AA compliance)
- Full quality pipeline verification (typecheck, lint, build, test)
- Resolve any pre-existing deployment blockers

**Phase 8: Documentation & Deployment** (~8 tasks)
- Update CLAUDE.md with implementation details
- Commit spec changes: `docs(spec-020): complete implementation`
- Create atomic commits for all phases
- Verify deployment readiness
- Mark specification complete

**Total Estimated Tasks**: 80-100 atomic tasks

---

## Success Criteria

From specification (must verify during implementation):

- ✅ **SC-001**: Users can visualize funding relationships within 2 seconds of loading
- ✅ **SC-002**: Researchers can identify all keywords through graph connections
- ✅ **SC-003**: Users can discover author expertise areas ranked by topic strength
- ✅ **SC-004**: Journal selection researchers can compare topic coverage across sources
- ✅ **SC-005**: Institution comparison shows research focus differences through topics
- ✅ **SC-006**: Historical works display legacy concept classifications alongside topics
- ✅ **SC-007**: Librarians can map institutional repository infrastructure
- ✅ **SC-008**: Research administrators can identify multi-role organizations
- ✅ **SC-009**: Graph performance remains under 5 seconds for entities with 25+ relationships
- ✅ **SC-010**: Relationship detection accuracy reaches 100% for all API-provided data

---

## Next Steps

After completing this plan:
1. **Phase 0**: Generate `research.md` by executing 10 research tasks
2. **Phase 1**: Generate `data-model.md`, `contracts/`, and `quickstart.md` based on research
3. **Update agent context**: Run update-agent-context.sh script
4. **Automatically invoke**: `/speckit.tasks` to generate task breakdown
5. **Automatically invoke**: `/speckit.implement` to execute implementation

No blockers identified. Continuous execution will proceed automatically per Constitution Principle X.
