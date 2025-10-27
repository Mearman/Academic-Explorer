# PubMed/NCBI E-utilities API Documentation

**Category:** Biomedical Literature
**Data Type:** Biomedical papers, citations, genes
**API Type:** REST API
**Authentication:** Free API key available
**Rate Limits:** 3 requests/second without key, 10/second with key

## Overview

The NCBI E-utilities provide free programmatic access to the National Library of Medicine's PubMed database of biomedical literature, along with related databases for genes, proteins, chemicals, and clinical trials.

## Key Features

- **PubMed database access** with millions of biomedical citations
- **Full-text articles** via PubMed Central (PMC)
- **Gene and protein information** from specialized databases
- **Chemical data** and substance information
- **Clinical trials** database access
- **Entrez Programming Utilities** for comprehensive biomedical data

## Authentication

- **No API key required** for basic access (3 requests/second)
- **Free API key available** for enhanced access (10 requests/second)
- **NCBI account** required for API key generation
- **Email parameter** recommended for contact information

## Documentation

- **E-utilities Overview:** https://www.ncbi.nlm.nih.gov/books/NBK25500/
- **API Key Setup:** https://www.ncbi.nlm.nih.gov/account/settings/
- **Rate Limits:** https://www.ncbi.nlm.nih.gov/books/NBK25497/#chapter2.Usage_Guidelines_and_Requiremen
- **E-utilities Details:** https://www.ncbi.nlm.nih.gov/books/NBK25501/

## Rate Limits

- **Without API key:** 3 requests per second
- **With API key:** 10 requests per second
- **IP-based rate limiting** for shared connections
- **Email parameter** helps with monitoring and support

## API Endpoints

### ESearch (Search and Retrieve IDs)
```bash
# Basic search
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=machine+learning&retmode=json

# Search with filters
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=machine+learning+AND+2023[pdat]&retmode=json&retmax=20

# Gene database search
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=BRCA1&retmode=json
```

### ESummary (Get Document Summaries)
```bash
# Get summaries for multiple PubMed IDs
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=12345678,87654321&retmode=json

# Get gene summaries
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=672&retmode=json
```

### EFetch (Get Full Records)
```bash
# Get abstract in XML format
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=12345678&rettype=abstract&retmode=xml

# Get full text from PubMed Central
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=PMC123456&rettype=full&retmode=xml
```

### ELink (Find Related Links)
```bash
# Find citations for a paper
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi?dbfrom=pubmed&db=pubmed&id=12345678&linkname=pubmed_pubmed_citedin&retmode=json

# Find full text links
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi?dbfrom=pubmed&db=pmc&id=12345678&linkname=pubmed_pmc&retmode=json
```

## Implementation Examples

### Basic Search and Retrieval (JavaScript)
```javascript
class PubMedAPI {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    this.rateLimitDelay = this.apiKey ? 100 : 333; // 10/sec or 3/sec
    this.lastRequest = 0;
  }

  async makeRequest(endpoint, params = {}) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLast));
    }
    this.lastRequest = Date.now();

    const url = new URL(`${this.baseUrl}/${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    if (this.apiKey) {
      url.searchParams.append('api_key', this.apiKey);
    }

    // Add email for support (recommended)
    url.searchParams.append('email', 'your-email@example.com');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`PubMed API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async search(query, options = {}) {
    const params = {
      db: 'pubmed',
      term: query,
      retmode: 'json',
      retmax: options.maxResults || 20,
      ...options
    };

    const searchResult = await this.makeRequest('esearch.fcgi', params);
    return searchResult.esearchresult;
  }

  async getSummaries(pmids) {
    if (pmids.length === 0) return [];

    const params = {
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'json'
    };

    const summaryResult = await this.makeRequest('esummary.fcgi', params);
    return summaryResult.result;
  }

  async getAbstracts(pmids) {
    const params = {
      db: 'pubmed',
      id: pmids.join(','),
      rettype: 'abstract',
      retmode: 'xml'
    };

    const response = await fetch(`${this.baseUrl}/efetch.fcgi?${new URLSearchParams(params)}`);
    const xmlText = await response.text();
    return this.parseAbstractsXML(xmlText);
  }

  parseAbstractsXML(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const articles = doc.querySelectorAll('PubmedArticle');

    const abstracts = [];
    articles.forEach(article => {
      const pmid = article.querySelector('PMID')?.textContent;
      const title = article.querySelector('ArticleTitle')?.textContent?.trim() || '';
      const abstract = article.querySelector('AbstractText')?.textContent?.trim() || '';
      const authors = Array.from(article.querySelectorAll('Author')).map(author => ({
        lastName: author.querySelector('LastName')?.textContent || '',
        foreName: author.querySelector('ForeName')?.textContent || '',
        initials: author.querySelector('Initials')?.textContent || ''
      }));
      const journal = article.querySelector('ISOAbbreviation')?.textContent || '';
      const pubDate = article.querySelector('PubDate')?.textContent || '';

      abstracts.push({
        pmid,
        title,
        abstract,
        authors,
        journal,
        pubDate
      });
    });

    return abstracts;
  }

  async getCitations(pmid) {
    const params = {
      dbfrom: 'pubmed',
      db: 'pubmed',
      id: pmid,
      linkname: 'pubmed_pubmed_citedin',
      retmode: 'json'
    };

    const result = await this.makeRequest('elink.fcgi', params);
    return result.linksets[0]?.linksetdbs?.[0]?.links || [];
  }

  async getFullTextLinks(pmid) {
    const params = {
      dbfrom: 'pubmed',
      db: 'pmc',
      id: pmid,
      linkname: 'pubmed_pmc',
      retmode: 'json'
    };

    const result = await this.makeRequest('elink.fcgi', params);
    const links = result.linksets[0]?.linksetdbs?.[0]?.links || [];

    return links.map(link => ({
      pmcid: link.id,
      type: link.linkname,
      url: link.url
    }));
  }
}

// Usage example
const pubmed = new PubMedAPI(); // Add API key if available

// Search for machine learning papers in 2023
pubmed.search('machine learning AND 2023[pdat]', { maxResults: 10 }).then(searchResult => {
  console.log(`Found ${searchResult.count} papers`);
  console.log(`PMIDs: ${searchResult.idlist.join(', ')}`);

  // Get detailed summaries
  return pubmed.getSummaries(searchResult.idlist);
}).then(summaries => {
  Object.entries(summaries).forEach(([pmid, summary]) => {
    if (pmid !== 'uids') {
      console.log(`\nPMID: ${pmid}`);
      console.log(`Title: ${summary.title}`);
      console.log(`Authors: ${summary.authors?.map(a => a.name).join(', ') || 'N/A'}`);
      console.log(`Journal: ${summary.source || 'N/A'}`);
      console.log(`Pub Date: ${summary.pubdate || 'N/A'}`);
    }
  });
});
```

### Advanced Biomedical Research (Python)
```python
import requests
import xml.etree.ElementTree as ET
import time
from typing import List, Dict, Any

class PubMedAPI:
    def __init__(self, api_key=None, email=None):
        self.api_key = api_key
        self.email = email or 'your-email@example.com'
        self.base_url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
        self.rate_limit_delay = 0.1 if api_key else 0.333  # 10/sec or 3/sec
        self.last_request = 0

    def make_request(self, endpoint, params=None):
        """Make a rate-limited request to NCBI E-utilities."""
        # Rate limiting
        now = time.time()
        time_since_last = now - self.last_request
        if time_since_last < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - time_since_last)
        self.last_request = time.time()

        url = f"{self.base_url}/{endpoint}"
        request_params = {
            'email': self.email,
            'retmode': 'json',
            **(params or {})
        }

        if self.api_key:
            request_params['api_key'] = self.api_key

        response = requests.get(url, params=request_params)
        response.raise_for_status()
        return response.json()

    def search(self, query, max_results=20, database='pubmed'):
        """Search PubMed database."""
        params = {
            'db': database,
            'term': query,
            'retmax': max_results
        }

        result = self.make_request('esearch.fcgi', params)
        return result['esearchresult']

    def get_summaries(self, pmids, database='pubmed'):
        """Get document summaries for given PMIDs."""
        if not pmids:
            return {}

        params = {
            'db': database,
            'id': ','.join(pmids) if isinstance(pmids, list) else pmids
        }

        result = self.make_request('esummary.fcgi', params)
        return result['result']

    def get_abstracts(self, pmids):
        """Get full abstracts in XML format."""
        if not pmids:
            return []

        params = {
            'db': 'pubmed',
            'id': ','.join(pmids) if isinstance(pmids, list) else pmids,
            'rettype': 'abstract',
            'retmode': 'xml'
        }

        url = f"{self.base_url}/efetch.fcgi"
        response = requests.get(url, params=params)
        response.raise_for_status()

        return self.parse_abstracts_xml(response.text)

    def parse_abstracts_xml(self, xml_text):
        """Parse XML abstracts into structured data."""
        root = ET.fromstring(xml_text)
        articles = []

        for article in root.findall('.//PubmedArticle'):
            pmid_elem = article.find('.//PMID')
            title_elem = article.find('.//ArticleTitle')
            abstract_elem = article.find('.//AbstractText')

            article_data = {
                'pmid': pmid_elem.text if pmid_elem is not None else None,
                'title': title_elem.text.strip() if title_elem is not None else '',
                'abstract': abstract_elem.text.strip() if abstract_elem is not None else '',
                'authors': [],
                'journal': '',
                'publication_date': ''
            }

            # Extract authors
            authors = article.findall('.//Author')
            for author in authors:
                last_name = author.find('.//LastName')
                first_name = author.find('.//ForeName')
                if last_name is not None:
                    author_data = {
                        'last_name': last_name.text,
                        'first_name': first_name.text if first_name is not None else ''
                    }
                    article_data['authors'].append(author_data)

            # Extract journal information
            journal_elem = article.find('.//ISOAbbreviation')
            if journal_elem is not None:
                article_data['journal'] = journal_elem.text

            # Extract publication date
            pub_date_elem = article.find('.//PubDate')
            if pub_date_elem is not None:
                article_data['publication_date'] = ET.tostring(pub_date_elem, encoding='unicode')

            articles.append(article_data)

        return articles

    def get_citations(self, pmid):
        """Get papers that cite the given paper."""
        params = {
            'dbfrom': 'pubmed',
            'db': 'pubmed',
            'id': pmid,
            'linkname': 'pubmed_pubmed_citedin'
        }

        result = self.make_request('elink.fcgi', params)
        linksets = result.get('linksets', [])
        if linksets:
            linksetdbs = linksets[0].get('linksetdbs', [])
            if linksetdbs:
                return linksetdbs[0].get('links', [])
        return []

    def get_full_text_links(self, pmid):
        """Get full-text links (primarily from PubMed Central)."""
        params = {
            'dbfrom': 'pubmed',
            'db': 'pmc',
            'id': pmid,
            'linkname': 'pubmed_pmc'
        }

        result = self.make_request('elink.fcgi', params)
        links = []

        linksets = result.get('linksets', [])
        if linksets:
            linksetdbs = linksets[0].get('linksetdbs', [])
            if linksetdbs:
                links = linksetdbs[0].get('links', [])

        return [{'pmcid': link['id'], 'url': link['url']} for link in links]

    def search_genes(self, gene_symbol, organism='human'):
        """Search for gene information."""
        query = f"{gene_symbol}[Gene Name] AND {organism}[Organism]"
        return self.search(query, database='gene')

    def get_gene_info(self, gene_id):
        """Get detailed gene information."""
        params = {
            'db': 'gene',
            'id': gene_id
        }

        result = self.make_request('esummary.fcgi', params)
        return result['result'].get(str(gene_id), {})

# Usage example
pubmed = PubMedAPI()  # Add api_key='YOUR_API_KEY' if available

# Search for COVID-19 research papers from 2023
search_result = pubmed.search('COVID-19 AND 2023[pdat]', max_results=5)
print(f"Found {search_result['count']} papers")

if search_result['idlist']:
    # Get abstracts
    abstracts = pubmed.get_abstracts(search_result['idlist'])

    for abstract in abstracts:
        print(f"\nPMID: {abstract['pmid']}")
        print(f"Title: {abstract['title']}")
        print(f"Authors: {', '.join([f\"{a['first_name']} {a['last_name']}\" for a in abstract['authors'][:3]])}")
        print(f"Journal: {abstract['journal']}")
        print(f"Abstract: {abstract['abstract'][:200]}...")
```

### Citation Network Analysis
```javascript
async function buildCitationNetwork(pmid, pubmedAPI, maxDepth = 2) {
  const network = { nodes: new Map(), edges: [] };
  const visited = new Set();
  const queue = [{ id: pmid, depth: 0 }];

  while (queue.length > 0 && visited.size < 100) { // Limit total nodes
    const { id, depth } = queue.shift();

    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);

    try {
      // Get paper details
      const summaries = await pubmedAPI.getSummaries([id]);
      const paperData = summaries[id];

      if (!paperData) continue;

      // Add node
      network.nodes.set(id, {
        id,
        title: paperData.title,
        authors: paperData.authors?.map(a => a.name) || [],
        journal: paperData.source,
        year: paperData.pubdate?.split(' ')[0] || 'Unknown'
      });

      // Get citations (papers that cite this paper)
      const citations = await pubmedAPI.getCitations(id);

      for (const citation of citations.slice(0, 10)) { // Limit citations per paper
        const citingId = citation.id;

        network.edges.push({
          source: citingId,
          target: id,
          type: 'cites'
        });

        if (!visited.has(citingId) && depth < maxDepth) {
          queue.push({ id: citingId, depth: depth + 1 });
        }
      }
    } catch (error) {
      console.error(`Error processing PMID ${id}:`, error);
    }
  }

  return {
    nodes: Array.from(network.nodes.values()),
    edges: network.edges,
    metadata: {
      totalNodes: network.nodes.size,
      totalEdges: network.edges.length,
      maxDepth
    }
  };
}
```

## Data Models

### PubMed Summary Object
```json
{
  "uid": "12345678",
  "title": "Machine Learning Approaches to COVID-19 Detection",
  "authors": [
    {
      "name": "Smith J",
      "authtype": "Author",
      "clusterid": "123456"
    }
  ],
  "source": "Journal of Medical Informatics",
  "pubdate": "2023 Jan 15",
  "epubdate": "2023 Jan 10",
  "abstract": "Abstract content...",
  "pmcrefcount": 5,
  "elocationid": "10.1234/jmi.2023.123456",
  "doi": "10.1234/jmi.2023.123456",
  "nlmuniqueid": "98765432",
  "issn": "1234-5678",
  "essn": "1878-1234",
  "recordstatus": "PubMed - indexed for MEDLINE",
  "pubstatus": " aheadofprint",
  "articleids": [
    {
      "idtype": "pubmed",
      "idtypen": 8,
      "value": "12345678"
    },
    {
      "idtype": "doi",
      "idtypen": 3,
      "value": "10.1234/jmi.2023.123456"
    }
  ]
}
```

## Common Use Cases

### Literature Review Automation
```javascript
async function systematicLiteratureReview(query, yearRange, pubmedAPI) {
  const [startYear, endYear] = yearRange;

  // Search with date range
  const searchQuery = `${query} AND ${startYear}:${endYear}[pdat]`;
  const searchResult = await pubmedAPI.search(searchQuery, { maxResults: 1000 });

  console.log(`Found ${searchResult.count} papers for review`);

  // Get all abstracts in batches
  const batchSize = 200;
  const allAbstracts = [];

  for (let i = 0; i < searchResult.idlist.length; i += batchSize) {
    const batch = searchResult.idlist.slice(i, i + batchSize);
    const abstracts = await pubmedAPI.getAbstracts(batch);
    allAbstracts.push(...abstracts);

    // Add delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Analyze publication trends
  const yearlyCounts = {};
  const journalCounts = {};
  const authorCounts = {};

  allAbstracts.forEach(abstract => {
    const year = abstract.pubDate?.split(' ')[0] || 'Unknown';
    yearlyCounts[year] = (yearlyCounts[year] || 0) + 1;

    journalCounts[abstract.journal] = (journalCounts[abstract.journal] || 0) + 1;

    abstract.authors.forEach(author => {
      const fullName = `${author.foreName} ${author.lastName}`;
      authorCounts[fullName] = (authorCounts[fullName] || 0) + 1;
    });
  });

  return {
    query,
    yearRange,
    totalPapers: allAbstracts.length,
    abstracts: allAbstracts,
    analysis: {
      yearlyTrends: yearlyCounts,
      topJournals: Object.entries(journalCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([journal, count]) => ({ journal, count })),
      topAuthors: Object.entries(authorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([author, count]) => ({ author, count }))
    }
  };
}
```

## Best Practices

1. **Obtain an API key** for higher rate limits (10 vs 3 requests/second)
2. **Include email parameter** for monitoring and support
3. **Implement rate limiting** to respect NCBI servers
4. **Use batch requests** when possible to reduce API calls
5. **Cache results** for frequently accessed data
6. **Handle XML parsing** carefully with proper error handling
7. **Use appropriate database** (pubmed, pmc, gene, etc.) for your use case

## Error Handling

```javascript
async function safePubMedRequest(pubmedAPI, requestFunc, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFunc();
    } catch (error) {
      if (error.message.includes('429')) {
        // Rate limited - exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (error.message.includes('400')) {
        // Bad request - don't retry
        throw error;
      }

      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **OpenAlex API** - For comprehensive scholarly data including biomedical literature
- **Semantic Scholar API** - For citation analysis and recommendations
- **Crossref API** - For DOI metadata and linking
- **Europe PMC** - European alternative to PubMed

## Support

- **Documentation:** https://www.ncbi.nlm.nih.gov/books/NBK25500/
- **API Key:** https://www.ncbi.nlm.nih.gov/account/settings/
- **Help:** https://www.ncbi.nlm.nih.gov/help/
- **Contact:** Available through NCBI website

---

*Last updated: 2025-10-27*