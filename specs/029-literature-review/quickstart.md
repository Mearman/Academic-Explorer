# Quick Start Guide: Advanced Literature Review Workflows

**Feature**: 029-literature-review
**Version**: 1.0.0
**Date**: 2025-11-30

## Overview

This guide helps you get started with advanced literature review workflows in BibGraph, including systematic reviews with PRISMA compliance, semantic analysis, custom entity management, citation export, and file system synchronization.

## Prerequisites

- **Browser**: Chrome 86+, Edge 86+, Safari 16.4+, or Firefox 133+ (experimental flag)
- **Storage**: At least 500MB available for local IndexedDB storage
- **Files**: For file sync, academic files in PDF, EPUB, DOCX, or TXT formats
- **Permissions**: Grant file system access when prompted (for live sync features)

## Quick Start Workflow

### 1. Create Your First Literature Review

1. **Navigate to Catalogue** → Click "New Literature Review"
2. **Choose Review Type**:
   - **Systematic Review**: For PRISMA-compliant reviews
   - **Narrative Review**: For traditional literature reviews
   - **Scoping Review**: For mapping research areas
   - **Meta-Analysis**: For quantitative synthesis
3. **Configure PRISMA Stages** (for systematic reviews):
   - Identification (search results)
   - Screening (title/abstract review)
   - Eligibility (full-text review)
   - Inclusion (final studies)
4. **Save and Start** adding studies to your review

### 2. Add Studies to Your Review

#### From OpenAlex Database
- **Search**: Use the search bar to find works, authors, or sources
- **Add to Review**: Click "Add to Review" on any entity
- **Bulk Add**: Select multiple entities and use batch operations

#### Custom Entities (Works Not in OpenAlex)
1. **Add Custom Entity** → Choose creation method:
   - **Manual Entry**: Type bibliography details manually
   - **File Import**: Upload PDF/EPUB/DOCX files
   - **DOI Lookup**: Enter DOI to fetch metadata
2. **Auto-Extract Metadata**: PDF files are automatically analyzed
3. **Verify Information**: Review extracted metadata and save

### 3. Conduct Screening (Systematic Reviews)

#### Title/Abstract Screening
1. **Go to Screening Stage** in your literature review
2. **Review Each Study**: Use inclusion/exclusion criteria
3. **Record Decisions**:
   - Include/Exclude status
   - Screening reasons
   - Quality assessment (optional)
   - Confidence rating
4. **Track Progress**: PRISMA counts update automatically

#### Full-Text Review
1. **Advance to Eligibility Stage** after screening
2. **Detailed Evaluation**: Review full texts for final inclusion
3. **Quality Assessment**: Score methodological quality (1-10)
4. **Final Decisions**: Record inclusion in final analysis

### 4. Export Citations

#### Choose Export Format
- **BibTeX**: For LaTeX documents and BibTeX managers
- **RIS**: For EndNote, Zotero, Mendeley
- **CSV**: For Excel analysis and custom workflows

#### Export Steps
1. **Select Studies**: Choose included studies or entire review
2. **Configure Export**:
   - Include custom fields (screening status, themes, scores)
   - Generate citation keys (author+year+title patterns)
   - Add abstracts and notes
3. **Download File**: Get formatted citation file ready for use

### 5. Thematic and Semantic Analysis

#### Automatic Topic Modeling
1. **Enable Semantic Analysis** in review settings
2. **Run Topic Modeling** on included studies:
   - Processing time: ~8-12 seconds for 1000 abstracts
   - Uses advanced NLP models (client-side)
3. **Review Generated Themes**:
   - Keywords and relevance scores
   - Study assignments
   - Theme relationships

#### Manual Theme Management
1. **Edit Themes**: Rename, merge, or split themes
2. **Assign Studies**: Manually categorize studies
3. **Export Coding Matrix**: For QDA software (NVivo, Atlas.ti)

### 6. File System Synchronization (Advanced)

#### Setup Live Sync
1. **Enable File Sync** in settings
2. **Grant Permissions**: Allow folder access when prompted
3. **Configure Sync Direction**:
   - **Bidirectional**: Sync changes both ways
   - **Import Only**: Local files → BibGraph
   - **Export Only**: BibGraph → Local files

#### Sync Workflow
- **Automatic Detection**: Changes sync in real-time
- **Conflict Resolution**: Choose resolution strategy
- **File Types**: PDFs, DOCX, EPUB, TXT supported
- **Batch Processing**: Handles 1000+ files efficiently

## Advanced Features

### PRISMA Flow Diagram
- **Automatic Generation**: Creates standard PRISMA flow diagram
- **Customizable**: Add review-specific details
- **Export Options**: PNG, SVG, PDF formats
- **Print Ready**: High-resolution for publications

### Quality Assessment Tools
- **Standardized Scores**: 1-10 methodological quality rating
- **Bias Risk Assessment**: Low/medium/high categories
- **Effect Size Tracking**: For meta-analysis
- **Sample Size Recording**: For systematic reviews

### Semantic PRISMA Analysis
- **Stage-by-Stage Topics**: Track themes across PRISMA stages
- **Trend Analysis**: See how topics evolve through screening
- **Visual Mapping**: Force-directed topic relationship graphs
- **Export Results**: Semantic analysis summaries

## Performance Tips

### Large Dataset Handling
- **Batch Operations**: Process 50-100 items at a time
- **Memory Management**: Close unused browser tabs
- **Web Workers**: Background processing prevents UI freezing
- **Progress Indicators**: Monitor long-running operations

### Browser Optimization
- **Chrome/Edge**: Full feature support recommended
- **Safari**: Some limitations (no directory API)
- **Firefox**: Enable experimental flags for full support
- **Memory**: 8GB+ RAM for 5000+ study reviews

## Troubleshooting

### Common Issues

#### File System Access Not Available
- **Solution**: Use Chrome/Edge or upgrade Safari/Firefox
- **Fallback**: Manual file import/export still works

#### Memory Issues with Large Reviews
- **Solution**: Use batch processing and close other tabs
- **Monitoring**: Check browser memory usage
- **Optimization**: Export and delete completed reviews

#### Citation Key Conflicts
- **Solution**: Configure conflict resolution strategy
- **Options**: Append letters, years, or numbers
- **Manual Override**: Edit citation keys manually

#### PDF Metadata Extraction Fails
- **Solution**: Check PDF quality and text content
- **Manual Entry**: Fall back to manual data entry
- **Alternative**: Use DOI lookup when available

## Integration with External Tools

### Reference Managers
- **Zotero**: Import via RIS format
- **EndNote**: Direct RIS compatibility
- **Mendeley**: CSV or RIS import
- **BibTeX**: Direct LaTeX integration

### Qualitative Analysis Software
- **NVivo**: Export coding matrix in CSV format
- **Atlas.ti**: Import themes and study assignments
- **MAXQDA**: Compatible CSV export format

### Academic Writing
- **LaTeX**: Direct BibTeX export
- **Word**: RIS import with citation manager
- **Google Docs**: CSV import for bibliography tables

## Getting Help

### Documentation
- **Feature Spec**: `/specs/029-literature-review/spec.md`
- **Data Model**: `/specs/029-literature-review/data-model.md`
- **Implementation Plan**: `/specs/029-literature-review/plan.md`

### Support Resources
- **GitHub Issues**: Report bugs and request features
- **Browser Console**: Check for error messages
- **Performance Monitor**: Monitor memory and processing

### Best Practices
- **Start Small**: Test with 10-20 studies first
- **Regular Backups**: Export reviews periodically
- **Version Control**: Keep track of review iterations
- **Documentation**: Record screening criteria and decisions

## Keyboard Shortcuts

### General Navigation
- `Ctrl/Cmd + N`: New literature review
- `Ctrl/Cmd + E`: Export citations
- `Ctrl/Cmd + S`: Save current work
- `Ctrl/Cmd + F`: Search in review

### Screening Workflow
- `Space`: Mark as included
- `X`: Mark as excluded
- `M`: Mark as maybe
- `Enter`: Add note
- `Ctrl/Cmd + Enter`: Save and next

### File Operations
- `Ctrl/Cmd + O`: Open file import
- `Ctrl/Cmd + Shift + S`: Sync with file system
- `Ctrl/Cmd + I`: Import from file
- `Ctrl/Cmd + X`: Export to file

## System Requirements

### Minimum Requirements
- **Browser**: Chrome 86+, Safari 16.4+, Firefox 133+
- **Memory**: 4GB RAM
- **Storage**: 500MB available
- **Network**: Required for initial OpenAlex data

### Recommended Configuration
- **Browser**: Chrome 120+ or Edge 120+
- **Memory**: 8GB+ RAM
- **Storage**: 2GB+ available
- **Processor**: Modern CPU with multi-core support
- **Display**: 1920x1080 resolution or higher

### File System Requirements
- **Permissions**: File system access API support
- **Storage**: Local folder with academic files
- **Formats**: PDF, EPUB, DOCX, TXT
- **Size**: Individual files under 100MB recommended