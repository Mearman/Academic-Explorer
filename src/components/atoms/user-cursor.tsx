/**
 * User cursor component for showing remote user cursors
 * Displays animated cursor with user identification
 */

import { motion, AnimatePresence } from 'framer-motion';
import { memo, useEffect, useState } from 'react';

import type { CollaborationUser, CursorPosition } from '@/types/collaboration';

export interface UserCursorProps {
  /** User information */
  user: CollaborationUser;
  /** Cursor position */
  cursor: CursorPosition;
  /** Whether to show the cursor label */
  showLabel?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Z-index for cursor positioning */
  zIndex?: number;
}

/**
 * SVG cursor icon
 */
const CursorIcon = memo(({ colour }: { colour: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
  >
    <path
      d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
      fill={colour}
      stroke="white"
      strokeWidth="1"
    />
  </svg>
));

CursorIcon.displayName = 'CursorIcon';

/**
 * User cursor label
 */
const CursorLabel = memo(({ user, colour }: { user: CollaborationUser; colour: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: -10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8, y: -10 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    style={{
      backgroundColor: colour,
      position: 'absolute',
      left: '20px',
      top: '2px',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      color: 'white',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: 1000,
    }}
  >
    {user.name}
    {/* Speech bubble arrow */}
    <div
      style={{
        position: 'absolute',
        left: '-4px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 0,
        height: 0,
        borderTop: '4px solid transparent',
        borderBottom: '4px solid transparent',
        borderRight: `4px solid ${colour}`,
      }}
    />
  </motion.div>
));

CursorLabel.displayName = 'CursorLabel';

/**
 * User cursor component
 */
export const UserCursor = memo<UserCursorProps>(({
  user,
  cursor,
  showLabel = true,
  className = '',
  zIndex = 1000,
}) => {
  const [showLabelState, setShowLabelState] = useState(showLabel);

  // Auto-hide label after 3 seconds
  useEffect(() => {
    if (showLabel) {
      setShowLabelState(true);
      const timer = setTimeout(() => {
        setShowLabelState(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showLabel, cursor.x, cursor.y]); // Reset timer on cursor move

  if (!cursor.visible) {
    return null;
  }

  return (
    <motion.div
      data-testid={`cursor-${user.id}`}
      className={className}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex,
      }}
      initial={{ x: cursor.x, y: cursor.y }}
      animate={{ 
        x: cursor.x, 
        y: cursor.y,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.8,
      }}
    >
      {/* Cursor icon */}
      <div style={{ position: 'relative' }}>
        <CursorIcon colour={user.colour} />
        
        {/* Cursor label */}
        <AnimatePresence>
          {showLabelState && (
            <CursorLabel user={user} colour={user.colour} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

UserCursor.displayName = 'UserCursor';