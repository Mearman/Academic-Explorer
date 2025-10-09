/**
 * Query parser for Academic Explorer search functionality
 * Handles quotes, wildcards (*), and field prefixes (title:, author:)
 */

export interface QueryTerm {
  value: string;
  isWildcard: boolean;
  isQuoted: boolean;
}

export interface FieldQuery extends QueryTerm {
  field: string;
}

export interface ParsedQuery {
  fieldQueries: FieldQuery[];
  generalTerms: QueryTerm[];
}

/**
 * Parse a search query string into structured components
 *
 * Supports:
 * - Quoted phrases: "machine learning"
 * - Wildcards: *AI*, machine*, *learning
 * - Field queries: title:value, author:"John Smith", title: "quoted value"
 *
 * @param query - The search query string to parse
 * @returns Parsed query object with field queries and general terms
 *
 * @example
 * ```typescript
 * const result = parseSearchQuery('title:"neural networks" author:smith *AI*');
 * // result.fieldQueries: [
 * //   { field: 'title', value: 'neural networks', isWildcard: false, isQuoted: true },
 * //   { field: 'author', value: 'smith', isWildcard: false, isQuoted: false }
 * // ]
 * // result.generalTerms: [
 * //   { value: '*AI*', isWildcard: true, isQuoted: false }
 * // ]
 * ```
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const fieldQueries: FieldQuery[] = [];
  const generalTerms: QueryTerm[] = [];

  // Early return for empty/whitespace-only queries
  if (!query || !query.trim()) {
    return { fieldQueries, generalTerms };
  }

  const tokens = tokenizeQuery(query);
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (tryParseFieldQueryWithSpace(tokens, i, fieldQueries)) {
      i += 2; // Skip both field and value tokens
    } else if (tryParseFieldQueryInOneToken(token, fieldQueries)) {
      i++;
    } else {
      processGeneralTerm(token, generalTerms);
      i++;
    }
  }

  return { fieldQueries, generalTerms };
}

function tokenizeQuery(query: string): string[] {
  // Regex to match different token types in order of priority:
  // 1. Field queries with quoted values (field:"quoted value")
  // 2. Standalone quoted strings ("quoted value")
  // 3. Other non-whitespace tokens
  const tokenRegex = /\S+:"[^"]*"|"[^"]*"|\S+/g;
  return query.match(tokenRegex) || [];
}

function tryParseFieldQueryWithSpace(
  tokens: string[],
  index: number,
  fieldQueries: FieldQuery[],
): boolean {
  const token = tokens[index];

  // Check if this token ends with colon (field prefix with space)
  if (!token.endsWith(":") || index + 1 >= tokens.length) {
    return false;
  }

  const field = token.slice(0, -1);

  // Validate field name (alphanumeric and underscore only)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
    return false;
  }

  const nextToken = tokens[index + 1];
  const fieldQuery = createFieldQuery(field, nextToken);
  fieldQueries.push(fieldQuery);
  return true;
}

function tryParseFieldQueryInOneToken(
  token: string,
  fieldQueries: FieldQuery[],
): boolean {
  // Check if this is a field query in one token (format: field:value)
  const fieldMatch = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*):(.+)$/);

  if (fieldMatch) {
    const [, field, value] = fieldMatch;
    const fieldQuery = createFieldQuery(field, value);
    fieldQueries.push(fieldQuery);
    return true;
  }

  return false;
}

function createFieldQuery(field: string, value: string): FieldQuery {
  const isQuoted = value.startsWith('"') && value.endsWith('"');
  const cleanValue = isQuoted ? value.slice(1, -1) : value;
  const isWildcard = cleanValue.includes("*");

  return {
    field,
    value: cleanValue,
    isWildcard,
    isQuoted,
  };
}

/**
 * Process a token as a general term and add it to the generalTerms array
 */
function processGeneralTerm(token: string, generalTerms: QueryTerm[]): void {
  const isQuoted = token.startsWith('"') && token.endsWith('"');
  const cleanValue = isQuoted ? token.slice(1, -1) : token;
  const isWildcard = cleanValue.includes("*");

  generalTerms.push({
    value: cleanValue,
    isWildcard,
    isQuoted,
  });
}

/**
 * Type guard to check if a query term is a field query
 */
export function isFieldQuery(term: QueryTerm | FieldQuery): term is FieldQuery {
  return "field" in term;
}

/**
 * Get all unique field names from parsed query
 */
export function getQueryFields(parsedQuery: ParsedQuery): string[] {
  return Array.from(new Set(parsedQuery.fieldQueries.map((fq) => fq.field)));
}

/**
 * Get field queries for a specific field
 */
export function getFieldQueries(
  parsedQuery: ParsedQuery,
  field: string,
): FieldQuery[] {
  return parsedQuery.fieldQueries.filter((fq) => fq.field === field);
}

/**
 * Check if the parsed query contains any wildcards
 */
export function hasWildcards(parsedQuery: ParsedQuery): boolean {
  return (
    parsedQuery.fieldQueries.some((fq) => fq.isWildcard) ||
    parsedQuery.generalTerms.some((gt) => gt.isWildcard)
  );
}
