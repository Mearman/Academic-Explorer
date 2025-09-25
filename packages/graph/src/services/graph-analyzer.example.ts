/**
 * Usage Examples for GraphAnalyzer Service
 *
 * This file demonstrates how to use the GraphAnalyzer service for academic graph analysis
 */

import { GraphAnalyzer, type AnalysisOptions, type TimeRange } from './graph-analyzer';
import type { GraphData } from '../types/core';

// Example: Initialize GraphAnalyzer with OpenAlex provider
export async function initializeAnalyzer(): Promise<GraphAnalyzer> {
  // You would typically get your OpenAlexClient from your application
  // const openAlexClient = new OpenAlexClient({ /* your config */ });
  // const provider = new OpenAlexGraphProvider(openAlexClient);

  // For this example, we'll use a mock provider
  const mockProvider = {
    // This would be your actual GraphDataProvider implementation
  } as any;

  const analyzer = new GraphAnalyzer(mockProvider);
  return analyzer;
}

// Example: Citation Analysis for an Author
async function analyzeCitationMetrics() {
  const analyzer = await initializeAnalyzer();

  // Analysis options for controlling computation
  const options: AnalysisOptions = {
    useCache: true,
    cacheExpiry: 60, // minutes
    computeStatistics: true,
    includeConfidenceIntervals: true,
    maxNetworkSize: 1000,
  };

  try {
    // Analyze citation metrics for an OpenAlex author ID
    const authorId = 'A5017898742'; // Example author ID
    const citationMetrics = await analyzer.calculateCitationMetrics(authorId, options);

    console.log('Citation Analysis Results:');
    console.log('- Total Citations:', citationMetrics.totalCitations);
    console.log('- H-Index:', citationMetrics.hIndex);
    console.log('- Recent Citations (last 2 years):', citationMetrics.recentCitations);
    console.log('- Citation Velocity:', citationMetrics.citationVelocity);
    console.log('- Data Completeness:', Math.round(citationMetrics.dataCompleteness * 100) + '%');

    // Show citation trend
    console.log('\nCitation Trend by Year:');
    citationMetrics.citationsByYear.forEach(({ year, count }) => {
      console.log(`  ${year}: ${count} citations`);
    });

    // Show top citing papers
    console.log('\nTop Citing Papers:');
    citationMetrics.topCitingPapers.slice(0, 5).forEach((paper, index) => {
      console.log(`  ${index + 1}. ${paper.title} (${paper.citations} citations)`);
    });

  } catch (error) {
    console.error('Citation analysis failed:', error);
  }
}

// Example: Network Analysis for Graph Data
async function analyzeNetworkStructure() {
  const analyzer = await initializeAnalyzer();

  // Example graph data (you would get this from your application)
  const graphData: GraphData = {
    nodes: [
      { id: 'A5017898742', entityType: 'authors', label: 'Author 1', entityId: 'A5017898742', x: 0, y: 0, externalIds: [] },
      { id: 'A2164265445', entityType: 'authors', label: 'Author 2', entityId: 'A2164265445', x: 1, y: 1, externalIds: [] },
      { id: 'W2741809807', entityType: 'works', label: 'Work 1', entityId: 'W2741809807', x: 0, y: 1, externalIds: [] },
    ],
    edges: [
      { id: 'e1', source: 'A5017898742', target: 'W2741809807', type: 'authored' as any },
      { id: 'e2', source: 'A2164265445', target: 'W2741809807', type: 'authored' as any },
    ]
  };

  try {
    const networkMetrics = await analyzer.calculateNetworkMetrics(graphData, {
      useCache: true,
      computeStatistics: true,
    });

    console.log('Network Analysis Results:');
    console.log('- Nodes:', networkMetrics.nodeCount);
    console.log('- Edges:', networkMetrics.edgeCount);
    console.log('- Network Density:', networkMetrics.density.toFixed(3));
    console.log('- Clustering Coefficient:', networkMetrics.clusteringCoefficient.toFixed(3));

    // Show centrality measures for each node
    console.log('\nNode Centrality Measures:');
    Object.entries(networkMetrics.centrality).forEach(([nodeId, centrality]) => {
      console.log(`  ${nodeId}:`);
      console.log(`    - Degree: ${centrality.degree}`);
      console.log(`    - Betweenness: ${centrality.betweenness.toFixed(3)}`);
      console.log(`    - Closeness: ${centrality.closeness.toFixed(3)}`);
      console.log(`    - PageRank: ${centrality.pagerank.toFixed(3)}`);
    });

    // Show communities
    console.log('\nCommunity Structure:');
    networkMetrics.communities.forEach((community, index) => {
      console.log(`  Community ${index + 1}:`);
      console.log(`    - Size: ${community.size} nodes`);
      console.log(`    - Density: ${community.density.toFixed(3)}`);
      console.log(`    - Members: ${community.nodes.join(', ')}`);
    });

  } catch (error) {
    console.error('Network analysis failed:', error);
  }
}

// Example: Collaboration Analysis
async function analyzeCollaborationPatterns() {
  const analyzer = await initializeAnalyzer();

  try {
    const authorId = 'A5017898742'; // Example author ID
    const collaborationMetrics = await analyzer.analyzeCollaborations(authorId, {
      useCache: true,
      maxNetworkSize: 500,
    });

    console.log('Collaboration Analysis Results:');
    console.log('- Total Collaborators:', collaborationMetrics.collaborationNetwork.directCollaborators.length);
    console.log('- Collaboration Strength:', collaborationMetrics.collaborationNetwork.collaborationStrength.toFixed(3));
    console.log('- Institutional Diversity:', collaborationMetrics.institutionalCollaboration.institutionalDiversity);
    console.log('- Cross-Institutional Rate:', Math.round(collaborationMetrics.institutionalCollaboration.crossInstitutionalRate * 100) + '%');

    // Show top collaborators
    console.log('\nTop Collaborators:');
    collaborationMetrics.collaborationNetwork.directCollaborators
      .slice(0, 5)
      .forEach((collaborator, index) => {
        console.log(`  ${index + 1}. ${collaborator.nodeId}`);
        console.log(`     - Collaborations: ${collaborator.collaborations}`);
        console.log(`     - Strength Score: ${collaborator.strengthScore.toFixed(2)}`);
        console.log(`     - Shared Works: ${collaborator.sharedWorks.length}`);
      });

    // Show collaboration evolution
    console.log('\nCollaboration Evolution:');
    collaborationMetrics.temporalPatterns.forEach(pattern => {
      console.log(`  ${pattern.year}:`);
      console.log(`    - New Collaborators: ${pattern.newCollaborators}`);
      console.log(`    - Repeat Collaborators: ${pattern.repeatCollaborators}`);
      console.log(`    - Collaboration Breadth: ${pattern.collaborationBreadth}`);
    });

  } catch (error) {
    console.error('Collaboration analysis failed:', error);
  }
}

// Example: Research Trends Detection
async function detectResearchTrends() {
  const analyzer = await initializeAnalyzer();

  const timeRange: TimeRange = {
    startYear: 2015,
    endYear: 2024,
    includeFuture: false,
  };

  try {
    const authorId = 'A5017898742'; // Example author ID
    const trendAnalysis = await analyzer.detectTrends(timeRange, 'authors', authorId, {
      useCache: true,
      computeStatistics: true,
    });

    console.log('Research Trends Analysis:');
    console.log('- Career Stage:', trendAnalysis.publicationTrends.careerStage);
    console.log('- Productivity Trend:', trendAnalysis.publicationTrends.productivityTrend);
    console.log('- Peak Years:', trendAnalysis.publicationTrends.peakYears.join(', '));

    // Show publication trends
    console.log('\nPublication Trends by Year:');
    trendAnalysis.publicationTrends.yearlyOutput.forEach(output => {
      console.log(`  ${output.year}: ${output.count} publications (Impact: ${output.impactSum})`);
    });

    // Show current research topics
    console.log('\nCurrent Research Topics:');
    trendAnalysis.researchTopics.currentTopics.forEach(topic => {
      console.log(`  - ${topic.topic} (${Math.round(topic.prevalence * 100)}% prevalence, ${topic.trend})`);
      console.log(`    First appeared: ${topic.firstAppeared}, Last: ${topic.lastAppeared}`);
    });

    // Show emerging areas
    console.log('\nEmerging Research Areas:');
    trendAnalysis.researchTopics.emergingAreas.forEach(area => {
      console.log(`  - ${area}`);
    });

    // Show future projections
    console.log('\nFuture Projections:');
    console.log(`  - Expected Output (next year): ${trendAnalysis.futureProjections.expectedOutput}`);
    console.log(`  - Impact Projection: ${trendAnalysis.futureProjections.impactProjection}`);
    console.log(`  - Emerging Topic Alignment: ${Math.round(trendAnalysis.futureProjections.emergingTopicAlignment * 100)}%`);
    console.log(`  - Confidence: ${Math.round(trendAnalysis.futureProjections.confidence * 100)}%`);

  } catch (error) {
    console.error('Trends analysis failed:', error);
  }
}

// Example: Batch Analysis and Comparison
async function comparativeAnalysis() {
  const analyzer = await initializeAnalyzer();

  try {
    // Compare citation metrics for multiple authors
    const authorIds = ['A5017898742', 'A2164265445', 'A2335018700']; // Example author IDs

    const comparisonResults = await analyzer.compareEntities(
      authorIds,
      'citation',
      {
        useCache: true,
        includeConfidenceIntervals: true,
      }
    );

    console.log('Comparative Citation Analysis:');
    console.log('\nRankings:');
    comparisonResults.comparison.rankings.forEach(ranking => {
      console.log(`  ${ranking.rank}. ${ranking.nodeId} (Score: ${ranking.score.toFixed(2)})`);
    });

    // Show detailed metrics for each author
    console.log('\nDetailed Metrics:');
    Object.entries(comparisonResults.metrics).forEach(([authorId, metrics]) => {
      const citationMetrics = metrics as any; // Type assertion for example
      console.log(`\n${authorId}:`);
      console.log(`  - Total Citations: ${citationMetrics.totalCitations}`);
      console.log(`  - H-Index: ${citationMetrics.hIndex}`);
      console.log(`  - Recent Citations: ${citationMetrics.recentCitations}`);
      console.log(`  - Citation Velocity: ${citationMetrics.citationVelocity?.toFixed(3) || 'N/A'}`);
    });

  } catch (error) {
    console.error('Comparative analysis failed:', error);
  }
}

// Example: Cache Management
async function cacheManagement() {
  const analyzer = await initializeAnalyzer();

  // Show cache statistics
  const cacheStats = analyzer.getCacheStats();
  console.log('Cache Statistics:');
  console.log('- Citation Metrics Cache:', cacheStats.citationMetrics);
  console.log('- Network Metrics Cache:', cacheStats.networkMetrics);
  console.log('- Collaboration Metrics Cache:', cacheStats.collaborationMetrics);
  console.log('- Trend Analysis Cache:', cacheStats.trendAnalysis);
  console.log('- Total Cached Items:', cacheStats.totalSize);

  // Clear cache if needed
  analyzer.clearCache();
  console.log('Cache cleared');

  // Cleanup when done
  analyzer.destroy();
  console.log('Analyzer resources cleaned up');
}

// Example: Complete workflow
async function completeAnalysisWorkflow() {
  console.log('=== Academic Graph Analysis Workflow ===\n');

  try {
    // 1. Citation Analysis
    console.log('1. Citation Analysis:');
    await analyzeCitationMetrics();
    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Network Analysis
    console.log('2. Network Analysis:');
    await analyzeNetworkStructure();
    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Collaboration Analysis
    console.log('3. Collaboration Analysis:');
    await analyzeCollaborationPatterns();
    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Trends Analysis
    console.log('4. Research Trends Analysis:');
    await detectResearchTrends();
    console.log('\n' + '='.repeat(50) + '\n');

    // 5. Comparative Analysis
    console.log('5. Comparative Analysis:');
    await comparativeAnalysis();
    console.log('\n' + '='.repeat(50) + '\n');

    // 6. Cache Management
    console.log('6. Cache Management:');
    await cacheManagement();

    console.log('\n=== Analysis Workflow Complete ===');

  } catch (error) {
    console.error('Analysis workflow failed:', error);
  }
}

// Export all examples for use in other modules
export {
  analyzeCitationMetrics,
  analyzeNetworkStructure,
  analyzeCollaborationPatterns,
  detectResearchTrends,
  comparativeAnalysis,
  cacheManagement,
  completeAnalysisWorkflow,
};