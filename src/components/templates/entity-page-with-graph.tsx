import React, { useEffect } from 'react';

import { EntityGraphActions } from '@/components/organisms/entity-graph-actions';
import { GraphSection } from '@/components/organisms/graph-section/GraphSection';
import { useEntityGraphStats } from '@/hooks/use-entity-graph-stats';
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
  const { trackEntityData } = useEntityGraphTracking({
    autoTrack,
    extractRelationships,
  });

  const { graph, isGraphVisible, toggleGraphVisibility } = useEntityGraphStore();
  const entityType = useEntityTypeDetection(entity);
  const { handleVertexClick } = useGraphActions();
  const graphStats = useEntityGraphStats(entity?.id);

  // Track entity data when entity loads
  useEffect(() => {
    if (entity && entityType && entity.id && entity.display_name) {
      trackEntityData(entity, entityType, entity.id);
    }
  }, [entity, entityType, trackEntityData]);

  const enhancedActions = (
    <EntityGraphActions
      originalActions={templateProps.actions}
      showGraph={showGraph}
      graphStats={graphStats}
      isGraphVisible={isGraphVisible}
      onToggleGraph={toggleGraphVisibility}
    />
  );

  return (
    <EntityPageTemplate
      {...templateProps}
      entity={entity}
      actions={enhancedActions}
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