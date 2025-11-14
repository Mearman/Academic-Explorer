# Feature Specification: OpenAlex Walden Support (Data Version 2)

**Feature Branch**: `013-walden-research`
**Created**: 2025-11-14-220219
**Status**: Draft
**Input**: User description: "research https://blog.openalex.org/openalex-rewrite-walden-launch/ https://blog.openalex.org/were-rebuilding-openalex-while-its-running-heres-whats-changing/ https://oreo.openalex.org/ https://docs.google.com/document/d/1SPZ7QFcPddCHYt1pZP1UCIuqbfBY22lSHwgPA8RQyUY/edit?tab=t.0"

## User Scenarios & Testing

### User Story 1 - Access Latest OpenAlex Data Quality Improvements (Priority: P1)

As a researcher using Academic Explorer, I need to access the improved OpenAlex Data Version 2 (Walden) so that I can benefit from better citation parsing, location detection, and language identification.

**Why this priority**: This is foundational - all users should automatically receive the highest quality data available from OpenAlex without manual intervention.

**Independent Test**: Can be fully tested by querying works via Academic Explorer and verifying the response includes improved metadata (more references, more locations, better language detection) compared to Data Version 1.

**Acceptance Scenarios**:

1. **Given** Academic Explorer is running, **When** a user searches for works, **Then** the system automatically uses OpenAlex Data Version 2 by default
2. **Given** a work with multiple repository locations, **When** the user views work details, **Then** all locations are displayed (14% increase expected)
3. **Given** a work in a non-English language, **When** the user views work metadata, **Then** the language is accurately detected using the new algorithm
4. **Given** a work with open access versions, **When** the user views OA status, **Then** the status reflects improved OA classification

---

### User Story 2 - Explore Extended Research Outputs (xpac) (Priority: P2)

As a researcher interested in non-traditional research outputs, I need access to xpac works (datasets, software, specimens) by default with the ability to filter them out so that I can discover and analyze the full spectrum of research artifacts while maintaining control over my search scope.

**Why this priority**: This expands the scope of discoverable content by default (190M additional works), aligning with OpenAlex's future direction. Users who prefer traditional works only can opt-out.

**Independent Test**: Can be tested independently by verifying that searches include xpac works by default, and adding a toggle in the UI that enables/disables xpac works.

**Acceptance Scenarios**:

1. **Given** the xpac feature is enabled (default), **When** a user searches for works, **Then** the system includes datasets, software, physical specimens, and other non-traditional outputs
2. **Given** the xpac feature is disabled by user choice, **When** a user searches for works, **Then** the system only returns traditional works (articles, books, etc.)
3. **Given** xpac is enabled, **When** viewing work details, **Then** work type labels accurately reflect non-traditional types (dataset, software, specimen)
4. **Given** a user is viewing xpac works, **When** they see author information, **Then** the UI indicates when authors are name strings only (not disambiguated IDs)

---

### User Story 3 - Compare Data Versions for Migration (Priority: P3)

As a researcher with existing saved searches or analyses, I need to temporarily access Data Version 1 alongside Version 2 so that I can verify my results are consistent and understand any differences during the November transition period.

**Why this priority**: This is a temporary capability for the transition month (November) to help users validate their workflows aren't broken by the migration.

**Independent Test**: Can be tested by adding a data version selector that switches between v1 and v2 and comparing results for the same query.

**Acceptance Scenarios**:

1. **Given** it is November 2025, **When** a user accesses settings, **Then** they can select between Data Version 1 and Data Version 2
2. **Given** a user selects Data Version 1, **When** they perform a search, **Then** the system sends `data-version=1` parameter to OpenAlex API
3. **Given** a user switches from v1 to v2 for the same work, **When** comparing metadata, **Then** differences are highlighted (new references, locations, improved language)
4. **Given** it is December 2025 or later, **When** a user accesses settings, **Then** the data version selector is removed (v2 is permanent)

---

### Edge Cases

- What happens when xpac works have missing or incomplete metadata that Academic Explorer normally expects?
- How does the system handle works that gained references/citations between v1 and v2 (affects citation counts)?
- What happens when a user has bookmarked a work and its metadata significantly changes in v2?
- How does the force-directed graph handle 190M additional xpac works when included (performance impact)?
- What happens if OpenAlex API returns errors for v1 queries after November (when support ends)?
- How does the system handle works where author disambiguation is pending (name strings only)?
- What happens when work types change between versions (e.g., something classified as "article" in v1 becomes "dataset" in v2)?

## Requirements

### Functional Requirements

- **FR-001**: System MUST automatically use OpenAlex Data Version 2 by default for all API requests
- **FR-002**: System MUST include xpac works by default and provide a user toggle to disable them
- **FR-003**: System MUST send `include_xpac=true` parameter by default; omit parameter when user disables xpac
- **FR-004**: System MUST display work type information for all works, including non-traditional types
- **FR-005**: System MUST indicate when author information is a name string only (not a disambiguated ID)
- **FR-006**: System MUST support temporary access to Data Version 1 using `data-version=1` parameter during November 2025
- **FR-007**: System MUST remove Data Version 1 access option after November 2025
- **FR-008**: System MUST handle works with improved metadata (more references, locations, better language, OA status, topics, licenses) gracefully
- **FR-009**: System MUST persist user's xpac preference across sessions (default: true)
- **FR-010**: System MUST display appropriate information about xpac works regarding metadata quality and author disambiguation status
- **FR-011**: System MUST display visual indicators (badges) for works with improved metadata from Data Version 2 (e.g., increased references, locations, better language detection)
- **FR-012**: System MUST render xpac works with visual distinction in author-based graph visualizations when they lack disambiguated Author IDs (e.g., dashed borders, muted colors, unverified badge)

### Key Entities

- **Work (Enhanced)**: Research outputs with improved metadata coverage
  - New: 14% increase in references for existing works
  - New: 14% increase in locations for existing works
  - Enhanced: Improved language detection (especially non-English)
  - Enhanced: Better OA status classification
  - Enhanced: More accurate topic assignment (5% gain coverage)
  - Enhanced: Higher quality keyword assignments
  - Enhanced: Better license detection (5% gain coverage)

- **xpac Work**: Extended non-traditional research outputs (opt-in)
  - Types: datasets, software, physical specimens, and other artifacts
  - Source: DataCite and institutional/preprint repositories
  - Count: 190M additional works
  - Limitations: Lower metadata quality, no author disambiguation yet, variable work type accuracy

- **Data Version**: API parameter controlling which dataset version to use
  - Version 1: Legacy dataset (available through November 2025 only)
  - Version 2: Walden codebase dataset (default from November 4, 2025)

## Success Criteria

### Measurable Outcomes

- **SC-001**: All work queries automatically receive Data Version 2 metadata without user action (100% of queries)
- **SC-002**: xpac works are included by default and 190M additional results are available for search (measureable via API response counts)
- **SC-003**: 14% of previously cached works show increased reference counts when refreshed
- **SC-004**: 14% of previously cached works show increased location counts when refreshed
- **SC-005**: Non-English language works show improved accuracy in language detection (subjective but verifiable by manual inspection of sample works)
- **SC-006**: Users receive appropriate information about xpac works regarding metadata quality and author disambiguation status when viewing xpac results
- **SC-007**: System performance remains acceptable with xpac works included by default (graph rendering, search results loading under 5 seconds for typical queries)
- **SC-008**: Data Version 1 access works correctly during November 2025 and is automatically removed December 1, 2025

## Constitution Alignment

- **Type Safety**: Feature uses proper TypeScript types for new API parameters (`data-version`, `include_xpac`); no `any` types
- **Test-First**: User stories include testable acceptance scenarios for v2 default, xpac toggle, and v1 temporary access
- **Monorepo Architecture**: Feature spans multiple packages (client for API params, ui for toggles, types for enhanced work schemas)
- **Storage Abstraction**: Enhanced work metadata stored via storage provider interface; xpac preference persisted via settings storage
- **Performance & Memory**: Success criteria include performance metrics for xpac-enabled searches and graph rendering
- **Atomic Conventional Commits**: Implementation will be committed atomically with conventional commit messages per package affected

## Assumptions

- OpenAlex API will maintain backward compatibility for Data Version 2 requests (no breaking schema changes)
- The `data-version=1` parameter will remain functional through November 30, 2025
- Academic Explorer defaults `include_xpac=true` to align with OpenAlex's future direction (they plan to make xpac default but timing is TBD)
- xpac works will eventually receive full author disambiguation, but no timeline specified
- Fulltext indexing issues in Walden will be resolved by OpenAlex team (not Academic Explorer responsibility)
- OREO evaluation tool (https://oreo.openalex.org/) will remain available for tracking data quality improvements

## Known Walden Improvements

The following improvements are documented in the Walden release and should be reflected in Academic Explorer:

1. **References & Citations**: 14% of works have new references; 8% see increased citation counts
2. **Locations**: 14% of works see increased location counts (publisher, repository, preprint)
3. **Language Detection**: New community-contributed algorithm improves non-English language accuracy
4. **Open Access**: Better OA classification finds more open access works
5. **Topics**: 5% of works gain topic assignments where none existed
6. **Keywords**: Much higher quality keyword assignments (subjective improvement)
7. **Licenses**: 5% of works gain license information where none existed before

## Dependencies

- OpenAlex API support for `data-version` and `include_xpac` parameters
- Access to OREO (OpenAlex Rewrite Evaluation Overview) for tracking data quality
- Updated client package to support new API parameters
- Enhanced work type detection in UI components
- Settings storage for persisting xpac preference

## Design Decisions

### Metadata Improvement Visibility
**Decision**: Highlight improvements with badges/indicators

Works that have improved metadata in Data Version 2 will display visual indicators showing enhancements (e.g., "New: 5 more references", "Improved language detection"). This provides educational value and helps users understand data quality improvements from the Walden rewrite.

### Author Visualization for xpac Works
**Decision**: Include with visual distinction

xpac works that lack disambiguated Author IDs (name strings only) will be included in author-based graph visualizations with visual styling to distinguish them (e.g., dashed borders, muted colors, "unverified author" badge). This provides a complete view of an author's works while making it clear which works need author disambiguation.
