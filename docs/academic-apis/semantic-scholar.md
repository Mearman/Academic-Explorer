# Semantic Scholar API Documentation

**Category:** Academic Paper Search and Analysis
**Data Type:** Papers, Authors, Citations, Topics
**API Type:** REST API
**Authentication:** None required for basic usage
**Rate Limits:** 100 requests/second per user agent

## Overview

Semantic Scholar provides a free, official API for academic paper search, citation analysis, and research impact metrics. It offers comprehensive access to paper metadata, citation networks, and author information.

## Key Features

- **Paper recommendations** and search
- **Citation context analysis** with full-text snippets
- **Author information** and influence metrics
- **TL;DR summaries** for quick understanding
- **Topic classification** and concepts
- **Reference linking** and citation networks

## Documentation

- **API Documentation:** https://api.semanticscholar.org/
- **API Reference:** https://api.semanticscholar.org/api-docs
- **GitHub Examples:** https://github.com/semanticscholar/semanticscholar-python
- **Graph API:** https://api.semanticscholar.org/graph/v1

## Rate Limits

- **100 requests per second** per user agent
- **Rate limit headers** included in responses
- **Respectful crawling** encouraged for larger datasets

## API Endpoints

### Paper Search
```bash
# Search papers
https://api.semanticscholar.org/graph/v1/paper/search?query=machine%20learning&limit=10

# Search with specific fields
https://api.semanticscholar.org/graph/v1/paper/search?query=neural%20networks&fields=title,authors,abstract,year,citationCount
```

### Paper Details
```bash
# Get paper by Semantic Scholar ID
https://api.semanticscholar.org/graph/v1/paper/649def34f8be52c8b66281af98ae884c09b5f2ca

# Get paper by external ID (DOI, ARXIV, MAG, etc.)
https://api.semanticscholar.org/graph/v1/paper/DOI:10.1038/nature12373
```

### Author Information
```bash
# Get author by ID
https://api.semanticscholar.org/graph/v1/author/173239825

# Search authors
https://api.semanticscholar.org/graph/v1/author/search?name=john%20smith
```

## Implementation Examples

### Basic Paper Search (JavaScript)
```javascript
async function searchPapers(query, limit = 10) {
  const response = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,authors,abstract,year,citationCount,venue`
  );
  const data = await response.json();
  return data.data;
}

searchPapers('machine learning interpretability').then(papers => {
  papers.forEach(paper => {
    console.log(`${paper.title} (${paper.year})`);
    console.log(`Citations: ${paper.citationCount}`);
    console.log(`Authors: ${paper.authors.map(a => a.name).join(', ')}`);
    console.log('---');
  });
});
```

### Paper Details with References (Python)
```python
import requests

def get_paper_details(paper_id, include_references=True):
    url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}"
    fields = "title,abstract,authors,venue,year,citationCount,referenceCount"

    if include_references:
        fields += ",references"
        limit_refs = 20
        url += f"?fields={fields}&limit={limit_refs}"
    else:
        url += f"?fields={fields}"

    response = requests.get(url)
    return response.json()

# Get paper details and its references
paper = get_paper_details("649def34f8be52c8b66281af98ae884c09b5f2ca")
print(f"Title: {paper['title']}")
print(f"Citations: {paper['citationCount']}")
print(f"References: {paper['referenceCount']}")

if 'references' in paper:
    print("\nTop references:")
    for ref in paper['references'][:5]:
        print(f"- {ref.get('title', 'Unknown title')}")
```

### Citation Network Analysis
```javascript
class SemanticScholarAPI {
  constructor() {
    this.baseUrl = 'https://api.semanticscholar.org/graph/v1';
    this.rateLimitDelay = 10; // 10ms between requests
    this.lastRequest = 0;
  }

  async makeRequest(url) {
    // Simple rate limiting
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLast));
    }
    this.lastRequest = Date.now();

    const response = await fetch(`${this.baseUrl}${url}`);
    return response.json();
  }

  async getCitationNetwork(paperId, depth = 2) {
    const network = { nodes: new Map(), edges: [] };
    const visited = new Set();
    const queue = [{ id: paperId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth: currentDepth } = queue.shift();

      if (visited.has(id) || currentDepth > depth) continue;
      visited.add(id);

      try {
        const paper = await this.makeRequest(`/paper/${id}?fields=title,authors,citations,references`);

        // Add node
        network.nodes.set(id, {
          id,
          title: paper.title,
          authors: paper.authors?.map(a => a.name) || [],
          year: paper.year
        });

        // Process citations (papers that cite this paper)
        if (paper.citations) {
          for (const citation of paper.citations.slice(0, 10)) {
            network.edges.push({
              source: citation.paperId,
              target: id,
              type: 'cites'
            });

            if (!visited.has(citation.paperId) && currentDepth < depth) {
              queue.push({ id: citation.paperId, depth: currentDepth + 1 });
            }
          }
        }

        // Process references (papers cited by this paper)
        if (paper.references) {
          for (const reference of paper.references.slice(0, 10)) {
            network.edges.push({
              source: id,
              target: reference.paperId,
              type: 'references'
            });

            if (!visited.has(reference.paperId) && currentDepth < depth) {
              queue.push({ id: reference.paperId, depth: currentDepth + 1 });
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching paper ${id}:`, error);
      }
    }

    return {
      nodes: Array.from(network.nodes.values()),
      edges: network.edges
    };
  }
}
```

## Data Models

### Paper Object
```json
{
  "paperId": "649def34f8be52c8b66281af98ae884c09b5f2ca",
  "title": "Attention Is All You Need",
  "abstract": "The dominant sequence transduction models...",
  "authors": [
    {
      "authorId": "173239825",
      "name": "Ashish Vaswani"
    }
  ],
  "venue": {
    "name": "NeurIPS",
    "id": "aa2c5f55d317de3d435c0c4b5b7215c7"
  },
  "year": 2017,
  "citationCount": 45000,
  "referenceCount": 25,
  "externalIds": {
    "DOI": "10.48550/arXiv.1706.03762",
    "ArXiv": "1706.03762"
  },
  "tldr": "Transformers use self-attention mechanisms for sequence modeling",
  "openAccessPdf": {
    "url": "https://arxiv.org/pdf/1706.03762.pdf"
  }
}
```

### Author Object
```json
{
  "authorId": "173239825",
  "name": "Ashish Vaswani",
  "url": "https://www.semanticscholar.org/author/173239825",
  "aliases": [],
  "affiliations": [
    {
      "name": "Google Research"
    }
  ],
  "homepage": null,
  "paperCount": 15,
  "citationCount": 50000,
  "hIndex": 10
}
```

## Common Use Cases

### Paper Recommendation System
```javascript
async function getRecommendations(paperId, limit = 10) {
  // Get the original paper
  const paper = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=abstract,authors,venue`).then(r => r.json());

  // Extract key terms from title and abstract
  const keywords = extractKeywords(paper.title + ' ' + (paper.abstract || ''));

  // Search for similar papers
  const searchQuery = keywords.slice(0, 3).join(' ');
  const similarPapers = await searchPapers(searchQuery, limit + 5);

  // Filter out the original paper and sort by citation count
  return similarPapers
    .filter(p => p.paperId !== paperId)
    .sort((a, b) => b.citationCount - a.citationCount)
    .slice(0, limit);
}

function extractKeywords(text) {
  // Simple keyword extraction - in production, use NLP libraries
  const stopWords = ['the', 'and', 'of', 'in', 'to', 'a', 'is', 'for', 'are', 'with', 'by', 'at', 'on', 'or', 'that', 'this', 'it', 'from'];

  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 10);
}
```

### Author Impact Analysis
```javascript
async function analyzeAuthorImpact(authorId) {
  const response = await fetch(`https://api.semanticscholar.org/graph/v1/author/${authorId}?fields=papers,name,hIndex,citationCount,paperCount`);
  const author = await response.json();

  // Get detailed information about top papers
  const topPapers = await Promise.all(
    author.papers
      .sort((a, b) => b.citationCount - a.citationCount)
      .slice(0, 10)
      .map(async (paper) => {
        const details = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paper.paperId}?fields=title,year,venue,citationCount`).then(r => r.json());
        return details;
      })
  );

  // Calculate impact metrics
  const totalCitations = topPapers.reduce((sum, paper) => sum + paper.citationCount, 0);
  const averageCitations = totalCitations / topPapers.length;
  const yearsActive = Math.max(...topPapers.map(p => p.year)) - Math.min(...topPapers.map(p => p.year)) + 1;
  const citationsPerYear = totalCitations / yearsActive;

  return {
    author: {
      name: author.name,
      hIndex: author.hIndex,
      totalCitations: author.citationCount,
      paperCount: author.paperCount
    },
    impact: {
      totalCitations,
      averageCitations: Math.round(averageCitations),
      citationsPerYear: Math.round(citationsPerYear),
      yearsActive
    },
    topPapers: topPapers.map(p => ({
      title: p.title,
      year: p.year,
      venue: p.venue?.name,
      citations: p.citationCount
    }))
  };
}
```

## Best Practices

1. **Include proper user-agent** information
2. **Implement rate limiting** with delays between requests
3. **Use field parameters** to limit response sizes
4. **Cache responses** for frequently accessed papers
5. **Handle missing data** gracefully (some fields may be null)
6. **Use external IDs** when available (DOI, ARXIV) for reliable lookups

## Error Handling

```javascript
async function safeSemanticScholarRequest(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response.json();
      } else if (response.status === 429) {
        // Rate limited - wait longer
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else if (response.status === 404) {
        return null; // Paper not found
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **OpenAlex API** - For comprehensive scholarly data
- **Crossref API** - For DOI metadata and citation linking
- **arXiv API** - For preprint papers
- **PubMed API** - For biomedical literature

## Support

- **Documentation:** https://api.semanticscholar.org/
- **GitHub:** https://github.com/semanticscholar/semanticscholar-python
- **Contact:** Available through Semantic Scholar website

---

*Last updated: 2025-10-27*