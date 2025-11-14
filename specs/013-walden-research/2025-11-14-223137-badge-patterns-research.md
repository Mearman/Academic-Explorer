# Research: Metadata Improvement Badge Patterns

**Date**: 2025-11-14-223137
**Feature**: 013-walden-research (OpenAlex Walden Support - Data Version 2)
**Context**: FR-011 requires visual indicators (badges) for works with improved metadata from Data Version 2

## Executive Summary

**Decision**: Display persistent informational badges on work detail pages only (not in lists/cards) using Mantine's Badge component with `variant="light"` in green color scheme. Badges appear on initial data fetch when improvements are detected, with no user dismissal (improvements are facts, not notifications).

**Rationale**:
- Reduces visual noise in dense list views while highlighting improvements where users explore work details
- Green variant signals positive enhancement without being alarming
- Persistent badges ensure users always see metadata quality improvements
- No cache comparison needed - detect improvements from v2 metadata presence (referenced_works_count, locations_count)

**Performance Impact**: Minimal - badge rendering is static, no comparison logic needed, no API calls.

---

## 1. Detection Strategy

### How to Detect Improvements

**Approach**: Use absolute field presence/counts from v2 data (NO v1/v2 comparison required)

Data Version 2 improvements are detectable by examining fields that were enhanced:

```typescript
interface MetadataImprovements {
  moreReferences: number | null;      // referenced_works_count (14% avg increase)
  moreLocations: number | null;       // locations_count (14% avg increase)
  improvedLanguage: boolean;          // language field with better detection
  enhancedTopics: boolean;            // topics array (5% coverage gain)
  betterLicense: boolean;             // license field (5% coverage gain)
}

function detectImprovements(work: Work): MetadataImprovements {
  return {
    // Show badge if referenced_works_count exists and > 0
    moreReferences: work.referenced_works_count && work.referenced_works_count > 0
      ? work.referenced_works_count
      : null,

    // Show badge if locations_count > 1 (multiple locations is the 14% improvement)
    moreLocations: work.locations_count && work.locations_count > 1
      ? work.locations_count
      : null,

    // Language field presence indicates improved detection
    improvedLanguage: !!work.language && work.language !== 'en',

    // Topics array presence/length indicates enhancement
    enhancedTopics: !!work.topics && work.topics.length > 0,

    // License field presence indicates better detection
    betterLicense: !!work.license && work.license !== null,
  };
}
```

**No Cache Comparison**: We don't need to compare v1 vs v2 cached data because:
1. All users will be on v2 by default after implementation
2. The improvements are inherent in v2 data structure
3. Comparing cached data adds complexity and potential stale data issues
4. Detection via field presence is more reliable and performant

### When to Trigger Badge Display

**On Data Fetch**: Run detection when work data is loaded in `useRawEntityData` hook

```typescript
// In apps/web/src/hooks/use-raw-entity-data.ts
const query = useQuery({
  queryKey: ["raw-entity", entityType, detectedEntityId, queryParamsKey],
  queryFn: async () => {
    const result = await cachedOpenAlex.getById<OpenAlexEntity>({
      endpoint: entityType,
      id: detectedEntityId,
      params: queryParams,
    });

    // Detect improvements for works
    if (entityType === 'works' && isWork(result)) {
      const improvements = detectImprovements(result);
      // Store in query data for badge display
      return { ...result, _improvements: improvements };
    }

    return result;
  },
  // ... existing config
});
```

**Render Phase**: Display badges when rendering work detail view

```typescript
// In apps/web/src/components/molecules/RichEntityDisplay.tsx
const WorksDisplay = ({ work }: { work: OpenAlexEntity }) => {
  if (!isWork(work)) return null;

  const improvements = work._improvements || detectImprovements(work);

  return (
    <Stack gap="md">
      {/* Improvement Badges Section */}
      {hasAnyImprovements(improvements) && (
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs" mb="sm">
            <ThemeIcon variant="light" size="sm" color="green">
              <IconSparkles size={16} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              Enhanced Metadata (v2)
            </Text>
          </Group>

          <Group gap="xs">
            {improvements.moreReferences && (
              <Badge variant="light" color="green" size="md">
                {improvements.moreReferences} references
              </Badge>
            )}
            {improvements.moreLocations && (
              <Badge variant="light" color="green" size="md">
                {improvements.moreLocations} locations
              </Badge>
            )}
            {improvements.improvedLanguage && (
              <Badge variant="light" color="green" size="md">
                Improved language detection
              </Badge>
            )}
            {improvements.enhancedTopics && (
              <Badge variant="light" color="green" size="md">
                Enhanced topics
              </Badge>
            )}
            {improvements.betterLicense && (
              <Badge variant="light" color="green" size="md">
                License detected
              </Badge>
            )}
          </Group>
        </Card>
      )}

      {/* Existing work display components */}
      {/* ... */}
    </Stack>
  );
};
```

### Performance Impact

**Minimal**:
- Detection runs once per work load (not on every render)
- Simple field presence checks (no heavy computation)
- No API calls required
- No cache lookups or comparisons
- Badge rendering is static HTML (no animations)

**Benchmark**: < 1ms for detection logic per work

---

## 2. Mantine UI Badge Patterns

### Official Badge Component Documentation

**Source**: https://mantine.dev/core/badge/

### Key Features

1. **Variants**: `filled`, `light`, `outline`, `dot`
2. **Sizes**: `xs`, `sm`, `md`, `lg`, `xl`
3. **Colors**: All Mantine theme colors (blue, green, red, yellow, etc.)
4. **Auto Contrast**: Automatic text contrast for `filled` variant
5. **Full Width**: Optional full width mode
6. **Circle**: Optional circular badge with equal width/height
7. **Gradient**: Support for gradient backgrounds

### Best Practices for Informational Badges

```typescript
// Existing pattern in Academic Explorer: EntityTypeBadge
<Badge
  color="violet"        // Entity-specific color
  size="sm"             // Compact size for non-intrusive display
  variant="light"       // Light background, minimal visual weight
>
  Works
</Badge>

// Existing pattern: TagBadge
<Badge
  color="blue"          // Consistent color for tags
  size="sm"             // Compact
  variant="light"       // Low visual weight
  style={{ cursor: "pointer" }}  // Interactive if clickable
>
  machine-learning
</Badge>
```

### Recommended Pattern for Metadata Improvements

```typescript
// Green signifies positive enhancement
// Light variant keeps visual hierarchy
// Medium size for readability without dominance
<Badge
  variant="light"
  color="green"
  size="md"
>
  New: 5 more references
</Badge>

// Alternative: Dot variant for subtle indication
<Badge
  variant="dot"
  color="green"
  size="sm"
>
  Enhanced metadata
</Badge>
```

### Color/Size/Placement Conventions

**Color Scheme**:
- `green`: Positive improvements, enhancements, success
- `blue`: Entity types, informational
- `yellow`: Warnings, attention needed
- `red`: Errors, critical issues
- `gray`: Neutral, secondary information

**Size Guidelines**:
- `xs`: Minimal badges in compact spaces (graph nodes)
- `sm`: Standard badges in lists and cards
- `md`: Prominent badges in detail views (recommended for improvements)
- `lg`/`xl`: Headers and emphasized information

**Placement Best Practices** (from existing codebase):
- Entity type badges: Top-right of cards (see `EntityCard.tsx`)
- Tag badges: Bottom of cards in groups (see `BookmarkListItem.tsx`)
- Metric badges: Inline with descriptive text (see `RichEntityDisplay.tsx`)

---

## 3. Placement Strategy

### Recommended: Work Detail View Only

**Decision**: Display improvement badges ONLY on work detail pages (`/works/W123`)

**Rationale**:
1. **Reduced Visual Noise**: Work lists/cards are already dense with metadata (title, authors, year, citation count)
2. **Detail Context**: Users exploring work details are more interested in metadata quality
3. **Existing Pattern**: Detail views already show enhanced metadata cards (see `RichEntityDisplay.tsx` lines 119-337)
4. **Performance**: Less badge rendering overhead (detail views are 1:1, not 1:many like lists)

### Implementation Locations

#### Work Detail View (PRIMARY)

**File**: `apps/web/src/components/molecules/RichEntityDisplay.tsx`

**Location**: Insert new "Enhanced Metadata" card after `BasicInfoCard` (line 744) and before entity-specific displays

```typescript
<Stack gap="md">
  <BasicInfoCard />

  {/* NEW: Metadata Improvements Card */}
  <MetadataImprovementsCard improvements={improvements} />

  {!isLoading && rawData && (
    <>
      {entity.entityType === "works" && <WorksDisplay work={rawData} />}
      {/* ... */}
    </>
  )}
</Stack>
```

#### Entity Detail Layout (SECONDARY - Optional)

**File**: `apps/web/src/components/entity-detail/EntityDetailLayout.tsx`

**Location**: Could add a compact badge group in header section (line 106-147) near entity type badge

**Recommendation**: Only if header space permits; primary placement in RichEntityDisplay is sufficient

### NOT Recommended: Work Cards in Lists

**Reasons to Avoid**:
1. Visual clutter in search results and catalogue lists
2. Inconsistent badge display (some works have improvements, some don't)
3. Users scanning lists care about title/authors, not metadata quality
4. Badge wrapping issues on mobile viewports

**Exception**: Could add a single summary badge like "Enhanced" as a dot variant if needed later

### Tooltip vs Persistent Badge

**Decision**: Persistent badges (NO tooltips)

**Rationale**:
- **Tooltips**: Require hover (poor mobile UX), hide information by default, add interaction complexity
- **Persistent Badges**: Always visible, clear information, no interaction required, better accessibility

**Tooltip Use Case** (if needed later): Detailed breakdown on hover over a summary badge

```typescript
<Tooltip
  label={
    <Stack gap={4}>
      <Text size="xs">14% more references detected</Text>
      <Text size="xs">14% more locations found</Text>
      <Text size="xs">Improved language detection</Text>
    </Stack>
  }
  position="bottom"
>
  <Badge variant="dot" color="green" size="sm">
    Enhanced metadata
  </Badge>
</Tooltip>
```

**Current Decision**: Use persistent badges without tooltips for v1 implementation

### User Preference to Hide/Show Badges

**Decision**: NO user preference initially

**Rationale**:
1. **Factual Information**: Metadata improvements are objective facts, not user preferences
2. **Minimal Noise**: Badges only shown on detail views (not lists), already low visual impact
3. **YAGNI Principle**: Add preference only if users request it after launch
4. **Settings Complexity**: Avoid adding another toggle to settings panel

**Future Consideration**: If users find badges distracting, add a settings toggle:
```typescript
interface SettingsState {
  // ... existing fields
  showMetadataImprovementBadges: boolean; // default: true
}
```

---

## 4. Badge Content

### Recommended Badge Text

#### Specific Improvements (Preferred)

```typescript
// Show exact counts when available
<Badge variant="light" color="green" size="md">
  {work.referenced_works_count} references
</Badge>

<Badge variant="light" color="green" size="md">
  {work.locations_count} locations
</Badge>

// Boolean improvements
<Badge variant="light" color="green" size="md">
  Language detected: {work.language}
</Badge>

<Badge variant="light" color="green" size="md">
  {work.topics.length} topics
</Badge>

<Badge variant="light" color="green" size="md">
  License: {work.license}
</Badge>
```

**Advantages**:
- Specific, actionable information
- Users understand what improved
- No ambiguity about "enhanced" meaning

#### Generic Summary Badge (Alternative)

```typescript
<Badge variant="dot" color="green" size="sm">
  Enhanced metadata
</Badge>
```

**Advantages**:
- Compact, minimal space
- Suitable for list views if needed later
- Less visual noise

**Disadvantages**:
- Vague - users don't know what improved
- Requires tooltip or click to see details

### Multiple Badges vs Single Badge

**Decision**: Multiple specific badges grouped together

**Rationale**:
1. **Information Clarity**: Users see exactly what improved at a glance
2. **Existing Pattern**: Academic Explorer already uses badge groups (see `BookmarkListItem.tsx` tags, `EntityCard.tsx` metadata)
3. **Scanability**: Users can quickly identify relevant improvements
4. **Accessibility**: Screen readers announce each badge separately

**Implementation**:
```typescript
<Group gap="xs">
  {improvements.moreReferences && (
    <Badge variant="light" color="green" size="md">
      {improvements.moreReferences} references
    </Badge>
  )}
  {improvements.moreLocations && (
    <Badge variant="light" color="green" size="md">
      {improvements.moreLocations} locations
    </Badge>
  )}
  {/* ... other improvement badges */}
</Group>
```

**Alternative**: Single summary badge with tooltip (use if space is constrained)

### When to Hide Badges

**Decision**: Never hide badges after display (persistent)

**Rationale**:
1. **Not Notifications**: Improvements are permanent work attributes, not transient notifications
2. **User Value**: Always inform users about metadata quality
3. **No State Management**: Avoids tracking "badge dismissed" state per work
4. **Consistent UX**: Badges appear every time user views work details

**Exception**: Badges automatically don't appear if no improvements detected (no fields to display)

**User Acknowledgment**: Not required - improvements are facts, not alerts

---

## 5. Alternatives Considered

### Alternative 1: Tooltip on Hover

**Approach**: Show badge on hover over work title or metadata icon

**Pros**:
- Minimal visual clutter
- On-demand information
- Keeps UI clean

**Cons**:
- Poor mobile UX (no hover on touch devices)
- Hidden information (users may not discover)
- Requires additional interaction (violates accessibility guidelines)
- Not discoverable for keyboard navigation

**Verdict**: REJECTED - Accessibility and mobile UX concerns

### Alternative 2: Inline Text

**Approach**: Add text like "Enhanced: 5 references" inline with reference count

**Pros**:
- Integrated with existing metadata display
- No new UI components needed
- Clear context

**Cons**:
- Text-heavy, harder to scan
- Inconsistent with Academic Explorer's badge-based design system
- Breaks visual hierarchy (badges are standard pattern)
- Harder to style consistently

**Verdict**: REJECTED - Inconsistent with design system

### Alternative 3: Icon Indicators

**Approach**: Add sparkle/star icon next to improved fields

**Pros**:
- Minimal space usage
- Subtle indication
- Universal icon language

**Cons**:
- Ambiguous meaning without text
- Requires tooltip to explain (back to mobile UX issue)
- Icon alone doesn't convey specific improvement
- Less accessible (screen readers need text)

**Verdict**: REJECTED - Insufficient information, accessibility issues

### Alternative 4: Comparison View

**Approach**: Show v1 vs v2 side-by-side comparison

**Pros**:
- Educational for users
- Shows exact differences
- Validates migration impact

**Cons**:
- Requires caching v1 data (memory overhead)
- Complex UI (two columns, synchronization)
- Only useful during November transition
- Not scalable (90% of users won't care after December)

**Verdict**: REJECTED - Over-engineered for temporary need (FR-006 handles v1 comparison via settings toggle, not badges)

---

## 6. Badge Design Specification

### Component Configuration

```typescript
import { Badge, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";

interface MetadataImprovementsBadgeProps {
  improvements: MetadataImprovements;
}

export function MetadataImprovementsBadge({
  improvements
}: MetadataImprovementsBadgeProps) {
  // Don't render if no improvements
  if (!hasAnyImprovements(improvements)) {
    return null;
  }

  return (
    <Card padding="md" radius="md" withBorder>
      <Group gap="xs" mb="sm">
        <ThemeIcon variant="light" size="sm" color="green">
          <IconSparkles size={16} />
        </ThemeIcon>
        <Text size="sm" fw={600}>
          Enhanced Metadata (Data Version 2)
        </Text>
      </Group>

      <Group gap="xs">
        {improvements.moreReferences && (
          <Badge
            variant="light"
            color="green"
            size="md"
            data-testid="improvement-badge-references"
          >
            {improvements.moreReferences} references
          </Badge>
        )}

        {improvements.moreLocations && (
          <Badge
            variant="light"
            color="green"
            size="md"
            data-testid="improvement-badge-locations"
          >
            {improvements.moreLocations} locations
          </Badge>
        )}

        {improvements.improvedLanguage && (
          <Badge
            variant="light"
            color="green"
            size="md"
            data-testid="improvement-badge-language"
          >
            Language detected
          </Badge>
        )}

        {improvements.enhancedTopics && (
          <Badge
            variant="light"
            color="green"
            size="md"
            data-testid="improvement-badge-topics"
          >
            Enhanced topics
          </Badge>
        )}

        {improvements.betterLicense && (
          <Badge
            variant="light"
            color="green"
            size="md"
            data-testid="improvement-badge-license"
          >
            License detected
          </Badge>
        )}
      </Group>
    </Card>
  );
}

function hasAnyImprovements(improvements: MetadataImprovements): boolean {
  return !!(
    improvements.moreReferences ||
    improvements.moreLocations ||
    improvements.improvedLanguage ||
    improvements.enhancedTopics ||
    improvements.betterLicense
  );
}
```

### Visual Specifications

**Colors**:
- Primary: `green` (Mantine theme color)
- Light variant background: `var(--mantine-color-green-0)`
- Text color: `var(--mantine-color-green-7)`

**Spacing**:
- Card padding: `md` (16px)
- Gap between badges: `xs` (8px)
- Margin below header: `sm` (12px)

**Typography**:
- Header text: `size="sm"` (14px), `fw={600}` (semibold)
- Badge text: Default Mantine Badge font size for `md` (14px)

**Border**:
- Card border: `withBorder` (uses theme border color)
- Border radius: `md` (8px)

---

## 7. Code Examples

### Detection Logic

**File**: `apps/web/src/utils/metadata-improvements.ts` (NEW)

```typescript
import type { Work } from "@academic-explorer/types";

export interface MetadataImprovements {
  moreReferences: number | null;
  moreLocations: number | null;
  improvedLanguage: boolean;
  enhancedTopics: boolean;
  betterLicense: boolean;
}

/**
 * Detect metadata improvements in Data Version 2 works
 *
 * @param work - OpenAlex work entity
 * @returns Object containing detected improvements
 */
export function detectMetadataImprovements(work: Work): MetadataImprovements {
  return {
    // Show referenced works count if present and > 0
    moreReferences:
      work.referenced_works_count && work.referenced_works_count > 0
        ? work.referenced_works_count
        : null,

    // Show locations count if > 1 (multiple locations = improvement)
    moreLocations:
      work.locations_count && work.locations_count > 1
        ? work.locations_count
        : null,

    // Non-English language detection is a v2 improvement
    improvedLanguage: !!work.language && work.language !== 'en',

    // Topics array presence indicates v2 enhancement (5% coverage gain)
    enhancedTopics: !!work.topics && work.topics.length > 0,

    // License detection is a v2 improvement (5% coverage gain)
    betterLicense: !!work.license && work.license !== null,
  };
}

/**
 * Check if any improvements are present
 *
 * @param improvements - MetadataImprovements object
 * @returns true if any improvement detected
 */
export function hasAnyImprovements(improvements: MetadataImprovements): boolean {
  return !!(
    improvements.moreReferences ||
    improvements.moreLocations ||
    improvements.improvedLanguage ||
    improvements.enhancedTopics ||
    improvements.betterLicense
  );
}
```

### Badge Component

**File**: `packages/ui/src/components/MetadataImprovementBadge.tsx` (NEW)

```typescript
import { Badge, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { MetadataImprovements } from "./types";

export interface MetadataImprovementBadgeProps {
  /**
   * Detected metadata improvements
   */
  improvements: MetadataImprovements;

  /**
   * Optional test ID for E2E testing
   */
  "data-testid"?: string;
}

/**
 * Display badge group showing metadata improvements from Data Version 2
 *
 * Features:
 * - Shows specific improvement counts (references, locations)
 * - Indicates boolean improvements (language, topics, license)
 * - Green color scheme for positive enhancements
 * - Responsive badge wrapping
 *
 * @example
 * ```tsx
 * const improvements = detectMetadataImprovements(work);
 * <MetadataImprovementBadge improvements={improvements} />
 * ```
 */
export function MetadataImprovementBadge({
  improvements,
  "data-testid": dataTestId = "metadata-improvements",
}: MetadataImprovementBadgeProps) {
  // Don't render if no improvements detected
  if (!hasAnyImprovements(improvements)) {
    return null;
  }

  return (
    <Card
      padding="md"
      radius="md"
      withBorder
      data-testid={dataTestId}
    >
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon variant="light" size="sm" color="green">
            <IconSparkles size={16} />
          </ThemeIcon>
          <Text size="sm" fw={600}>
            Enhanced Metadata (Data Version 2)
          </Text>
        </Group>

        <Group gap="xs" wrap="wrap">
          {improvements.moreReferences && (
            <Badge
              variant="light"
              color="green"
              size="md"
              data-testid={`${dataTestId}-references`}
            >
              {improvements.moreReferences} references
            </Badge>
          )}

          {improvements.moreLocations && (
            <Badge
              variant="light"
              color="green"
              size="md"
              data-testid={`${dataTestId}-locations`}
            >
              {improvements.moreLocations} locations
            </Badge>
          )}

          {improvements.improvedLanguage && (
            <Badge
              variant="light"
              color="green"
              size="md"
              data-testid={`${dataTestId}-language`}
            >
              Language detected
            </Badge>
          )}

          {improvements.enhancedTopics && (
            <Badge
              variant="light"
              color="green"
              size="md"
              data-testid={`${dataTestId}-topics`}
            >
              Enhanced topics
            </Badge>
          )}

          {improvements.betterLicense && (
            <Badge
              variant="light"
              color="green"
              size="md"
              data-testid={`${dataTestId}-license`}
            >
              License detected
            </Badge>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

function hasAnyImprovements(improvements: MetadataImprovements): boolean {
  return !!(
    improvements.moreReferences ||
    improvements.moreLocations ||
    improvements.improvedLanguage ||
    improvements.enhancedTopics ||
    improvements.betterLicense
  );
}
```

### Integration in RichEntityDisplay

**File**: `apps/web/src/components/molecules/RichEntityDisplay.tsx` (MODIFY)

```typescript
// Add import
import { detectMetadataImprovements } from "@/utils/metadata-improvements";
import { MetadataImprovementBadge } from "@academic-explorer/ui";

export const RichEntityDisplay: React.FC<RichEntityDisplayProps> = ({
  entity,
}) => {
  // ... existing hooks

  // Detect metadata improvements for works
  const improvements = useMemo(() => {
    if (rawData && isWork(rawData)) {
      return detectMetadataImprovements(rawData);
    }
    return null;
  }, [rawData]);

  return (
    <Stack gap="md">
      <BasicInfoCard />

      {/* NEW: Metadata Improvements Badge */}
      {improvements && (
        <MetadataImprovementBadge improvements={improvements} />
      )}

      {!isLoading && rawData && (
        <>
          {entity.entityType === "works" && <WorksDisplay work={rawData} />}
          {entity.entityType === "authors" && <AuthorsDisplay author={rawData} />}
          {entity.entityType === "institutions" && <InstitutionsDisplay institution={rawData} />}
        </>
      )}

      {isLoading && (
        <Card padding="md" radius="md" withBorder>
          <Group gap="xs">
            <IconClock size={16} />
            <Text size="sm" c="dimmed">
              Loading detailed information...
            </Text>
          </Group>
        </Card>
      )}
    </Stack>
  );
};
```

### Unit Test Example

**File**: `packages/ui/src/components/MetadataImprovementBadge.test.tsx` (NEW)

```typescript
import { render, screen } from "@testing-library/react";
import { MetadataImprovementBadge } from "./MetadataImprovementBadge";
import type { MetadataImprovements } from "./types";

describe("MetadataImprovementBadge", () => {
  it("renders nothing when no improvements detected", () => {
    const improvements: MetadataImprovements = {
      moreReferences: null,
      moreLocations: null,
      improvedLanguage: false,
      enhancedTopics: false,
      betterLicense: false,
    };

    const { container } = render(
      <MetadataImprovementBadge improvements={improvements} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders references badge when count > 0", () => {
    const improvements: MetadataImprovements = {
      moreReferences: 42,
      moreLocations: null,
      improvedLanguage: false,
      enhancedTopics: false,
      betterLicense: false,
    };

    render(<MetadataImprovementBadge improvements={improvements} />);

    expect(screen.getByText("42 references")).toBeInTheDocument();
    expect(screen.getByTestId("metadata-improvements-references")).toBeInTheDocument();
  });

  it("renders multiple improvement badges", () => {
    const improvements: MetadataImprovements = {
      moreReferences: 15,
      moreLocations: 3,
      improvedLanguage: true,
      enhancedTopics: false,
      betterLicense: false,
    };

    render(<MetadataImprovementBadge improvements={improvements} />);

    expect(screen.getByText("15 references")).toBeInTheDocument();
    expect(screen.getByText("3 locations")).toBeInTheDocument();
    expect(screen.getByText("Language detected")).toBeInTheDocument();
  });

  it("includes header with sparkle icon", () => {
    const improvements: MetadataImprovements = {
      moreReferences: 10,
      moreLocations: null,
      improvedLanguage: false,
      enhancedTopics: false,
      betterLicense: false,
    };

    render(<MetadataImprovementBadge improvements={improvements} />);

    expect(screen.getByText("Enhanced Metadata (Data Version 2)")).toBeInTheDocument();
  });
});
```

---

## 8. Implementation Checklist

### Phase 1: Types and Utilities

- [ ] Create `MetadataImprovements` interface in `packages/types/src/metadata.ts`
- [ ] Implement `detectMetadataImprovements()` in `apps/web/src/utils/metadata-improvements.ts`
- [ ] Implement `hasAnyImprovements()` helper function
- [ ] Write unit tests for detection logic

### Phase 2: UI Component

- [ ] Create `MetadataImprovementBadge.tsx` in `packages/ui/src/components/`
- [ ] Export component from `packages/ui/src/index.ts`
- [ ] Write component tests (rendering, conditional display, accessibility)
- [ ] Test badge wrapping behavior on narrow viewports

### Phase 3: Integration

- [ ] Modify `RichEntityDisplay.tsx` to detect improvements
- [ ] Add `MetadataImprovementBadge` to work detail view
- [ ] Verify badge placement in visual hierarchy
- [ ] Test on real Data Version 2 work entities

### Phase 4: Testing

- [ ] Write E2E tests for badge display on work details page
- [ ] Verify badges don't appear when no improvements detected
- [ ] Test multiple badge combinations
- [ ] Accessibility audit (screen reader announcements, keyboard navigation)

### Phase 5: Documentation

- [ ] Update `README.md` with badge feature description
- [ ] Add badge screenshots to documentation
- [ ] Document badge customization options (if any)
- [ ] Update user guide with metadata improvement information

---

## 9. Open Questions

1. **Should badges show relative improvements ("+5 more") or absolute counts ("5 references")?**
   - **Recommendation**: Absolute counts (simpler, no v1 comparison needed)

2. **Should there be a "Learn More" link explaining Data Version 2 improvements?**
   - **Recommendation**: Add link to OpenAlex blog post in card header tooltip

3. **Should badges be collapsible/expandable?**
   - **Recommendation**: No - keep simple and always visible

4. **Should improvement detection be cached to avoid recalculating?**
   - **Recommendation**: Use `useMemo` hook to cache per component render

5. **Should badges appear in graph node tooltips?**
   - **Recommendation**: Not initially - focus on detail views first

---

## 10. Success Metrics

**Functional**:
- [ ] Badges display accurately for 100% of works with improvements
- [ ] No false positives (badges only when improvements exist)
- [ ] Badge rendering adds < 10ms to page load time

**User Experience**:
- [ ] Badges are readable on mobile devices (320px width)
- [ ] Badges pass WCAG 2.1 AA color contrast requirements
- [ ] Screen readers announce badge content correctly

**Performance**:
- [ ] Detection logic executes in < 1ms per work
- [ ] No additional API calls required
- [ ] Memory footprint increase < 100KB for typical session

---

## 11. Related Requirements

- **FR-011**: System MUST display visual indicators (badges) for works with improved metadata from Data Version 2
- **FR-008**: System MUST handle works with improved metadata gracefully
- **SC-004**: Visual indicators appear within 500ms of page load
- **NFR-005**: Maintain WCAG 2.1 AA accessibility compliance

---

## 12. Next Steps

1. **Proceed with implementation** using this research as specification
2. **Create tasks** in `specs/013-walden-research/tasks.md` for each phase
3. **Begin with Phase 1** (types and utilities) following test-first development
4. **Review badge design** with stakeholders before full integration
5. **Iterate based on E2E test findings** and real Data Version 2 work entities

---

**Research Complete**: Ready for implementation planning in `tasks.md`
