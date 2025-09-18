/**
 * TanStack Query hooks for OpenAlex API with intelligent caching
 * Provides entity-specific query hooks with optimized cache strategies
 */

import { useQuery, useSuspenseQuery, UseQueryOptions, UseSuspenseQueryOptions } from "@tanstack/react-query";
import { queryKeys, getEntityQueryKey } from "@/lib/cache/query-keys";
import { ENTITY_CACHE_TIMES, type EntityType } from "@/config/cache";
import { rateLimitedOpenAlex } from "@/lib/openalex/rate-limited-client";
import type {
	Work,
	Author,
	Source,
	InstitutionEntity,
	Topic,
	Publisher,
	Funder,
	Keyword,
	OpenAlexEntity,
	OpenAlexResponse,
	QueryParams,
	AutocompleteResult,
	EntityType as OpenAlexEntityType,
} from "@/lib/openalex/types";

// Base hook options with entity-specific caching
function getEntityQueryOptions<T>(entityType: EntityType): Partial<UseQueryOptions<T>> {
	const cacheConfig = ENTITY_CACHE_TIMES[entityType];

	return {
		staleTime: cacheConfig.stale,
		gcTime: cacheConfig.gc,
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		retry: (failureCount, error) => {
			// Type guard for error with status
			const hasStatus = (err: unknown): err is { status: number } => {
				return typeof err === "object" && err !== null && "status" in err;
			};

			// Don't retry 404s (entity not found)
			if (hasStatus(error) && error.status === 404) return false;
			// Retry 429s and 5xx errors up to 3 times
			if (hasStatus(error) && (error.status === 429 || error.status >= 500)) {
				return failureCount < 3;
			}
			return failureCount < 2;
		},
	};
}

// Generic entity hook
export function useOpenAlexEntity<T extends OpenAlexEntity>(
	entityType: EntityType,
	id: string | undefined,
	params?: QueryParams,
	options?: Partial<UseQueryOptions<T>>
) {
	return useQuery({
		queryKey: params
			? [...getEntityQueryKey(entityType, id || ""), params]
			: getEntityQueryKey(entityType, id || ""),
		queryFn: async () => {
			if (!id) throw new Error("Entity ID is required");
			return rateLimitedOpenAlex.getEntity(id);
		},
		enabled: !!id,
		...getEntityQueryOptions<T>(entityType),
		...options,
	});
}

// Works hooks
export function useWork(id: string | undefined, params?: QueryParams, options?: Partial<UseQueryOptions<Work>>) {
	return useQuery({
		queryKey: params ? [...queryKeys.work(id || ""), params] : queryKeys.work(id || ""),
		queryFn: async () => {
			if (!id) throw new Error("Work ID is required");
			return rateLimitedOpenAlex.getWork(id, params);
		},
		enabled: !!id,
		...getEntityQueryOptions<Work>("work"),
		...options,
	});
}

export function useWorks(params?: QueryParams, options?: Partial<UseQueryOptions<OpenAlexResponse<Work>>>) {
	return useQuery({
		queryKey: [...queryKeys.works(), params || {}],
		queryFn: () => rateLimitedOpenAlex.getWorks(params),
		...getEntityQueryOptions<OpenAlexResponse<Work>>("work"),
		...options,
	});
}

export function useWorkSearch(query: string | undefined, params?: QueryParams, options?: Partial<UseQueryOptions<OpenAlexResponse<Work>>>) {
	return useQuery({
		queryKey: queryKeys.searchWorks(query || "", params),
		queryFn: () => {
			if (!query) throw new Error("Search query is required");
			return rateLimitedOpenAlex.searchWorks(query, params);
		},
		enabled: !!query && query.length > 0,
		staleTime: 1000 * 60 * 5, // 5 minutes for search results
		gcTime: 1000 * 60 * 30,   // 30 minutes
		...options,
	});
}

// Authors hooks
export function useAuthor(id: string | undefined, params?: QueryParams, options?: Partial<UseQueryOptions<Author>>) {
	return useQuery({
		queryKey: params ? [...queryKeys.author(id || ""), params] : queryKeys.author(id || ""),
		queryFn: async () => {
			if (!id) throw new Error("Author ID is required");
			return rateLimitedOpenAlex.getAuthor(id, params);
		},
		enabled: !!id,
		...getEntityQueryOptions<Author>("author"),
		...options,
	});
}

export function useAuthors(params?: QueryParams, options?: Partial<UseQueryOptions<OpenAlexResponse<Author>>>) {
	return useQuery({
		queryKey: [...queryKeys.authors(), params || {}],
		queryFn: () => rateLimitedOpenAlex.getAuthors(params),
		...getEntityQueryOptions<OpenAlexResponse<Author>>("author"),
		...options,
	});
}

export function useAuthorSearch(query: string | undefined, params?: QueryParams, options?: Partial<UseQueryOptions<OpenAlexResponse<Author>>>) {
	return useQuery({
		queryKey: queryKeys.searchAuthors(query || "", params),
		queryFn: () => {
			if (!query) throw new Error("Search query is required");
			return rateLimitedOpenAlex.searchAuthors(query, params);
		},
		enabled: !!query && query.length > 0,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 30,
		...options,
	});
}

// Sources hooks
export function useSource(id: string | undefined, params?: QueryParams, options?: Partial<UseQueryOptions<Source>>) {
	return useQuery({
		queryKey: params ? [...queryKeys.source(id || ""), params] : queryKeys.source(id || ""),
		queryFn: async () => {
			if (!id) throw new Error("Source ID is required");
			return rateLimitedOpenAlex.getSource(id, params);
		},
		enabled: !!id,
		...getEntityQueryOptions<Source>("source"),
		...options,
	});
}

export function useSources(params?: QueryParams, options?: Partial<UseQueryOptions<OpenAlexResponse<Source>>>) {
	return useQuery({
		queryKey: [...queryKeys.sources(), params || {}],
		queryFn: () => rateLimitedOpenAlex.getSources(params),
		...getEntityQueryOptions<OpenAlexResponse<Source>>("source"),
		...options,
	});
}

export function useSourceSearch(query: string | undefined, params?: QueryParams, options?: Partial<UseQueryOptions<OpenAlexResponse<Source>>>) {
	return useQuery({
		queryKey: queryKeys.searchSources(query || "", params),
		queryFn: () => {
			if (!query) throw new Error("Search query is required");
			return rateLimitedOpenAlex.searchSources(query, params);
		},
		enabled: !!query && query.length > 0,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 30,
		...options,
	});
}

// Institutions hooks
export function useInstitution(id: string | undefined, params?: Record<string, unknown>, options?: Partial<UseQueryOptions<InstitutionEntity>>) {
	return useQuery({
		queryKey: params ? [...queryKeys.institution(id || ""), params] : queryKeys.institution(id || ""),
		queryFn: async () => {
			if (!id) throw new Error("Institution ID is required");
			return rateLimitedOpenAlex.getInstitution(id, params);
		},
		enabled: !!id,
		...getEntityQueryOptions<InstitutionEntity>("institution"),
		...options,
	});
}

export function useInstitutions(params?: Record<string, unknown>, options?: Partial<UseQueryOptions<OpenAlexResponse<InstitutionEntity>>>) {
	return useQuery({
		queryKey: [...queryKeys.institutions(), params || {}],
		queryFn: () => rateLimitedOpenAlex.getInstitutions(params),
		...getEntityQueryOptions<OpenAlexResponse<InstitutionEntity>>("institution"),
		...options,
	});
}

export function useInstitutionSearch(query: string | undefined, params?: Record<string, unknown>, options?: Partial<UseQueryOptions<OpenAlexResponse<InstitutionEntity>>>) {
	return useQuery({
		queryKey: queryKeys.searchInstitutions(query || "", params),
		queryFn: () => {
			if (!query) throw new Error("Search query is required");
			return rateLimitedOpenAlex.searchInstitutions(query, params);
		},
		enabled: !!query && query.length > 0,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 30,
		...options,
	});
}

// Topics hooks
export function useTopic(id: string | undefined, params?: Record<string, unknown>, options?: Partial<UseQueryOptions<Topic>>) {
	return useQuery({
		queryKey: params ? [...queryKeys.topic(id || ""), params] : queryKeys.topic(id || ""),
		queryFn: async () => {
			if (!id) throw new Error("Topic ID is required");
			return rateLimitedOpenAlex.getTopic(id, params);
		},
		enabled: !!id,
		...getEntityQueryOptions<Topic>("topic"),
		...options,
	});
}

export function useTopics(params?: Record<string, unknown>, options?: Partial<UseQueryOptions<OpenAlexResponse<Topic>>>) {
	return useQuery({
		queryKey: [...queryKeys.topics(), params || {}],
		queryFn: () => rateLimitedOpenAlex.getTopics(params),
		...getEntityQueryOptions<OpenAlexResponse<Topic>>("topic"),
		...options,
	});
}

// Publishers hooks
export function usePublisher(id: string | undefined, params?: Record<string, unknown>, options?: Partial<UseQueryOptions<Publisher>>) {
	return useQuery({
		queryKey: params ? [...queryKeys.publisher(id || ""), params] : queryKeys.publisher(id || ""),
		queryFn: async () => {
			if (!id) throw new Error("Publisher ID is required");
			return rateLimitedOpenAlex.getPublisher(id, params);
		},
		enabled: !!id,
		...getEntityQueryOptions<Publisher>("publisher"),
		...options,
	});
}

export function usePublishers(params?: Record<string, unknown>, options?: Partial<UseQueryOptions<OpenAlexResponse<Publisher>>>) {
	return useQuery({
		queryKey: [...queryKeys.publishers(), params || {}],
		queryFn: () => rateLimitedOpenAlex.getPublishers(params),
		...getEntityQueryOptions<OpenAlexResponse<Publisher>>("publisher"),
		...options,
	});
}

// Funders hooks
export function useFunder(id: string | undefined, params?: Record<string, unknown>, options?: Partial<UseQueryOptions<Funder>>) {
	return useQuery({
		queryKey: params ? [...queryKeys.funder(id || ""), params] : queryKeys.funder(id || ""),
		queryFn: async () => {
			if (!id) throw new Error("Funder ID is required");
			return rateLimitedOpenAlex.getFunder(id, params);
		},
		enabled: !!id,
		...getEntityQueryOptions<Funder>("funder"),
		...options,
	});
}

export function useFunders(params?: Record<string, unknown>, options?: Partial<UseQueryOptions<OpenAlexResponse<Funder>>>) {
	return useQuery({
		queryKey: [...queryKeys.funders(), params || {}],
		queryFn: () => rateLimitedOpenAlex.getFunders(params),
		...getEntityQueryOptions<OpenAlexResponse<Funder>>("funder"),
		...options,
	});
}

// Keywords hooks
export function useKeyword(id: string | undefined, params?: QueryParams, options?: Partial<UseQueryOptions<Keyword>>) {
	return useQuery({
		queryKey: params ? [...queryKeys.all, "keywords", id || "", params] : [...queryKeys.all, "keywords", id || ""],
		queryFn: async () => {
			if (!id) throw new Error("Keyword ID is required");
			return rateLimitedOpenAlex.getKeyword(id, params);
		},
		enabled: !!id,
		staleTime: 1000 * 60 * 60 * 24, // 1 day - keywords are stable
		gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
		...options,
	});
}


// Autocomplete hooks
export function useAutocomplete(query: string | undefined, entityType?: string, options?: Partial<UseQueryOptions<AutocompleteResult[]>>) {
	// Map entity types to valid cache entity types
	const normalizeEntityType = (type?: string): EntityType => {
		if (!type) return "work";

		// Handle plural forms and normalize to singular
		const normalized = type.replace(/s$/, ""); // Remove trailing 's' for plural forms

		// Valid entity types from cache config (without concepts, keywords, geo which aren't cached)
		const validTypes: EntityType[] = ["work", "author", "source", "institution", "topic", "publisher", "funder", "search", "related"];

		// Type guard to check if normalized is a valid EntityType
		function isValidEntityType(type: string): type is EntityType {
			return validTypes.some(validType => validType === type);
		}

		return isValidEntityType(normalized) ? normalized : "work";
	};

	const validEntityType = normalizeEntityType(entityType);

	return useQuery({
		queryKey: queryKeys.autocomplete(query || "", validEntityType),
		queryFn: () => {
			if (!query || query.length < 2) throw new Error("Query must be at least 2 characters");
			// Map cache EntityType to OpenAlex EntityType for the API call
			const openAlexEntityType = validEntityType === "search" || validEntityType === "related"
				? "work" // Default to work for non-standard entity types
				: validEntityType;
			// Type-safe mapping to OpenAlex entity types
			const mapToOpenAlexType = (type: string): OpenAlexEntityType | undefined => {
				const typeMap: Record<string, OpenAlexEntityType> = {
					"work": "works",
					"author": "authors",
					"source": "sources",
					"institution": "institutions",
					"topic": "topics",
					"publisher": "publishers",
					"funder": "funders",
				};
				return typeMap[type];
			};

			const mappedType = mapToOpenAlexType(openAlexEntityType);
			if (mappedType) {
				return rateLimitedOpenAlex.autocomplete(query, mappedType);
			}
			// For invalid types, return empty array to prevent API call
			return Promise.resolve([]);
		},
		enabled: !!query && query.length >= 2,
		staleTime: 1000 * 60 * 15, // 15 minutes - autocomplete results change frequently
		gcTime: 1000 * 60 * 60,    // 1 hour
		...options,
	});
}

export function useAutocompleteWorks(query: string | undefined, options?: Partial<UseQueryOptions<AutocompleteResult[]>>) {
	return useQuery({
		queryKey: queryKeys.autocomplete(query || "", "work"),
		queryFn: () => {
			if (!query || query.length < 2) throw new Error("Query must be at least 2 characters");
			return rateLimitedOpenAlex.autocompleteWorks(query);
		},
		enabled: !!query && query.length >= 2,
		staleTime: 1000 * 60 * 15,
		gcTime: 1000 * 60 * 60,
		...options,
	});
}

export function useAutocompleteAuthors(query: string | undefined, options?: Partial<UseQueryOptions<AutocompleteResult[]>>) {
	return useQuery({
		queryKey: queryKeys.autocomplete(query || "", "author"),
		queryFn: () => {
			if (!query || query.length < 2) throw new Error("Query must be at least 2 characters");
			return rateLimitedOpenAlex.autocompleteAuthors(query);
		},
		enabled: !!query && query.length >= 2,
		staleTime: 1000 * 60 * 15,
		gcTime: 1000 * 60 * 60,
		...options,
	});
}

export function useAutocompleteSources(query: string | undefined, options?: Partial<UseQueryOptions<AutocompleteResult[]>>) {
	return useQuery({
		queryKey: queryKeys.autocomplete(query || "", "source"),
		queryFn: () => {
			if (!query || query.length < 2) throw new Error("Query must be at least 2 characters");
			return rateLimitedOpenAlex.autocompleteSources(query);
		},
		enabled: !!query && query.length >= 2,
		staleTime: 1000 * 60 * 15,
		gcTime: 1000 * 60 * 60,
		...options,
	});
}

export function useAutocompleteInstitutions(query: string | undefined, options?: Partial<UseQueryOptions<AutocompleteResult[]>>) {
	return useQuery({
		queryKey: queryKeys.autocomplete(query || "", "institution"),
		queryFn: () => {
			if (!query || query.length < 2) throw new Error("Query must be at least 2 characters");
			return rateLimitedOpenAlex.autocompleteInstitutions(query);
		},
		enabled: !!query && query.length >= 2,
		staleTime: 1000 * 60 * 15,
		gcTime: 1000 * 60 * 60,
		...options,
	});
}

// Suspense versions for components that need guaranteed data
export function useSuspenseWork(id: string, params?: QueryParams, options?: Partial<UseSuspenseQueryOptions<Work>>) {
	return useSuspenseQuery({
		queryKey: params ? [...queryKeys.work(id), params] : queryKeys.work(id),
		...getEntityQueryOptions<Work>("work"),
		queryFn: () => rateLimitedOpenAlex.getWork(id, params),
		...options,
	});
}

export function useSuspenseAuthor(id: string, params?: QueryParams, options?: Partial<UseSuspenseQueryOptions<Author>>) {
	return useSuspenseQuery({
		queryKey: params ? [...queryKeys.author(id), params] : queryKeys.author(id),
		...getEntityQueryOptions<Author>("author"),
		queryFn: () => rateLimitedOpenAlex.getAuthor(id, params),
		...options,
	});
}

export function useSuspenseSource(id: string, params?: QueryParams, options?: Partial<UseSuspenseQueryOptions<Source>>) {
	return useSuspenseQuery({
		queryKey: params ? [...queryKeys.source(id), params] : queryKeys.source(id),
		...getEntityQueryOptions<Source>("source"),
		queryFn: () => rateLimitedOpenAlex.getSource(id, params),
		...options,
	});
}

export function useSuspenseInstitution(id: string, params?: Record<string, unknown>, options?: Partial<UseSuspenseQueryOptions<InstitutionEntity>>) {
	return useSuspenseQuery({
		queryKey: params ? [...queryKeys.institution(id), params] : queryKeys.institution(id),
		...getEntityQueryOptions<InstitutionEntity>("institution"),
		queryFn: () => rateLimitedOpenAlex.getInstitution(id, params),
		...options,
	});
}