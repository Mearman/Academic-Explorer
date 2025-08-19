/**
 * User selection component for showing remote user text selections
 * Displays highlighted selection areas with user identification
 */

import { motion } from 'framer-motion';
import { memo } from 'react';

import type { CollaborationUser, SelectionRange } from '@/types/collaboration';

export interface UserSelectionProps {
  /** User information */
  user: CollaborationUser;
  /** Selection range */
  selection: SelectionRange;
  /** Custom CSS class */
  className?: string;
  /** Z-index for selection positioning */
  zIndex?: number;
  /** Opacity for the selection highlight */
  opacity?: number;
}

/**
 * Calculate selection bounds from range
 */
function getSelectionBounds(selection: SelectionRange): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const { start, end } = selection;
  
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

/**
 * Selection highlight overlay
 */
const SelectionHighlight = memo(({ 
  bounds, 
  colour, 
  opacity = 0.3 
}: { 
  bounds: ReturnType<typeof getSelectionBounds>;
  colour: string;
  opacity?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    style={{
      position: 'absolute',
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      backgroundColor: colour,
      borderRadius: '2px',
      pointerEvents: 'none',
      mixBlendMode: 'multiply',
    }}
  />
));

SelectionHighlight.displayName = 'SelectionHighlight';

/**
 * Selection border outline
 */
const SelectionBorder = memo(({ 
  bounds, 
  colour 
}: { 
  bounds: ReturnType<typeof getSelectionBounds>;
  colour: string;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    style={{
      position: 'absolute',
      left: bounds.left - 1,
      top: bounds.top - 1,
      width: bounds.width + 2,
      height: bounds.height + 2,
      border: `2px solid ${colour}`,
      borderRadius: '3px',
      pointerEvents: 'none',
    }}
  />
));

SelectionBorder.displayName = 'SelectionBorder';

/**
 * Selection label showing user and content
 */
const SelectionLabel = memo(({ 
  user, 
  selection, 
  bounds 
}: { 
  user: CollaborationUser;
  selection: SelectionRange;
  bounds: ReturnType<typeof getSelectionBounds>;
}) => {
  const labelX = bounds.left;
  const labelY = bounds.top - 30; // Position above selection
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: labelX,
        top: labelY,
        backgroundColor: user.colour,
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '500',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        maxWidth: '200px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <div style={{ fontWeight: '600', marginBottom: '2px' }}>
        {user.name}
      </div>
      {selection.content && (
        <div style={{ 
          opacity: 0.9,
          fontSize: '10px',
          lineHeight: 1.2,
        }}>
          "{selection.content.substring(0, 50)}{selection.content.length > 50 ? '...' : ''}"
        </div>
      )}
      
      {/* Arrow pointing to selection */}
      <div
        style={{
          position: 'absolute',
          left: '12px',
          bottom: '-4px',
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `4px solid ${user.colour}`,
        }}
      />
    </motion.div>
  );
});

SelectionLabel.displayName = 'SelectionLabel';

/**
 * User selection component
 */
export const UserSelection = memo<UserSelectionProps>(({
  user,
  selection,
  className = '',
  zIndex = 999,
  opacity = 0.25,
}) => {
  // Don't render if selection is invalid
  if (!selection || selection.start.x === selection.end.x && selection.start.y === selection.end.y) {
    return null;
  }

  const bounds = getSelectionBounds(selection);
  
  // Don't render if bounds are too small
  if (bounds.width < 2 && bounds.height < 2) {
    return null;
  }

  return (
    <div
      data-testid={`selection-${user.id}`}
      className={className}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
      }}
    >
      {/* Selection highlight */}
      <SelectionHighlight 
        bounds={bounds} 
        colour={user.colour} 
        opacity={opacity}
      />
      
      {/* Selection border */}
      <SelectionBorder 
        bounds={bounds} 
        colour={user.colour} 
      />
      
      {/* Selection label */}
      <SelectionLabel 
        user={user} 
        selection={selection} 
        bounds={bounds} 
      />
    </div>
  );
});

UserSelection.displayName = 'UserSelection';