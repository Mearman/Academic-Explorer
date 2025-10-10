/**
 * Type definitions for entity view matchers
 */

export interface TopicShareItem {
  id: string;
  display_name: string;
  value: number;
  subfield: {
    display_name: string;
  };
  field: {
    display_name: string;
  };
  domain: {
    display_name: string;
  };
}

export interface AuthorItem {
  author: {
    display_name: string;
    id: string;
  };
  author_position: string;
}

export interface InstitutionItem {
  id?: string;
  display_name: string;
  country_code: string;
}

export interface TopicItem {
  id?: string;
  display_name: string;
  count: number;
}

export interface CitationHistoryItem {
  year: number;
  cited_by_count: number;
  works_count: number;
}

export interface ConceptItem {
  display_name: string;
  level: number;
  score: number;
}

export interface AffiliationItem {
  institution: {
    id?: string;
    display_name: string;
  };
  years: number[];
}

export interface ArrayMatcher {
  name: string;
  detect: (array: unknown[]) => boolean;
  render: (
    array: unknown[],
    fieldName: string,
    onNavigate?: (path: string) => void,
  ) => React.ReactNode;
  priority?: number; // Higher priority matchers are checked first
}

export interface ObjectMatcher {
  name: string;
  detect: (obj: unknown) => boolean;
  render: (
    obj: unknown,
    fieldName: string,
    onNavigate?: (path: string) => void,
  ) => React.ReactNode;
  priority?: number;
}

export interface ValueMatcher {
  name: string;
  detect: (value: unknown, fieldName?: string) => boolean;
  render: (
    value: unknown,
    fieldName: string,
    onNavigate?: (path: string) => void,
  ) => React.ReactNode;
  priority?: number;
}
