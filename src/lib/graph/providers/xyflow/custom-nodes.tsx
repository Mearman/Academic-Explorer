/**
 * Custom node components for XYFlow provider
 * Entity-specific node rendering with academic information
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  IconCalendar,
  IconChartBar,
  IconLockOpen,
  IconFile,
  IconUser,
  IconBook,
  IconBuilding
} from '@tabler/icons-react';
import type { EntityType, ExternalIdentifier } from '../../types';

// Helper function for safe metadata access
const _renderMetadataValue = (value: unknown): React.ReactNode => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return null;
};

interface NodeData {
  label: string;
  entityId: string;
  entityType: EntityType;
  externalIds: ExternalIdentifier[];
  metadata?: {
    year?: number;
    citationCount?: number;
    openAccess?: boolean;
    [key: string]: unknown;
  };
}

interface CustomNodeProps {
  data: NodeData;
  selected?: boolean;
}

// Base node styles
const baseNodeStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '2px solid #333',
  fontSize: '11px',
  fontWeight: 'bold',
  color: 'white',
  textAlign: 'center',
  minWidth: '120px',
  maxWidth: '200px',
  position: 'relative',
  cursor: 'pointer',
  wordWrap: 'break-word',
  lineHeight: '1.2',
};

// Entity-specific colors
const getEntityColor = (entityType: EntityType): string => {
  switch (entityType) {
    case 'works':
      return '#e74c3c';
    case 'authors':
      return '#3498db';
    case 'sources':
      return '#2ecc71';
    case 'institutions':
      return '#f39c12';
    case 'topics':
      return '#9b59b6';
    case 'publishers':
      return '#1abc9c';
    case 'funders':
      return '#e67e22';
    case 'keywords':
      return '#34495e';
    case 'geo':
      return '#16a085';
    default:
      return '#95a5a6';
  }
};

// Get entity type label
const getEntityTypeLabel = (entityType: EntityType): string => {
  switch (entityType) {
    case 'works':
      return 'Work';
    case 'authors':
      return 'Author';
    case 'sources':
      return 'Source';
    case 'institutions':
      return 'Institution';
    case 'topics':
      return 'Topic';
    case 'publishers':
      return 'Publisher';
    case 'funders':
      return 'Funder';
    case 'keywords':
      return 'Keyword';
    case 'geo':
      return 'Location';
    default:
      return 'Entity';
  }
};

// Custom node component
export const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const backgroundColor = getEntityColor(data.entityType);
  const typeLabel = getEntityTypeLabel(data.entityType);

  // Get primary external ID for display
  const primaryExternalId = data.externalIds[0];

  const nodeStyle: React.CSSProperties = {
    ...baseNodeStyle,
    backgroundColor,
    borderColor: selected ? '#fff' : '#333',
    borderWidth: selected ? '3px' : '2px',
    boxShadow: selected ? '0 0 0 2px rgba(52, 152, 219, 0.5)' : 'none',
  };

  return (
    <div style={nodeStyle}>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555', width: '8px', height: '8px' }}
      />

      {/* Node content */}
      <div style={{ marginBottom: '2px' }}>
        {data.label}
      </div>

      {/* Entity type badge */}
      <div
        style={{
          fontSize: '9px',
          opacity: 0.8,
          backgroundColor: 'rgba(0,0,0,0.2)',
          padding: '1px 4px',
          borderRadius: '3px',
          marginBottom: '2px',
        }}
      >
        {typeLabel}
      </div>

      {/* External ID (if available) */}
      {primaryExternalId && (
        <div
          style={{
            fontSize: '8px',
            opacity: 0.7,
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primaryExternalId.type.toUpperCase()}: {primaryExternalId.value}
        </div>
      )}

      {/* Metadata indicators */}
      {data.metadata && (
        <div style={{ fontSize: '8px', opacity: 0.6, marginTop: '2px' }}>
          {data.metadata.year && (
            <span style={{ marginRight: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <IconCalendar size={12} /> {data.metadata.year}
            </span>
          )}
          {data.metadata.citationCount && (
            <span style={{ marginRight: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <IconChartBar size={12} /> {data.metadata.citationCount}
            </span>
          )}
          {data.metadata.openAccess && (
            <span>
              <IconLockOpen size={12} />
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Work-specific node
export const WorkNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const nodeStyle: React.CSSProperties = {
    ...baseNodeStyle,
    backgroundColor: '#e74c3c',
    borderColor: selected ? '#fff' : '#333',
    borderWidth: selected ? '3px' : '2px',
  };

  return (
    <div style={nodeStyle}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconFile size={14} /> {data.label}
      </div>

      {data.metadata?.year && (
        <div style={{ fontSize: '9px', opacity: 0.8 }}>
          {data.metadata.year}
        </div>
      )}

      {data.metadata?.citationCount && (
        <div style={{ fontSize: '8px', opacity: 0.7 }}>
          {data.metadata.citationCount} citations
        </div>
      )}
    </div>
  );
};

// Author-specific node
export const AuthorNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const nodeStyle: React.CSSProperties = {
    ...baseNodeStyle,
    backgroundColor: '#3498db',
    borderColor: selected ? '#fff' : '#333',
    borderWidth: selected ? '3px' : '2px',
  };

  const orcid = data.externalIds.find(id => id.type === 'orcid');

  return (
    <div style={nodeStyle}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconUser size={14} /> {data.label}
      </div>

      {orcid && (
        <div style={{ fontSize: '8px', opacity: 0.7, fontFamily: 'monospace' }}>
          ORCID: {orcid.value}
        </div>
      )}
    </div>
  );
};

// Source-specific node
export const SourceNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const nodeStyle: React.CSSProperties = {
    ...baseNodeStyle,
    backgroundColor: '#2ecc71',
    borderColor: selected ? '#fff' : '#333',
    borderWidth: selected ? '3px' : '2px',
  };

  const issn = data.externalIds.find(id => id.type === 'issn_l');

  return (
    <div style={nodeStyle}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconBook size={14} /> {data.label}
      </div>

      {issn && (
        <div style={{ fontSize: '8px', opacity: 0.7, fontFamily: 'monospace' }}>
          ISSN: {issn.value}
        </div>
      )}
    </div>
  );
};

// Institution-specific node
export const InstitutionNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const nodeStyle: React.CSSProperties = {
    ...baseNodeStyle,
    backgroundColor: '#f39c12',
    borderColor: selected ? '#fff' : '#333',
    borderWidth: selected ? '3px' : '2px',
  };

  const ror = data.externalIds.find(id => id.type === 'ror');

  return (
    <div style={nodeStyle}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconBuilding size={14} /> {data.label}
      </div>

      {ror && (
        <div style={{ fontSize: '8px', opacity: 0.7, fontFamily: 'monospace' }}>
          ROR: {ror.value}
        </div>
      )}
    </div>
  );
};

