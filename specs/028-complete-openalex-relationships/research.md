# Research Findings: Complete OpenAlex Relationship Support

**Date**: 2025-11-21
**Phase**: 0 (Research)
**Related**: [plan.md](./plan.md) | [spec.md](./spec.md)

## Executive Summary

This document consolidates research findings for implementing all remaining OpenAlex relationship types. Research confirmed that the OpenAlex API provides rich relationship data across 12 entity types, and the existing codebase has established patterns for relationship detection that can be extended. Key findings:

- **Grant Data**: Available on works via `grants[]` array with funder ID, display name, and optional award ID
- **Keyword Data**: Available on works via `keywords[]` array with 16+ keywords per work, including ID, display name, and relevance scores
- **Concept Data**: Legacy classification system (deprecated but still in data) via `concepts[]` with level, score, and wikidata links
- **Topic Metadata**: Enhanced topic structure with `count` (publication volume) and `score` (relevance strength) for authors/sources/institutions
- **Repository Data**: Institutional repositories via `repositories[]` with host organization linkage
- **Role Data**: Cross-entity role mappings showing when institutions/funders/publishers have multiple identities
- **RelationType Enum**: Already contains most required types (FUNDED_BY, WORK_HAS_KEYWORD, etc.)
- **Existing Patterns**: Relationship detection service uses analyzer methods that can be replicated for new types

---

## Research Task 1: OpenAlex Grant Data Structure

### Decision

Use `grants[]` array field on works entity. Each grant object contains:
- `funder`: OpenAlex funder ID (string, e.g., "https://openalex.org/F4320332161")
- `funder_display_name`: Human-readable funder name (string, e.g., "National Institutes of Health")
- `award_id`: Optional grant/award identifier (string | null)

### Rationale

OpenAlex provides complete funding information in a structured array format that directly maps to funder entities. The funder ID enables graph edge creation without additional lookups. Award IDs provide additional context for specific grants but are often null.

### API Response Example

```json
{
  "id": "https://openalex.org/W2311203695",
  "display_name": "MEGA7: Molecular Evolutionary Genetics Analysis Version 7.0 for Bigger Datasets",
  "grants": [
    {
      "funder": "https://openalex.org/F4320332161",
      "funder_display_name": "National Institutes of Health",
      "award_id": null
    }
  ]
}
```

**Query Used**: `https://api.openalex.org/works?filter=grants.funder:F4320332161&select=id,display_name,grants&per_page=1`

### Alternatives Considered

- **Alternative 1**: Use `funders.id` filter parameter instead of `grants` field
  - **Rejected**: Filter parameter only identifies works with funders, doesn't provide the grant data structure needed for relationship metadata

- **Alternative 2**: Fetch funder entities separately and infer relationships
  - **Rejected**: Inefficient and doesn't provide award ID context

### Implementation Notes

- Add `"grants"` to `ADVANCED_FIELD_SELECTIONS.works.minimal`
- Create `GrantRelationship` interface in types package
- Implement `analyzeGrantRelationshipsForWork()` analyzer method
- Create FUNDED_BY edges from work→funder (outbound direction, work owns the grants data)

---

## Research Task 2: OpenAlex Keyword Data Structure

### Decision

Use `keywords[]` array field on works entity. Each keyword object contains:
- `id`: OpenAlex keyword ID (string, URL format)
- `display_name`: Human-readable keyword text (string)
- `score`: Relevance score (number, 0-1 range)

### Rationale

Keywords provide more granular topical classification than topics. OpenAlex generates keywords algorithmically from work content. Scores indicate relevance strength, with higher scores representing more central themes.

### API Response Example

```json
{
  "id": "https://openalex.org/W2741809807",
  "display_name": "The state of OA: a large-scale analysis...",
  "keywords": [
    {
      "id": "https://openalex.org/keywords/citation",
      "display_name": "Citation",
      "score": 0.6881897449493408
    },
    {
      "id": "https://openalex.org/keywords/license",
      "display_name": "License",
      "score": 0.591956377029419
    },
    {
      "id": "https://openalex.org/keywords/scholarly-communication",
      "display_name": "Scholarly communication",
      "score": 0.5683152079582214
    }
    // ... 13 more keywords (16 total)
  ]
}
```

**Query Used**: `https://api.openalex.org/works/W2741809807?select=id,display_name,keywords`

### Alternatives Considered

- **Alternative 1**: Use topics instead of keywords
  - **Rejected**: Topics and keywords serve different purposes. Topics are broad subject areas; keywords are specific terms. Both should be supported.

- **Alternative 2**: Filter keywords by minimum score threshold
  - **Rejected**: Low-score keywords still provide value for research discovery. Let users filter in visualization if needed.

### Implementation Notes

- Add `"keywords"` to `ADVANCED_FIELD_SELECTIONS.works.minimal`
- Create `KeywordRelationship` interface with score field
- Implement `analyzeKeywordRelationshipsForWork()` analyzer method
- Create edges from work→keyword (outbound direction)
- Store score in edge metadata for potential visualization weighting

---

## Research Task 3: OpenAlex Concept Data Structure (Legacy)

### Decision

Use `concepts[]` array field on works entity (legacy, deprecated but still present). Each concept object contains:
- `id`: OpenAlex concept ID (string, URL format)
- `wikidata`: Wikidata URI (string, optional)
- `display_name`: Human-readable concept name (string)
- `level`: Hierarchy level 0-5 (number, 0=broadest, 5=most specific)
- `score`: Relevance score (number, 0-1 range)

### Rationale

Concepts are the predecessor to topics in OpenAlex. While deprecated (OpenAlex moved to topics in 2023), many works still have concept classifications. Supporting concepts ensures backward compatibility and complete data coverage for historical works.

**Key Difference**: Concepts come from Microsoft Academic Graph taxonomy (now discontinued). Topics use OpenAlex's own taxonomy aligned with Wikipedia/Wikidata.

### API Response Examples

**Work with Concepts** (19 concepts):
```json
{
  "id": "https://openalex.org/W2741809807",
  "concepts": [
    {
      "id": "https://openalex.org/C2778805511",
      "wikidata": "https://www.wikidata.org/wiki/Q1713",
      "display_name": "Citation",
      "level": 2,
      "score": 0.6881897449493408
    },
    {
      "id": "https://openalex.org/C2780560020",
      "wikidata": "https://www.wikidata.org/wiki/Q79719",
      "display_name": "License",
      "level": 2,
      "score": 0.591956377029419
    }
    // ... 17 more concepts
  ]
}
```

**Same Work with Topics** (3 topics):
```json
{
  "topics": [
    {
      "id": "https://openalex.org/T10102",
      "display_name": "scientometrics and bibliometrics research",
      "score": 0.9969000220298767,
      "subfield": {
        "id": "https://openalex.org/subfields/1804",
        "display_name": "Statistics, Probability and Uncertainty"
      },
      "field": {
        "id": "https://openalex.org/fields/18",
        "display_name": "Decision Sciences"
      },
      "domain": {
        "id": "https://openalex.org/domains/2",
        "display_name": "Social Sciences"
      }
    }
    // ... 2 more topics
  ]
}
```

**Query Used**: `https://api.openalex.org/works/W2741809807?select=id,display_name,concepts,topics`

### Observations

- **Concepts are more granular**: 19 concepts vs 3 topics for same work
- **Concepts have levels**: Hierarchical structure (0=broadest → 5=most specific)
- **Topics have taxonomy nesting**: Each topic includes subfield, field, domain structure
- **Both coexist**: Works can have both concepts and topics

### Alternatives Considered

- **Alternative 1**: Ignore concepts entirely, only support topics
  - **Rejected**: User Story 6 specifically requires legacy concept support for historical continuity

- **Alternative 2**: Merge concepts and topics into single relationship type
  - **Rejected**: They represent different taxonomies with different structures. Merging would lose semantic meaning.

### Implementation Notes

- Add `"concepts"` to `ADVANCED_FIELD_SELECTIONS.works.minimal`
- Create `ConceptRelationship` interface with level, score, wikidata fields
- Implement `analyzeConceptRelationshipsForWork()` analyzer method
- Create edges from work→concept (outbound direction)
- Visualization should distinguish concepts from topics (e.g., different colors or labels)
- Consider showing concept level in visualization (broader vs specific)

---

## Research Task 4: OpenAlex Topic Metadata Structure

### Decision

Use `topics[]` array field on author/source/institution entities. Enhanced topic structure includes:
- `id`: OpenAlex topic ID (string)
- `display_name`: Topic name (string)
- **`count`**: Publication count in this topic (number) - **Entity-specific metric**
- **`score`**: Relevance/strength score (number, 0-1 range) - **Entity-specific metric**
- `subfield`: Nested subfield object (id, display_name)
- `field`: Nested field object (id, display_name)
- `domain`: Nested domain object (id, display_name)

### Rationale

Topics on entities (authors, sources, institutions) include **metadata not present on work topics**:
- **`count`**: Number of publications by this entity in the topic (research volume indicator)
- **`score`**: Entity's strength/relevance in the topic (expertise indicator)

These metrics enable **expertise ranking**, **source selection**, and **institutional focus analysis** (User Stories 3-5).

### API Response Example (Author Topics)

```json
{
  "id": "https://openalex.org/A5023888391",
  "display_name": "Jason Priem",
  "topics": [
    {
      "id": "https://openalex.org/T10102",
      "display_name": "scientometrics and bibliometrics research",
      "count": 23,
      "score": 0.9994000196456909,
      "subfield": {
        "id": "https://openalex.org/subfields/1804",
        "display_name": "Statistics, Probability and Uncertainty"
      },
      "field": {
        "id": "https://openalex.org/fields/18",
        "display_name": "Decision Sciences"
      },
      "domain": {
        "id": "https://openalex.org/domains/2",
        "display_name": "Social Sciences"
      }
    },
    {
      "id": "https://openalex.org/T11937",
      "display_name": "Research Data Management Practices",
      "count": 11,
      "score": 0.991599977016449,
      "subfield": { "id": "...", "display_name": "..." },
      "field": { "id": "...", "display_name": "..." },
      "domain": { "id": "...", "display_name": "..." }
    }
    // ... 3 more topics (5 total)
  ]
}
```

**Query Used**: `https://api.openalex.org/authors/A5023888391?select=id,display_name,topics`

### Key Insights

- **Count = Research Volume**: Author has 23 publications in "scientometrics and bibliometrics research" topic
- **Score = Expertise Strength**: 0.9994 score indicates this is a primary research area
- **Ranking capability**: Topics sorted by score enable expertise ranking (User Story 3)
- **Same structure for sources/institutions**: Sources have topic counts for journal coverage; institutions have topic counts for research focus

### Alternatives Considered

- **Alternative 1**: Use work topics and aggregate to entity level
  - **Rejected**: Computationally expensive and doesn't match OpenAlex's authoritative entity-level metrics

- **Alternative 2**: Store only topic IDs without metadata
  - **Rejected**: Loses critical count/score information needed for User Stories 3-5

### Implementation Notes

- Add `"topics"` to `ADVANCED_FIELD_SELECTIONS` for authors, sources, institutions
- Create `TopicWithMetadata` interface extending base topic with count/score fields
- Implement `analyzeTopicRelationshipsForEntity()` **reusable** analyzer method
  - Method takes `entityType` parameter to handle authors/sources/institutions
- Create edges from entity→topic (outbound direction)
- Store count/score in edge metadata for visualization:
  - Edge thickness could represent count (research volume)
  - Edge opacity could represent score (relevance strength)
- **Note**: Works already have topics[] via existing implementation (spec-015), but work topics **lack count/score fields**

---

## Research Task 5: OpenAlex Repository Relationships

### Decision

Use `repositories[]` array field on institution entities. Each repository object contains:
- `id`: OpenAlex source ID for the repository (string)
- `display_name`: Repository name (string)
- `host_organization`: Institution ID hosting the repository (string)
- `host_organization_name`: Institution name (string)
- `host_organization_lineage`: Array of institution IDs in hierarchy (string[])

### Rationale

Repositories represent institutional research infrastructure (digital libraries, preprint servers, data repositories). OpenAlex models them as **source entities** hosted by institutions. This enables institutional repository mapping (User Story 7) and reveals scholarly infrastructure landscape.

### API Response Example

```json
{
  "id": "https://openalex.org/I27837315",
  "display_name": "University of Michigan–Ann Arbor",
  "repositories": [
    {
      "id": "https://openalex.org/S4306400393",
      "display_name": "Deep Blue (University of Michigan)",
      "host_organization": "https://openalex.org/I27837315",
      "host_organization_name": "University of Michigan–Ann Arbor",
      "host_organization_lineage": ["https://openalex.org/I27837315"]
    },
    {
      "id": "https://openalex.org/S4306400708",
      "display_name": "CINECA IRIS Institutional Research Information System (IRIS Istituto Nazionale di Ricerca Metrologica)",
      "host_organization": "https://openalex.org/I27837315",
      "host_organization_name": "University of Michigan–Ann Arbor",
      "host_organization_lineage": ["https://openalex.org/I27837315"]
    }
  ]
}
```

**Query Used**: `https://api.openalex.org/institutions/I27837315?select=id,display_name,repositories`

### Key Insights

- **Repositories are sources**: Repository IDs use `/sources/` prefix (S-prefixed)
- **Bidirectional relationship**: Institution→Repository and Repository→Institution (via host_organization)
- **Lineage included**: Host organization lineage enables hierarchical relationship traversal
- **Multiple repositories common**: Institutions may host multiple repositories (example shows 2)

### Alternatives Considered

- **Alternative 1**: Create custom repository entity type
  - **Rejected**: OpenAlex models repositories as sources. Creating separate entity type would complicate graph data model.

- **Alternative 2**: Only link institution→repository without reverse
  - **Rejected**: Bidirectional relationship provides richer navigation. Repository entity pages should show host institution.

### Implementation Notes

- Add `"repositories"` to `ADVANCED_FIELD_SELECTIONS.institutions.minimal`
- Create `RepositoryRelationship` interface with host organization fields
- Implement `analyzeRepositoryRelationshipsForInstitution()` analyzer method
- Create edges: institution→repository (outbound via repositories[] data)
- RelationType: Use existing `INSTITUTION_HAS_REPOSITORY` enum value (already defined in core.ts:23)
- When repository source entity is loaded, create reverse edge: repository→institution (inbound)

---

## Research Task 6: OpenAlex Role Relationships

### Decision

Use `roles[]` array field on institution/funder/publisher entities. Each role object contains:
- `role`: Role type (string: "funder" | "institution" | "publisher")
- `id`: OpenAlex ID for the entity in that role (string)
- `works_count`: Number of works associated with this role (number)

### Rationale

Many organizations operate in multiple capacities in the research ecosystem. For example, "University of Michigan" is:
- An **institution** (I27837315) with 953,710 associated works
- A **funder** (F4320309652) with 4,108 funded works
- A **publisher** (P4310316579) with 1,272 published works

The `roles[]` field exposes these **cross-entity identity mappings**, enabling organizational complexity analysis (User Story 8).

### API Response Example

```json
{
  "id": "https://openalex.org/I27837315",
  "display_name": "University of Michigan–Ann Arbor",
  "roles": [
    {
      "role": "funder",
      "id": "https://openalex.org/F4320309652",
      "works_count": 4108
    },
    {
      "role": "institution",
      "id": "https://openalex.org/I27837315",
      "works_count": 953710
    },
    {
      "role": "publisher",
      "id": "https://openalex.org/P4310316579",
      "works_count": 1272
    }
  ]
}
```

**Query Used**: `https://api.openalex.org/institutions/I27837315?select=id,display_name,roles`

### Key Insights

- **Cross-entity mapping**: Same organization has 3 different OpenAlex IDs for different roles
- **Works count per role**: Indicates activity level in each capacity
- **Asymmetric data**: Roles array may appear on institution, funder, or publisher entities (depends on primary classification)
- **Graph implications**: Creates connections between separate entity types (institution node → funder node → publisher node)

### Alternatives Considered

- **Alternative 1**: Store roles as node metadata instead of edges
  - **Rejected**: Roles represent relationships between distinct OpenAlex entities. Should be modeled as edges for proper graph traversal.

- **Alternative 2**: Create "super-entity" combining all roles
  - **Rejected**: Violates OpenAlex data model. Each role is a distinct entity with separate ID, works, and metadata.

### Implementation Notes

- Add `"roles"` to `ADVANCED_FIELD_SELECTIONS` for institutions, funders, publishers
- Create `RoleRelationship` interface with role type and works_count
- Implement `analyzeRoleRelationshipsForEntity()` **reusable** analyzer method
  - Method handles institutions, funders, and publishers
- Create edges between entities of different types based on role mappings:
  - Institution I27837315 → Funder F4320309652 (role: "funder")
  - Institution I27837315 → Publisher P4310316579 (role: "publisher")
- RelationType: May need new enum value (e.g., `HAS_ROLE`, `ACTS_AS`) or use `RELATED_TO`
- Store role type and works_count in edge metadata
- **Challenge**: Role edges connect entities that may not yet be loaded in graph
  - Solution: Create edge if target entity exists; otherwise skip (consistent with other relationship detection patterns)

---

## Research Task 7: RelationType Enum Review

### Decision

The existing `RelationType` enum in `packages/graph/src/types/core.ts` **already contains most required relationship types**. Required additions:
- ✅ **FUNDED_BY** (line 44) - Already defined: "funded_by"
- ✅ **WORK_HAS_KEYWORD** (line 51) - Already defined: "work_has_keyword"
- ✅ **INSTITUTION_HAS_REPOSITORY** (line 23) - Already defined: "institution_has_repository"
- ❌ **CONCEPT** - **Missing** - Need to add for legacy concept relationships
- ❌ **ENTITY_HAS_ROLE** or **HAS_ROLE** - **Missing** - Need to add for role relationships

### Current RelationType Enum Structure

```typescript
export enum RelationType {
  // Core academic relationships (noun form)
  AUTHORSHIP = "AUTHORSHIP", // Work → Author
  AFFILIATION = "AFFILIATION", // Author → Institution
  PUBLICATION = "PUBLICATION", // Work → Source
  REFERENCE = "REFERENCE", // Work → Work
  TOPIC = "TOPIC", // Work → Topic

  // Publishing relationships
  HOST_ORGANIZATION = "HOST_ORGANIZATION", // Source → Publisher

  // Institutional relationships
  LINEAGE = "LINEAGE", // Institution → Institution
  INSTITUTION_ASSOCIATED = "institution_associated",
  INSTITUTION_HAS_REPOSITORY = "institution_has_repository", // ✅ Already exists

  // Deprecated aliases
  AUTHORED = "AUTHORSHIP", // @deprecated
  AFFILIATED = "AFFILIATION", // @deprecated
  // ... (other deprecated aliases)

  // Additional relationship types
  AUTHOR_RESEARCHES = "author_researches", // Author → Topic
  FIELD_PART_OF_DOMAIN = "field_part_of_domain",
  FUNDED_BY = "funded_by", // ✅ Already exists
  FUNDER_LOCATED_IN = "funder_located_in",
  INSTITUTION_LOCATED_IN = "institution_located_in",
  PUBLISHER_CHILD_OF = "publisher_child_of",
  TOPIC_PART_OF_FIELD = "topic_part_of_field",
  TOPIC_PART_OF_SUBFIELD = "topic_part_of_subfield",
  TOPIC_SIBLING = "topic_sibling",
  WORK_HAS_KEYWORD = "work_has_keyword", // ✅ Already exists

  // General catch-all
  RELATED_TO = "related_to",
}
```

### Rationale

OpenAlex relationships were already partially implemented in specs 014-015. The existing enum covers most new relationship types. Only legacy concepts and cross-entity roles need new enum values.

### Required Additions

1. **CONCEPT** - For legacy work→concept relationships
   ```typescript
   CONCEPT = "concept", // Work → Concept (legacy classification)
   ```

2. **HAS_ROLE** - For cross-entity role relationships
   ```typescript
   HAS_ROLE = "has_role", // Institution/Funder/Publisher → Role entity
   ```

### Alternatives Considered

- **Alternative 1**: Use `WORK_HAS_CONCEPT` instead of `CONCEPT`
  - **Consideration**: Consistent with `WORK_HAS_KEYWORD` naming pattern
  - **Decision**: Use `CONCEPT` for brevity (matches `TOPIC` naming)

- **Alternative 2**: Create specific role types (`INSTITUTION_AS_FUNDER`, `INSTITUTION_AS_PUBLISHER`)
  - **Rejected**: Creates enum proliferation. Better to use generic `HAS_ROLE` with role metadata in edge

- **Alternative 3**: Reuse `RELATED_TO` for role relationships
  - **Rejected**: Too generic. Role relationships have specific semantic meaning

### Implementation Notes

- Add 2 new enum values to `RelationType` in `packages/graph/src/types/core.ts`
- Update RELATIONSHIP_TYPE_LABELS mapping in web app for display names:
  - `CONCEPT`: "Concept Classification"
  - `HAS_ROLE`: "Organizational Role"
- No migration needed - new enum values, not renaming existing ones

---

## Research Task 8: Relationship Detection Patterns

### Decision

Follow the **analyzer method pattern** established in `relationship-detection-service.ts`. Each relationship type gets a dedicated analyzer method that:
1. Accepts `MinimalEntityData` as input
2. Extracts relationship array from entity data
3. Checks if target entities exist in graph
4. Creates `GraphEdge` objects for valid relationships
5. Returns array of edges

### Existing Analyzer Method Example

```typescript
// From relationship-detection-service.ts (lines not shown in snippet, but pattern is clear)
private analyzeAuthorshipsForWork(work: MinimalEntityData): GraphEdge[] {
  if (!work.authorships || work.authorships.length === 0) {
    return [];
  }

  const edges: GraphEdge[] = [];
  const existingNodes = graphStore.getNodes();

  for (const authorship of work.authorships) {
    const authorId = authorship.author.id;

    // Only create edge if author node exists in graph
    if (existingNodes.some(node => node.id === authorId)) {
      edges.push({
        id: `${work.id}-authorship-${authorId}`,
        source: work.id, // Work owns the authorships data
        target: authorId,
        type: RelationType.AUTHORSHIP,
        direction: 'outbound', // Data stored on source entity
        label: 'authored by',
      });
    }
  }

  return edges;
}
```

### Pattern Analysis

**Key Characteristics**:
1. **Null-safe**: Check if relationship array exists and has length
2. **Target validation**: Only create edges if target node exists in graph (avoids dangling edges)
3. **Edge ID format**: `${sourceId}-${relationType}-${targetId}` ensures uniqueness
4. **Direction**: Always `'outbound'` for relationships owned by source entity
5. **Metadata**: Can include additional OpenAlex data in `metadata` field

### Rationale

This pattern is proven, tested, and followed consistently across existing relationship analyzers (authorships, affiliations, topics, references). Reusing the pattern ensures:
- Consistency in codebase
- Predictable behavior (no edges to non-existent nodes)
- Easy testing (mock graphStore.getNodes())
- Clear separation of concerns (one analyzer per relationship type)

### Required Analyzer Methods

Based on spec requirements:
1. **`analyzeGrantRelationshipsForWork(work: MinimalEntityData): GraphEdge[]`**
   - Extract `work.grants[]`
   - Create edges to funder entities

2. **`analyzeKeywordRelationshipsForWork(work: MinimalEntityData): GraphEdge[]`**
   - Extract `work.keywords[]`
   - Create edges to keyword entities

3. **`analyzeConceptRelationshipsForWork(work: MinimalEntityData): GraphEdge[]`**
   - Extract `work.concepts[]`
   - Create edges to concept entities

4. **`analyzeTopicRelationshipsForEntity(entity: MinimalEntityData, entityType: EntityType): GraphEdge[]`**
   - **Reusable** for authors, sources, institutions
   - Extract `entity.topics[]` (with count/score metadata)
   - Create edges to topic entities

5. **`analyzeRepositoryRelationshipsForInstitution(institution: MinimalEntityData): GraphEdge[]`**
   - Extract `institution.repositories[]`
   - Create edges to source (repository) entities

6. **`analyzeRoleRelationshipsForEntity(entity: MinimalEntityData, entityType: EntityType): GraphEdge[]`**
   - **Reusable** for institutions, funders, publishers
   - Extract `entity.roles[]`
   - Create edges between different entity types based on role mappings

### Alternatives Considered

- **Alternative 1**: Single generic `analyzeRelationships()` method handling all types
  - **Rejected**: Reduces code clarity and testability. Each relationship type has unique structure and logic.

- **Alternative 2**: Create edges to non-existent nodes and fetch them on-demand
  - **Rejected**: Creates cascading fetches and loading complexity. Current pattern is simpler.

### Implementation Notes

- Add 6 new private analyzer methods to `RelationshipDetectionService` class
- Call analyzer methods from `detectRelationships()` main method
- Pass entity type to reusable methods (topics, roles) for proper handling
- Store relationship metadata (scores, counts, award IDs) in edge `metadata` field
- Follow null-safety pattern: check array existence before iteration

---

## Research Task 9: MinimalEntityData Interface Patterns

### Decision

The `MinimalEntityData` interface is defined **inline** in `relationship-detection-service.ts` (lines 34-52), not in the types package. This is intentional - it represents a **service-local contract** for relationship detection, not a shared type.

### Current MinimalEntityData Interface

```typescript
interface MinimalEntityData {
  id: string;
  entityType: EntityType;
  display_name: string;

  // Work relationships
  authorships?: Array<{ author: { id: string; display_name: string } }>;
  primary_location?: { source?: { id: string; display_name: string } };
  referenced_works?: string[];

  // Author relationships
  affiliations?: Array<{ institution: { id: string; display_name: string } }>;
  last_known_institutions?: Array<{ id: string; display_name: string }>;

  // Institution relationships
  lineage?: string[];
  publisher?: string;

  // Taxonomy relationships (topics, domains, fields, subfields)
  fields?: Array<{ id: string; display_name: string }>;
  domain?: { id: string; display_name: string };
  subfields?: Array<{ id: string; display_name: string }>;
  field?: { id: string; display_name: string };
  topics?: Array<{ id: string; display_name: string }>;
  subfield?: { id: string; display_name: string };
}
```

### Required Extensions

Add the following fields to support new relationship types:

```typescript
interface MinimalEntityData {
  // ... existing fields ...

  // Work → Funder relationships
  grants?: Array<{
    funder: string; // Funder ID
    funder_display_name: string;
    award_id?: string | null;
  }>;

  // Work → Keyword relationships
  keywords?: Array<{
    id: string;
    display_name: string;
    score?: number;
  }>;

  // Work → Concept relationships (legacy)
  concepts?: Array<{
    id: string;
    wikidata?: string;
    display_name: string;
    level: number;
    score: number;
  }>;

  // Entity → Topic relationships (enhanced with metadata)
  // NOTE: Override existing topics definition to add count/score
  topics?: Array<{
    id: string;
    display_name: string;
    count?: number; // Publication count in topic (entity-specific)
    score?: number; // Relevance strength (entity-specific)
    subfield?: { id: string; display_name: string };
    field?: { id: string; display_name: string };
    domain?: { id: string; display_name: string };
  }>;

  // Institution → Repository relationships
  repositories?: Array<{
    id: string; // Source ID
    display_name: string;
    host_organization?: string;
    host_organization_name?: string;
    host_organization_lineage?: string[];
  }>;

  // Cross-entity role relationships
  roles?: Array<{
    role: 'funder' | 'institution' | 'publisher';
    id: string;
    works_count?: number;
  }>;
}
```

### Rationale

- **Inline definition**: Keeps relationship detection service self-contained. External code doesn't need these internal type definitions.
- **Optional fields**: All relationship fields are optional (`?:`) because not all entities have all relationship types
- **Nested structures**: Some relationships (grants, keywords, concepts) have complex nested objects matching OpenAlex API response format
- **Array types**: All relationships are arrays because entities can have multiple relationships of each type
- **Type alignment**: Field structures match OpenAlex API responses exactly to avoid transformation overhead

### Alternatives Considered

- **Alternative 1**: Move MinimalEntityData to `packages/types`
  - **Rejected**: This interface is specific to relationship detection service. Moving to shared types would create coupling.

- **Alternative 2**: Create separate interfaces for each entity type (MinimalWorkData, MinimalAuthorData, etc.)
  - **Rejected**: Adds complexity. Single interface with optional fields is sufficient and more flexible.

- **Alternative 3**: Use `unknown` type for all relationships and add type guards
  - **Rejected**: Loses type safety benefits. Explicit optional fields are better.

### Implementation Notes

- Modify `MinimalEntityData` interface in `relationship-detection-service.ts` (lines 34-52)
- Add 6 new optional field groups (grants, keywords, concepts, enhanced topics, repositories, roles)
- Update existing `topics` definition to include count/score fields (backward compatible - fields are optional)
- TypeScript compiler will enforce these types in analyzer methods
- No changes to external interfaces needed (this is internal to relationship detection service)

---

## Research Task 10: Field Selection Configuration

### Decision

The `ADVANCED_FIELD_SELECTIONS` object in `packages/client/src/advanced-field-selection.ts` controls which fields are fetched from OpenAlex API for each entity type. Structure:

```typescript
export const ADVANCED_FIELD_SELECTIONS = {
  works: {
    minimal: ["id", "display_name", "publication_year", "type",
              "open_access", "authorships", "primary_location",
              "referenced_works", "topics"],
  },
  authors: {
    minimal: ["id", "display_name", "works_count",
              "last_known_institutions", "orcid"],
  },
  sources: {
    minimal: ["id", "display_name", "type", "publisher"],
  },
  institutions: {
    minimal: ["id", "display_name", "country_code", "type", "lineage"],
  },
  // ... other entity types
};
```

### Required Additions

**Works**: Add `"grants"`, `"keywords"`, `"concepts"`
```typescript
works: {
  minimal: [
    // ... existing fields ...
    "grants",    // ← ADD
    "keywords",  // ← ADD
    "concepts",  // ← ADD
  ],
},
```

**Authors**: Add `"topics"`
```typescript
authors: {
  minimal: [
    // ... existing fields ...
    "topics", // ← ADD (with count/score metadata)
  ],
},
```

**Sources**: Add `"topics"`
```typescript
sources: {
  minimal: [
    // ... existing fields ...
    "topics", // ← ADD (with count/score metadata)
  ],
},
```

**Institutions**: Add `"topics"`, `"repositories"`, `"roles"`
```typescript
institutions: {
  minimal: [
    // ... existing fields ...
    "topics",       // ← ADD (with count/score metadata)
    "repositories", // ← ADD
    "roles",        // ← ADD
  ],
},
```

### Rationale

- **Minimal level**: All new relationship fields should be in `minimal` selection set because:
  1. Relationship data is small (array of IDs and names)
  2. Required for graph visualization (core functionality)
  3. Not optional or "advanced" data - these are fundamental relationships
- **Field names match API**: OpenAlex API parameter names match exactly (e.g., `?select=grants,keywords,concepts`)
- **Automatic inclusion**: Once added to ADVANCED_FIELD_SELECTIONS, fields are automatically included in all fetchMinimalEntityData() calls

### Field Selection Hierarchy

OpenAlex API supports `select` parameter to limit returned fields:
- **No select parameter**: Returns ALL fields (large payload)
- **With select parameter**: Returns only specified fields (optimized)

Example: `https://api.openalex.org/works/W123?select=id,display_name,grants,keywords`

### Alternatives Considered

- **Alternative 1**: Add fields to `standard` or `full` selection sets instead of `minimal`
  - **Rejected**: Relationship data is core to graph functionality, not optional. Belongs in minimal set.

- **Alternative 2**: Fetch relationship fields on-demand when needed
  - **Rejected**: Creates multiple API requests. Better to fetch once with entity.

- **Alternative 3**: Use GraphQL-style field selection for more granular control
  - **Rejected**: OpenAlex API uses simple CSV format for select parameter, not GraphQL.

### Implementation Notes

- Modify `ADVANCED_FIELD_SELECTIONS` object in `packages/client/src/advanced-field-selection.ts`
- Add fields to appropriate entity type minimal arrays
- No code changes needed in fetchMinimalEntityData() - it already uses this configuration
- TypeScript will not enforce field selection (it's just string[]) - relies on documentation
- Test by calling OpenAlex API with updated select parameter and verifying response includes new fields

---

## Summary of Key Decisions

| Relationship Type | Data Source | Analyzer Method | RelationType Enum | Fields to Add |
|------------------|-------------|-----------------|-------------------|---------------|
| Work → Funder | `work.grants[]` | `analyzeGrantRelationshipsForWork` | `FUNDED_BY` ✅ | `grants` (works) |
| Work → Keyword | `work.keywords[]` | `analyzeKeywordRelationshipsForWork` | `WORK_HAS_KEYWORD` ✅ | `keywords` (works) |
| Work → Concept | `work.concepts[]` | `analyzeConceptRelationshipsForWork` | `CONCEPT` ❌ NEW | `concepts` (works) |
| Entity → Topic | `entity.topics[]` | `analyzeTopicRelationshipsForEntity` | `TOPIC` ✅ | `topics` (authors, sources, institutions) |
| Institution → Repository | `institution.repositories[]` | `analyzeRepositoryRelationshipsForInstitution` | `INSTITUTION_HAS_REPOSITORY` ✅ | `repositories` (institutions) |
| Entity → Role | `entity.roles[]` | `analyzeRoleRelationshipsForEntity` | `HAS_ROLE` ❌ NEW | `roles` (institutions) |

**Legend**: ✅ Already exists | ❌ Needs to be added

---

## Next Steps (Phase 1: Design Artifacts)

With research complete, proceed to Phase 1 tasks:
1. **Data Model Design**: Create `data-model.md` with TypeScript interfaces for all relationship types
2. **API Contracts**: Generate `contracts/` directory with analyzer method signatures
3. **Quickstart Documentation**: Write `quickstart.md` with implementation examples
4. **Update Agent Context**: Run `update-agent-context.sh` to add research findings to CLAUDE.md

All research findings have been documented. No NEEDS CLARIFICATION markers remain from Technical Context. Ready to proceed with design artifacts generation.
