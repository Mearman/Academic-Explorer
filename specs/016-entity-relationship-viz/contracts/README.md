# API Contracts: Entity Relationship Visualization

**Feature**: Entity Relationship Visualization
**Branch**: `016-entity-relationship-viz`
**Date**: 2025-11-18
**Phase**: Phase 1 - Contracts

---

## No New API Endpoints Required

This feature does NOT require any new API endpoints or contracts.

### Rationale

All relationship data is already available through existing graph data:

1. **Graph Edges**: Relationship data comes from `GraphEdge[]` already loaded via `use-graph-data.ts` hook
2. **OpenAlex API**: No additional OpenAlex API calls needed beyond existing entity fetching
3. **Storage**: No new storage operations; reads from existing graph store via storage provider interface

### Data Sources

**Existing Data Providers**:
- `apps/web/src/hooks/use-graph-data.ts` - Provides `GraphEdge[]` with relationship metadata
- `packages/graph/src/types/core.ts` - Defines `GraphEdge` type with `direction` field
- Storage provider interface - Abstracts IndexedDB access (no new operations needed)

**Existing API Integration**:
- `packages/client` - OpenAlex API client (already fetches relationship data with entities)
- No additional endpoints required

### Client-Side Processing

All relationship processing happens client-side:

```typescript
// Example data flow (no API calls)
const edges = useGraphData(); // Already loaded
const entityRelationships = edges.filter(edge =>
  edge.source === entityId || edge.target === entityId
);
const incoming = entityRelationships.filter(edge => edge.target === entityId);
const outgoing = entityRelationships.filter(edge => edge.source === entityId);
```

### Future Considerations

If performance becomes an issue with large graphs, we may consider:

1. **Server-side filtering**: Add OpenAlex API endpoint to fetch relationships for specific entity
2. **Relationship caching**: Cache computed relationships in IndexedDB
3. **Lazy loading**: Load relationships on-demand when user expands section

However, based on current requirements (SC-006: handle 1000 relationships without degradation), client-side processing is sufficient.

---

**Contracts Status**: N/A - No new contracts required
**Last Updated**: 2025-11-18
