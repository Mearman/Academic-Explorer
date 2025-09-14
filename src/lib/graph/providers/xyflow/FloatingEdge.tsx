/**
 * FloatingEdge Component for XYFlow React Flow
 *
 * A custom edge that automatically calculates connection points
 * based on the shortest distance between nodes.
 */

import React from 'react';
import {
  EdgeProps,
  getStraightPath,
  useReactFlow,
  useStore,
  Edge as XYEdge,
  Node as XYNode,
} from '@xyflow/react';

import { getFloatingEdgePositions } from './floating-edge-utils';

function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  data,
  ...edgeProps
}: EdgeProps) {
  const { getNode } = useReactFlow();
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Calculate floating edge positions
  const { sourceX, sourceY, targetX, targetY } = getFloatingEdgePositions(
    sourceNode,
    targetNode
  );

  // Generate the path using React Flow's utility
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      {/* SVG marker definitions for arrows */}
      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill={style?.stroke || '#b1b1b7'}
            stroke="none"
          />
        </marker>
      </defs>

      <g>
        <path
          id={id}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={markerEnd || `url(#arrow-${id})`}
          style={style}
          fill="none"
        />
        {/* Optional edge label */}
        {data?.label && typeof data.label === 'string' ? (
          <text
            x={(sourceX + targetX) / 2}
            y={(sourceY + targetY) / 2}
            className="react-flow__edge-label"
            style={{
              fontSize: '10px',
              fill: '#666',
              textAnchor: 'middle',
              dominantBaseline: 'middle',
              pointerEvents: 'none',
            }}
          >
            {data.label}
          </text>
        ) : null}
      </g>
    </>
  );
}

export default React.memo(FloatingEdge);