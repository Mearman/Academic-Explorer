# Quickstart: Edge Direction Correction Implementation

**Feature**: 014-edge-direction-correction
**Branch**: `014-edge-direction-correction`
**Estimated Time**: 8-12 hours (P1 MVP: 4-6 hours, P2: 2-3 hours, P3: 2-3 hours)

## Prerequisites

- [x] Spec validated and clarified (spec.md complete)
- [x] Planning complete (plan.md, research.md, data-model.md)
- [x] Contracts defined (relationship-detection-service.contract.ts, edge-filters.contract.ts)
- [ ] Development environment setup (pnpm install, pnpm dev working)

## Phase 1: Core Edge Direction Fix (P1 - MVP)

**Goal**: Reverse edge directions to match OpenAlex data ownership model

**Estimated Time**: 4-6 hours

### Step 1: Update RelationType Enum (30 min)

**File**: `packages/graph/src/relation-type.ts`

1. **Write failing test** (`packages/graph/src/relation-type.unit.test.ts`):
   ```typescript
   describe('RelationType enum', () => {
     it('should use noun form matching OpenAlex fields', () => {
       expect(RelationType.AUTHORSHIP).toBe('AUTHORSHIP');
       expect(RelationType.REFERENCE).toBe('REFERENCE');
       expect(RelationType.PUBLICATION).toBe('PUBLICATION');
       // ... all 7 types
     });
   });
   ```

2. **Update enum** (verify tests fail first):
   ```typescript
   export enum RelationType {
     AUTHORSHIP = 'AUTHORSHIP',        // was: AUTHORED
     REFERENCE = 'REFERENCE',          // was: REFERENCES
     PUBLICATION = 'PUBLICATION',      // was: PUBLISHED_IN
     TOPIC = 'TOPIC',                  // was: HAS_TOPIC
     AFFILIATION = 'AFFILIATION',      // was: AFFILIATED
     HOST_ORGANIZATION = 'HOST_ORGANIZATION', // was: SOURCE_PUBLISHED_BY
     LINEAGE = 'LINEAGE',              // was: INSTITUTION_CHILD_OF
   }
   ```

3. **Verify tests pass**: `pnpm nx test graph`

4. **Commit atomically**:
   ```bash
   git add packages/graph/src/relation-type.ts packages/graph/src/relation-type.unit.test.ts
   git commit -m "refactor(graph): update RelationType enum to noun form matching OpenAlex fields"
   ```

### Step 2: Add Direction Field to GraphEdge (45 min)

**File**: `packages/graph/src/edge-model.ts`

1. **Write failing test** (`packages/graph/src/edge-model.unit.test.ts`):
   ```typescript
   describe('GraphEdge interface', () => {
     it('should require direction field', () => {
       const edge: GraphEdge = {
         id: 'W1-A1-AUTHORSHIP',
         source: 'W1',
         target: 'A1',
         type: RelationType.AUTHORSHIP,
         direction: 'outbound',
         label: 'authorship',
       };
       expect(edge.direction).toBe('outbound');
     });
   });
   ```

2. **Update interface** (copy types from data-model.md):
   ```typescript
   export type EdgeDirection = 'outbound' | 'inbound';

   export interface GraphEdge {
     id: string;
     source: string;
     target: string;
     type: RelationType;
     direction: EdgeDirection;  // NEW FIELD
     label: string;
     metadata?: Record<string, unknown>; // NEW FIELD
   }
   ```

3. **Verify tests pass**: `pnpm nx test graph`

4. **Commit**:
   ```bash
   git add packages/graph/src/edge-model.ts packages/graph/src/edge-model.unit.test.ts
   git commit -m "feat(graph): add direction and metadata fields to GraphEdge interface"
   ```

### Step 3: Update Relationship Detection Service (2-3 hours)

**File**: `apps/web/src/services/relationship-detection-service.ts`

⚠️ **CRITICAL**: This is where edge directions are currently backwards!

1. **Write failing E2E test** (`apps/web/src/test/e2e/edge-direction.e2e.test.ts`):
   ```typescript
   test('Work → Author authorship edges point in correct direction', async ({ page }) => {
     await page.goto('/works/W2741809807');
     // Verify edge points from work to author, not author to work
     const edges = await page.evaluate(() => {
       const graph = window.__GRAPH_DATA__;
       return graph.edges.filter(e => e.type === 'AUTHORSHIP');
     });
     for (const edge of edges) {
       expect(edge.source).toBe('W2741809807'); // Work is source
       expect(edge.target).toMatch(/^A\d+$/);   // Author is target
       expect(edge.direction).toBe('outbound'); // Stored on work
     }
   });
   ```

2. **Verify test fails** (run test, should fail with current backward edges): `pnpm nx e2e web`

3. **Fix detectAuthorships()** (reverse source/target):
   ```typescript
   // BEFORE (WRONG):
   relationships.push({
     sourceNodeId: authorship.author.id,  // ❌ Author as source
     targetNodeId: workData.id,           // ❌ Work as target
     relationType: RelationType.AUTHORED, // ❌ Old enum value
     label: "authored",
   });

   // AFTER (CORRECT):
   relationships.push({
     sourceNodeId: workData.id,           // ✅ Work as source (owns data)
     targetNodeId: authorship.author.id,  // ✅ Author as target
     relationType: RelationType.AUTHORSHIP, // ✅ Noun form
     direction: 'outbound',               // ✅ Stored on work
     label: 'authorship',
     metadata: {
       author_position: authorship.author_position,
       is_corresponding: authorship.is_corresponding,
       raw_author_name: authorship.raw_author_name,
       raw_affiliation_strings: authorship.raw_affiliation_strings,
       institutions: authorship.institutions,
     },
   });
   ```

4. **Repeat for all relationship types** (see contract for examples):
   - `detectReferences()`: Work → Work (citing → referenced)
   - `detectPublication()`: Work → Source
   - `detectTopics()`: Work → Topic
   - `detectAffiliations()`: Author → Institution
   - `detectHostOrganization()`: Source → Publisher
   - `detectLineage()`: Institution → Institution (child → parent)

5. **Verify E2E test passes**: `pnpm nx e2e web`

6. **Commit**:
   ```bash
   git add apps/web/src/services/relationship-detection-service.ts apps/web/src/test/e2e/edge-direction.e2e.test.ts
   git commit -m "fix(web): reverse edge directions to match OpenAlex data ownership model"
   ```

### Step 4: Update EdgeFiltersSection Labels (30 min)

**File**: `apps/web/src/components/sections/EdgeFiltersSection.tsx`

1. **Update RELATION_TYPE_CONFIG** labels to match new enum:
   ```typescript
   const RELATION_TYPE_CONFIG: Record<RelationType, { label: string; color: string }> = {
     [RelationType.AUTHORSHIP]: { label: 'Authorship', color: '#4A90E2' },
     [RelationType.REFERENCE]: { label: 'Reference', color: '#7B68EE' },
     [RelationType.PUBLICATION]: { label: 'Publication', color: '#50C878' },
     [RelationType.TOPIC]: { label: 'Topic', color: '#FF6B6B' },
     [RelationType.AFFILIATION]: { label: 'Affiliation', color: '#FFA500' },
     [RelationType.HOST_ORGANIZATION]: { label: 'Host Organization', color: '#9370DB' },
     [RelationType.LINEAGE]: { label: 'Lineage', color: '#20B2AA' },
   };
   ```

2. **Write component test** to verify labels render:
   ```typescript
   test('displays relationship type labels', () => {
     render(<EdgeFiltersSection {...defaultProps} />);
     expect(screen.getByText('Authorship')).toBeInTheDocument();
     expect(screen.getByText('Reference')).toBeInTheDocument();
   });
   ```

3. **Commit**:
   ```bash
   git add apps/web/src/components/sections/EdgeFiltersSection.tsx apps/web/src/components/sections/EdgeFiltersSection.component.test.tsx
   git commit -m "fix(web): update edge filter labels to match new RelationType enum"
   ```

### Step 5: Integration Testing (1 hour)

1. **Run full test suite**: `pnpm test`
2. **Run E2E tests**: `pnpm nx e2e web`
3. **Manual testing**: Open app, load a work, verify edges point correctly
4. **Check builds**: `pnpm build`

### P1 Complete! 🎉

At this point, all edges point in the correct direction matching OpenAlex data ownership.

---

## Phase 2: Edge Direction Classification (P2)

**Goal**: Add visual distinction and classification for outbound vs inbound edges

**Estimated Time**: 2-3 hours

### Step 6: Implement Edge Styling (1.5 hours)

**File**: `apps/web/src/components/graph/edge-styles.ts` (NEW)

1. **Create styling service** (follow contract in `contracts/edge-filters.contract.ts`):
   ```typescript
   export function getEdgeStyle(edge: GraphEdge): EdgeVisualStyle {
     const baseStyle = edge.direction === 'outbound'
       ? { lineStyle: 'solid', markerEnd: 'arrow-solid' }
       : { lineStyle: 'dashed', markerEnd: 'arrow-dashed' };

     return {
       ...baseStyle,
       color: TYPE_COLORS[edge.type],
       strokeWidth: 2,
       opacity: 0.8,
     };
   }
   ```

2. **Write tests** for styling combinations (outbound/inbound × 7 types = 14 test cases)

3. **Integrate with graph renderer** (update XYFlow/D3 edge rendering to use styles)

4. **Accessibility test** with `@axe-core/playwright`:
   ```typescript
   test('edge styles meet WCAG 2.1 Level AA', async ({ page }) => {
     await page.goto('/works/W123');
     const results = await new AxeBuilder({ page }).analyze();
     expect(results.violations).toEqual([]);
   });
   ```

5. **Commit**:
   ```bash
   git add apps/web/src/components/graph/edge-styles.ts apps/web/src/components/graph/edge-styles.unit.test.ts
   git commit -m "feat(web): add multi-modal visual distinction for outbound vs inbound edges"
   ```

### Step 7: Graph Re-detection on Load (1 hour)

**File**: `apps/web/src/stores/graph-store.tsx`

1. **Add re-detection logic** to graph load:
   ```typescript
   async function loadGraph(graphId: string): Promise<Graph> {
     const storedGraph = await storage.getGraph(graphId);

     // Re-detect edges from entity data (corrects old edge directions)
     const correctedEdges = redetectEdges(storedGraph.entities);

     return {
       ...storedGraph,
       edges: correctedEdges,
     };
   }
   ```

2. **Write integration test** to verify re-detection works:
   ```typescript
   test('re-detects edges on load to correct directions', async () => {
     // Create graph with old (wrong) edges
     const oldGraph = { entities: [...], edges: [...wrongEdges] };
     await storage.save(oldGraph);

     // Load graph (should re-detect)
     const loaded = await loadGraph(oldGraph.id);

     // Verify edges now correct
     expect(loaded.edges[0].source).toBe('W123'); // Work as source
     expect(loaded.edges[0].target).toBe('A456'); // Author as target
   });
   ```

3. **Commit**:
   ```bash
   git add apps/web/src/stores/graph-store.tsx apps/web/src/stores/graph-store.integration.test.ts
   git commit -m "feat(web): re-detect relationships from entity data on graph load"
   ```

---

## Phase 3: Directional Filtering UI (P3)

**Goal**: Add user-facing direction filters to EdgeFiltersSection

**Estimated Time**: 2-3 hours

### Step 8: Add Direction Toggle Component (1.5 hours)

**File**: `apps/web/src/components/sections/EdgeFiltersSection.tsx`

1. **Add direction filter state**:
   ```typescript
   const [directionFilter, setDirectionFilter] = useState<EdgeDirectionFilter>('both');
   ```

2. **Add toggle UI** (replace placeholder):
   ```tsx
   <CollapsibleSection title="Direction & Weight">
     <SegmentedControl
       value={directionFilter}
       onChange={setDirectionFilter}
       data={[
         { label: `Outbound (${outboundCount})`, value: 'outbound' },
         { label: `Inbound (${inboundCount})`, value: 'inbound' },
         { label: 'Both', value: 'both' },
       ]}
     />
   </CollapsibleSection>
   ```

3. **Implement filtering logic**:
   ```typescript
   const filteredEdges = useMemo(() => {
     let result = edges;
     if (directionFilter !== 'both') {
       result = result.filter(e => e.direction === directionFilter);
     }
     return result;
   }, [edges, directionFilter]);
   ```

4. **Write component tests**:
   ```typescript
   test('filters edges by direction', () => {
     render(<EdgeFiltersSection edges={mockEdges} />);
     fireEvent.click(screen.getByText('Outbound'));
     expect(onFilterChange).toHaveBeenCalledWith(
       mockEdges.filter(e => e.direction === 'outbound')
     );
   });
   ```

5. **Commit**:
   ```bash
   git add apps/web/src/components/sections/EdgeFiltersSection.tsx apps/web/src/components/sections/EdgeFiltersSection.component.test.tsx
   git commit -m "feat(web): add direction filter toggle (outbound/inbound/both) to EdgeFiltersSection"
   ```

### Step 9: Performance Validation (30 min)

1. **Create performance test** with 500 nodes:
   ```typescript
   test('direction filtering completes in <1s for 500 nodes', async () => {
     const largeGraph = generateGraph(500, 3); // 500 nodes, 3 edges each
     const startTime = performance.now();
     const filtered = filterByDirection(largeGraph.edges, 'outbound');
     const endTime = performance.now();
     expect(endTime - startTime).toBeLessThan(1000); // <1 second
   });
   ```

2. **Run performance test**: `pnpm nx test web --testPathPattern=performance`

3. **Commit**:
   ```bash
   git add apps/web/src/test/performance/edge-filtering.performance.test.ts
   git commit -m "test(web): add performance validation for directional edge filtering"
   ```

### Step 10: E2E Testing (1 hour)

1. **Write E2E tests** for full user flow:
   ```typescript
   test('user can filter citation network by direction', async ({ page }) => {
     await page.goto('/works/W2741809807');

     // Open edge filters
     await page.click('text=Edge Filters');

     // Select "Outbound Only"
     await page.click('text=Outbound');

     // Verify only outbound edges visible
     const visibleEdges = await page.evaluate(() => {
       return window.__GRAPH_DATA__.edges.filter(e => e.visible);
     });
     expect(visibleEdges.every(e => e.direction === 'outbound')).toBe(true);
   });
   ```

2. **Run E2E suite**: `pnpm nx e2e web`

3. **Commit**:
   ```bash
   git add apps/web/src/test/e2e/edge-filtering.e2e.test.ts
   git commit -m "test(web): add E2E tests for directional edge filtering"
   ```

---

## Final Quality Gates

### Pre-Merge Checklist

- [ ] All tests passing: `pnpm test`
- [ ] E2E tests passing: `pnpm nx e2e web`
- [ ] TypeScript validation: `pnpm typecheck`
- [ ] Build succeeds: `pnpm build`
- [ ] Lint passes: `pnpm lint`
- [ ] No `any` types introduced (verify with grep)
- [ ] All commits follow Conventional Commits format
- [ ] Constitution alignment verified (all 7 principles)

### Performance Validation

- [ ] Directional filtering <1s for 500 nodes (Success Criterion SC-003)
- [ ] Graph re-detection <2s for typical graphs (<100 entities)
- [ ] No regression in existing graph operations

### Accessibility Validation

- [ ] Edge visual distinction uses line style + color + arrow style (SC-004)
- [ ] WCAG 2.1 Level AA compliance verified with axe-core
- [ ] Pattern differentiation perceivable without color

### Documentation

- [ ] Update CLAUDE.md with RelationType changes
- [ ] Add edge direction examples to README
- [ ] Document migration approach (re-detection) in CHANGELOG

---

## Troubleshooting

### Tests Failing After Enum Changes

**Problem**: Old tests reference `RelationType.AUTHORED` but enum now uses `RelationType.AUTHORSHIP`

**Solution**: Update test fixtures and mocks to use new enum values

### Graph Not Re-detecting on Load

**Problem**: Edges still showing old directions after loading graph

**Solution**: Verify `redetectEdges()` is called in graph load path. Check console for errors.

### Performance Test Failing

**Problem**: Direction filtering takes >1s for 500 nodes

**Solution**: Use memoization and index-based lookups instead of array filters. Consider Web Worker for large graphs.

### Accessibility Test Failing

**Problem**: axe-core reporting contrast issues

**Solution**: Verify TYPE_COLORS meet 3:1 contrast ratio. Use color contrast checker tool.

---

## Next Steps After Completion

1. **Create PR** with all commits
2. **Request code review** focusing on edge direction logic
3. **Run CI/CD pipeline** to validate on fresh environment
4. **Monitor performance** metrics post-merge
5. **Update documentation** with examples
6. **Close spec 014** and move to "Completed" status

---

## Quick Reference

**Key Files**:
- `packages/graph/src/relation-type.ts` - Enum definitions
- `packages/graph/src/edge-model.ts` - Edge interface
- `apps/web/src/services/relationship-detection-service.ts` - Edge creation (main fix here!)
- `apps/web/src/components/sections/EdgeFiltersSection.tsx` - UI filters
- `apps/web/src/stores/graph-store.tsx` - Graph re-detection

**Key Concepts**:
- Outbound = stored on source entity (complete data)
- Inbound = discovered via reverse lookup (potentially incomplete)
- Edge direction = source → target (source owns data)
- Noun form = RelationType matches OpenAlex field names

**Test Commands**:
```bash
pnpm test                      # All tests
pnpm nx test graph             # Graph package only
pnpm nx test web               # Web app only
pnpm nx e2e web                # E2E tests
pnpm typecheck                 # TypeScript validation
pnpm build                     # Production build
pnpm validate                  # Full pipeline
```
