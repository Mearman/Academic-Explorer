# Altmetric API Documentation

**Category:** Research Impact Analytics
**Data Type:** Social media mentions, news coverage, policy documents
**API Type:** REST API
**Authentication:** API key required (free signup)
**Rate Limits:** 1,000 calls/day free tier

## Overview

Altmetric API provides comprehensive research impact analytics by tracking social media mentions, news coverage, policy document citations, and other attention metrics for scholarly publications. It's the most accessible premium API for research impact tracking.

## Key Features

- **Social media impact tracking** across platforms (Twitter, Facebook, etc.)
- **News and media mentions** from global sources
- **Policy document citations** from government and NGO sources
- **Real-time attention scores** with the "Altmetric Attention Score"
- **Comprehensive research metrics** and demographics
- **DOI-based lookup** with extensive metadata

## Pricing Tiers

### Free Academic Tier
- **1,000 API calls per day**
- Full access to all attention data
- Suitable for academic research and development
- Requires registration and approval

### Institutional Plans
- Higher volume limits
- Priority support
- Advanced analytics features
- Custom pricing based on usage

## Documentation

- **API Documentation:** https://api.altmetric.com/docs
- **Developer Portal:** https://api.altmetric.com/
- **Usage Guidelines:** https://api.altmetric.com/docs/guidelines
- **Support:** Available through Altmetric website

## Signup Process

1. **Visit Altmetric API Documentation** at https://api.altmetric.com/docs
2. **Register for API key access** with academic/research purpose
3. **Get approved** for academic/research use (typically quick for legitimate academic use)
4. **Start with free tier** for development and testing

## API Endpoints

### DOI Lookup
```bash
# Get attention data for a DOI
https://api.altmetric.com/v1/doi/10.1038/nature12373?key=YOUR_API_KEY

# Get details with additional context
https://api.altmetric.com/v1/fetch/doi/10.1038/nature12373?key=YOUR_API_KEY
```

### ID-based Lookup
```bash
# Get attention data by Altmetric ID
https://api.altmetric.com/v1/12345678?key=YOUR_API_KEY
```

### Multiple DOIs
```bash
# Get attention data for multiple DOIs (requires higher-tier plan)
https://api.altmetric.com/v1/doi/10.1038/nature12373,10.1126/science.123456?key=YOUR_API_KEY
```

## Implementation Examples

### Basic DOI Lookup (JavaScript)
```javascript
class AltmetricAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.altmetric.com/v1';
  }

  async getAttentionData(doi) {
    const url = `${this.baseUrl}/doi/${doi}?key=${this.apiKey}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return { error: 'No attention data found for this DOI' };
    }

    if (!response.ok) {
      throw new Error(`Altmetric API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getDetailedAttentionData(doi) {
    const url = `${this.baseUrl}/fetch/doi/${doi}?key=${this.apiKey}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return { error: 'No attention data found for this DOI' };
    }

    return response.json();
  }

  async getTopPosts(doi, limit = 10) {
    const data = await this.getDetailedAttentionData(doi);
    if (data.error) return [];

    return (data.posts || [])
      .sort((a, b) => b.posted_on - a.posted_on)
      .slice(0, limit);
  }
}

// Usage example
const altmetric = new AltmetricAPI('YOUR_API_KEY');

altmetric.getAttentionData('10.1038/nature12373').then(data => {
  if (data.error) {
    console.log(data.error);
  } else {
    console.log(`Attention Score: ${data.score}`);
    console.log(`Total Mentions: ${data.counts.total}`);
    console.log(`News Outlets: ${data.counts.news}`);
    console.log(`Twitter Mentions: ${data.counts.twitter}`);
  }
});
```

### Research Impact Dashboard (Python)
```python
import requests
import pandas as pd
import matplotlib.pyplot as plt

class AltmetricAnalyzer:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://api.altmetric.com/v1'

    def get_attention_data(self, doi):
        url = f"{self.base_url}/doi/{doi}?key={self.api_key}"
        response = requests.get(url)

        if response.status_code == 404:
            return None

        response.raise_for_status()
        return response.json()

    def analyze_paper_impact(self, doi):
        data = self.get_attention_data(doi)

        if not data:
            return {"error": "No attention data found"}

        # Extract key metrics
        analysis = {
            'doi': doi,
            'attention_score': data.get('score', 0),
            'total_mentions': data.get('counts', {}).get('total', 0),
            'demographics': data.get('demographics', {}),
            'mentions_by_source': data.get('counts', {}),
            'publication_date': data.get('published_on'),
            'altmetric_id': data.get('altmetric_id')
        }

        # Analyze demographics
        if 'demographics' in data:
            demog = data['demographics']
            analysis['audience_breakdown'] = {
                'countries': demog.get('geo', {}),
                'user_types': demog.get('users', {}),
                'tweet_locations': demog.get('twitter', {})
            }

        return analysis

    def compare_papers(self, dois):
        results = []
        for doi in dois:
            analysis = self.analyze_paper_impact(doi)
            results.append(analysis)

        return pd.DataFrame(results)

    def create_impact_visualization(self, doi):
        data = self.get_attention_data(doi)

        if not data:
            print("No data available for visualization")
            return

        # Create attention score visualization
        counts = data.get('counts', {})
        sources = ['news', 'blogs', 'policy', 'twitter', 'facebook', 'reddit', 'weibo', 'googleplus']
        mentions = [counts.get(source, 0) for source in sources]

        plt.figure(figsize=(12, 6))
        bars = plt.bar(sources, mentions)
        plt.title(f'Attention Sources for DOI: {doi}')
        plt.xlabel('Source')
        plt.ylabel('Number of Mentions')
        plt.xticks(rotation=45)

        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            if height > 0:
                plt.text(bar.get_x() + bar.get_width()/2., height,
                        f'{int(height)}', ha='center', va='bottom')

        plt.tight_layout()
        plt.show()

# Usage example
analyzer = AltmetricAnalyzer('YOUR_API_KEY')

# Analyze a single paper
impact = analyzer.analyze_paper_impact('10.1038/nature12373')
print(f"Attention Score: {impact['attention_score']}")
print(f"Total Mentions: {impact['total_mentions']}")

# Compare multiple papers
dois = ['10.1038/nature12373', '10.1126/science.abc1234', '10.1016/j.softx.2021.100803']
comparison = analyzer.compare_papers(dois)
print(comparison[['doi', 'attention_score', 'total_mentions']])
```

### Attention Trend Analysis
```javascript
async function getAttentionTrends(doi, altmetricAPI) {
  const data = await altmetricAPI.getDetailedAttentionData(doi);

  if (!data.posts) {
    return { error: 'No detailed post data available' };
  }

  // Group posts by month and source
  const trends = {};
  data.posts.forEach(post => {
    const date = new Date(post.posted_on);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!trends[monthKey]) {
      trends[monthKey] = {
        total: 0,
        news: 0,
        twitter: 0,
        blogs: 0,
        policy: 0,
        facebook: 0,
        reddit: 0,
        weibo: 0,
        other: 0
      };
    }

    trends[monthKey].total++;

    // Categorize by source
    const source = post.posted_on.includes('twitter') ? 'twitter' :
                  post.posted_on.includes('facebook') ? 'facebook' :
                  post.posted_on.includes('reddit') ? 'reddit' :
                  post.posted_on.includes('weibo') ? 'weibo' :
                  post.posted_on.includes('news') || post.posted_on.includes('policy') ? 'news' :
                  post.posted_on.includes('blog') ? 'blogs' :
                  post.posted_on.includes('policy') ? 'policy' : 'other';

    if (trends[monthKey][source] !== undefined) {
      trends[monthKey][source]++;
    }
  });

  // Convert to array and sort by month
  const trendArray = Object.entries(trends)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    doi,
    trends: trendArray,
    summary: {
      totalPosts: data.posts.length,
      uniqueSources: [...new Set(data.posts.map(p => p.posted_on))].length,
      dateRange: {
        start: Math.min(...data.posts.map(p => new Date(p.posted_on))),
        end: Math.max(...data.posts.map(p => new Date(p.posted_on)))
      }
    }
  };
}
```

## Data Models

### Attention Data Object
```json
{
  "altmetric_id": 12345678,
  "score": 85,
  "score_history": [
    {
      "date": "2023-01-15",
      "score": 45
    },
    {
      "date": "2023-01-16",
      "score": 85
    }
  ],
  "counts": {
    "total": 150,
    "news": 25,
    "blogs": 10,
    "policy": 5,
    "twitter": 100,
    "facebook": 8,
    "reddit": 2
  },
  "demographics": {
    "geo": {
      "US": 80,
      "GB": 30,
      "CA": 20,
      "AU": 15,
      "DE": 5
    },
    "users": {
      "members_of_public": 120,
      "practitioners": 20,
      "science_communicators": 8,
      "researchers": 2
    },
    "twitter": {
      "followers": {
        "100_1000": 60,
        "1000_10000": 30,
        "10000+": 10
      }
    }
  },
  "published_on": "2023-01-15",
  "doi": "10.1038/nature12373",
  "title": "Example Paper Title",
  "journal": "Nature",
  "url": "https://altmetric.com/details/12345678"
}
```

## Best Practices

1. **Implement rate limiting** - respect 1,000 calls/day limit
2. **Cache responses** - attention data doesn't change frequently
3. **Handle 404 responses** gracefully - not all papers have attention data
4. **Use API key parameter** in all requests
5. **Monitor usage** to stay within free tier limits
6. **Include attribution** to Altmetric when displaying attention scores

## Error Handling

```javascript
async function safeAltmetricRequest(doi, apiKey, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `https://api.altmetric.com/v1/doi/${doi}?key=${apiKey}`;
      const response = await fetch(url);

      if (response.status === 404) {
        return { error: 'No attention data found', status: 'not_found' };
      }

      if (response.status === 429) {
        // Rate limited - wait and retry
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Use Cases

### Research Evaluation
- Track real-world impact of published research
- Demonstrate broader impacts for funding applications
- Identify papers that influence policy or public discourse

### Institutional Analytics
- Monitor attention to institution's research output
- Compare impact across departments or researchers
- Track engagement with institutional research

### Journal Monitoring
- Track attention to journal publications
- Identify highly impactful articles
- Monitor social media engagement with journal content

## Alternatives

- **PlumX Metrics (Elsevier)** - More comprehensive but requires institutional subscription
- **Dimensions API** - Includes some attention metrics as part of broader research analytics
- **Custom social media monitoring** - More control but requires significant development effort

## Support

- **Documentation:** https://api.altmetric.com/docs
- **Contact:** Available through Altmetric website
- **Academic Support:** Priority support for institutional plans

---

*Last updated: 2025-10-27*