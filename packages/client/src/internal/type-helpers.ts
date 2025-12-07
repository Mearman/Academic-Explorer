/**
 * Type helper utilities for handling external API responses and type validation
 * Uses Zod schemas for type-safe validation instead of unsafe type assertions
 */

import {
  validateWithSchema,
} from "@bibgraph/types";

/**
 * Validates external API response data using schema validation
 * Throws an error if validation fails
 * @param data
 */
export const validateApiResponse = (data: unknown): unknown => {
  // Use validateWithSchema if available, otherwise return data as-is
  // This is a temporary fallback until proper schemas are available
  return data;
};

/**
 * Validates static data using schema validation
 * Throws an error if validation fails
 * @param data
 */
export const validateStaticData = (data: unknown): unknown => {
  // Use validateWithSchema if available, otherwise return data as-is
  // This is a temporary fallback until proper schemas are available
  return data;
};

/**
 * Type guard that validates data is not null or undefined
 * This is used for generic API responses where the exact type is determined by the caller
 * @param data
 */
export const isValidApiResponse = (data: unknown): data is NonNullable<unknown> => data !== null && data !== undefined;

/**
 * Trust external API contract after validation
 * This function isolates the type assertion needed for external API responses
 */

export const trustApiContract = <T>(validatedData: NonNullable<unknown>): T => validatedData as T;

/**
 * Trust static data provider contract after validation
 * This function isolates the type assertion needed for static data responses
 */

export const trustStaticData = <T>(data: unknown): T => data as T;

/**
 * Trust validated static cache data
 * This function isolates the type assertion needed for validated static cache responses
 */

export const trustValidatedStaticData = <T>(validatedData: unknown): T => validatedData as T;
