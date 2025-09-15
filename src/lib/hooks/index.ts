/**
 * Export all TanStack Query hooks for OpenAlex API
 */

export {
	// Generic entity hook
	useOpenAlexEntity,

	// Works hooks
	useWork,
	useWorks,
	useWorkSearch,
	useSuspenseWork,

	// Authors hooks
	useAuthor,
	useAuthors,
	useAuthorSearch,
	useSuspenseAuthor,

	// Sources hooks
	useSource,
	useSources,
	useSourceSearch,
	useSuspenseSource,

	// Institutions hooks
	useInstitution,
	useInstitutions,
	useInstitutionSearch,
	useSuspenseInstitution,

	// Topics hooks
	useTopic,
	useTopics,

	// Publishers hooks
	usePublisher,
	usePublishers,

	// Funders hooks
	useFunder,
	useFunders,

	// Keywords hooks
	useKeyword,


	// Autocomplete hooks
	useAutocomplete,
	useAutocompleteWorks,
	useAutocompleteAuthors,
	useAutocompleteSources,
	useAutocompleteInstitutions,
} from "./use-openalex-query";