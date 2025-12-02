# Feature Specification: Advanced Literature Review Workflows

**Feature Branch**: `029-literature-review`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "Enhance BibGraph catalogue feature to support advanced literature review workflows including PRISMA systematic reviews, semantic analysis, citation export formats (BibTeX/RIS), custom entity support for non-OpenAlex works, and live file system synchronization using browser File System Access API"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Citation Export and Reference Management (Priority: P1)

As a researcher, I need to export my bibliography in standard academic formats so I can integrate with reference management software and submit to journals.

**Why this priority**: This is foundational functionality that enables all other literature review workflows and provides immediate value to existing users.

**Independent Test**: Can be fully tested by exporting a catalogue with mixed OpenAlex entities and verifying BibTeX/RIS/CSV formats are generated correctly with proper metadata.

**Acceptance Scenarios**:

1. **Given** a catalogue with works, authors, and institutions, **When** user selects BibTeX export, **Then** export file contains properly formatted citations with custom fields for literature review metadata
2. **Given** a bibliography list, **When** user chooses RIS export, **Then** file is compatible with EndNote, Zotero, and Mendeley
3. **Given** entities with custom metadata, **When** user exports to CSV, **Then** all custom fields are included as configurable columns
4. **Given** duplicate citations, **When** export is generated, **Then** consistent citation keys are created using author+year+title pattern

---

### User Story 2 - Systematic Review Management (Priority: P1)

As a researcher conducting a systematic review, I need to track my progress through PRISMA stages and make inclusion/exclusion decisions with clear criteria so I can produce transparent, reproducible research.

**Why this priority**: Systematic reviews are a core academic workflow with strict methodological requirements (PRISMA 2020) that differentiate BibGraph from generic reference managers.

**Independent Test**: Can be fully tested by creating a literature review project, adding studies, and making screening decisions to verify PRISMA flow tracking works correctly.

**Acceptance Scenarios**:

1. **Given** a new literature review project, **When** user configures PRISMA stages, **Then** system tracks identified, screened, eligible, and included counts automatically
2. **Given** studies in screening stage, **When** user applies inclusion/exclusion criteria, **Then** decisions are recorded with timestamps, reasons, and reviewer information
3. **Given** completed screening, **When** user generates PRISMA flow diagram, **Then** visualization accurately reflects all study counts and decisions
4. **Given** quality assessment enabled, **When** user evaluates studies, **Then** standardized scoring is recorded and summary statistics are calculated

---

### User Story 3 - Thematic and Semantic Analysis (Priority: P2)

As a researcher analyzing literature patterns, I need to automatically identify themes and track topics across different stages of my review so I can discover research gaps and conceptual relationships.

**Why this priority**: Advanced semantic analysis provides unique value beyond basic reference management and supports sophisticated research methodologies.

**Independent Test**: Can be fully tested by uploading a set of abstracts and verifying that topic modeling generates meaningful themes that can be manually refined and organized.

**Acceptance Scenarios**:

1. **Given** a collection of studies, **When** user initiates topic modeling, **Then** system extracts and displays coherent themes with keywords and relevance scores
2. **Given** generated themes, **When** user manually edits or reorganizes themes, **Then** changes are reflected in all related visualizations and analysis
3. **Given** PRISMA semantic review enabled, **When** studies move through screening stages, **Then** topic analysis updates automatically for each stage
4. **Given** completed analysis, **When** user exports coding matrix, **Then** file is compatible with qualitative analysis software (NVivo, Atlas.ti)

---

### User Story 4 - Custom Entity Management (Priority: P2)

As a researcher, I need to add works and sources that aren't in OpenAlex to my catalogue so I can maintain a complete bibliography including unpublished papers, conference proceedings, and personal references.

**Why this priority**: Real-world research involves materials beyond major databases, and custom entities ensure comprehensive coverage of relevant literature.

**Independent Test**: Can be fully tested by manually creating custom entities, uploading PDFs with metadata extraction, and verifying they integrate seamlessly with OpenAlex entities.

**Acceptance Scenarios**:

1. **Given** a PDF not in OpenAlex, **When** user uploads file, **Then** system extracts metadata and creates custom entity with proper validation
2. **Given** manual entity creation, **When** user enters bibliography details, **Then** system validates format and prevents duplicates against existing entities
3. **Given** mixed OpenAlex and custom entities, **When** user searches catalogue, **Then** both types appear seamlessly in results
4. **Given** custom entities, **When** user exports bibliography, **Then** all entities are included with proper formatting regardless of source

---

### User Story 5 - Live File System Synchronization (Priority: P2)

As a researcher, I need my BibGraph catalogue to automatically sync with local file system folders so I can work with PDFs, notes, and supporting documents while maintaining data consistency.

**Why this priority**: File system integration bridges the gap between web-based cataloguing and local document management, providing seamless workflow integration.

**Independent Test**: Can be fully tested by granting folder access, adding files locally, and verifying changes sync to BibGraph and vice versa.

**Acceptance Scenarios**:

1. **Given** granted file system access, **When** user selects local folder, **Then** system establishes bidirectional sync with clear status indicators
2. **Given** synced folder, **When** user adds PDF locally, **Then** BibGraph automatically detects and offers to create corresponding entity
3. **Given** catalogue changes, **When** user modifies entity metadata, **Then** changes are reflected in local file system organization
4. **Given** sync conflicts, **When** both local and app changes occur simultaneously, **Then** system presents clear resolution options with change previews

---

### User Story 6 - Catalogues as First-Class Entities with Parent Relationships (Priority: P1)

As a researcher, I need catalogues to be first-class entities that can have parent relationships to any other entity (works, authors, institutions, etc.) so I can create meaningful collections like "bibliography of this review paper", "collaborators of this author", or "outputs of this institution".

**Why this priority**: Promoting catalogues to entity status enables a unified data model where any entity can have associated lists. This supports sample bibliographies, user-created review bibliographies, collaborator networks, and nested collections (lists of lists) with one consistent pattern.

**Independent Test**: Can be fully tested by creating a catalogue with a parent entity, verifying navigation between parent and catalogue, testing nested catalogues, and confirming sample catalogues load correctly.

**Acceptance Scenarios**:

1. **Given** any entity page, **When** user creates a new catalogue, **Then** they can optionally associate it as a child of that entity with a relationship label (e.g., "bibliography", "collaborators")
2. **Given** a catalogue with a parent entity, **When** user views the catalogue, **Then** the parent entity is displayed with navigation link and relationship context
3. **Given** a catalogue entity, **When** user adds another catalogue to it, **Then** nested catalogue relationships are supported (lists of lists)
4. **Given** sample catalogues in public folder, **When** user browses samples, **Then** pre-packaged catalogues with PRISMA workflows are loadable with full feature support
5. **Given** a catalogue page, **When** user navigates via URL, **Then** lists are accessible at `/lists/L123` with `/catalogues/L123` as redirect alias

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support export to BibTeX format with custom fields for literature review metadata (screening status, themes, quality scores)
- **FR-002**: System MUST support export to RIS format compatible with major reference management software
- **FR-003**: Users MUST be able to create systematic review projects with PRISMA 2020 compliant workflow tracking
- **FR-004**: System MUST provide interactive PRISMA flow diagram visualization with accurate study counts
- **FR-005**: Users MUST be able to record screening decisions with inclusion/exclusion criteria, reasons, and timestamps
- **FR-006**: System MUST support automatic topic modeling using modern NLP techniques on study abstracts and metadata
- **FR-007**: Users MUST be able to manually edit and reorganize automatically identified themes
- **FR-008**: System MUST support creation of custom entities for works not available in OpenAlex
- **FR-009**: System MUST provide metadata extraction from academic file formats (PDF, EPUB, DOCX)
- **FR-010**: System MUST support live bidirectional synchronization with local file system using File System Access API
- **FR-011**: System MUST provide conflict resolution when simultaneous changes occur in local files and BibGraph
- **FR-012**: Users MUST be able to import/export complete catalogue data to structured local file system
- **FR-013**: System MUST maintain data integrity and performance for catalogues with 5000+ entities
- **FR-014**: System MUST provide quality assessment tools with standardized scoring for different study types
- **FR-015**: Catalogues MUST be first-class entities with their own entity type (`lists`) and ID prefix (`L`)
- **FR-016**: Catalogues MUST support optional parent entity relationships to any entity type (works, authors, institutions, catalogues, etc.)
- **FR-017**: Catalogues MUST support containing any entity type, including other catalogues (nested lists)
- **FR-018**: System MUST provide list routes (`/lists/L123`) as primary, with `/catalogues/L123` as redirect alias
- **FR-019**: System MUST serve sample catalogues as pre-packaged CatalogueList entities via static JSON in the public folder
- **FR-020**: Sample catalogues MUST use the same data structure as user-created catalogues for consistency

### Key Entities

- **CatalogueList**: First-class entity representing a collection of entities with optional parent entity relationship, supporting nested catalogues and mixed entity types
- **LiteratureReview**: Represents a systematic review project with PRISMA stage tracking, research domain, methodology, and progress metrics
- **ScreeningDecision**: Records inclusion/exclusion decisions with criteria, reasoning, reviewer information, and timestamps
- **Theme**: Represents thematic analysis results with labels, keywords, relevance scores, and associated studies
- **CustomEntity**: Extends standard entities with local file system integration, verification status, and extracted metadata
- **SyncConfiguration**: Manages file system synchronization settings, conflict resolution preferences, and sync status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can export bibliographies with 1000+ citations in under 5 seconds in any supported format
- **SC-002**: System maintains sub-second response times for PRISMA stage operations with catalogues up to 5000 studies
- **SC-003**: 95% of users successfully complete systematic review setup and first screening decision within 15 minutes
- **SC-004**: Topic modeling processes 1000 abstracts and generates meaningful themes in under 30 seconds
- **SC-005**: File system synchronization handles 1000+ files with automatic conflict detection and resolution
- **SC-006**: Custom entity creation and metadata extraction achieves 90% accuracy for standard academic PDFs
- **SC-007**: Export files achieve 100% compatibility with major reference managers (EndNote, Zotero, Mendeley)
- **SC-008**: System maintains 99.9% data integrity during all import/export and synchronization operations
- **SC-009**: Sample bibliographies load within 2 seconds including all referenced work metadata
- **SC-010**: At least 5 sample bibliographies available at launch covering different review types (systematic, meta-analysis, scoping)

## Constitution Alignment

- **Type Safety**: Feature avoids `any` types; uses `unknown` with type guards where needed
- **Test-First**: User stories include testable acceptance scenarios; implementation will follow Red-Green-Refactor
- **Monorepo Architecture**: Feature fits within existing apps/ and packages/ structure; packages MUST NOT re-export from other internal packages
- **Storage Abstraction**: Uses storage provider interface; no direct Dexie/IndexedDB coupling
- **Performance & Memory**: Success criteria include performance metrics; memory constraints considered
- **Atomic Conventional Commits**: Implementation tasks will be committed atomically with conventional commit messages; spec files committed after each phase
- **Development-Stage Pragmatism**: Breaking changes acceptable; no backwards compatibility obligations during development
- **Test-First Bug Fixes**: Any bugs discovered will have regression tests written before fixes
- **Repository Integrity**: ALL issues must be resolved—"pre-existing" is not an excuse; entire monorepo must be deployable
- **Continuous Execution**: Implementation will proceed through all phases without pausing; spec commits after each phase completion
- **Complete Implementation**: Full feature as specified will be implemented; no simplified fallbacks without user approval
- **Spec Index Maintenance**: specs/README.md will be updated when spec status changes; committed alongside spec changes
- **Build Output Isolation**: TypeScript builds to dist/, never alongside source files
- **Working Files Hygiene**: Debug files and temporary artifacts will be cleaned up before commit
- **DRY Code & Configuration**: No duplicate logic; shared utilities extracted; configuration extends shared base; cruft cleaned proactively
- **Presentation/Functionality Decoupling**: Web app components separate presentation from business logic; logic in hooks/services, rendering in components; both layers independently testable