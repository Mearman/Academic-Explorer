# Unpaywall API Documentation

**Category:** Open Access Discovery
**Data Type:** Open access article locations, OA status indicators
**API Type:** REST API
**Authentication:** None required
**Rate Limits:** 100,000 requests/day

## Overview

Unpaywall is a massive open database of 30,000,000+ free scholarly PDFs. The API helps researchers, developers, and institutions discover legal open access versions of academic papers by looking up DOIs and returning information about open access availability and locations.

## Key Features

- **30+ million open access PDFs** in the database
- **DOI-based lookup** for instant OA status checking
- **Multiple OA source types** (preprints, postprints, publisher versions)
- **Legal OA only** - respects copyright and publisher policies
- **Real-time updates** with new OA content added continuously
- **High performance** - 100,000 requests/day rate limit
- **Free for everyone** - no registration or API keys required

## Documentation

- **API Documentation:** https://unpaywall.org/api
- **Data Source:** https://unpaywall.org/data
- **GitHub Repository:** https://github.com/impactstory/unpaywall
- **FAQ:** https://unpaywall.org/faq

## Rate Limits

- **100,000 requests per day** per IP address
- **No authentication** required
- **Respectful usage** encouraged
- **Add delays** between batch requests
- **Cache responses** to reduce server load

## API Endpoints

### DOI Lookup
```bash
# Basic OA status lookup
https://api.unpaywall.org/v2/10.1038/nature12373?email=your-email@example.com

# Lookup with email (recommended for usage statistics)
https://api.unpaywall.org/v2/{doi}?email=your-email@example.com

# Lookup without email
https://api.unpaywall.org/v2/{doi}
```

### Batch Processing
```bash
# Multiple DOI requests (process sequentially with delays)
# Note: Unpaywall doesn't support batch requests, but you can process multiple DOIs
```

## Implementation Examples

### Basic DOI Lookup (JavaScript)
```javascript
class UnpaywallAPI {
  constructor(email = null) {
    this.baseURL = 'https://api.unpaywall.org/v2';
    this.email = email; // Optional email for usage statistics
    this.requestDelay = 100; // 100ms between requests
    this.lastRequest = 0;
    this.dailyLimit = 100000;
    this.requestCount = 0;
    this.lastReset = Date.now();
  }

  async makeRequest(url) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLast));
    }

    // Daily limit reset
    if (now - this.lastReset > 24 * 60 * 60 * 1000) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    if (this.requestCount >= this.dailyLimit) {
      throw new Error('Daily API limit exceeded');
    }

    this.lastRequest = Date.now();
    this.requestCount++;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Unpaywall API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async lookupDOI(doi) {
    if (!doi) {
      throw new Error('DOI is required');
    }

    // Clean DOI format
    const cleanDOI = doi.startsWith('https://doi.org/') ?
      doi.replace('https://doi.org/', '') : doi;

    const url = new URL(`${this.baseURL}/${encodeURIComponent(cleanDOI)}`);
    if (this.email) {
      url.searchParams.append('email', this.email);
    }

    const data = await this.makeRequest(url.toString());
    return this.parseResponse(data);
  }

  parseResponse(data) {
    return {
      doi: data.doi,
      oaStatus: data.oa_status,
      oaLocations: data.oa_locations ? data.oa_locations.map(this.parseOALocation) : [],
      bestOALocation: data.best_oa_location ? this.parseOALocation(data.best_oa_location) : null,
      title: data.title,
      publishedDate: data.published_date,
      journal: data.journal_name,
      publisher: data.publisher,
      genre: data.genre,
      isOa: data.is_oa,
      oaLocationsCount: data.oa_locations_count,
      firstPublicationDate: data.first_publication_date,
      year: data.year
    };
  }

  parseOALocation(location) {
    return {
      url: location.url,
      pmcid: location.pmcid || null,
      doi: location.doi || null,
      license: location.license || null,
      version: location.version || null,
      hostType: location.host_type,
      isBest: location.is_best || false,
      pmhId: location.pmh_id || null,
      updated: location.updated || null
    };
  }

  async batchLookup(dois, options = {}) {
    const results = [];
    const delay = options.delay || this.requestDelay;

    for (const doi of dois) {
      try {
        const result = await this.lookupDOI(doi);
        results.push({ doi, success: true, data: result });
      } catch (error) {
        results.push({ doi, success: false, error: error.message });
      }

      // Add delay between requests
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  async checkOpenAccessStatus(doi) {
    const result = await this.lookupDOI(doi);

    return {
      isOpenAccess: result.isOa,
      oaStatus: result.oaStatus,
      oaLocationsCount: result.oaLocationsCount,
      bestLocation: result.bestOALocation,
      summary: this.createOASummary(result)
    };
  }

  createOASummary(result) {
    if (!result.isOa) {
      return "No open access version available";
    }

    const summary = [];
    summary.push(`Open Access (${result.oaStatus})`);

    if (result.bestOALocation) {
      summary.push(`Best location: ${result.bestOALocation.hostType}`);
    }

    if (result.oaLocationsCount > 0) {
      summary.push(`${result.oaLocationsCount} OA location(s) found`);
    }

    return summary.join(' " ');
  }
}

// Usage example
const unpaywall = new UnpaywallAPI('researcher@university.edu');

// Check OA status for a paper
unpaywall.checkOpenAccessStatus('10.1038/nature12373').then(result => {
  console.log(`OA Status: ${result.oaStatus}`);
  console.log(`Open Access: ${result.isOpenAccess}`);
  console.log(`Summary: ${result.summary}`);

  if (result.bestLocation) {
    console.log(`Best OA location: ${result.bestLocation.url}`);
  }
});

// Batch processing
const dois = [
  '10.1038/nature12373',
  '10.1126/science.1234567',
  '10.1016/j.cell.2019.01.001'
];

unpaywall.batchLookup(dois, { delay: 200 }).then(results => {
  results.forEach(result => {
    if (result.success) {
      console.log(`${result.doi}: ${result.data.isOa ? 'OA' : 'Closed'}`);
    } else {
      console.log(`${result.doi}: Error - ${result.error}`);
    }
  });
});
```

### Advanced OA Discovery (Python)
```python
import requests
import time
from typing import Dict, List, Optional
from dataclasses import dataclass
from urllib.parse import quote

@dataclass
class OALocation:
    url: str
    pmcid: Optional[str] = None
    doi: Optional[str] = None
    license: Optional[str] = None
    version: Optional[str] = None
    host_type: Optional[str] = None
    is_best: bool = False

@dataclass
class UnpaywallResult:
    doi: str
    oa_status: str
    oa_locations: List[OALocation]
    best_oa_location: Optional[OALocation]
    title: str
    published_date: Optional[str]
    journal: str
    publisher: str
    genre: str
    is_oa: bool
    oa_locations_count: int

class UnpaywallAPI:
    def __init__(self, email: Optional[str] = None, request_delay: float = 0.1):
        self.base_url = "https://api.unpaywall.org/v2"
        self.email = email
        self.request_delay = request_delay
        self.last_request = 0
        self.daily_limit = 100000
        self.request_count = 0
        self.last_reset = time.time()

    def _make_request(self, url: str) -> Dict:
        """Make API request with rate limiting."""
        # Rate limiting
        now = time.time()
        time_since_last = now - self.last_request
        if time_since_last < self.request_delay:
            time.sleep(self.request_delay - time_since_last)

        # Daily limit reset
        if now - self.last_reset > 24 * 60 * 60:
            self.request_count = 0
            self.last_reset = now

        if self.request_count >= self.daily_limit:
            raise Exception("Daily API limit exceeded")

        self.last_request = time.time()
        self.request_count += 1

        response = requests.get(url)
        response.raise_for_status()
        return response.json()

    def _parse_oa_location(self, location: Dict) -> OALocation:
        """Parse OA location data."""
        return OALocation(
            url=location.get('url', ''),
            pmcid=location.get('pmcid'),
            doi=location.get('doi'),
            license=location.get('license'),
            version=location.get('version'),
            host_type=location.get('host_type'),
            is_best=location.get('is_best', False)
        )

    def lookup_doi(self, doi: str) -> UnpaywallResult:
        """Lookup OA status for a DOI."""
        if not doi:
            raise ValueError("DOI is required")

        # Clean DOI format
        clean_doi = doi.replace('https://doi.org/', '') if doi.startswith('https://doi.org/') else doi

        url = f"{self.base_url}/{quote(clean_doi)}"
        if self.email:
            url += f"?email={self.email}"

        data = self._make_request(url)
        return self._parse_response(data)

    def _parse_response(self, data: Dict) -> UnpaywallResult:
        """Parse API response."""
        oa_locations = [self._parse_oa_location(loc) for loc in data.get('oa_locations', [])]
        best_location = self._parse_oa_location(data['best_oa_location']) if data.get('best_oa_location') else None

        return UnpaywallResult(
            doi=data.get('doi', ''),
            oa_status=data.get('oa_status', ''),
            oa_locations=oa_locations,
            best_oa_location=best_location,
            title=data.get('title', ''),
            published_date=data.get('published_date'),
            journal=data.get('journal_name', ''),
            publisher=data.get('publisher', ''),
            genre=data.get('genre', ''),
            is_oa=data.get('is_oa', False),
            oa_locations_count=data.get('oa_locations_count', 0)
        )

    def batch_lookup(self, dois: List[str], delay: float = None) -> List[Dict]:
        """Process multiple DOIs."""
        results = []
        delay = delay or self.request_delay

        for doi in dois:
            try:
                result = self.lookup_doi(doi)
                results.append({'doi': doi, 'success': True, 'data': result})
            except Exception as e:
                results.append({'doi': doi, 'success': False, 'error': str(e)})

            if delay > 0:
                time.sleep(delay)

        return results

    def get_open_access_pdfs(self, doi: str) -> List[str]:
        """Get all open access PDF URLs for a DOI."""
        result = self.lookup_doi(doi)
        pdf_urls = []

        for location in result.oa_locations:
            if location.url and location.url.endswith('.pdf'):
                pdf_urls.append(location.url)

        return pdf_urls

    def get_best_oa_url(self, doi: str) -> Optional[str]:
        """Get the best open access URL for a DOI."""
        result = self.lookup_doi(doi)
        return result.best_oa_location.url if result.best_oa_location else None

# Usage example
unpaywall = UnpaywallAPI(email='researcher@university.edu')

# Check OA status
result = unpaywall.lookup_doi('10.1038/nature12373')
print(f"Title: {result.title}")
print(f"OA Status: {result.oa_status}")
print(f"Open Access: {result.is_oa}")

if result.best_oa_location:
    print(f"Best OA URL: {result.best_oa_location.url}")
    print(f"License: {result.best_oa_location.license}")

# Get PDF URLs
pdf_urls = unpaywall.get_open_access_pdfs('10.1038/nature12373')
print(f"PDF URLs found: {len(pdf_urls)}")
for url in pdf_urls:
    print(f"  {url}")
```

### Citation Analysis Integration
```javascript
class CitationAnalyzer {
  constructor(unpaywallAPI) {
    this.unpaywall = unpaywallAPI;
  }

  async analyzeCitationAccess(citations) {
    const analysis = {
      total: citations.length,
      openAccess: 0,
      closedAccess: 0,
      greenOA: 0,         // Self-archived
      goldOA: 0,          // Publisher OA
      hybridOA: 0,        // Hybrid journal
      bronzeOA: 0,        // Free-to-read
      byLicense: {},
      byHostType: {},
      oaLocations: []
    };

    const dois = citations
      .filter(cit => cit.doi)
      .map(cit => cit.doi);

    const results = await this.unpaywall.batchLookup(dois, { delay: 150 });

    results.forEach(result => {
      if (result.success) {
        const data = result.data;

        if (data.isOa) {
          analysis.openAccess++;

          // Categorize by OA status
          switch (data.oaStatus) {
            case 'green': analysis.greenOA++; break;
            case 'gold': analysis.goldOA++; break;
            case 'hybrid': analysis.hybridOA++; break;
            case 'bronze': analysis.bronzeOA++; break;
          }

          // Track licenses
          if (data.bestOALocation && data.bestOALocation.license) {
            const license = data.bestOALocation.license;
            analysis.byLicense[license] = (analysis.byLicense[license] || 0) + 1;
          }

          // Track host types
          if (data.bestOALocation) {
            const hostType = data.bestOALocation.hostType;
            analysis.byHostType[hostType] = (analysis.byHostType[hostType] || 0) + 1;
          }

          // Collect OA locations
          analysis.oaLocations.push({
            doi: data.doi,
            title: data.title,
            url: data.bestOALocation.url,
            license: data.bestOALocation.license,
            hostType: data.bestOALocation.hostType
          });
        } else {
          analysis.closedAccess++;
        }
      }
    });

    return analysis;
  }

  generateAccessReport(analysis) {
    const oaPercentage = ((analysis.openAccess / analysis.total) * 100).toFixed(1);

    return {
      summary: {
        totalCitations: analysis.total,
        openAccessCount: analysis.openAccess,
        closedAccessCount: analysis.closedAccess,
        openAccessPercentage: oaPercentage
      },
      oaTypes: {
        green: analysis.greenOA,
        gold: analysis.goldOA,
        hybrid: analysis.hybridOA,
        bronze: analysis.bronzeOA
      },
      topLicenses: Object.entries(analysis.byLicense)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([license, count]) => ({ license, count })),
      topHostTypes: Object.entries(analysis.byHostType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([hostType, count]) => ({ hostType, count })),
      oaLocations: analysis.oaLocations
    };
  }
}

// Usage example
const analyzer = new CitationAnalyzer(unpaywall);

const citations = [
  { doi: '10.1038/nature12373', title: 'Paper 1' },
  { doi: '10.1126/science.1234567', title: 'Paper 2' },
  { doi: '10.1016/j.cell.2019.01.001', title: 'Paper 3' }
];

analyzer.analyzeCitationAccess(citations).then(analysis => {
  const report = analyzer.generateAccessReport(analysis);

  console.log(`Total citations: ${report.summary.totalCitations}`);
  console.log(`Open Access: ${report.summary.openAccessCount} (${report.summary.openAccessPercentage}%)`);
  console.log(`By OA type: Green ${report.oaTypes.green}, Gold ${report.oaTypes.gold}`);
  console.log(`Top licenses:`, report.topLicenses);
});
```

## Data Models

### OA Status Types
- **`green`** - Self-archived version available (preprint, postprint)
- **`gold`** - Published in open access journal
- **`hybrid`** - Published in hybrid journal (subscription journal with OA option)
- **`bronze`** - Free to read on publisher site without explicit OA license
- **`closed`** - No open access version found

### OA Location Object
```json
{
  "url": "https://arxiv.org/pdf/2301.00000.pdf",
  "pmcid": "PMC123456",
  "doi": "10.1016/j.cell.2019.01.001",
  "license": "CC BY 4.0",
  "version": "acceptedVersion",
  "host_type": "preprint",
  "is_best": true,
  "pmh_id": "oai:arXiv.org:2301.00000",
  "updated": "2023-01-15T10:30:00Z"
}
```

### API Response Structure
```json
{
  "doi": "10.1038/nature12373",
  "oa_status": "green",
  "oa_locations": [...],
  "best_oa_location": {...},
  "title": "Machine Learning for Scientific Discovery",
  "published_date": "2023-01-15",
  "journal_name": "Nature",
  "publisher": "Nature Publishing Group",
  "genre": "journal-article",
  "is_oa": true,
  "oa_locations_count": 2,
  "first_publication_date": "2023-01-15",
  "year": 2023
}
```

## Common Use Cases

### Research Paper Discovery
```javascript
class ResearchAssistant {
  constructor(unpaywallAPI) {
    this.unpaywall = unpaywallAPI;
  }

  async findOpenAccessVersions(referenceList) {
    const results = await this.unpaywall.batchLookup(
      referenceList.filter(ref => ref.doi).map(ref => ref.doi),
      { delay: 100 }
    );

    const openAccessPapers = results.filter(result =>
      result.success && result.data.isOa
    );

    return {
      totalPapers: referenceList.length,
      openAccessCount: openAccessPapers.length,
      openAccessPercentage: ((openAccessPapers.length / referenceList.length) * 100).toFixed(1),
      openAccessPapers: openAccessPapers.map(result => ({
        doi: result.data.doi,
        title: result.data.title,
        oaStatus: result.data.oaStatus,
        bestUrl: result.data.bestOALocation?.url,
        license: result.data.bestOALocation?.license,
        hostType: result.data.bestOALocation?.hostType
      }))
    };
  }

  async buildOpenAccessLibrary(dois, preferences = {}) {
    const library = [];
    const maxRetries = 3;

    for (const doi of dois) {
      let success = false;
      let result = null;

      for (let attempt = 0; attempt < maxRetries && !success; attempt++) {
        try {
          result = await this.unpaywall.lookupDOI(doi);

          if (result.isOa && result.bestOALocation) {
            const paper = {
              doi: result.doi,
              title: result.title,
              authors: [], // Would need to fetch from other APIs
              journal: result.journal,
              year: result.year,
              oaStatus: result.oaStatus,
              urls: result.oaLocations.map(loc => ({
                url: loc.url,
                type: loc.hostType,
                license: loc.license,
                version: loc.version,
                isBest: loc.isBest
              })),
              bestUrl: result.bestOALocation.url,
              bestLicense: result.bestOALocation.license
            };

            // Apply preferences
            if (this.matchesPreferences(paper, preferences)) {
              library.push(paper);
            }
          }

          success = true;
        } catch (error) {
          console.warn(`Attempt ${attempt + 1} failed for DOI ${doi}: ${error.message}`);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
    }

    return library;
  }

  matchesPreferences(paper, preferences) {
    // License preferences
    if (preferences.allowedLicenses && paper.bestLicense) {
      if (!preferences.allowedLicenses.includes(paper.bestLicense)) {
        return false;
      }
    }

    // Host type preferences
    if (preferences.preferredHostTypes && paper.bestUrl) {
      const bestLocation = paper.urls.find(url => url.isBest);
      if (bestLocation && !preferences.preferredHostTypes.includes(bestLocation.type)) {
        return false;
      }
    }

    // Version preferences
    if (preferences.preferredVersions && paper.bestUrl) {
      const bestLocation = paper.urls.find(url => url.isBest);
      if (bestLocation && !preferences.preferredVersions.includes(bestLocation.version)) {
        return false;
      }
    }

    return true;
  }
}

// Usage example
const assistant = new ResearchAssistant(unpaywall);

const referenceList = [
  { doi: '10.1038/nature12373', title: 'Paper 1' },
  { doi: '10.1126/science.1234567', title: 'Paper 2' },
  // ... more references
];

assistant.findOpenAccessVersions(referenceList).then(analysis => {
  console.log(`Found ${analysis.openAccessCount} open access papers out of ${analysis.totalPapers}`);
  console.log(`Open Access rate: ${analysis.openAccessPercentage}%`);

  analysis.openAccessPapers.forEach(paper => {
    console.log(`- ${paper.title} (${paper.license})`);
    console.log(`  ${paper.bestUrl}`);
  });
});
```

## Best Practices

1. **Include your email** in API requests for usage statistics and service improvements
2. **Implement rate limiting** - stay within 100,000 requests/day limits
3. **Cache responses** to reduce duplicate requests
4. **Handle different OA types** appropriately (green, gold, hybrid, bronze)
5. **Respect copyright** - only use OA versions that are legally available
6. **Add appropriate delays** between batch requests (100ms recommended)
7. **Monitor usage** to stay within daily limits
8. **Use the best_oa_location** field when available for optimal results

## Error Handling

```javascript
async function robustUnpaywallLookup(unpaywallAPI, doi, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await unpaywallAPI.lookupDOI(doi);
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('503')) {
        // Server overloaded - exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (error.message.includes('Daily API limit exceeded')) {
        // Wait for daily reset
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const waitTime = tomorrow.getTime() - Date.now();

        throw new Error(`API limit exceeded. Resets in ${Math.round(waitTime / (1000 * 60 * 60))} hours`);
      }

      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **Crossref API** - For DOI metadata and license information
- **OpenAlex API** - For comprehensive scholarly data including OA status
- **Semantic Scholar API** - For paper discovery and some OA content
- **CORE API** - For aggregated open access content
- **DOAJ API** - For open access journal directory

## Support

- **Documentation:** https://unpaywall.org/api
- **FAQ:** https://unpaywall.org/faq
- **Data Source:** https://unpaywall.org/data
- **GitHub:** https://github.com/impactstory/unpaywall
- **Contact:** Available through Unpaywall website

---

*Last updated: 2025-10-27*