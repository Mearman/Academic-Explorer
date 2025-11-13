# Feature Specification: History Catalogue Tracking

**Feature Branch**: `012-history-catalogue-tracking`
**Created**: 2025-11-13
**Status**: Draft
**Input**: User description: "http://localhost:5173/#/history should use the catalogue system as a special "history" list and should show a history of entities, lists and views visited, not a "navigation history""

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Recent Visited Entities (Priority: P1)

A researcher is exploring academic literature and wants to quickly return to a paper they viewed earlier today without searching for it again. They navigate to the history route and see a chronological list of all entities (works, authors, institutions, etc.) they've visited during their current session and previous sessions.

**Why this priority**: This is the core value proposition - allowing users to track and revisit their research journey. Without this, the feature provides no value.

**Independent Test**: Can be fully tested by navigating to several works and authors, then visiting `/history` and verifying all visited entities appear in reverse chronological order (most recent first).

**Acceptance Scenarios**:

1. **Given** a user has visited 5 different works in the current session, **When** they navigate to `/history`, **Then** they see all 5 works listed in reverse chronological order with the most recent visit at the top
2. **Given** a user has visited the same entity multiple times, **When** they view the history, **Then** only the most recent visit is shown (no duplicates)
3. **Given** a user has visited entities, lists, and views, **When** they navigate to `/history`, **Then** all item types are displayed with clear visual indicators showing the item type (work icon, author icon, list icon, etc.)

---

### User Story 2 - Access Previous Lists and Views (Priority: P2)

A researcher has created several custom lists and query views during their research process. They want to see a history of lists they've created or visited and views they've saved, so they can return to their previous research contexts.

**Why this priority**: Extends the history beyond just entity visits to include higher-level organizational units (lists and views), making the history more useful for complex research workflows.

**Independent Test**: Create 2-3 custom lists and saved views, then verify they appear in the history timeline alongside entity visits.

**Acceptance Scenarios**:

1. **Given** a user has created 3 custom lists over the past week, **When** they view the history, **Then** the list creation events appear in the timeline with timestamps and list titles
2. **Given** a user has opened an existing list from their catalogue, **When** they view the history, **Then** the list access event appears in the timeline
3. **Given** a user has saved a search query as a view, **When** they view the history, **Then** the saved view appears in the timeline with a descriptive label

---

### User Story 3 - Navigate to Historical Items (Priority: P1)

A researcher sees an entity, list, or view in their history and wants to return to it immediately. They click on the history item and are taken directly to that resource.

**Why this priority**: Essential for making the history actionable - viewing history is only useful if users can act on it.

**Independent Test**: Add several items to history, click on any history entry, and verify navigation to the correct destination.

**Acceptance Scenarios**:

1. **Given** a user is viewing the history list, **When** they click on a work entry, **Then** they are navigated to that work's detail page
2. **Given** a user is viewing the history list, **When** they click on a list entry, **Then** they are navigated to that list's view
3. **Given** a user is viewing the history list, **When** they click on a saved view entry, **Then** they are navigated to the search results page with that view's query applied

---

### User Story 4 - Persistent History Across Sessions (Priority: P2)

A researcher closes their browser and returns the next day. They want to see their complete research history from previous sessions, not just the current session.

**Why this priority**: Essential for long-term research workflows where users work across multiple sessions over days or weeks.

**Independent Test**: Visit several entities, close browser, reopen browser, navigate to `/history`, and verify previous session's history is still present.

**Acceptance Scenarios**:

1. **Given** a user has visited entities in a previous session, **When** they open the application in a new session and navigate to `/history`, **Then** they see history entries from both the current and previous sessions
2. **Given** a user has accumulated history over multiple days, **When** they view the history, **Then** entries are grouped by date (Today, Yesterday, Last 7 days, etc.) for easy scanning

---

### User Story 5 - Clear or Manage History (Priority: P3)

A researcher wants to clear old history entries to focus on current work, or remove specific entries they no longer need.

**Why this priority**: Nice-to-have feature for power users who want to manage their history, but not essential for basic functionality.

**Independent Test**: Add several history entries, clear all history or remove individual items, and verify they no longer appear.

**Acceptance Scenarios**:

1. **Given** a user has history entries, **When** they click "Clear History", **Then** all history entries are removed and the history view shows an empty state
2. **Given** a user is viewing the history list, **When** they click a "Remove" button on a specific entry, **Then** that entry is removed from the history while others remain
3. **Given** a user has cleared their history, **When** they visit new entities, **Then** new history entries are created normally

---

### Edge Cases

- What happens when the history list grows very large (1000+ entries)? Should there be pagination or virtualization to maintain performance?
- How does the system handle history entries for entities that no longer exist or have been removed from OpenAlex?
- What happens if the special "history" list in the catalogue system becomes corrupted or is manually deleted?
- Should there be a maximum retention period for history (e.g., 90 days) to prevent unbounded growth?
- How does history tracking interact with privacy-conscious users who may want to disable tracking?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a special catalogue list with ID `history` to store visited items
- **FR-002**: System MUST automatically add entries to the history list when a user navigates to an entity (work, author, source, institution, publisher, funder, topic)
- **FR-003**: System MUST automatically add entries to the history list when a user navigates to or creates a list in the catalogue
- **FR-004**: System MUST automatically add entries to the history list when a user navigates to or creates a saved query view
- **FR-005**: System MUST store timestamp metadata with each history entry to enable chronological ordering
- **FR-006**: System MUST deduplicate history entries so repeated visits to the same item update the timestamp rather than creating duplicate entries
- **FR-007**: The `/history` route MUST display all history entries in reverse chronological order (most recent first)
- **FR-008**: Each history entry MUST display the item type (entity type, list, or view), title/name, and timestamp
- **FR-009**: Each history entry MUST be clickable and navigate to the corresponding resource
- **FR-010**: History entries MUST persist across browser sessions using the storage abstraction layer
- **FR-011**: Users MUST be able to clear all history entries via a "Clear History" action
- **FR-012**: Users MUST be able to remove individual history entries
- **FR-013**: System MUST handle the case where the special "history" list doesn't exist by creating it on first use
- **FR-014**: System MUST differentiate between navigation history (browser back/forward) and visited item history (this feature)

### Key Entities

- **History Entry**: Represents a single visited item with metadata including:
  - Item type (entity type, list, or view)
  - Item identifier (OpenAlex ID for entities, list ID for lists, view ID for views)
  - Item title or name
  - Timestamp of visit (last accessed time)
  - Navigation target (URL or route information)

- **Special History List**: A catalogue list with the reserved ID `history` that stores all history entries. Unlike user-created lists, this list:
  - Cannot be renamed or deleted by normal list operations
  - Is automatically created if missing
  - Follows the same storage provider interface as regular lists

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can access their complete visit history from the `/history` route in under 2 seconds even with 500+ history entries
- **SC-002**: History entries persist correctly across browser sessions with 100% reliability (no data loss)
- **SC-003**: Users can navigate from a history entry to the target resource in a single click with immediate response
- **SC-004**: The history view displays all entry types (entities, lists, views) with distinct visual indicators that users can identify without confusion
- **SC-005**: History deduplication works correctly such that visiting the same item 10 times results in only 1 history entry with the latest timestamp
- **SC-006**: Clearing history removes all entries and the history view shows an empty state within 1 second

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature avoids `any` types; uses `unknown` with type guards where needed. History entry types will be strictly typed with discriminated unions for different item types (entity/list/view).
- **Test-First**: User stories include testable acceptance scenarios; implementation will follow Red-Green-Refactor. Each user story can be independently tested.
- **Monorepo Architecture**: Feature primarily fits within `apps/web` for routing and UI components. May require minor extensions to `packages/utils` storage provider interface if history list needs special handling.
- **Storage Abstraction**: Feature uses the storage provider interface (`CatalogueStorageProvider`) with the special system list ID `history`. No direct IndexedDB or Dexie access.
- **Performance & Memory**: Success criteria include performance metrics (SC-001: under 2 seconds with 500+ entries). Implementation should use virtualization or pagination if history grows large.
- **Atomic Conventional Commits**: Implementation tasks will be committed atomically with conventional commit messages (e.g., `feat(history): add history route component`, `feat(history): implement automatic tracking`).

## Assumptions

- The existing catalogue storage system already supports special system lists (based on mention of "bookmarks" system list with ID `bookmarks` in CLAUDE.md)
- The storage provider interface has methods for creating, reading, and deleting list entries
- Navigation events can be intercepted at the routing level (TanStack Router) to automatically track visits
- Entity, list, and view identifiers are stable and can be used as unique keys for deduplication
- Users expect history to persist indefinitely until manually cleared (no automatic expiration)
- History entries are stored as catalogue list items with metadata fields for type, timestamp, and navigation target
