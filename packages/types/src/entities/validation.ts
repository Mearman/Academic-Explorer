/**
 * Validation functions for OpenAlex API data
 */

/**
 * Basic ID validation functions
 */
export function isOpenAlexId(id: string): boolean {
  return /^https:\/\/openalex\.org\/[A-Z]\d+$/.test(id);
}

export function isValidDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function isValidDOI(doi: string): boolean {
  return doi.startsWith("10.") && doi.includes("/");
}

export function isValidORCID(orcid: string): boolean {
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid);
}

export function isValidROR(ror: string): boolean {
  return ror.startsWith("https://ror.org/") || ror.startsWith("0");
}

export function isValidISSN(issn: string): boolean {
  return /^\d{4}-\d{3}[\dX]$/.test(issn);
}

export function isValidWikidataId(id: string): boolean {
  return id.startsWith("Q") && /^\d+$/.test(id.substring(1));
}
