/**
 * UI-specific types for the modular filter system
 * Extends the core OpenAlex types with UI state and interactions
 */

import type { EntityFilters, WorksFilters, AuthorsFilters, EntityType } from "@academic-explorer/types";

// Re-export core types for convenience
export type { EntityFilters, WorksFilters, AuthorsFilters, EntityType };

// Core filter operator types
export type FilterOperator = "=" | "!=" | ">" | ">=" | "<" | "<=" | "contains" | "search" | "between";
export type LogicalOperator = "AND" | "OR" | "NOT";

// UI-specific filter condition
export interface FilterCondition<T extends EntityFilters = EntityFilters> {
  id: string;
  field: keyof T;
  operator: FilterOperator;
  value: unknown;
  enabled: boolean;
  label?: string;
}

// Filter group for logical operations
export interface FilterGroup<T extends EntityFilters = EntityFilters> {
  id: string;
  operator: LogicalOperator;
  conditions: Array<FilterCondition<T> | FilterGroup<T>>;
  enabled: boolean;
  label?: string;
}

// Filter field metadata for UI rendering
export interface FilterFieldConfig {
  field: string;
  label: string;
  type: FilterFieldType;
  operators: FilterOperator[];
  placeholder?: string;
  helpText?: string;
  options?: FilterFieldOption[];
  validation?: FilterFieldValidation;
}

// Supported filter field types
export type FilterFieldType =
  | "text"
  | "search"
  | "number"
  | "date"
  | "dateRange"
  | "boolean"
  | "select"
  | "multiSelect"
  | "entity"
  | "entityMulti";

// Options for select-type fields
export interface FilterFieldOption {
  value: string | number | boolean;
  label: string;
  description?: string;
  group?: string;
}

// Field validation rules
export interface FilterFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

// Filter preset for saving and sharing
export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  entityType: EntityType;
  filters: EntityFilters;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

// Filter history entry
export interface FilterSnapshot {
  id: string;
  timestamp: Date;
  entityType: EntityType;
  filters: EntityFilters;
  label?: string;
}

// UI state for filter components
export interface FilterUIState {
  expandedGroups: Set<string>;
  selectedEntityType: EntityType;
  activePreset?: string;
  showAdvanced: boolean;
  compactMode: boolean;
}

// Events for filter updates
export interface FilterUpdateEvent<T extends EntityFilters = EntityFilters> {
  type: "condition" | "group" | "preset" | "clear";
  filters: Partial<T>;
  delta?: {
    added?: FilterCondition<T>[];
    removed?: string[];
    modified?: FilterCondition<T>[];
  };
}

// Hook return types for filter management
export interface FilterState<T extends EntityFilters = EntityFilters> {
  filters: Partial<T>;
  groups: FilterGroup<T>[];
  isValid: boolean;
  hasChanges: boolean;
  errors: Record<string, string>;
}

export interface FilterActions<T extends EntityFilters = EntityFilters> {
  updateCondition: (condition: FilterCondition<T>) => void;
  removeCondition: (conditionId: string) => void;
  addGroup: (operator: LogicalOperator) => void;
  updateGroup: (group: FilterGroup<T>) => void;
  removeGroup: (groupId: string) => void;
  clearAll: () => void;
  applyPreset: (preset: FilterPreset) => void;
  saveAsPreset: (name: string, description?: string) => void;
  reset: () => void;
}

// Component prop interfaces
export interface FilterFieldProps<T extends EntityFilters = EntityFilters> {
  condition: FilterCondition<T>;
  config: FilterFieldConfig;
  onUpdate: (condition: FilterCondition<T>) => void;
  onRemove: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export interface FilterGroupProps<T extends EntityFilters = EntityFilters> {
  group: FilterGroup<T>;
  config: FilterFieldConfig[];
  onUpdate: (group: FilterGroup<T>) => void;
  onRemove: () => void;
  disabled?: boolean;
  compact?: boolean;
  level?: number;
}

export interface FilterBuilderProps<T extends EntityFilters = EntityFilters> {
  entityType: EntityType;
  filters: Partial<T>;
  onFiltersChange: (filters: Partial<T>) => void;
  onApply?: (filters: Partial<T>) => void;
  compact?: boolean;
  disabled?: boolean;
  showPresets?: boolean;
  persistenceKey?: string;
}

export interface FilterManagerProps {
  entityType: EntityType;
  initialFilters?: Partial<EntityFilters>;
  onFiltersApply: (filters: Partial<EntityFilters>) => void;
  onFiltersChange?: (filters: Partial<EntityFilters>) => void;
  persistenceKey?: string;
  showPresets?: boolean;
  allowSharing?: boolean;
  compact?: boolean;
}

// Utility types for type-safe filter field access
export type WorksFilterField = keyof WorksFilters;
export type AuthorsFilterField = keyof AuthorsFilters;

// Entity-specific filter configurations
export type EntityFilterConfig<T extends EntityType> =
  T extends "works" ? FilterFieldConfig[] :
  T extends "authors" ? FilterFieldConfig[] :
  FilterFieldConfig[];

// Filter validation results
export interface FilterValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// URL serialization types
export interface FilterURL {
  entityType: EntityType;
  filters: string; // Base64 encoded filter object
  preset?: string;
}

// Export convenience type unions
export type AnyFilterCondition = FilterCondition<EntityFilters>;
export type AnyFilterGroup = FilterGroup<EntityFilters>;
export type AnyFilterBuilder = FilterBuilderProps<EntityFilters>;