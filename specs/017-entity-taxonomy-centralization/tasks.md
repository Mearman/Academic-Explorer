# Tasks: Entity Taxonomy Centralization

## Phase 1: Create Centralized Structure ✅

- [x] 1.1. Search and catalog all entity type definitions
- [x] 1.2. Identify duplication patterns and inconsistencies
- [x] 1.3. Design EntityMetadataEntry interface
- [x] 1.4. Create ENTITY_METADATA constant in types package
- [x] 1.5. Implement helper functions
- [x] 1.6. Export from types package index

## Phase 2: Update Package Layer (In Progress)

- [x] 2.1. Update graph/taxonomy/entity-taxa.ts to use types (no re-exports)
- [x] 2.2. Remove type coercion from ENTITY_TAXONOMY
- [x] 2.3. Remove type coercion from ENTITY_ICON_MAP
- [x] 2.4. Remove duplicate helper functions from graph package
- [x] 2.5. Update test-fixtures.ts to import from types
- [ ] 2.6. Rebuild types package to generate dist files
- [ ] 2.7. Fix module resolution errors
- [ ] 2.8. Update all other package imports to use types

## Phase 3: Update Web App Layer

- [x] 3.1. Update apps/web/src/constants/catalogue.ts
  - [x] Import from types package
  - [x] Remove type coercion
- [x] 3.2. Update apps/web/src/routes/search.lazy.tsx
  - [x] Import from types package
- [ ] 3.3. Find and update all other web app imports
- [ ] 3.4. Search for any remaining graph/taxonomy imports

## Phase 4: Remove Duplicate Definitions

- [ ] 4.1. Review apps/web/src/types/catalogue.ts EntityType
- [ ] 4.2. Review apps/web/src/components/entity-detail/EntityTypeConfig.tsx
- [ ] 4.3. Review packages/utils/src/storage/catalogue-db.ts EntityType
- [ ] 4.4. Review packages/graph/src/types/core.ts EntityType
- [ ] 4.5. Decide on removal vs reference strategy

## Phase 5: Verification and Testing

- [ ] 5.1. Clear build caches
- [ ] 5.2. Rebuild packages in dependency order
- [ ] 5.3. Run pnpm typecheck
- [ ] 5.4. Run pnpm test
- [ ] 5.5. Run pnpm build
- [ ] 5.6. Manual verification of UI components

## Phase 6: Create Atomic Commits

- [ ] 6.1. Commit: "feat(types): create centralized entity metadata structure"
- [ ] 6.2. Commit: "refactor(graph): use centralized entity metadata from types"
- [ ] 6.3. Commit: "refactor(web): update imports to use centralized entity metadata"
- [ ] 6.4. Commit: "refactor: remove duplicate entity type definitions"
- [ ] 6.5. Update CLAUDE.md with centralization details

## Current Status

**Active Task**: 2.6 - Rebuild types package to generate dist files

**Blocker**: Module resolution errors because dist/ files not generated yet

**Next Steps**:
1. Build types package: `pnpm nx run types:build --skip-nx-cache`
2. Verify module resolution
3. Continue with remaining import updates
