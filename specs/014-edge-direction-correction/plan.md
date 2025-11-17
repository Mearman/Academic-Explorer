# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: No `any` types planned; use `unknown` with type guards
2. **Test-First Development**: Tests written and failing before implementation begins
3. **Monorepo Architecture**: Changes use proper Nx workspace structure (apps/ or packages/)
4. **Storage Abstraction**: Any storage operations use provider interface (no direct Dexie/IndexedDB coupling)
5. **Performance & Memory**: Tests run serially; memory constraints considered; Web Workers for heavy computation
6. **Atomic Conventional Commits**: Incremental atomic commits created after each task completion
7. **Development-Stage Pragmatism**: No backwards compatibility required; breaking changes acceptable during development

**Complexity Justification Required?** Document in Complexity Tracking section if this feature:
- Adds new packages/apps beyond existing structure
- Introduces new storage provider implementations
- Requires new worker threads
- Violates YAGNI or adds architectural complexity

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No complexity violations** - All Constitution principles satisfied. No justification required.

This feature works within existing monorepo structure, uses established storage abstraction, follows test-first development, maintains strict type safety, and embraces Development-Stage Pragmatism (no backwards compatibility/migration needed).

---

## Phase 0 & 1 Completion Summary

**Phase 0: Research** ✅ Complete
- Created `research.md` with 5 key technical decisions
- Resolved all architecture ambiguities via clarification session (2025-11-17)
- Key decisions:
  1. Edge direction semantics (source = owner, target = referenced)
  2. RelationType enum naming (noun form matching OpenAlex fields)
  3. Edge direction classification (outbound/inbound)
  4. No migration strategy (re-detect from entity data on load)
  5. Multi-modal visual distinction (line style + color + arrow style)

**Phase 1: Design & Contracts** ✅ Complete
- Created `data-model.md` defining GraphEdge and RelationType entities
- Created `contracts/relationship-detection-service.contract.ts` (interface + test fixtures)
- Created `contracts/edge-filters.contract.ts` (UI component contract + styling constants)
- Created `quickstart.md` with step-by-step implementation guide (8-12 hour estimate)
- Updated agent context via `.specify/scripts/bash/update-agent-context.sh claude`

**Artifacts Generated**:
```
specs/014-edge-direction-correction/
├── spec.md                    # Feature specification (with clarifications)
├── plan.md                    # This file
├── research.md                # Technical decisions
├── data-model.md              # Entity definitions and metadata schemas
├── quickstart.md              # Implementation guide
├── checklists/
│   └── requirements.md        # Spec quality validation
└── contracts/
    ├── relationship-detection-service.contract.ts
    └── edge-filters.contract.ts
```

**Next Steps**:
1. Run `/speckit.tasks` to generate atomic task breakdown (`tasks.md`)
2. Begin implementation following quickstart.md Phase 1 (P1 MVP: 4-6 hours)
3. Execute test-first workflow (write failing tests → implement → verify passing)
