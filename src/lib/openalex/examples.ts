/**
 * OpenAlex Client Usage Examples
 * Demonstrates how to use the OpenAlex API client
 */

import {
  openAlex,
  query,
  filters,
  combineFilters,
  paginate,
  reconstructAbstract,
  formatCitation,
  calculateCollaborationMetrics,
  buildCoAuthorshipNetwork,
  type Work,
} from './index';

// Configure the client (optional - has sensible defaults)
export function configureClient() {
  openAlex.updateConfig({
    mailto: 'your-email@example.com', // Polite pool access
    apiKey: 'your-api-key', // If you have one
    polite: true, // Use polite pool
    maxRetries: 3,
    timeout: 30000,
  });
}

// Example 1: Simple search for works
export async function searchWorks() {
  const response = await openAlex.works({
    search: 'machine learning',
    filter: 'publication_year:2023',
    per_page: 10,
  });

  console.log(`Found ${response.meta.count} works`);
  response.results.forEach(work => {
    console.log(`- ${work.display_name} (${work.publication_year})`);
  });
}

// Example 2: Using the query builder
export async function advancedSearch() {
  const filter = query()
    .equals('type', 'article')
    .greaterThan('cited_by_count', 10)
    .dateRange('publication_date', '2020-01-01', '2023-12-31')
    .group(qb => 
      qb.contains('title', 'climate')
        .or(qb.contains('abstract', 'climate'))
    )
    .build();

  const response = await openAlex.works({
    filter,
    sort: 'cited_by_count:desc',
    per_page: 25,
  });

  return response.results;
}

// Example 3: Using predefined filters
export async function openAccessWorks() {
  const filter = combineFilters(
    filters.works.openAccess(),
    filters.works.byYear(2023),
    filters.works.hasFulltext()
  );

  const response = await openAlex.works({ filter });
  return response.results;
}

// Example 4: Pagination - get all results
export async function getAllWorksForAuthor(authorId: string) {
  const paginator = paginate(
    openAlex,
    '/works',
    'works',
    {
      filter: `authorships.author.id:${authorId}`,
      per_page: 200,
    },
    {
      useCursor: true,
      onProgress: (current, total) => {
        console.log(`Fetched ${current} of ${total} works`);
      },
    }
  );

  // Get all results (be careful with large datasets!)
  const allWorks = await paginator.all();
  return allWorks;
}

// Example 5: Process results in batches
export async function processCitationNetwork(topicId: string) {
  const paginator = paginate<Work>(
    openAlex,
    '/works',
    'works',
    {
      filter: `topics.id:${topicId}`,
      per_page: 200,
    }
  );

  const network = { nodes: [] as unknown[], edges: [] as unknown[] };

  await paginator.processBatches(async (batch, batchNum) => {
    console.log(`Processing batch ${batchNum} with ${batch.length} works`);
    
    // Build co-authorship network from this batch
    const batchNetwork = buildCoAuthorshipNetwork(batch);
    network.nodes.push(...batchNetwork.nodes);
    network.edges.push(...batchNetwork.edges);
  });

  return network;
}

// Example 6: Autocomplete
export async function autocompleteAuthors(query: string) {
  const response = await openAlex.authorsAutocomplete({
    q: query,
    filter: 'works_count:>100',
  });

  return response.results.map(author => ({
    id: author.id,
    name: author.display_name,
    hint: author.hint,
    worksCount: author.works_count,
  }));
}

// Example 7: Get work with full details
export async function getWorkDetails(workId: string) {
  const work = await openAlex.work(workId);
  
  // Reconstruct abstract from inverted index
  const abstract = reconstructAbstract(work.abstract_inverted_index);
  
  // Format citation
  const citation = formatCitation(work, { style: 'apa', includeUrl: true });
  
  // Calculate collaboration metrics
  const metrics = calculateCollaborationMetrics(work);
  
  return {
    work,
    abstract,
    citation,
    metrics,
  };
}

// Example 8: Get author's h-index and recent works
export async function getAuthorProfile(authorId: string) {
  const author = await openAlex.author(authorId);
  
  // Get recent works
  const recentWorks = await openAlex.works({
    filter: `authorships.author.id:${authorId}`,
    sort: 'publication_date:desc',
    per_page: 10,
  });
  
  return {
    name: author.display_name,
    hIndex: author.summary_stats.h_index,
    i10Index: author.summary_stats.i10_index,
    totalCitations: author.cited_by_count,
    totalWorks: author.works_count,
    affiliations: author.affiliations,
    recentWorks: recentWorks.results,
  };
}

// Example 9: Find collaborators
export async function findCollaborators(authorId: string) {
  // Get author's works
  const works = await openAlex.works({
    filter: `authorships.author.id:${authorId}`,
    per_page: 200,
  });
  
  // Extract co-authors
  const coAuthors = new Map<string, { name: string; count: number }>();
  
  works.results.forEach(work => {
    work.authorships.forEach(authorship => {
      if (authorship.author.id !== authorId) {
        const existing = coAuthors.get(authorship.author.id) || {
          name: authorship.author.display_name,
          count: 0,
        };
        existing.count++;
        coAuthors.set(authorship.author.id, existing);
      }
    });
  });
  
  // Sort by collaboration count
  return Array.from(coAuthors.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count);
}

// Example 10: Institution comparison
export async function compareInstitutions(institutionIds: string[]) {
  const institutions = await Promise.all(
    institutionIds.map(id => openAlex.institution(id))
  );
  
  const comparison = institutions.map(inst => ({
    name: inst.display_name,
    country: inst.country_code,
    type: inst.type,
    worksCount: inst.works_count,
    citedByCount: inst.cited_by_count,
    hIndex: inst.summary_stats.h_index,
    internationalCollaboration: inst.international ? Object.keys(inst.international.display_name).length : 0,
  }));
  
  return comparison;
}

// Example 11: Track research trends
export async function trackResearchTrends(keyword: string, years: number[] = [2019, 2020, 2021, 2022, 2023]) {
  const trends = await Promise.all(
    years.map(async year => {
      const response = await openAlex.works({
        search: keyword,
        filter: `publication_year:${year}`,
        per_page: 1,
      });
      
      return {
        year,
        count: response.meta.count,
      };
    })
  );
  
  return trends;
}

// Example 12: Find open access alternatives
export async function findOpenAccessVersion(doi: string) {
  const response = await openAlex.works({
    filter: `doi:${doi}`,
    per_page: 1,
  });
  
  if (response.results.length === 0) {
    return null;
  }
  
  const work = response.results[0];
  
  // Find OA locations
  const oaLocations = work.locations?.filter(loc => loc.is_oa) || [];
  
  return {
    title: work.display_name,
    isOA: work.open_access.is_oa,
    oaStatus: work.open_access.oa_status,
    oaUrl: work.open_access.oa_url,
    locations: oaLocations.map(loc => ({
      source: loc.source?.display_name,
      pdfUrl: loc.pdf_url,
      landingPageUrl: loc.landing_page_url,
      version: loc.version,
      license: loc.license,
    })),
  };
}

// Example 13: Batch operations
export async function getBatchOfWorks(workIds: string[]) {
  return openAlex.worksBatch(workIds);
}

// Example 14: Random sampling
export async function getRandomSample() {
  const randomWork = await openAlex.randomWork();
  const randomAuthor = await openAlex.randomAuthor();
  const randomInstitution = await openAlex.randomInstitution();
  
  return {
    work: randomWork.display_name,
    author: randomAuthor.display_name,
    institution: randomInstitution.display_name,
  };
}

// Example 15: Export data
export async function exportSearchResults() {
  const { entitiesToCSV } = await import('./utils/transformers');
  
  const response = await openAlex.works({
    search: 'artificial intelligence',
    filter: 'publication_year:2023',
    per_page: 100,
  });
  
  // Convert to CSV
  const csv = entitiesToCSV(response.results as unknown as Record<string, unknown>[], [
    'id',
    'display_name',
    'publication_year',
    'cited_by_count',
    'doi',
  ]);
  
  return csv;
}