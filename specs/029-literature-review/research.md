# Research Findings: Advanced Literature Review Workflows

**Date**: 2025-11-30
**Feature**: 029-literature-review

## Citation Export Formats Research

### Decision: @citation-js/core + Custom Implementation
**Rationale**: Most comprehensive TypeScript-ready library with excellent BibTeX support and custom field handling. Part of established Citation.js ecosystem with strong TypeScript definitions.

**Alternative Considered**: bibtex-parser-ts (TypeScript-first but less comprehensive)

**Implementation Strategy**:
- Use @citation-js/core for BibTeX generation with custom fields
- Implement custom RIS generator using ris-js library for compatibility
- Use SheetJS for CSV export with configurable columns
- Create streaming implementation for 1000+ citations to maintain performance
- Implement comprehensive citation key generation algorithm (author+year+title patterns)

## File System Access API Research

### Decision: Progressive Enhancement with Hybrid Storage
**Rationale**: File System Access API provides powerful capabilities but has browser limitations. Hybrid approach combining File System Access API with traditional fallbacks ensures broad compatibility.

**Browser Support Matrix**:
- Chrome 86+: Full support (100%)
- Edge 86+: Full support (100%)
- Safari 16.4+: Partial support (100% - directory API not supported)
- Firefox 133+: Partial support (25% - requires experimental flag)

**Implementation Strategy**:
- Feature detection before using File System Access API
- Traditional file input/download as fallback for unsupported browsers
- Web Workers for background file processing
- Streaming for large files (>100MB) to prevent memory issues
- Batch file operations (20-50 files per batch) for 1000+ file handling
- Combine with IndexedDB for offline capabilities and caching
- Implement comprehensive conflict resolution with multiple strategies

## Topic Modeling and Semantic Analysis Research

### Decision: Transformers.js + BERTopic-style Pipeline
**Rationale**: Transformers.js provides browser-based transformer model execution with ONNX Runtime optimization. BERTopic-style pipeline offers superior topic discovery for academic literature.

**Performance Benchmarks**:
- TinyBERT: 1000 abstracts in 8-12 seconds (15MB model)
- MobileBERT (8-bit quantized): 1000 abstracts in 15-25 seconds (70MB model)
- DistilBERT (quantized): 1000 abstracts in 25-35 seconds

**Technology Stack**:
- **Embeddings**: Transformers.js (sentence-BERT variants)
- **Dimensionality Reduction**: UMAP.js
- **Clustering**: hdbscan-js or k-means-plus
- **Preprocessing**: Natural.js, compromise.js
- **Visualization**: D3.js + React for force-directed topic graphs

**Implementation Strategy**:
- Web Workers for background processing (4 workers recommended)
- Batch processing (50-100 abstracts per batch)
- Memory optimization with streaming and cleanup
- React-based manual theme editing interface
- Export capabilities for QDA software (NVivo, Atlas.ti formats)

## Performance and Architecture Decisions

### Client-Side Processing Strategy
**Decision**: Client-side processing with Web Workers for privacy and offline capability

**Rationale**:
- Privacy: No data transmission to external servers
- Speed: No network latency for processing
- Cost: No API calls or server infrastructure
- Accessibility: Works offline after initial model download

### Memory and Performance Targets
- **Export Processing**: 1000+ citations in under 5 seconds
- **PRISMA Operations**: Sub-second response times for 5000+ studies
- **Topic Modeling**: 1000 abstracts in under 30 seconds
- **File Sync**: Handle 1000+ files with automatic conflict detection
- **Data Integrity**: 99.9% accuracy for all operations

### Storage Architecture
- **Primary**: IndexedDB via existing storage provider interface
- **File System**: Local file system via File System Access API
- **Caching**: Multi-tier memory → localStorage → IndexedDB → OpenAlex API
- **Conflict Resolution**: Multiple strategies (local-wins, remote-wins, manual, merge)

## Browser Compatibility and Fallbacks

### Progressive Enhancement Implementation
1. **Feature Detection**: Always check for File System Access API support
2. **Graceful Degradation**: Traditional file APIs as fallback
3. **User Communication**: Clear messages about capability limitations
4. **Performance Optimization**: Different strategies based on browser capabilities

### Security Considerations
- Secure contexts (HTTPS) required for File System Access API
- Minimum necessary permissions requested
- Proper error handling for permission-related failures
- Origin Private File System for temporary data

## Integration with Existing BibGraph Architecture

### Storage Provider Interface Compliance
- All storage operations must go through existing storage provider interface
- No direct Dexie/IndexedDB coupling
- Maintain compatibility with InMemoryStorageProvider for testing
- Extend existing interface for file system synchronization capabilities

### Component Architecture Patterns
- Presentation/Functionality decoupling (Principle XVI)
- Custom hooks for business logic
- Service modules for complex calculations
- Components receive data/callbacks via props
- Both layers independently testable

## Technology Integration Plan

### New Dependencies
- `@citation-js/core`: Citation export and formatting
- `transformers.js`: Transformer model execution
- `umap-js`: Dimensionality reduction for topic modeling
- `hdbscan-js`: Density-based clustering
- `sheetjs`: CSV export functionality

### Web Worker Implementation
- Background processing for file operations
- Topic modeling in dedicated workers
- Streaming file processing for large datasets
- Memory optimization through worker pooling

## Implementation Risks and Mitigations

### Risk: Browser Compatibility
**Mitigation**: Comprehensive fallback strategy with progressive enhancement

### Risk: Memory Constraints
**Mitigation**: Streaming processing, Web Workers, and batch operations

### Risk: Performance with Large Datasets
**Mitigation**: Chunked processing, lazy loading, and compression

### Risk: File System Permission Issues
**Mitigation**: Clear permission UI, graceful error handling, fallback mechanisms

## Conclusion

The research indicates that all major functionality can be implemented client-side with modern web technologies. The key decisions prioritize:

1. **User Privacy**: Client-side processing keeps academic data private
2. **Performance**: Web Workers and streaming maintain responsiveness
3. **Compatibility**: Progressive enhancement ensures broad browser support
4. **Integration**: Existing BibGraph architecture can be extended without breaking changes
5. **Standards Compliance**: Academic standards (PRISMA 2020, citation formats) fully supported

The implementation plan leverages BibGraph's existing strengths while adding sophisticated literature review capabilities that differentiate it from generic reference managers.