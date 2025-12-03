/**
 * Shared route search parameter schemas
 * These schemas ensure query parameters are preserved in hash-based routing
 */

import { z } from "zod";

/**
 * Standard OpenAlex API query parameters
 * Based on QueryParamsSchema from @bibgraph/types
 *
 * Uses `.catch()` to handle invalid values gracefully instead of throwing errors
 */
export const openAlexSearchSchema = z.object({
  filter: z.string().optional().catch(),
  search: z.string().optional().catch(),
  sort: z.string().optional().catch(),
  page: z.coerce.number().optional().catch(),
  per_page: z.coerce.number().optional().catch(),
  cursor: z.string().optional().catch(),
  sample: z.coerce.number().optional().catch(),
  seed: z.coerce.number().optional().catch(),
  group_by: z.string().optional().catch(),
  mailto: z.string().optional().catch(),
  // Allow any additional unknown parameters
}).catchall(z.unknown());

export type OpenAlexSearchParams = z.infer<typeof openAlexSearchSchema>;
