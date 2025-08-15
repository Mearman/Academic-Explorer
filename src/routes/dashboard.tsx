import { createFileRoute } from '@tanstack/react-router';

import { Chart, NetworkVisualization, MetricsPanel } from '@/components';

import * as styles from '../app/page.css';

// Sample data for demonstration
const citationTrendsData = [
  { x: 2019, y: 1200 },
  { x: 2020, y: 1800 },
  { x: 2021, y: 2400 },
  { x: 2022, y: 3200 },
  { x: 2023, y: 4100 },
  { x: 2024, y: 4800 }
];

const publicationsByTypeData = [
  { x: 'Journal Articles', y: 245 },
  { x: 'Conference Papers', y: 128 },
  { x: 'Book Chapters', y: 34 },
  { x: 'Books', y: 12 },
  { x: 'Preprints', y: 89 }
];

const collaborationNetwork = {
  nodes: [
    { id: 'A12345', name: 'Dr. Sarah Chen', entity_type: 'author', citations: 3420 },
    { id: 'A67890', name: 'Prof. Michael Rodriguez', entity_type: 'author', citations: 5670 },
    { id: 'A11111', name: 'Dr. Emma Thompson', entity_type: 'author', citations: 2890 },
    { id: 'I54321', name: 'MIT', entity_type: 'institution', size: 120 },
    { id: 'I98765', name: 'Stanford University', entity_type: 'institution', size: 200 },
    { id: 'S11111', name: 'Nature', entity_type: 'source', size: 150 },
    { id: 'S22222', name: 'Science', entity_type: 'source', size: 140 }
  ],
  edges: [
    { source: 'A12345', target: 'A67890', strength: 8 },
    { source: 'A67890', target: 'A11111', strength: 5 },
    { source: 'A12345', target: 'A11111', strength: 3 },
    { source: 'A12345', target: 'I54321', strength: 10 },
    { source: 'A67890', target: 'I98765', strength: 12 },
    { source: 'A11111', target: 'I54321', strength: 7 },
    { source: 'A12345', target: 'S11111', strength: 6 },
    { source: 'A67890', target: 'S22222', strength: 9 }
  ]
};

const researchMetrics = [
  { label: 'Total Citations', value: 15780, trend: 'up' as const },
  { label: 'H-Index', value: 42, trend: 'up' as const },
  { label: 'Publications', value: 127, trend: 'neutral' as const },
  { label: 'Collaborators', value: 89, trend: 'up' as const },
  { label: 'Research Impact', value: 8.5, format: 'number' as const, trend: 'up' as const },
  { label: 'Grant Funding', value: 2450000, format: 'currency' as const, trend: 'up' as const }
];

function DashboardPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Research Analytics Dashboard</h1>
        <p className={styles.description}>
          Visualise and analyse academic research data with interactive charts and networks
        </p>
        
        {/* Research Metrics Overview */}
        <MetricsPanel
          title="Research Impact Overview"
          metrics={researchMetrics}
        />
        
        <div className={styles.grid} style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          {/* Citation Trends Chart */}
          <Chart
            data={citationTrendsData}
            title="Citation Trends Over Time"
            type="line"
            width={550}
            height={350}
            showGrid={true}
            showLabels={true}
          />
          
          {/* Publications by Type Chart */}
          <Chart
            data={publicationsByTypeData}
            title="Publications by Type"
            type="bar"
            width={550}
            height={350}
            showGrid={true}
            showLabels={true}
          />
        </div>
        
        {/* Collaboration Network */}
        <div style={{ marginTop: '2rem' }}>
          <NetworkVisualization
            nodes={collaborationNetwork.nodes}
            edges={collaborationNetwork.edges}
            title="Research Collaboration Network"
            width={800}
            height={600}
          />
        </div>
        
        {/* Feature Cards */}
        <div className={styles.grid} style={{ marginTop: '3rem' }}>
          <div className={styles.card}>
            <h2>📊 Interactive Charts</h2>
            <p>Visualise citation trends, publication metrics, and research impact with responsive SVG charts</p>
          </div>
          
          <div className={styles.card}>
            <h2>🕸️ Network Analysis</h2>
            <p>Explore collaboration networks between authors, institutions, and publication venues</p>
          </div>
          
          <div className={styles.card}>
            <h2>📈 Metrics Dashboard</h2>
            <p>Track key research indicators with trend analysis and performance monitoring</p>
          </div>
          
          <div className={styles.card}>
            <h2>🎨 Entity-Aware Styling</h2>
            <p>Colour-coded visualizations that match OpenAlex entity types for consistent branding</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});