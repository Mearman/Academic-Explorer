/**
 * Entity Detection Service
 *
 * Detects and normalizes various external identifier formats into OpenAlex entity types and IDs.
 * Supports DOI, ORCID, ROR, ISSN, OpenAlex URLs and direct OpenAlex IDs.
 *
 * Pure service with no external dependencies - all logic based on regex patterns
 * and identifier format specifications.
 */

import type { EntityType } from '../types/core';

/**
 * Detection result containing the detected entity type and normalized identifier
 */
export interface DetectionResult {
  entityType: EntityType;
  normalizedId: string;
  originalInput: string;
  detectionMethod: string;
}

/**
 * Identifier validation patterns and their corresponding entity types
 */
interface IdentifierPattern {
  name: string;
  entityType: EntityType;
  patterns: RegExp[];
  normalize: (match: string) => string | null;
}

/**
 * Comprehensive entity detection service for various identifier formats
 */
export class EntityDetectionService {
  private static readonly patterns: IdentifierPattern[] = [
    // OpenAlex URLs - extract from full URLs (most specific first)
    {
      name: 'OpenAlex URL',
      entityType: 'works', // Will be overridden by prefix detection
      patterns: [
        /^https?:\/\/openalex\.org\/([WASIPCFKQT]\d+)$/i,
        /openalex\.org\/([WASIPCFKQT]\d+)/i,
      ],
      normalize: (match: string): string | null => {
        const idMatch = match.match(/([WASIPCFKQT]\d+)/i);
        return idMatch ? idMatch[1].toUpperCase() : null;
      },
    },

    // OpenAlex Direct IDs - W, A, S, I, P, C, F, T, K prefixes (flexible length for topics)
    {
      name: 'OpenAlex ID',
      entityType: 'works', // Will be overridden by prefix detection
      patterns: [
        /^([WASIPCFKQ]\d{8,})\/?$/i, // Standard IDs need 8+ digits, optional trailing slash
        /^([T]\d{4,})\/?$/i, // Topics can be shorter (T10546), optional trailing slash
      ],
      normalize: (match: string): string | null => {
        // Remove trailing slash and convert to uppercase
        return match.replace(/\/$/, '').toUpperCase();
      },
    },

    // DOI patterns - various formats
    {
      name: 'DOI',
      entityType: 'works',
      patterns: [
        /^doi:(10\.\d+\/[^\s]+)$/i,
        /^(10\.\d+\/[^\s]+)$/,
        /^https?:\/\/doi\.org\/(10\.\d+\/[^\s]+)$/i,
        /^https?:\/\/dx\.doi\.org\/(10\.\d+\/[^\s]+)$/i,
      ],
      normalize: (match: string): string | null => {
        // Extract DOI part from various formats
        let doi = match;

        if (doi.toLowerCase().startsWith('doi:')) {
          doi = doi.substring(4);
        }

        const urlMatch = doi.match(/https?:\/\/(?:dx\.)?doi\.org\/(.+)$/i);
        if (urlMatch) {
          doi = urlMatch[1];
        }

        // Validate DOI format
        if (/^10\.\d+\/[^\s]+$/.test(doi)) {
          return doi;
        }

        return null;
      },
    },

    // ORCID patterns
    {
      name: 'ORCID',
      entityType: 'authors',
      patterns: [
        /^(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i,
        /^https?:\/\/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i,
        /orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i,
      ],
      normalize: (match: string): string | null => {
        // Extract ORCID from URL if present
        const orcidMatch = match.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i);
        if (orcidMatch) {
          const orcid = orcidMatch[1].toUpperCase();
          // Validate ORCID checksum (basic format check)
          if (this.validateOrcidFormat(orcid)) {
            return `https://orcid.org/${orcid}`;
          }
        }
        return null;
      },
    },

    // ISSN patterns (before ROR to avoid conflicts)
    {
      name: 'ISSN',
      entityType: 'sources',
      patterns: [
        /^(\d{4}-\d{3}[0-9X])$/i,
        /^ISSN\s*:?\s*(\d{4}-\d{3}[0-9X])$/i,
      ],
      normalize: (match: string): string | null => {
        const issnMatch = match.match(/(\d{4}-\d{3}[0-9X])/i);
        if (issnMatch) {
          const issn = issnMatch[1].toUpperCase();
          // Basic ISSN format validation
          if (this.validateIssnFormat(issn)) {
            return issn;
          }
        }
        return null;
      },
    },

    // ROR patterns (URLs first, then more restrictive plain ID)
    {
      name: 'ROR',
      entityType: 'institutions',
      patterns: [
        /^https?:\/\/ror\.org\/([a-z0-9]{9})$/i,
        /^ror\.org\/([a-z0-9]{9})$/i,
        // Raw ROR ID - must be exactly 9 chars and mixed alphanumeric (contains letters)
        /^([a-z0-9]*[a-z][a-z0-9]*|[0-9]*[a-z][0-9a-z]*)$/i,
      ],
      normalize: (match: string): string | null => {
        let rorId = match;

        // Extract ROR ID from URL
        const urlMatch = rorId.match(/ror\.org\/([a-z0-9]{9})$/i);
        if (urlMatch) {
          rorId = urlMatch[1];
        }

        // Validate ROR format (exactly 9 characters, alphanumeric, must contain at least one letter)
        if (/^[a-z0-9]{9}$/i.test(rorId) && /[a-z]/i.test(rorId)) {
          return `https://ror.org/${rorId.toLowerCase()}`;
        }

        return null;
      },
    },
  ];

  /**
   * Detect entity type from identifier string
   */
  static detectEntityType(id: string): EntityType | null {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const trimmedId = id.trim();

    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(trimmedId)) {
          // Special handling for OpenAlex IDs - determine type from prefix
          if (pattern.name === 'OpenAlex URL' || pattern.name === 'OpenAlex ID') {
            const entityType = this.detectOpenAlexEntityType(trimmedId);
            if (entityType) {
              return entityType;
            }
          }

          return pattern.entityType;
        }
      }
    }

    return null;
  }

  /**
   * Normalize identifier to standard format
   */
  static normalizeIdentifier(id: string): string | null {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const trimmedId = id.trim();

    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(trimmedId)) {
          try {
            return pattern.normalize.call(this, trimmedId);
          } catch (_error) {
            // Continue to next pattern if normalization fails
            continue;
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if identifier is valid and can be detected
   */
  static isValidIdentifier(id: string): boolean {
    return this.detectEntityType(id) !== null && this.normalizeIdentifier(id) !== null;
  }

  /**
   * Comprehensive detection that returns full result
   */
  static detectEntity(id: string): DetectionResult | null {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const trimmedId = id.trim();
    const entityType = this.detectEntityType(trimmedId);
    const normalizedId = this.normalizeIdentifier(trimmedId);

    if (!entityType || !normalizedId) {
      return null;
    }

    // Find which pattern was used for detection method
    let detectionMethod = 'unknown';
    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(trimmedId)) {
          detectionMethod = pattern.name;
          break;
        }
      }
      if (detectionMethod !== 'unknown') break;
    }

    return {
      entityType,
      normalizedId,
      originalInput: id,
      detectionMethod,
    };
  }

  /**
   * Batch detection for multiple identifiers
   */
  static detectEntities(ids: string[]): DetectionResult[] {
    return ids
      .map(id => this.detectEntity(id))
      .filter((result): result is DetectionResult => result !== null);
  }

  /**
   * Detect OpenAlex entity type from prefix
   */
  private static detectOpenAlexEntityType(id: string): EntityType | null {
    // Extract the prefix from various OpenAlex formats
    let prefix = '';

    // Try URL format first
    const urlMatch = id.match(/openalex\.org\/([WASIPCFKQT])\d+/i);
    if (urlMatch) {
      prefix = urlMatch[1].toUpperCase();
    } else {
      // Try direct ID format
      const idMatch = id.match(/^([WASIPCFKQT])\d+/i);
      if (idMatch) {
        prefix = idMatch[1].toUpperCase();
      }
    }

    // Map prefixes to entity types
    const prefixMap: Record<string, EntityType> = {
      'W': 'works',
      'A': 'authors',
      'S': 'sources',
      'I': 'institutions',
      'P': 'publishers',
      'C': 'concepts',
      'F': 'funders',
      'T': 'topics',
      'K': 'keywords',
      'Q': 'keywords', // Alternative keywords prefix
    };

    return prefixMap[prefix] || null;
  }

  /**
   * Validate ORCID format (basic check - doesn't verify checksum)
   */
  private static validateOrcidFormat(orcid: string): boolean {
    return /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(orcid);
  }

  /**
   * Validate ISSN format (basic check - doesn't verify checksum)
   */
  private static validateIssnFormat(issn: string): boolean {
    return /^\d{4}-\d{3}[0-9X]$/i.test(issn);
  }

  /**
   * Get all supported identifier types and their patterns
   */
  static getSupportedTypes(): Array<{
    name: string;
    entityType: EntityType;
    description: string;
    examples: string[];
  }> {
    return [
      {
        name: 'DOI',
        entityType: 'works',
        description: 'Digital Object Identifier for academic works',
        examples: ['10.1038/nature12373', 'doi:10.1038/nature12373', 'https://doi.org/10.1038/nature12373'],
      },
      {
        name: 'ORCID',
        entityType: 'authors',
        description: 'ORCID identifier for researchers',
        examples: ['0000-0002-1825-0097', 'https://orcid.org/0000-0002-1825-0097'],
      },
      {
        name: 'ROR',
        entityType: 'institutions',
        description: 'Research Organization Registry identifier',
        examples: ['05dxps055', 'https://ror.org/05dxps055'],
      },
      {
        name: 'ISSN',
        entityType: 'sources',
        description: 'International Standard Serial Number for periodicals',
        examples: ['2049-3630', 'ISSN: 2049-3630'],
      },
      {
        name: 'OpenAlex ID',
        entityType: 'works', // varies by prefix
        description: 'Direct OpenAlex identifier (W=works, A=authors, S=sources, I=institutions, P=publishers, C=concepts, F=funders, T=topics, K=keywords)',
        examples: ['W2741809807', 'A5023888391', 'S137773608', 'I17837204'],
      },
      {
        name: 'OpenAlex URL',
        entityType: 'works', // varies by prefix
        description: 'OpenAlex URL format',
        examples: ['https://openalex.org/W2741809807', 'https://openalex.org/A5023888391'],
      },
    ];
  }
}

// Convenience exports for direct function usage
export const detectEntityType = EntityDetectionService.detectEntityType.bind(EntityDetectionService);
export const normalizeIdentifier = EntityDetectionService.normalizeIdentifier.bind(EntityDetectionService);
export const isValidIdentifier = EntityDetectionService.isValidIdentifier.bind(EntityDetectionService);
export const detectEntity = EntityDetectionService.detectEntity.bind(EntityDetectionService);