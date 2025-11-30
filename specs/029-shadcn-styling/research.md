# Research Findings: shadcn Styling Standardization

**Research Date**: 2025-11-30
**Feature**: 029-shadcn-styling
**Status**: Complete - Critical findings that impact implementation approach

## Decision: Use Official Mantine v7 Vanilla Extract Integration

**Decision**: Replace mantine-theme-builder approach with official Mantine v7 Vanilla Extract integration

**Rationale**:
- mantine-theme-builder is archived (Dec 18, 2024) and no longer maintained
- Mantine v7 has native Vanilla Extract support with comprehensive documentation
- Official integration ensures long-term maintainability and community support
- Provides proven migration path from CSS variables to Vanilla Extract

**Alternatives Considered**:
1. Use archived mantine-theme-builder - REJECTED (no maintenance, security risk)
2. Build custom Vanilla Extract + Mantine integration - REJECTED (high complexity, maintenance burden)
3. Use official Mantine v7 integration - SELECTED (supported, documented, migration-friendly)

## Key Technical Findings

### Vanilla Extract + React 19 Integration

**Decision**: Adopt Vanilla Extract with Vite configuration for optimal performance

**Rationale**: Vanilla Extract provides:
- Zero runtime CSS generation (compile-time)
- Type-safe CSS with TypeScript 5.x
- Tree-shakable styles (reduces bundle size)
- Excellent performance characteristics

**Implementation Pattern**:
```typescript
// vite.config.ts
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

export default defineConfig({
  plugins: [
    vanillaExtractPlugin({
      identifiers: process.env.NODE_ENV === 'development' ? 'debug' : 'short'
    })
  ]
})
```

### Theme System Architecture

**Decision**: Use Mantine v7's official theming with shadcn-inspired design tokens

**Rationale**:
- Mantine v7 natively supports Vanilla Extract themes
- Maintains compatibility with existing Mantine components
- Provides migration path from current CSS variables
- Supports dark/light mode switching

**Theme Structure**:
```typescript
export const bibgraphTheme = createTheme({
  colors: {
    brand: ['#1e40af', '#1d4ed8', '#2563eb'], // Academic blue
    academic: ['#059669', '#047857', '#065f46'], // Academic green
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: 8,
})
```

### Component Styling Patterns

**Decision**: Use Vanilla Extract recipes for consistent component styling

**Rationale**:
- Recipes provide variant-based styling (size, variant, state)
- Type-safe props integration with TypeScript
- Reusable patterns across components
- Testable styling system

**Recipe Pattern**:
```typescript
export const buttonRecipe = recipe({
  base: { /* base styles */ },
  variants: {
    size: { small, medium, large },
    variant: { primary, secondary, academic }
  }
})
```

### Performance Optimization Strategy

**Decision**: Compile-time CSS generation with optimized bundle splitting

**Rationale**:
- Meets <100ms theme switching requirement
- Supports <5% bundle size increase constraint
- Vanilla Extract's build-time generation is optimal
- Code splitting for theme-specific styles

**Performance Techniques**:
- Compile-time CSS generation (zero runtime overhead)
- Theme-specific code splitting
- Tree-shaking for unused styles
- Optimized CSS variable usage

### Migration Approach

**Decision**: Phased migration from current Tailwind/Mantine CSS variables

**Rationale**:
- Minimizes disruption to existing functionality
- Allows incremental testing and validation
- Preserves hash-based graph colors (FR-003 requirement)
- Enables atomic commits per component

**Migration Phases**:
1. Setup Vanilla Extract configuration with ecosystem packages
2. Create theme system with academic color palettes
3. Implement enhanced recipes using @vanilla-extract/recipes
4. Add sprinkles for layout and spacing utilities
5. Set up dynamic theming with @vanilla-extract/dynamic
6. Migrate high-impact components (DataState, buttons, cards)
7. Eliminate Tailwind classes systematically
8. Replace Mantine CSS variables with theme variables

## Constraints and Requirements Compliance

### ✅ Hash-Based Color Preservation (FR-003)
**Finding**: Existing hash-based graph colors are completely unaffected by theming changes
**Implementation**: Keep graph visualization styling separate from UI component theming

### ✅ Academic Color Palettes Integration
**Finding**: Research theme files contain 20 color palettes that can be integrated into Mantine theme
**Implementation**: Map research color palettes to Mantine theme color tokens

### ✅ Performance Targets
**Finding**: Vanilla Extract architecture supports <100ms theme switching and <5% bundle increase
**Implementation**: Compile-time CSS generation with optimized bundling

### ✅ Bundle Size Constraints
**Finding**: Tree-shaking and code splitting enable minimal bundle impact
**Implementation**: Theme-specific bundles and unused style elimination

## Implementation Blueprint

### Core Technologies
- **Primary**: Mantine v7 + Vanilla Extract + TypeScript 5.x
- **Build**: Vite + Nx monorepo structure
- **Testing**: Vitest + React Testing Library + Playwright
- **Bundle**: Optimized code splitting for theme styles

### File Structure
```
apps/web/src/
├── styles/
│   ├── theme.css.ts           # Mantine theme definition
│   ├── vars.css.ts           # Global CSS variables
│   └── recipes/              # Component styling recipes
├── components/
│   └── [migrated components]  # Updated with Vanilla Extract styling
packages/ui/src/
├── styles/                  # Shared styling utilities
└── recipes/                # Reusable component recipes
```

### Migration Priority
1. **Phase 1**: Setup and infrastructure (Vanilla Extract config, theme system)
2. **Phase 2**: High-impact components (DataState, buttons, cards, inputs)
3. **Phase 3**: Remaining UI components (systematic migration)
4. **Phase 4**: Cleanup (remove Tailwind, eliminate CSS variables)

## Risk Mitigation

### Technology Risk: Archived Dependency
**Mitigation**: Use official Mantine v7 integration instead of mantine-theme-builder

### Performance Risk: Bundle Size Increase
**Mitigation**: Vanilla Extract compile-time generation + code splitting

### Compatibility Risk: Component Breakage
**Mitigation**: Phased migration with atomic commits and comprehensive testing

### Maintenance Risk: Complex Theming System
**Mitigation**: Use well-documented official patterns and maintain clear separation between UI styling and graph visualization

## Success Metrics

- **Zero Tailwind classes**: Verified by code analysis
- **Zero Mantine CSS variables**: Replaced with theme variables
- **Theme switching <100ms**: Measured performance testing
- **Bundle size increase <5%**: Bundle analysis tools
- **100% component consistency**: Visual testing across themes
- **Hash colors preserved**: Graph visualization unchanged

This research provides the foundation for implementing shadcn-inspired theming for Mantine using official, maintained technologies while meeting all specified requirements and constraints.