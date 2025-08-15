import { useMemo } from 'react';

import { GraphToggleButton } from '@/components/molecules/graph-toggle-button/GraphToggleButton';

interface GraphStats {
  totalVertices: number;
  totalEdges: number;
  directlyVisited: number;
  hasCurrentEntity: boolean;
}

interface EntityGraphActionsProps {
  originalActions?: React.ReactNode;
  showGraph: boolean;
  graphStats: GraphStats;
  isGraphVisible: boolean;
  onToggleGraph: () => void;
}

export function EntityGraphActions({
  originalActions,
  showGraph,
  graphStats,
  isGraphVisible,
  onToggleGraph,
}: EntityGraphActionsProps) {
  const enhancedActions = useMemo(() => {
    const actions = [originalActions];
    
    if (showGraph && graphStats.totalVertices > 0) {
      actions.push(
        <GraphToggleButton
          key="toggle-graph"
          isVisible={isGraphVisible}
          entityCount={graphStats.totalVertices}
          onToggle={onToggleGraph}
        />
      );
    }
    
    return actions.filter(Boolean);
  }, [
    originalActions,
    showGraph,
    graphStats.totalVertices,
    isGraphVisible,
    onToggleGraph,
  ]);

  if (enhancedActions.length === 0) {
    return undefined;
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {enhancedActions}
    </div>
  );
}