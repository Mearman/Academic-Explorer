import { describe, it, expect } from 'vitest';
import {
  isOpenAlexId,
  getEntityTypeFromId,
  convertOpenAlexToInternalLink,
  isOpenAlexUrl,
} from './openalex-link-conversion';

describe('openalex-link-conversion', () => {
  describe('isOpenAlexId', () => {
    it('should detect valid OpenAlex IDs', () => {
      expect(isOpenAlexId('A5017898742')).toBe(true);
      expect(isOpenAlexId('W1234567890')).toBe(true);
      expect(isOpenAlexId('I5017898742')).toBe(true);
      expect(isOpenAlexId('S1234567890')).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isOpenAlexId('12345')).toBe(false);
      expect(isOpenAlexId('X1234567890')).toBe(false);
      expect(isOpenAlexId('not-an-id')).toBe(false);
      expect(isOpenAlexId('')).toBe(false);
    });
  });

  describe('getEntityTypeFromId', () => {
    it('should return correct entity types', () => {
      expect(getEntityTypeFromId('A5017898742')).toBe('authors');
      expect(getEntityTypeFromId('W1234567890')).toBe('works');
      expect(getEntityTypeFromId('I5017898742')).toBe('institutions');
      expect(getEntityTypeFromId('S1234567890')).toBe('sources');
      expect(getEntityTypeFromId('F1234567890')).toBe('funders');
      expect(getEntityTypeFromId('C1234567890')).toBe('concepts');
      expect(getEntityTypeFromId('P1234567890')).toBe('publishers');
      expect(getEntityTypeFromId('T1234567890')).toBe('topics');
    });

    it('should return null for invalid IDs', () => {
      expect(getEntityTypeFromId('X1234567890')).toBe(null);
      expect(getEntityTypeFromId('12345')).toBe(null);
    });
  });

  describe('convertOpenAlexToInternalLink', () => {
    it('should convert OpenAlex entity URLs', () => {
      const result = convertOpenAlexToInternalLink('https://openalex.org/A5017898742');
      expect(result.isOpenAlexLink).toBe(true);
      expect(result.internalPath).toBe('/authors/A5017898742');
      expect(result.originalUrl).toBe('https://openalex.org/A5017898742');
    });

    it('should convert OpenAlex API URLs', () => {
      const result = convertOpenAlexToInternalLink(
        'https://api.openalex.org/works?filter=author.id:A5017898742'
      );
      expect(result.isOpenAlexLink).toBe(true);
      expect(result.internalPath).toBe('/works?filter=author.id:A5017898742');
    });

    it('should convert bare OpenAlex IDs', () => {
      const result = convertOpenAlexToInternalLink('A5017898742');
      expect(result.isOpenAlexLink).toBe(true);
      expect(result.internalPath).toBe('/authors/A5017898742');
    });

    it('should handle works IDs', () => {
      const result = convertOpenAlexToInternalLink('W1234567890');
      expect(result.isOpenAlexLink).toBe(true);
      expect(result.internalPath).toBe('/works/W1234567890');
    });

    it('should not convert non-OpenAlex URLs', () => {
      const result = convertOpenAlexToInternalLink('https://example.com');
      expect(result.isOpenAlexLink).toBe(false);
      expect(result.internalPath).toBe('https://example.com');
    });

    it('should not convert regular strings', () => {
      const result = convertOpenAlexToInternalLink('just some text');
      expect(result.isOpenAlexLink).toBe(false);
      expect(result.internalPath).toBe('just some text');
    });
  });

  describe('isOpenAlexUrl', () => {
    it('should detect OpenAlex URLs', () => {
      expect(isOpenAlexUrl('https://openalex.org/A5017898742')).toBe(true);
      expect(isOpenAlexUrl('https://api.openalex.org/works')).toBe(true);
    });

    it('should reject non-OpenAlex URLs', () => {
      expect(isOpenAlexUrl('https://example.com')).toBe(false);
      expect(isOpenAlexUrl('not a url')).toBe(false);
    });
  });
});
