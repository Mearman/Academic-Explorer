/**
 * Entity Detection Service Tests
 *
 * Tests all identifier detection patterns, normalization logic,
 * and edge cases for the entity detection service.
 */

import { describe, it, expect } from 'vitest';
import {
  EntityDetectionService,
  detectEntityType,
  normalizeIdentifier,
  isValidIdentifier,
  detectEntity,
  type DetectionResult,
} from './entity-detection-service';

describe('EntityDetectionService', () => {
  describe('detectEntityType', () => {
    describe('OpenAlex IDs', () => {
      it('should detect works from W prefix', () => {
        expect(detectEntityType('W2741809807')).toBe('works');
        expect(detectEntityType('W123456789')).toBe('works');
        expect(detectEntityType('w2741809807')).toBe('works'); // case insensitive
      });

      it('should detect authors from A prefix', () => {
        expect(detectEntityType('A5023888391')).toBe('authors');
        expect(detectEntityType('A123456789')).toBe('authors');
        expect(detectEntityType('a5023888391')).toBe('authors');
      });

      it('should detect sources from S prefix', () => {
        expect(detectEntityType('S137773608')).toBe('sources');
        expect(detectEntityType('S123456789')).toBe('sources');
        expect(detectEntityType('s137773608')).toBe('sources');
      });

      it('should detect institutions from I prefix', () => {
        expect(detectEntityType('I17837204')).toBe('institutions');
        expect(detectEntityType('I123456789')).toBe('institutions');
        expect(detectEntityType('i17837204')).toBe('institutions');
      });

      it('should detect publishers from P prefix', () => {
        expect(detectEntityType('P4310320990')).toBe('publishers');
        expect(detectEntityType('P123456789')).toBe('publishers');
        expect(detectEntityType('p4310320990')).toBe('publishers');
      });

      it('should detect concepts from C prefix', () => {
        expect(detectEntityType('C41008148')).toBe('concepts');
        expect(detectEntityType('C123456789')).toBe('concepts');
        expect(detectEntityType('c41008148')).toBe('concepts');
      });

      it('should detect funders from F prefix', () => {
        expect(detectEntityType('F4320306076')).toBe('funders');
        expect(detectEntityType('F123456789')).toBe('funders');
        expect(detectEntityType('f4320306076')).toBe('funders');
      });

      it('should detect topics from T prefix', () => {
        expect(detectEntityType('T10546')).toBe('topics');
        expect(detectEntityType('T123456789')).toBe('topics');
        expect(detectEntityType('t10546')).toBe('topics');
      });

      it('should detect keywords from K prefix', () => {
        expect(detectEntityType('K12345678')).toBe('keywords');
        expect(detectEntityType('K987654321')).toBe('keywords');
        expect(detectEntityType('k12345678')).toBe('keywords');
      });

      it('should reject invalid OpenAlex IDs', () => {
        expect(detectEntityType('X123456789')).toBeNull(); // Invalid prefix
        expect(detectEntityType('W12345')).toBeNull(); // Too short
        expect(detectEntityType('W')).toBeNull(); // No digits
        expect(detectEntityType('123456789')).toBeNull(); // No prefix
      });
    });

    describe('OpenAlex URLs', () => {
      it('should detect entity types from URLs', () => {
        expect(detectEntityType('https://openalex.org/W2741809807')).toBe('works');
        expect(detectEntityType('https://openalex.org/A5023888391')).toBe('authors');
        expect(detectEntityType('https://openalex.org/S137773608')).toBe('sources');
        expect(detectEntityType('https://openalex.org/I17837204')).toBe('institutions');
        expect(detectEntityType('https://openalex.org/P4310320990')).toBe('publishers');
        expect(detectEntityType('https://openalex.org/C41008148')).toBe('concepts');
        expect(detectEntityType('https://openalex.org/F4320306076')).toBe('funders');
        expect(detectEntityType('https://openalex.org/T10546')).toBe('topics');
        expect(detectEntityType('https://openalex.org/K12345678')).toBe('keywords');
      });

      it('should handle HTTP URLs', () => {
        expect(detectEntityType('http://openalex.org/W2741809807')).toBe('works');
      });

      it('should handle case insensitive URLs', () => {
        expect(detectEntityType('https://openalex.org/w2741809807')).toBe('works');
        expect(detectEntityType('HTTPS://OPENALEX.ORG/A5023888391')).toBe('authors');
      });

      it('should reject malformed URLs', () => {
        expect(detectEntityType('https://openalex.org/')).toBeNull();
        expect(detectEntityType('https://openalex.org/X123')).toBeNull();
        expect(detectEntityType('https://example.com/W123')).toBeNull();
      });
    });

    describe('DOIs', () => {
      it('should detect DOI formats', () => {
        expect(detectEntityType('10.1038/nature12373')).toBe('works');
        expect(detectEntityType('10.1016/j.cell.2020.02.003')).toBe('works');
        expect(detectEntityType('doi:10.1038/nature12373')).toBe('works');
        expect(detectEntityType('DOI:10.1038/nature12373')).toBe('works');
      });

      it('should detect DOI URLs', () => {
        expect(detectEntityType('https://doi.org/10.1038/nature12373')).toBe('works');
        expect(detectEntityType('https://dx.doi.org/10.1038/nature12373')).toBe('works');
        expect(detectEntityType('http://doi.org/10.1038/nature12373')).toBe('works');
        expect(detectEntityType('http://dx.doi.org/10.1038/nature12373')).toBe('works');
      });

      it('should reject invalid DOIs', () => {
        expect(detectEntityType('10.nature12373')).toBeNull(); // Missing slash
        expect(detectEntityType('9.1038/nature12373')).toBeNull(); // Invalid prefix
        expect(detectEntityType('10./nature12373')).toBeNull(); // Missing registrant
        expect(detectEntityType('doi:')).toBeNull(); // Empty DOI
      });
    });

    describe('ORCIDs', () => {
      it('should detect ORCID formats', () => {
        expect(detectEntityType('0000-0002-1825-0097')).toBe('authors');
        expect(detectEntityType('0000-0002-1825-009X')).toBe('authors'); // X check digit
        expect(detectEntityType('0000-0002-1825-009x')).toBe('authors'); // lowercase x
      });

      it('should detect ORCID URLs', () => {
        expect(detectEntityType('https://orcid.org/0000-0002-1825-0097')).toBe('authors');
        expect(detectEntityType('http://orcid.org/0000-0002-1825-0097')).toBe('authors');
        expect(detectEntityType('orcid.org/0000-0002-1825-0097')).toBe('authors');
      });

      it('should reject invalid ORCIDs', () => {
        expect(detectEntityType('0000-0002-1825-00')).toBeNull(); // Too short
        expect(detectEntityType('000-0002-1825-0097')).toBeNull(); // Wrong format
        expect(detectEntityType('0000-0002-1825-0097-1')).toBeNull(); // Too long
        expect(detectEntityType('AAAA-0002-1825-0097')).toBeNull(); // Non-numeric
      });
    });

    describe('ROR IDs', () => {
      it('should detect ROR formats', () => {
        expect(detectEntityType('05dxps055')).toBe('institutions');
        expect(detectEntityType('01an7q238')).toBe('institutions');
        expect(detectEntityType('05DXPS055')).toBe('institutions'); // case insensitive
      });

      it('should detect ROR URLs', () => {
        expect(detectEntityType('https://ror.org/05dxps055')).toBe('institutions');
        expect(detectEntityType('http://ror.org/05dxps055')).toBe('institutions');
        expect(detectEntityType('ror.org/05dxps055')).toBe('institutions');
      });

      it('should reject invalid ROR IDs', () => {
        expect(detectEntityType('05dxps05')).toBeNull(); // Too short
        expect(detectEntityType('05dxps0555')).toBeNull(); // Too long
        expect(detectEntityType('05dxps-55')).toBeNull(); // Invalid character
        expect(detectEntityType('')).toBeNull(); // Empty
      });
    });

    describe('ISSNs', () => {
      it('should detect ISSN formats', () => {
        expect(detectEntityType('2049-3630')).toBe('sources');
        expect(detectEntityType('1234-567X')).toBe('sources'); // X check digit
        expect(detectEntityType('1234-567x')).toBe('sources'); // lowercase x
      });

      it('should detect ISSN with prefix', () => {
        expect(detectEntityType('ISSN: 2049-3630')).toBe('sources');
        expect(detectEntityType('ISSN:2049-3630')).toBe('sources');
        expect(detectEntityType('issn: 2049-3630')).toBe('sources');
      });

      it('should reject invalid ISSNs', () => {
        expect(detectEntityType('204-3630')).toBeNull(); // Too short
        expect(detectEntityType('20499-3630')).toBeNull(); // Too long
        expect(detectEntityType('2049-36300')).toBeNull(); // Wrong format
        expect(detectEntityType('ABCD-3630')).toBeNull(); // Non-numeric
      });
    });

    describe('edge cases', () => {
      it('should handle null and undefined', () => {
        expect(detectEntityType(null as any)).toBeNull();
        expect(detectEntityType(undefined as any)).toBeNull();
        expect(detectEntityType('')).toBeNull();
      });

      it('should handle non-string input', () => {
        expect(detectEntityType(123 as any)).toBeNull();
        expect(detectEntityType({} as any)).toBeNull();
        expect(detectEntityType([] as any)).toBeNull();
      });

      it('should handle whitespace', () => {
        expect(detectEntityType('  W2741809807  ')).toBe('works');
        expect(detectEntityType('\t10.1038/nature12373\n')).toBe('works');
        expect(detectEntityType('   ')).toBeNull();
      });
    });
  });

  describe('normalizeIdentifier', () => {
    describe('OpenAlex IDs', () => {
      it('should normalize OpenAlex IDs to uppercase', () => {
        expect(normalizeIdentifier('w2741809807')).toBe('W2741809807');
        expect(normalizeIdentifier('a5023888391')).toBe('A5023888391');
        expect(normalizeIdentifier('W2741809807')).toBe('W2741809807'); // Already normalized
      });

      it('should extract IDs from URLs', () => {
        expect(normalizeIdentifier('https://openalex.org/W2741809807')).toBe('W2741809807');
        expect(normalizeIdentifier('https://openalex.org/a5023888391')).toBe('A5023888391');
      });
    });

    describe('DOIs', () => {
      it('should normalize DOI formats', () => {
        expect(normalizeIdentifier('10.1038/nature12373')).toBe('10.1038/nature12373');
        expect(normalizeIdentifier('doi:10.1038/nature12373')).toBe('10.1038/nature12373');
        expect(normalizeIdentifier('DOI:10.1038/nature12373')).toBe('10.1038/nature12373');
      });

      it('should extract DOIs from URLs', () => {
        expect(normalizeIdentifier('https://doi.org/10.1038/nature12373')).toBe('10.1038/nature12373');
        expect(normalizeIdentifier('https://dx.doi.org/10.1038/nature12373')).toBe('10.1038/nature12373');
      });
    });

    describe('ORCIDs', () => {
      it('should normalize ORCIDs to full URL format', () => {
        expect(normalizeIdentifier('0000-0002-1825-0097')).toBe('https://orcid.org/0000-0002-1825-0097');
        expect(normalizeIdentifier('0000-0002-1825-009X')).toBe('https://orcid.org/0000-0002-1825-009X');
      });

      it('should preserve existing ORCID URLs', () => {
        expect(normalizeIdentifier('https://orcid.org/0000-0002-1825-0097')).toBe('https://orcid.org/0000-0002-1825-0097');
      });

      it('should handle case insensitive input', () => {
        expect(normalizeIdentifier('0000-0002-1825-009x')).toBe('https://orcid.org/0000-0002-1825-009X');
      });
    });

    describe('ROR IDs', () => {
      it('should normalize ROR IDs to full URL format', () => {
        expect(normalizeIdentifier('05dxps055')).toBe('https://ror.org/05dxps055');
        expect(normalizeIdentifier('05DXPS055')).toBe('https://ror.org/05dxps055'); // lowercase
      });

      it('should preserve existing ROR URLs', () => {
        expect(normalizeIdentifier('https://ror.org/05dxps055')).toBe('https://ror.org/05dxps055');
      });
    });

    describe('ISSNs', () => {
      it('should normalize ISSN formats', () => {
        expect(normalizeIdentifier('2049-3630')).toBe('2049-3630');
        expect(normalizeIdentifier('1234-567x')).toBe('1234-567X'); // uppercase X
        expect(normalizeIdentifier('ISSN: 2049-3630')).toBe('2049-3630');
      });
    });

    describe('edge cases', () => {
      it('should return null for invalid identifiers', () => {
        expect(normalizeIdentifier('invalid')).toBeNull();
        expect(normalizeIdentifier('')).toBeNull();
        expect(normalizeIdentifier(null as any)).toBeNull();
      });
    });
  });

  describe('isValidIdentifier', () => {
    it('should return true for valid identifiers', () => {
      expect(isValidIdentifier('W2741809807')).toBe(true);
      expect(isValidIdentifier('10.1038/nature12373')).toBe(true);
      expect(isValidIdentifier('0000-0002-1825-0097')).toBe(true);
      expect(isValidIdentifier('05dxps055')).toBe(true);
      expect(isValidIdentifier('2049-3630')).toBe(true);
      expect(isValidIdentifier('https://openalex.org/W2741809807')).toBe(true);
    });

    it('should return false for invalid identifiers', () => {
      expect(isValidIdentifier('invalid')).toBe(false);
      expect(isValidIdentifier('')).toBe(false);
      expect(isValidIdentifier('X123456')).toBe(false);
      expect(isValidIdentifier('10.invalid')).toBe(false);
    });
  });

  describe('detectEntity', () => {
    it('should return complete detection results', () => {
      const result = detectEntity('W2741809807');
      expect(result).toEqual({
        entityType: 'works',
        normalizedId: 'W2741809807',
        originalInput: 'W2741809807',
        detectionMethod: 'OpenAlex ID',
      });
    });

    it('should handle DOI detection', () => {
      const result = detectEntity('doi:10.1038/nature12373');
      expect(result).toEqual({
        entityType: 'works',
        normalizedId: '10.1038/nature12373',
        originalInput: 'doi:10.1038/nature12373',
        detectionMethod: 'DOI',
      });
    });

    it('should handle ORCID detection', () => {
      const result = detectEntity('0000-0002-1825-0097');
      expect(result).toEqual({
        entityType: 'authors',
        normalizedId: 'https://orcid.org/0000-0002-1825-0097',
        originalInput: '0000-0002-1825-0097',
        detectionMethod: 'ORCID',
      });
    });

    it('should return null for invalid identifiers', () => {
      expect(detectEntity('invalid')).toBeNull();
      expect(detectEntity('')).toBeNull();
    });
  });

  describe('EntityDetectionService.detectEntities', () => {
    it('should detect multiple identifiers', () => {
      const ids = [
        'W2741809807',
        '10.1038/nature12373',
        '0000-0002-1825-0097',
        'invalid',
        '05dxps055',
      ];

      const results = EntityDetectionService.detectEntities(ids);
      expect(results).toHaveLength(4); // Invalid one filtered out

      expect(results[0]).toEqual({
        entityType: 'works',
        normalizedId: 'W2741809807',
        originalInput: 'W2741809807',
        detectionMethod: 'OpenAlex ID',
      });

      expect(results[1]).toEqual({
        entityType: 'works',
        normalizedId: '10.1038/nature12373',
        originalInput: '10.1038/nature12373',
        detectionMethod: 'DOI',
      });

      expect(results[2]).toEqual({
        entityType: 'authors',
        normalizedId: 'https://orcid.org/0000-0002-1825-0097',
        originalInput: '0000-0002-1825-0097',
        detectionMethod: 'ORCID',
      });

      expect(results[3]).toEqual({
        entityType: 'institutions',
        normalizedId: 'https://ror.org/05dxps055',
        originalInput: '05dxps055',
        detectionMethod: 'ROR',
      });
    });

    it('should handle empty array', () => {
      expect(EntityDetectionService.detectEntities([])).toEqual([]);
    });
  });

  describe('EntityDetectionService.getSupportedTypes', () => {
    it('should return information about supported types', () => {
      const types = EntityDetectionService.getSupportedTypes();
      expect(types).toHaveLength(6);

      const doiType = types.find(t => t.name === 'DOI');
      expect(doiType).toEqual({
        name: 'DOI',
        entityType: 'works',
        description: 'Digital Object Identifier for academic works',
        examples: ['10.1038/nature12373', 'doi:10.1038/nature12373', 'https://doi.org/10.1038/nature12373'],
      });

      const orcidType = types.find(t => t.name === 'ORCID');
      expect(orcidType).toEqual({
        name: 'ORCID',
        entityType: 'authors',
        description: 'ORCID identifier for researchers',
        examples: ['0000-0002-1825-0097', 'https://orcid.org/0000-0002-1825-0097'],
      });
    });
  });

  describe('Real-world identifiers', () => {
    it('should handle complex DOIs', () => {
      const complexDois = [
        '10.1371/journal.pone.0000001',
        '10.1016/S0140-6736(20)30183-5',
        '10.1038/s41586-020-2008-3',
        '10.1001/jama.2020.1585',
      ];

      complexDois.forEach(doi => {
        expect(detectEntityType(doi)).toBe('works');
        expect(normalizeIdentifier(doi)).toBe(doi);
        expect(isValidIdentifier(doi)).toBe(true);
      });
    });

    it('should handle various ORCID formats', () => {
      const orcids = [
        '0000-0002-1825-0097',
        '0000-0003-0077-4738',
        '0000-0001-8135-3489',
        '0000-0002-4123-456X',
      ];

      orcids.forEach(orcid => {
        expect(detectEntityType(orcid)).toBe('authors');
        expect(normalizeIdentifier(orcid)).toBe(`https://orcid.org/${orcid.toUpperCase()}`);
        expect(isValidIdentifier(orcid)).toBe(true);
      });
    });

    it('should handle real ROR IDs', () => {
      const rorIds = [
        '05dxps055', // MIT
        '01an7q238', // Harvard
        '00hj8s172', // Stanford
        '04gyf1771', // University of Cambridge
      ];

      rorIds.forEach(ror => {
        expect(detectEntityType(ror)).toBe('institutions');
        expect(normalizeIdentifier(ror)).toBe(`https://ror.org/${ror.toLowerCase()}`);
        expect(isValidIdentifier(ror)).toBe(true);
      });
    });
  });
});