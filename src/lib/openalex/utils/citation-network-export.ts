/**
 * Citation network export utilities
 * Supports JSON, CSV, GraphML, BibTeX, RIS, and visual export formats
 */

import type { CitationNetwork, CitationNode, CitationEdge, CoauthorNetwork, CoauthorNode, CoauthorEdge } from './citation-network';
import { reconstructAbstract } from './transformers';

// Export format types
export type ExportFormat = 'json' | 'csv' | 'graphml' | 'bibtex' | 'ris' | 'svg' | 'png';

// Export options interface
export interface ExportOptions {
  /** Include detailed metadata in export */
  includeMetadata?: boolean;
  /** Include abstracts (where applicable) */
  includeAbstracts?: boolean;
  /** Maximum number of nodes to export (0 = unlimited) */
  maxNodes?: number;
  /** Export format */
  format: ExportFormat;
  /** Compress output (for supported formats) */
  compress?: boolean;
  /** Custom filename prefix */
  filenamePrefix?: string;
  /** Include edge weights */
  includeWeights?: boolean;
  /** Include edges in export (for formats that support it) */
  includeEdges?: boolean;
  /** Custom date for filename generation */
  customDate?: Date;
}

// Network export result
export interface NetworkExportResult {
  /** Whether export was successful */
  success: boolean;
  /** Export format used */
  format: ExportFormat;
  /** Generated filename */
  filename: string;
  /** Exported data (string or blob) */
  data?: string | Blob;
  /** File size in bytes */
  size?: number;
  /** Error message if unsuccessful */
  error?: string;
  /** Export metadata */
  metadata?: {
    nodeCount: number;
    edgeCount: number;
    exportedAt: string;
    truncated?: boolean;
    originalNodeCount?: number;
  };
}

// Network validation result
export interface NetworkValidationResult {
  /** Whether network is valid */
  isValid: boolean;
  /** Array of validation error messages */
  errors: string[];
  /** Warnings (non-blocking issues) */
  warnings: string[];
}

/**
 * Validate citation network structure and data integrity
 */
export function validateCitationNetwork(
  network: CitationNetwork | CoauthorNetwork
): NetworkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for empty or null network
  if (!network || !network.nodes || !network.edges) {
    errors.push('Network is null, undefined, or missing required properties');
    return { isValid: false, errors, warnings };
  }
  
  const nodeIds = new Set<string>();
  
  // Validate nodes
  for (const node of network.nodes) {
    // Check for valid ID
    if (!node.id || typeof node.id !== 'string' || node.id.trim() === '') {
      errors.push('Node has empty or invalid ID');
      continue;
    }
    
    // Check for duplicate IDs
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
    
    // Validate node specific fields based on type
    if ('worksCount' in node) {
      // This is a coauthor node
      const coauthorNode = node as CoauthorNode;
      if (coauthorNode.worksCount < 0) {
        errors.push(`Node ${node.id} has invalid works_count: ${coauthorNode.worksCount}`);
      }
      if (coauthorNode.citedByCount < 0) {
        errors.push(`Node ${node.id} has invalid cited_by_count: ${coauthorNode.citedByCount}`);
      }
    } else if ('citedByCount' in node && 'depth' in node) {
      // This is a citation node
      const citationNode = node as CitationNode;
      if (citationNode.citedByCount < 0) {
        errors.push(`Node ${node.id} has invalid cited_by_count: ${citationNode.citedByCount}`);
      }
      if (citationNode.depth < 0) {
        errors.push(`Node ${node.id} has invalid depth: ${citationNode.depth}`);
      }
    }
  }
  
  // Validate edges
  for (const edge of network.edges) {
    // Check for valid source and target
    if (!edge.source || !edge.target) {
      errors.push('Edge has missing source or target');
      continue;
    }
    
    // Check that referenced nodes exist
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references non-existent source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references non-existent target node: ${edge.target}`);
    }
    
    // Validate edge type (only for citation edges that have a type field)
    if ('type' in edge && (!edge.type || typeof edge.type !== 'string')) {
      errors.push(`Edge ${edge.source} -> ${edge.target} has invalid type`);
    }
    
    // Validate coauthor edge specific fields
    if ('weight' in edge) {
      const coauthorEdge = edge as CoauthorEdge;
      if (coauthorEdge.weight < 0) {
        errors.push(`Edge ${edge.source} -> ${edge.target} has invalid weight: ${coauthorEdge.weight}`);
      }
    }
  }
  
  // Generate warnings
  if (network.nodes.length === 0) {
    warnings.push('Network has no nodes');
  }
  if (network.edges.length === 0) {
    warnings.push('Network has no edges');
  }
  if (network.nodes.length > 10000) {
    warnings.push('Network has very large number of nodes (>10,000), export may be slow');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate export filename with timestamp
 */
export function getExportFilename(
  format: ExportFormat,
  prefix = 'citation-network',
  customDate?: Date
): string {
  // Sanitise prefix to remove invalid filename characters
  const sanitisedPrefix = prefix
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const date = customDate || new Date();
  // Add milliseconds to ensure uniqueness for concurrent exports
  const timestamp = date.toISOString()
    .slice(0, 23) // Include milliseconds
    .replace(/[-:T]/g, '')
    .replace(/\.(\d{3})Z?$/, '$1')
    .replace(/(\d{8})(\d{6})(\d{3})/, '$1-$2-$3');
  
  return `${sanitisedPrefix}-${timestamp}.${format}`;
}

/**
 * Truncate network to maximum number of nodes (keeping highest cited nodes)
 */
function truncateNetwork<T extends CitationNetwork | CoauthorNetwork>(
  network: T,
  maxNodes: number
): { network: T; truncated: boolean; originalCount: number } {
  if (maxNodes <= 0 || network.nodes.length <= maxNodes) {
    return { network, truncated: false, originalCount: network.nodes.length };
  }
  
  const originalCount = network.nodes.length;
  
  // Sort nodes by citation count (descending) to keep most important ones
  const sortedNodes = [...network.nodes].sort((a, b) => {
    const aCitations = 'citedByCount' in a ? a.citedByCount : 0;
    const bCitations = 'citedByCount' in b ? b.citedByCount : 0;
    return bCitations - aCitations;
  });
  
  const truncatedNodes = sortedNodes.slice(0, maxNodes);
  const nodeIds = new Set(truncatedNodes.map(n => n.id));
  
  // Filter edges to only include those between retained nodes
  const truncatedEdges = network.edges.filter(
    edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );
  
  return {
    network: { ...network, nodes: truncatedNodes, edges: truncatedEdges } as T,
    truncated: true,
    originalCount,
  };
}

/**
 * Convert citation node to simplified JSON representation
 */
function citationNodeToJSON(node: CitationNode) {
  return {
    id: node.id,
    title: node.title,
    year: node.year || null,
    citedByCount: node.citedByCount,
    depth: node.depth,
    type: 'work' as const,
    doi: node.work?.doi || null,
    authors: node.work?.authorships?.map(a => a.author.display_name).filter(Boolean) || [],
    journal: node.work?.primary_location?.source?.display_name || null,
    openAccess: node.work?.open_access?.is_oa || false,
  };
}

/**
 * Convert coauthor node to simplified JSON representation
 */
function coauthorNodeToJSON(node: CoauthorNode) {
  return {
    id: node.id,
    name: node.name,
    type: 'author' as const,
    worksCount: node.worksCount,
    citedByCount: node.citedByCount,
    orcid: node.author?.orcid || null,
    hIndex: node.author?.summary_stats?.h_index || null,
    institutions: node.author?.last_known_institutions?.map(i => i.display_name).filter(Boolean) || [],
  };
}

/**
 * Convert citation edge to simplified JSON representation
 */
function citationEdgeToJSON(edge: CitationEdge) {
  return {
    source: edge.source,
    target: edge.target,
    type: edge.type,
    weight: 1,
  };
}

/**
 * Convert coauthor edge to simplified JSON representation
 */
function coauthorEdgeToJSON(edge: CoauthorEdge) {
  return {
    source: edge.source,
    target: edge.target,
    type: 'collaboration' as const,
    weight: edge.weight,
    sharedWorks: edge.works || [],
  };
}

/**
 * Determine if network is a coauthor network
 */
function isCoauthorNetwork(network: CitationNetwork | CoauthorNetwork): network is CoauthorNetwork {
  return network.nodes.length > 0 && 'name' in network.nodes[0];
}

/**
 * Export citation network to JSON format
 */
export function exportCitationNetworkToJSON(
  network: CitationNetwork | CoauthorNetwork,
  options: Partial<ExportOptions> = {}
): NetworkExportResult {
  const opts: ExportOptions = {
    includeMetadata: true,
    includeAbstracts: false,
    maxNodes: 0,
    format: 'json',
    compress: false,
    ...options,
  };
  
  try {
    // Validate network first
    const validation = validateCitationNetwork(network);
    if (!validation.isValid) {
      return {
        success: false,
        format: 'json',
        filename: '',
        error: `Network validation failed: ${validation.errors.join(', ')}`,
      };
    }
    
    // Truncate if necessary
    const { network: processedNetwork, truncated, originalCount } = truncateNetwork(network, opts.maxNodes || 0);
    
    // Determine network type
    const isCoauthor = isCoauthorNetwork(processedNetwork);
    
    // Convert nodes and edges to JSON format
    const jsonNodes = processedNetwork.nodes.map(node => 
      isCoauthor 
        ? coauthorNodeToJSON(node as CoauthorNode)
        : citationNodeToJSON(node as CitationNode)
    );
    
    const jsonEdges = processedNetwork.edges.map(edge =>
      isCoauthor
        ? coauthorEdgeToJSON(edge as CoauthorEdge)
        : citationEdgeToJSON(edge as CitationEdge)
    );
    
    // Build export data
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        type: isCoauthor ? 'coauthor-network' : 'citation-network',
        nodeCount: jsonNodes.length,
        edgeCount: jsonEdges.length,
        ...(truncated && { 
          truncated: true,
          originalNodeCount: originalCount,
        }),
        // Only include export options if explicitly requested or if non-default options were provided
        ...(options.includeMetadata !== undefined && opts.includeMetadata && { exportOptions: opts }),
      },
      network: {
        nodes: jsonNodes,
        edges: jsonEdges,
      },
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const filename = getExportFilename('json', opts.filenamePrefix, opts.customDate);
    
    return {
      success: true,
      format: 'json',
      filename,
      data: jsonString,
      size: new Blob([jsonString]).size,
      metadata: {
        nodeCount: jsonNodes.length,
        edgeCount: jsonEdges.length,
        exportedAt: exportData.metadata.exportedAt,
        ...(truncated && { 
          truncated: true,
          originalNodeCount: originalCount,
        }),
      },
    };
    
  } catch (error) {
    return {
      success: false,
      format: 'json',
      filename: '',
      error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Placeholder functions for other export formats
// These will be implemented in subsequent iterations

export function exportCitationNetworkToCSV(
  network: CitationNetwork | CoauthorNetwork,
  options: Partial<ExportOptions> = {}
): NetworkExportResult {
  const opts: ExportOptions = {
    includeMetadata: false,
    includeAbstracts: false,
    includeEdges: false,
    maxNodes: 0,
    format: 'csv',
    compress: false,
    ...options,
  };
  
  try {
    // Validate network first
    const validation = validateCitationNetwork(network);
    if (!validation.isValid) {
      return {
        success: false,
        format: 'csv',
        filename: '',
        error: `Network validation failed: ${validation.errors.join(', ')}`,
      };
    }
    
    // Truncate if necessary
    const { network: processedNetwork, truncated, originalCount } = truncateNetwork(network, opts.maxNodes || 0);
    
    // Determine network type
    const isCoauthor = isCoauthorNetwork(processedNetwork);
    
    // Generate CSV content
    let csvContent = '';
    
    // Export nodes
    if (opts.includeEdges) {
      csvContent += '# Nodes\n';
    }
    
    if (isCoauthor) {
      csvContent += exportCoauthorNodesToCSV(processedNetwork.nodes as CoauthorNode[]);
    } else {
      csvContent += exportCitationNodesToCSV(processedNetwork.nodes as CitationNode[]);
    }
    
    // Export edges if requested
    if (opts.includeEdges && processedNetwork.edges.length > 0) {
      csvContent += '\n\n# Edges\n';
      if (isCoauthor) {
        csvContent += exportCoauthorEdgesToCSV(processedNetwork.edges as CoauthorEdge[]);
      } else {
        csvContent += exportCitationEdgesToCSV(processedNetwork.edges as CitationEdge[]);
      }
    }
    
    const filename = getExportFilename('csv', opts.filenamePrefix, opts.customDate);
    
    return {
      success: true,
      format: 'csv',
      filename,
      data: csvContent,
      size: new Blob([csvContent]).size,
      metadata: {
        nodeCount: processedNetwork.nodes.length,
        edgeCount: processedNetwork.edges.length,
        exportedAt: new Date().toISOString(),
        ...(truncated && { 
          truncated: true,
          originalNodeCount: originalCount,
        }),
      },
    };
    
  } catch (error) {
    return {
      success: false,
      format: 'csv',
      filename: '',
      error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Export citation nodes to CSV format
 */
function exportCitationNodesToCSV(nodes: CitationNode[]): string {
  const headers = ['id', 'title', 'year', 'citedByCount', 'depth', 'type', 'doi', 'authors', 'journal', 'openAccess'];
  const csvRows: string[] = [headers.join(',')];
  
  for (const node of nodes) {
    const authors = node.work?.authorships?.map(a => a.author.display_name).filter(Boolean).join('; ') || '';
    const journal = node.work?.primary_location?.source?.display_name || '';
    const openAccess = node.work?.open_access?.is_oa || false;
    
    const row = [
      node.id,
      escapeCSVField(node.title),
      node.year?.toString() || '',
      node.citedByCount.toString(),
      node.depth.toString(),
      'work',
      escapeCSVField(node.work?.doi || ''),
      escapeCSVField(authors),
      escapeCSVField(journal),
      openAccess.toString(),
    ];
    
    csvRows.push(row.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Export coauthor nodes to CSV format
 */
function exportCoauthorNodesToCSV(nodes: CoauthorNode[]): string {
  const headers = ['id', 'name', 'type', 'worksCount', 'citedByCount', 'orcid', 'hIndex', 'institutions'];
  const csvRows: string[] = [headers.join(',')];
  
  for (const node of nodes) {
    const institutions = node.author?.last_known_institutions?.map(i => i.display_name).filter(Boolean).join('; ') || '';
    const hIndex = node.author?.summary_stats?.h_index?.toString() || '';
    
    const row = [
      node.id,
      escapeCSVField(node.name),
      'author',
      node.worksCount.toString(),
      node.citedByCount.toString(),
      node.author?.orcid || '',
      hIndex,
      escapeCSVField(institutions),
    ];
    
    csvRows.push(row.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Export citation edges to CSV format
 */
function exportCitationEdgesToCSV(edges: CitationEdge[]): string {
  const headers = ['source', 'target', 'type', 'weight'];
  const csvRows: string[] = [headers.join(',')];
  
  for (const edge of edges) {
    const row = [
      edge.source,
      edge.target,
      edge.type,
      '1', // Citation edges have implicit weight of 1
    ];
    
    csvRows.push(row.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Export coauthor edges to CSV format
 */
function exportCoauthorEdgesToCSV(edges: CoauthorEdge[]): string {
  const headers = ['source', 'target', 'type', 'weight', 'sharedWorks'];
  const csvRows: string[] = [headers.join(',')];
  
  for (const edge of edges) {
    const sharedWorks = edge.works.join('; ');
    
    const row = [
      edge.source,
      edge.target,
      'collaboration',
      edge.weight.toString(),
      escapeCSVField(sharedWorks),
    ];
    
    csvRows.push(row.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: string): string {
  if (!value) return '';
  
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

export function exportCitationNetworkToGraphML(
  network: CitationNetwork | CoauthorNetwork,
  options: Partial<ExportOptions> = {}
): NetworkExportResult {
  const opts: ExportOptions = {
    includeMetadata: true,
    includeAbstracts: false,
    maxNodes: 0,
    format: 'graphml',
    compress: false,
    ...options,
  };

  try {
    // Validate network first
    const validation = validateCitationNetwork(network);
    if (!validation.isValid) {
      return {
        success: false,
        format: 'graphml',
        filename: '',
        error: `Network validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Truncate if necessary
    const { network: processedNetwork, truncated, originalCount } = truncateNetwork(network, opts.maxNodes || 0);

    // Determine network type
    const isCoauthor = isCoauthorNetwork(processedNetwork);

    // Start building GraphML content
    let graphmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    graphmlContent += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"\n';
    graphmlContent += '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
    graphmlContent += '         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns\n';
    graphmlContent += '         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n';

    // Define keys (attributes)
    if (isCoauthor) {
      graphmlContent += '  <key id="name" for="node" attr.name="name" attr.type="string"/>\n';
      graphmlContent += '  <key id="worksCount" for="node" attr.name="worksCount" attr.type="int"/>\n';
      graphmlContent += '  <key id="citedByCount" for="node" attr.name="citedByCount" attr.type="int"/>\n';
      graphmlContent += '  <key id="orcid" for="node" attr.name="orcid" attr.type="string"/>\n';
      graphmlContent += '  <key id="hIndex" for="node" attr.name="hIndex" attr.type="int"/>\n';
      graphmlContent += '  <key id="institutions" for="node" attr.name="institutions" attr.type="string"/>\n';
      graphmlContent += '  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>\n';
      graphmlContent += '  <key id="sharedWorks" for="edge" attr.name="sharedWorks" attr.type="string"/>\n';
    } else {
      graphmlContent += '  <key id="title" for="node" attr.name="title" attr.type="string"/>\n';
      graphmlContent += '  <key id="year" for="node" attr.name="year" attr.type="int"/>\n';
      graphmlContent += '  <key id="citedByCount" for="node" attr.name="citedByCount" attr.type="int"/>\n';
      graphmlContent += '  <key id="depth" for="node" attr.name="depth" attr.type="int"/>\n';
      graphmlContent += '  <key id="doi" for="node" attr.name="doi" attr.type="string"/>\n';
      graphmlContent += '  <key id="authors" for="node" attr.name="authors" attr.type="string"/>\n';
      graphmlContent += '  <key id="journal" for="node" attr.name="journal" attr.type="string"/>\n';
      graphmlContent += '  <key id="openAccess" for="node" attr.name="openAccess" attr.type="boolean"/>\n';
      graphmlContent += '  <key id="type" for="edge" attr.name="type" attr.type="string"/>\n';
    }

    // Start graph
    const graphId = isCoauthor ? 'CoauthorNetwork' : 'CitationNetwork';
    graphmlContent += `  <graph id="${graphId}" edgedefault="directed">\n`;

    // Add nodes
    for (const node of processedNetwork.nodes) {
      graphmlContent += `    <node id="${escapeXmlAttribute(node.id)}">\n`;

      if (isCoauthor) {
        const coauthorNode = node as CoauthorNode;
        graphmlContent += `      <data key="name">${escapeXmlContent(coauthorNode.name)}</data>\n`;
        graphmlContent += `      <data key="worksCount">${coauthorNode.worksCount}</data>\n`;
        graphmlContent += `      <data key="citedByCount">${coauthorNode.citedByCount}</data>\n`;
        if (coauthorNode.author?.orcid) {
          graphmlContent += `      <data key="orcid">${escapeXmlContent(coauthorNode.author.orcid)}</data>\n`;
        }
        if (coauthorNode.author?.summary_stats?.h_index) {
          graphmlContent += `      <data key="hIndex">${coauthorNode.author.summary_stats.h_index}</data>\n`;
        }
        const institutions = coauthorNode.author?.last_known_institutions?.map(i => i.display_name).join('; ') || '';
        if (institutions) {
          graphmlContent += `      <data key="institutions">${escapeXmlContent(institutions)}</data>\n`;
        }
      } else {
        const citationNode = node as CitationNode;
        graphmlContent += `      <data key="title">${escapeXmlContent(citationNode.title)}</data>\n`;
        if (citationNode.year) {
          graphmlContent += `      <data key="year">${citationNode.year}</data>\n`;
        }
        graphmlContent += `      <data key="citedByCount">${citationNode.citedByCount}</data>\n`;
        graphmlContent += `      <data key="depth">${citationNode.depth}</data>\n`;
        if (citationNode.work?.doi) {
          graphmlContent += `      <data key="doi">${escapeXmlContent(citationNode.work.doi)}</data>\n`;
        }
        const authors = citationNode.work?.authorships?.map(a => a.author.display_name).join('; ') || '';
        if (authors) {
          graphmlContent += `      <data key="authors">${escapeXmlContent(authors)}</data>\n`;
        }
        const journal = citationNode.work?.primary_location?.source?.display_name || '';
        if (journal) {
          graphmlContent += `      <data key="journal">${escapeXmlContent(journal)}</data>\n`;
        }
        const isOA = citationNode.work?.open_access?.is_oa || false;
        graphmlContent += `      <data key="openAccess">${isOA}</data>\n`;
      }

      graphmlContent += '    </node>\n';
    }

    // Add edges
    for (const edge of processedNetwork.edges) {
      graphmlContent += `    <edge source="${escapeXmlAttribute(edge.source)}" target="${escapeXmlAttribute(edge.target)}">\n`;

      if (isCoauthor) {
        const coauthorEdge = edge as CoauthorEdge;
        graphmlContent += `      <data key="weight">${coauthorEdge.weight}</data>\n`;
        const sharedWorks = coauthorEdge.works.join('; ');
        graphmlContent += `      <data key="sharedWorks">${escapeXmlContent(sharedWorks)}</data>\n`;
      } else {
        const citationEdge = edge as CitationEdge;
        graphmlContent += `      <data key="type">${escapeXmlContent(citationEdge.type)}</data>\n`;
      }

      graphmlContent += '    </edge>\n';
    }

    // Close graph and graphml
    graphmlContent += '  </graph>\n';
    graphmlContent += '</graphml>\n';

    const filename = getExportFilename('graphml', opts.filenamePrefix, opts.customDate);

    return {
      success: true,
      format: 'graphml',
      filename,
      data: graphmlContent,
      size: new Blob([graphmlContent]).size,
      metadata: {
        nodeCount: processedNetwork.nodes.length,
        edgeCount: processedNetwork.edges.length,
        exportedAt: new Date().toISOString(),
        ...(truncated && {
          truncated: true,
          originalNodeCount: originalCount,
        }),
      },
    };

  } catch (error) {
    return {
      success: false,
      format: 'graphml',
      filename: '',
      error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export function exportCitationNetworkToBibTeX(
  network: CitationNetwork | CoauthorNetwork,
  options: Partial<ExportOptions> = {}
): NetworkExportResult {
  const opts: ExportOptions = {
    includeMetadata: true,
    includeAbstracts: false,
    maxNodes: 0,
    format: 'bibtex',
    compress: false,
    ...options,
  };

  try {
    // Validate network first
    const validation = validateCitationNetwork(network);
    if (!validation.isValid) {
      return {
        success: false,
        format: 'bibtex',
        filename: '',
        error: `Network validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Truncate if necessary
    const { network: processedNetwork, truncated, originalCount } = truncateNetwork(network, opts.maxNodes || 0);

    // BibTeX is only applicable to citation networks (works), not coauthor networks
    const isCoauthor = isCoauthorNetwork(processedNetwork);
    if (isCoauthor) {
      return {
        success: true,
        format: 'bibtex',
        filename: getExportFilename('bibtex', opts.filenamePrefix, opts.customDate),
        data: '% Coauthor networks do not contain bibliographic entries\n% Export as JSON or GraphML for coauthor network data\n',
        size: 0,
        metadata: {
          nodeCount: 0,
          edgeCount: 0,
          exportedAt: new Date().toISOString(),
        },
      };
    }

    const citationNodes = processedNetwork.nodes as CitationNode[];
    let bibtexContent = '% BibTeX export of citation network\n';
    bibtexContent += `% Generated on ${new Date().toISOString()}\n`;
    bibtexContent += `% Contains ${citationNodes.length} entries\n\n`;

    let exportedCount = 0;

    for (const node of citationNodes) {
      if (!node.work) continue; // Skip nodes without work data

      const {work} = node;
      const year = work.publication_year || node.year;
      const authors = work.authorships?.map(a => a.author.display_name).filter(Boolean) || [];
      
      // Generate BibTeX key (FirstAuthorSurname + Year + FirstWordOfTitle)
      const firstAuthor = authors[0] || 'Unknown';
      const surname = firstAuthor.split(' ').pop() || 'Unknown';
      const firstWord = (work.title || 'Untitled').replace(/[^\w\s]/g, '').split(' ')[0] || 'Work';
      const bibtexKey = `${surname}${year}${firstWord}`.replace(/[^\w]/g, '');

      // Determine entry type
      const entryType = work.type === 'book' ? 'book' : 
                       work.type === 'book-chapter' ? 'inbook' :
                       work.type === 'proceedings-article' ? 'inproceedings' :
                       'article';

      bibtexContent += `@${entryType}{${bibtexKey},\n`;
      bibtexContent += `  title={${escapeBibTeXValue(work.title || 'Untitled')}},\n`;

      // Authors
      if (authors.length > 0) {
        const authorString = authors.map(name => formatBibTeXAuthor(name)).join(' and ');
        bibtexContent += `  author={${authorString}},\n`;
      }

      // Year
      if (year) {
        bibtexContent += `  year={${year}},\n`;
      }

      // DOI
      if (work.doi) {
        bibtexContent += `  doi={${escapeBibTeXValue(work.doi)}},\n`;
      }

      // Journal/Source information
      if (work.primary_location?.source) {
        const {source} = work.primary_location;
        if (entryType === 'article') {
          bibtexContent += `  journal={${escapeBibTeXValue(source.display_name)}},\n`;
        } else if (entryType === 'inproceedings') {
          bibtexContent += `  booktitle={${escapeBibTeXValue(source.display_name)}},\n`;
        }

        // ISSN
        if (source.issn_l) {
          bibtexContent += `  issn={${source.issn_l}},\n`;
        }
      }

      // URL
      if (work.primary_location?.landing_page_url) {
        bibtexContent += `  url={${work.primary_location.landing_page_url}},\n`;
      }

      // Publication date
      if (work.publication_date) {
        bibtexContent += `  date={${work.publication_date}},\n`;
      }

      // Open access information
      if (work.open_access?.is_oa) {
        bibtexContent += `  note={Open Access},\n`;
      }

      // Citation count as note
      if (opts.includeMetadata && node.citedByCount > 0) {
        bibtexContent += `  note={Cited by ${node.citedByCount} works},\n`;
      }

      // Remove trailing comma and close entry
      bibtexContent = bibtexContent.replace(/,\n$/, '\n');
      bibtexContent += '}\n\n';
      
      exportedCount++;
    }

    const filename = getExportFilename('bibtex', opts.filenamePrefix, opts.customDate);

    return {
      success: true,
      format: 'bibtex',
      filename,
      data: bibtexContent,
      size: new Blob([bibtexContent]).size,
      metadata: {
        nodeCount: exportedCount,
        edgeCount: 0, // BibTeX doesn't represent edges
        exportedAt: new Date().toISOString(),
        ...(truncated && {
          truncated: true,
          originalNodeCount: originalCount,
        }),
      },
    };

  } catch (error) {
    return {
      success: false,
      format: 'bibtex',
      filename: '',
      error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export function exportCitationNetworkToRIS(
  network: CitationNetwork | CoauthorNetwork,
  options: Partial<ExportOptions> = {}
): NetworkExportResult {
  const opts: ExportOptions = {
    includeMetadata: true,
    includeAbstracts: false,
    maxNodes: 0,
    format: 'ris',
    compress: false,
    ...options,
  };

  try {
    // Validate network first
    const validation = validateCitationNetwork(network);
    if (!validation.isValid) {
      return {
        success: false,
        format: 'ris',
        filename: '',
        error: `Network validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Truncate if necessary
    const { network: processedNetwork, truncated, originalCount } = truncateNetwork(network, opts.maxNodes || 0);

    // RIS is only applicable to citation networks (works), not coauthor networks
    const isCoauthor = isCoauthorNetwork(processedNetwork);
    if (isCoauthor) {
      return {
        success: true,
        format: 'ris',
        filename: getExportFilename('ris', opts.filenamePrefix, opts.customDate),
        data: 'TY  - GEN\nTI  - Coauthor networks do not contain bibliographic entries\nN1  - Export as JSON or GraphML for coauthor network data\nER  -\n\n',
        size: 0,
        metadata: {
          nodeCount: 0,
          edgeCount: 0,
          exportedAt: new Date().toISOString(),
        },
      };
    }

    const citationNodes = processedNetwork.nodes as CitationNode[];
    let risContent = '';

    let exportedCount = 0;

    for (const node of citationNodes) {
      if (!node.work) continue; // Skip nodes without work data

      const {work} = node;
      const year = work.publication_year || node.year;
      const authors = work.authorships?.map(a => a.author.display_name).filter(Boolean) || [];

      // Determine RIS type
      let risType = 'JOUR'; // Journal article (default)
      switch (work.type) {
        case 'book':
          risType = 'BOOK';
          break;
        case 'book-chapter':
          risType = 'CHAP';
          break;
        case 'proceedings-article':
          risType = 'CONF';
          break;
        case 'dissertation':
          risType = 'THES';
          break;
        case 'report':
          risType = 'RPRT';
          break;
        default:
          risType = 'JOUR';
      }

      // Start RIS entry
      risContent += `TY  - ${risType}\n`;

      // Title
      risContent += `TI  - ${work.title}\n`;

      // Authors (Last, First format)
      for (const author of authors) {
        const formattedAuthor = formatRISAuthor(author);
        risContent += `AU  - ${formattedAuthor}\n`;
      }

      // Year
      if (year) {
        risContent += `PY  - ${year}\n`;
      }

      // Publication date
      if (work.publication_date) {
        const date = work.publication_date.replace(/-/g, '/');
        risContent += `DA  - ${date}\n`;
      }

      // Journal/Source
      if (work.primary_location?.source) {
        const {source} = work.primary_location;
        if (risType === 'JOUR') {
          risContent += `JO  - ${source.display_name}\n`;
          risContent += `JF  - ${source.display_name}\n`;
        } else if (risType === 'CONF') {
          risContent += `BT  - ${source.display_name}\n`;
        } else if (risType === 'CHAP') {
          risContent += `BT  - ${source.display_name}\n`;
        }

        // ISSN
        if (source.issn_l) {
          risContent += `SN  - ${source.issn_l}\n`;
        }
      }

      // DOI
      if (work.doi) {
        risContent += `DO  - ${work.doi}\n`;
      }

      // URL
      if (work.primary_location?.landing_page_url) {
        risContent += `UR  - ${work.primary_location.landing_page_url}\n`;
      }

      // Abstract (if available and requested)
      const abstract = reconstructAbstract(work.abstract_inverted_index);
      if (opts.includeAbstracts && abstract) {
        // Split long abstracts into multiple lines for RIS format
        const abstractLines = abstract.match(/.{1,255}/g) || [abstract];
        for (const line of abstractLines) {
          risContent += `AB  - ${line}\n`;
        }
      }

      // Keywords/Concepts
      if (work.concepts && work.concepts.length > 0) {
        const keywords = work.concepts
          .filter(c => c.score > 0.3) // Only include concepts with decent confidence
          .map(c => c.display_name)
          .slice(0, 10) // Limit to top 10 concepts
          .join('; ');
        
        if (keywords) {
          risContent += `KW  - ${keywords}\n`;
        }
      }

      // Notes
      const notes: string[] = [];
      
      if (work.open_access?.is_oa) {
        notes.push('Open Access');
      }
      
      if (opts.includeMetadata && node.citedByCount > 0) {
        notes.push(`Cited by ${node.citedByCount} works`);
      }
      
      if (opts.includeMetadata && node.depth > 0) {
        notes.push(`Citation depth: ${node.depth}`);
      }

      for (const note of notes) {
        risContent += `N1  - ${note}\n`;
      }

      // Language (if available)
      if (work.language) {
        risContent += `LA  - ${work.language}\n`;
      }

      // End of record
      risContent += 'ER  -\n\n';
      
      exportedCount++;
    }

    const filename = getExportFilename('ris', opts.filenamePrefix, opts.customDate);

    return {
      success: true,
      format: 'ris',
      filename,
      data: risContent,
      size: new Blob([risContent]).size,
      metadata: {
        nodeCount: exportedCount,
        edgeCount: 0, // RIS doesn't represent edges
        exportedAt: new Date().toISOString(),
        ...(truncated && {
          truncated: true,
          originalNodeCount: originalCount,
        }),
      },
    };

  } catch (error) {
    return {
      success: false,
      format: 'ris',
      filename: '',
      error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export function exportCitationNetworkToSVG(
  _network: CitationNetwork | CoauthorNetwork,
  _svgElement: SVGElement,
  _options: Partial<ExportOptions> = {}
): NetworkExportResult {
  // TODO: Implement SVG export
  return {
    success: false,
    format: 'svg',
    filename: '',
    error: 'SVG export not yet implemented',
  };
}

export function exportCitationNetworkToPNG(
  _network: CitationNetwork | CoauthorNetwork,
  _svgElement: SVGElement,
  _options: Partial<ExportOptions> = {}
): NetworkExportResult {
  // TODO: Implement PNG export
  return {
    success: false,
    format: 'png',
    filename: '',
    error: 'PNG export not yet implemented',
  };
}

// Helper functions for XML/HTML escaping and formatting

/**
 * Escape special characters for XML attributes
 */
function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape special characters for XML content
 */
function escapeXmlContent(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape special characters for BibTeX values
 */
function escapeBibTeXValue(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/%/g, '\\%')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/á/g, '\\\'{a}')
    .replace(/é/g, '\\\'{e}')
    .replace(/í/g, '\\\'{i}')
    .replace(/ó/g, '\\\'{o}')
    .replace(/ú/g, '\\\'{u}')
    .replace(/ñ/g, '\\~{n}')
    .replace(/ç/g, '\\c{c}');
}

/**
 * Format author name for BibTeX (handle special characters)
 */
function formatBibTeXAuthor(name: string): string {
  return escapeBibTeXValue(name);
}

/**
 * Format author name for RIS (Last, First format)
 */
function formatRISAuthor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) {
    return name; // Return as-is if only one name part
  }
  
  const lastName = parts.pop()!;
  const firstNames = parts.join(' ');
  return `${lastName}, ${firstNames}`;
}