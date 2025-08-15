import React, { useEffect, useMemo } from 'react';

import { GraphToggleButton } from '@/components/molecules/graph-toggle-button/GraphToggleButton';
import { GraphSection } from '@/components/organisms/graph-section/GraphSection';
import { useEntityGraphTracking } from '@/hooks/use-entity-graph-tracking';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

import type { EntityPageTemplateProps } from '../types';

import { EntityPageTemplate } from './entity-page-template';
import { useEntityTypeDetection } from './hooks/use-entity-type-detection';
import { useGraphActions } from './hooks/use-graph-actions';




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

  // Hooks for functionality
  const entityType = useEntityTypeDetection(entity);
  const { handleVertexClick } = useGraphActions();

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


  // Enhanced actions that include graph toggle
  const enhancedActions = useMemo(() => {
    const actions = [templateProps.actions];
    
    if (showGraph && graphStats.totalVertices > 0) {
      actions.push(
        <GraphToggleButton
          key="toggle-graph"
          isVisible={isGraphVisible}
          entityCount={graphStats.totalVertices}
          onToggle={toggleGraphVisibility}
        />
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
      {showGraph && (
        <GraphSection
          isVisible={isGraphVisible}
          graphHeight={graphHeight}
          graphStats={graphStats}
          totalVisits={graph.metadata.totalVisits}
          onVertexClick={handleVertexClick}
        />
      )}

      {/* Original children content */}
      {children}
    </EntityPageTemplate>
  );
}