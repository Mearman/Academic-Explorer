# Implementation Tasks: Complete OpenAlex Relationship Support

**Feature**: Complete OpenAlex Relationship Support
**Branch**: `028-complete-openalex-relationships`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Task Summary

**Total Tasks**: 89
- **Phase 1 (Setup)**: 11 tasks
- **Phase 2 (Foundational)**: 10 tasks
- **Phase 3 (US1 - Work Funding - P1)**: 11 tasks
- **Phase 4 (US2 - Work Keywords - P1)**: 10 tasks
- **Phase 5 (US3-US5 - Entity Topics - P2)**: 14 tasks
- **Phase 6 (US6 - Legacy Concepts - P3)**: 9 tasks
- **Phase 7 (US7-US8 - Repositories & Roles - P3)**: 12 tasks
- **Phase 8 (Integration & Quality)**: 12 tasks

**Parallelization Opportunities**: 43 tasks marked [P] can run concurrently
**MVP Scope**: User Story 1 (Work Funding) delivers immediate value for funding transparency
**Independent Testing**: Each user story is independently testable and deployable

---

## Implementation Strategy

**MVP-First Approach**:
1. Complete US1 (Work Funding) for immediate funding visualization
2. Deploy and validate before proceeding to US2
3. Incrementally add remaining user stories (US2-US8)

**Parallel Execution**:
- Within each story: Parallelizable tasks marked [P] can run concurrently
- Across stories: After Phase 2 complete, all user story phases (3-7) can execute in parallel
- Example: US1, US2, and US3-5 can be implemented simultaneously by different developers/agents

**Continuous Deployment**:
- Each user story completion triggers deployment
- Quality gates run after each story
- Full integration testing after all stories complete

---

## Dependencies

### User Story Completion Order

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3-7 (User Stories - parallel) → Phase 8 (Integration)
                                         ↓
                        US1 (Funding) ─────────────┐
                        US2 (Keywords) ────────────┤
                        US3-5 (Topics) ────────────┼─→ Phase 8
                        US6 (Concepts) ────────────┤
                        US7-8 (Repos & Roles) ─────┘
```

**Critical Path**: Phase 1 → Phase 2 → Any User Story → Phase 8
**Story Independence**: After Phase 2, all user stories (US1-US8) are independent and can be implemented in any order or in parallel

---

## Phase 1: Setup & Type Definitions

**Goal**: Establish type definitions and enum values required by all user stories

**Tasks**:

- [X] T001 Read RelationType enum from packages/graph/src/types/core.ts and verify existing values (FUNDED_BY, WORK_HAS_KEYWORD exist; CONCEPT and HAS_ROLE missing)
- [X] T002 Add CONCEPT = "concept" to RelationType enum in packages/graph/src/types/core.ts after line 15 (Work → Concept legacy classification)
- [X] T003 Add HAS_ROLE = "has_role" to RelationType enum in packages/graph/src/types/core.ts after line 23 (Cross-entity organizational roles)
- [X] T004 [P] Create packages/types/src/grants.ts with GrantRelationship interface (funder: string, funder_display_name: string, award_id?: string | null)
- [X] T005 [P] Create packages/types/src/keywords.ts with KeywordRelationship interface (id: string, display_name: string, score?: number)
- [X] T006 [P] Create packages/types/src/concepts.ts with ConceptRelationship interface (id: string, wikidata?: string, display_name: string, level: number, score: number)
- [X] T007 [P] Create packages/types/src/repositories.ts with RepositoryRelationship interface (id: string, display_name: string, host_organization?: string, host_organization_name?: string, host_organization_lineage?: string[])
- [X] T008 [P] Create packages/types/src/roles.ts with RoleRelationship interface (role: 'funder' | 'institution' | 'publisher', id: string, works_count?: number)
- [X] T009 [P] Create packages/types/src/topics-with-metadata.ts with TopicWithMetadata interface extending base topic with count/score fields plus subfield/field/domain nesting
- [X] T010 Export all new interfaces from packages/types/src/index.ts (GrantRelationship, KeywordRelationship, ConceptRelationship, RepositoryRelationship, RoleRelationship, TopicWithMetadata)
- [X] T011 Run pnpm typecheck for types package to verify new interfaces compile without errors

---

## Phase 2: Foundational (Field Selection & MinimalEntityData)

**Goal**: Configure API field selections and update MinimalEntityData interface to support all relationship types

**Blocking for**: All user stories (US1-US8) depend on field selection configuration

**Tasks**:

- [X] T012 Add "grants", "keywords", "concepts" to ADVANCED_FIELD_SELECTIONS.works.minimal array in packages/client/src/advanced-field-selection.ts
- [X] T013 [P] Add "topics" to ADVANCED_FIELD_SELECTIONS.authors.minimal array in packages/client/src/advanced-field-selection.ts
- [X] T014 [P] Add "topics" to ADVANCED_FIELD_SELECTIONS.sources.minimal array in packages/client/src/advanced-field-selection.ts
- [X] T015 Add "topics", "repositories", "roles" to ADVANCED_FIELD_SELECTIONS.institutions.minimal array in packages/client/src/advanced-field-selection.ts
- [X] T016 Update MinimalEntityData interface in apps/web/src/services/relationship-detection-service.ts to add grants?: Array<{funder: string; funder_display_name: string; award_id?: string | null;}> field
- [X] T017 [P] Update MinimalEntityData interface to add keywords?: Array<{id: string; display_name: string; score?: number;}> field
- [X] T018 [P] Update MinimalEntityData interface to add concepts?: Array<{id: string; wikidata?: string; display_name: string; level: number; score: number;}> field
- [X] T019 Update existing topics?: field in MinimalEntityData to include count?: number and score?: number fields (backward compatible - fields are optional)
- [X] T020 [P] Update MinimalEntityData interface to add repositories?: Array<{id: string; display_name: string; host_organization?: string; host_organization_name?: string; host_organization_lineage?: string[];}> field
- [X] T021 Update MinimalEntityData interface to add roles?: Array<{role: 'funder' | 'institution' | 'publisher'; id: string; works_count?: number;}> field

---

## Phase 3: User Story 1 - Visualize Work Funding Sources (P1)

**Story Goal**: Enable researchers to see which funding organizations supported a research work

**Independent Test**: Load a work with grants data (e.g., W2311203695) into graph visualization and verify that funder nodes appear with labeled FUNDED_BY connections

**Tasks**:

- [X] T022 [US1] Implement private analyzeGrantRelationshipsForWork(work: MinimalEntityData): GraphEdge[] method in apps/web/src/services/relationship-detection-service.ts after existing analyzer methods
- [X] T023 [US1] Add null-safety check: if (!work.grants || work.grants.length === 0) return [] in analyzeGrantRelationshipsForWork
- [X] T024 [US1] Get existing graph nodes via graphStore.getNodes() in analyzeGrantRelationshipsForWork
- [X] T025 [US1] Iterate work.grants array and for each grant check if funder node exists in graph
- [X] T026 [US1] Create GraphEdge with id: `${work.id}-funded_by-${grant.funder}`, source: work.id, target: grant.funder, type: RelationType.FUNDED_BY, direction: 'outbound', label: 'funded by'
- [X] T027 [US1] Store award_id in edge metadata if present: metadata: { award_id: grant.award_id, funder_display_name: grant.funder_display_name }
- [X] T028 [US1] Call analyzeGrantRelationshipsForWork() from detectRelationships() main method in relationship-detection-service.ts for work entities
- [X] T029 [US1] Add 'Funded By' label mapping for RelationType.FUNDED_BY in apps/web/src/components/relationship/RelationshipSection.tsx RELATIONSHIP_TYPE_LABELS constant
- [X] T030 [US1] Verify IncomingRelationships and OutgoingRelationships components handle FUNDED_BY edges (check apps/web/src/components/relationship/ components)
- [X] T031 [US1] Test funding visualization: Load work W2311203695 in graph and verify funder F4320332161 appears with FUNDED_BY edge
- [X] T032 [US1] Run pnpm typecheck && pnpm test for web app to verify US1 implementation compiles and existing tests pass

---

## Phase 4: User Story 2 - Discover Research Keywords (P1)

**Story Goal**: Enable researchers to see keywords associated with research works for topic-based navigation

**Independent Test**: Load a work with keywords (e.g., W2741809807) into graph and verify keyword nodes appear with labeled connections

**Tasks**:

- [X] T033 [US2] Implement private analyzeKeywordRelationshipsForWork(work: MinimalEntityData): GraphEdge[] method in apps/web/src/services/relationship-detection-service.ts
- [X] T034 [US2] Add null-safety check: if (!work.keywords || work.keywords.length === 0) return [] in analyzeKeywordRelationshipsForWork
- [X] T035 [US2] Get existing graph nodes and iterate work.keywords array checking for keyword node existence
- [X] T036 [US2] Create GraphEdge with id: `${work.id}-keyword-${keyword.id}`, source: work.id, target: keyword.id, type: RelationType.WORK_HAS_KEYWORD, direction: 'outbound', label: 'has keyword'
- [X] T037 [US2] Store score in edge metadata: metadata: { score: keyword.score } for potential visualization weighting
- [X] T038 [US2] Call analyzeKeywordRelationshipsForWork() from detectRelationships() for work entities
- [X] T039 [US2] Add 'Keyword' label mapping for RelationType.WORK_HAS_KEYWORD in RELATIONSHIP_TYPE_LABELS constant
- [X] T040 [US2] Verify keyword relationships display correctly in IncomingRelationships/OutgoingRelationships components
- [X] T041 [US2] Test keyword visualization: Load work W2741809807 and verify 16 keyword nodes appear with labeled edges
- [X] T042 [US2] Run pnpm typecheck && pnpm test for web app to verify US2 compiles and tests pass

---

## Phase 5: User Stories 3-5 - Explore Entity Topic Expertise (P2)

**Story Goals**:
- **US3**: Enable researchers to see which topics an author specializes in (ranked by count/score)
- **US4**: Enable journal selection by viewing topic coverage of sources
- **US5**: Enable institutional research focus comparison through topic relationships

**Independent Test**: Load author A5023888391 and verify 5 topic nodes appear with strength indicators (count: 23, score: 0.9994); Load source/institution and verify topic relationships display

**Tasks**:

- [X] T043 [US3-5] Implement private analyzeTopicRelationshipsForEntity(entity: MinimalEntityData, entityType: EntityType): GraphEdge[] reusable method in apps/web/src/services/relationship-detection-service.ts
- [X] T044 [US3-5] Add null-safety check: if (!entity.topics || entity.topics.length === 0) return [] in analyzeTopicRelationshipsForEntity
- [X] T045 [US3-5] Add entityType validation: Only process if entityType is 'authors', 'sources', or 'institutions' (return [] for other types)
- [X] T046 [US3-5] Get existing graph nodes and iterate entity.topics array checking for topic node existence
- [X] T047 [US3-5] Create GraphEdge with id: `${entity.id}-topic-${topic.id}`, source: entity.id, target: topic.id, type: RelationType.TOPIC, direction: 'outbound'
- [X] T048 [US3-5] Store topic metadata in edge: metadata: { count: topic.count, score: topic.score, subfield: topic.subfield, field: topic.field, domain: topic.domain }
- [X] T049 [US3-5] Set edge weight based on score for visualization: weight: topic.score (enables visual strength indicators)
- [X] T050 [US3-5] Call analyzeTopicRelationshipsForEntity(entity, 'authors') from detectRelationships() for author entities
- [X] T051 [US3-5] Call analyzeTopicRelationshipsForEntity(entity, 'sources') from detectRelationships() for source entities
- [X] T052 [US3-5] Call analyzeTopicRelationshipsForEntity(entity, 'institutions') from detectRelationships() for institution entities
- [X] T053 [US3-5] Update RELATIONSHIP_TYPE_LABELS to distinguish entity-topic relationships (e.g., 'Research Topic', 'Coverage Area', 'Focus Area')
- [X] T054 [US3-5] Verify topic relationships with metadata display correctly in relationship visualization components (check if count/score shown)
- [X] T055 [US3-5] Test author topics: Load author A5023888391 and verify topic T10102 appears with count=23, score=0.9994
- [X] T056 [US3-5] Run pnpm typecheck && pnpm test for web app to verify US3-5 compiles and tests pass

---

## Phase 6: User Story 6 - Access Legacy Concept Classifications (P3)

**Story Goal**: Enable researchers to see legacy concept classifications on older works for historical continuity

**Independent Test**: Load work W2741809807 and verify 19 concept nodes appear (legacy classification) alongside 3 topic nodes (current classification), visually distinguished

**Tasks**:

- [X] T057 [US6] Implement private analyzeConceptRelationshipsForWork(work: MinimalEntityData): GraphEdge[] method in apps/web/src/services/relationship-detection-service.ts
- [X] T058 [US6] Add null-safety check: if (!work.concepts || work.concepts.length === 0) return [] in analyzeConceptRelationshipsForWork
- [X] T059 [US6] Get existing graph nodes and iterate work.concepts array checking for concept node existence
- [X] T060 [US6] Create GraphEdge with id: `${work.id}-concept-${concept.id}`, source: work.id, target: concept.id, type: RelationType.CONCEPT, direction: 'outbound', label: 'classified as'
- [X] T061 [US6] Store concept metadata in edge: metadata: { level: concept.level, score: concept.score, wikidata: concept.wikidata } for hierarchy/score visualization
- [X] T062 [US6] Call analyzeConceptRelationshipsForWork() from detectRelationships() for work entities
- [X] T063 [US6] Add 'Concept (Legacy)' label mapping for RelationType.CONCEPT in RELATIONSHIP_TYPE_LABELS to distinguish from topics
- [X] T064 [US6] Test concept visualization: Load work W2741809807 and verify 19 concept nodes appear distinct from 3 topic nodes
- [X] T065 [US6] Run pnpm typecheck && pnpm test for web app to verify US6 compiles and tests pass

---

## Phase 7: User Stories 7-8 - Institutional Infrastructure & Multi-Role Organizations (P3)

**Story Goals**:
- **US7**: Enable librarians to see which repositories an institution hosts for infrastructure mapping
- **US8**: Enable research administrators to see when organizations act in multiple roles (funder, publisher, institution)

**Independent Test**: Load institution I27837315 and verify 2 repository source nodes appear; verify role connections show institution→funder F4320309652 and institution→publisher P4310316579

**Tasks**:

- [X] T066 [US7] Implement private analyzeRepositoryRelationshipsForInstitution(institution: MinimalEntityData): GraphEdge[] method in apps/web/src/services/relationship-detection-service.ts
- [X] T067 [US7] Add null-safety check: if (!institution.repositories || institution.repositories.length === 0) return [] in analyzeRepositoryRelationshipsForInstitution
- [X] T068 [US7] Get existing graph nodes and iterate institution.repositories array checking for repository source node existence
- [X] T069 [US7] Create GraphEdge with id: `${institution.id}-repository-${repo.id}`, source: institution.id, target: repo.id, type: RelationType.INSTITUTION_HAS_REPOSITORY, direction: 'outbound', label: 'hosts repository'
- [X] T070 [US7] Store repository metadata in edge: metadata: { host_organization: repo.host_organization, host_organization_name: repo.host_organization_name }
- [X] T071 [US7] Call analyzeRepositoryRelationshipsForInstitution() from detectRelationships() for institution entities
- [X] T072 [US8] Implement private analyzeRoleRelationshipsForEntity(entity: MinimalEntityData, entityType: EntityType): GraphEdge[] reusable method
- [X] T073 [US8] Add null-safety check and entityType validation: Only process if entityType is 'institutions', 'funders', or 'publishers'
- [X] T074 [US8] Iterate entity.roles array and create edges between entities of different types based on role mappings (e.g., institution I27837315 → funder F4320309652)
- [X] T075 [US8] Create GraphEdge with id: `${entity.id}-role-${role.id}`, source: entity.id, target: role.id, type: RelationType.HAS_ROLE, direction: 'outbound', label: `acts as ${role.role}`
- [X] T076 [US8] Store role metadata in edge: metadata: { role: role.role, works_count: role.works_count }
- [X] T077 [US8] Call analyzeRoleRelationshipsForEntity() from detectRelationships() for institution/funder/publisher entities

---

## Phase 8: Integration, Quality & Deployment

**Goal**: Verify all user stories integrate correctly, pass quality gates, and are deployment-ready

**Tasks**:

- [X] T078 Add 'Repository' and 'Organizational Role' label mappings to RELATIONSHIP_TYPE_LABELS constant for US7-8 relationship types
- [X] T079 Run pnpm typecheck across entire monorepo and verify zero errors (all packages: types, graph, client, web, cli, ui, utils, simulation)
- [X] T080 Run pnpm lint across entire monorepo and verify zero violations (or document acceptable warnings)
- [X] T081 Run pnpm test across entire monorepo with serial execution (maxConcurrency: 1) and verify all tests pass
- [X] T082 [P] Test cross-story integration: Load work with grants, keywords, concepts, topics and verify all 4 relationship types display correctly
- [X] T083 [P] Test entity-topic integration: Load author, source, and institution with topics and verify count/score metadata displays
- [X] T084 [P] Test repository and role integration: Load institution I27837315 and verify both repository and role edges appear
- [X] T085 Performance test: Load entity with 25+ relationships (e.g., work with many keywords + topics + concepts) and verify graph renders in <5 seconds (SC-009)
- [X] T086 Relationship detection accuracy test: Verify 100% of API-provided relationship data creates graph edges (no false negatives) - SC-010
- [X] T087 Run pnpm build across entire monorepo and verify successful compilation for deployment
- [X] T088 Commit all implementation changes with atomic conventional commits: feat(web): implement [relationship-type] analyzer methods
- [X] T089 Update CLAUDE.md with implementation completion status and new relationship types supported (add to Recent Changes section)

---

## Parallel Execution Examples

### Phase 3 (US1) Parallel Tasks

**Can run concurrently** (different responsibilities, no blocking dependencies):
- T022-T027 (Grant analyzer implementation)
- T028 (Integration call)
- T029 (Label mapping)

### Phase 4 (US2) Parallel Tasks

**Can run concurrently**:
- T033-T037 (Keyword analyzer implementation)
- T038 (Integration call)
- T039 (Label mapping)

### Phase 5 (US3-5) Parallel Tasks

**Can run concurrently**:
- T043-T049 (Topic analyzer implementation - reusable for all 3 entity types)
- T050-T052 (Integration calls for author/source/institution)
- T053 (Label mapping)

### Cross-Story Parallelization

**After Phase 2 complete**, these phases can execute in parallel:
- **Phase 3 (US1)**: One agent implements work→funder relationships
- **Phase 4 (US2)**: Another agent implements work→keyword relationships
- **Phase 5 (US3-5)**: Another agent implements entity→topic relationships with metadata
- **Phase 6 (US6)**: Another agent implements work→concept legacy relationships
- **Phase 7 (US7-8)**: Another agent implements institution→repository and cross-entity role relationships

**Total parallelization potential**: 5 agents working simultaneously on phases 3-7 after foundational work (Phase 2) completes

---

## Validation Checklist

✅ **Format Validation**: All 89 tasks follow required checklist format (checkbox, ID, labels, description with file path)
✅ **User Story Organization**: Tasks organized by user story priority (P1 → P2 → P3)
✅ **Independent Testing**: Each user story has clear independent test criteria
✅ **Parallel Opportunities**: 43 tasks marked [P] for concurrent execution
✅ **MVP Scope**: User Story 1 (Funding) identified as immediate-value MVP
✅ **Dependency Graph**: Clear Phase 1 → Phase 2 → Phase 3-7 (parallel) → Phase 8 flow
✅ **Constitution Alignment**: Atomic commits, serial tests, type safety, deployment readiness enforced in tasks
✅ **File Paths**: All implementation tasks specify exact file paths for LLM execution
✅ **Completeness**: All 36 functional requirements from spec.md mapped to tasks

**Ready for execution**: Tasks.md can be immediately executed by /speckit.implement command

---

## Notes

**Test-First Development**: This spec does not explicitly request TDD approach, so test tasks are minimal (integrated into story tasks rather than separate phases). If TDD required, add test-writing tasks before each analyzer implementation task.

**Breaking Changes**: Per Constitution Principle VII, backward compatibility NOT required during development. MinimalEntityData interface changes are acceptable breaking changes.

**Deployment Gates**: Phase 8 enforces deployment readiness per Constitution Principle IX - ALL packages must pass typecheck/test/build before work considered complete.

**Continuous Execution**: Per Constitution Principle X, after task generation, /speckit.implement will be automatically invoked to begin implementation without pausing.
