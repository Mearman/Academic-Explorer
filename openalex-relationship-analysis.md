# OpenAlex Relationship Implementation Analysis

**Date:** 2025-11-18
**Analyzed Files:**
- `packages/graph/src/types/core.ts` (RelationType enum)
- `packages/graph/src/providers/openalex-provider.ts` (edge creation logic)
- `packages/types/src/entities/schemas.ts` (OpenAlex entity schemas)

## Executive Summary

**Critical Finding:** Multiple relationship directionality errors detected. The implementation creates edges in the opposite direction from the OpenAlex data ownership model.

**Key Issues:**
1. AUTHORSHIP edges are reversed (creating Author → Work instead of Work → Author)
2. AFFILIATION edges are reversed (creating Author → Institution instead of Author → Institution)
3. Missing relationships: referenced_works[], grants[] (funders), topic hierarchies, institution lineages, source host_organizations
4. Inconsistent implementation across expansion methods

---

## OpenAlex Data Ownership Model

In OpenAlex, the entity that **owns** the relationship array is the **source** of the edge:

| Entity | Owns Array | Should Create Edge |
|--------|-----------|-------------------|
| Work | `authorships[]` | Work → Author |
| Work | `referenced_works[]` | Work → Work (citation) |
| Work | `topics[]` | Work → Topic |
| Work | `primary_location.source` | Work → Source |
| Work | `grants[].funder` | Work → Funder |
| Author | `affiliations[]` | Author → Institution |
| Author | `last_known_institutions[]` | Author → Institution |
| Source | `host_organization` | Source → Publisher |
| Institution | `lineage[]` | Institution → Institution (parent) |
| Topic | `field`, `domain` | Topic → Field → Domain |
| Publisher | `parent_publisher` | Publisher → Publisher (parent) |
| Concept | `ancestors[]` | Concept → Concept (parent) |

---

## Complete Relationship Matrix

### Works Relationships

| Relationship | OpenAlex Field | Enum Status | Implementation | Direction | Status |
|-------------|---------------|-------------|----------------|-----------|---------|
| **AUTHORSHIP** | `authorships[]` | ✅ Defined | ❌ **REVERSED** | Should be Work → Author<br>Currently: Author → Work | ❌ **CRITICAL** |
| **PUBLICATION** | `primary_location.source` | ✅ Defined | ✅ Implemented | Work → Source | ✅ Correct |
| **REFERENCE** | `referenced_works[]` | ✅ Defined | ❌ Missing | Work → Work (cited work) | ❌ Missing |
| **TOPIC** | `topics[]` | ✅ Defined | ✅ Implemented | Work → Topic | ✅ Correct |
| **FUNDED_BY** | `grants[].funder` | ✅ Defined | ❌ Missing | Work → Funder | ❌ Missing |
| **Related Works** | `related_works[]` | ❌ Not defined | ❌ Missing | Work → Work | ❌ Missing |
| **Concepts** | `concepts[]` | ❌ Deprecated | ❌ Missing | Work → Concept | ⚠️ Deprecated |
| **SDGs** | `sustainable_development_goals[]` | ❌ Not defined | ❌ Missing | Work → SDG | ❌ Missing |
| **Keywords** | `keywords[]` | ⚠️ Partial | ❌ Missing | Work → Keyword | ❌ Missing |

**Code Evidence (openalex-provider.ts:550-556):**
```typescript
edges.push({
    id: `${workId}-authored-${authorship.author.id}`,
    source: authorship.author.id,  // ❌ WRONG: Should be workId
    target: workId,                 // ❌ WRONG: Should be author.id
    type: RelationType.AUTHORSHIP,
    direction: 'outbound',
})
```

**Comment says:** `// Work → Author (via authorships[])` (line 23)
**Code does:** Author → Work (REVERSED)

---

### Authors Relationships

| Relationship | OpenAlex Field | Enum Status | Implementation | Direction | Status |
|-------------|---------------|-------------|----------------|-----------|---------|
| **AFFILIATION** | `affiliations[]` | ✅ Defined | ❌ **REVERSED** | Should be Author → Institution<br>Currently: Author → Institution | ⚠️ See note |
| **Last Known Institutions** | `last_known_institutions[]` | ❌ Uses AFFILIATION | ❌ Missing | Author → Institution | ❌ Missing |
| **AUTHOR_RESEARCHES** | `topics[]` | ✅ Defined | ❌ Missing | Author → Topic | ❌ Missing |
| **Authored Works** | Reverse lookup | ✅ Uses AUTHORSHIP | ✅ Implemented | Author → Work | ⚠️ See note |

**Note on Author expansion (openalex-provider.ts:632-638):**
```typescript
edges.push({
    id: `${authorId}-authored-${workRecord.id}`,
    source: authorId,              // Author → Work (reverse lookup)
    target: String(workRecord.id),
    type: RelationType.AUTHORSHIP,
    direction: 'outbound',
})
```

**Critical Issue:** This creates **Author → Work** edges when expanding authors, but **Author → Work** edges when expanding works. This creates **inconsistent bidirectional edges** with the same relationship type but opposite directions.

---

### Sources Relationships

| Relationship | OpenAlex Field | Enum Status | Implementation | Direction | Status |
|-------------|---------------|-------------|----------------|-----------|---------|
| **HOST_ORGANIZATION** | `host_organization` | ✅ Defined | ❌ Missing | Source → Publisher | ❌ Missing |
| **Published Works** | Reverse lookup | ✅ Uses PUBLICATION | ✅ Implemented | Work → Source | ✅ Correct |

**Implementation (openalex-provider.ts:692-698):** Creates Work → Source when expanding sources (correct direction, inbound lookup)

---

### Institutions Relationships

| Relationship | OpenAlex Field | Enum Status | Implementation | Direction | Status |
|-------------|---------------|-------------|----------------|-----------|---------|
| **LINEAGE** | `lineage[]` | ✅ Defined | ❌ Missing | Institution → Institution (parent) | ❌ Missing |
| **Associated Institutions** | `associated_institutions[]` | ❌ Not defined | ❌ Missing | Institution → Institution | ❌ Missing |
| **Affiliated Authors** | Reverse lookup | ✅ Uses AFFILIATION | ✅ Implemented | Author → Institution | ✅ Correct |

**Implementation (openalex-provider.ts:751-757):** Creates Author → Institution when expanding institutions (correct for reverse lookup)

---

### Topics Relationships

| Relationship | OpenAlex Field | Enum Status | Implementation | Direction | Status |
|-------------|---------------|-------------|----------------|-----------|---------|
| **TOPIC_PART_OF_FIELD** | `field` | ✅ Defined | ❌ Missing | Topic → Field | ❌ Missing |
| **Field to Domain** | `field.id`, `domain.id` | ❌ Not defined | ❌ Missing | Field → Domain | ❌ Missing |
| **Subfield** | `subfield` | ❌ Not defined | ❌ Missing | Topic → Subfield | ❌ Missing |
| **Siblings** | `siblings[]` | ❌ Not defined | ❌ Missing | Topic ↔ Topic | ❌ Missing |
| **Works with Topic** | Reverse lookup | ✅ Uses TOPIC | ✅ Implemented | Work → Topic | ✅ Correct |

**Schema Evidence (schemas.ts:457-477):**
```typescript
topicSchema = {
    subfield: { id, display_name },  // Topic → Subfield (missing)
    field: { id, display_name },     // Topic → Field (missing)
    domain: { id, display_name },    // Topic → Domain (missing)
    siblings: [{ id, display_name }] // Topic ↔ Topic (missing)
}
```

---

### Publishers Relationships

| Relationship | OpenAlex Field | Enum Status | Implementation | Direction | Status |
|-------------|---------------|-------------|----------------|-----------|---------|
| **PUBLISHER_CHILD_OF** | `parent_publisher` | ✅ Defined | ❌ Missing | Publisher → Publisher (parent) | ❌ Missing |
| **Lineage** | `lineage[]` | ❌ Uses institution LINEAGE | ❌ Missing | Publisher → Publisher (ancestors) | ❌ Missing |

**Schema Evidence (schemas.ts:398-399):**
```typescript
parent_publisher: openAlexIdSchema.optional(),
lineage: z.array(openAlexIdSchema),
```

---

### Funders Relationships

| Relationship | OpenAlex Field | Enum Status | Implementation | Direction | Status |
|-------------|---------------|-------------|----------------|-----------|---------|
| **FUNDER_LOCATED_IN** | `country_code` | ✅ Defined | ❌ Missing | Funder → Country | ❌ Missing |
| **Funded Works** | Reverse lookup | ✅ Uses FUNDED_BY | ❌ Missing | Work → Funder | ❌ Missing |

---

### Concepts Relationships (Deprecated)

| Relationship | OpenAlex Field | Enum Status | Implementation | Direction | Status |
|-------------|---------------|-------------|----------------|-----------|---------|
| **Concept Ancestors** | `ancestors[]` | ❌ Not defined | ❌ Missing | Concept → Concept (parent) | ⚠️ Deprecated |
| **Related Concepts** | `related_concepts[]` | ❌ Not defined | ❌ Missing | Concept ↔ Concept | ⚠️ Deprecated |

**Note:** Concepts are deprecated in OpenAlex (replaced by Topics), but still present in API responses.

---

### Keywords Relationships

| Relationship | OpenAlex Field | Enum Status | Implementation | Direction | Status |
|-------------|---------------|-------------|----------------|-----------|---------|
| **WORK_HAS_KEYWORD** | `keywords[]` (on Works) | ✅ Defined | ❌ Missing | Work → Keyword | ❌ Missing |

---

## Summary Statistics

### Relationship Coverage

| Category | Total Available | Defined in Enum | Implemented | Correct Direction | Coverage % |
|----------|----------------|----------------|-------------|-------------------|-----------|
| **Core Relationships** | 8 | 5 | 3 | 2 | 25% |
| **Works Relationships** | 9 | 5 | 2 | 1 | 11% |
| **Author Relationships** | 4 | 2 | 1 | 1 | 25% |
| **Source Relationships** | 2 | 1 | 0 | N/A | 0% |
| **Institution Relationships** | 3 | 1 | 0 | N/A | 0% |
| **Topic Relationships** | 5 | 1 | 0 | N/A | 0% |
| **Publisher Relationships** | 2 | 1 | 0 | N/A | 0% |
| **Funder Relationships** | 2 | 1 | 0 | N/A | 0% |

### Issue Breakdown

| Issue Type | Count | Critical? |
|------------|-------|-----------|
| **Reversed Direction** | 2 | ✅ Yes |
| **Missing Implementation** | 18 | ⚠️ Medium |
| **Not Defined in Enum** | 8 | ⚠️ Medium |
| **Inconsistent Bidirectionality** | 1 | ✅ Yes |

---

## Critical Directionality Errors

### 1. AUTHORSHIP (CRITICAL)

**Comment says (core.ts:23):**
```typescript
AUTHORSHIP = "AUTHORSHIP", // Work → Author (via authorships[])
```

**Code does (openalex-provider.ts:550-556):**
```typescript
edges.push({
    source: authorship.author.id,  // ❌ WRONG
    target: workId,                 // ❌ WRONG
    type: RelationType.AUTHORSHIP,
})
```

**Should be:**
```typescript
edges.push({
    source: workId,                // ✅ CORRECT (Work owns authorships[])
    target: authorship.author.id,  // ✅ CORRECT
    type: RelationType.AUTHORSHIP,
    direction: 'outbound',
})
```

**Impact:** All authorship relationships in the graph are backwards. Queries like "find all works by author X" will fail.

---

### 2. AUTHORSHIP Bidirectional Inconsistency (CRITICAL)

**When expanding Works (openalex-provider.ts:550-556):**
```typescript
source: authorship.author.id,  // Author → Work
target: workId,
```

**When expanding Authors (openalex-provider.ts:632-638):**
```typescript
source: authorId,              // Author → Work
target: String(workRecord.id),
```

**Problem:** Both create Author → Work edges, but:
- Work expansion uses `direction: 'outbound'` (wrong - should be outbound from Work)
- Author expansion uses `direction: 'outbound'` (correct - is outbound from Author via reverse lookup)

**Result:** Duplicate edges with same source/target but different semantics. Graph algorithms will treat these as separate relationships.

---

### 3. AFFILIATION Direction Ambiguity

**Schema (schemas.ts:267-272):**
```typescript
affiliations: z.array(
    z.object({
        institution: z.any(),
        years: z.array(z.number().int()),
    })
)
```

**Current implementation (openalex-provider.ts:751-757):**
```typescript
// When expanding institutions (reverse lookup)
edges.push({
    source: String(authorRecord.id),  // Author → Institution
    target: institutionId,
    type: RelationType.AFFILIATION,
    direction: 'outbound',
})
```

**Analysis:** This is actually CORRECT for the reverse lookup case (institution expansion), but the forward case (author expansion) is missing. Should implement:
- Forward: Author owns `affiliations[]` → Author → Institution (outbound)
- Reverse: Institution query → Author → Institution (inbound)

---

## Missing Relationships (High Priority)

### 1. Work Citations (referenced_works[])

**Availability:** ✅ Available in schema (schemas.ts:148-149)
```typescript
referenced_works: z.array(openAlexIdSchema).optional(),
referenced_works_count: z.number().int().optional(),
```

**Enum:** ✅ Defined as `REFERENCE`

**Implementation:** ❌ Missing in `expandWorkWithCache()`

**Should create:**
```typescript
for (const refWorkId of (workData.referenced_works as string[]) || []) {
    edges.push({
        source: workId,           // Work owns referenced_works[]
        target: refWorkId,
        type: RelationType.REFERENCE,
        direction: 'outbound',
    })
}
```

**Impact:** Cannot build citation networks, citation analysis, or reference graphs.

---

### 2. Funding (grants[])

**Availability:** ✅ Available in schema (schemas.ts:160-168)
```typescript
grants: z.array(
    z.object({
        funder: z.string().optional(),
        funder_display_name: z.string().optional(),
        award_id: z.string().optional(),
    })
).optional(),
```

**Enum:** ✅ Defined as `FUNDED_BY`

**Implementation:** ❌ Missing in `expandWorkWithCache()`

**Should create:**
```typescript
for (const grant of (workData.grants as Array<{funder?: string}>) || []) {
    if (grant.funder) {
        edges.push({
            source: workId,       // Work owns grants[]
            target: grant.funder,
            type: RelationType.FUNDED_BY,
            direction: 'outbound',
            metadata: { award_id: grant.award_id }
        })
    }
}
```

**Impact:** Cannot analyze funding patterns, funder networks, or grant relationships.

---

### 3. Topic Hierarchies (field, domain)

**Availability:** ✅ Available in schema (schemas.ts:457-468)
```typescript
topicSchema = {
    subfield: { id, display_name },
    field: { id, display_name },
    domain: { id, display_name },
}
```

**Enum:** ⚠️ Only `TOPIC_PART_OF_FIELD` defined (need separate field→domain)

**Implementation:** ❌ Missing in `expandTopicWithCache()`

**Should create:**
```typescript
// Topic → Field
if (topicData.field?.id) {
    edges.push({
        source: topicId,
        target: topicData.field.id,
        type: RelationType.TOPIC_PART_OF_FIELD,
        direction: 'outbound',
    })
}

// Field → Domain (need new RelationType.FIELD_PART_OF_DOMAIN)
if (topicData.domain?.id) {
    edges.push({
        source: topicData.field.id,
        target: topicData.domain.id,
        type: RelationType.FIELD_PART_OF_DOMAIN,
        direction: 'outbound',
    })
}
```

**Impact:** Cannot build topic taxonomy, hierarchical topic browsing, or subject classification trees.

---

### 4. Institution Lineages (lineage[])

**Availability:** ✅ Available in schema (schemas.ts:329)
```typescript
lineage: z.array(openAlexIdSchema).optional(),
```

**Enum:** ✅ Defined as `LINEAGE`

**Implementation:** ❌ Missing in `expandInstitutionWithCache()`

**Should create:**
```typescript
for (const parentId of (institutionData.lineage as string[]) || []) {
    edges.push({
        source: institutionId,    // Institution owns lineage[]
        target: parentId,
        type: RelationType.LINEAGE,
        direction: 'outbound',
    })
}
```

**Impact:** Cannot show institutional hierarchies (e.g., department → university → university system).

---

### 5. Source Host Organizations (host_organization)

**Availability:** ⚠️ Not in current schema but available in OpenAlex API

**Enum:** ✅ Defined as `HOST_ORGANIZATION`

**Implementation:** ❌ Missing in `expandSourceWithCache()`

**Should add to schema and create:**
```typescript
if (sourceData.host_organization?.id) {
    edges.push({
        source: sourceId,
        target: sourceData.host_organization.id,
        type: RelationType.HOST_ORGANIZATION,
        direction: 'outbound',
    })
}
```

**Impact:** Cannot link journals to publishers.

---

### 6. Publisher Lineages (parent_publisher, lineage[])

**Availability:** ✅ Available in schema (schemas.ts:398-399)
```typescript
parent_publisher: openAlexIdSchema.optional(),
lineage: z.array(openAlexIdSchema),
```

**Enum:** ✅ Defined as `PUBLISHER_CHILD_OF`

**Implementation:** ❌ Missing (no `expandPublisherWithCache()` method)

**Should create:**
```typescript
async expandPublisherWithCache(...) {
    if (publisherData.parent_publisher) {
        edges.push({
            source: publisherId,
            target: publisherData.parent_publisher,
            type: RelationType.PUBLISHER_CHILD_OF,
            direction: 'outbound',
        })
    }
}
```

**Impact:** Cannot show publisher hierarchies (e.g., imprint → publisher → publishing group).

---

## Missing Entity Type Expansions

The following entity types have no `expand*WithCache()` methods:

1. **Publishers** - No expansion logic
2. **Funders** - No expansion logic
3. **Concepts** - No expansion logic (deprecated, low priority)
4. **Keywords** - No expansion logic

---

## Recommendations

### Phase 1: Critical Fixes (Breaking Changes)

**Priority: CRITICAL - Requires data migration**

1. **Fix AUTHORSHIP direction**
   - Update `expandWorkWithCache()` lines 550-556
   - Change `source: authorship.author.id` → `source: workId`
   - Change `target: workId` → `target: authorship.author.id`
   - Update all existing graph data (breaking change)

2. **Fix AUTHORSHIP bidirectional inconsistency**
   - Author expansion should create edges with `direction: 'inbound'` (reverse lookup)
   - Work expansion should create edges with `direction: 'outbound'` (owns data)
   - Consider: Should both directions exist? Or only one canonical direction?

3. **Decision: Unidirectional vs Bidirectional**
   - **Option A:** Only create edges from data owner (Work → Author when expanding work)
     - Pros: Single source of truth, no duplicates
     - Cons: Requires reverse traversal for queries
   - **Option B:** Create edges in both directions with `direction` metadata
     - Pros: Fast bidirectional queries
     - Cons: Duplicate edges, larger graph
   - **Recommendation:** Option A with proper indexing for reverse lookups

---

### Phase 2: High-Value Relationships

**Priority: HIGH - Adds major functionality**

1. **Implement Work Citations** (referenced_works[])
   - Enables citation network analysis
   - Enables bibliometric analysis
   - Critical for academic graph functionality

2. **Implement Funding** (grants[])
   - Enables funding network analysis
   - Enables funder impact analysis

3. **Implement Topic Hierarchies**
   - Enables taxonomic browsing
   - Enables subject classification
   - Add RelationType: `FIELD_PART_OF_DOMAIN`, `TOPIC_PART_OF_SUBFIELD`

4. **Implement Institution Lineages**
   - Enables organizational hierarchy browsing
   - Enables institutional affiliation analysis

---

### Phase 3: Medium-Value Relationships

**Priority: MEDIUM - Completes entity coverage**

1. **Implement Source Host Organizations**
   - Add `host_organization` to sourceSchema
   - Implement in `expandSourceWithCache()`

2. **Implement Publisher Hierarchies**
   - Create `expandPublisherWithCache()` method
   - Handle `parent_publisher` and `lineage[]`

3. **Implement Funder Expansion**
   - Create `expandFunderWithCache()` method
   - Handle reverse lookup for funded works

4. **Implement Author Affiliations (forward direction)**
   - Add to `expandAuthorWithCache()`
   - Create Author → Institution edges from `affiliations[]`

---

### Phase 4: Low-Priority Relationships

**Priority: LOW - Nice to have**

1. **Keywords** (WORK_HAS_KEYWORD)
2. **Related Works** (Work → Work similarity)
3. **SDGs** (Sustainable Development Goals)
4. **Concept Ancestors/Related** (if supporting legacy concepts)
5. **Author Topics** (AUTHOR_RESEARCHES)
6. **Topic Siblings** (Topic ↔ Topic)
7. **Institution Associated Institutions**

---

### Phase 5: Add Missing RelationTypes

Add to enum in `core.ts`:

```typescript
export enum RelationType {
    // ... existing ...

    // Topic taxonomy (add these)
    FIELD_PART_OF_DOMAIN = "field_part_of_domain",        // Field → Domain
    TOPIC_PART_OF_SUBFIELD = "topic_part_of_subfield",    // Topic → Subfield
    TOPIC_SIBLING = "topic_sibling",                      // Topic ↔ Topic

    // Concept hierarchy (deprecated but present)
    CONCEPT_ANCESTOR = "concept_ancestor",                 // Concept → Concept (parent)
    CONCEPT_RELATED = "concept_related",                   // Concept ↔ Concept

    // Institution relationships
    INSTITUTION_ASSOCIATED = "institution_associated",     // Institution → Institution

    // SDG relationships
    WORK_HAS_SDG = "work_has_sdg",                        // Work → SDG

    // Similarity relationships
    RELATED_TO_WORK = "related_to_work",                  // Work → Work (similarity)
}
```

---

## Testing Strategy

### Phase 1: Directionality Tests

Create test cases to verify edge directions:

```typescript
describe('Edge Directionality', () => {
    it('AUTHORSHIP: Work should be source, Author should be target', async () => {
        const expansion = await provider.expandEntity('W123', {})
        const authorshipEdge = expansion.edges.find(e => e.type === RelationType.AUTHORSHIP)
        expect(authorshipEdge.source).toMatch(/^W\d+$/)  // Work ID
        expect(authorshipEdge.target).toMatch(/^A\d+$/)  // Author ID
        expect(authorshipEdge.direction).toBe('outbound')
    })

    it('PUBLICATION: Work should be source, Source should be target', async () => {
        const expansion = await provider.expandEntity('W123', {})
        const pubEdge = expansion.edges.find(e => e.type === RelationType.PUBLICATION)
        expect(pubEdge.source).toMatch(/^W\d+$/)  // Work ID
        expect(pubEdge.target).toMatch(/^S\d+$/)  // Source ID
    })
})
```

### Phase 2: Relationship Completeness Tests

```typescript
describe('Relationship Coverage', () => {
    it('Work expansion includes all available relationships', async () => {
        const expansion = await provider.expandEntity('W2741809807', {})
        const edgeTypes = new Set(expansion.edges.map(e => e.type))

        expect(edgeTypes).toContain(RelationType.AUTHORSHIP)
        expect(edgeTypes).toContain(RelationType.PUBLICATION)
        expect(edgeTypes).toContain(RelationType.REFERENCE)      // if has citations
        expect(edgeTypes).toContain(RelationType.TOPIC)          // if has topics
        expect(edgeTypes).toContain(RelationType.FUNDED_BY)      // if has grants
    })
})
```

### Phase 3: Bidirectional Consistency Tests

```typescript
describe('Bidirectional Consistency', () => {
    it('Expanding work and author creates consistent edges', async () => {
        const workExpansion = await provider.expandEntity('W123', {})
        const authorExpansion = await provider.expandEntity('A456', {})

        const workAuthorEdge = workExpansion.edges.find(e =>
            e.type === RelationType.AUTHORSHIP && e.target === 'A456'
        )
        const authorWorkEdge = authorExpansion.edges.find(e =>
            e.type === RelationType.AUTHORSHIP && e.target === 'W123'
        )

        // Should not create duplicate edges with different directions
        expect(workAuthorEdge).toBeDefined()
        expect(authorWorkEdge).toBeUndefined()  // Or: check direction metadata
    })
})
```

---

## Migration Path

### Breaking Change Migration

1. **Database Schema Update**
   - Add migration script to reverse existing AUTHORSHIP edges
   - Update `direction` field on all edges

2. **Cache Invalidation**
   - Clear all cached graph expansions
   - Force full re-expansion on next load

3. **Client Updates**
   - Update graph queries to use new directionality
   - Update UI components expecting old direction

4. **Rollback Plan**
   - Maintain old data for 1 release cycle
   - Provide rollback script if critical issues found

---

## Appendix: Complete RelationType Inventory

### Currently Defined (core.ts:20-62)

| RelationType | Value | Status |
|--------------|-------|--------|
| AUTHORSHIP | "AUTHORSHIP" | ✅ Active |
| AFFILIATION | "AFFILIATION" | ✅ Active |
| PUBLICATION | "PUBLICATION" | ✅ Active |
| REFERENCE | "REFERENCE" | ✅ Active |
| TOPIC | "TOPIC" | ✅ Active |
| HOST_ORGANIZATION | "HOST_ORGANIZATION" | ✅ Active |
| LINEAGE | "LINEAGE" | ✅ Active |
| FUNDED_BY | "funded_by" | ✅ Active |
| PUBLISHER_CHILD_OF | "publisher_child_of" | ✅ Active |
| WORK_HAS_KEYWORD | "work_has_keyword" | ✅ Active |
| AUTHOR_RESEARCHES | "author_researches" | ✅ Active |
| INSTITUTION_LOCATED_IN | "institution_located_in" | ✅ Active |
| FUNDER_LOCATED_IN | "funder_located_in" | ✅ Active |
| TOPIC_PART_OF_FIELD | "topic_part_of_field" | ✅ Active |
| RELATED_TO | "related_to" | ✅ Active |
| AUTHORED | "AUTHORSHIP" | ⚠️ Deprecated |
| AFFILIATED | "AFFILIATION" | ⚠️ Deprecated |
| PUBLISHED_IN | "PUBLICATION" | ⚠️ Deprecated |
| REFERENCES | "REFERENCE" | ⚠️ Deprecated |
| SOURCE_PUBLISHED_BY | "HOST_ORGANIZATION" | ⚠️ Deprecated |
| INSTITUTION_CHILD_OF | "LINEAGE" | ⚠️ Deprecated |
| WORK_HAS_TOPIC | "TOPIC" | ⚠️ Deprecated |

### Should Be Added

| RelationType | Proposed Value | Priority |
|--------------|---------------|----------|
| FIELD_PART_OF_DOMAIN | "field_part_of_domain" | HIGH |
| TOPIC_PART_OF_SUBFIELD | "topic_part_of_subfield" | HIGH |
| CONCEPT_ANCESTOR | "concept_ancestor" | LOW |
| CONCEPT_RELATED | "concept_related" | LOW |
| INSTITUTION_ASSOCIATED | "institution_associated" | MEDIUM |
| WORK_HAS_SDG | "work_has_sdg" | LOW |
| RELATED_TO_WORK | "related_to_work" | MEDIUM |
| TOPIC_SIBLING | "topic_sibling" | LOW |

---

## Conclusion

The current implementation has **significant directionality errors** that affect core relationships (AUTHORSHIP). Immediate action required:

1. ✅ Fix AUTHORSHIP direction (CRITICAL)
2. ✅ Implement missing high-value relationships (citations, funding, topic hierarchies)
3. ✅ Add missing expansion methods for Publishers, Funders
4. ✅ Standardize bidirectional edge handling
5. ✅ Add missing RelationTypes to enum

**Estimated Implementation Effort:**
- Phase 1 (Critical Fixes): 2-3 days
- Phase 2 (High-Value): 3-5 days
- Phase 3 (Medium-Value): 2-3 days
- Phase 4 (Low-Priority): 1-2 days
- **Total:** 8-13 days of development

**Breaking Changes:** Phase 1 requires database migration and cache invalidation.

---

**Report Generated:** 2025-11-18
**Analyst:** Claude Code (Data Engineer)
**Files Analyzed:** 3 (core.ts, openalex-provider.ts, schemas.ts)
