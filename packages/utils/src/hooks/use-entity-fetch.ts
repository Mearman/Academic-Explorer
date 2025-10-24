import { useQuery } from "@tanstack/react-query"
import { cachedOpenAlex } from "@academic-explorer/client"
import type { EntityType } from "@academic-explorer/types"
import {
  workSchema,
  authorSchema,
  institutionSchema,
  sourceSchema,
  publisherSchema,
  funderSchema,
  conceptSchema,
  topicSchema,
  keywordSchema,
  openAlexResponseSchema,
  type OpenAlexResponse
} from "@academic-explorer/types"
import type { z } from "zod"

export interface UseEntityFetchOptions {
  entityId?: string | null
  entityType?: EntityType | null
  enabled?: boolean
  queryParams?: Record<string, unknown>
  staleTime?: number
  cacheTime?: number
}

export interface UseEntityFetchResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Entity schema mapping for proper type validation
 */
const ENTITY_SCHEMAS = {
  works: workSchema,
  authors: authorSchema,
  institutions: institutionSchema,
  sources: sourceSchema,
  publishers: publisherSchema,
  funders: funderSchema,
  concepts: conceptSchema,
  topics: topicSchema,
  keywords: keywordSchema
} as const

/**
 * Response schema mapping for list validation
 */
const RESPONSE_SCHEMAS = {
  works: openAlexResponseSchema(workSchema),
  authors: openAlexResponseSchema(authorSchema),
  institutions: openAlexResponseSchema(institutionSchema),
  sources: openAlexResponseSchema(sourceSchema),
  publishers: openAlexResponseSchema(publisherSchema),
  funders: openAlexResponseSchema(funderSchema),
  concepts: openAlexResponseSchema(conceptSchema),
  topics: openAlexResponseSchema(topicSchema),
  keywords: openAlexResponseSchema(keywordSchema)
} as const

/**
 * Type guard to validate entity data against Zod schema
 */
function validateEntity<T>(data: unknown, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new Error(`Invalid entity data: ${result.error.message}`)
  }
  return result.data as T
}

/**
 * Type guard to validate response data against Zod schema
 */
function validateResponse<T>(data: unknown, schema: z.ZodSchema<OpenAlexResponse<T>>): OpenAlexResponse<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new Error(`Invalid response data: ${result.error.message}`)
  }
  return result.data as OpenAlexResponse<T>
}

/**
 * Shared entity fetching hook with proper Zod validation
 * Eliminates duplication across entity fetching hooks
 */
export function useEntityFetch<T>({
  entityId,
  entityType,
  enabled = true,
  queryParams = {},
  staleTime = 5 * 60 * 1000, // 5 minutes default
  cacheTime = 10 * 60 * 1000 // 10 minutes default
}: UseEntityFetchOptions): UseEntityFetchResult<T> {
  const shouldFetch = enabled && !!entityId && !!entityType

  const queryKey = [
    "entity",
    entityType,
    entityId,
    JSON.stringify(queryParams)
  ].filter(Boolean)

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!entityType || !entityId) {
        throw new Error("Entity type and ID are required")
      }
      return fetchEntity<T>(entityType, entityId, queryParams)
    },
    enabled: shouldFetch,
    staleTime,
    gcTime: cacheTime,
  })

  return {
    data: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  }
}

/**
 * Core entity fetching function with Zod validation
 */
async function fetchEntity<T>(
  entityType: EntityType,
  entityId: string,
  queryParams: Record<string, unknown> = {}
): Promise<T> {
  const params = {
    select: queryParams.select,
    filter: queryParams.filter,
    search: queryParams.search,
    sort: queryParams.sort,
    per_page: queryParams.per_page,
    page: queryParams.page
  }

  let rawResult: unknown

  switch (entityType) {
    case "authors":
      rawResult = await cachedOpenAlex.client.authors.getAuthor(entityId, params)
      break

    case "works":
      rawResult = await cachedOpenAlex.client.works.getWork(entityId, params)
      break

    case "sources":
      rawResult = await cachedOpenAlex.client.sources.getSource(entityId, params)
      break

    case "institutions":
      rawResult = await cachedOpenAlex.client.institutions.getInstitution(entityId, params)
      break

    case "concepts":
      rawResult = await cachedOpenAlex.client.concepts.getConcept(entityId, params)
      break

    case "topics":
      rawResult = await cachedOpenAlex.client.topics.getTopic(entityId, params)
      break

    case "funders":
      rawResult = await cachedOpenAlex.client.funders.getFunder(entityId, params)
      break

    case "publishers":
      rawResult = await cachedOpenAlex.client.publishers.getPublisher(entityId, params)
      break

    default:
      throw new Error(`Unsupported entity type: ${entityType}`)
  }

  // Validate the result with proper Zod schema
  const schema = ENTITY_SCHEMAS[entityType]
  if (!schema) {
    throw new Error(`No schema available for entity type: ${entityType}`)
  }

  return validateEntity<T>(rawResult, schema)
}

/**
 * Hook for fetching multiple entities with proper validation
 */
export function useEntityList<T>({
  entityType,
  queryParams = {},
  enabled = true,
  staleTime = 5 * 60 * 1000
}: {
  entityType: EntityType
  queryParams?: Record<string, unknown>
  enabled?: boolean
  staleTime?: number
}): UseEntityFetchResult<T[]> {
  const shouldFetch = enabled && !!entityType

  const queryKey = [
    "entity-list",
    entityType,
    JSON.stringify(queryParams)
  ]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchEntityList<T>(entityType, queryParams),
    enabled: shouldFetch,
    staleTime,
  })

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  }
}

/**
 * Core entity list fetching with Zod response validation
 */
async function fetchEntityList<T>(
  entityType: EntityType,
  queryParams: Record<string, unknown> = {}
): Promise<T[]> {
  const params = {
    select: queryParams.select,
    filter: queryParams.filter,
    search: queryParams.search,
    sort: queryParams.sort,
    per_page: queryParams.per_page || 50,
    page: queryParams.page || 1,
    ...queryParams
  }

  let rawResult: unknown

  switch (entityType) {
    case "authors":
      rawResult = await cachedOpenAlex.client.authors.getAuthors(params)
      break

    case "works":
      rawResult = await cachedOpenAlex.client.works.getWorks(params)
      break

    case "sources":
      rawResult = await cachedOpenAlex.client.sources.getSources(params)
      break

    case "institutions":
      rawResult = await cachedOpenAlex.client.institutions.getInstitutions({
        ...params,
        filters: queryParams.filters
      })
      break

    case "funders":
      rawResult = await cachedOpenAlex.client.funders.getMultiple(params)
      break

    case "publishers":
      rawResult = await cachedOpenAlex.client.publishers.getMultiple(params)
      break

    case "topics":
      rawResult = await cachedOpenAlex.client.topics.getMultiple(params)
      break

    case "concepts":
      rawResult = await cachedOpenAlex.client.concepts.getMultiple(params)
      break

    default:
      throw new Error(`Unsupported entity type for list fetching: ${entityType}`)
  }

  // Validate the response with proper Zod schema
  const responseSchema = RESPONSE_SCHEMAS[entityType]
  if (!responseSchema) {
    throw new Error(`No response schema available for entity type: ${entityType}`)
  }

  const validatedResponse = validateResponse<T>(rawResult, responseSchema)
  return validatedResponse.results
}