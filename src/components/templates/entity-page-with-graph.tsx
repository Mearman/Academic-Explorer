import React, { useEffect, useMemo } from 'react';
import { useEntityGraphTracking } from '@/hooks/use-entity-graph-tracking';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import { EntityPageTemplate } from './entity-page-template';
import { EntityGraphVisualization, EntityGraphVisualizationSkeleton } from '../organisms/entity-graph-visualization';
import { EntitySection } from './entity-page-template';
import { Icon } from '../atoms/icon';
import { detectEntityType, EntityType as OpenAlexEntityType } from '@/lib/openalex/utils/entity-detection';
import type { EntityPageTemplateProps } from '../types';
import type { EntityType } from '@/types/entity-graph';

interface EntityPageWithGraphProps extends EntityPageTemplateProps {
  /** Whether to show the entity graph at the top */
  showGraph?: boolean;
  /** Height of the graph visualization */
  graphHeight?: number;
  /** Whether to auto-track entity visits and relationships */
  autoTrack?: boolean;
  /** Whether to extract relationships from entity data */
  extractRelationships?: boolean;
}

export function EntityPageWithGraph({
  entity,
  showGraph = true,
  graphHeight = 300,
  autoTrack = true,
  extractRelationships = true,
  children,
  ...templateProps
}: EntityPageWithGraphProps) {
  const {
    trackEntityData,
  } = useEntityGraphTracking({
    autoTrack,
    extractRelationships,
  });

  const {
    graph,
    isGraphVisible,
    toggleGraphVisibility,
    getFilteredVertices,
    getFilteredEdges,
  } = useEntityGraphStore();

  // Determine entity type and ID from the entity
  const entityType = useMemo(() => {
    if (!entity?.id) return null;
    
    try {
      return detectEntityType(entity.id) as EntityType;
    } catch {
      // Fallback: try to determine from entity structure
      if ('authorships' in entity) return OpenAlexEntityType.WORK;
      if ('affiliations' in entity && !('authorships' in entity)) return OpenAlexEntityType.AUTHOR;
      if ('is_oa' in entity && 'is_in_doaj' in entity) return OpenAlexEntityType.SOURCE;
      if ('type' in entity && 'geo' in entity) return OpenAlexEntityType.INSTITUTION;
      if ('hierarchy_level' in entity) return OpenAlexEntityType.PUBLISHER;
      if ('grants_count' in entity) return OpenAlexEntityType.FUNDER;
      if ('subfield' in entity) return OpenAlexEntityType.TOPIC;
      if ('level' in entity) return OpenAlexEntityType.CONCEPT;
      
      return OpenAlexEntityType.WORK; // Default fallback
    }
  }, [entity?.id]);

  const entityId = entity?.id;
  const entityDisplayName = entity?.display_name;

  // Track entity data when entity loads
  useEffect(() => {
    if (entity && entityType && entityId && entityDisplayName) {
      trackEntityData(entity, entityType, entityId);
    }
  }, [entity, entityType, entityId, entityDisplayName, trackEntityData]);

  // Get graph statistics
  const graphStats = useMemo(() => {
    const vertices = getFilteredVertices();
    const edges = getFilteredEdges();
    
    return {
      totalVertices: vertices.length,
      totalEdges: edges.length,
      directlyVisited: vertices.filter(v => v.directlyVisited).length,
      hasCurrentEntity: entityId ? vertices.some(v => v.id === entityId) : false,
    };
  }, [getFilteredVertices, getFilteredEdges, entityId]);

  // Handle vertex click to navigate to entity
  const handleVertexClick = (vertex: any) => {
    if (vertex.metadata?.url) {
      window.location.href = vertex.metadata.url;
    } else {
      // Construct URL from entity ID and type
      const entityType = vertex.entityType;
      const endpoint = getEntityEndpointFromType(entityType);
      window.location.href = `/${endpoint}/${encodeURIComponent(vertex.id)}`;
    }
  };

  // Helper function to get endpoint from entity type
  const getEntityEndpointFromType = (type: EntityType): string => {
    switch (type) {
      case 'work': return 'works';
      case 'author': return 'authors';
      case 'source': return 'sources';
      case 'institution': return 'institutions';
      case 'publisher': return 'publishers';
      case 'funder': return 'funders';
      case 'topic': return 'topics';
      case 'concept': return 'concepts';
      case 'keyword': return 'keywords';
      case 'continent': return 'continents';
      case 'region': return 'regions';
      default: return 'entity';
    }
  };

  // Enhanced actions that include graph toggle
  const enhancedActions = useMemo(() => {
    const actions = [templateProps.actions];
    
    if (showGraph && graphStats.totalVertices > 0) {
      actions.push(
        <button
          key="toggle-graph"
          onClick={toggleGraphVisibility}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            backgroundColor: isGraphVisible ? '#3b82f6' : 'white',
            color: isGraphVisible ? 'white' : '#374151',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
          title={isGraphVisible ? 'Hide entity graph' : 'Show entity graph'}
        >
          <Icon name={isGraphVisible ? 'eye-off' : 'eye'} size="sm" />
          {isGraphVisible ? 'Hide Graph' : 'Show Graph'}
          <span
            style={{
              fontSize: '12px',
              backgroundColor: isGraphVisible ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
              color: isGraphVisible ? 'white' : '#6b7280',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '500',
            }}
          >
            {graphStats.totalVertices}
          </span>
        </button>
      );
    }
    
    return actions.filter(Boolean);
  }, [
    templateProps.actions,
    showGraph,
    graphStats.totalVertices,
    isGraphVisible,
    toggleGraphVisibility,
  ]);

  return (
    <EntityPageTemplate
      {...templateProps}
      entity={entity}
      actions={enhancedActions.length > 0 ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {enhancedActions}
        </div>
      ) : undefined}
    >
      {/* Entity Graph Section */}
      {showGraph && isGraphVisible && graphStats.totalVertices > 0 && (
        <EntitySection
          title="Related Entities"
          icon="graph"
          actions={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#6b7280' }}>
              <span>{graphStats.directlyVisited} visited</span>
              <span>•</span>
              <span>{graphStats.totalEdges} connections</span>
              {graphStats.hasCurrentEntity && (
                <>
                  <span>•</span>
                  <span style={{ color: '#3b82f6', fontWeight: '500' }}>Current entity in graph</span>
                </>
              )}
            </div>
          }
        >
          <div style={{ marginBottom: '16px' }}>
            <EntityGraphVisualization
              height={graphHeight}
              onVertexClick={handleVertexClick}
              showControls={true}
              showLegend={true}
            />
          </div>
          
          {/* Graph description */}
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '6px',
            fontSize: '13px',
            color: '#6b7280',
            lineHeight: 1.5,
          }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Entity Graph:</strong> This visualization shows entities you've visited and their relationships. 
              Larger circles indicate entities you've visited more frequently. Lines show connections like authorship, 
              citations, affiliations, and topic relationships.
            </p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span>🔵 <strong>Bold border:</strong> Directly visited</span>
              <span>⚪ <strong>Thin border:</strong> Related entity</span>
              <span>🖱️ <strong>Click:</strong> Navigate to entity</span>
            </div>
          </div>
        </EntitySection>
      )}

      {/* Show graph loading state if we have some entities but graph is building */}
      {showGraph && isGraphVisible && graphStats.totalVertices === 0 && graph.metadata.totalVisits > 0 && (
        <EntitySection
          title="Related Entities"
          icon="graph"
          loading={true}
        >
          <EntityGraphVisualizationSkeleton height={graphHeight} />
        </EntitySection>
      )}

      {/* Empty state with helpful message */}
      {showGraph && isGraphVisible && graphStats.totalVertices === 0 && graph.metadata.totalVisits === 0 && (
        <EntitySection
          title="Related Entities"
          icon="graph"
        >
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6b7280',
            fontSize: '14px',
          }}>
            <div style={{ marginBottom: '12px', opacity: 0.5 }}>
              <Icon name="graph" size="xl" />
            </div>
            <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>Entity graph will appear here</p>
            <p style={{ margin: 0, fontSize: '13px' }}>
              Visit more entities to see relationships and build your entity graph. 
              The graph shows connections between authors, works, institutions, and topics.
            </p>
          </div>
        </EntitySection>
      )}

      {/* Original children content */}
      {children}
    </EntityPageTemplate>
  );
}