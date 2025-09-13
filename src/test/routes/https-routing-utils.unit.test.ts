/**
 * Unit tests for HTTPS URL routing utility functions
 * Tests individual functions in isolation without external dependencies
 */

import { describe, it, expect } from 'vitest';
import { 
  decodeExternalId, 
  detectEntityType, 
  getEntityEndpoint, 
  detectIdType, 
  ExternalIdType,
  EntityType 
} from '@/lib/openalex/utils/entity-detection';

describe('HTTPS URL Routing Utils - Unit Tests', () => {
  describe('decodeExternalId', () => {
    it('should decode URL-encoded strings correctly', () => {
      const testCases = [
        { input: 'https%3A//openalex.org/A5017898742', expected: 'https://openalex.org/A5017898742' },
        { input: 'https%3A//orcid.org/0000-0003-1613-5981', expected: 'https://orcid.org/0000-0003-1613-5981' },
        { input: 'simple-string', expected: 'simple-string' },
        { input: '', expected: '' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(decodeExternalId(input)).toBe(expected);
      });
    });

    it('should handle already decoded strings', () => {
      const plainStrings = [
        'https://openalex.org/A5017898742',
        'https://orcid.org/0000-0003-1613-5981',
        'A5017898742',
        '5017898742',
      ];

      plainStrings.forEach(str => {
        expect(decodeExternalId(str)).toBe(str);
      });
    });

    it('should handle malformed encoded strings gracefully', () => {
      const malformedInputs = [
        'https%3A//openalex.org/A501789%', // Incomplete encoding
        'https%3//openalex.org/A5017898742', // Missing digit
        '%', // Just a percent sign
      ];

      malformedInputs.forEach(input => {
        expect(() => decodeExternalId(input)).not.toThrow();
      });
    });
  });

  describe('detectEntityType', () => {
    it('should correctly identify entity types from OpenAlex IDs', () => {
      const testCases = [
        { id: 'A5017898742', expected: EntityType.AUTHOR },
        { id: 'W2741809807', expected: EntityType.WORK },
        { id: 'S123456789', expected: EntityType.SOURCE },
        { id: 'I987654321', expected: EntityType.INSTITUTION },
        { id: 'P111222333', expected: EntityType.PUBLISHER },
        { id: 'F444555666', expected: EntityType.FUNDER },
        { id: 'T777888999', expected: EntityType.TOPIC },
        { id: 'C123123123', expected: EntityType.CONCEPT },
      ];

      testCases.forEach(({ id, expected }) => {
        expect(detectEntityType(id)).toBe(expected);
      });
    });

    it('should handle case-insensitive input', () => {
      const testCases = [
        { id: 'a5017898742', expected: EntityType.AUTHOR },
        { id: 'w2741809807', expected: EntityType.WORK },
        { id: 'S123456789', expected: EntityType.SOURCE },
      ];

      testCases.forEach(({ id, expected }) => {
        expect(detectEntityType(id)).toBe(expected);
      });
    });

    it('should throw error for invalid input', () => {
      const invalidInputs = [
        '', // Empty string
        '123456789', // Missing prefix
        'X123456789', // Invalid prefix
        'A123', // Too short
        'A12345678901234567890', // Too long
      ];

      invalidInputs.forEach(id => {
        expect(() => detectEntityType(id)).toThrow();
      });
    });
  });

  describe('getEntityEndpoint', () => {
    it('should return correct endpoints for all entity types', () => {
      const testCases = [
        { type: EntityType.AUTHOR, expected: 'authors' },
        { type: EntityType.WORK, expected: 'works' },
        { type: EntityType.SOURCE, expected: 'sources' },
        { type: EntityType.INSTITUTION, expected: 'institutions' },
        { type: EntityType.PUBLISHER, expected: 'publishers' },
        { type: EntityType.FUNDER, expected: 'funders' },
        { type: EntityType.TOPIC, expected: 'topics' },
        { type: EntityType.CONCEPT, expected: 'concepts' },
        { type: EntityType.KEYWORD, expected: 'keywords' },
        { type: EntityType.CONTINENT, expected: 'continents' },
        { type: EntityType.REGION, expected: 'regions' },
      ];

      testCases.forEach(({ type, expected }) => {
        expect(getEntityEndpoint(type)).toBe(expected);
      });
    });

    it('should throw error for unknown entity type', () => {
      expect(() => getEntityEndpoint('unknown' as EntityType)).toThrow();
    });
  });

  describe('detectIdType', () => {
    it('should correctly identify OpenAlex IDs', () => {
      const openAlexIds = [
        'A5017898742',
        'W2741809807', 
        'S123456789',
        'I987654321',
      ];

      openAlexIds.forEach(id => {
        expect(detectIdType(id)).toBe(ExternalIdType.OPENALEX);
      });
    });

    it('should correctly identify ORCID IDs', () => {
      const orcidIds = [
        '0000-0003-1613-5981',
        '0000-0002-1825-0097',
        '0000-0001-2345-678X', // With X check digit
      ];

      orcidIds.forEach(id => {
        expect(detectIdType(id)).toBe(ExternalIdType.ORCID);
      });
    });

    it('should correctly identify DOI patterns', () => {
      const doiIds = [
        '10.1371/journal.pone.0000000',
        '10.1038/nature12373',
        '10.1126/science.1234567',
      ];

      doiIds.forEach(id => {
        expect(detectIdType(id)).toBe(ExternalIdType.DOI);
      });
    });

    it('should handle URLs and extract ID type', () => {
      const urlTestCases = [
        { url: 'https://openalex.org/A5017898742', expected: ExternalIdType.OPENALEX },
        { url: 'https://orcid.org/0000-0003-1613-5981', expected: ExternalIdType.ORCID },
        { url: 'https://doi.org/10.1371/journal.pone.0000000', expected: ExternalIdType.DOI },
      ];

      urlTestCases.forEach(({ url, expected }) => {
        expect(detectIdType(url)).toBe(expected);
      });
    });

    it('should throw error for unrecognizable patterns', () => {
      const invalidIds = [
        'random-string',
        '123456789',
        'not-a-valid-id',
        '',
      ];

      invalidIds.forEach(id => {
        expect(() => detectIdType(id)).toThrow();
      });
    });
  });

  describe('URL Pattern Extraction', () => {
    it('should extract OpenAlex IDs from HTTPS URLs', () => {
      const urlPatterns = [
        { 
          url: 'https://openalex.org/A5017898742', 
          expectedId: 'A5017898742',
          expectedType: EntityType.AUTHOR 
        },
        { 
          url: 'https://openalex.org/authors/A5017898742', 
          expectedId: 'A5017898742',
          expectedType: EntityType.AUTHOR 
        },
        { 
          url: 'https://openalex.org/W2741809807', 
          expectedId: 'W2741809807',
          expectedType: EntityType.WORK 
        },
      ];

      urlPatterns.forEach(({ url, expectedId, expectedType }) => {
        // Test basic pattern extraction
        const basicMatch = url.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
        if (basicMatch && basicMatch[1]) {
          const extractedId = basicMatch[1].toUpperCase();
          expect(extractedId).toBe(expectedId);
          expect(detectEntityType(extractedId)).toBe(expectedType);
        }

        // Test alternative pattern extraction  
        const altMatch = url.match(/openalex\.org\/[a-z]+\/([WASIPFTCKRN]\d{7,10})/i);
        if (altMatch && altMatch[1]) {
          const extractedId = altMatch[1].toUpperCase();
          expect(extractedId).toBe(expectedId);
          expect(detectEntityType(extractedId)).toBe(expectedType);
        }
      });
    });

    it('should extract ORCID IDs from HTTPS URLs', () => {
      const orcidUrls = [
        'https://orcid.org/0000-0003-1613-5981',
        'https://orcid.org/0000-0002-1825-0097',
        'https://orcid.org/0000-0001-2345-678X',
      ];

      orcidUrls.forEach(url => {
        const match = url.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
        expect(match).toBeTruthy();
        if (match && match[1]) {
          const orcidId = match[1];
          expect(detectIdType(orcidId)).toBe(ExternalIdType.ORCID);
        }
      });
    });

    it('should handle browser-transformed HTTPS URLs', () => {
      const transformedUrls = [
        { 
          original: 'https://openalex.org/A5017898742',
          transformed: 'https:/openalex.org/A5017898742',
          expectedId: 'A5017898742'
        },
        { 
          original: 'https://orcid.org/0000-0003-1613-5981',
          transformed: 'https:/orcid.org/0000-0003-1613-5981',
          expectedId: '0000-0003-1613-5981'
        },
      ];

      transformedUrls.forEach(({ transformed, expectedId }) => {
        // Both original and transformed should be handled
        if (transformed.includes('openalex.org/')) {
          const match = transformed.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
          if (match && match[1]) {
            expect(match[1].toUpperCase()).toBe(expectedId);
          }
        }

        if (transformed.includes('orcid.org/')) {
          const match = transformed.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
          if (match) {
            expect(match[1]).toBe(expectedId);
          }
        }
      });
    });
  });

  describe('Numeric ID Handling', () => {
    it('should identify numeric ID patterns', () => {
      const numericIds = [
        '5017898742',
        '1234567890',
        '987654321',
        '1234567', // 7 digits (minimum)
      ];

      numericIds.forEach(id => {
        expect(/^\d{7,10}$/.test(id)).toBe(true);
      });
    });

    it('should reject invalid numeric patterns', () => {
      const invalidNumeric = [
        '123456', // Too short
        '12345678901', // Too long
        '123abc789', // Contains letters
        '', // Empty
        '123.456', // Contains decimal
      ];

      invalidNumeric.forEach(id => {
        expect(/^\d{7,10}$/.test(id)).toBe(false);
      });
    });

    it('should handle numeric to OpenAlex ID conversion logic', () => {
      const numericId = '5017898742';
      const expectedAuthorId = 'A5017898742';
      
      // Simulate the logic: numeric IDs are assumed to be authors
      if (/^\d{7,10}$/.test(numericId)) {
        const constructedId = `A${numericId}`;
        expect(constructedId).toBe(expectedAuthorId);
        expect(detectEntityType(constructedId)).toBe(EntityType.AUTHOR);
        expect(getEntityEndpoint(detectEntityType(constructedId))).toBe('authors');
      }
    });
  });

  describe('Error Boundary Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      const nullInputs = [null, undefined];
      
      nullInputs.forEach(input => {
        expect(() => detectEntityType(input as any)).toThrow();
        expect(() => detectIdType(input as any)).toThrow();
        // decodeExternalId may handle null/undefined differently, test actual behavior
        expect(() => decodeExternalId(input as any)).not.toThrow();
      });
    });

    it('should handle empty string inputs', () => {
      expect(() => detectEntityType('')).toThrow();
      expect(() => detectIdType('')).toThrow();
      expect(decodeExternalId('')).toBe('');
    });

    it('should handle very long inputs', () => {
      const veryLongString = 'A' + '1'.repeat(100);
      expect(() => detectEntityType(veryLongString)).toThrow();
    });

    it('should handle special characters', () => {
      const specialChars = [
        'A501789@742',
        'A501789#742', 
        'A501789$742',
        'A501789%742',
      ];

      specialChars.forEach(id => {
        expect(() => detectEntityType(id)).toThrow();
      });
    });
  });
});