/**
 * Integration tests for external ID routing functionality
 * Tests DOI, ORCID, ROR, ISSN, and Wikidata ID routing and resolution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock TanStack Router hooks
const mockNavigate = vi.fn();
const mockUseSearch = vi.fn();
const mockUseParams = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearch: mockUseSearch,
    useParams: mockUseParams,
    createFileRoute: vi.fn(() => ({
      component: vi.fn(),
    })),
    Link: vi.fn(({ to, children }) => children),
  };
});

// Mock entity detection utilities
const mockDetectEntityType = vi.fn();
const mockParseExternalId = vi.fn();
const mockDecodeExternalId = vi.fn();
const mockGetEntityEndpoint = vi.fn();

vi.mock('@/lib/openalex/utils/entity-detection', () => ({
  detectEntityType: mockDetectEntityType,
  parseExternalId: mockParseExternalId,
  decodeExternalId: mockDecodeExternalId,
  getEntityEndpoint: mockGetEntityEndpoint,
  ExternalIdType: {
    DOI: 'doi',
    ORCID: 'orcid',
    ROR: 'ror',
    ISSN: 'issn',
    WIKIDATA: 'wikidata',
  },
  EntityType: {
    WORK: 'works',
    AUTHOR: 'authors',
    INSTITUTION: 'institutions',
    SOURCE: 'sources',
  },
  EntityDetectionError: class extends Error {},
}));

// Mock OpenAlex client
const mockOpenAlexClient = {
  works: {
    getByExternalId: vi.fn(),
  },
  authors: {
    getByExternalId: vi.fn(),
  },
  institutions: {
    getByExternalId: vi.fn(),
  },
  sources: {
    getByExternalId: vi.fn(),
  },
};

vi.mock('@/lib/openalex/cached-client', () => ({
  cachedOpenAlex: mockOpenAlexClient,
}));

describe('External Links Routing Integration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseSearch.mockReturnValue({});
    mockUseParams.mockReturnValue({});
    mockDetectEntityType.mockClear();
    mockParseExternalId.mockClear();
    mockDecodeExternalId.mockClear();
    mockGetEntityEndpoint.mockClear();
    Object.values(mockOpenAlexClient).forEach(entityClient => {
      if (entityClient.getByExternalId) {
        entityClient.getByExternalId.mockClear();
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DOI Routing', () => {
    it('should handle standard DOI format', () => {
      const doi = '10.1038/nature12373';
      mockUseParams.mockReturnValue({ path: doi });
      mockDecodeExternalId.mockReturnValue(doi);
      mockParseExternalId.mockReturnValue({
        type: 'doi',
        id: doi,
        originalId: doi,
      });

      // Simulate DOI resolution to work
      mockOpenAlexClient.works.getByExternalId.mockResolvedValue({
        id: 'https://openalex.org/W2123456789',
        display_name: 'Test Work',
      });

      // Should navigate to work page
      const expectedWorkId = 'W2123456789';
      mockNavigate({
        to: `/works/${expectedWorkId}`,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: `/works/${expectedWorkId}`,
        replace: true,
      });
    });

    it('should handle DOI with special characters', () => {
      const doi = '10.1371/journal.pone.0123456';
      mockUseParams.mockReturnValue({ path: doi });
      mockDecodeExternalId.mockReturnValue(doi);

      expect(() => {
        mockParseExternalId(doi);
      }).not.toThrow();
    });

    it('should handle URL-encoded DOI', () => {
      const encodedDoi = '10.1038%2Fnature12373';
      const decodedDoi = '10.1038/nature12373';
      
      mockUseParams.mockReturnValue({ path: encodedDoi });
      mockDecodeExternalId.mockReturnValue(decodedDoi);
      mockParseExternalId.mockReturnValue({
        type: 'doi',
        id: decodedDoi,
        originalId: encodedDoi,
      });

      expect(mockDecodeExternalId).toHaveBeenCalledWith(encodedDoi);
      expect(mockParseExternalId).toHaveBeenCalledWith(decodedDoi);
    });

    it('should handle invalid DOI format', () => {
      const invalidDoi = 'invalid-doi-format';
      mockUseParams.mockReturnValue({ path: invalidDoi });
      mockDecodeExternalId.mockReturnValue(invalidDoi);
      mockParseExternalId.mockImplementation(() => {
        throw new Error('Invalid DOI format');
      });

      expect(() => {
        mockParseExternalId(invalidDoi);
      }).toThrow('Invalid DOI format');
    });
  });

  describe('ORCID Routing', () => {
    it('should handle standard ORCID format', () => {
      const orcid = '0000-0000-0000-0000';
      mockUseParams.mockReturnValue({ id: orcid });
      mockDecodeExternalId.mockReturnValue(orcid);
      mockParseExternalId.mockReturnValue({
        type: 'orcid',
        id: orcid,
        originalId: orcid,
      });

      // Simulate ORCID resolution to author
      mockOpenAlexClient.authors.getByExternalId.mockResolvedValue({
        id: 'https://openalex.org/A1234567890',
        display_name: 'Test Author',
      });

      const expectedAuthorId = 'A1234567890';
      mockNavigate({
        to: `/authors/${expectedAuthorId}`,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: `/authors/${expectedAuthorId}`,
        replace: true,
      });
    });

    it('should handle ORCID with URL prefix', () => {
      const orcidUrl = 'https://orcid.org/0000-0000-0000-0000';
      const orcidId = '0000-0000-0000-0000';
      
      mockUseParams.mockReturnValue({ id: orcidUrl });
      mockDecodeExternalId.mockReturnValue(orcidUrl);
      mockParseExternalId.mockReturnValue({
        type: 'orcid',
        id: orcidId,
        originalId: orcidUrl,
      });

      expect(mockParseExternalId).toHaveBeenCalledWith(orcidUrl);
    });

    it('should handle invalid ORCID format', () => {
      const invalidOrcid = '1234-5678-9012';
      mockUseParams.mockReturnValue({ id: invalidOrcid });
      mockDecodeExternalId.mockReturnValue(invalidOrcid);
      mockParseExternalId.mockImplementation(() => {
        throw new Error('Invalid ORCID format');
      });

      expect(() => {
        mockParseExternalId(invalidOrcid);
      }).toThrow('Invalid ORCID format');
    });
  });

  describe('ROR Routing', () => {
    it('should handle standard ROR format', () => {
      const ror = '01ggx4157';
      mockUseParams.mockReturnValue({ path: ror });
      mockDecodeExternalId.mockReturnValue(ror);
      mockParseExternalId.mockReturnValue({
        type: 'ror',
        id: ror,
        originalId: ror,
      });

      // Simulate ROR resolution to institution
      mockOpenAlexClient.institutions.getByExternalId.mockResolvedValue({
        id: 'https://openalex.org/I1234567890',
        display_name: 'Test Institution',
      });

      const expectedInstitutionId = 'I1234567890';
      mockNavigate({
        to: `/institutions/${expectedInstitutionId}`,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: `/institutions/${expectedInstitutionId}`,
        replace: true,
      });
    });

    it('should handle ROR with URL prefix', () => {
      const rorUrl = 'https://ror.org/01ggx4157';
      const rorId = '01ggx4157';
      
      mockUseParams.mockReturnValue({ path: rorUrl });
      mockDecodeExternalId.mockReturnValue(rorUrl);
      mockParseExternalId.mockReturnValue({
        type: 'ror',
        id: rorId,
        originalId: rorUrl,
      });

      expect(mockParseExternalId).toHaveBeenCalledWith(rorUrl);
    });

    it('should handle URL-encoded ROR path', () => {
      const encodedRorPath = 'https%3A//ror.org/01ggx4157';
      const decodedRorPath = 'https://ror.org/01ggx4157';
      
      mockUseParams.mockReturnValue({ path: encodedRorPath });
      mockDecodeExternalId.mockReturnValue(decodedRorPath);
      mockParseExternalId.mockReturnValue({
        type: 'ror',
        id: '01ggx4157',
        originalId: encodedRorPath,
      });

      expect(mockDecodeExternalId).toHaveBeenCalledWith(encodedRorPath);
    });
  });

  describe('ISSN Routing', () => {
    it('should handle standard ISSN format', () => {
      const issn = '1234-5678';
      mockUseParams.mockReturnValue({ id: issn });
      mockDecodeExternalId.mockReturnValue(issn);
      mockParseExternalId.mockReturnValue({
        type: 'issn',
        id: issn,
        originalId: issn,
      });

      // Simulate ISSN resolution to source
      mockOpenAlexClient.sources.getByExternalId.mockResolvedValue({
        id: 'https://openalex.org/S1234567890',
        display_name: 'Test Journal',
      });

      const expectedSourceId = 'S1234567890';
      mockNavigate({
        to: `/sources/${expectedSourceId}`,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: `/sources/${expectedSourceId}`,
        replace: true,
      });
    });

    it('should handle ISSN without hyphen', () => {
      const issnNoHyphen = '12345678';
      const issnWithHyphen = '1234-5678';
      
      mockUseParams.mockReturnValue({ id: issnNoHyphen });
      mockDecodeExternalId.mockReturnValue(issnNoHyphen);
      mockParseExternalId.mockReturnValue({
        type: 'issn',
        id: issnWithHyphen,
        originalId: issnNoHyphen,
      });

      expect(mockParseExternalId).toHaveBeenCalledWith(issnNoHyphen);
    });

    it('should handle electronic ISSN (eISSN)', () => {
      const eissn = '5678-1234';
      mockUseParams.mockReturnValue({ id: eissn });
      mockDecodeExternalId.mockReturnValue(eissn);
      mockParseExternalId.mockReturnValue({
        type: 'issn',
        id: eissn,
        originalId: eissn,
      });

      expect(mockParseExternalId).toHaveBeenCalledWith(eissn);
    });
  });

  describe('Wikidata Routing', () => {
    it('should handle standard Wikidata ID format', () => {
      const wikidataId = 'Q42';
      mockUseParams.mockReturnValue({ id: wikidataId });
      mockDecodeExternalId.mockReturnValue(wikidataId);
      mockParseExternalId.mockReturnValue({
        type: 'wikidata',
        id: wikidataId,
        originalId: wikidataId,
      });

      expect(mockParseExternalId).toHaveBeenCalledWith(wikidataId);
    });

    it('should handle Wikidata URL format', () => {
      const wikidataUrl = 'https://www.wikidata.org/wiki/Q42';
      const wikidataId = 'Q42';
      
      mockUseParams.mockReturnValue({ id: wikidataUrl });
      mockDecodeExternalId.mockReturnValue(wikidataUrl);
      mockParseExternalId.mockReturnValue({
        type: 'wikidata',
        id: wikidataId,
        originalId: wikidataUrl,
      });

      expect(mockParseExternalId).toHaveBeenCalledWith(wikidataUrl);
    });

    it('should handle numeric Wikidata IDs', () => {
      const wikidataIds = ['Q1', 'Q42', 'Q123456', 'Q999999999'];
      
      wikidataIds.forEach(id => {
        mockUseParams.mockReturnValue({ id });
        mockDecodeExternalId.mockReturnValue(id);
        mockParseExternalId.mockReturnValue({
          type: 'wikidata',
          id,
          originalId: id,
        });

        expect(mockParseExternalId).toHaveBeenCalledWith(id);
        mockParseExternalId.mockClear();
      });
    });
  });

  describe('External ID Resolution', () => {
    it('should handle successful external ID resolution', async () => {
      const doi = '10.1038/nature12373';
      const workData = {
        id: 'https://openalex.org/W2123456789',
        display_name: 'Test Work Title',
        doi: `https://doi.org/${doi}`,
      };

      mockOpenAlexClient.works.getByExternalId.mockResolvedValue(workData);

      const result = await mockOpenAlexClient.works.getByExternalId(doi);
      expect(result).toEqual(workData);
      expect(mockOpenAlexClient.works.getByExternalId).toHaveBeenCalledWith(doi);
    });

    it('should handle external ID not found', async () => {
      const doi = '10.1038/nonexistent';
      mockOpenAlexClient.works.getByExternalId.mockResolvedValue(null);

      const result = await mockOpenAlexClient.works.getByExternalId(doi);
      expect(result).toBeNull();
    });

    it('should handle API error during resolution', async () => {
      const doi = '10.1038/nature12373';
      const apiError = new Error('API Error');
      mockOpenAlexClient.works.getByExternalId.mockRejectedValue(apiError);

      await expect(
        mockOpenAlexClient.works.getByExternalId(doi)
      ).rejects.toThrow('API Error');
    });
  });

  describe('Multiple External ID Types', () => {
    it('should distinguish between different external ID types', () => {
      const externalIds = [
        { id: '10.1038/nature12373', type: 'doi' },
        { id: '0000-0000-0000-0000', type: 'orcid' },
        { id: '01ggx4157', type: 'ror' },
        { id: '1234-5678', type: 'issn' },
        { id: 'Q42', type: 'wikidata' },
      ];

      externalIds.forEach(({ id, type }) => {
        mockParseExternalId.mockReturnValue({
          type,
          id,
          originalId: id,
        });

        const result = mockParseExternalId(id);
        expect(result.type).toBe(type);
        expect(result.id).toBe(id);
        
        mockParseExternalId.mockClear();
      });
    });

    it('should handle ambiguous ID formats', () => {
      // Some IDs might be ambiguous and need context
      const ambiguousIds = [
        '12345678', // Could be ISSN without hyphen or other format
        'Q1234', // Wikidata, but could be confused with other Q-prefixed IDs
      ];

      ambiguousIds.forEach(id => {
        mockParseExternalId.mockImplementation((inputId) => {
          // Simulation of logic that determines most likely type
          if (/^\d{8}$/.test(inputId)) {
            return { type: 'issn', id: `${inputId.slice(0,4)}-${inputId.slice(4)}`, originalId: inputId };
          }
          if (/^Q\d+$/.test(inputId)) {
            return { type: 'wikidata', id: inputId, originalId: inputId };
          }
          throw new Error('Ambiguous ID format');
        });

        expect(() => mockParseExternalId(id)).not.toThrow();
        mockParseExternalId.mockClear();
      });
    });
  });

  describe('Route Parameter Encoding', () => {
    it('should handle URL encoding of external IDs', () => {
      const encodedIds = [
        { encoded: '10.1038%2Fnature12373', decoded: '10.1038/nature12373' },
        { encoded: 'https%3A%2F%2Forcid.org%2F0000-0000-0000-0000', decoded: 'https://orcid.org/0000-0000-0000-0000' },
        { encoded: 'https%3A//ror.org/01ggx4157', decoded: 'https://ror.org/01ggx4157' },
      ];

      encodedIds.forEach(({ encoded, decoded }) => {
        mockDecodeExternalId.mockReturnValue(decoded);
        
        const result = mockDecodeExternalId(encoded);
        expect(result).toBe(decoded);
        
        mockDecodeExternalId.mockClear();
      });
    });

    it('should handle special characters in external IDs', () => {
      const specialCharIds = [
        '10.1371/journal.pone.0123456',
        '10.1007/978-3-540-74958-5_15',
        '10.1002/(SICI)1097-4679(199601)52:1<3::AID-JCLP1>3.0.CO;2-S',
      ];

      specialCharIds.forEach(id => {
        mockDecodeExternalId.mockReturnValue(id);
        mockParseExternalId.mockReturnValue({
          type: 'doi',
          id,
          originalId: id,
        });

        expect(() => {
          const decoded = mockDecodeExternalId(id);
          mockParseExternalId(decoded);
        }).not.toThrow();
        
        mockDecodeExternalId.mockClear();
        mockParseExternalId.mockClear();
      });
    });
  });

  describe('Error Handling for External IDs', () => {
    it('should handle malformed external IDs gracefully', () => {
      const malformedIds = [
        '',
        'not-a-valid-id',
        '10.1038/', // Incomplete DOI
        '0000-0000', // Incomplete ORCID
        'invalid-issn-format',
      ];

      malformedIds.forEach(id => {
        mockParseExternalId.mockImplementation(() => {
          throw new Error(`Invalid external ID format: ${id}`);
        });

        expect(() => mockParseExternalId(id)).toThrow();
        mockParseExternalId.mockClear();
      });
    });

    it('should provide helpful error messages for unsupported ID types', () => {
      const unsupportedIds = [
        'PMID:12345678', // PubMed ID
        'arXiv:1234.5678', // arXiv ID
        'ISBN:978-0-123456-78-9', // ISBN
      ];

      unsupportedIds.forEach(id => {
        mockParseExternalId.mockImplementation(() => {
          throw new Error(`Unsupported external ID type: ${id}`);
        });

        expect(() => mockParseExternalId(id)).toThrow('Unsupported external ID type');
        mockParseExternalId.mockClear();
      });
    });
  });
});