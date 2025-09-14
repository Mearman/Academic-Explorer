/**
 * Demo component to test the decoupled graph navigation system
 * Creates sample data to verify the provider abstraction works
 */

import React, { useEffect } from 'react';
import { GraphNavigation } from '../layout/GraphNavigation';
import { useGraphStore } from '@/stores/graph-store';
import type { GraphNode, GraphEdge, EntityType } from '@/lib/graph/types';
import { RelationType } from '@/lib/graph/types';

interface GraphDemoProps {
  className?: string;
}

export const GraphDemo: React.FC<GraphDemoProps> = ({ className }) => {
  const { setGraphData } = useGraphStore();

  useEffect(() => {
    // Create sample nodes
    const sampleNodes: GraphNode[] = [
      {
        id: 'author1',
        type: 'authors' as EntityType,
        label: 'Jane Smith',
        entityId: 'A2755263674',
        position: { x: 100, y: 100 },
        externalIds: [
          {
            type: 'orcid',
            value: '0000-0003-1613-5981',
            url: 'https://orcid.org/0000-0003-1613-5981'
          }
        ],
        metadata: {
          citationCount: 1250,
        }
      },
      {
        id: 'work1',
        type: 'works' as EntityType,
        label: 'Machine Learning in Academic Research',
        entityId: 'W2755263675',
        position: { x: 300, y: 100 },
        externalIds: [
          {
            type: 'doi',
            value: '10.7717/peerj.4375',
            url: 'https://doi.org/10.7717/peerj.4375'
          }
        ],
        metadata: {
          citationCount: 42,
          year: 2023,
          openAccess: true,
        }
      },
      {
        id: 'source1',
        type: 'sources' as EntityType,
        label: 'Journal of Computer Science',
        entityId: 'S2755263676',
        position: { x: 500, y: 100 },
        externalIds: [
          {
            type: 'issn_l',
            value: '1234-5678',
            url: 'https://portal.issn.org/resource/ISSN/1234-5678'
          }
        ],
        metadata: {
          year: 2023,
        }
      },
      {
        id: 'institution1',
        type: 'institutions' as EntityType,
        label: 'University of Example',
        entityId: 'I2755263677',
        position: { x: 100, y: 300 },
        externalIds: [
          {
            type: 'ror',
            value: '01234567',
            url: 'https://ror.org/01234567'
          }
        ],
        metadata: {}
      }
    ];

    // Create sample edges
    const sampleEdges: GraphEdge[] = [
      {
        id: 'edge1',
        source: 'author1',
        target: 'work1',
        type: RelationType.AUTHORED,
        label: 'authored',
        weight: 1.0
      },
      {
        id: 'edge2',
        source: 'work1',
        target: 'source1',
        type: RelationType.PUBLISHED_IN,
        label: 'published in',
        weight: 1.0
      },
      {
        id: 'edge3',
        source: 'author1',
        target: 'institution1',
        type: RelationType.AFFILIATED,
        label: 'affiliated with',
        weight: 1.0
      }
    ];

    // Load sample data into the graph
    setGraphData(sampleNodes, sampleEdges);

    return () => {
      // Cleanup on unmount
      setGraphData([], []);
    };
  }, [setGraphData]);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '500px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      <GraphNavigation />
    </div>
  );
};