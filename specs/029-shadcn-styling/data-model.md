# Data Model: shadcn Styling Standardization

**Date**: 2025-11-30
**Phase**: 1 Design & Contracts
**Related**: [spec.md](./spec.md), [research.md](./research.md)

## Domain Entities

### ThemeSystem
Core theming infrastructure that manages UI component styling.

```typescript
interface ThemeSystem {
  id: string
  name: string
  description?: string
  colors: ColorPalette[]
  spacing: SpacingTokens
  typography: TypographyTokens
  borderRadius: BorderRadiusTokens
  darkMode: boolean
  active: boolean
}
```

### ColorPalette
Academic color palettes derived from research theme files.

```typescript
interface ColorPalette {
  id: string
  name: string
  shades: ColorShade[]
  type: 'primary' | 'secondary' | 'accent' | 'neutral' | 'semantic'
  entityMapping?: EntityTypeMapping
}

interface ColorShade {
  level: number // 1-11 corresponding to research theme palettes
  hex: string
  rgb: string
  hsl: string
  name?: string // e.g., "50", "100", "500", "900"
}

interface EntityTypeMapping {
  works: ColorShade
  authors: ColorShade
  sources: ColorShade
  institutions: ColorShade
  publishers: ColorShade
  funders: ColorShade
  topics: ColorShade
  concepts: ColorShade
  keywords: ColorShade
  domains: ColorShade
  fields: ColorShade
  subfields: ColorShade
}
```

### ComponentRecipe
Reusable styling patterns for UI components using enhanced Vanilla Extract recipes.

```typescript
interface ComponentRecipe {
  id: string
  name: string
  category: 'form' | 'layout' | 'feedback' | 'navigation' | 'display' | 'overlay'
  baseStyles: StyleDefinition
  variants: StyleVariant[]
  compoundVariants?: CompoundVariant[]
  defaultVariants: Record<string, string>
  utilities?: SprinkleUsage[] // Optional sprinkles for quick utilities
  dynamicVariants?: DynamicVariant[] // Dynamic props-based variants
}

interface StyleVariant {
  name: string
  styles: StyleDefinition
  conditions?: ResponsiveCondition[] // Responsive breakpoints
}

interface CompoundVariant {
  name: string
  variants: Record<string, string>
  styles: StyleDefinition
  responsive?: ResponsiveCondition[]
}

interface DynamicVariant {
  name: string
  dependency: string // Prop name to watch
  mapping: Record<string, StyleDefinition> // Value to style mapping
}

interface ResponsiveCondition {
  breakpoint: string
  condition: 'min-width' | 'max-width'
  styles: StyleDefinition
}

interface SprinkleUsage {
  utilities: string[] // Sprinkle class names
  scope: 'layout' | 'spacing' | 'typography' | 'effects'
}

interface StyleDefinition {
  [property: string]: string | number | StyleDefinition | StyleCalculation
}

interface StyleCalculation {
  type: 'calc' | 'clamp' | 'min' | 'max'
  expression: string // Mathematical expression using css-utils
}
```

### StylingComponent
UI components that require styling updates.

```typescript
interface StylingComponent {
  id: string
  name: string
  path: string // File path in apps/web/src/
  type: 'atom' | 'molecule' | 'organism' | 'template'
  priority: 'high' | 'medium' | 'low'
  currentStyling: CurrentStylingState
  targetStyling: TargetStylingState
  dependencies: string[] // Other components this depends on
  migrationPhase: number // Which migration phase this belongs to
}

interface CurrentStylingState {
  hasTailwindClasses: boolean
  mantineCssVariables: string[]
  customCss: string[]
  vanillaExtract?: string // Already migrated?
}

interface TargetStylingState {
  recipeName?: string
  themeIntegration: boolean
  academicColorIntegration: boolean
  accessibilityFeatures: AccessibilityFeature[]
}
```

## Validation Rules

### Theme Validation
- Theme colors must meet WCAG 2.1 AA contrast ratios (4.5:1 normal text)
- Academic entity mappings must be consistent across all themes
- Color palettes must include at least 11 shades (from research theme)
- Typography scales must follow modular scale principles
- Spacing tokens must follow 8pt grid system

### Component Validation
- All components must eliminate Tailwind classes
- All components must replace Mantine CSS variables with theme variables
- Components must maintain accessibility (focus states, ARIA labels)
- Interactive states (hover, focus, disabled) must follow consistent patterns
- Bundle size impact must be measured and within constraints

### Performance Validation
- Theme switching must complete in <100ms
- CSS generation must be compile-time (zero runtime overhead)
- Bundle size increase must be <5% from baseline
- Tree-shaking must eliminate unused styles
- Code splitting must separate theme-specific styles

## State Transitions

### Component Migration State Machine

```
[UNMIGRATED] → [ANALYZED] → [PLANNED] → [MIGRATING] → [VALIDATED] → [COMPLETE]
     ↓              ↓           ↓            ↓            ↓
  Tailwind       Recipe     Vanilla     Testing     Final
  Classes       Design     Extract     Coverage     Review
```

### States:
- **UNMIGRATED**: Original component with Tailwind/Mantine CSS variables
- **ANALYZED**: Dependencies and styling requirements identified
- **PLANNED**: Migration approach and recipe design completed
- **MIGRATING**: Vanilla Extract implementation in progress
- **VALIDATED**: Testing completed, performance verified
- **COMPLETE**: Migration finalized, old styling removed

## Relationships

### Entity Relationships

```
ThemeSystem (1) ──── (N) ColorPalette
   │                     ├── (1) EntityTypeMapping
   │                     └── (11) ColorShade

ThemeSystem (1) ──── (N) ComponentRecipe
   │                     ├── (N) StyleVariant
   │                     └── (M) CompoundVariant

ComponentRecipe (N) ──── (1) StylingComponent
   │                     ├── CurrentStylingState
   │                     └── TargetStylingState

StylingComponent (N) ──── (N) StylingComponent [dependencies]
```

### Data Flow

1. **Theme Configuration** → ColorPalette → academic color mappings
2. **Component Analysis** → StylingComponent → migration planning
3. **Recipe Design** → ComponentRecipe → implementation patterns
4. **Migration Execution** → StylingComponent → Vanilla Extract styles
5. **Validation** → Performance metrics → success criteria verification

## Key Constraints

### Functional Constraints
- **FR-001**: Zero Tailwind classes in production code
- **FR-002**: Replace all Mantine CSS variables with Vanilla Extract theme variables
- **FR-003**: Preserve existing hash-based graph visualization colors completely
- **FR-004**: Use research theme's 20 color palettes
- **FR-005**: Fix broken DataState component styling
- **FR-006**: Implement Vanilla Extract recipes for consistency
- **FR-007**: Maintain academic entity color mappings in UI elements
- **FR-008**: Ensure theme switching works consistently across all components
- **FR-009**: Apply proper interactive states following shadcn patterns
- **FR-010**: Bundle size increase under 5% from baseline

### Performance Constraints
- Theme switching: <100ms
- Bundle size increase: <5%
- CSS generation: compile-time only
- Memory usage: minimal overhead
- Build time: reasonable increase

### Technical Constraints
- Must use Mantine v7 + Vanilla Extract
- Must preserve hash-based graph colors
- Must maintain Nx monorepo structure
- Must support TypeScript 5.x strict mode
- Must work with existing Vite build system

## Success Metrics

### Quantitative Metrics
- **SC-001**: 0 Tailwind classes in production (verified by code analysis)
- **SC-002**: 0 Mantine CSS variables in UI components
- **SC-004**: Theme switching <100ms (performance testing)
- **SC-005**: Bundle size increase <5% (bundle analysis)
- **SC-006**: 100% academic entity color consistency
- **SC-007**: Graph colors unchanged (visual comparison)
- **SC-008**: 100% interactive states follow shadcn patterns

### Qualitative Metrics
- **SC-003**: All UI components render without visual artifacts
- Component styling consistency across the application
- Developer experience improvements
- Maintainability of theming system
- Accessibility compliance maintained

## Implementation Notes

### Priority Mapping
- **High Priority**: DataState, buttons, forms, navigation components
- **Medium Priority**: Cards, tables, modals, tooltips
- **Low Priority**: Layout components, utilities, edge cases

### Migration Strategy
1. **Phase 1**: Infrastructure setup (Vanilla Extract config, theme system)
2. **Phase 2**: High-impact components (critical user flows)
3. **Phase 3**: Medium-impact components (enhanced user experience)
4. **Phase 4**: Low-impact components (polish and consistency)

### Risk Mitigation
- **Technical Risk**: Use official Mantine v7 integration
- **Performance Risk**: Compile-time CSS generation with optimization
- **Compatibility Risk**: Phased migration with comprehensive testing
- **Maintainability Risk**: Well-documented patterns and clear separation of concerns