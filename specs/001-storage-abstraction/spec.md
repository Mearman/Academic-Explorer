# Feature Specification: Storage Abstraction Layer

**Feature Branch**: `001-storage-abstraction`
**Created**: 2025-11-11
**Status**: Completed
**Completed**: 2025-11-17
**Input**: User description: "decouple our storage from Dexie so we can easily inject an in-memory storage provider when in testing in playwright"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - E2E Test Execution with In-Memory Storage (Priority: P1)

QA engineers and developers need to run E2E tests in Playwright that interact with catalogue storage without the tests hanging or failing due to IndexedDB incompatibilities in the Playwright browser context.

**Why this priority**: This is the critical blocker preventing catalogue E2E tests from passing. Without this, 28+ E2E tests cannot run, blocking CI/CD pipelines and preventing regression detection.

**Independent Test**: Can be fully tested by running existing catalogue E2E tests in Playwright and verifying they complete successfully without hanging on storage operations. Delivers immediate value by unblocking the test suite.

**Acceptance Scenarios**:

1. **Given** an E2E test needs to create a catalogue list, **When** the test runs in Playwright with in-memory storage configured, **Then** the list is created successfully without hanging
2. **Given** an E2E test needs to add an entity to a catalogue, **When** the test executes storage operations, **Then** the operation completes within 2 seconds
3. **Given** multiple E2E tests run sequentially, **When** each test uses storage, **Then** each test has isolated storage state that doesn't leak between tests

---

### User Story 2 - Production Application with IndexedDB Storage (Priority: P1)

End users of the Academic Explorer application need their catalogue data to persist across browser sessions using the browser's native IndexedDB storage.

**Why this priority**: This is equally critical as it maintains the existing production functionality. The abstraction must not break existing user workflows.

**Independent Test**: Can be fully tested by using the production application with IndexedDB storage provider and verifying catalogue operations (create, read, update, delete) persist correctly across page refreshes and browser restarts.

**Acceptance Scenarios**:

1. **Given** a user creates a catalogue list in the production app, **When** the user refreshes the page, **Then** the catalogue list still exists with all its data
2. **Given** a user adds entities to a catalogue, **When** the user closes and reopens the browser, **Then** all entities remain in the catalogue
3. **Given** the application initializes with IndexedDB storage, **When** storage operations execute, **Then** data persists to the browser's IndexedDB

---

### User Story 3 - Development and Unit Testing with Mock Storage (Priority: P2)

Developers running unit tests or working on catalogue features in development need fast, isolated storage that doesn't require IndexedDB setup or cleanup.

**Why this priority**: While important for developer productivity, this is lower priority than P1 scenarios because developers can work around issues more easily than automated test suites.

**Independent Test**: Can be tested by running unit tests with mock storage provider and verifying tests execute quickly (<100ms per test) with full isolation between test cases.

**Acceptance Scenarios**:

1. **Given** a unit test suite runs with mock storage, **When** tests execute, **Then** each test completes in under 100ms
2. **Given** one test modifies storage state, **When** the next test runs, **Then** it starts with clean storage state
3. **Given** a developer is debugging catalogue features, **When** using mock storage in development mode, **Then** storage operations can be inspected and traced without browser DevTools

---

### Edge Cases

- What happens when storage initialization fails (e.g., IndexedDB quota exceeded in production)?
- How does the system handle switching between storage providers at runtime?
- What happens if a test forgets to configure a storage provider?
- How does the system handle concurrent operations when using in-memory storage in tests?
- What happens when the storage provider interface changes and implementations need updating?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a storage provider interface that abstracts all catalogue storage operations (create, read, update, delete, list)
- **FR-002**: System MUST provide an IndexedDB storage implementation that maintains current production behavior and data persistence
- **FR-003**: System MUST provide an in-memory storage implementation suitable for E2E testing that completes operations synchronously without IndexedDB dependencies
- **FR-004**: System MUST allow storage provider selection at application initialization time through configuration
- **FR-005**: System MUST ensure in-memory storage provides test isolation by resetting state between test runs
- **FR-006**: System MUST maintain the existing catalogue API surface so components require no changes
- **FR-007**: System MUST handle storage initialization errors gracefully with appropriate error messages
- **FR-008**: System MUST ensure storage providers implement the same interface contract to guarantee behavioral consistency
- **FR-009**: Test configuration MUST be able to inject the in-memory storage provider for Playwright E2E tests
- **FR-010**: Production configuration MUST default to IndexedDB storage provider to maintain existing functionality

### Key Entities

- **Storage Provider Interface**: Defines the contract for all storage operations including createList, getList, updateList, deleteList, addEntity, getEntities, removeEntity. Each operation returns promises with consistent error handling.
- **IndexedDB Storage Provider**: Implementation using Dexie that wraps existing catalogue-db functionality. Manages database schema, transactions, and error handling for browser persistence.
- **In-Memory Storage Provider**: Implementation using JavaScript Maps/objects that stores data in memory. Provides synchronous operation completion and test isolation through state reset capabilities.
- **Storage Configuration**: Mechanism to select and initialize the appropriate storage provider based on runtime environment (production vs test).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 28+ catalogue E2E tests execute successfully in Playwright without hanging, with each storage operation completing in under 2 seconds
- **SC-002**: Production catalogue functionality maintains 100% feature parity with current implementation, with zero data loss during migration
- **SC-003**: E2E test suite execution time improves by at least 50% due to faster in-memory operations compared to attempting IndexedDB
- **SC-004**: Developers can run unit tests with mock storage where each test completes in under 100ms
- **SC-005**: Zero production incidents related to storage operations after abstraction layer implementation
- **SC-006**: Test isolation is guaranteed with 100% of tests starting with clean storage state
- **SC-007**: Storage provider switching requires changing only configuration, not application code

## Assumptions *(optional)*

- The existing catalogue service API (CatalogueService class) can be refactored to use the storage provider interface without breaking component contracts
- Playwright E2E tests will configure the in-memory storage provider through test setup/initialization hooks
- The current Dexie-based implementation can be wrapped as an IndexedDB storage provider implementation without significant refactoring
- In-memory storage does not need to handle storage quota limits or persistence edge cases since it's only for testing
- The storage abstraction focuses on catalogue storage only; other storage systems (user-interactions, openalex-cache) are out of scope
- Migration of existing IndexedDB data is not required as this is for a PhD research application with test data only

## Dependencies & Integration Points *(optional)*

### Internal Dependencies
- **catalogue-db.ts**: Current Dexie implementation that will be wrapped by IndexedDB storage provider
- **catalogue-service.ts**: Service layer that will consume the storage provider interface
- **E2E test setup**: Playwright global setup and test configuration files that will inject storage provider

### External Dependencies
- **Dexie.js**: Remains as the IndexedDB wrapper for production storage provider
- **Playwright**: Testing framework that will use in-memory storage during E2E tests
- **Browser IndexedDB API**: Underlying persistence mechanism for production environment

### Integration Points
- Application initialization must select and configure the appropriate storage provider based on environment
- Test setup must inject in-memory storage provider before tests execute
- Components using catalogue storage continue to use the existing CatalogueService API without modifications

## Out of Scope *(optional)*

- Migration of existing IndexedDB data to new schema or storage format
- Abstraction of other storage systems (user-interactions, openalex-cache) beyond catalogue storage
- Storage provider implementations for other backends (localStorage, sessionStorage, remote APIs)
- Offline synchronization or conflict resolution between storage providers
- Performance optimization of the IndexedDB storage provider beyond current implementation
- Real-time collaboration or multi-tab synchronization features
- Storage quota management or user-facing storage settings
