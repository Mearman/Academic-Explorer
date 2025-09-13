/**
 * OpenAlex Entities API - Main exports
 * Provides comprehensive access to all OpenAlex entity types
 */

// Export all entity APIs
export * from './works';
export * from './authors';
export * from './sources';
export * from './institutions';
export * from './topics';
export * from './publishers';
export * from './funders';
export * from './keywords';
export * from './geo';

// Export types and interfaces
export type {
  WorksQueryParams,
  SearchWorksOptions,
  RelatedWorksOptions,
} from './works';

export type {
  AuthorsQueryParams,
  SearchAuthorsOptions,
} from './authors';

export type {
  SourcesQueryParams,
  SearchSourcesOptions,
} from './sources';

export type {
  InstitutionsQueryParams,
  SearchInstitutionsOptions,
} from './institutions';

export type {
  TopicsQueryParams,
  SearchTopicsOptions,
} from './topics';

export type {
  PublishersQueryParams,
  SearchPublishersOptions,
} from './publishers';

export type {
  FundersQueryParams,
  SearchFundersOptions,
} from './funders';

export type {
  KeywordsQueryParams,
  SearchKeywordsOptions,
} from './keywords';

export type {
  GeoQueryParams,
  SearchGeoOptions,
} from './geo';