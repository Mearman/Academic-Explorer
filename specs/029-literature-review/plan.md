# Implementation Plan: Advanced Literature Review Workflows

**Branch**: `029-literature-review` | **Date**: 2025-11-30 | **Spec**: [link](spec.md)
**Input**: Feature specification from `/specs/029-literature-review/spec.md`

## Summary

Enhance BibGraph catalogue feature to support advanced literature review workflows including PRISMA systematic reviews, semantic analysis, citation export formats (BibTeX/RIS), custom entity support for non-OpenAlex works, and live file system synchronization using browser File System Access API. Implementation leverages existing BibGraph architecture while adding sophisticated academic research capabilities.

**Key Architectural Changes:**
- Catalogues promoted to first-class entities with pako-encoded URL-shareable IDs
- Three reconciliation approaches for collaborative list editing (all implemented for UX experimentation):
  1. **Same-UUID Detection + Diff UI** - Manual merge with side-by-side comparison
  2. **Base Reference Chain (3-Way Merge)** - Git-style merge using common ancestor
  3. **CRDT Operations (OR-Set)** - Automatic conflict-free merge with Lamport timestamps

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: @citation-js/core, transformers.js, File System Access API, ONNX Runtime Web
**Storage**: IndexedDB (via existing storage provider) + File System Access API
**Testing**: Vitest (unit), Playwright (e2e), fake-indexeddb (storage testing)
**Target Platform**: Web application with WASM support
**Project Type**: Web application (React + TanStack Router + Mantine UI)
**Performance Goals**: 1000+ citations export in <5s, PRISMA operations <1s, topic modeling 1000 abstracts in <30s, file sync 1000+ files
**Constraints**: <100MB memory for models, <1MB bundle size, offline capability, WCAG 2.1 AA compliance
**Scale/Scope**: 5000+ entities per literature review, unlimited custom entities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **All Constitution Principles Compliant**

1. **Type Safety**: TypeScript strict mode planned; use `unknown` with type guards
2. **Test-First Development**: Tests written and failing before implementation begins
3. **Monorepo Architecture**: Extends existing apps/web/ and packages/ structure; no package re-exports from other internal packages
4. **Storage Abstraction**: Extends existing storage provider interface; no direct Dexie/IndexedDB coupling
5. **Performance & Memory**: Web Workers for heavy computation; memory constraints considered; tests run serially
6. **Atomic Conventional Commits**: Incremental atomic commits after each task completion; spec changes committed after each phase
7. **Development-Stage Pragmatism**: Breaking changes acceptable; no backwards compatibility required during development
8. **Test-First Bug Fixes**: Bug tests written to reproduce and fail before fixes implemented
9. **Repository Integrity**: All issues (tests, lint, build, audit) must be resolved—"pre-existing" is not an excuse
10. **Continuous Execution**: Work continues without pausing between phases; spec commits after each phase completion; if no outstanding questions after /speckit.plan, automatically invoke /speckit.tasks then /speckit.implement
11. **Complete Implementation**: Full feature implementation; no simplified fallbacks without user approval
12. **Spec Index Maintenance**: specs/README.md will be updated when status changes; committed alongside spec changes
13. **Build Output Isolation**: TypeScript builds to dist/, never alongside source files
14. **Working Files Hygiene**: Debug files and temporary artifacts cleaned up before commit
15. **DRY Code & Configuration**: Shared utilities extracted; configuration extends shared base; proactive cruft cleanup
16. **Presentation/Functionality Decoupling**: Components separate presentation from business logic; hooks/services for logic; testable layers

## Project Structure

### Documentation (this feature)

```text
specs/029-literature-review/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── literature-review-types.ts
│   ├── citation-export-types.ts
│   └── file-sync-types.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/src/
├── components/catalogue/
│   ├── CitationExportModal.tsx          # NEW: BibTeX/RIS/CSV export interface
│   ├── LiteratureReviewTools.tsx        # NEW: PRISMA workflow management
│   ├── PrismaFlowDiagram.tsx           # NEW: PRISMA visualization
│   ├── SemanticPrismaIntegration.tsx   # NEW: PRISMA-semantic analysis
│   ├── CustomEntityManager.tsx          # NEW: Custom entity creation
│   └── FileSystemSync.tsx               # NEW: File system sync interface
├── services/
│   ├── citation-export.service.ts       # NEW: Citation export logic
│   ├── file-system-sync.service.ts      # NEW: File system sync logic
│   ├── pdf-metadata-extractor.ts       # NEW: PDF metadata extraction
│   └── topic-modeling.service.ts         # NEW: Topic modeling logic
├── hooks/
│   ├── use-literature-review.ts          # NEW: Literature review state management
│   ├── use-file-system-sync.ts           # NEW: File sync state management
│   ├── use-topic-modeling.ts             # NEW: Topic modeling state
│   └── use-list-reconciliation.ts        # NEW: List reconciliation state
├── components/lists/
│   ├── ListDiffViewer.tsx                # NEW: Side-by-side diff UI (Approach 1)
│   ├── ManualMergeDialog.tsx             # NEW: Manual merge selection UI
│   ├── ThreeWayMergeDialog.tsx           # NEW: 3-way merge conflict resolution (Approach 2)
│   ├── ReconciliationStrategySelector.tsx # NEW: Strategy picker in settings
│   └── MergePreview.tsx                  # NEW: Preview merged result
└── workers/
    ├── file-processor.worker.ts        # NEW: File processing worker
    ├── topic-modeling.worker.ts        # NEW: Topic modeling worker
    └── nlp-worker.ts                    # NEW: NLP processing worker

packages/utils/src/
├── storage/
│   ├── file-system-sync.provider.ts     # NEW: File system sync provider
│   └── custom-entity.manager.ts        # NEW: Custom entity management
├── citation/
│   ├── bibtex-generator.ts              # NEW: BibTeX generation
│   ├── ris-generator.ts                 # NEW: RIS generation
│   └── citation-key-generator.ts      # NEW: Citation key algorithms
├── topic-modeling/
│   ├── topic-extractor.ts              # NEW: Topic extraction logic
│   └── theme-manager.ts                # NEW: Theme management
├── list-encoding/
│   ├── pako-encoder.ts                 # NEW: Pako compression for list IDs
│   ├── payload-codec.ts                # NEW: EncodedListPayload encode/decode
│   └── url-safe-base64.ts              # NEW: URL-safe base64 utilities
└── list-reconciliation/
    ├── uuid-diff.ts                    # NEW: Same-UUID detection (Approach 1)
    ├── diff-algorithm.ts               # NEW: Entity diff computation
    ├── base-chain-resolver.ts          # NEW: Base reference chain (Approach 2)
    ├── three-way-merge.ts              # NEW: 3-way merge algorithm
    ├── crdt-operations.ts              # NEW: OR-Set CRDT (Approach 3)
    ├── lamport-clock.ts                # NEW: Lamport timestamp generation
    ├── operation-compaction.ts         # NEW: CRDT operation log compaction
    └── reconciliation-service.ts       # NEW: Unified reconciliation orchestrator

packages/types/src/
├── literature-review.ts                 # NEW: Literature review types
├── citation-export.ts                  # NEW: Citation export types
├── file-system-sync.ts                 # NEW: File sync types
├── list-encoding.ts                    # NEW: EncodedListPayload, ListOperation types
└── list-reconciliation.ts              # NEW: Reconciliation strategy types

packages/algorithms/src/
├── semantic-prisma/                     # NEW: PRISMA-semantic analysis algorithms
└── topic-modeling/                      # EXTEND: Enhanced topic modeling
```

**Structure Decision**: Extend existing monorepo structure with new components in apps/web/, services in apps/web/services/, hooks in apps/web/hooks/, and shared utilities in packages/. New packages/ directories for shared algorithms and types.

## Complexity Tracking

No constitutional violations requiring justification. Implementation extends existing architecture without adding structural complexity beyond standard feature development.

## Implementation Strategy

### Phase 1: Foundation
- Setup project structure and dependencies
- Create type definitions and interfaces
- Extend storage provider for new entities
- Implement basic citation export functionality

### Phase 2: List Encoding & Sharing
- Implement pako compression for list IDs
- Create EncodedListPayload encode/decode utilities
- Build URL-safe base64 conversion
- Implement list routes with encoded IDs

### Phase 3: List Reconciliation (UX Experimentation)
Three approaches implemented side-by-side for user testing:
- **Approach 1**: Same-UUID detection + diff UI (manual merge)
- **Approach 2**: Base reference chain + 3-way merge (git-style)
- **Approach 3**: CRDT operations with OR-Set semantics (automatic merge)
- Reconciliation strategy selector in settings
- Integration tests for all approaches

### Phase 4: Core Features
- Implement PRISMA systematic review management
- Add custom entity support with metadata extraction
- Build file system synchronization with progressive enhancement

### Phase 5: Advanced Features
- Implement topic modeling and semantic analysis
- Add advanced visualization and reporting
- Optimize performance for large datasets

### Phase 6: Integration & Polish
- Testing and quality assurance
- Documentation and deployment preparation
- User experience optimization

## Risk Mitigation

### Technical Risks
- **Browser Compatibility**: Progressive enhancement with fallbacks
- **Performance**: Web Workers and streaming for heavy operations
- **Memory Usage**: Chunked processing and cleanup strategies

### Timeline Risks
- **Complexity**: Prioritized MVP approach (User Stories 1-2 first)
- **Integration**: Extends existing patterns to reduce learning curve
- **Testing**: Comprehensive test strategy from day one

## Success Metrics

### Performance Targets
- Export 1000+ citations in <5 seconds
- PRISMA operations <1 second response time
- Topic modeling 1000 abstracts in <30 seconds
- File sync handling 1000+ files efficiently

### Quality Targets
- 99.9% data integrity for all operations
- 100% compatibility with major reference managers
- 90% accuracy for PDF metadata extraction
- WCAG 2.1 AA accessibility compliance

This implementation plan provides a comprehensive roadmap for adding advanced literature review capabilities to BibGraph while maintaining architectural integrity and performance standards.