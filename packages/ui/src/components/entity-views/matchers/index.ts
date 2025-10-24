// Re-export types
export type {
	ArrayMatcher,
	ObjectMatcher,
	ValueMatcher,
	TopicShareItem,
	AuthorItem,
	InstitutionItem,
	TopicItem,
	CitationHistoryItem,
	ConceptItem,
	AffiliationItem,
} from "./types"

// Re-export utilities
export {
	convertToRelativeUrl,
	isOpenAlexUrl,
	extractEntityId,
	determineCanonicalRoute,
	getEntityTypeFromId,
	getTopicColor,
	getConceptColor,
	getIdColor,
	getEntityColor,
} from "./utils"

// Re-export matchers
export {
	affiliationMatcher,
	authorMatcher,
	institutionMatcher,
	topicMatcher,
	topicShareMatcher,
} from "./array-matchers"
export { idObjectMatcher } from "./object-matchers"
export { doiMatcher, orcidMatcher, rorMatcher, urlMatcher } from "./value-matchers"
// TODO: Re-export remaining matchers when implemented

// Import matchers for the arrays
import {
	affiliationMatcher,
	authorMatcher,
	institutionMatcher,
	topicMatcher,
	topicShareMatcher,
} from "./array-matchers"
import { idObjectMatcher } from "./object-matchers"
import { doiMatcher, orcidMatcher, rorMatcher, urlMatcher } from "./value-matchers"
import type { ArrayMatcher, ObjectMatcher, ValueMatcher } from "./types"

/**
 * Array Matchers - for detecting specific array structures
 */
export const arrayMatchers: ArrayMatcher[] = [
	// Author array matcher (from works.authorships)
	authorMatcher,

	// Institution array matcher (from authors.last_known_institutions)
	institutionMatcher,

	// Topic array matcher (from authors.topics or works.topics)
	topicMatcher,

	// Topic share array matcher (topic_share with hierarchical data)
	topicShareMatcher,

	// Affiliation array matcher (from authors.affiliations)
	affiliationMatcher,

	// TODO: Add remaining array matchers
	// siblingsMatcher,
	// citationHistoryMatcher,
	// keywordsMatcher,
	// conceptMatcher,
	// entityIdArrayMatcher,
]

/**
 * Object Matchers - for detecting specific object structures
 */
export const objectMatchers: ObjectMatcher[] = [
	// Entity object matcher (source, publisher, funder objects)
	// TODO: entityObjectMatcher,

	// ID object matcher (ids: { openalex, orcid, doi, etc. })
	idObjectMatcher,

	// Summary stats matcher (h_index, i10_index, etc.)
	// TODO: summaryStatsMatcher,

	// Geographic data matcher
	// TODO: geoDataMatcher,
]

/**
 * Value Matchers - for detecting special value types
 */
export const valueMatchers: ValueMatcher[] = [
	// DOI matcher
	doiMatcher,

	// ORCID matcher
	orcidMatcher,

	// ROR matcher
	rorMatcher,

	// URL matcher
	urlMatcher,

	// TODO: Add remaining value matchers
	// imageUrlMatcher,
	// issnMatcher,
]

/**
 * Find the best matcher for a given value
 */
export function findArrayMatcher(array: unknown[]): ArrayMatcher | null {
	const sortedMatchers = arrayMatchers.sort((a, b) => (b.priority || 0) - (a.priority || 0))

	for (const matcher of sortedMatchers) {
		if (matcher.detect(array)) {
			return matcher
		}
	}
	return null
}

export function findObjectMatcher(obj: unknown): ObjectMatcher | null {
	const sortedMatchers = objectMatchers.sort((a, b) => (b.priority || 0) - (a.priority || 0))

	for (const matcher of sortedMatchers) {
		if (matcher.detect(obj)) {
			return matcher
		}
	}
	return null
}

export function findValueMatcher({
	value,
	fieldName,
}: {
	value: unknown
	fieldName?: string
}): ValueMatcher | null {
	const sortedMatchers = valueMatchers.sort((a, b) => (b.priority || 0) - (a.priority || 0))

	for (const matcher of sortedMatchers) {
		if (matcher.detect(value, fieldName)) {
			return matcher
		}
	}
	return null
}
