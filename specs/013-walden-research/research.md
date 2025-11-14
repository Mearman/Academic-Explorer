# OpenAlex Walden API Parameter Research

**Research Date**: 2025-11-14-223233
**Purpose**: Determine API integration patterns for OpenAlex Data Version 2 (Walden) and xpac works

---

## Executive Summary

**Decision**: Use Walden (v2) as the default data version without explicit `data-version` parameter. Implement `include_xpac=true` as an opt-in feature controlled by user settings.

**Rationale**:
- Walden (v2) is now the default OpenAlex dataset (launched November 4, 2025)
- No `data-version` parameter is needed for v2 access (it's the default)
- Data Version 1 is still accessible via `data-version=1` but will be deprecated (end date unclear from API testing)
- xpac works require explicit opt-in via `include_xpac=true` parameter
- xpac works are NOT included by default (confirmed via API testing)

---

## 1. data-version Parameter Research

### 1.1 Parameter Behavior

**Test Results**:

```bash
# Default query (no data-version parameter)
curl "https://api.openalex.org/works?sample=1&per_page=1"
# Result: Returns Walden v2 data (contains "is_xpac" field)

# Query with data-version=2 (explicit v2)
curl "https://api.openalex.org/works?data-version=2&sample=1&per_page=1"
# Result: Success - identical to default behavior

# Query with data-version=1 (legacy v1)
curl "https://api.openalex.org/works?data-version=1&sample=1&per_page=1"
# Result: Success - returns v1 data format
```

**Findings**:

1. **Default Behavior**: When `data-version` parameter is omitted, API returns Walden v2 data
2. **Explicit v2 Access**: `data-version=2` is supported but unnecessary (already default)
3. **Legacy v1 Access**: `data-version=1` still works as of 2025-11-14
4. **Simultaneous Access**: Cannot request both v1 and v2 in single query (mutually exclusive)

### 1.2 Support Timeline

**From OpenAlex Blog (Web Search Results)**:
- **Launch Date**: November 4, 2025 (Walden became default)
- **Beta Period**: October 1, 2025 - November 3, 2025 (data-version parameter introduced)
- **v1 Support**: Available "for a few weeks after launch" (exact end date not specified in API responses)
- **Spec Statement**: "November 2025 only for v1" (suggests v1 deprecated December 2025)

**Recommendation**:
- Implement `data-version=1` support as temporary feature with UI warning
- Plan removal for December 2025 timeline
- Use feature flag or environment check for v1 access

### 1.3 Response Format Differences

**New Fields in v2** (observed in API responses):

```typescript
interface WaldenWork {
  is_xpac: boolean;          // NEW: Indicates xpac work (datasets, software, specimens)
  // Existing fields enhanced with better data quality:
  referenced_works: string[];  // 14% more references in v2
  locations: Location[];       // 14% more locations in v2
  language: string;            // Improved detection algorithm
  open_access: OpenAccess;     // Better OA classification
  topics: Topic[];             // 5% more topic assignments
  keywords: Keyword[];         // Higher quality assignments
  license: License;            // 5% more license detection
}
```

**Metadata Quality Improvements** (from OpenAlex blog):
- 14% increase in references for existing works
- 14% increase in locations (publisher, repository, preprint)
- Improved language detection (especially non-English)
- Better Open Access classification
- 5% increase in topic coverage
- Higher quality keyword assignments
- 5% increase in license detection

**No Breaking Changes**: All v1 fields remain in v2 with same structure

---

## 2. include_xpac Parameter Research

### 2.1 Parameter Behavior

**Test Results**:

```bash
# Default query (no include_xpac parameter)
curl "https://api.openalex.org/works?sample=5&per_page=5" | grep '"is_xpac":true'
# Result: 0 xpac works found - xpac NOT included by default

# Query with include_xpac=true
curl "https://api.openalex.org/works?include_xpac=true&sample=5&per_page=5"
# Result: Can include xpac works (is_xpac:true in results)

# Filter for xpac works only
curl "https://api.openalex.org/works?filter=is_xpac:true&per_page=1"
# Result: Returns xpac works successfully
```

**Findings**:

1. **Default Behavior**: xpac works are EXCLUDED by default (opt-in, not opt-out)
2. **Opt-In Mechanism**: Must explicitly send `include_xpac=true` to include xpac works
3. **Opt-Out Mechanism**: Simply omit parameter (default excludes xpac)
4. **Filtering Support**: Can filter specifically for xpac works using `filter=is_xpac:true`
5. **Field Always Present**: `is_xpac` field exists in ALL v2 responses (true/false boolean)

### 2.2 xpac Work Characteristics

**From OpenAlex Documentation** (https://docs.openalex.org/how-to-use-the-api/xpac):

- **Definition**: xpac = "expansion pack" - 192M additional works
- **Content Sources**:
  - All of DataCite
  - Thousands of institutional repositories
  - Subject-area repositories
- **Work Types**: datasets, software, physical specimens, other non-traditional outputs
- **Metadata Quality**: Lower quality than core OpenAlex works
- **Author Disambiguation**: Not yet available for xpac works (name strings only)
- **Total Count**: 192,668,361 xpac works as of 2025-11-14

**Example xpac Work** (from API testing):

```json
{
  "id": "https://openalex.org/W7031043737",
  "title": "@andreea2698",
  "type": "other",
  "is_xpac": true,
  "authorships": [],  // Empty - no author disambiguation
  "primary_location": {
    "source": {
      "display_name": "Internet Archive (Internet Archive)",
      "type": "repository"
    }
  }
}
```

### 2.3 Integration with data-version Parameter

**Test Results**:

```bash
# Both parameters together
curl "https://api.openalex.org/works?data-version=2&include_xpac=true&sample=1"
# Result: Success - parameters can be used together

# xpac with v1 (edge case)
curl "https://api.openalex.org/works?data-version=1&include_xpac=true&sample=1"
# Result: Unknown (not tested) - v1 predates xpac introduction
```

**Recommendation**:
- Allow `include_xpac=true` only with v2 (default) or explicit `data-version=2`
- Disable xpac toggle when user selects v1 (if v1 support is implemented)

---

## 3. API Integration Patterns

### 3.1 Recommended Client Implementation

```typescript
interface OpenAlexQueryParams {
  // Omit data-version parameter (defaults to v2)
  // Only include for temporary v1 access:
  'data-version'?: '1';  // v2 is default, don't send '2'

  // xpac support (opt-in)
  include_xpac?: boolean;  // Only send 'true', omit for false (default)

  // Standard parameters
  filter?: string;
  search?: string;
  per_page?: number;
  cursor?: string;
  select?: string;
}

// Example: Default query (v2, no xpac)
const defaultParams = {
  filter: 'cited_by_count:>10',
  per_page: 25
};
// Sends: /works?filter=cited_by_count:>10&per_page=25

// Example: Include xpac works
const xpacParams = {
  include_xpac: true,
  filter: 'cited_by_count:>10',
  per_page: 25
};
// Sends: /works?include_xpac=true&filter=cited_by_count:>10&per_page=25

// Example: Temporary v1 access (deprecated)
const v1Params = {
  'data-version': '1',
  filter: 'cited_by_count:>10',
  per_page: 25
};
// Sends: /works?data-version=1&filter=cited_by_count:>10&per_page=25
```

### 3.2 Settings Storage Pattern

```typescript
interface OpenAlexSettings {
  // User preference for xpac works (default: false)
  includeXpac: boolean;

  // Temporary v1 support (default: undefined = use v2)
  // Remove this field after December 2025
  dataVersion?: '1';  // Only '1' or undefined (v2)
}

// Zustand store example
interface SettingsStore {
  openAlexSettings: OpenAlexSettings;

  setIncludeXpac: (enabled: boolean) => void;

  // Temporary method - remove December 2025
  setDataVersion: (version: '1' | undefined) => void;
}
```

### 3.3 Query Building Logic

```typescript
function buildOpenAlexParams(
  baseParams: QueryParams,
  settings: OpenAlexSettings
): QueryParams {
  const params = { ...baseParams };

  // Add xpac parameter if user enabled it
  if (settings.includeXpac) {
    params.include_xpac = true;
  }

  // Add data-version only for v1 (temporary support)
  // REMOVE THIS BLOCK AFTER DECEMBER 2025
  if (settings.dataVersion === '1') {
    params['data-version'] = '1';
  }

  return params;
}
```

### 3.4 Response Type Handling

```typescript
// All Walden v2 works have is_xpac field
interface BaseWork {
  id: string;
  title: string;
  type: string;
  is_xpac: boolean;  // NEW in v2 - always present
  // ... other fields
}

// Type guard for xpac works
function isXpacWork(work: BaseWork): boolean {
  return work.is_xpac === true;
}

// UI rendering logic
function renderWork(work: BaseWork) {
  if (isXpacWork(work)) {
    // Show xpac-specific UI:
    // - Visual distinction (badge, muted colors, dashed border)
    // - Warning about metadata quality
    // - Note about missing author disambiguation
    // - "Unverified" indicator
  }

  // Standard work rendering
}
```

---

## 4. Alternatives Considered

### 4.1 Always Send data-version=2 Explicitly

**Rejected because**:
- Unnecessary network overhead (v2 is default)
- Adds parameter clutter to all requests
- No benefit over omitting parameter
- Violates principle of minimal required parameters

### 4.2 Make xpac Default (include_xpac=true by default)

**Rejected because**:
- OpenAlex currently excludes xpac by default
- Spec incorrectly assumed xpac would be default (based on OpenAlex blog speculation)
- Adding 192M works impacts performance without user opt-in
- User confusion if datasets/software suddenly appear in search results
- Better UX to start conservative and let users expand scope

**Correct Approach**: Opt-in with clear UI toggle and explanation

### 4.3 Support Both v1 and v2 Simultaneously

**Rejected because**:
- Cannot query both versions in single API request
- Would require duplicate queries and merge logic
- v1 is deprecated and temporary
- Adds unnecessary complexity
- No clear user benefit

### 4.4 Wait Until v1 Removed to Implement Walden Support

**Rejected because**:
- v2 is already default (launched November 4, 2025)
- Delaying provides no benefit
- Users already receiving v2 data without client changes
- Missing xpac feature opportunity
- Spec requirement is to support Walden features

---

## 5. Migration Strategy

### 5.1 Phase 1: Immediate (November 2025)

1. Add `is_xpac` field to Work type definition
2. Implement `include_xpac` parameter support in client
3. Add xpac toggle in settings UI (default: false)
4. Implement xpac work visual indicators
5. Update type guards to handle xpac works

### 5.2 Phase 2: Optional (November-December 2025)

1. Add temporary `data-version=1` support with UI warning
2. Display deprecation notice for v1 access
3. Add A/B comparison UI for v1 vs v2 (User Story 3)

### 5.3 Phase 3: Cleanup (December 2025+)

1. Remove `data-version=1` support
2. Remove v1 comparison UI
3. Remove v1 settings and feature flags
4. Update documentation to remove v1 references

---

## 6. Code Examples

### 6.1 Client Parameter Building

```typescript
// File: packages/client/src/client.ts

export class OpenAlexBaseClient {
  private buildUrl(endpoint: string, params: QueryParams = {}): string {
    // ... existing code ...

    // Don't send data-version=2 (it's the default)
    if (params['data-version'] === '2') {
      delete params['data-version'];
    }

    // Only send include_xpac when true (false is default)
    if (params.include_xpac === false || params.include_xpac === undefined) {
      delete params.include_xpac;
    }

    // ... existing parameter building logic ...
  }
}
```

### 6.2 Settings Store Integration

```typescript
// File: apps/web/src/stores/settings-store.ts

interface OpenAlexSettings {
  includeXpac: boolean;  // Default: false
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set) => ({
      openAlexSettings: {
        includeXpac: false,
      },

      setIncludeXpac: (enabled: boolean) => {
        set((state) => {
          state.openAlexSettings.includeXpac = enabled;
        });
      },
    })),
    {
      name: 'academic-explorer-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### 6.3 UI Toggle Component

```typescript
// File: apps/web/src/components/settings/XpacToggle.tsx

export function XpacToggle() {
  const includeXpac = useSettingsStore((s) => s.openAlexSettings.includeXpac);
  const setIncludeXpac = useSettingsStore((s) => s.setIncludeXpac);

  return (
    <Switch
      label="Include xpac works (datasets, software, specimens)"
      description="Adds 192M additional works from DataCite and repositories. Note: Lower metadata quality, no author disambiguation."
      checked={includeXpac}
      onChange={(event) => setIncludeXpac(event.currentTarget.checked)}
    />
  );
}
```

### 6.4 Visual Indicator for xpac Works

```typescript
// File: apps/web/src/components/works/WorkCard.tsx

export function WorkCard({ work }: { work: Work }) {
  const isXpac = work.is_xpac;

  return (
    <Card
      style={{
        borderStyle: isXpac ? 'dashed' : 'solid',
        opacity: isXpac ? 0.85 : 1,
      }}
    >
      <Group justify="space-between">
        <Text fw={600}>{work.display_name}</Text>
        {isXpac && (
          <Badge color="gray" variant="outline">
            xpac
          </Badge>
        )}
      </Group>

      {isXpac && (
        <Alert icon={<IconAlertCircle />} color="yellow" mt="sm">
          This is an xpac work (dataset/software/specimen).
          Metadata quality may be lower than traditional publications.
        </Alert>
      )}

      {/* ... rest of card content ... */}
    </Card>
  );
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
describe('OpenAlexBaseClient - Walden Parameters', () => {
  it('should omit data-version parameter by default (v2)', () => {
    const url = client.buildUrl('/works', {});
    expect(url).not.toContain('data-version');
  });

  it('should include data-version=1 when explicitly requested', () => {
    const url = client.buildUrl('/works', { 'data-version': '1' });
    expect(url).toContain('data-version=1');
  });

  it('should omit data-version=2 (redundant with default)', () => {
    const url = client.buildUrl('/works', { 'data-version': '2' });
    expect(url).not.toContain('data-version');
  });

  it('should include include_xpac=true when requested', () => {
    const url = client.buildUrl('/works', { include_xpac: true });
    expect(url).toContain('include_xpac=true');
  });

  it('should omit include_xpac when false or undefined', () => {
    const url1 = client.buildUrl('/works', { include_xpac: false });
    const url2 = client.buildUrl('/works', {});
    expect(url1).not.toContain('include_xpac');
    expect(url2).not.toContain('include_xpac');
  });
});
```

### 7.2 Integration Tests

```typescript
describe('xpac Works Integration', () => {
  it('should fetch xpac works when includeXpac=true', async () => {
    const store = useSettingsStore.getState();
    store.setIncludeXpac(true);

    const response = await client.getResponse('/works', {
      filter: 'is_xpac:true',
      per_page: 10
    });

    expect(response.results.every(w => w.is_xpac)).toBe(true);
  });

  it('should exclude xpac works when includeXpac=false', async () => {
    const store = useSettingsStore.getState();
    store.setIncludeXpac(false);

    const response = await client.getResponse('/works', {
      sample: 10,
      per_page: 10
    });

    expect(response.results.every(w => !w.is_xpac)).toBe(true);
  });
});
```

### 7.3 E2E Tests (Playwright)

```typescript
test('User can toggle xpac works in settings', async ({ page }) => {
  await page.goto('/settings');

  // Find xpac toggle
  const xpacToggle = page.getByLabel(/include xpac works/i);

  // Verify default state (off)
  await expect(xpacToggle).not.toBeChecked();

  // Enable xpac
  await xpacToggle.check();

  // Navigate to works and verify xpac badge appears
  await page.goto('/works');
  await expect(page.getByText('xpac')).toBeVisible();

  // Disable xpac
  await page.goto('/settings');
  await xpacToggle.uncheck();

  // Verify xpac badge disappears
  await page.goto('/works');
  await expect(page.getByText('xpac')).not.toBeVisible();
});
```

---

## 8. Open Questions

1. **v1 Deprecation Date**: Exact date when `data-version=1` will stop working
   - Spec says "November 2025 only"
   - API currently still accepts v1 (as of 2025-11-14)
   - Need to monitor OpenAlex blog for official announcement

2. **xpac Author Disambiguation Timeline**: When will xpac works receive proper author IDs?
   - Currently: Name strings only
   - Future: Full disambiguation (no timeline provided)
   - Impact: Author-based graph visualization handling

3. **Performance Impact**: How does including 192M xpac works affect query performance?
   - Test with `include_xpac=true` on large result sets
   - Monitor API response times
   - Consider pagination strategy for xpac-heavy queries

4. **xpac Metadata Evolution**: Will xpac metadata quality improve over time?
   - Currently: "Lower quality than core OpenAlex"
   - Future improvements unclear
   - Need to update UI messaging as quality improves

---

## 9. References

### OpenAlex Documentation
- **xpac Overview**: https://docs.openalex.org/how-to-use-the-api/xpac
- **Work Object**: https://docs.openalex.org/api-entities/works/work-object
- **API Overview**: https://docs.openalex.org/how-to-use-the-api/api-overview

### OpenAlex Blog Posts
- **Walden Launch**: https://blog.openalex.org/openalex-rewrite-walden-launch/
- **Walden Rebuild**: https://blog.openalex.org/were-rebuilding-openalex-while-its-running-heres-whats-changing/
- **OREO Tool**: https://oreo.openalex.org/ (requires JavaScript - evaluation dashboard)

### API Testing Results
- **Default Query**: Returns v2 with `is_xpac` field
- **xpac Count**: 192,668,361 works (as of 2025-11-14)
- **v1 Support**: Still functional but deprecated
- **include_xpac**: Opt-in (NOT default)

---

## 10. Conclusion

**Implementation Approach**:

1. **No data-version parameter needed** - v2 is default
2. **Implement include_xpac as opt-in** - user toggle in settings (default: false)
3. **Add is_xpac field to type definitions** - boolean flag on all Work objects
4. **Visual indicators for xpac works** - badges, styling, warnings about metadata quality
5. **Optional v1 support** - temporary feature with deprecation warning (remove December 2025)

**Key Technical Decisions**:
- Omit `data-version` parameter (defaults to v2) ✓
- Only send `include_xpac=true` when user enables it ✓
- Never send `data-version=2` (redundant) ✓
- Never send `include_xpac=false` (redundant) ✓
- Add `is_xpac` boolean field to all Work types ✓
- Persist xpac preference in settings storage ✓

**Timeline**:
- **Now (November 2025)**: Implement xpac support with opt-in toggle
- **Optional**: Add temporary v1 comparison feature (User Story 3)
- **December 2025+**: Remove v1 support entirely

This approach aligns with OpenAlex's API design, minimizes network overhead, and provides clear UX for the xpac expansion feature.
