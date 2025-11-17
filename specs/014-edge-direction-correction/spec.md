# Feature Specification: Edge Direction Correction for OpenAlex Data Model

**Feature Branch**: `014-edge-direction-correction`
**Created**: 2025-11-17
**Status**: Draft
**Input**: User description: "correct the edge directions to match the open alex data structure"

## User Scenarios & Testing

### User Story 1 - Accurate Citation Network Visualization (Priority: P1)

Researchers viewing a work's citation network need to see which papers it references (outbound citations stored on the work) and which papers cite it (inbound citations requiring reverse lookup). Currently, edge directions are reversed from the OpenAlex data model, making it impossible to distinguish between outbound relationships (stored directly on the entity) and inbound relationships (requiring queries to find entities that reference this one).

**Why this priority**: This is the foundational correction that unblocks proper inbound/outbound filtering. Without correct edge directions, the graph misrepresents the actual data structure and makes it impossible to implement directional filters. This affects all relationship types across all entity types.

**Independent Test**: Can be fully tested by viewing a work's relationships and verifying that edges point from the work to its authors (not authors to work), from the work to its references (not references to work), and from the work to its source. Delivers immediate value by accurately representing the OpenAlex data model.

**Acceptance Scenarios**:

1. **Given** a work entity with authors, **When** the graph displays authorship relationships, **Then** edges point from the work to each author (Work → Author), not from authors to the work
2. **Given** a work entity with referenced_works, **When** the graph displays citation relationships, **Then** edges point from the citing work to the referenced works (Work → Referenced Work)
3. **Given** a work entity with a primary_location.source, **When** the graph displays publication relationships, **Then** the edge points from the work to the source (Work → Source)
4. **Given** an author entity with affiliations, **When** the graph displays institutional relationships, **Then** edges point from the author to institutions (Author → Institution)
5. **Given** an institution with lineage, **When** the graph displays hierarchical relationships, **Then** edges point from the child institution to parent institutions (Institution → Parent Institution)

---

### User Story 2 - Distinguish Outbound vs Inbound Relationships (Priority: P2)

Researchers analyzing entity relationships need to differentiate between outbound relationships (stored directly on the entity in OpenAlex) and inbound relationships (discovered by querying other entities). For example, when viewing a Work, outbound relationships include "authors" and "references" (stored on the work), while inbound relationships include "cited by" (found by querying other works that reference this one).

**Why this priority**: Builds on P1 by enabling users to understand data provenance. Outbound relationships are immediately available from the entity data, while inbound relationships require additional queries. This distinction affects performance, caching strategies, and user expectations for data completeness.

**Independent Test**: Can be tested by examining a work entity and verifying that outbound edges (authors, references, source) are clearly distinguished from inbound edges (works that cite this paper, which may be incomplete if not all citing works are in the graph).

**Acceptance Scenarios**:

1. **Given** a work entity in the graph, **When** displaying its relationships, **Then** outbound edges (to authors, references, source, topics) are visually distinct from inbound edges (from works that cite it)
2. **Given** a researcher viewing an author's relationships, **When** examining affiliations, **Then** outbound edges (to institutions) are distinguished from inbound edges (from works that list this author)
3. **Given** incomplete graph data, **When** viewing inbound relationships, **Then** the system indicates that inbound relationships may be incomplete (only shows citing works currently in the graph)
4. **Given** a source entity, **When** displaying relationships, **Then** outbound edges (to publisher) are distinguished from inbound edges (from works published in this source)

---

### User Story 3 - Filter by Relationship Direction (Priority: P3)

Researchers exploring large graphs need to filter edges by direction to focus on specific relationship patterns. For example, when viewing a highly-cited work, they may want to show only outbound references (papers this work cites) or only inbound citations (papers that cite this work).

**Why this priority**: Enhances usability for complex graphs by allowing focused exploration. This is a user-facing feature that depends on the correct edge directions from P1 and the inbound/outbound distinction from P2.

**Independent Test**: Can be tested by toggling direction filters on a work with both outbound references and inbound citations, verifying that each filter shows the appropriate subset of edges.

**Acceptance Scenarios**:

1. **Given** a work with both outbound and inbound relationships, **When** the user enables "Show Outbound Only" filter, **Then** only edges originating from this work are displayed (authors, references, source, topics)
2. **Given** a work with inbound citations, **When** the user enables "Show Inbound Only" filter, **Then** only edges pointing to this work are displayed (citing works)
3. **Given** an author with both outbound and inbound relationships, **When** applying directional filters, **Then** outbound shows affiliations, inbound shows authored works
4. **Given** multiple entities selected in the graph, **When** applying directional filters, **Then** filters apply consistently across all selected entities based on their entity type

---

### Edge Cases

- What happens when a work has no outbound references but many inbound citations (highly influential paper)?
- How does the system handle circular references (Work A references Work B, Work B references Work A)?
- What happens when viewing a newly added entity that has outbound relationships to entities not yet in the graph?
- How does the system represent bidirectional relationships that exist in OpenAlex data (e.g., institution lineage chains)?
- What happens when an entity's data is incomplete or missing expected relationship fields?

## Clarifications

### Session 2025-11-17

- Q: What should happen to existing saved graphs that users have created with the current (incorrect) edge directions? → A: Re-detect relationships from stored entity data when graph is loaded
- Q: Should RelationType enum use active voice (HAS_AUTHOR), passive voice (AUTHORED_BY), or noun form (AUTHORSHIP)? → A: Noun form (AUTHORSHIP, REFERENCE, PUBLICATION, AFFILIATION) to match OpenAlex field naming pattern
- Q: Should edges store additional OpenAlex relationship metadata (e.g., author_position, is_corresponding for authorship)? → A: Store all available OpenAlex relationship metadata on edges, for all edge types across all entity types
- Q: How should outbound vs inbound edges be visually distinguished? → A: Combination of line style (solid for outbound, dashed for inbound), color variation, and arrow style for maximum accessibility
- Q: Should relationship re-detection happen synchronously or asynchronously when loading graphs? → A: Synchronous re-detection (complete before graph renders, may show loading indicator)

## Requirements

### Functional Requirements

- **FR-001**: System MUST reverse all existing edge directions to match OpenAlex data ownership model (edges point from data owner to referenced entity)
- **FR-002**: Relationship detection service MUST create edges with source as the entity containing the relationship data and target as the referenced entity
- **FR-003**: Work → Author edges MUST replace Author → Work edges for authorship relationships
- **FR-004**: Work → Work edges MUST represent citation relationships (citing work points to referenced work)
- **FR-005**: Work → Source edges MUST represent publication relationships
- **FR-006**: Author → Institution edges MUST represent affiliation relationships
- **FR-007**: Source → Publisher edges MUST represent publisher relationships
- **FR-008**: Institution → Institution edges MUST represent parent-child hierarchical relationships
- **FR-009**: System MUST classify each edge as outbound (stored on source entity) or inbound (requires reverse lookup)
- **FR-010**: Edge filters section MUST provide toggle controls for "Show Outbound", "Show Inbound", "Show Both"
- **FR-011**: Visual rendering MUST distinguish outbound edges from inbound edges using combination of line style (solid for outbound, dashed for inbound), color variation, and arrow style for accessibility
- **FR-012**: System MUST synchronously re-detect relationships from stored entity data when loading existing graphs (complete before graph renders, show loading indicator if needed)
- **FR-013**: Relationship type enum values MUST use noun form to match OpenAlex field naming pattern (e.g., AUTHORED → AUTHORSHIP, REFERENCES → REFERENCE)
- **FR-014**: Edges MUST store all available OpenAlex relationship metadata (e.g., author_position and is_corresponding for authorship, institutions for affiliations) for all edge types

### Key Entities

- **GraphEdge**: Represents a directed relationship between two nodes
  - `source`: Entity ID of the node that owns the relationship data (e.g., Work for authorship)
  - `target`: Entity ID of the referenced entity (e.g., Author in authorship)
  - `type`: RelationType enum value (e.g., AUTHORSHIP, REFERENCE, PUBLICATION, AFFILIATION)
  - `direction`: Classification as "outbound" or "inbound" relative to the data owner
  - `label`: Human-readable relationship description matching the direction
  - `metadata`: Object containing all available OpenAlex relationship data specific to edge type (e.g., for AUTHORSHIP: author_position, is_corresponding, institutions, raw_affiliation_strings; for AFFILIATION: years, institution details)

- **RelationType**: Enum defining all relationship types aligned with OpenAlex data model
  - Noun form values matching OpenAlex field names (e.g., AUTHORSHIP, REFERENCE, PUBLICATION, AFFILIATION, LINEAGE)

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of edges in existing graphs are re-detected with correct directions matching OpenAlex data ownership model when graphs are loaded
- **SC-002**: Relationship detection for new entities creates edges in correct direction on first attempt (zero manual corrections needed)
- **SC-003**: Users can filter edges by direction (outbound/inbound) with results appearing in under 1 second for graphs with up to 500 nodes
- **SC-004**: Visual distinction between outbound and inbound edges is perceivable by users through multiple independent visual channels (line style, color, arrow style) meeting WCAG 2.1 Level AA accessibility standards
- **SC-005**: All existing tests pass after edge direction migration (zero regression in graph functionality)

## Constitution Alignment

- **Type Safety**: Edge direction changes use proper TypeScript types; no `any` types introduced; RelationType enum values are type-safe
- **Test-First**: User stories include acceptance scenarios; implementation will update existing tests before changing edge directions (Red phase), then fix detection logic (Green phase)
- **Monorepo Architecture**: Changes isolated to `packages/graph` (edge model), `apps/web/src/services/relationship-detection-service.ts` (detection logic), and `apps/web/src/components/sections/EdgeFiltersSection.tsx` (UI controls)
- **Storage Abstraction**: Edge data stored in graph-store; relationship re-detection does not bypass storage provider interface
- **Performance & Memory**: Success criteria include performance metrics for directional filtering; edge direction adds minimal memory overhead (boolean classification)
- **Atomic Conventional Commits**: Changes will be committed atomically: (1) update RelationType enum, (2) update relationship detection logic, (3) add directional filtering UI
- **Development-Stage Pragmatism**: Breaking change acceptable; existing saved graphs will have relationships re-detected from entity data on load
