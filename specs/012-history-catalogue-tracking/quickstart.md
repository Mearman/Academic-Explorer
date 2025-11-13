# Quickstart Guide: History Catalogue Tracking

**Feature**: 012-history-catalogue-tracking
**Date**: 2025-11-13
**For**: Manual testing and validation

## Purpose

This guide provides step-by-step instructions for manually testing the history tracking feature. Use this during development and before deployment to verify all functionality works as expected.

## Prerequisites

1. Development server running: `pnpm dev`
2. Browser with DevTools open (for storage inspection)
3. Clean browser state (clear IndexedDB if testing persistence)

## Test Scenarios

### Scenario 1: Basic History Tracking

**Objective**: Verify that visited entities are tracked automatically.

**Steps**:

1. Open application: `http://localhost:5173`
2. Navigate to a work:
   - Search for any work or use direct URL: `http://localhost:5173/#/works/W2741809807`
   - Note the work title
3. Navigate to an author:
   - Click on an author link or use direct URL: `http://localhost:5173/#/authors/A2964286280`
   - Note the author name
4. Navigate to history page:
   - Go to `http://localhost:5173/#/history`
5. **Verify**:
   - [ ] History page displays both entries (work and author)
   - [ ] Entries are in reverse chronological order (author first, then work)
   - [ ] Each entry shows correct icon (book for work, user for author)
   - [ ] Each entry shows correct title
   - [ ] Each entry shows timestamp (e.g., "2 minutes ago")

**Expected Result**: Both visited entities appear in history with correct metadata.

---

### Scenario 2: Deduplication

**Objective**: Verify that visiting the same entity multiple times updates the timestamp rather than creating duplicates.

**Steps**:

1. Navigate to work W2741809807
2. Navigate to author A2964286280
3. Navigate back to work W2741809807 (same work as step 1)
4. Navigate to history page
5. **Verify**:
   - [ ] Only ONE entry for work W2741809807 exists
   - [ ] Work entry is at the top (most recent)
   - [ ] Author entry is second
   - [ ] No duplicate work entries

**Expected Result**: Single entry for work W2741809807 with latest timestamp.

---

### Scenario 3: History Entry Navigation

**Objective**: Verify that clicking history entries navigates to the correct resource.

**Steps**:

1. Ensure history has at least 3 entries (repeat Scenario 1 if needed)
2. On history page, note the second entry (e.g., "Some Work Title")
3. Click on the second entry
4. **Verify**:
   - [ ] Browser navigates to the correct entity page
   - [ ] Entity page displays correct information
   - [ ] URL matches the history entry URL
5. Navigate back to history
6. Click on a different entry
7. **Verify**:
   - [ ] Correct navigation again

**Expected Result**: All history entries are clickable and navigate correctly.

---

### Scenario 4: Persistence Across Sessions

**Objective**: Verify that history persists after closing and reopening the browser.

**Steps**:

1. Navigate to 3-5 different entities to build history
2. Navigate to history page and note the entries
3. Close the browser tab completely
4. Open a new browser tab
5. Navigate directly to `http://localhost:5173/#/history`
6. **Verify**:
   - [ ] All previous history entries are still present
   - [ ] Entries maintain correct chronological order
   - [ ] No data loss occurred

**Expected Result**: History entries persist across browser sessions.

---

### Scenario 5: Time-Based Grouping

**Objective**: Verify that history entries are grouped by relative time periods.

**Steps**:

1. Navigate to several entities to build history
2. Navigate to history page
3. **Verify**:
   - [ ] Entries are grouped under "Today" header
   - [ ] Group header is visible and styled correctly
4. (Optional) Use browser DevTools to modify entry timestamps:
   - Open IndexedDB
   - Find history list items
   - Manually change timestamps to yesterday, last week, etc.
   - Reload history page
5. **Verify**:
   - [ ] Entries appear under correct group headers:
     - Today (last 24 hours)
     - Yesterday (24-48 hours ago)
     - Last 7 Days (2-7 days ago)
     - Last 30 Days (8-30 days ago)
     - Older (30+ days ago)

**Expected Result**: History entries are correctly grouped by time periods.

---

### Scenario 6: Remove Individual Entry

**Objective**: Verify that individual history entries can be removed.

**Steps**:

1. Ensure history has at least 5 entries
2. Navigate to history page
3. Find the "Remove" or delete button on the second entry
4. Click the remove button
5. **Verify**:
   - [ ] Entry is removed from the list immediately
   - [ ] Other entries remain intact
   - [ ] No page reload occurred (optimistic update)
6. Refresh the page
7. **Verify**:
   - [ ] Removed entry is still gone (persisted deletion)

**Expected Result**: Individual entries can be removed without affecting others.

---

### Scenario 7: Clear All History

**Objective**: Verify that all history can be cleared at once.

**Steps**:

1. Ensure history has at least 5 entries
2. Navigate to history page
3. Click "Clear History" button
4. **Verify**:
   - [ ] Confirmation dialog appears (if implemented)
5. Confirm the action
6. **Verify**:
   - [ ] All entries are removed
   - [ ] Empty state message is displayed
   - [ ] "Clear History" button is disabled or hidden
7. Navigate to a new entity
8. Return to history page
9. **Verify**:
   - [ ] New history entry appears
   - [ ] History tracking still works after clearing

**Expected Result**: All history is cleared, and tracking continues to work.

---

### Scenario 8: Large History (Performance)

**Objective**: Verify that history performs well with many entries.

**Steps**:

1. Use browser DevTools console to add 500 test entries:
   ```javascript
   // Open DevTools console
   // (Provide script to populate 500 entries)
   ```
2. Navigate to history page
3. **Verify**:
   - [ ] Page loads in under 2 seconds
   - [ ] Scrolling is smooth (60fps)
   - [ ] No browser lag or freezing
   - [ ] Virtualization is working (inspect DOM to see only ~20 rendered items)
4. Search/filter entries (if implemented)
5. **Verify**:
   - [ ] Filter/search is responsive

**Expected Result**: History performs well with 500+ entries (SC-001).

---

### Scenario 9: Different Entry Types

**Objective**: Verify that entities, lists, and views are all tracked and displayed correctly.

**Steps**:

1. Navigate to several different entity types:
   - Work: `/#/works/W123...`
   - Author: `/#/authors/A123...`
   - Source: `/#/sources/S123...`
   - Institution: `/#/institutions/I123...`
2. Navigate to a catalogue list (if available)
3. Navigate to a saved view (if available)
4. Go to history page
5. **Verify**:
   - [ ] All entry types are present
   - [ ] Each entry has correct icon:
     - Work: Book icon
     - Author: User icon
     - Source: Bookmark icon
     - Institution: Building icon
     - List: List icon
     - View: Eye icon
   - [ ] Each entry has correct title
   - [ ] Clicking each entry navigates correctly

**Expected Result**: All entry types are tracked and displayed with appropriate icons.

---

### Scenario 10: Edge Cases

**Objective**: Test edge cases and error conditions.

**Steps**:

**Test 10a: Entity No Longer Exists**

1. Add entity to history
2. (Simulate) Entity removed from OpenAlex (or use old/invalid ID)
3. Click history entry
4. **Verify**:
   - [ ] Graceful error handling (no crash)
   - [ ] User feedback (e.g., "Entity not found")
   - [ ] History entry can still be removed

**Test 10b: Empty History**

1. Clear all history
2. Navigate to history page
3. **Verify**:
   - [ ] Empty state is displayed with helpful message
   - [ ] No errors in console
   - [ ] Page is usable

**Test 10c: Rapid Navigation**

1. Rapidly navigate between 5-10 entities in quick succession
2. Navigate to history page
3. **Verify**:
   - [ ] All entries are captured (no missing entries)
   - [ ] Deduplication still works
   - [ ] No race conditions or duplicate entries

**Test 10d: Special Characters in Title**

1. Navigate to entity with special characters in title (quotes, apostrophes, unicode)
2. View history
3. **Verify**:
   - [ ] Title displays correctly (no encoding issues)
   - [ ] Entry is clickable
   - [ ] No console errors

**Expected Result**: Edge cases are handled gracefully without crashes.

---

## Manual Testing Checklist

Before marking the feature as complete, verify all these items:

### Functional Requirements

- [ ] FR-001: Special `history` list exists in catalogue storage
- [ ] FR-002: Entity visits are tracked automatically
- [ ] FR-003: List visits are tracked automatically (if lists implemented)
- [ ] FR-004: View visits are tracked automatically (if views implemented)
- [ ] FR-005: Timestamps are stored with each entry
- [ ] FR-006: Deduplication works (no duplicate entries)
- [ ] FR-007: History displayed in reverse chronological order
- [ ] FR-008: Entry type, title, and timestamp are displayed
- [ ] FR-009: Clicking entry navigates to resource
- [ ] FR-010: History persists across browser sessions
- [ ] FR-011: "Clear History" functionality works
- [ ] FR-012: Individual entry removal works
- [ ] FR-013: History list is created automatically if missing
- [ ] FR-014: History is distinct from browser navigation history

### Success Criteria

- [ ] SC-001: History loads in <2s with 500+ entries
- [ ] SC-002: 100% persistence across sessions (no data loss)
- [ ] SC-003: Navigation from history is immediate (<100ms)
- [ ] SC-004: Visual type indicators are clear and distinct
- [ ] SC-005: Deduplication works correctly (1 entry per item)
- [ ] SC-006: Clear history completes in <1s

### User Stories

- [ ] US-1: View recent visited entities (P1)
- [ ] US-2: Access previous lists and views (P2)
- [ ] US-3: Navigate to historical items (P1)
- [ ] US-4: Persistent history across sessions (P2)
- [ ] US-5: Clear or manage history (P3)

## Troubleshooting

### History not appearing

1. Check browser DevTools console for errors
2. Verify IndexedDB contains `history` list
3. Check that navigation hooks are firing (add console.logs)
4. Verify storage provider is initialized

### Deduplication not working

1. Check that entry IDs are being compared correctly
2. Verify timestamp updates are persisting to storage
3. Inspect IndexedDB to see if duplicates exist in storage

### Performance issues with large history

1. Verify virtualization is enabled (inspect DOM node count)
2. Check for memory leaks (DevTools Memory profiler)
3. Profile render performance (React DevTools Profiler)

### Persistence not working

1. Check IndexedDB storage quota and usage
2. Verify storage provider is using DexieStorageProvider (not InMemoryStorageProvider)
3. Clear browser cache and retry
4. Check for browser private/incognito mode (IndexedDB disabled)

## Notes

- This guide covers manual testing; automated tests should also be run
- Performance metrics should be verified with browser DevTools Performance tab
- Storage inspection requires browser DevTools → Application → IndexedDB
- Some scenarios may require mock data or DevTools manipulation
