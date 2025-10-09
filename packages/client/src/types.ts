/**
 * OpenAlex API TypeScript Type Definitions
 *
 * This file now re-exports types from the modular structure for backward compatibility.
 * The types are organized in separate files for better maintainability:
 * - types/base.ts - Base types, IDs, and common structures
 * - types/entities.ts - All entity interfaces
 * - types/filters.ts - All filter interfaces
 * - types/common.ts - Utility types, responses, and query params
 */

// Re-export all types from the modular structure
export * from "./types/index";
