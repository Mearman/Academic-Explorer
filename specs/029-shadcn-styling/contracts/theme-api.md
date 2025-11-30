# Theme API Contract

**Version**: 1.0.0
**Date**: 2025-11-30
**Type**: Internal API Contract

## Overview

Contract for the shadcn-inspired theming system using Mantine v7 + Vanilla Extract. Defines the interfaces for theme management, component styling, and migration operations.

## Core Types

```typescript
// Theme Configuration
export interface ThemeConfig {
  colors: ColorTokens
  spacing: SpacingTokens
  typography: TypographyTokens
  borderRadius: BorderRadiusTokens
  shadows: ShadowTokens
  transitions: TransitionTokens
}

export interface ColorTokens {
  brand: ColorPalette
  academic: AcademicColors
  semantic: SemanticColors
  neutral: NeutralColors
}

export interface AcademicColors {
  works: string      // Blue palette
  authors: string    // Green palette
  sources: string    // Violet palette
  institutions: string // Orange palette
  publishers: string // Red palette
  funders: string    // Yellow palette
  topics: string     // Pink palette
  concepts: string   // Purple palette
  keywords: string   // Teal palette
  domains: string    // Cyan palette
  fields: string     // Indigo palette
  subfields: string  // Rose palette
}

// Component Recipe Interface
export interface ComponentRecipe {
  base: StyleDefinition
  variants: VariantDefinition[]
  compoundVariants?: CompoundVariantDefinition[]
  defaultVariants?: Record<string, string>
}

export interface VariantDefinition {
  [variantName: string]: {
    [variantValue: string]: StyleDefinition
  }
}

export interface CompoundVariantDefinition {
  variants: Record<string, string>
  styles: StyleDefinition
}

export interface StyleDefinition {
  [property: string]: string | number | StyleDefinition
}
```

## Theme Management API

### Theme Creation

```typescript
export interface ThemeCreationRequest {
  name: string
  colorPalettes: ColorPaletteDefinition[]
  typographyScale: TypographyScale
  spacingSystem: SpacingSystem
  borderRadiusSystem: BorderRadiusSystem
  isDarkMode?: boolean
}

export interface ColorPaletteDefinition {
  type: 'brand' | 'academic' | 'semantic' | 'neutral'
  shades: ColorShadeDefinition[]
  entityMapping?: Partial<AcademicColors>
}

export interface ColorShadeDefinition {
  level: number  // 1-11 from research theme
  hex: string
  name?: string   // e.g., "50", "100", "500", "900"
}

export interface ThemeCreationResponse {
  theme: MantineTheme
  cssVariables: Record<string, string>
  bundleSize: {
    css: number
    js: number
    total: number
  }
  performanceMetrics: {
    themeSwitchTime: number
    cssGenerationTime: number
  }
}
```

### Theme Application

```typescript
export interface ThemeApplicationRequest {
  themeId: string
  targetComponents?: string[]  // Component paths to apply
  force?: boolean              // Force reapplication
}

export interface ThemeApplicationResponse {
  appliedComponents: string[]
  errors: ThemeApplicationError[]
  performanceMetrics: {
    applicationTime: number
    affectedElements: number
  }
}

export interface ThemeApplicationError {
  component: string
  error: string
  severity: 'warning' | 'error' | 'critical'
}
```

## Component Migration API

### Migration Analysis

```typescript
export interface MigrationAnalysisRequest {
  componentPaths: string[]
  includeDependencies?: boolean
  analysisDepth: 'shallow' | 'deep'
}

export interface MigrationAnalysisResponse {
  components: ComponentAnalysis[]
  summary: MigrationSummary
  recommendations: string[]
}

export interface ComponentAnalysis {
  path: string
  name: string
  currentStyling: CurrentStylingAnalysis
  migrationComplexity: 'low' | 'medium' | 'high'
  estimatedEffort: number  // hours
  dependencies: string[]
  risks: string[]
}

export interface CurrentStylingAnalysis {
  tailwindClasses: TailwindClass[]
  mantineVariables: MantineVariable[]
  customCss: CustomCssUsage[]
  inlineStyles: InlineStyleUsage[]
}

export interface TailwindClass {
  className: string
  usageCount: number
  category: 'layout' | 'typography' | 'colors' | 'spacing' | 'effects'
  vanillaExtractEquivalent?: string
}

export interface MantineVariable {
  variable: string
  usageCount: number
  category: 'color' | 'spacing' | 'typography' | 'border'
  themeToken?: string
}
```

### Migration Execution

```typescript
export interface MigrationExecutionRequest {
  componentPath: string
  targetRecipe?: string
  preserveCustomizations?: boolean
  generateTests?: boolean
}

export interface MigrationExecutionResponse {
  success: boolean
  componentPath: string
  changes: FileChange[]
  testsGenerated: TestGeneration[]
  validationResults: ValidationResult[]
  performance: MigrationPerformance
}

export interface FileChange {
  path: string
  type: 'create' | 'update' | 'delete'
  content: string
  backup: string
}

export interface TestGeneration {
  testName: string
  filePath: string
  testType: 'unit' | 'component' | 'visual'
  coverage: {
    styling: number
    variants: number
    states: number
  }
}

export interface ValidationResult {
  category: 'syntax' | 'accessibility' | 'performance' | 'consistency'
  status: 'pass' | 'warn' | 'fail'
  message: string
  suggestions: string[]
}

export interface MigrationPerformance {
  migrationTime: number
  testGenerationTime: number
  bundleImpact: BundleImpact
}
```

## Component Recipe API

### Recipe Creation

```typescript
export interface RecipeCreationRequest {
  name: string
  category: ComponentCategory
  baseStyles: StyleDefinition
  variants: VariantDefinition[]
  compoundVariants?: CompoundVariantDefinition[]
  defaultVariants?: Record<string, string>
  accessibilityFeatures?: AccessibilityFeature[]
}

export type ComponentCategory =
  | 'form'
  | 'layout'
  | 'feedback'
  | 'navigation'
  | 'display'
  | 'overlay'

export interface AccessibilityFeature {
  type: 'focus' | 'keyboard' | 'screen-reader' | 'color-contrast'
  implementation: StyleDefinition
  description: string
}

export interface RecipeCreationResponse {
  recipe: ComponentRecipe
  cssClass: string
  typescriptTypes: string
  documentation: RecipeDocumentation
  testExamples: RecipeTestExample[]
}

export interface RecipeDocumentation {
  description: string
  usage: string
  variants: VariantDocumentation[]
  accessibility: AccessibilityDocumentation[]
}

export interface VariantDocumentation {
  name: string
  description: string
  props: string[]
  example: string
}

export interface AccessibilityDocumentation {
  feature: string
  implementation: string
  testing: string
}
```

### Recipe Application

```typescript
export interface RecipeApplicationRequest {
  componentPath: string
  recipeName: string
  variantOverrides?: Record<string, string>
  customizations?: StyleDefinition[]
}

export interface RecipeApplicationResponse {
  success: boolean
  appliedClasses: string[]
  generatedTypescript: string
  validationResults: ValidationResult[]
  bundleImpact: BundleImpact
}
```

## Performance Monitoring API

### Bundle Analysis

```typescript
export interface BundleAnalysisRequest {
  analyzeBaseline?: boolean
  includeThemeSeparation?: boolean
}

export interface BundleAnalysisResponse {
  baseline: BundleMetrics
  current: BundleMetrics
  themeSeparation: ThemeBundleAnalysis
  recommendations: OptimizationRecommendation[]
}

export interface BundleMetrics {
  totalSize: number
  jsSize: number
  cssSize: number
  gzippedSize: number
  chunkCount: number
  unusedStyles: number
}

export interface ThemeBundleAnalysis {
  themeSpecificChunks: number
  sharedStylesSize: number
  themeSwitchingOverhead: number
  treeShakingEffectiveness: number
}

export interface OptimizationRecommendation {
  type: 'treeshaking' | 'splitting' | 'compression' | 'caching'
  impact: 'high' | 'medium' | 'low'
  description: string
  implementation: string
  estimatedSavings: number
}
```

### Theme Performance

```typescript
export interface PerformanceTestRequest {
  testScenarios: ThemeTestScenario[]
  iterations?: number
  warmupRounds?: number
}

export interface ThemeTestScenario {
  name: string
  fromTheme: string
  toTheme: string
  componentPaths?: string[]
}

export interface PerformanceTestResponse {
  results: PerformanceTestResult[]
  summary: PerformanceSummary
  recommendations: string[]
}

export interface PerformanceTestResult {
  scenario: string
  metrics: {
    averageTime: number
    minTime: number
    maxTime: number
    p95: number
    p99: number
  }
  affectedElements: number
  paintMetrics: PaintMetrics
}

export interface PaintMetrics {
  firstPaint: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
}

export interface PerformanceSummary {
  averageThemeSwitchTime: number
  slowestScenario: string
  recommendedOptimizations: string[]
}
```

## Error Handling

### Error Types

```typescript
export enum ThemeErrorType {
  VALIDATION_ERROR = 'validation_error',
  MIGRATION_ERROR = 'migration_error',
  PERFORMANCE_ERROR = 'performance_error',
  CONFIGURATION_ERROR = 'configuration_error',
  DEPENDENCY_ERROR = 'dependency_error',
  BUNDLE_ERROR = 'bundle_error'
}

export interface ThemeError {
  type: ThemeErrorType
  code: string
  message: string
  details?: Record<string, any>
  stack?: string
  timestamp: string
  component?: string
}

export interface ErrorResponse {
  success: false
  error: ThemeError
  requestId: string
  timestamp: string
}
```

### Error Recovery

```typescript
export interface ErrorRecoveryRequest {
  error: ThemeError
  autoRecover?: boolean
  preserveState?: boolean
}

export interface ErrorRecoveryResponse {
  success: boolean
  recoveryApplied: string
  remainingIssues: string[]
  rollbackAvailable: boolean
  nextSteps: string[]
}
```

## Response Format

All API responses follow this structure:

```typescript
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ThemeError
  metadata: {
    requestId: string
    timestamp: string
    processingTime: number
    version: string
  }
}
```

## Versioning

- **Major Version**: Breaking changes to API contracts
- **Minor Version**: New features or optional parameters
- **Patch Version**: Bug fixes and documentation updates

Current version: **1.0.0**

## Security Considerations

- All theme configuration must be validated before application
- File system operations limited to allowed directories
- Bundle analysis cannot access sensitive file contents
- Performance metrics aggregated and anonymized
- Error messages sanitized to prevent information leakage

## Rate Limiting

- Theme creation: 5 requests per minute
- Migration analysis: 10 requests per minute
- Performance testing: 3 requests per minute
- Bundle analysis: 20 requests per minute