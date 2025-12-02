# Implementation Tasks: Advanced Literature Review Workflows

**Branch**: `029-literature-review` | **Date**: 2025-11-30 | **Spec**: [link](spec.md)

## Summary

Enhance BibGraph catalogue feature to support advanced literature review workflows including PRISMA systematic reviews, semantic analysis, citation export formats (BibTeX/RIS), custom entity support for non-OpenAlex works, and live file system synchronization using browser File System Access API.

**Total Tasks**: 173
**MVP Scope (User Stories 1-2, 6)**: 91 tasks (Phases 1-5b)
**Parallel Development Opportunities**: 85 tasks (56.7%)
**Estimated Implementation Timeline**: 10-14 weeks

## User Story Priorities

- **P1**: User Story 1 - Citation Export and Reference Management
- **P1**: User Story 2 - Systematic Review Management
- **P1**: User Story 6 - Catalogues as First-Class Entities with Parent Relationships
- **P2**: User Story 3 - Thematic and Semantic Analysis
- **P2**: User Story 4 - Custom Entity Management
- **P2**: User Story 5 - Live File System Synchronization

## Phase 1: Setup and Project Initialization

**Goal**: Establish foundation infrastructure and dependencies

- [ ] T001 Install new dependencies for citation export, NLP, and file system access
- [ ] T002 [P] Configure TypeScript strict mode for new feature modules
- [ ] T003 [P] Update ESLint rules for new file system and NLP code patterns
- [ ] T004 Create base directory structure in apps/web/src/components/catalogue/
- [ ] T005 [P] Create service directories in apps/web/src/services/
- [ ] T006 [P] Create hooks directories in apps/web/src/hooks/
- [ ] T007 Create Web Worker directories in apps/web/src/workers/
- [ ] T008 [P] Create package directories in packages/utils/src/
- [ ] T009 Create type definitions directory in packages/types/src/
- [ ] T010 [P] Create algorithms directory in packages/algorithms/src/
- [ ] T011 Update build configuration for Web Workers and WASM support
- [ ] T012 Configure test environment for new worker-based architecture

## Phase 2: Foundational Infrastructure

**Goal**: Implement shared services and core extensions to existing architecture

- [ ] T013 Extend existing CatalogueStorageProvider interface for literature review operations
- [ ] T014 [P] Implement literature review entity types in packages/types/src/literature-review.ts
- [ ] T015 [P] Implement citation export types in packages/types/src/citation-export.ts
- [ ] T016 Implement file system sync types in packages/types/src/file-system-sync.ts
- [ ] T017 [P] Create enhanced catalogue entity interface in packages/types/src/enhanced-catalogue-entity.ts
- [ ] T018 Extend existing storage provider to support custom entities in packages/utils/src/storage/
- [ ] T019 [P] Create logger configurations for new feature modules
- [ ] T020 Set up Web Worker communication infrastructure
- [ ] T021 [P] Create error handling patterns for new operations
- [ ] T022 Create validation schemas using Zod for new data types
- [ ] T023 Set up performance monitoring for heavy operations
- [ ] T024 Create utility functions for file format detection and processing

## Phase 3: Citation Export and Reference Management (User Story 1 - P1)

**Goal**: Implement BibTeX/RIS/CSV export functionality with custom fields support
**Independent Test**: Export catalogue with mixed entities and verify format compatibility

- [ ] T025 Implement citation key generation algorithm in packages/utils/src/citation/citation-key-generator.ts
- [ ] T026 [P] Implement BibTeX generator in packages/utils/src/citation/bibtex-generator.ts
- [ ] T027 [P] Implement RIS generator in packages/utils/src/citation/ris-generator.ts
- [ ] T028 Implement CSV export with configurable columns
- [ ] T029 [P] Create citation export service in apps/web/src/services/citation-export.service.ts
- [ ] T030 Implement streaming export for large datasets (1000+ citations)
- [ ] T031 Create CitationExportModal component in apps/web/src/components/catalogue/CitationExportModal.tsx
- [ ] T032 [P] Implement export configuration UI with format options
- [ ] T033 Add export progress indicators and performance metrics
- [ ] T034 Integrate citation export into existing catalogue interface
- [ ] T035 Implement export format validation and error handling
- [ ] T036 Add export functionality to existing catalogue actions menu

## Phase 4: Systematic Review Management (User Story 2 - P1)

**Goal**: Implement PRISMA 2020 compliant systematic review workflow management
**Independent Test**: Create literature review project, add studies, verify PRISMA tracking

- [ ] T037 Create LiteratureReview model interface in packages/types/src/literature-review.ts
- [ ] T038 [P] Create ScreeningDecision interface with quality assessment fields
- [ ] T039 Create PRISMA flow data structures and calculations
- [ ] T040 Implement literature review service in apps/web/src/services/literature-review.service.ts
- [ ] T041 [P] Create PRISMA stage management functionality
- [ ] T042 Implement screening decision recording with audit trail
- [ ] T043 Create quality assessment scoring system
- [ ] T044 Create LiteratureReviewTools component in apps/web/src/components/catalogue/LiteratureReviewTools.tsx
- [ ] T045 [P] Implement PRISMA flow diagram visualization in apps/web/src/components/catalogue/PrismaFlowDiagram.tsx
- [ ] T046 Create screening interface with bulk decision capabilities
- [ ] T047 Implement progress tracking and statistics calculation
- [ ] T048 Add literature review management to existing catalogue interface
- [ ] T049 Create use-literature-review hook in apps/web/src/hooks/use-literature-review.ts
- [ ] T050 Implement PRISMA flow diagram export functionality

## Phase 5: Catalogues as First-Class Entities (User Story 6 - P1)

**Goal**: Promote lists to first-class entity status with parent relationships and routes
**Independent Test**: Create list with parent entity, navigate via /lists/L123, test nested lists, load sample lists

- [ ] T051 Add `lists` to EntityType enum in packages/types/src/entity-types.ts
- [ ] T052 [P] Create CatalogueList and EncodedListPayload interfaces in packages/types/src/catalogue.ts
- [ ] T053 Implement pako-based list ID encoder in packages/utils/src/list-encoding/list-encoder.ts
- [ ] T054 [P] Implement pako-based list ID decoder in packages/utils/src/list-encoding/list-decoder.ts
- [ ] T055 Create list ID validation utilities (isValidListId, extractListPayload) in packages/utils/src/list-encoding/
- [ ] T056 [P] Create list storage provider extending base storage in packages/utils/src/storage/list-storage.provider.ts
- [ ] T057 Add /lists route tree in apps/web/src/routes/lists/ (primary route)
- [ ] T058 [P] Create ListDetailPage component in apps/web/src/routes/lists/$listId.tsx
- [ ] T059 Add /catalogues redirect alias to /lists for backward compatibility
- [ ] T060 [P] Implement parent entity display component with navigation link
- [ ] T061 Create "Create list for this entity" action on entity detail pages
- [ ] T062 [P] Implement nested list support (lists containing lists)
- [ ] T063 Create use-list hook in apps/web/src/hooks/use-list.ts
- [ ] T064 [P] Create public folder structure for sample lists at apps/web/public/data/lists/
- [ ] T065 Implement sample list loader service in apps/web/src/services/sample-list.service.ts
- [ ] T066 [P] Create SampleListBrowser component for browsing pre-packaged lists
- [ ] T067 Create initial sample lists (minimum 5: review bibliographies, collaborator lists, etc.)
- [ ] T068 [P] Integrate list entities with existing entity search and navigation
- [ ] T069 Write unit tests for list encoding/decoding and entity operations
- [ ] T070 [P] Write E2E tests for list routes, pako-encoded URLs, and parent relationships

### Phase 5b: List Reconciliation (Collaborative Editing Support)

**Goal**: Implement three reconciliation approaches for UX experimentation when users share and modify lists independently
**Independent Test**: User A and B both modify shared list, verify all three merge strategies produce correct results

#### Approach 1: Same-UUID Detection + Diff UI
- [ ] T071 Create ListOperation and reconciliation types in packages/types/src/list-reconciliation.ts
- [ ] T072 [P] Implement UUID-based conflict detection in packages/utils/src/list-reconciliation/conflict-detector.ts
- [ ] T073 Create list diff algorithm (added/removed/modified entities) in packages/utils/src/list-reconciliation/list-diff.ts
- [ ] T074 [P] Create ListDiffViewer component showing side-by-side comparison in apps/web/src/components/list/ListDiffViewer.tsx
- [ ] T075 Implement manual merge selection UI in apps/web/src/components/list/ManualMergeDialog.tsx

#### Approach 2: Base Reference Chain (3-Way Merge)
- [ ] T076 [P] Implement base UUID chain storage in list storage provider
- [ ] T077 Create 3-way diff algorithm in packages/utils/src/list-reconciliation/three-way-diff.ts
- [ ] T078 [P] Implement common ancestor finder (bu chain intersection) in packages/utils/src/list-reconciliation/ancestor-finder.ts
- [ ] T079 Create auto-merge logic for non-conflicting changes in packages/utils/src/list-reconciliation/auto-merge.ts
- [ ] T080 [P] Create conflict resolution UI for 3-way merge in apps/web/src/components/list/ThreeWayMergeDialog.tsx

#### Approach 3: CRDT Operations (Automatic Merge)
- [ ] T081 Implement OR-Set CRDT for list membership in packages/utils/src/list-reconciliation/crdt/or-set.ts
- [ ] T082 [P] Create Lamport timestamp generator with node ID in packages/utils/src/list-reconciliation/crdt/lamport-clock.ts
- [ ] T083 Implement operation log compaction algorithm in packages/utils/src/list-reconciliation/crdt/compaction.ts
- [ ] T084 [P] Create CRDT merge function (combine ops from multiple sources) in packages/utils/src/list-reconciliation/crdt/merge.ts
- [ ] T085 Implement metadata conflict resolution (LWW for same-entity metadata) in packages/utils/src/list-reconciliation/crdt/metadata-lww.ts

#### Reconciliation Integration
- [ ] T086 [P] Create reconciliation strategy selector in settings UI
- [ ] T087 Implement reconciliation service orchestrating all three approaches in apps/web/src/services/list-reconciliation.service.ts
- [ ] T088 [P] Add reconciliation trigger on list URL load (detect incoming vs stored)
- [ ] T089 Create use-list-reconciliation hook in apps/web/src/hooks/use-list-reconciliation.ts
- [ ] T090 [P] Write unit tests for all three reconciliation approaches
- [ ] T091 Write E2E tests for collaborative editing scenarios

## Phase 6: Thematic and Semantic Analysis (User Story 3 - P2)

**Goal**: Implement topic modeling and thematic analysis with manual editing capabilities
**Independent Test**: Upload abstracts, verify topic modeling generates meaningful themes

- [ ] T092 Create topic modeling worker in apps/web/src/workers/topic-modeling.worker.ts
- [ ] T093 [P] Implement transformers.js integration for embeddings generation
- [ ] T094 Create UMAP dimensionality reduction for topic visualization
- [ ] T095 Implement HDBSCAN clustering for topic discovery
- [ ] T096 [P] Create topic extraction logic in packages/utils/src/topic-modeling/topic-extractor.ts
- [ ] T097 Create theme management system in packages/utils/src/topic-modeling/theme-manager.ts
- [ ] T098 Implement topic modeling service in apps/web/src/services/topic-modeling.service.ts
- [ ] T099 [P] Create semantic-prisma integration component in apps/web/src/components/catalogue/SemanticPrismaIntegration.tsx
- [ ] T100 Implement manual theme editing interface
- [ ] T101 Create topic visualization with force-directed graph
- [ ] T102 Implement export to QDA software formats (NVivo, Atlas.ti)
- [ ] T103 Add topic modeling to literature review workflow
- [ ] T104 Create use-topic-modeling hook in apps/web/src/hooks/use-topic-modeling.ts
- [ ] T105 Implement PRISMA stage-specific topic analysis
- [ ] T106 Add performance optimization for large abstract collections

## Phase 7: Custom Entity Management (User Story 4 - P2)

**Goal**: Support adding works not in OpenAlex with metadata extraction and file integration
**Independent Test**: Create custom entities, upload PDFs, verify seamless integration

- [ ] T107 Create custom entity types extending standard catalogue entities
- [ ] T108 [P] Implement custom entity manager in packages/utils/src/storage/custom-entity.manager.ts
- [ ] T109 Create PDF metadata extraction service in apps/web/src/services/pdf-metadata-extractor.ts
- [ ] T110 Implement file metadata extractor for EPUB and DOCX formats
- [ ] T111 [P] Create CustomEntityManager component in apps/web/src/components/catalogue/CustomEntityManager.tsx
- [ ] T112 Implement manual entity creation interface
- [ ] T113 Create file upload and metadata extraction workflow
- [ ] T114 Implement duplicate detection between custom and OpenAlex entities
- [ ] T115 Add DOI lookup functionality for metadata validation
- [ ] T116 [P] Implement custom entity validation rules
- [ ] T117 Create entity import/export functionality
- [ ] T118 Add custom entities to existing catalogue search and filtering
- [ ] T119 Implement custom entity integration with citation export

## Phase 8: Live File System Synchronization (User Story 5 - P2)

**Goal**: Implement bidirectional sync with local file system using File System Access API
**Independent Test**: Grant folder access, add files locally, verify sync to BibGraph and vice versa

- [ ] T120 Check File System Access API availability and capabilities
- [ ] T121 [P] Implement file system sync provider in packages/utils/src/storage/file-system-sync.provider.ts
- [ ] T122 Create file system sync service in apps/web/src/services/file-system-sync.service.ts
- [ ] T123 Implement file change detection and conflict resolution
- [ ] T124 [P] Create file processor worker in apps/web/src/workers/file-processor.worker.ts
- [ ] T125 Create FileSystemSync component in apps/web/src/components/catalogue/FileSystemSync.tsx
- [ ] T126 Implement sync configuration interface with conflict strategies
- [ ] T127 Create bidirectional sync workflow with progress tracking
- [ ] T128 Implement conflict resolution UI with change previews
- [ ] T129 Add file system sync to settings and configuration
- [ ] T130 [P] Create progressive enhancement fallback for unsupported browsers
- [ ] T131 Implement batch processing for large file collections
- [ ] T132 Add sync status indicators and error handling
- [ ] T133 Create use-file-system-sync hook in apps/web/src/hooks/use-file-system-sync.ts

## Phase 9: Advanced Algorithms and Processing

**Goal**: Implement sophisticated algorithms for semantic analysis and data processing

- [ ] T134 Create semantic-prisma analysis algorithms in packages/algorithms/src/semantic-prisma/
- [ ] T135 [P] Implement advanced topic modeling with BERTopic-style pipeline
- [ ] T136 Create document similarity algorithms for duplicate detection
- [ ] T137 Implement citation network analysis for literature reviews
- [ ] T138 Create quality assessment algorithms for different study types
- [ ] T139 [P] Implement effect size calculation algorithms
- [ ] T140 Create PRISMA flow optimization algorithms
- [ ] T141 Implement data compression for large literature reviews
- [ ] T142 Create caching algorithms for frequently accessed data

## Phase 10: Integration and Polish

**Goal**: Integrate all components, add polish, and ensure seamless user experience

- [ ] T143 [P] Update main catalogue interface to include new literature review features
- [ ] T144 Add keyboard shortcuts and accessibility improvements
- [ ] T145 Implement error handling and user feedback
- [ ] T146 [P] Add performance monitoring and optimization
- [ ] T147 Create help documentation and tooltips
- [ ] T148 Implement data migration and backup functionality
- [ ] T149 Add dark mode support for new components
- [ ] T150 [P] Implement responsive design for mobile and tablet devices
- [ ] T151 Add internationalization support for new features
- [ ] T152 Create advanced search and filtering capabilities
- [ ] T153 Implement user preference management
- [ ] T154 Add data visualization dashboards and analytics

## Phase 11: Testing and Quality Assurance

**Goal**: Ensure test coverage and quality validation

- [ ] T155 Write unit tests for citation export functionality
- [ ] T156 [P] Write unit tests for literature review management
- [ ] T157 Write unit tests for topic modeling algorithms
- [ ] T158 Write unit tests for custom entity management
- [ ] T159 Write unit tests for file system synchronization
- [ ] T160 [P] Write integration tests for end-to-end workflows
- [ ] T161 Write performance tests for large datasets
- [ ] T162 Write accessibility tests for new UI components
- [ ] T163 Write security tests for file system access
- [ ] T164 [P] Write E2E tests for all user stories
- [ ] T165 Create test fixtures and sample data
- [ ] T166 Write browser compatibility tests for File System Access API

## Phase 12: Documentation and Deployment

**Goal**: Complete documentation and prepare for deployment

- [ ] T167 Update API documentation with new endpoints and services
- [ ] T168 [P] Create user documentation for all new features
- [ ] T169 Update developer documentation with architecture changes
- [ ] T170 Create migration guide for existing users
- [ ] T171 [P] Update deployment configuration for new dependencies
- [ ] T172 Create performance benchmarks and monitoring
- [ ] T173 Update change log and release notes

## Dependencies

### User Story Dependencies
- User Story 2 depends on User Story 1 (citation export needed for systematic review outputs)
- User Story 3 depends on User Story 2 (thematic analysis works on screened studies)
- User Story 4 independent (can be developed in parallel with Stories 1-2)
- User Story 5 independent (can be developed in parallel with Stories 1-3)
- User Story 6 depends on User Story 2 (sample bibliographies demonstrate PRISMA workflows)

### Technical Dependencies
- Web Workers must be implemented before heavy processing tasks
- Storage provider extensions must be completed before entity operations
- Type definitions must be created before implementation components
- Sample bibliographies require PRISMA flow diagram implementation (Phase 4)

## Parallel Execution Opportunities

### Maximum Parallelism (Up to 10 concurrent teams)
**Phase 1-2**: 12 parallel tasks available
**Phase 3-5**: 32 parallel tasks available (MVP foundation + sample bibliographies)
**Phase 6-8**: 27 parallel tasks available (advanced features)
**Phase 9-12**: 14 parallel tasks available

### Recommended Parallel Development Strategy

**Team 1 (Foundation)**: T001-T024 → T025-T036 → T037-T050 → Integration
**Team 2 (Sample Bibliographies)**: T051-T068 → Integration with PRISMA
**Team 3 (Semantic Analysis)**: T069-T083 → T111-T119 → Testing
**Team 4 (File Management)**: T084-T110 → Integration
**Team 5 (UI/UX)**: T120-T131 → T144-T150
**Team 6 (Testing)**: T132-T143 (can run parallel with implementation)

## Implementation Strategy

### MVP First Approach
1. **Week 1-4**: Complete User Stories 1-2 (Citation Export + Systematic Review)
2. **Week 5-6**: Complete User Story 6 (Sample Bibliographies)
3. **Week 7-10**: Complete User Stories 3-5 (Advanced Features)
4. **Week 11-12**: Integration, testing, and polish
5. **Week 13-14**: Documentation, deployment preparation

### Risk Mitigation
- File System Access API compatibility: Implement progressive enhancement early
- Performance with large datasets: Implement batch processing and streaming from start
- Memory constraints: Use Web Workers for all heavy processing
- Browser compatibility: Test across supported browsers throughout development
- Sample bibliography data: Source bibliographies from open-access review papers with CC licenses

### Quality Gates
- All new code must pass TypeScript strict validation
- All components must meet WCAG 2.1 AA accessibility standards
- All performance targets must be met (export <5s, PRISMA <1s, topic modeling <30s, sample load <2s)
- All user stories must pass independent testing criteria

## Success Criteria Validation

### Performance Targets
- T030: Implement streaming export for 1000+ citations in <5s
- T041: Implement PRISMA operations with <1s response times
- T065: Load sample list within 2s including work metadata
- T106: Implement topic modeling for 1000 abstracts in <30s
- T131: Implement file sync for 1000+ files with conflict detection

### Feature Completeness
- All 19 functional requirements implemented
- All 10 measurable success criteria met
- All 6 user stories independently testable
- Constitution compliance maintained throughout