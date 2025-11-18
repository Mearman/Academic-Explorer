/**
 * Edge metadata types for OpenAlex relationships (per data-model.md)
 */

export interface AuthorshipMetadata {
  author_position?: string;
  institutions?: string[];
  is_corresponding?: boolean;
}

export interface CitationMetadata {
  citation_count?: number;
}

export interface FundingMetadata {
  award_id?: string;
  funder_display_name?: string;
}

export interface AffiliationMetadata {
  years?: number[];
}

export interface TopicMetadata {
  score?: number;
  display_name?: string;
}

export interface PublicationMetadata {
  is_oa?: boolean;
  version?: string;
}
