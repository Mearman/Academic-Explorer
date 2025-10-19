/**
 * Type helper utilities for handling external API responses and type validation
 * Uses Zod schemas for type-safe validation instead of unsafe type assertions
 */

import { z } from "zod";
import {
  apiResponseSchema,
  staticDataSchema,
  isRecord,
  trustObjectShape,
  extractPropertyValue,
  validateWithSchema,
} from "@academic-explorer/utils/openalex";

/**
 * Validates external API response data using Zod schema
 * Throws an error if validation fails
 */
export function validateApiResponse(data: unknown): unknown {
  return apiResponseSchema.parse(data);
}

/**
 * Validates static data using Zod schema
 * Throws an error if validation fails
 */
export function validateStaticData(data: unknown): unknown {
  return staticDataSchema.parse(data);
}

/**
 * Type guard that validates data is not null or undefined
 * This is used for generic API responses where the exact type is determined by the caller
 */
export function isValidApiResponse(
  data: unknown,
): data is NonNullable<unknown> {
  return data !== null && data !== undefined;
}

/**
 * Trust external API contract after validation
 * This function isolates the type assertion needed for external API responses
 */

export function trustApiContract<T>(validatedData: NonNullable<unknown>): T {
  // Return the validated data with the expected type
  return validatedData as T;
}

/**
 * Trust static data provider contract after validation
 * This function isolates the type assertion needed for static data responses
 */

export function trustStaticData<T>(data: unknown): T {
  // Return the static data with the expected type
  return data as T;
}

/**
 * Trust validated static cache data
 * This function isolates the type assertion needed for validated static cache responses
 */

export function trustValidatedStaticData<T>(validatedData: unknown): T {
  // Return the validated static data with the expected type
  return validatedData as T;
}
