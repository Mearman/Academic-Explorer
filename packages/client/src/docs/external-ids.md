# External ID Types in OpenAlex API Client

This document provides comprehensive documentation for all external identifier types supported by the OpenAlex API client, including format specifications, validation rules, practical examples, and integration patterns.

## Overview

The OpenAlex API client supports multiple external identifier types for seamless integration with existing academic and research systems. These identifiers can be used both for querying entities and are returned in API responses.

## Supported External ID Types

### 1. DOI (Digital Object Identifier)

**Description**: Persistent identifiers for scholarly documents, widely used for academic papers, datasets, and other research outputs.

**Format Specifications**:
- Full URL format: `https://doi.org/10.1000/182`
- Short format: `10.1000/182`
- Case-insensitive
- Prefix: `10.` followed by registrant code and suffix

**Validation Rules**:
- Must start with `10.`
- Contains at least one forward slash after the registrant code
- Registrant code: 4+ digits
- Suffix: any valid URI characters

**Entities**: Works

**Usage Examples**:

```typescript
// Get work by DOI
const work = await client.works.getWork('https://doi.org/10.7717/peerj.4375');
const work2 = await client.works.getWork('10.7717/peerj.4375'); // Both formats work

// Filter works by DOI
const works = await client.works.getWorks({
  filter: {
    'doi': ['10.1038/nature12373', '10.1126/science.1234567']
  }
});

// Search using DOI in query filters
const searchResults = await client.works.searchWorks('climate change', {
  filters: {
    'has_doi': true,
    'doi': '10.1038/nature12373'
  }
});
```

**Response Structure**:
```typescript
interface Work {
  id: string; // OpenAlex ID
  doi?: string; // e.g., "https://doi.org/10.7717/peerj.4375"
  ids: {
    openalex: string;
    doi?: string; // e.g., "https://doi.org/10.7717/peerj.4375"
    mag?: number;
    pmid?: string;
    pmcid?: string;
  };
  // ... other fields
}
```

### 2. ORCID (Open Researcher and Contributor ID)

**Description**: Unique persistent identifiers for researchers, providing a reliable way to connect researchers with their contributions.

**Format Specifications**:
- Full URL format: `https://orcid.org/0000-0002-1825-0097`
- Canonical format: `0000-0002-1825-0097`
- Structure: 4 groups of 4 digits, separated by hyphens
- Check digit: Uses MOD 11-2 algorithm

**Validation Rules**:
- Exactly 16 digits in format: `XXXX-XXXX-XXXX-XXXX`
- Last character can be 0-9 or X (check digit)
- Must pass MOD 11-2 checksum validation

**Entities**: Authors

**Usage Examples**:

```typescript
// Get author by ORCID
const author = await client.authors.getAuthor('0000-0003-1613-5981');
const author2 = await client.authors.getAuthor('https://orcid.org/0000-0003-1613-5981');

// Get works by author ORCID
const authorWorks = await client.works.getWorksByAuthor('0000-0003-1613-5981');

// Filter authors by ORCID presence
const authorsWithOrcid = await client.authors.getAuthors({
  filter: {
    'has_orcid': true,
    'orcid': ['0000-0003-1613-5981', '0000-0002-1825-0097']
  }
});

// Filter works by author ORCID
const works = await client.works.getWorks({
  filter: {
    'authorships.author.orcid': '0000-0003-1613-5981'
  }
});
```

**Response Structure**:
```typescript
interface Author {
  id: string; // OpenAlex ID
  orcid?: string; // e.g., "https://orcid.org/0000-0003-1613-5981"
  ids: {
    openalex: string;
    orcid?: string; // e.g., "https://orcid.org/0000-0003-1613-5981"
    scopus?: string;
    twitter?: string;
    wikipedia?: string;
    mag?: number;
  };
  // ... other fields
}

// In Work authorships
interface Authorship {
  author: {
    id: string;
    display_name: string;
    orcid?: string; // e.g., "https://orcid.org/0000-0003-1613-5981"
  };
  // ... other fields
}
```

### 3. ROR (Research Organization Registry)

**Description**: Persistent identifiers for research organizations worldwide, including universities, companies, and research institutions.

**Format Specifications**:
- Full URL format: `https://ror.org/01234567`
- ROR ID format: 9-character alphanumeric string
- Base32 encoding (lowercase)
- Structure: 0 + 8 characters

**Validation Rules**:
- Starts with `0`
- Followed by exactly 8 base32 characters (a-z, 2-7)
- Total length: 9 characters
- Case-insensitive (normalized to lowercase)

**Entities**: Institutions, Publishers, Funders

**Usage Examples**:

```typescript
// Get institution by ROR ID
const institution = await client.institutions.getInstitution('https://ror.org/01an7q238');
const institution2 = await client.institutions.getInstitution('01an7q238'); // Short format

// Get works by institution ROR
const institutionWorks = await client.works.getWorksByInstitution('https://ror.org/01an7q238');

// Filter institutions by ROR presence
const institutionsWithRor = await client.institutions.getInstitutions({
  filter: {
    'has_ror': true,
    'ror': ['01an7q238', '05dxps055']
  }
});

// Filter works by institution ROR
const works = await client.works.getWorks({
  filter: {
    'authorships.institutions.ror': 'https://ror.org/01an7q238'
  }
});
```

**Response Structure**:
```typescript
interface InstitutionEntity {
  id: string; // OpenAlex ID
  ror?: string; // e.g., "https://ror.org/01an7q238"
  ids: {
    openalex: string;
    ror?: string; // e.g., "https://ror.org/01an7q238"
    grid?: string;
    wikipedia?: string;
    wikidata?: string;
    mag?: number;
  };
  // ... other fields
}

// In Work authorships
interface Institution {
  id: string;
  display_name: string;
  ror?: string; // e.g., "https://ror.org/01an7q238"
  country_code?: string;
  type: string;
  lineage?: string[];
}
```

### 4. ISSN/ISSN-L (International Standard Serial Number)

**Description**: Standardized identifiers for serial publications like journals and magazines. ISSN-L is the linking ISSN that groups together different media versions.

**Format Specifications**:
- Format: `XXXX-XXXX` (8 digits with hyphen)
- Structure: 7 digits + 1 check digit
- Check digit: 0-9 or X (for 10)
- ISSN-L: Canonical form linking related ISSNs

**Validation Rules**:
- Exactly 8 characters: 7 digits + check digit
- Hyphen between 4th and 5th characters
- Check digit calculated using weighted sum algorithm
- Must pass ISSN checksum validation

**Entities**: Sources (Journals, Conferences)

**Usage Examples**:

```typescript
// Get source by ISSN
const source = await client.sources.getSource('1234-5678');

// Get works published in source by ISSN
const sourceWorks = await client.works.getWorksBySource('0028-0836'); // Nature

// Filter sources by ISSN
const sources = await client.sources.getSourcesByISSN('0028-0836');

// Filter sources by ISSN presence
const sourcesWithIssn = await client.sources.getSources({
  filter: {
    'has_issn': true,
    'issn': ['0028-0836', '1476-4687']
  }
});

// Filter works by journal ISSN
const works = await client.works.getWorks({
  filter: {
    'primary_location.source.issn': '0028-0836'
  }
});
```

**Response Structure**:
```typescript
interface Source {
  id: string; // OpenAlex ID
  issn_l?: string; // e.g., "0028-0836"
  issn?: string[]; // e.g., ["0028-0836", "1476-4687"]
  ids: {
    openalex: string;
    issn_l?: string; // e.g., "0028-0836"
    issn?: string[]; // e.g., ["0028-0836", "1476-4687"]
    mag?: number;
    wikidata?: string;
    fatcat?: string;
  };
  // ... other fields
}

// In Work locations
interface Location {
  source?: {
    id: string;
    display_name: string;
    issn_l?: string; // e.g., "0028-0836"
    issn?: string[]; // e.g., ["0028-0836", "1476-4687"]
    is_oa: boolean;
    is_in_doaj: boolean;
    type: string;
  };
  // ... other fields
}
```

### 5. Wikidata ID

**Description**: Identifiers from Wikidata, the free knowledge base that provides structured data for Wikipedia and other projects.

**Format Specifications**:
- Format: `Q` followed by digits (e.g., `Q5`)
- Full URL format: `https://www.wikidata.org/entity/Q5`
- Case-sensitive (Q must be uppercase)
- No leading zeros after Q

**Validation Rules**:
- Starts with uppercase `Q`
- Followed by one or more digits
- No spaces or special characters
- Minimum: Q1, maximum: no defined limit

**Entities**: Concepts, Institutions, Publishers, Funders, Sources

**Usage Examples**:

```typescript
// Filter concepts by Wikidata ID
const concepts = await client.concepts.getConcepts({
  filter: {
    'wikidata': ['Q5', 'Q21198'] // Human, Computer science
  }
});

// Search using Wikidata ID in various entities
const institutions = await client.institutions.getInstitutions({
  filter: {
    'ids.wikidata': 'Q49088' // Harvard University
  }
});

// Filter works by concept Wikidata ID
const works = await client.works.getWorks({
  filter: {
    'concepts.wikidata': 'Q11660' // Artificial intelligence
  }
});
```

**Response Structure**:
```typescript
interface Concept {
  id: string; // OpenAlex ID
  wikidata?: string; // e.g., "https://www.wikidata.org/entity/Q5"
  ids: {
    openalex: string;
    wikidata?: string; // e.g., "https://www.wikidata.org/entity/Q5"
    wikipedia?: string;
    umls_aui?: string[];
    umls_cui?: string[];
    mag?: number;
  };
  // ... other fields
}

// In Work concepts
interface WorkConcept {
  id: string;
  wikidata?: string; // e.g., "https://www.wikidata.org/entity/Q11660"
  display_name: string;
  level: number;
  score: number;
}
```

### 6. PMID/PMCID (PubMed Identifiers)

**Description**: Identifiers from the PubMed database. PMID identifies articles in PubMed, while PMCID identifies full-text articles in PubMed Central.

**Format Specifications**:
- **PMID**: Numeric identifier, typically 1-8 digits
  - Examples: `12345678`, `pmid:12345678`
- **PMCID**: PMC prefix + numeric identifier
  - Examples: `PMC123456`, `pmc:123456`

**Validation Rules**:
- **PMID**:
  - 1-10 digits
  - No leading zeros (except single `0`)
  - Can be prefixed with `pmid:` or `PMID:`
- **PMCID**:
  - Starts with `PMC` (case-insensitive)
  - Followed by 1-8 digits
  - Can be prefixed with `pmc:` or `PMC:`

**Entities**: Works

**Usage Examples**:

```typescript
// Get work by PMID
const work = await client.works.getWork('pmid:12345678');
const work2 = await client.works.getWork('12345678'); // Bare numeric format

// Get work by PMCID
const workPmc = await client.works.getWork('PMC123456');

// Filter works by PMID/PMCID
const works = await client.works.getWorks({
  filter: {
    'ids.pmid': ['12345678', '87654321'],
    'ids.pmcid': 'PMC123456'
  }
});

// Search for works with PubMed IDs
const pubmedWorks = await client.works.searchWorks('cancer research', {
  filters: {
    'indexed_in': 'pubmed'
  }
});
```

**Response Structure**:
```typescript
interface Work {
  id: string; // OpenAlex ID
  ids: {
    openalex: string;
    doi?: string;
    mag?: number;
    pmid?: string; // e.g., "12345678"
    pmcid?: string; // e.g., "PMC123456"
  };
  indexed_in: string[]; // May include "pubmed"
  // ... other fields
}
```

## Format Conversion and Normalization

### URL vs Canonical Formats

Many external IDs support both full URL formats and canonical short formats:

```typescript
// These are equivalent for DOI
'https://doi.org/10.7717/peerj.4375'
'10.7717/peerj.4375'

// These are equivalent for ORCID
'https://orcid.org/0000-0003-1613-5981'
'0000-0003-1613-5981'

// These are equivalent for ROR
'https://ror.org/01an7q238'
'01an7q238'

// These are equivalent for Wikidata
'https://www.wikidata.org/entity/Q5'
'Q5'
```

### Validation Utilities

```typescript
// Example validation functions (not part of client, but useful patterns)

function isValidDOI(doi: string): boolean {
  // Remove URL prefix if present
  const cleanDoi = doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '');
  return /^10\.\d{4,}\/\S+/.test(cleanDoi);
}

function isValidORCID(orcid: string): boolean {
  // Remove URL prefix if present
  const cleanOrcid = orcid.replace(/^https?:\/\/orcid\.org\//, '');
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(cleanOrcid);
}

function isValidROR(ror: string): boolean {
  // Remove URL prefix if present
  const cleanRor = ror.replace(/^https?:\/\/ror\.org\//, '');
  return /^0[a-z2-7]{8}$/.test(cleanRor.toLowerCase());
}

function isValidISSN(issn: string): boolean {
  return /^\d{4}-\d{3}[\dX]$/.test(issn);
}

function isValidWikidata(wikidata: string): boolean {
  // Remove URL prefix if present
  const cleanWikidata = wikidata.replace(/^https?:\/\/www\.wikidata\.org\/entity\//, '');
  return /^Q\d+$/.test(cleanWikidata);
}
```

## Common Integration Patterns

### Multi-ID Entity Lookup

```typescript
// Look up entity by any supported ID type
async function getEntityByAnyId(client: OpenAlexClient, id: string) {
  // Auto-detect ID type and route to appropriate endpoint
  if (id.startsWith('W')) {
    return await client.works.getWork(id);
  } else if (id.startsWith('A')) {
    return await client.authors.getAuthor(id);
  } else if (id.startsWith('10.')) {
    // DOI - look up work
    return await client.works.getWork(id);
  } else if (/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id)) {
    // ORCID - look up author
    return await client.authors.getAuthor(id);
  } else if (/^0[a-z2-7]{8}$/i.test(id)) {
    // ROR - look up institution
    return await client.institutions.getInstitution(id);
  } else if (/^\d{4}-\d{3}[\dX]$/.test(id)) {
    // ISSN - look up source
    return await client.sources.getSource(id);
  }
  throw new Error(`Unsupported ID format: ${id}`);
}
```

### Batch ID Resolution

```typescript
// Resolve multiple IDs of different types
async function resolveMultipleIds(client: OpenAlexClient, ids: string[]) {
  const results = await Promise.allSettled(
    ids.map(id => getEntityByAnyId(client, id))
  );

  return results.map((result, index) => ({
    id: ids[index],
    success: result.status === 'fulfilled',
    entity: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
}
```

### Cross-Platform Integration

```typescript
// Example: Import from different academic databases
interface ExternalReference {
  type: 'doi' | 'pmid' | 'orcid' | 'ror' | 'issn';
  id: string;
}

async function importFromExternalSources(
  client: OpenAlexClient,
  references: ExternalReference[]
) {
  const entities = [];

  for (const ref of references) {
    try {
      switch (ref.type) {
        case 'doi':
          entities.push(await client.works.getWork(ref.id));
          break;
        case 'pmid':
          entities.push(await client.works.getWork(`pmid:${ref.id}`));
          break;
        case 'orcid':
          entities.push(await client.authors.getAuthor(ref.id));
          break;
        case 'ror':
          entities.push(await client.institutions.getInstitution(ref.id));
          break;
        case 'issn':
          entities.push(await client.sources.getSource(ref.id));
          break;
      }
    } catch (error) {
      console.warn(`Failed to resolve ${ref.type}:${ref.id}`, error);
    }
  }

  return entities;
}
```

## Complex Query Examples

### Cross-Entity Filtering

```typescript
// Find works by specific author at specific institution with DOI
const complexQuery = await client.works.getWorks({
  filter: {
    'authorships.author.orcid': '0000-0003-1613-5981',
    'authorships.institutions.ror': 'https://ror.org/01an7q238',
    'has_doi': true,
    'publication_year': '2020-2023'
  },
  select: ['id', 'doi', 'display_name', 'authorships', 'publication_year']
});

// Find highly cited works in specific journal
const journalAnalysis = await client.works.getWorks({
  filter: {
    'primary_location.source.issn': '0028-0836', // Nature
    'cited_by_count': '>100',
    'publication_year': 2023
  },
  sort: 'cited_by_count',
  per_page: 200
});

// Find collaboration patterns between institutions
const collaborations = await client.works.getWorks({
  filter: {
    'authorships.institutions.ror': [
      'https://ror.org/01an7q238', // Stanford
      'https://ror.org/03vek6s52'  // Harvard
    ],
    'authorships.institutions_count': '>1'
  }
});
```

### Advanced Aggregations

```typescript
// Analyze publication patterns by external IDs
const publicationAnalysis = await client.works.getStats('publication_year', {
  'authorships.institutions.ror': 'https://ror.org/01an7q238',
  'has_doi': true,
  'is_oa': true
});

// Institution collaboration network analysis
const institutionNetwork = await client.works.getWorksGroupedBy(
  'authorships.institutions.ror', {
    filters: {
      'authorships.author.orcid': '0000-0003-1613-5981',
      'publication_year': '2020-2023'
    },
    per_page: 0 // Only get aggregation data
  }
);
```

## Error Handling and Troubleshooting

### Common Issues

1. **Invalid ID Format**:
```typescript
try {
  const work = await client.works.getWork('invalid-doi');
} catch (error) {
  if (error.statusCode === 404) {
    console.log('Work not found - check ID format');
  }
}
```

2. **URL vs Canonical Format Confusion**:
```typescript
// Both formats work, but be consistent
const work1 = await client.works.getWork('https://doi.org/10.7717/peerj.4375');
const work2 = await client.works.getWork('10.7717/peerj.4375');
```

3. **Case Sensitivity**:
```typescript
// ORCID and DOI are case-insensitive
const author1 = await client.authors.getAuthor('0000-0003-1613-5981');
const author2 = await client.authors.getAuthor('0000-0003-1613-5981'); // Same

// Wikidata IDs are case-sensitive (Q must be uppercase)
const concept = await client.concepts.getConcept('Q5'); // Correct
// const concept = await client.concepts.getConcept('q5'); // Wrong
```

### Validation Best Practices

```typescript
// Always validate external IDs before API calls
function validateExternalId(type: string, id: string): boolean {
  switch (type) {
    case 'doi':
      return /^(https?:\/\/(dx\.)?doi\.org\/)?10\.\d{4,}\/\S+/.test(id);
    case 'orcid':
      return /^(https?:\/\/orcid\.org\/)?\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id);
    case 'ror':
      return /^(https?:\/\/ror\.org\/)?0[a-z2-7]{8}$/i.test(id);
    case 'issn':
      return /^\d{4}-\d{3}[\dX]$/.test(id);
    case 'wikidata':
      return /^(https?:\/\/www\.wikidata\.org\/entity\/)?Q\d+$/.test(id);
    case 'pmid':
      return /^(pmid:)?\d{1,10}$/.test(id);
    default:
      return false;
  }
}

// Safe entity lookup with validation
async function safeGetEntity(client: OpenAlexClient, type: string, id: string) {
  if (!validateExternalId(type, id)) {
    throw new Error(`Invalid ${type} format: ${id}`);
  }

  try {
    switch (type) {
      case 'doi':
      case 'pmid':
        return await client.works.getWork(id);
      case 'orcid':
        return await client.authors.getAuthor(id);
      case 'ror':
        return await client.institutions.getInstitution(id);
      case 'issn':
        return await client.sources.getSource(id);
      default:
        throw new Error(`Unsupported ID type: ${type}`);
    }
  } catch (error) {
    throw new Error(`Failed to fetch ${type} ${id}: ${error.message}`);
  }
}
```

## Performance Considerations

### Batch Operations

```typescript
// Efficient batch lookup using filter arrays
const multipleWorks = await client.works.getWorks({
  filter: {
    'ids.doi': [
      '10.1038/nature12373',
      '10.1126/science.1234567',
      '10.1016/j.cell.2023.01.001'
    ]
  },
  per_page: 200 // Retrieve all at once
});

// Efficient institution lookup
const institutions = await client.institutions.getInstitutions({
  filter: {
    'ror': [
      'https://ror.org/01an7q238',
      'https://ror.org/03vek6s52',
      'https://ror.org/02jzrsm10'
    ]
  }
});
```

### Caching Strategies

```typescript
// Cache frequently accessed entities by external ID
const externalIdCache = new Map<string, any>();

async function getCachedEntity(client: OpenAlexClient, externalId: string) {
  if (externalIdCache.has(externalId)) {
    return externalIdCache.get(externalId);
  }

  const entity = await getEntityByAnyId(client, externalId);
  externalIdCache.set(externalId, entity);
  return entity;
}
```

## Migration and Data Mapping

### Legacy System Integration

```typescript
// Map from legacy internal IDs to OpenAlex entities
interface LegacyMapping {
  internalId: string;
  externalId: string;
  externalType: 'doi' | 'orcid' | 'ror' | 'issn';
}

async function migrateLegacyData(
  client: OpenAlexClient,
  mappings: LegacyMapping[]
) {
  const results = [];

  for (const mapping of mappings) {
    try {
      const entity = await safeGetEntity(
        client,
        mapping.externalType,
        mapping.externalId
      );

      results.push({
        legacyId: mapping.internalId,
        openAlexId: entity.id,
        externalId: mapping.externalId,
        success: true
      });
    } catch (error) {
      results.push({
        legacyId: mapping.internalId,
        externalId: mapping.externalId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}
```

## Conclusion

External IDs provide powerful integration capabilities for the OpenAlex API client. By understanding format specifications, validation rules, and common usage patterns, you can build robust applications that seamlessly integrate with existing academic and research systems.

Key takeaways:
- Always validate external ID formats before API calls
- Use batch operations for better performance
- Handle both URL and canonical formats consistently
- Implement proper error handling for invalid or missing IDs
- Cache frequently accessed entities to improve performance
- Consider case sensitivity requirements for different ID types

For more information, refer to the [OpenAlex API documentation](https://docs.openalex.org/) and the individual entity API documentation within this client.