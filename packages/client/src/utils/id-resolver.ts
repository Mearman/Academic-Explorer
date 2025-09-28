/**
 * Comprehensive External ID Resolver and Validation Utilities
 *
 * Provides validation, normalization, and type detection for external identifiers
 * used in academic research including DOI, ORCID, ROR, ISSN, PMID, and Wikidata.
 *
 * This utility complements the EntityDetectionService by providing granular
 * validation functions and enhanced normalization capabilities.
 */

import { isString, isNonEmptyString } from '@academic-explorer/utils';

/**
 * Supported external identifier types
 */
export type ExternalIdType =
  | 'doi'
  | 'orcid'
  | 'ror'
  | 'issn'
  | 'pmid'
  | 'wikidata'
  | 'openalex'
  | 'unknown';

/**
 * Validation result for external identifiers
 */
export interface IdValidationResult {
  /** Whether the identifier is valid */
  isValid: boolean;
  /** Detected identifier type */
  type: ExternalIdType;
  /** Normalized identifier (null if invalid) */
  normalized: string | null;
  /** Original input identifier */
  original: string;
  /** Error message if validation failed */
  error?: string;
  /** Additional metadata about the identifier */
  metadata?: {
    /** URL format if applicable */
    url?: string;
    /** Checksum validation result (for ORCID, ISSN) */
    checksumValid?: boolean;
    /** Entity type for OpenAlex IDs */
    entityType?: string;
  };
}

/**
 * Configuration for ID validation behavior
 */
export interface IdValidationConfig {
  /** Whether to validate checksums for ORCID and ISSN */
  validateChecksums: boolean;
  /** Whether to normalize to URL format when possible */
  preferUrls: boolean;
  /** Custom validation patterns (experimental) */
  customPatterns?: Record<string, RegExp>;
}

/**
 * Pattern definition for identifier validation
 */
interface IdPattern {
  /** Human-readable name */
  name: string;
  /** Identifier type */
  type: ExternalIdType;
  /** Validation patterns (most specific first) */
  patterns: RegExp[];
  /** Normalization function */
  normalize: (match: string, config?: IdValidationConfig) => string | null;
  /** Validation function (optional, for checksum validation) */
  validate?: (normalized: string) => boolean;
  /** Examples for documentation */
  examples: string[];
  /** Description */
  description: string;
}

/**
 * Comprehensive External ID Resolver
 *
 * Provides validation, normalization, and detection for external identifiers
 * commonly used in academic research and publishing.
 */
export class IdResolver {
  private readonly config: IdValidationConfig;

  /** Comprehensive ID validation patterns */
  private static readonly patterns: IdPattern[] = [
    // DOI - Digital Object Identifier
    {
      name: 'DOI',
      type: 'doi',
      patterns: [
        /^doi:(10\.\d+\/[^\s]+)$/i,
        /^(10\.\d+\/[^\s]+)$/,
        /^https?:\/\/doi\.org\/(10\.\d+\/[^\s]+)$/i,
        /^https?:\/\/dx\.doi\.org\/(10\.\d+\/[^\s]+)$/i,
      ],
      normalize: (match: string, config?: IdValidationConfig): string | null => {
        let doi = match.trim();

        // Remove doi: prefix
        if (doi.toLowerCase().startsWith('doi:')) {
          doi = doi.substring(4);
        }

        // Extract from URL
        const urlMatch = doi.match(/https?:\/\/(?:dx\.)?doi\.org\/(.+)$/i);
        if (urlMatch) {
          doi = urlMatch[1];
        }

        // Validate DOI format (10.xxxx/yyyy)
        if (!/^10\.\d+\/[^\s]+$/.test(doi)) {
          return null;
        }

        // Return URL format if preferred, otherwise canonical format
        return config?.preferUrls ? `https://doi.org/${doi}` : doi;
      },
      examples: [
        '10.1038/nature12373',
        'doi:10.1038/nature12373',
        'https://doi.org/10.1038/nature12373'
      ],
      description: 'Digital Object Identifier for academic works'
    },

    // ORCID - Open Researcher and Contributor ID
    {
      name: 'ORCID',
      type: 'orcid',
      patterns: [
        /^(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i,
        /^https?:\/\/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i,
        /orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i,
      ],
      normalize: (match: string, _config?: IdValidationConfig): string | null => {
        const orcidMatch = match.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i);
        if (!orcidMatch) return null;

        const orcid = orcidMatch[1].toUpperCase();

        // Validate ORCID format
        if (!/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(orcid)) {
          return null;
        }

        // Always return URL format for ORCID
        return `https://orcid.org/${orcid}`;
      },
      validate: (normalized: string): boolean => {
        const orcid = normalized.replace('https://orcid.org/', '');
        return IdResolver.validateOrcidChecksum(orcid);
      },
      examples: [
        '0000-0002-1825-0097',
        'https://orcid.org/0000-0002-1825-0097'
      ],
      description: 'ORCID identifier for researchers and contributors'
    },

    // OpenAlex IDs - Check BEFORE ROR to avoid conflicts (I prefix)
    {
      name: 'OpenAlex',
      type: 'openalex',
      patterns: [
        /^https?:\/\/openalex\.org\/([WASIPCFKQT]\d+)$/i,
        /^([WASIPCFKQT]\d+)$/i,
      ],
      normalize: (match: string, config?: IdValidationConfig): string | null => {
        let openalexId = match.trim();

        // Extract from URL
        const urlMatch = openalexId.match(/openalex\.org\/([WASIPCFKQT]\d+)$/i);
        if (urlMatch) {
          openalexId = urlMatch[1];
        }

        // Validate OpenAlex format - flexible length but must have prefix + digits
        if (!/^[WASIPCFKQT]\d+$/i.test(openalexId)) {
          return null;
        }

        // Minimum length validation (most are 8+ digits, topics can be 4+)
        const prefix = openalexId[0].toUpperCase();
        const digits = openalexId.slice(1);

        if (prefix === 'T' && digits.length < 4) {
          return null; // Topics need at least 4 digits
        } else if (prefix !== 'T' && digits.length < 6) {
          return null; // Others need at least 6 digits (more flexible than 8)
        }

        openalexId = openalexId.toUpperCase();

        // Return URL format if preferred, otherwise bare ID
        return config?.preferUrls ?
          `https://openalex.org/${openalexId}` :
          openalexId;
      },
      examples: [
        'W2741809807',
        'https://openalex.org/W2741809807'
      ],
      description: 'OpenAlex identifier (W=works, A=authors, S=sources, I=institutions, etc.)'
    },

    // ROR - Research Organization Registry (check AFTER OpenAlex to avoid I prefix conflicts)
    {
      name: 'ROR',
      type: 'ror',
      patterns: [
        /^https?:\/\/ror\.org\/([a-z0-9]{9})$/i,
        /^ror\.org\/([a-z0-9]{9})$/i,
        // Only match bare ROR IDs that don't start with OpenAlex prefixes
        /^(?![WASIPCFKQT])([a-z0-9]{9})$/i,
      ],
      normalize: (match: string): string | null => {
        let rorId = match.trim();

        // Extract ROR ID from URL
        const urlMatch = rorId.match(/ror\.org\/([a-z0-9]{9})$/i);
        if (urlMatch) {
          rorId = urlMatch[1];
        }

        // Validate ROR format (exactly 9 chars, alphanumeric, must contain letter)
        if (!/^[a-z0-9]{9}$/i.test(rorId) || !/[a-z]/i.test(rorId)) {
          return null;
        }

        // Additional check: ROR IDs shouldn't start with OpenAlex prefixes
        if (/^[WASIPCFKQT]/i.test(rorId)) {
          return null;
        }

        // Always return URL format for ROR
        return `https://ror.org/${rorId.toLowerCase()}`;
      },
      examples: [
        '05dxps055',
        'https://ror.org/05dxps055'
      ],
      description: 'Research Organization Registry identifier'
    },

    // ISSN - International Standard Serial Number
    {
      name: 'ISSN',
      type: 'issn',
      patterns: [
        /^(\d{4}-\d{3}[0-9X])$/i,
        /^ISSN\s*:?\s*(\d{4}-\d{3}[0-9X])$/i,
      ],
      normalize: (match: string): string | null => {
        const issnMatch = match.match(/(\d{4}-\d{3}[0-9X])/i);
        if (!issnMatch) return null;

        const issn = issnMatch[1].toUpperCase();

        // Validate ISSN format
        if (!/^\d{4}-\d{3}[0-9X]$/i.test(issn)) {
          return null;
        }

        return issn;
      },
      validate: (normalized: string): boolean => {
        return IdResolver.validateIssnChecksum(normalized);
      },
      examples: [
        '2049-3630',
        'ISSN: 2049-3630'
      ],
      description: 'International Standard Serial Number for periodicals'
    },

    // PMID - PubMed Identifier
    {
      name: 'PMID',
      type: 'pmid',
      patterns: [
        /^PMID\s*:?\s*(\d+)$/i,
        /^(\d{7,8})$/,  // PMIDs are typically 7-8 digits
        /^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)\/?$/i,
      ],
      normalize: (match: string, config?: IdValidationConfig): string | null => {
        let pmid = match.trim();

        // Remove PMID: prefix
        if (pmid.toLowerCase().startsWith('pmid')) {
          const pmidMatch = pmid.match(/pmid\s*:?\s*(\d+)$/i);
          if (pmidMatch) {
            pmid = pmidMatch[1];
          }
        }

        // Extract from PubMed URL
        const urlMatch = pmid.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
        if (urlMatch) {
          pmid = urlMatch[1];
        }

        // Validate PMID (must be numeric, typically 7-8 digits)
        if (!/^\d{1,8}$/.test(pmid)) {
          return null;
        }

        // Convert to number and back to ensure valid
        const pmidNum = parseInt(pmid, 10);
        if (pmidNum <= 0) {
          return null;
        }

        // Return URL format if preferred, otherwise just the number
        return config?.preferUrls ?
          `https://pubmed.ncbi.nlm.nih.gov/${pmidNum}/` :
          pmidNum.toString();
      },
      examples: [
        'PMID: 12345678',
        '12345678',
        'https://pubmed.ncbi.nlm.nih.gov/12345678/'
      ],
      description: 'PubMed identifier for biomedical literature'
    },

    // Wikidata - Wikidata entity identifiers
    {
      name: 'Wikidata',
      type: 'wikidata',
      patterns: [
        /^Q(\d+)$/,
        /^https?:\/\/www\.wikidata\.org\/wiki\/Q(\d+)$/i,
        /^https?:\/\/www\.wikidata\.org\/entity\/Q(\d+)$/i,
      ],
      normalize: (match: string, config?: IdValidationConfig): string | null => {
        let wikidataId = match.trim();

        // Extract Q number from URL
        const urlMatch = wikidataId.match(/wikidata\.org\/(?:wiki|entity)\/Q(\d+)$/i);
        if (urlMatch) {
          wikidataId = `Q${urlMatch[1]}`;
        }

        // Validate Wikidata format (Q followed by digits)
        if (!/^Q\d+$/.test(wikidataId)) {
          return null;
        }

        // Return URL format if preferred, otherwise Q notation
        return config?.preferUrls ?
          `https://www.wikidata.org/wiki/${wikidataId}` :
          wikidataId;
      },
      examples: [
        'Q42',
        'https://www.wikidata.org/wiki/Q42'
      ],
      description: 'Wikidata entity identifier'
    }
  ];

  constructor(config: Partial<IdValidationConfig> = {}) {
    this.config = {
      validateChecksums: true,
      preferUrls: false,
      ...config
    };
  }

  /**
   * Validate and normalize any external identifier
   */
  validateId(id: unknown): IdValidationResult {
    // Basic type validation
    if (!isString(id) || !isNonEmptyString(id)) {
      return {
        isValid: false,
        type: 'unknown',
        normalized: null,
        original: String(id),
        error: 'Identifier must be a non-empty string'
      };
    }

    const trimmedId = id.trim();

    // Try each pattern
    for (const pattern of IdResolver.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(trimmedId)) {
          try {
            const normalized = pattern.normalize(trimmedId, this.config);

            if (normalized === null) {
              continue; // Pattern matched but normalization failed
            }

            // Perform checksum validation if available and enabled
            let checksumValid: boolean | undefined;
            if (this.config.validateChecksums && pattern.validate) {
              checksumValid = pattern.validate(normalized);
              if (!checksumValid) {
                return {
                  isValid: false,
                  type: pattern.type,
                  normalized: null,
                  original: trimmedId,
                  error: `Invalid ${pattern.name} checksum`,
                  metadata: { checksumValid: false }
                };
              }
            }

            // Determine URL format
            const url = this.getUrlFormat(normalized, pattern.type);

            // Determine additional metadata
            const metadata: IdValidationResult['metadata'] = {
              url,
              checksumValid
            };

            // Add entity type for OpenAlex IDs
            if (pattern.type === 'openalex') {
              const entityType = this.getOpenAlexEntityType(normalized);
              if (entityType) {
                metadata.entityType = entityType;
              }
            }

            return {
              isValid: true,
              type: pattern.type,
              normalized,
              original: trimmedId,
              metadata
            };

          } catch {
            // Continue to next pattern on normalization error
            continue;
          }
        }
      }
    }

    return {
      isValid: false,
      type: 'unknown',
      normalized: null,
      original: trimmedId,
      error: 'Unrecognized identifier format'
    };
  }

  /**
   * Batch validate multiple identifiers
   */
  validateIds(ids: unknown[]): IdValidationResult[] {
    return ids.map(id => this.validateId(id));
  }

  /**
   * Check if an identifier is valid for a specific type
   */
  isValidType(id: string, type: ExternalIdType): boolean {
    const result = this.validateId(id);
    return result.isValid && result.type === type;
  }

  /**
   * Get the URL format for an identifier
   */
  private getUrlFormat(normalized: string, type: ExternalIdType): string | undefined {
    switch (type) {
      case 'doi':
        return normalized.startsWith('https://') ? normalized : `https://doi.org/${normalized}`;
      case 'orcid':
        return normalized.startsWith('https://') ? normalized : `https://orcid.org/${normalized}`;
      case 'ror':
        return normalized.startsWith('https://') ? normalized : `https://ror.org/${normalized}`;
      case 'pmid':
        return normalized.startsWith('https://') ? normalized : `https://pubmed.ncbi.nlm.nih.gov/${normalized}/`;
      case 'wikidata':
        return normalized.startsWith('https://') ? normalized : `https://www.wikidata.org/wiki/${normalized}`;
      case 'openalex':
        return normalized.startsWith('https://') ? normalized : `https://openalex.org/${normalized}`;
      case 'issn':
        // ISSN doesn't have a standard URL format
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Get OpenAlex entity type from ID prefix
   */
  private getOpenAlexEntityType(id: string): string | undefined {
    const prefixMatch = id.match(/^([WASIPCFKQT])/i);
    if (!prefixMatch) return undefined;

    const prefixMap: Record<string, string> = {
      'W': 'works',
      'A': 'authors',
      'S': 'sources',
      'I': 'institutions',
      'P': 'publishers',
      'C': 'concepts',
      'F': 'funders',
      'T': 'topics',
      'K': 'keywords',
      'Q': 'keywords'
    };

    return prefixMap[prefixMatch[1].toUpperCase()];
  }

  // Individual validation functions

  /**
   * Validate DOI identifier
   */
  isValidDOI(id: string): boolean {
    return this.isValidType(id, 'doi');
  }

  /**
   * Validate ORCID identifier
   */
  isValidORCID(id: string): boolean {
    return this.isValidType(id, 'orcid');
  }

  /**
   * Validate ROR identifier
   */
  isValidROR(id: string): boolean {
    return this.isValidType(id, 'ror');
  }

  /**
   * Validate ISSN identifier
   */
  isValidISSN(id: string): boolean {
    return this.isValidType(id, 'issn');
  }

  /**
   * Validate PMID identifier
   */
  isValidPMID(id: string): boolean {
    return this.isValidType(id, 'pmid');
  }

  /**
   * Validate Wikidata identifier
   */
  isValidWikidata(id: string): boolean {
    return this.isValidType(id, 'wikidata');
  }

  /**
   * Validate OpenAlex identifier
   */
  isValidOpenAlex(id: string): boolean {
    return this.isValidType(id, 'openalex');
  }

  // Normalization functions

  /**
   * Normalize identifier to standard format
   */
  normalizeId(id: string, type?: ExternalIdType): string | null {
    if (type) {
      // If type is specified, only check patterns for that type
      const patterns = IdResolver.patterns.filter(p => p.type === type);
      for (const pattern of patterns) {
        for (const regex of pattern.patterns) {
          if (regex.test(id)) {
            return pattern.normalize(id, this.config);
          }
        }
      }
      return null;
    }

    // Otherwise use general validation
    const result = this.validateId(id);
    return result.normalized;
  }

  /**
   * Normalize identifier to URL format
   */
  normalizeToUrl(id: string): string | null {
    const result = this.validateId(id);
    return result.isValid ? result.metadata?.url || null : null;
  }

  /**
   * Get supported identifier types and their information
   */
  static getSupportedTypes(): Array<{
    type: ExternalIdType;
    name: string;
    description: string;
    examples: string[];
  }> {
    return IdResolver.patterns.map(pattern => ({
      type: pattern.type,
      name: pattern.name,
      description: pattern.description,
      examples: pattern.examples
    }));
  }

  // Checksum validation utilities

  /**
   * Validate ORCID checksum using mod-11-2 algorithm
   */
  private static validateOrcidChecksum(orcid: string): boolean {
    // Remove hyphens for calculation
    const digits = orcid.replace(/-/g, '');

    // Extract check digit (last character)
    const checkDigit = digits.slice(-1);
    const baseDigits = digits.slice(0, -1);

    // Calculate checksum using mod-11-2 algorithm
    let total = 0;
    for (const digit of baseDigits) {
      total = (total + parseInt(digit, 10)) * 2;
    }

    const remainder = total % 11;
    const result = (12 - remainder) % 11;
    const expectedCheckDigit = result === 10 ? 'X' : result.toString();

    return checkDigit === expectedCheckDigit;
  }

  /**
   * Validate ISSN checksum using mod-11 algorithm
   */
  private static validateIssnChecksum(issn: string): boolean {
    // Remove hyphen for calculation
    const digits = issn.replace(/-/g, '');

    // Extract check digit (last character)
    const checkDigit = digits.slice(-1);
    const baseDigits = digits.slice(0, -1);

    // Calculate checksum using mod-11 algorithm
    let total = 0;
    for (let i = 0; i < baseDigits.length; i++) {
      total += parseInt(baseDigits[i], 10) * (8 - i);
    }

    const remainder = total % 11;
    const result = remainder === 0 ? 0 : 11 - remainder;
    const expectedCheckDigit = result === 10 ? 'X' : result.toString();

    return checkDigit === expectedCheckDigit;
  }
}

// Convenience functions for direct usage
export function createIdResolver(config?: Partial<IdValidationConfig>): IdResolver {
  return new IdResolver(config);
}

// Export individual validation functions as standalone utilities
const defaultResolver = new IdResolver();

export const isValidDOI = (id: string): boolean => defaultResolver.isValidDOI(id);
export const isValidORCID = (id: string): boolean => defaultResolver.isValidORCID(id);
export const isValidROR = (id: string): boolean => defaultResolver.isValidROR(id);
export const isValidISSN = (id: string): boolean => defaultResolver.isValidISSN(id);
export const isValidPMID = (id: string): boolean => defaultResolver.isValidPMID(id);
export const isValidWikidata = (id: string): boolean => defaultResolver.isValidWikidata(id);
export const isValidOpenAlex = (id: string): boolean => defaultResolver.isValidOpenAlex(id);

export const validateExternalId = (id: unknown): IdValidationResult => defaultResolver.validateId(id);
export const normalizeExternalId = (id: string, type?: ExternalIdType): string | null => defaultResolver.normalizeId(id, type);
export const normalizeToUrl = (id: string): string | null => defaultResolver.normalizeToUrl(id);