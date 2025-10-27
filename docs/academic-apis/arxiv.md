# arXiv API Documentation

**Category:** Scientific Preprints
**Data Type:** Preprint papers and metadata
**API Type:** REST API
**Authentication:** None required
**Rate Limits:** No hard limits, respectful crawling encouraged

## Overview

arXiv offers a free public API for accessing its vast repository of scientific preprints in physics, mathematics, computer science, and related fields. It provides access to article metadata, full text where available, and supports advanced searching capabilities.

## Key Features

- **Physics, mathematics, computer science** preprints
- **Full-text access** where available
- **Subject classification** with hierarchical categories
- **Version history** tracking
- **PDF and LaTeX source** access
- **Real-time updates** with new submissions

## Documentation

- **API User Manual:** https://arxiv.org/help/api/user-manual
- **API Basics:** https://arxiv.org/help/api/basics
- **Advanced Search:** https://arxiv.org/help/api/user-manual#_calling_the_api
- **Search Syntax:** https://arxiv.org/help/api/user-manual#search_query_and_field_specification

## Rate Limits

- **No hard rate limits** published
- **Respectful crawling** strongly encouraged
- **Add delays** between consecutive requests
- **Use appropriate User-Agent** headers
- **Avoid excessive parallel requests**

## API Endpoints

### Basic Search
```bash
# Search for papers
http://export.arxiv.org/api/query?search_query=machine+learning&start=0&max_results=10

# Search with specific fields
http://export.arxiv.org/api/query?search_query=ti:machine+learning+AND+au:smith
```

### Advanced Search
```bash
# Search by subject area
http://export.arxiv.org/api/query?search_query=cat:cs.AI&start=0&max_results=20

# Search by date range
http://export.arxiv.org/api/query?search_query=lastUpdatedDate:[2023-01-01+TO+2023-12-31]
```

### Paper Details
```bash
# Get specific paper by arXiv ID
http://export.arxiv.org/api/query?id_list=2301.00000

# Get multiple papers
http://export.arxiv.org/api/query?id_list=2301.00000,2301.00001,2301.00002
```

## Implementation Examples

### Basic Search (JavaScript)
```javascript
class ArxivAPI {
  constructor() {
    this.baseUrl = 'http://export.arxiv.org/api/query';
    this.requestDelay = 1000; // 1 second between requests
    this.lastRequest = 0;
  }

  async makeRequest(params) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLast));
    }
    this.lastRequest = Date.now();

    const url = `${this.baseUrl}?${params}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AcademicExplorer/1.0 (mailto:your-email@example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return this.parseXMLResponse(text);
  }

  parseXMLResponse(xmlText) {
    // Simple XML parsing for demonstration
    // In production, use a proper XML parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    const entries = doc.querySelectorAll('entry');
    const papers = [];

    entries.forEach(entry => {
      const paper = {
        id: entry.querySelector('id')?.textContent || '',
        title: entry.querySelector('title')?.textContent?.trim() || '',
        summary: entry.querySelector('summary')?.textContent?.trim() || '',
        published: entry.querySelector('published')?.textContent || '',
        updated: entry.querySelector('updated')?.textContent || '',
        authors: [],
        categories: [],
        links: {}
      };

      // Extract authors
      entry.querySelectorAll('author name').forEach(authorEl => {
        paper.authors.push(authorEl.textContent);
      });

      // Extract categories
      entry.querySelectorAll('category').forEach(catEl => {
        paper.categories.push(catEl.getAttribute('term'));
      });

      // Extract links
      entry.querySelectorAll('link').forEach(linkEl => {
        const rel = linkEl.getAttribute('rel');
        const href = linkEl.getAttribute('href');
        if (rel && href) {
          paper.links[rel] = href;
        }
      });

      papers.push(paper);
    });

    return papers;
  }

  async searchPapers(query, options = {}) {
    const params = new URLSearchParams({
      search_query: query,
      start: options.start || 0,
      max_results: options.max_results || 10
    });

    if (options.sortBy) {
      params.append('sortBy', options.sortBy);
      params.append('sortOrder', options.sortOrder || 'descending');
    }

    return this.makeRequest(params.toString());
  }

  async getPapersByCategory(category, options = {}) {
    const query = `cat:${category}`;
    return this.searchPapers(query, options);
  }

  async getRecentPapers(days = 7, options = {}) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const dateStr = startDate.toISOString().split('T')[0];
    const query = `lastUpdatedDate:[${dateStr}+TO+${endDate.toISOString().split('T')[0]}]`;

    return this.searchPapers(query, options);
  }
}

// Usage example
const arxiv = new ArxivAPI();

arxiv.searchPapers('machine learning').then(papers => {
  papers.forEach(paper => {
    console.log(`Title: ${paper.title}`);
    console.log(`Authors: ${paper.authors.join(', ')}`);
    console.log(`Categories: ${paper.categories.join(', ')}`);
    console.log(`PDF: ${paper.links.pdf || 'Not available'}`);
    console.log('---');
  });
});
```

### Category-based Search (Python)
```python
import requests
import feedparser
import time
from urllib.parse import quote

class ArxivAPI:
    def __init__(self):
        self.base_url = "http://export.arxiv.org/api/query"
        self.request_delay = 1  # seconds between requests
        self.last_request = 0

    def make_request(self, params):
        # Rate limiting
        now = time.time()
        time_since_last = now - self.last_request
        if time_since_last < self.request_delay:
            time.sleep(self.request_delay - time_since_last)
        self.last_request = time.time()

        response = requests.get(self.base_url, params=params)
        response.raise_for_status()
        return feedparser.parse(response.content)

    def search_papers(self, query, start=0, max_results=10, sort_by="relevance", sort_order="descending"):
        params = {
            'search_query': query,
            'start': start,
            'max_results': max_results,
            'sortBy': sort_by,
            'sortOrder': sort_order
        }
        return self.make_request(params)

    def get_papers_by_category(self, category, start=0, max_results=10):
        query = f"cat:{category}"
        return self.search_papers(query, start, max_results)

    def get_recent_papers(self, days=7, start=0, max_results=20):
        from datetime import datetime, timedelta
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        date_format = "%Y-%m-%d"
        start_str = start_date.strftime(date_format)
        end_str = end_date.strftime(date_format)

        query = f"lastUpdatedDate:[{start_str}+TO+{end_str}]"
        return self.search_papers(query, start, max_results)

# Usage example
arxiv = ArxivAPI()

# Search for machine learning papers
papers = arxiv.search_papers("machine learning AND deep learning", max_results=5)

for paper in papers.entries:
    print(f"Title: {paper.title}")
    print(f"Authors: {', '.join(author.name for author in paper.authors)}")
    print(f"Categories: {', '.join(paper.tags)}")
    print(f"Published: {paper.published}")
    print(f"arXiv ID: {paper.id.split('/')[-1]}")
    print(f"PDF: {paper.link}")
    print('---')

# Get recent AI papers
recent_ai = arxiv.get_papers_by_category("cs.AI", max_results=3)
print(f"\nRecent AI papers: {len(recent_ai.entries)}")
```

### Paper Monitoring System
```javascript
class ArxivMonitor {
  constructor(categories, checkInterval = 3600000) { // 1 hour default
    this.categories = categories;
    this.checkInterval = checkInterval;
    this.lastCheck = {};
    this.arxivAPI = new ArxivAPI();
  }

  async checkForNewPapers() {
    const newPapers = {};

    for (const category of this.categories) {
      console.log(`Checking category: ${category}`);

      const recentPapers = await this.arxivAPI.getRecentPapers(1, {
        max_results: 50,
        sortBy: 'submittedDate'
      });

      const lastCheckTime = this.lastCheck[category] || 0;
      const categoryNewPapers = recentPapers.filter(paper => {
        const publishedTime = new Date(paper.published).getTime();
        return publishedTime > lastCheckTime;
      });

      if (categoryNewPapers.length > 0) {
        newPapers[category] = categoryNewPapers;
        console.log(`Found ${categoryNewPapers.length} new papers in ${category}`);
      }

      this.lastCheck[category] = Date.now();
    }

    return newPapers;
  }

  async startMonitoring(callback) {
    console.log('Starting arXiv monitoring...');

    const monitor = async () => {
      try {
        const newPapers = await this.checkForNewPapers();
        if (Object.keys(newPapers).length > 0) {
          callback(newPapers);
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    };

    // Initial check
    await monitor();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(monitor, this.checkInterval);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Monitoring stopped');
    }
  }

  async getCategoryStats(category, days = 30) {
    const papers = await this.arxivAPI.getRecentPapers(days, {
      max_results: 1000,
      sortBy: 'submittedDate'
    });

    const categoryPapers = papers.filter(paper =>
      paper.categories.includes(category)
    );

    // Analyze submission patterns
    const submissionsByDay = {};
    const topAuthors = {};
    const subcategories = {};

    categoryPapers.forEach(paper => {
      const date = paper.published.split('T')[0];
      submissionsByDay[date] = (submissionsByDay[date] || 0) + 1;

      paper.authors.forEach(author => {
        topAuthors[author] = (topAuthors[author] || 0) + 1;
      });

      paper.categories.forEach(cat => {
        if (cat !== category) {
          subcategories[cat] = (subcategories[cat] || 0) + 1;
        }
      });
    });

    return {
      category,
      period: `${days} days`,
      totalPapers: categoryPapers.length,
      averagePerDay: categoryPapers.length / days,
      submissionsByDay,
      topAuthors: Object.entries(topAuthors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([author, count]) => ({ author, count })),
      topSubcategories: Object.entries(subcategories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([subcategory, count]) => ({ subcategory, count }))
    };
  }
}

// Usage example
const monitor = new ArxivMonitor(['cs.AI', 'cs.LG', 'cs.CV']);

monitor.startMonitoring((newPapers) => {
  console.log('New papers detected!');
  Object.entries(newPapers).forEach(([category, papers]) => {
    console.log(`\n${category}: ${papers.length} new papers`);
    papers.slice(0, 3).forEach(paper => {
      console.log(`  - ${paper.title}`);
    });
  });
});
```

## Data Models

### Paper Entry Structure
```xml
<entry>
  <id>http://arxiv.org/abs/2301.00000</id>
  <updated>2023-01-15T10:30:00Z</updated>
  <published>2023-01-15T10:30:00Z</published>
  <title>Machine Learning for Scientific Discovery</title>
  <summary>Abstract content...</summary>
  <author>
    <name>John Smith</name>
  </author>
  <author>
    <name>Jane Doe</name>
  </author>
  <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
  <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
  <link href="http://arxiv.org/abs/2301.00000" rel="alternate" type="text/html"/>
  <link href="http://arxiv.org/pdf/2301.00000.pdf" rel="related" type="application/pdf"/>
</entry>
```

## Search Syntax Examples

### Field-Specific Searches
```
title:machine learning            # Search in title only
author:smith                     # Search by author name
abstract:neural network          # Search in abstract only
cat:cs.AI                        # Search in AI category
submittedDate:[2023-01-01 TO 2023-12-31]  # Date range
```

### Boolean Operators
```
machine learning AND deep learning
machine learning OR neural networks
machine learning NOT "reinforcement learning"
```

### Complex Queries
```
ti:"machine learning" AND (au:smith OR au:jones) AND cat:cs.AI
lastUpdatedDate:[2023-01-01 TO 2023-12-31] AND cat:cs.CV
abstract:transformer AND (cat:cs.CL OR cat:cs.LG)
```

## Common Categories

### Computer Science
- `cs.AI` - Artificial Intelligence
- `cs.LG` - Machine Learning
- `cs.CV` - Computer Vision
- `cs.CL` - Computation and Language
- `cs.CR` - Cryptography and Security
- `cs.DB` - Databases
- `cs.IR` - Information Retrieval

### Mathematics
- `math.AG` - Algebraic Geometry
- `math.AP` - Analysis of PDEs
- `math.CO` - Combinatorics
- `math.NA` - Numerical Analysis
- `math.ST` - Statistics Theory

### Physics
- `physics.comp-ph` - Computational Physics
- `quant-ph` - Quantum Physics
- `cond-mat.stat-mech` - Statistical Mechanics
- `hep-th` - High Energy Physics - Theory

## Best Practices

1. **Add delays between requests** - at least 1 second
2. **Use proper User-Agent** headers with contact information
3. **Cache responses** when possible
4. **Limit parallel requests** to avoid overwhelming servers
5. **Respect robots.txt** and API terms
6. **Handle XML parsing** carefully with proper error handling
7. **Monitor API status** and avoid requests during known maintenance windows

## Error Handling

```javascript
async function safeArxivRequest(arxivAPI, query, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await arxivAPI.searchPapers(query, options);
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('503')) {
        // Server overloaded - wait longer
        const delay = Math.pow(2, attempt) * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Alternatives

- **Semantic Scholar** - For citation analysis and recommendations
- **OpenAlex** - For comprehensive scholarly data including arXiv
- **Crossref** - For DOI metadata and linking
- **bioRxiv/medRxiv** - For biology and medicine preprints

## Support

- **Documentation:** https://arxiv.org/help/api/
- **Help:** https://arxiv.org/help/
- **Contact:** Available through arXiv website

---

*Last updated: 2025-10-27*