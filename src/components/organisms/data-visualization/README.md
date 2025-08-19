# Advanced Data Visualization Components

This directory contains sophisticated visualization components for the Academic Explorer application, built using Test-Driven Development (TDD) principles and following modern frontend best practices.

## Overview

The data visualization system provides researchers with powerful tools to understand trends, patterns, and relationships in academic data through:

- **Interactive Timeline Charts** for publication trends and career progression
- **Network Diagrams** with clustering and community detection
- **Heatmaps** for geographic and temporal distribution analysis
- **Sankey Diagrams** for citation flow and knowledge transfer
- **Statistical Dashboards** with comparative analytics

## Architecture

### Technology Stack

- **Framework**: React 19 with TypeScript
- **Visualization Library**: D3.js v7 for data-driven DOM manipulation
- **Styling**: Vanilla Extract CSS-in-JS with design tokens
- **Testing**: Vitest with React Testing Library and comprehensive mocking
- **Performance**: Canvas rendering for large datasets with level-of-detail optimization
- **Accessibility**: Full WCAG compliance with keyboard navigation and screen reader support

### Design Principles

1. **Performance-First**: Optimized for datasets up to 50,000 data points
2. **Accessibility by Design**: Built with inclusive design principles
3. **Responsive Design**: Mobile-first approach with adaptive layouts
4. **Test-Driven Development**: Comprehensive test coverage before implementation
5. **Design System Integration**: Consistent with Academic Explorer design tokens

## Components

### 1. Timeline Chart (`timeline-chart/`)

Interactive timeline visualization for temporal academic data analysis.

**Features:**
- Multiple series support (line, area, bar, scatter)
- Interactive zoom, pan, and brush selection
- Responsive design with mobile optimization
- Export functionality (SVG, PNG, CSV)
- Real-time data updates
- Comprehensive accessibility features

**Test Coverage:**
- ✅ Unit tests for data processing utilities
- ✅ Component tests for rendering and interactions
- ✅ Integration tests with OpenAlex data
- ✅ Performance tests for large datasets
- ✅ Accessibility compliance tests

### 2. Network Diagram (`network-diagram/`)

Advanced network visualization with clustering algorithms for collaboration analysis.

**Features:**
- Multiple layout algorithms (force, circular, grid, hierarchical)
- Clustering algorithms (modularity, Louvain, k-means)
- Interactive drag, zoom, and selection
- Community detection and highlighting
- Real-time collaboration network updates
- Canvas rendering for performance

**Test Coverage:**
- ✅ Comprehensive test infrastructure
- 🔄 Implementation in progress
- ⏳ Component rendering tests
- ⏳ Clustering algorithm tests
- ⏳ Performance optimization tests

### 3. Heatmap (`heatmap/`) - *Planned*

Geographic and temporal distribution visualization.

**Planned Features:**
- Institution × Year publication heatmaps
- Geographic distribution analysis
- Topic evolution over time
- Interactive filtering and drill-down
- Color scale customization
- Export and sharing capabilities

### 4. Sankey Diagram (`sankey-diagram/`) - *Planned*

Citation flow and knowledge transfer visualization.

**Planned Features:**
- Institution → Topic knowledge flow
- Author collaboration patterns
- Funding → Research output analysis
- Interactive path highlighting
- Flow animation and transitions
- Custom node positioning

### 5. Statistical Dashboard (`statistical-dashboard/`) - *Planned*

Comparative analytics and metrics visualization.

**Planned Features:**
- Metric cards with trend indicators
- Comparative bar and line charts
- Radar charts for multi-dimensional analysis
- Real-time statistical updates
- Export to presentation formats
- Collaborative sharing features

## Data Processing

### Core Utilities (`utils/data-processing.ts`)

Comprehensive data transformation and statistical analysis functions:

- **Timeline Processing**: Works → timeline data points with aggregation
- **Network Analysis**: Collaboration network construction with clustering
- **Statistical Functions**: Comprehensive statistics, outlier detection, trend analysis
- **Heatmap Generation**: Multi-dimensional data aggregation
- **Sankey Preparation**: Flow data construction and optimization

**Test Coverage**: ✅ 30/30 tests passing with comprehensive edge case handling

### Performance Optimizations

- **Data Sampling**: Intelligent sampling for large datasets
- **Level-of-Detail**: Progressive rendering based on zoom level
- **Canvas Fallback**: Automatic canvas rendering for performance-critical visualizations
- **Memory Management**: Efficient data structures and garbage collection
- **Virtualization**: Virtual scrolling for large node lists

## Testing Strategy

### Test Categories

1. **Unit Tests** (`.unit.test.ts`): Pure logic and data transformations
2. **Component Tests** (`.component.test.tsx`): React component rendering and interactions
3. **Integration Tests** (`.integration.test.ts`): API integration and cache behavior
4. **E2E Tests** (`.e2e.test.ts`): Full user journeys and critical paths

### Testing Infrastructure

- **Mock Strategy**: D3 functions mocked for controlled testing
- **Data Factories**: Consistent test data generation
- **Performance Testing**: Automated performance benchmarks
- **Accessibility Testing**: Screen reader and keyboard navigation validation
- **Visual Regression**: Chart rendering consistency checks

### Current Test Status

```
✅ Data Processing Utils:     30/30 tests passing
✅ Timeline Chart Infrastructure: Complete
🔄 Network Diagram Tests:    Test infrastructure ready
⏳ Heatmap Tests:           Planned
⏳ Sankey Diagram Tests:    Planned
⏳ Statistical Dashboard:   Planned
```

## Design System Integration

### Color Schemes

- **Entity-Based**: Uses Academic Explorer entity colors (work, author, institution, etc.)
- **Categorical**: Optimized for discrete data categories
- **Sequential**: For continuous data ranges
- **Diverging**: For data with meaningful center point

### Responsive Design

- **Breakpoints**: Mobile (≤480px), Tablet (≤768px), Desktop (>768px)
- **Adaptive Layouts**: Chart dimensions and interactions adapt to screen size
- **Touch Optimization**: Touch-friendly interactions for mobile devices
- **Performance Scaling**: Reduced complexity on lower-powered devices

### Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: ARIA labels and descriptions
- **High Contrast**: Automatic high contrast mode detection
- **Reduced Motion**: Respects user motion preferences
- **Focus Management**: Proper focus indicators and navigation

## Performance Specifications

### Target Performance Metrics

- **Initial Render**: < 500ms for standard datasets (< 1000 data points)
- **Large Dataset Render**: < 2s for large datasets (< 50,000 data points)
- **Interaction Response**: < 100ms for zoom, pan, hover interactions
- **Memory Usage**: < 100MB for standard visualizations
- **Bundle Size**: < 200KB gzipped for visualization module

### Optimization Techniques

1. **Progressive Loading**: Load and render data incrementally
2. **Data Aggregation**: Intelligent aggregation for overview levels
3. **Canvas Rendering**: Hardware-accelerated rendering for complex visualizations
4. **Web Workers**: Off-main-thread computation for heavy processing
5. **Request Deduplication**: Prevent duplicate API calls during rapid interactions

## Usage Examples

### Basic Timeline Chart

```tsx
import { TimelineChart } from '@/components/organisms/data-visualization';

const PublicationTimeline = ({ works }) => {
  const series = useMemo(() => [
    {
      id: 'publications',
      name: 'Publications per Year',
      data: transformWorksToTimeline(works, 'publication_count'),
      style: 'line'
    }
  ], [works]);

  return (
    <TimelineChart
      series={series}
      width={800}
      height={400}
      xAxis={{ label: 'Year', grid: true }}
      yAxis={{ label: 'Publications', grid: true }}
      interactions={{ zoom: true, brush: true }}
      ariaLabel="Publication timeline showing trends over time"
    />
  );
};
```

### Network Diagram with Clustering

```tsx
import { NetworkDiagram } from '@/components/organisms/data-visualization';

const CollaborationNetwork = ({ works }) => {
  const { nodes, edges } = useMemo(() => 
    calculateCollaborationNetwork(works), [works]);

  return (
    <NetworkDiagram
      nodes={nodes}
      edges={edges}
      layout={{ algorithm: 'force', animate: true }}
      clustering={{ algorithm: 'modularity', resolution: 1.0 }}
      interactions={{ drag: true, zoom: true, selection: true }}
      style={{
        node: { defaultSize: 10 },
        labels: { show: true, threshold: 15 }
      }}
    />
  );
};
```

## Development Workflow

### Adding New Visualizations

1. **Create Test Infrastructure**: Write comprehensive tests first
2. **Define Type Interfaces**: Specify component props and data types
3. **Implement Core Logic**: Build data processing and rendering logic
4. **Add Styling**: Integrate with design system and responsive design
5. **Performance Testing**: Verify performance targets are met
6. **Accessibility Audit**: Ensure WCAG compliance
7. **Documentation**: Update README and provide usage examples

### Testing New Features

```bash
# Run unit tests for data processing
pnpm test:unit src/components/organisms/data-visualization/utils/

# Run component tests for specific visualization
pnpm test:component src/components/organisms/data-visualization/timeline-chart/

# Run integration tests with real data
pnpm test:integration src/components/organisms/data-visualization/

# Run performance benchmarks
pnpm test:performance
```

## Future Enhancements

### Planned Features

1. **Real-time Collaboration**: Multiple users viewing and annotating visualizations
2. **Advanced Analytics**: Statistical significance testing and correlation analysis
3. **Machine Learning Integration**: Anomaly detection and predictive modeling
4. **Advanced Export**: PowerPoint, PDF with vector graphics
5. **Custom Visualizations**: User-configurable chart builder
6. **Data Pipeline Integration**: Direct connection to institutional data sources

### Performance Improvements

1. **WebGL Rendering**: Hardware-accelerated graphics for massive datasets
2. **Streaming Data**: Real-time data updates with incremental rendering
3. **Advanced Caching**: Intelligent caching strategies for computed visualizations
4. **Progressive Web App**: Offline capability and improved performance
5. **Web Workers**: Parallel processing for complex calculations

## Contributing

### Development Setup

```bash
# Install dependencies
pnpm install

# Start development environment
pnpm dev

# Run test suite
pnpm test:safe

# Type checking
pnpm typecheck

# Build for production
pnpm build
```

### Code Standards

- **TypeScript**: Strict typing with comprehensive interfaces
- **React**: Functional components with hooks
- **Testing**: TDD approach with high coverage requirements
- **Performance**: All visualizations must meet performance targets
- **Accessibility**: WCAG 2.1 AA compliance required
- **Documentation**: Comprehensive JSDoc and README documentation

### Pull Request Process

1. Create feature branch from `main`
2. Implement with TDD approach (tests first)
3. Ensure all tests pass and performance targets met
4. Update documentation and examples
5. Submit PR with comprehensive description
6. Code review and accessibility audit
7. Merge after approval and CI validation

## Support and Maintenance

### Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Polyfills**: Minimal polyfills for essential features only

### Monitoring and Analytics

- **Performance Monitoring**: Real User Monitoring (RUM) for visualization performance
- **Error Tracking**: Comprehensive error tracking with context
- **Usage Analytics**: Anonymous usage patterns for optimization insights
- **Accessibility Monitoring**: Automated accessibility testing in CI/CD

This visualization system represents a cutting-edge approach to academic data visualization, combining performance, accessibility, and user experience to provide researchers with powerful tools for understanding complex academic relationships and trends.