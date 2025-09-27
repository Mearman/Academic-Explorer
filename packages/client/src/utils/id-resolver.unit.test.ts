/**
 * Tests for the ID Resolver utility
 */

import { describe, expect, test } from 'vitest';
import {
  IdResolver,
  isValidDOI,
  isValidORCID,
  isValidROR,
  isValidISSN,
  isValidPMID,
  isValidWikidata,
  isValidOpenAlex,
  validateExternalId,
  normalizeExternalId,
  normalizeToUrl,
  type ExternalIdType,
  type IdValidationResult
} from './id-resolver';

describe('IdResolver', () => {
  const resolver = new IdResolver();

  describe('DOI validation', () => {
    test('validates DOI formats correctly', () => {
      expect(isValidDOI('10.1038/nature12373')).toBe(true);
      expect(isValidDOI('doi:10.1038/nature12373')).toBe(true);
      expect(isValidDOI('https://doi.org/10.1038/nature12373')).toBe(true);
      expect(isValidDOI('https://dx.doi.org/10.1038/nature12373')).toBe(true);

      expect(isValidDOI('invalid-doi')).toBe(false);
      expect(isValidDOI('10.invalid')).toBe(false);
      expect(isValidDOI('')).toBe(false);
    });

    test('normalizes DOI correctly', () => {
      expect(normalizeExternalId('doi:10.1038/nature12373')).toBe('10.1038/nature12373');
      expect(normalizeExternalId('https://doi.org/10.1038/nature12373')).toBe('10.1038/nature12373');
      expect(normalizeToUrl('10.1038/nature12373')).toBe('https://doi.org/10.1038/nature12373');
    });
  });

  describe('ORCID validation', () => {
    test('validates ORCID formats correctly', () => {
      expect(isValidORCID('0000-0002-1825-0097')).toBe(true);
      expect(isValidORCID('https://orcid.org/0000-0002-1825-0097')).toBe(true);

      expect(isValidORCID('0000-0002-1825-0000')).toBe(false); // Invalid checksum
      expect(isValidORCID('invalid-orcid')).toBe(false);
    });

    test('normalizes ORCID correctly', () => {
      expect(normalizeExternalId('0000-0002-1825-0097')).toBe('https://orcid.org/0000-0002-1825-0097');
      expect(normalizeToUrl('0000-0002-1825-0097')).toBe('https://orcid.org/0000-0002-1825-0097');
    });
  });

  describe('ROR validation', () => {
    test('validates ROR formats correctly', () => {
      expect(isValidROR('05dxps055')).toBe(true);
      expect(isValidROR('https://ror.org/05dxps055')).toBe(true);

      expect(isValidROR('123456789')).toBe(false); // No letters
      expect(isValidROR('invalid-ror')).toBe(false);
    });

    test('normalizes ROR correctly', () => {
      expect(normalizeExternalId('05dxps055')).toBe('https://ror.org/05dxps055');
      expect(normalizeToUrl('05dxps055')).toBe('https://ror.org/05dxps055');
    });
  });

  describe('ISSN validation', () => {
    test('validates ISSN formats correctly', () => {
      expect(isValidISSN('2049-3630')).toBe(true);
      expect(isValidISSN('ISSN: 2049-3630')).toBe(true);

      expect(isValidISSN('2049-3631')).toBe(false); // Invalid checksum
      expect(isValidISSN('invalid-issn')).toBe(false);
    });

    test('normalizes ISSN correctly', () => {
      expect(normalizeExternalId('ISSN: 2049-3630')).toBe('2049-3630');
      expect(normalizeExternalId('2049-3630')).toBe('2049-3630');
    });
  });

  describe('PMID validation', () => {
    test('validates PMID formats correctly', () => {
      expect(isValidPMID('12345678')).toBe(true);
      expect(isValidPMID('PMID: 12345678')).toBe(true);
      expect(isValidPMID('https://pubmed.ncbi.nlm.nih.gov/12345678/')).toBe(true);

      expect(isValidPMID('invalid-pmid')).toBe(false);
      expect(isValidPMID('abc123')).toBe(false);
    });

    test('normalizes PMID correctly', () => {
      expect(normalizeExternalId('PMID: 12345678')).toBe('12345678');
      expect(normalizeExternalId('https://pubmed.ncbi.nlm.nih.gov/12345678/')).toBe('12345678');
      expect(normalizeToUrl('12345678')).toBe('https://pubmed.ncbi.nlm.nih.gov/12345678/');
    });
  });

  describe('Wikidata validation', () => {
    test('validates Wikidata formats correctly', () => {
      expect(isValidWikidata('Q42')).toBe(true);
      expect(isValidWikidata('https://www.wikidata.org/wiki/Q42')).toBe(true);

      expect(isValidWikidata('42')).toBe(false); // Missing Q prefix
      expect(isValidWikidata('invalid-wikidata')).toBe(false);
    });

    test('normalizes Wikidata correctly', () => {
      expect(normalizeExternalId('https://www.wikidata.org/wiki/Q42')).toBe('Q42');
      expect(normalizeToUrl('Q42')).toBe('https://www.wikidata.org/wiki/Q42');
    });
  });

  describe('OpenAlex validation', () => {
    test('validates OpenAlex formats correctly', () => {
      expect(isValidOpenAlex('W2741809807')).toBe(true);
      expect(isValidOpenAlex('A5023888391')).toBe(true);
      expect(isValidOpenAlex('https://openalex.org/W2741809807')).toBe(true);

      expect(isValidOpenAlex('X123456789')).toBe(false); // Invalid prefix
      expect(isValidOpenAlex('W123')).toBe(false); // Too short
    });

    test('normalizes OpenAlex correctly', () => {
      expect(normalizeExternalId('w2741809807')).toBe('W2741809807');
      expect(normalizeExternalId('https://openalex.org/W2741809807')).toBe('W2741809807');
      expect(normalizeToUrl('W2741809807')).toBe('https://openalex.org/W2741809807');
    });
  });

  describe('General validation', () => {
    test('validates mixed identifier types', () => {
      const testCases: Array<{ id: string; expectedType: ExternalIdType }> = [
        { id: '10.1038/nature12373', expectedType: 'doi' },
        { id: '0000-0002-1825-0097', expectedType: 'orcid' },
        { id: '05dxps055', expectedType: 'ror' },
        { id: '2049-3630', expectedType: 'issn' },
        { id: '12345678', expectedType: 'pmid' },
        { id: 'Q42', expectedType: 'wikidata' },
        { id: 'W2741809807', expectedType: 'openalex' }
      ];

      testCases.forEach(({ id, expectedType }) => {
        const result = validateExternalId(id);
        expect(result.isValid).toBe(true);
        expect(result.type).toBe(expectedType);
        expect(result.normalized).toBeTruthy();
      });
    });

    test('handles invalid identifiers', () => {
      const invalidIds = ['', 'invalid', '123', 'not-an-id'];

      invalidIds.forEach(id => {
        const result = validateExternalId(id);
        expect(result.isValid).toBe(false);
        expect(result.type).toBe('unknown');
        expect(result.normalized).toBeNull();
        expect(result.error).toBeTruthy();
      });
    });

    test('handles non-string inputs', () => {
      const invalidInputs = [null, undefined, 123, {}, []];

      invalidInputs.forEach(input => {
        const result = validateExternalId(input);
        expect(result.isValid).toBe(false);
        expect(result.type).toBe('unknown');
        expect(result.normalized).toBeNull();
        expect(result.error).toBe('Identifier must be a non-empty string');
      });
    });
  });

  describe('Configuration options', () => {
    test('respects preferUrls configuration', () => {
      const urlResolver = new IdResolver({ preferUrls: true });

      const doiResult = urlResolver.validateId('10.1038/nature12373');
      expect(doiResult.normalized).toBe('https://doi.org/10.1038/nature12373');

      const pmidResult = urlResolver.validateId('12345678');
      expect(pmidResult.normalized).toBe('https://pubmed.ncbi.nlm.nih.gov/12345678/');
    });

    test('respects validateChecksums configuration', () => {
      const noChecksumResolver = new IdResolver({ validateChecksums: false });

      // This ORCID has an invalid checksum but should pass with validation disabled
      const result = noChecksumResolver.validateId('0000-0002-1825-0000');
      expect(result.isValid).toBe(true); // Would be false with checksum validation
    });
  });

  describe('Batch operations', () => {
    test('validates multiple identifiers', () => {
      const ids = [
        '10.1038/nature12373',
        '0000-0002-1825-0097',
        'invalid-id',
        'W2741809807'
      ];

      const results = resolver.validateIds(ids);
      expect(results).toHaveLength(4);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
      expect(results[2].isValid).toBe(false);
      expect(results[3].isValid).toBe(true);
    });
  });

  describe('Type detection', () => {
    test('detects OpenAlex entity types correctly', () => {
      const testCases = [
        { id: 'W2741809807', expectedEntityType: 'works' },
        { id: 'A5023888391', expectedEntityType: 'authors' },
        { id: 'S137773608', expectedEntityType: 'sources' },
        { id: 'I17837204', expectedEntityType: 'institutions' }
      ];

      testCases.forEach(({ id, expectedEntityType }) => {
        const result = validateExternalId(id);
        expect(result.isValid).toBe(true);
        expect(result.metadata?.entityType).toBe(expectedEntityType);
      });
    });
  });

  describe('Error handling', () => {
    test('provides meaningful error messages', () => {
      const result = validateExternalId('invalid-identifier');
      expect(result.error).toBe('Unrecognized identifier format');

      const emptyResult = validateExternalId('');
      expect(emptyResult.error).toBe('Identifier must be a non-empty string');
    });
  });

  describe('Supported types', () => {
    test('returns comprehensive supported types information', () => {
      const supportedTypes = IdResolver.getSupportedTypes();

      expect(supportedTypes).toHaveLength(7); // All supported types

      const typeNames = supportedTypes.map(t => t.type);
      expect(typeNames).toContain('doi');
      expect(typeNames).toContain('orcid');
      expect(typeNames).toContain('ror');
      expect(typeNames).toContain('issn');
      expect(typeNames).toContain('pmid');
      expect(typeNames).toContain('wikidata');
      expect(typeNames).toContain('openalex');

      // Each type should have examples and description
      supportedTypes.forEach(type => {
        expect(type.examples.length).toBeGreaterThan(0);
        expect(type.description).toBeTruthy();
        expect(type.name).toBeTruthy();
      });
    });
  });
});