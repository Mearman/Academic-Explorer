# Feature Specification: Test Environment MSW Setup

**Feature Branch**: `005-test-environment-msw`
**Created**: 2025-11-11
**Status**: Draft
**Input**: User description: "resolve the failing tests"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - E2E Tests Run Reliably Without External API Dependencies (Priority: P1)

A developer runs the E2E test suite (`pnpm test:e2e`) and all 225 tests pass consistently, without failures caused by external API unavailability, rate limiting, or HTTP 403 errors. The tests execute against mocked OpenAlex API responses, ensuring deterministic behavior and fast execution.

**Why this priority**: This is the critical MVP - without reliable test execution, the CI/CD pipeline is broken and developers cannot confidently deploy changes. Currently 27 tests fail due to OpenAlex API returning HTTP 403 errors, blocking development workflow.

**Independent Test**: Run `pnpm test:e2e` and verify:
1. Zero HTTP 403 errors in test output
2. All 225 tests pass
3. Tests complete in under 15 minutes (serial execution per constitution)
4. No real API calls to api.openalex.org

**Acceptance Scenarios**:

1. **Given** the test suite is configured with MSW, **When** a developer runs `pnpm test:e2e`, **Then** all 225 E2E tests pass without external API calls
2. **Given** MSW is initialized, **When** a test requests an OpenAlex entity (work/author/institution), **Then** MSW returns a fixture response instantly
3. **Given** the OpenAlex API is down or rate-limiting, **When** tests run, **Then** all tests still pass using mocked responses
4. **Given** a test requests an entity with ID W123, **When** MSW intercepts the request, **Then** it returns the fixture for W123 or a 404 if fixture doesn't exist
5. **Given** tests run in CI/CD, **When** they execute, **Then** they complete successfully without needing internet access or API keys

---

### User Story 2 - Test Fixtures Are Easy to Create and Maintain (Priority: P2)

A developer needs to add a new test that requires specific OpenAlex entity data. They can easily create a new test fixture by copying a real OpenAlex API response, saving it as a JSON file, and registering it in the fixture loader. The fixture system provides clear documentation and examples.

**Why this priority**: While less critical than making tests pass, maintainability ensures the test suite remains useful long-term. New tests should be easy to write without blocking on external API data.

**Independent Test**: A developer can:
1. Create a new fixture file in `test/fixtures/works/my-test-work.json`
2. Register it in `fixtures-loader.ts`
3. Use it in a test by requesting the fixture ID
4. Test passes using the mocked data

**Acceptance Scenarios**:

1. **Given** a developer needs test data for a new work, **When** they copy a real OpenAlex response to `test/fixtures/works/new-work.json`, **Then** MSW automatically serves it when tests request that work ID
2. **Given** fixture documentation exists, **When** a developer reads it, **Then** they understand how to create, register, and use fixtures
3. **Given** a fixture has invalid JSON, **When** tests start, **Then** a clear error message indicates which fixture file is malformed
4. **Given** fixtures follow OpenAlex schema, **When** tests use them, **Then** they behave identically to real API responses

---

### User Story 3 - MSW Setup Is Documented and Troubleshooting Is Clear (Priority: P3)

A developer new to the project can understand the MSW setup by reading documentation. If MSW isn't working correctly (requests not being mocked, wrong fixtures served, etc.), troubleshooting guides help them identify and fix the issue quickly.

**Why this priority**: Documentation and troubleshooting are important for team velocity but are lower priority than making tests work. Can be added incrementally after core functionality is stable.

**Independent Test**: A new developer can:
1. Read `test/mocks/README.md` and understand MSW architecture
2. Follow `test/fixtures/README.md` to create a fixture
3. Use troubleshooting guide if MSW doesn't intercept requests
4. Successfully run tests and add new fixtures

**Acceptance Scenarios**:

1. **Given** MSW documentation exists, **When** a developer reads it, **Then** they understand how MSW intercepts requests and serves fixtures
2. **Given** a troubleshooting guide exists, **When** MSW fails to mock a request, **Then** the developer can diagnose whether MSW is initialized, handlers are registered, or fixture is missing
3. **Given** common MSW issues are documented, **When** a developer encounters "Request not mocked" warning, **Then** they know to check handler patterns and fixture IDs
4. **Given** fixture structure is documented, **When** a developer adds a new entity type, **Then** they know which fields are required and which are optional

---

### Edge Cases

- What happens when a test requests an entity ID that has no fixture? (MSW should return 404, test should handle gracefully or fail with clear message)
- How does the system handle fixture files with malformed JSON? (MSW setup should validate fixtures on load and provide clear error messages with file paths)
- What happens if MSW fails to initialize in Playwright setup? (Tests should fail immediately with clear error, not timeout with confusing messages)
- How does the system handle concurrent test execution? (MSW is thread-safe in Node.js mode, each test worker gets isolated MSW instance)
- What happens when OpenAlex API schema changes? (Fixtures become outdated; documentation should explain how to update fixtures)
- How does the system handle tests that intentionally test error cases (403, 500, timeout)? (MSW handlers should support error simulation via query parameters or test setup)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST install and configure MSW 2.x for Node.js environment (not browser Service Worker)
- **FR-002**: System MUST integrate MSW into Playwright global setup to intercept all HTTP requests before tests run
- **FR-003**: System MUST create MSW handlers for OpenAlex API endpoints: `/works/:id`, `/authors/:id`, `/institutions/:id`, `/sources/:id`, `/autocomplete`
- **FR-004**: System MUST serve test fixtures (JSON files) in response to mocked API requests
- **FR-005**: System MUST support fixture files organized by entity type (works/, authors/, institutions/, sources/)
- **FR-006**: System MUST load fixtures dynamically based on entity ID in request URL
- **FR-007**: System MUST return HTTP 404 for entity IDs that have no corresponding fixture
- **FR-008**: System MUST validate fixture JSON on load and report clear errors for malformed files
- **FR-009**: System MUST use mock factories that accept any OpenAlex ID without requiring test modifications (programmatic generation approach per research.md Decision 6)
- **FR-010**: System MUST maintain test isolation - fixtures should not leak state between tests
- **FR-011**: System MUST document MSW setup, architecture, and fixture management in README files
- **FR-012**: System MUST provide troubleshooting guide for common MSW issues (requests not mocked, wrong fixtures, initialization failures)
- **FR-013**: System MUST preserve existing test logic - only API calls should be mocked, not test assertions or component behavior
- **FR-014**: System MUST ensure MSW adds minimal performance overhead (< 100ms per test)
- **FR-015**: System MUST support error simulation for testing error handling (500, 403, timeout responses)

### Key Entities

- **MSW Handler**: Intercepts HTTP requests matching a URL pattern and returns mocked responses; configured in `test/mocks/handlers.ts`
- **Test Fixture**: JSON file representing an OpenAlex entity response; stored in `test/fixtures/{type}/{id}.json`; follows OpenAlex API schema
- **Fixture Loader**: Utility that loads fixture files from disk and returns them as JavaScript objects; handles file not found errors
- **MSW Server**: Node.js HTTP server created by MSW that runs in Playwright global setup; intercepts all outgoing HTTP requests from tests

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 225 out of 225 E2E tests pass (100% pass rate, up from current 197/225 = 87.6%)
- **SC-002**: Zero HTTP 403 errors appear in test output logs
- **SC-003**: Zero real HTTP requests to api.openalex.org during test execution (verified via network logs)
- **SC-004**: Test suite completes in under 15 minutes (serial execution per constitution; baseline 13.7m observed)
- **SC-005**: MSW adds less than 100ms overhead per test on average (MSW response time vs real API)
- **SC-006**: 100% of mocked requests return a response (no "Request not mocked" warnings)
- **SC-007**: Tests pass consistently across different environments (local, CI/CD, offline)
- **SC-008**: Developers can create new test fixtures in under 5 minutes following documentation
- **SC-009**: Troubleshooting guide resolves 90% of MSW issues without external help
- **SC-010**: Test failures provide clear indication whether issue is in test logic, MSW configuration, or missing fixtures

## Constitution Alignment *(recommended)*

- **Type Safety**: MSW handlers are fully typed with TypeScript; fixture types match OpenAlex schema definitions
- **Test-First**: Tests already exist and failing; this feature fixes test infrastructure to make existing tests pass
- **Monorepo Architecture**: Changes confined to apps/web/test directory structure; no impact on packages/ or other apps/
- **Storage Abstraction**: No storage changes required; tests already use InMemoryStorageProvider per constitution
- **Performance & Memory**: MSW adds < 100ms per test; tests continue running serially per constitution requirements

## Assumptions *(optional)*

1. **Playwright is already configured**: The project uses Playwright for E2E tests with a working `playwright.config.ts` and `playwright.global-setup.ts`
2. **Tests run serially**: The Academic Explorer constitution mandates serial test execution to avoid memory issues, simplifying MSW setup (no concurrency concerns)
3. **Node.js 18+**: MSW 2.x requires Node.js 18 or higher, which is already used by the project
4. **OpenAlex API schema is stable**: Fixture structure matches current OpenAlex API responses; future schema changes may require fixture updates
5. **Tests use InMemoryStorageProvider**: Tests already use in-memory storage per constitution, so storage layer doesn't need mocking
6. **Limited entity types needed**: Initially only works, authors, institutions, and sources need fixtures; other types (concepts, funders, publishers) can be added incrementally
7. **Fixtures don't need full entity data**: Tests only require a subset of entity fields; fixtures can use minimal data to simplify maintenance
8. **No authentication required**: OpenAlex API is public and doesn't require API keys or authentication headers in tests

## Dependencies *(optional)*

### External Dependencies

- **MSW 2.x**: Mock Service Worker library for API mocking in Node.js environment
  - Version: Latest stable 2.x (as of Nov 2025)
  - Purpose: Intercept HTTP requests and serve mocked responses
  - Installation: `pnpm add -D msw@latest`
  - Documentation: https://mswjs.io/docs/

### Internal Dependencies

- **Playwright**: Already installed, provides E2E test framework and global setup hooks
- **Existing test suite**: 225 E2E tests in `apps/web/test/e2e/` (no test modifications required per research.md Decision 6)
- **OpenAlex API knowledge**: Understanding of entity response structure to create realistic fixtures
- **Catalogue feature**: Tests validate catalogue entity management, import/export, and sharing features (implemented in feature 004)

### Related Features

- **Feature 004 - Fix Failing Catalogue Tests**: This feature builds on 004 by fixing the test environment issues that prevented 27 tests from passing. The catalogue implementation is complete; this feature only addresses test infrastructure.

## Out of Scope *(optional)*

The following are explicitly NOT included in this feature:

1. **Mocking non-OpenAlex APIs**: Only api.openalex.org requests will be mocked; other APIs (if any) remain unchanged
2. **Unit test mocking**: MSW setup is only for E2E tests; unit tests should use Jest/Vitest mocks or test doubles
3. **Fixture generation tools**: Fixtures will be created manually by copying real API responses; automated fixture generation is future work
4. **Fixture version management**: No tooling to detect outdated fixtures or migrate fixtures when OpenAlex schema changes; manual updates required
5. **Performance testing fixtures**: Fixtures are optimized for functional correctness, not performance benchmarking (e.g., large datasets)
6. **Multi-version fixture support**: Only current OpenAlex API version will be mocked; no support for multiple API versions
7. **Dynamic fixture generation**: Fixtures are static JSON files; no runtime generation based on test parameters
8. **MSW for development server**: MSW setup is test-only; development server continues using real OpenAlex API
9. **Fixture validation against live API**: No automated checks to verify fixtures match current OpenAlex responses; validation is manual
10. **Browser-based MSW**: Using Node.js MSW server only; browser Service Worker approach is not used (not needed for Playwright)

---

**Specification Complete**
**Next Step**: Run `/speckit.clarify` if any [NEEDS CLARIFICATION] markers exist, or proceed to `/speckit.plan` for implementation planning
