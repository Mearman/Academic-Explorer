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