/**
 * Field type detection and value matching utilities for intelligent entity rendering
 */

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "string[]"
  | "number[]"
  | "boolean[]"
  | "object"
  | "object[]"
  | "url"
  | "id"
  | "date"
  | "email"
  | "unknown";

/**
 * Detects the type of a field value
 */
export function detectFieldType(value: unknown): FieldType {
  if (value === null || value === undefined) return "unknown";

  // Check for arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown";

    const firstItem = value[0];
    if (typeof firstItem === "string") return "string[]";
    if (typeof firstItem === "number") return "number[]";
    if (typeof firstItem === "boolean") return "boolean[]";
    return "object[]";
  }

  // Check for objects
  if (typeof value === "object") return "object";

  // Check for primitives
  if (typeof value === "string") {
    if (isUrl(value)) return "url";
    if (isEmail(value)) return "email";
    if (isDate(value)) return "date";
    if (isId(value)) return "id";
    return "string";
  }

  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";

  return "unknown";
}

/**
 * Value pattern matchers for special types
 */
export function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isDate(value: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}/;
  return dateRegex.test(value) && !isNaN(Date.parse(value));
}

export function isId(value: string): boolean {
  // OpenAlex IDs start with entity type prefix
  const openAlexIdRegex = /^[A-Z][a-z]+:[A-Z0-9]+$/;
  return openAlexIdRegex.test(value);
}

export function isDoi(value: string): boolean {
  const doiRegex = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
  return doiRegex.test(value);
}

export function isOrcid(value: string): boolean {
  const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
  return orcidRegex.test(value);
}

export function isRor(value: string): boolean {
  const rorRegex = /^0[a-zA-Z0-9]{8}$/;
  return rorRegex.test(value);
}

export function isIssn(value: string): boolean {
  const issnRegex = /^\d{4}-\d{3}[\dX]$/;
  return issnRegex.test(value);
}

/**
 * Field priority for display ordering
 */
export type FieldPriority = "high" | "medium" | "low";

export function getFieldPriority(fieldName: string): FieldPriority {
  const highPriorityFields = [
    "display_name",
    "title",
    "name",
    "id",
    "orcid",
    "doi",
    "ror",
    "works_count",
    "cited_by_count",
    "type",
    "publication_year",
    "topic_share",
  ];

  const mediumPriorityFields = [
    "abstract",
    "description",
    "publisher",
    "journal",
    "country_code",
    "city",
    "homepage_url",
    "summary_stats",
    "last_known_institutions",
  ];

  if (highPriorityFields.includes(fieldName)) return "high";
  if (mediumPriorityFields.includes(fieldName)) return "low"; // Changed from medium to low for better grouping
  return "medium";
}

/**
 * Field grouping for organizing related fields
 */
export type FieldGroup =
  | "header" // Title and primary identifiers
  | "metrics" // Counts and statistics
  | "identifiers" // IDs, DOIs, ORCIDs, etc.
  | "content" // Main content like abstract
  | "relationships" // Authors, institutions, affiliations
  | "metadata" // Dates, URLs, technical info
  | "temporal" // Time-based data like counts_by_year
  | "other"; // Everything else

export function getFieldGroup(fieldName: string): FieldGroup {
  const groupMappings: Record<string, FieldGroup> = {
    // Header
    display_name: "header",
    title: "header",
    name: "header",

    // Metrics
    works_count: "metrics",
    cited_by_count: "metrics",
    summary_stats: "metrics",

    // Identifiers
    id: "identifiers",
    ids: "identifiers",
    orcid: "identifiers",
    doi: "identifiers",
    ror: "identifiers",
    issn: "identifiers",
    issn_l: "identifiers",

    // Content
    abstract: "content",
    description: "content",

    // Relationships
    authorships: "relationships",
    authors: "relationships",
    last_known_institutions: "relationships",
    affiliations: "relationships",
    institutions: "relationships",

    // Metadata
    type: "metadata",
    publisher: "metadata",
    country_code: "metadata",
    city: "metadata",
    homepage_url: "metadata",
    updated_date: "metadata",
    created_date: "metadata",

    // Temporal
    counts_by_year: "temporal",
    publication_year: "temporal",
    publication_date: "temporal",

    // Topics
    topic_share: "relationships",
    topics: "relationships",
  };

  return groupMappings[fieldName] || "other";
}

/**
 * Group fields by priority for organized display
 */
export function groupFields(entity: Record<string, unknown> | object): {
  high: [string, unknown][];
  medium: [string, unknown][];
  low: [string, unknown][];
} {
  const fields = Object.entries(entity);
  const grouped = {
    high: [] as [string, unknown][],
    medium: [] as [string, unknown][],
    low: [] as [string, unknown][],
  };

  for (const [fieldName, value] of fields) {
    const priority = getFieldPriority(fieldName);
    grouped[priority].push([fieldName, value]);
  }

  return grouped;
}

/**
 * Format field names for display
 */
export function formatFieldName(fieldName: string): string {
  // Handle special cases
  const specialNames: Record<string, string> = {
    display_name: "Name",
    cited_by_count: "Citations",
    works_count: "Works",
    publication_year: "Publication Year",
    country_code: "Country",
    last_known_institutions: "Institutions",
    counts_by_year: "Citation History",
    summary_stats: "Statistics",
    x_concepts: "Concepts",
    topic_share: "Topic Share",
    is_oa: "Open Access",
    is_in_doaj: "DOAJ Listed",
    apc_usd: "APC Price (USD)",
    works_api_url: "API URL",
    ror: "ROR ID",
    issn_l: "ISSN-L",
    "2yr_mean_citedness": "2-Year Mean Citedness",
    i10_index: "i10 Index",
  };

  if (specialNames[fieldName]) return specialNames[fieldName];

  // Convert camelCase and snake_case to Title Case
  return fieldName
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase
    .replace(/_/g, " ") // snake_case
    .replace(/\b\w/g, (l) => l.toUpperCase()); // Title case
}
