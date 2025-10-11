/**
 * FilterBuilder Utility for OpenAlex API Filter Construction
 *
 * This module provides a focused utility class for converting filter objects
 * to OpenAlex API query string format. It complements the existing QueryBuilder
 * by providing a simpler, specialized interface for filter conversion.
 *
 * @see https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/filter-entity-lists
 */

import type { EntityFilters } from "../types";

/**
 * Filter value types supported by OpenAlex API
 */
export type FilterValue = string | number | boolean | string[] | number[];

/**
 * Filter operator types for comparison operations
 */
export type FilterOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "contains"
  | "starts_with";

/**
 * Logical operators for combining multiple filters
 */
export type FilterLogicalOperator = "AND" | "OR" | "NOT";

/**
 * Individual filter condition with field, operator, and value
 */
export interface FilterCondition {
  /** The field name to filter on */
  field: string;
  /** The comparison operator to use */
  operator: FilterOperator;
  /** The value to compare against */
  value: FilterValue;
}

/**
 * Complex filter expression that can contain nested logical operations
 */
export interface FilterExpression {
  /** The logical operator to combine conditions */
  operator: FilterLogicalOperator;
  /** Array of conditions or nested expressions */
  conditions: Array<FilterCondition | FilterExpression>;
}

/**
 * Options for controlling filter string generation
 */
export interface FilterBuilderOptions {
  /** Default logical operator for combining filters */
  defaultOperator?: FilterLogicalOperator;
  /** Whether to URL encode the resulting filter string */
  urlEncode?: boolean;
  /** Whether to validate filter field names */
  validateFields?: boolean;
  /** Custom field validation function */
  customValidator?: (field: string, value: FilterValue) => boolean;
}

/**
 * Result of filter validation operation
 */
export interface FilterValidationResult {
  /** Whether the filter is valid */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Array of field-specific validation errors */
  fieldErrors?: Array<{
    field: string;
    error: string;
  }>;
}

/**
 * FilterBuilder class for converting filter objects to OpenAlex query string format
 *
 * This utility class provides a clean interface for building OpenAlex API filter strings
 * from various filter object formats. It supports simple key-value filters, complex
 * expressions with logical operators, and validation of filter structures.
 *
 * @example
 * ```typescript
 * const builder = new FilterBuilder();
 *
 * // Simple filter object
 * const filterString = builder.buildFromObject({
 *   'publication_year': 2023,
 *   'is_oa': true
 * });
 *
 * // Complex filter expression
 * const complexFilter = builder.buildFromExpression({
 *   operator: 'AND',
 *   conditions: [
 *     { field: 'publication_year', operator: '>=', value: 2020 },
 *     { field: 'cited_by_count', operator: '>', value: 10 }
 *   ]
 * });
 * ```
 */
export class FilterBuilder {
  private options: Required<FilterBuilderOptions>;

  /**
   * Create a new FilterBuilder instance
   *
   * @param options - Configuration options for the builder
   */
  constructor(options: FilterBuilderOptions = {}) {
    this.options = {
      defaultOperator: options.defaultOperator ?? "AND",
      urlEncode: options.urlEncode ?? false,
      validateFields: options.validateFields ?? true,
      customValidator: options.customValidator ?? (() => true),
    };
  }

  /**
   * Build filter string from a simple filter object
   *
   * Converts a filter object with key-value pairs to OpenAlex API filter format.
   * This is the primary method for converting EntityFilters to query strings.
   *
   * @param filters - The filter object containing field-value pairs
   * @returns Formatted filter string for the OpenAlex API
   *
   * @example
   * ```typescript
   * const filterString = builder.buildFromObject({
   *   'publication_year': 2023,
   *   'is_oa': true,
   *   'authorships.author.id': ['A1234', 'A5678']
   * });
   * // Result: "publication_year:2023,is_oa:true,authorships.author.id:A1234|A5678"
   * ```
   */
  buildFromObject(
    _filters:
      | EntityFilters
      | Partial<EntityFilters>
      | Record<string, FilterValue>,
  ): string {
    // Implementation will be added in separate task
    throw new Error("FilterBuilder.buildFromObject not yet implemented");
  }

  /**
   * Build filter string from a complex filter expression
   *
   * Converts a structured filter expression with logical operators to OpenAlex format.
   * Supports nested expressions and complex logical combinations.
   *
   * @param expression - The filter expression to convert
   * @returns Formatted filter string for the OpenAlex API
   *
   * @example
   * ```typescript
   * const filterString = builder.buildFromExpression({
   *   operator: 'AND',
   *   conditions: [
   *     { field: 'publication_year', operator: '>=', value: 2020 },
   *     {
   *       operator: 'OR',
   *       conditions: [
   *         { field: 'is_oa', operator: '=', value: true },
   *         { field: 'cited_by_count', operator: '>', value: 100 }
   *       ]
   *     }
   *   ]
   * });
   * ```
   */
  buildFromExpression(_expression: FilterExpression): string {
    // Implementation will be added in separate task
    throw new Error("FilterBuilder.buildFromExpression not yet implemented");
  }

  /**
   * Build filter string from an array of filter conditions
   *
   * Converts an array of individual filter conditions to OpenAlex format,
   * combining them with the default logical operator.
   *
   * @param conditions - Array of filter conditions
   * @returns Formatted filter string for the OpenAlex API
   *
   * @example
   * ```typescript
   * const filterString = builder.buildFromConditions([
   *   { field: 'publication_year', operator: '=', value: 2023 },
   *   { field: 'is_oa', operator: '=', value: true }
   * ]);
   * ```
   */
  buildFromConditions(_conditions: FilterCondition[]): string {
    // Implementation will be added in separate task
    throw new Error("FilterBuilder.buildFromConditions not yet implemented");
  }

  /**
   * Validate a filter object structure
   *
   * Checks if the provided filter object is valid for OpenAlex API usage.
   * Validates field names, value types, and overall structure.
   *
   * @param filters - The filter object to validate
   * @returns Validation result with any error details
   *
   * @example
   * ```typescript
   * const validation = builder.validateFilters({
   *   'publication_year': 2023,
   *   'invalid_field': 'bad_value'
   * });
   *
   * if (!validation.isValid) {
   *   console.error('Validation errors:', validation.fieldErrors);
   * }
   * ```
   */
  validateFilters(
    _filters: Record<string, FilterValue>,
  ): FilterValidationResult {
    // Implementation will be added in separate task
    throw new Error("FilterBuilder.validateFilters not yet implemented");
  }

  /**
   * Validate a filter expression structure
   *
   * Checks if the provided filter expression is valid and properly structured.
   * Validates logical operators, field names, and nested expressions.
   *
   * @param expression - The filter expression to validate
   * @returns Validation result with any error details
   */
  validateExpression(_expression: FilterExpression): FilterValidationResult {
    // Implementation will be added in separate task
    throw new Error("FilterBuilder.validateExpression not yet implemented");
  }

  /**
   * Escape special characters in filter values
   *
   * Escapes special characters in filter values to prevent query parsing issues.
   * Handles quotes, pipes, commas, and other OpenAlex-specific characters.
   *
   * @param value - The filter value to escape
   * @returns Escaped value safe for use in API queries
   *
   * @example
   * ```typescript
   * const escaped = builder.escapeValue('machine "learning" & AI');
   * // Returns properly escaped value for OpenAlex API
   * ```
   */
  escapeValue(_value: string): string {
    // Implementation will be added in separate task
    throw new Error("FilterBuilder.escapeValue not yet implemented");
  }

  /**
   * Parse an OpenAlex filter string back to filter object
   *
   * Converts an OpenAlex API filter string back to a structured filter object.
   * Useful for parsing existing queries or reverse-engineering filters.
   *
   * @param filterString - The OpenAlex filter string to parse
   * @returns Parsed filter object
   *
   * @example
   * ```typescript
   * const filters = builder.parseFilterString('publication_year:2023,is_oa:true');
   * // Result: { 'publication_year': '2023', 'is_oa': 'true' }
   * ```
   */
  parseFilterString(filterString: string): Record<string, FilterValue> {
    if (!filterString || typeof filterString !== "string") {
      return {};
    }

    const filters: Record<string, FilterValue> = {};

    // Split by comma to get individual filter conditions
    const filterParts = filterString.split(",");

    for (const part of filterParts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;

      // Split by colon to get field and value
      const colonIndex = trimmedPart.indexOf(":");
      if (colonIndex === -1) continue;

      const field = trimmedPart.substring(0, colonIndex).trim();
      const value = trimmedPart.substring(colonIndex + 1).trim();

      if (!field || !value) continue;

      // Handle array values (pipe-separated)
      if (value.includes("|")) {
        filters[field] = value.split("|").map((v) => v.trim());
      } else {
        // Try to parse as boolean or number, otherwise keep as string
        if (value === "true") {
          filters[field] = true;
        } else if (value === "false") {
          filters[field] = false;
        } else if (/^\d+$/.test(value)) {
          filters[field] = parseInt(value, 10);
        } else if (/^\d*\.\d+$/.test(value)) {
          filters[field] = parseFloat(value);
        } else {
          filters[field] = value;
        }
      }
    }

    return filters;
  }

  /**
   * Update the builder options
   *
   * Allows modifying the builder configuration after instantiation.
   *
   * @param newOptions - Partial options to update
   * @returns This FilterBuilder instance for method chaining
   */
  updateOptions(newOptions: Partial<FilterBuilderOptions>): this {
    this.options = {
      ...this.options,
      ...newOptions,
    };
    return this;
  }

  /**
   * Get the current builder options
   *
   * @returns Copy of the current options configuration
   */
  getOptions(): Required<FilterBuilderOptions> {
    return { ...this.options };
  }

  /**
   * Reset the builder to default options
   *
   * @returns This FilterBuilder instance for method chaining
   */
  resetOptions(): this {
    this.options = {
      defaultOperator: "AND",
      urlEncode: false,
      validateFields: true,
      customValidator: () => true,
    };
    return this;
  }
}

/**
 * Create a new FilterBuilder instance with default options
 *
 * Convenience function for creating a FilterBuilder with standard configuration.
 *
 * @param options - Optional configuration for the builder
 * @returns New FilterBuilder instance
 *
 * @example
 * ```typescript
 * const builder = createFilterBuilder();
 * const filterString = builder.buildFromObject({ 'publication_year': 2023 });
 * ```
 */
export function createFilterBuilder(
  options?: FilterBuilderOptions,
): FilterBuilder {
  return new FilterBuilder(options);
}

/**
 * Quick utility function to convert a simple filter object to filter string
 *
 * Convenience function for one-off filter conversions without creating a builder instance.
 *
 * @param filters - The filter object to convert
 * @param options - Optional builder configuration
 * @returns Formatted filter string for the OpenAlex API
 *
 * @example
 * ```typescript
 * const filterString = buildFilterString({
 *   'publication_year': 2023,
 *   'is_oa': true
 * });
 * ```
 */
export function buildFilterString(
  filters: EntityFilters | Partial<EntityFilters> | Record<string, FilterValue>,
  options?: FilterBuilderOptions,
): string {
  const builder = new FilterBuilder(options);
  return builder.buildFromObject(filters);
}

// Types are already exported above - no need to re-export
