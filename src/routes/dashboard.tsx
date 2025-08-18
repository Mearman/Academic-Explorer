import { 
  IconChartBar, 
  IconNetwork, 
  IconTrendingUp, 
  IconFilter,
  IconRefresh,
  IconSettings 
} from '@tabler/icons-react';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { 
  Chart, 
  NetworkVisualization, 
  TwoPaneLayout,
  EntityGraphVisualization,
  Badge
} from '@/components';

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

// Enhanced network data with more entities and relationships
const collaborationNetwork = {
  nodes: [
    // Authors
    { id: 'A12345', name: 'Dr. Sarah Chen', entity_type: 'author', citations: 3420, works_count: 45, h_index: 28 },
    { id: 'A67890', name: 'Prof. Michael Rodriguez', entity_type: 'author', citations: 5670, works_count: 78, h_index: 35 },
    { id: 'A11111', name: 'Dr. Emma Thompson', entity_type: 'author', citations: 2890, works_count: 32, h_index: 23 },
    { id: 'A99999', name: 'Dr. James Wilson', entity_type: 'author', citations: 4200, works_count: 56, h_index: 31 },
    { id: 'A88888', name: 'Prof. Lisa Chang', entity_type: 'author', citations: 6100, works_count: 89, h_index: 38 },
    
    // Institutions
    { id: 'I54321', name: 'MIT', entity_type: 'institution', size: 120, country: 'US', works_count: 15420 },
    { id: 'I98765', name: 'Stanford University', entity_type: 'institution', size: 200, country: 'US', works_count: 18950 },
    { id: 'I77777', name: 'Cambridge University', entity_type: 'institution', size: 150, country: 'UK', works_count: 12800 },
    { id: 'I66666', name: 'ETH Zurich', entity_type: 'institution', size: 80, country: 'CH', works_count: 8900 },
    
    // Sources
    { id: 'S11111', name: 'Nature', entity_type: 'source', size: 150, impact_factor: 49.962 },
    { id: 'S22222', name: 'Science', entity_type: 'source', size: 140, impact_factor: 47.728 },
    { id: 'S33333', name: 'Cell', entity_type: 'source', size: 130, impact_factor: 45.5 },
    { id: 'S44444', name: 'PNAS', entity_type: 'source', size: 110, impact_factor: 12.779 },
    
    // Topics/Concepts
    { id: 'C55555', name: 'Machine Learning', entity_type: 'concept', size: 180, works_count: 450000 },
    { id: 'C44444', name: 'Computational Biology', entity_type: 'concept', size: 120, works_count: 280000 },
    { id: 'C33333', name: 'Data Science', entity_type: 'concept', size: 160, works_count: 380000 }
  ],
  edges: [
    // Author collaborations
    { source: 'A12345', target: 'A67890', strength: 8, type: 'collaboration' },
    { source: 'A67890', target: 'A11111', strength: 5, type: 'collaboration' },
    { source: 'A12345', target: 'A11111', strength: 3, type: 'collaboration' },
    { source: 'A99999', target: 'A88888', strength: 12, type: 'collaboration' },
    { source: 'A12345', target: 'A99999', strength: 6, type: 'collaboration' },
    
    // Author-Institution affiliations
    { source: 'A12345', target: 'I54321', strength: 10, type: 'affiliation' },
    { source: 'A67890', target: 'I98765', strength: 12, type: 'affiliation' },
    { source: 'A11111', target: 'I54321', strength: 7, type: 'affiliation' },
    { source: 'A99999', target: 'I77777', strength: 9, type: 'affiliation' },
    { source: 'A88888', target: 'I66666', strength: 11, type: 'affiliation' },
    
    // Author-Source publications
    { source: 'A12345', target: 'S11111', strength: 6, type: 'publication' },
    { source: 'A67890', target: 'S22222', strength: 9, type: 'publication' },
    { source: 'A11111', target: 'S33333', strength: 4, type: 'publication' },
    { source: 'A99999', target: 'S11111', strength: 7, type: 'publication' },
    { source: 'A88888', target: 'S44444', strength: 8, type: 'publication' },
    
    // Author-Concept research
    { source: 'A12345', target: 'C55555', strength: 15, type: 'research' },
    { source: 'A67890', target: 'C44444', strength: 12, type: 'research' },
    { source: 'A11111', target: 'C33333', strength: 8, type: 'research' },
    { source: 'A99999', target: 'C55555', strength: 10, type: 'research' },
    { source: 'A88888', target: 'C33333', strength: 14, type: 'research' },
    
    // Cross-institutional collaborations
    { source: 'I54321', target: 'I98765', strength: 25, type: 'institutional_collaboration' },
    { source: 'I77777', target: 'I66666', strength: 18, type: 'institutional_collaboration' },
    
    // Concept relationships
    { source: 'C55555', target: 'C33333', strength: 20, type: 'concept_relationship' },
    { source: 'C44444', target: 'C55555', strength: 15, type: 'concept_relationship' }
  ]
};

// Network filter options
const networkFilters = {
  entityTypes: ['author', 'institution', 'source', 'concept'],
  relationshipTypes: ['collaboration', 'affiliation', 'publication', 'research', 'institutional_collaboration', 'concept_relationship'],
  metrics: ['citations', 'h_index', 'works_count', 'impact_factor']
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
  // State for interactive features
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [activeEntityTypes, setActiveEntityTypes] = useState<Set<string>>(new Set(networkFilters.entityTypes));
  const [activeRelationshipTypes, setActiveRelationshipTypes] = useState<Set<string>>(new Set(networkFilters.relationshipTypes));
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [networkMode, setNetworkMode] = useState<'full' | 'entity' | 'simple'>('full');

  // Filter network data based on selections
  const filteredNetworkData = {
    nodes: collaborationNetwork.nodes.filter(node => activeEntityTypes.has(node.entity_type)),
    edges: collaborationNetwork.edges.filter(edge => 
      activeRelationshipTypes.has(edge.type) &&
      activeEntityTypes.has(collaborationNetwork.nodes.find(n => n.id === edge.source)?.entity_type || '') &&
      activeEntityTypes.has(collaborationNetwork.nodes.find(n => n.id === edge.target)?.entity_type || '')
    )
  };

  // Handle metric selection to highlight related entities
  const handleMetricClick = (metric: typeof researchMetrics[0]) => {
    const metricKey = metric.label.toLowerCase().replace(/[^a-z]/g, '');
    setSelectedMetric(selectedMetric === metricKey ? null : metricKey);
    
    // Highlight relevant nodes based on metric
    if (metricKey === 'totalcitations') {
      const topCitedAuthor = collaborationNetwork.nodes
        .filter(n => n.entity_type === 'author')
        .sort((a, b) => (b.citations || 0) - (a.citations || 0))[0];
      setHighlightedNode(topCitedAuthor?.id || null);
    } else if (metricKey === 'hindex') {
      const topHIndexAuthor = collaborationNetwork.nodes
        .filter(n => n.entity_type === 'author')
        .sort((a, b) => (b.h_index || 0) - (a.h_index || 0))[0];
      setHighlightedNode(topHIndexAuthor?.id || null);
    } else {
      setHighlightedNode(null);
    }
  };

  // Handle entity type filtering
  const handleEntityTypeToggle = (entityType: string) => {
    const newTypes = new Set(activeEntityTypes);
    if (newTypes.has(entityType)) {
      newTypes.delete(entityType);
    } else {
      newTypes.add(entityType);
    }
    setActiveEntityTypes(newTypes);
  };

  // Handle relationship type filtering
  const handleRelationshipToggle = (relType: string) => {
    const newTypes = new Set(activeRelationshipTypes);
    if (newTypes.has(relType)) {
      newTypes.delete(relType);
    } else {
      newTypes.add(relType);
    }
    setActiveRelationshipTypes(newTypes);
  };

  // Enhanced research metrics with click handlers
  const enhancedMetrics = researchMetrics.map(metric => ({
    ...metric,
    isSelected: selectedMetric === metric.label.toLowerCase().replace(/[^a-z]/g, ''),
    onClick: () => handleMetricClick(metric)
  }));

  // Left Pane: Analytics, Controls, and Charts
  const leftPaneContent = (
    <div style={{ padding: '1rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <IconChartBar size={20} />
          Research Analytics
        </h1>
        <p style={{ color: 'var(--mantine-color-dimmed)', fontSize: '0.9rem' }}>
          Explore academic research data through interactive metrics and network visualizations
        </p>
      </div>

      {/* Interactive Metrics Panel */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
          Key Research Indicators
        </h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {enhancedMetrics.map((metric, index) => (
            <div
              key={index}
              onClick={metric.onClick}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: `1px solid ${metric.isSelected ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)'}`,
                backgroundColor: metric.isSelected ? 'var(--mantine-primary-color-light)' : 'var(--mantine-color-body)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{metric.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                  {typeof metric.value === 'number' ? (
                    metric.format === 'currency' ? 
                      `$${(metric.value / 1000000).toFixed(1)}M` :
                      metric.value.toLocaleString()
                  ) : metric.value}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {metric.trend === 'up' && <IconTrendingUp size={16} color="green" />}
                {metric.isSelected && <Badge size="xs" color="blue">Active</Badge>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Controls */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconFilter size={16} />
          Network Filters
        </h3>
        
        {/* Entity Type Filters */}
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--mantine-color-dimmed)' }}>
            Entity Types
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {networkFilters.entityTypes.map(type => (
              <button
                key={type}
                onClick={() => handleEntityTypeToggle(type)}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--mantine-color-default-border)',
                  backgroundColor: activeEntityTypes.has(type) ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-body)',
                  color: activeEntityTypes.has(type) ? 'white' : 'var(--mantine-color-text)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}s
              </button>
            ))}
          </div>
        </div>

        {/* Relationship Type Filters */}
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--mantine-color-dimmed)' }}>
            Relationships
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {networkFilters.relationshipTypes.map(type => (
              <button
                key={type}
                onClick={() => handleRelationshipToggle(type)}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--mantine-color-default-border)',
                  backgroundColor: activeRelationshipTypes.has(type) ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-body)',
                  color: activeRelationshipTypes.has(type) ? 'white' : 'var(--mantine-color-text)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Network Mode */}
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--mantine-color-dimmed)' }}>
            View Mode
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['full', 'entity', 'simple'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setNetworkMode(mode)}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--mantine-color-default-border)',
                  backgroundColor: networkMode === mode ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-body)',
                  color: networkMode === mode ? 'white' : 'var(--mantine-color-text)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Citation Trends Chart */}
      <div style={{ marginBottom: '2rem' }}>
        <Chart
          data={citationTrendsData}
          title="Citation Trends Over Time"
          type="line"
          width={300}
          height={200}
          showGrid={true}
          showLabels={true}
        />
      </div>

      {/* Publications by Type Chart */}
      <div style={{ marginBottom: '2rem' }}>
        <Chart
          data={publicationsByTypeData}
          title="Publications by Type"
          type="bar"
          width={300}
          height={200}
          showGrid={true}
          showLabels={true}
        />
      </div>

      {/* Network Statistics */}
      <div style={{ 
        padding: '1rem', 
        backgroundColor: 'var(--mantine-color-gray-0)', 
        borderRadius: '6px',
        marginTop: '1rem'
      }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem' }}>
          Network Statistics
        </h4>
        <div style={{ fontSize: '0.8rem', color: 'var(--mantine-color-dimmed)' }}>
          <div>Nodes: {filteredNetworkData.nodes.length}</div>
          <div>Edges: {filteredNetworkData.edges.length}</div>
          <div>Density: {((filteredNetworkData.edges.length * 2) / (filteredNetworkData.nodes.length * (filteredNetworkData.nodes.length - 1))).toFixed(3)}</div>
        </div>
      </div>
    </div>
  );

  // Right Pane: Enhanced Network Visualization
  const rightPaneContent = (
    <div style={{ height: '100%', position: 'relative' }}>
      {filteredNetworkData.nodes.length === 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <IconNetwork size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No Network Data</h3>
          <p style={{ color: 'var(--mantine-color-dimmed)', marginBottom: '1rem' }}>
            Select entity types and relationships to visualize the network
          </p>
          <button
            onClick={() => setActiveEntityTypes(new Set(networkFilters.entityTypes))}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-body)',
              color: 'var(--mantine-color-text)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s ease'
            }}
          >
            <IconRefresh size={14} />
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ height: '100%' }}>
          {networkMode === 'entity' ? (
            <EntityGraphVisualization
              width={800}
              height={600}
              showControls={true}
              showLegend={true}
              onVertexClick={(vertex) => {
                setHighlightedNode(vertex.id === highlightedNode ? null : vertex.id);
              }}
              onVertexHover={(_vertex) => {
                // Handle hover feedback if needed
              }}
            />
          ) : (
            <NetworkVisualization
              nodes={filteredNetworkData.nodes}
              edges={filteredNetworkData.edges}
              title={`Research Network (${networkMode} view)`}
              width={800}
              height={600}
            />
          )}
          
          {/* Network Actions */}
          <div style={{ 
            position: 'absolute', 
            top: '1rem', 
            right: '1rem', 
            display: 'flex', 
            gap: '0.5rem',
            zIndex: 10
          }}>
            <button
              onClick={() => {
                setHighlightedNode(null);
                setSelectedMetric(null);
              }}
              title="Clear Selection"
              style={{
                padding: '0.25rem',
                borderRadius: '4px',
                border: '1px solid var(--mantine-color-default-border)',
                backgroundColor: 'var(--mantine-color-body)',
                color: 'var(--mantine-color-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <IconRefresh size={14} />
            </button>
            <button
              onClick={() => {
                // Could implement export functionality
              }}
              title="Export Network"
              style={{
                padding: '0.25rem',
                borderRadius: '4px',
                border: '1px solid var(--mantine-color-default-border)',
                backgroundColor: 'var(--mantine-color-body)',
                color: 'var(--mantine-color-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <IconSettings size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <TwoPaneLayout
        leftPane={leftPaneContent}
        rightPane={rightPaneContent}
        defaultSplit={40}
        minPaneSize={300}
        leftCollapsible={true}
        rightCollapsible={true}
        persistState={true}
        stateKey="dashboard-layout"
        leftTitle="Analytics & Controls"
        rightTitle="Network Visualization"
        showHeaders={true}
        showMobileTabs={true}
        mobileTabLabels={{ left: 'Analytics', right: 'Network' }}
      />
    </div>
  );
}

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});