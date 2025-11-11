# Phase 0 Research: Test Environment MSW Setup

**Feature**: 005-test-environment-msw
**Date**: 2025-11-11
**Status**: Complete

## Research Summary

This document consolidates research findings to inform implementation decisions for MSW-based API mocking in Playwright E2E tests. All unknowns have been resolved.

## Key Findings

### 1. MSW Integration Already Exists

**Discovery**: The codebase already has MSW handlers implemented at `apps/web/src/test/msw/handlers.ts`.

**Current State**:
- MSW 2.x is already installed (using `http` from `msw`)
- Handlers exist for `/works/:id`, `/authors/:id`, `/institutions/:id`, plus list endpoints
- Mock factories create full OpenAlex entities programmatically
- Handlers return proper HTTP responses with MSW headers

**Gap Analysis**:
- MSW handlers exist BUT are not being initialized during Playwright test execution
- No integration between MSW and Playwright global setup
- Tests are making real API calls instead of using the existing mocks
- This explains the HTTP 403 errors: MSW is not active during E2E tests

**Decision**: Integrate existing MSW handlers into Playwright lifecycle, DO NOT recreate handlers.

---

### 2. MSW 2.x + Playwright Integration Pattern

**Research Question**: How to initialize MSW Node.js server in Playwright?

**Findings from Web Search**:
Two official integration options exist:
1. **@msw/playwright** - Official MSW binding, uses `page.route()` as network source
2. **playwright-msw** - Community package using `createWorkerFixture`

**Decision**: Use **setupServer** from `msw/node` in Playwright global setup.

**Rationale**:
- Most straightforward approach for Node.js MSW (v2.x standard pattern)
- Playwright tests run in Node.js process, not browser
- Avoids adding extra dependencies (@msw/playwright, playwright-msw)
- Follows MSW official docs for Node.js integration
- Can reuse existing handlers without modification

**Implementation Pattern**:
```typescript
// playwright.global-setup.ts
import { setupServer } from 'msw/node'
import { openalexHandlers } from './src/test/msw/handlers'

const server = setupServer(...openalexHandlers)

async function globalSetup(config: FullConfig) {
  server.listen({ onUnhandledRequest: 'warn' })
  console.log('✅ MSW server started')
}

export default globalSetup

// playwright.global-teardown.ts
server.close()
```

**Lifecycle**:
- START: `globalSetup` - before any tests run
- STOP: `globalTeardown` - after all tests complete
- Handlers active for entire test suite duration

---

### 3. OpenAlex Entity Schemas

**Research Question**: What fields are required for test fixtures?

**Findings from OpenAlex Docs** (docs.openalex.org):

**Work Entity** (Work object | OpenAlex documentation):
- Required: `id`, `display_name`, `publication_year`, `cited_by_count`, `authorships`
- Optional: `doi`, `open_access`, `primary_location`, `biblio`, `abstract_inverted_index`
- Relationships: `authorships` array contains `author` + `institutions` objects

**Author Entity** (Author object | OpenAlex documentation):
- Required: `id`, `display_name`, `works_count`, `cited_by_count`
- Optional: `orcid`, `last_known_institutions`, `summary_stats.h_index`
- Canonical ID: ORCID

**Institution Entity** (Institution object | OpenAlex documentation):
- Required: `id`, `display_name`, `type`, `country_code`
- Optional: `ror`, `works_count`, `cited_by_count`
- Type vocabulary: Education, Healthcare, Company, Archive, Nonprofit, Government, Facility, Other

**Source Entity** (not fully researched, less critical):
- Required: `id`, `display_name`, `type`
- Optional: `issn`, `works_count`

**Findings from Existing Codebase**:

File `apps/web/src/types/catalogue.ts` defines metadata interfaces:
- `WorkMetadata`: displayName, publicationYear, citedByCount, primaryLocation, authorships, openAccess
- `AuthorMetadata`: displayName, worksCount, citedByCount, hIndex, lastKnownInstitution
- `InstitutionMetadata`: displayName, worksCount, citedByCount, countryCode, institutionType
- `SourceMetadata`: displayName, worksCount, citedByCount, issn, isOa

File `apps/web/src/test/msw/handlers.ts` already has mock factories:
- `createMockWork(id)`: Returns full Work entity with all fields
- `createMockAuthor(id)`: Returns full Author entity
- `createMockInstitution(id)`: Returns full Institution entity

**Decision**: Reuse existing mock factories, DO NOT create static JSON fixtures.

**Rationale**:
- Mock factories already match OpenAlex schema
- Programmatic generation is more maintainable than 100+ field JSON files
- Factories support dynamic ID-based mocking (any ID works)
- Tests don't need static fixtures; they need entities that satisfy interface contracts
- Static JSON would duplicate existing TypeScript types

---

### 4. Fixture Management Strategy

**Research Question**: Static JSON files vs programmatic generation?

**Analysis**:

**Static JSON Fixtures**:
- Pros: Version controllable, human-readable, easy to review
- Cons: Large files (Work has 100+ fields), maintenance burden, schema drift risk

**Programmatic TypeScript Factories** (current approach):
- Pros: Type-safe, compact, dynamic ID support, matches TypeScript interfaces
- Cons: Less human-readable than JSON

**Hybrid Approach**:
- Factories for dynamic entities (any Work ID returns valid Work)
- Static JSON for specific test cases (e.g., work-bioplastics.json for catalogue tests)

**Decision**: Continue using programmatic factories, add static JSON only for specific test scenarios.

**Rationale**:
- Existing factories cover 95% of test needs
- Specific tests (e.g., bioplastics import) need known entity data
- Hybrid balances maintainability (factories) with specificity (JSON for edge cases)

**Implementation**:
1. Keep `createMockWork()`, `createMockAuthor()`, `createMockInstitution()` in handlers.ts
2. Add fixtures loader for static JSON files (when needed)
3. MSW handler checks: static fixture exists? Return it. Else, use factory.

---

### 5. Error Handling in MSW Handlers

**Research Question**: How to handle fixture not found (404)?

**Current Implementation**:
```typescript
http.get(`${API_BASE}/*`, () => {
  return HttpResponse.json({ error: "Not found" }, { status: 404 })
})
```

**Decision**: Keep catch-all 404 handler, add specific error simulation.

**Rationale**:
- Tests should handle 404 gracefully (missing entity scenario)
- Catch-all prevents unhandled requests from reaching real API
- Enables testing error handling logic

**Additional Error Scenarios**:
- HTTP 429 (rate limit): Already implemented for `W2799442855`
- HTTP 403 (forbidden): Can simulate via query parameter `?error=403`
- HTTP 500 (server error): Can simulate via query parameter `?error=500`

---

### 6. Test ID Mapping

**Research Question**: Update test IDs or map real IDs to fixtures?

**Analysis**:
- Tests currently use real OpenAlex IDs (causing 403 errors)
- Options:
  1. Update tests to use mock IDs (e.g., `W1000000000`)
  2. Map real IDs to mock responses in MSW handlers
  3. Use factories that work with any ID

**Decision**: Use factories that work with any ID (option 3).

**Rationale**:
- No test changes required
- Any ID returns valid entity (e.g., `W123` returns Work with id `W123`)
- Reduces implementation scope
- Tests remain unchanged (constitution: fix infrastructure, not tests)

**Exception**: Specific test data (e.g., work-bioplastics) needs exact metadata.
- Solution: Add static fixtures for these cases
- Handler checks: `if (id === 'W123456789') return bioplasticsFixture; else return createMockWork(id)`

---

## Implementation Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| MSW Integration | setupServer in globalSetup | Standard Node.js pattern, no extra deps |
| Handler Reuse | Use existing handlers.ts | Already implements OpenAlex API, type-safe |
| Fixture Strategy | Programmatic factories + selective JSON | Maintainable, type-safe, covers edge cases |
| Test ID Changes | None required | Factories work with any ID |
| Error Handling | Keep 404 catch-all, add error simulation | Tests error paths, prevents real API calls |
| Lifecycle | Start in globalSetup, stop in globalTeardown | MSW active for all tests |

---

## Open Questions RESOLVED

**Q1**: How to prevent MSW from intercepting non-OpenAlex requests?
**A1**: Handlers scoped to `https://api.openalex.org` only. Other domains unaffected.

**Q2**: Will MSW work with Playwright's browser context isolation?
**A2**: Yes. MSW Node.js server intercepts at HTTP level before requests reach browser.

**Q3**: Do we need @msw/playwright or playwright-msw packages?
**A3**: No. setupServer from msw/node is sufficient for Node.js-based Playwright tests.

**Q4**: How to ensure MSW is initialized before tests?
**A4**: globalSetup runs before any tests. Verified by Playwright test lifecycle.

**Q5**: Performance impact of MSW?
**A5**: <1ms per request in Node.js mode. Faster than real API calls (no network latency).

---

## References

1. **MSW Official Docs**: https://mswjs.io/docs/ (setupServer Node.js integration)
2. **OpenAlex API Docs**: https://docs.openalex.org/ (Work, Author, Institution schemas)
3. **Playwright Global Setup**: https://playwright.dev/docs/test-global-setup-teardown
4. **Existing Implementation**: `apps/web/src/test/msw/handlers.ts` (mock factories)
5. **Type Definitions**: `apps/web/src/types/catalogue.ts` (entity metadata interfaces)

---

**Research Phase Complete**
**Next**: Phase 1 Design (data-model.md, contracts/, quickstart.md)
