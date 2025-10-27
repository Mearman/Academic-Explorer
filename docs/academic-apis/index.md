# Academic APIs Index - Complete Guide 2025

*Last updated: 2025-10-27*

This comprehensive index provides quick access to all academic research APIs available in 2025, organized by access level, functionality, and use case.

## Quick Access Matrix

| API | Access Level | Best For | Rate Limits | Pricing |
|-----|--------------|----------|-------------|---------|
| [OpenAlex](openalex.md) | ✅ Free | Comprehensive research data | Generous | Free |
| [Semantic Scholar](semantic-scholar.md) | ✅ Free | Citation analysis | 100/sec | Free |
| [Crossref](crossref.md) | ✅ Free | DOI metadata | 50/sec | Free |
| [Altmetric](altmetric.md) | 🔑 Key | Research impact | 1,000/day | Free tier |
| [Web of Science](web-of-science.md) | 🏢 Institutional | Premium citation analysis | Subscription | $5,000-$50,000/year |

## Legend
- ✅ **Free** - No authentication required
- 🔑 **Key** - Free API key required
- 🏢 **Institutional** - Institutional subscription required
- 💰 **Premium** - Commercial pricing

## Free APIs (No Authentication Required)

### Core Research Databases

| API | Coverage | Rate Limits | Key Features |
|-----|----------|-------------|--------------|
| [OpenAlex](openalex.md) | 200M+ works | Generous | Complete scholarly catalog |
| [Semantic Scholar](semantic-scholar.md) | Papers, citations | 100/sec | Citation analysis, TL;DRs |
| [Crossref](crossref.md) | DOI metadata | 50/sec | DOI resolution, citations |
| [arXiv](arxiv.md) | Preprints | Respectful | Physics/math/CS papers |
| [DBLP](dblp.md) | Computer science | Reasonable | CS bibliography |

### Specialized Data Sources

| API | Specialty | Rate Limits | Key Features |
|-----|-----------|-------------|--------------|
| [Unpaywall](unpaywall.md) | Open access | 100k/day | OA paper discovery |
| [HAL](hal.md) | French research | Standard | Multidisciplinary French archive |
| [DataCite](datacite.md) | Scholar metadata | Standard | GraphQL API, DOI metadata |
| [ORCID](orcid.md) | Researcher identity | Standard | Author profiles, publications |
| [DOAJ](doaj.md) | OA journals | Reasonable | Open access journal directory |
| [CORE](core.md) | OA aggregation | Free tier | Aggregated OA content |

## Premium APIs with Public Signup

### Research Impact & Content

| API | Free Tier | Premium Pricing | Key Features |
|-----|-----------|----------------|--------------|
| [ScienceDirect](sciencedirect.md) | 2,000 req/month | From $99/month | Full-text article access |
| [Mendeley](mendeley.md) | 500 req/hour | Enterprise plans | Reference management |
| [Altmetric](altmetric.md) | 1,000 calls/day | Institutional plans | Research impact analytics |

### Limited Access (Requires Approval)

| API | Access Requirements | Rate Limits | Key Features |
|-----|-------------------|-------------|--------------|
| [Elsevier Scopus](scopus.md) | Institutional approval | Subscription | Citation metrics |

## Institutional Premium APIs

### Comprehensive Research Platforms

| API | Pricing Model | Key Features |
|-----|---------------|--------------|
| [Web of Science](web-of-science.md) | $5,000-$50,000+/year | Gold standard citation analysis |
| [Dimensions](dimensions.md) | Custom institutional | Research analytics platform |
| [Scopus (Elsevier)](scopus.md) | Custom institutional | Citation metrics, author profiles |
| [PlumX Metrics](plumx.md) | Included in Scopus | Research impact metrics |

### Publisher APIs

| API | Access Level | Pricing |
|-----|-------------|---------|
| [Springer Nature](springer-nature.md) | Partnership required | Custom |
| [Wiley](wiley.md) | Institutional only | Custom |
| [Taylor & Francis](taylor-francis.md) | Partnership required | Custom |

## Use Case Recommendations

### 🎓 For Individual Researchers & Students

**Essential Stack (Free):**
1. **OpenAlex** - Comprehensive alternative to commercial databases
2. **Semantic Scholar** - Citation analysis and paper recommendations
3. **Crossref** - DOI resolution and metadata
4. **Unpaywall** - Find legal open access versions

**Enhanced Stack (Low Cost):**
1. Add **Altmetric API** (1,000 free calls/day for impact tracking)
2. Add **ScienceDirect API** (2,000 free requests/month for articles)
3. Add **Mendeley API** (500 requests/hour for reference management)

### 🏢 For Academic Institutions

**Tier 1 - Essential (Low Cost):**
- **OpenAlex** (free)
- **Crossref** (free)
- **Semantic Scholar** (free)
- **PubMed** (free with API key)

**Tier 2 - Enhanced (Moderate Cost):**
- **Altmetric API** (institutional plans)
- **ScienceDirect API** (premium tiers)
- **Mendeley API** (enterprise plans)

**Tier 3 - Comprehensive (High Investment):**
- **Web of Science API** ($5,000-$50,000+/year)
- **Dimensions API** (custom institutional pricing)
- **Elsevier Scopus API** (custom pricing)

### 💼 For Commercial Applications

**Compliance Requirements:**
- Review API terms of service for commercial use
- Ensure proper attribution and licensing compliance
- Consider enterprise pricing for scale

**Recommended Stack:**
1. **OpenAlex** (free tier for development)
2. **Crossref** (essential DOI services)
3. **Altmetric** (impact analytics)
4. **Institutional premium API(s)** based on domain needs

## Implementation Guides

### Quick Start Checklist

- [ ] **Define your use case** - What data? Usage volume? Budget?
- [ ] **Choose your APIs** - Start with free options, add premium as needed
- [ ] **Register for access** - Create developer accounts, obtain API keys
- [ ] **Implement** - Build with proper error handling and rate limiting
- [ ] **Maintain** - Monitor usage, update authentication, check for changes

### Rate Limit Optimization

```javascript
// Example of rate limit handling
class RateLimitedAPI {
  constructor(rateLimit, delay = 1000) {
    this.rateLimit = rateLimit; // requests per second
    this.delay = delay; // milliseconds between requests
    this.lastRequest = 0;
  }

  async makeRequest(url, options = {}) {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequest;
    const minInterval = 1000 / this.rateLimit;

    if (timeSinceLast < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLast));
    }

    this.lastRequest = Date.now();
    return fetch(url, options);
  }
}
```

### Error Handling Best Practices

```javascript
async function safeAPIRequest(apiCall, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (error.status === 401) {
        // Authentication error - re-authenticate
        await refreshAuthentication();
        continue;
      }

      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Comparison by Data Type

### Citation Data
- **Free:** OpenAlex, Semantic Scholar, Crossref
- **Premium:** Web of Science, Scopus, Dimensions

### Full-Text Access
- **Free:** arXiv, Unpaywall, CORE
- **Premium:** ScienceDirect, Publisher APIs

### Author Information
- **Free:** OpenAlex, ORCID, Semantic Scholar
- **Premium:** Web of Science, Scopus

### Research Impact
- **Free:** Semantic Scholar (limited)
- **Premium:** Altmetric, PlumX Metrics, Web of Science

### Institutional Data
- **Free:** OpenAlex, DataCite
- **Premium:** Dimensions, Web of Science, Scopus

## Migration Guides

### From Microsoft Academic API (Discontinued 2021)
→ **OpenAlex** was specifically designed as a replacement
→ **Semantic Scholar** for citation analysis
→ **Crossref** for DOI metadata

### From Google Scholar (No Official API)
→ **Semantic Scholar** for citation analysis
→ **Crossref** for DOI resolution
→ **OpenAlex** for comprehensive search

## Cost Analysis

### Individual Researcher (Annual)
- **Free Stack:** $0
- **Enhanced Stack:** $0 - $99/year
- **Premium Stack:** $5,000+ (requires institutional access)

### Small Institution (Annual)
- **Essential:** $0 - $500
- **Enhanced:** $2,000 - $10,000
- **Comprehensive:** $15,000 - $50,000

### Large University (Annual)
- **Essential:** $0 - $1,000
- **Enhanced:** $5,000 - $25,000
- **Comprehensive:** $50,000 - $200,000

## Getting Help

### Documentation Support
- **Individual API docs:** See provider-specific files
- **Implementation examples:** Included in each provider file
- **Best practices:** [Best Practices Guide](guidelines.md)

### Community Support
- **GitHub repositories:** Most APIs have active communities
- **Academic forums:** Research Software Alliance, Stack Overflow
- **Vendor support:** Available for institutional customers

### Technical Support
- **Rate limit issues:** Contact API providers directly
- **Authentication problems:** Check OAuth implementation
- **Data quality issues:** Report to API maintainers

## Future Outlook (2025-2026)

### Emerging Trends
- **GraphQL APIs** becoming more common (DataCite, others)
- **AI-powered search** and recommendation features
- **Enhanced open access** coverage
- **Real-time citation tracking**

### Discontinued Services
- **Microsoft Academic API** (Dec 2021) → OpenAlex
- **Google Scholar API** (never official) → Semantic Scholar, OpenAlex

### Pricing Trends
- **Free tiers** becoming more generous
- **Institutional pricing** becoming more transparent
- **API consolidation** (fewer specialized APIs, more comprehensive platforms)

---

## Quick Reference Cards

### Emergency API Substitutions
```
Microsoft Academic → OpenAlex
Google Scholar → Semantic Scholar + Crossref
Scopus → Web of Science (if institutional) OR OpenAlex (free)
Web of Science → Dimensions OR OpenAlex (free)
```

### Essential URLs
```
OpenAlex: https://docs.openalex.org/
Crossref: https://api.crossref.org
Semantic Scholar: https://api.semanticscholar.org/
Altmetric: https://api.altmetric.com/docs
Web of Science: https://developer.clarivate.com/apis/web-of-science
```

---

*This index is maintained as part of the Academic Explorer project. For the most current information, always check individual API documentation pages.*

**Version:** 1.0
**License:** Educational and research use
**Last Updated:** 2025-10-27