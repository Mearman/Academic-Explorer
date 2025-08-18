import React from 'react';

interface GraphStatsDisplayProps {
  directlyVisited: number;
  totalEdges: number;
  hasCurrentEntity: boolean;
}

export function GraphStatsDisplay({ 
  directlyVisited, 
  totalEdges, 
  hasCurrentEntity 
}: GraphStatsDisplayProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#6b7280' }}>
      <span>{directlyVisited} visited</span>
      <span>|</span>
      <span>{totalEdges} connections</span>
      {hasCurrentEntity && (
        <>
          <span>|</span>
          <span style={{ color: '#3b82f6', fontWeight: '500' }}>Current entity in graph</span>
        </>
      )}
    </div>
  );
}