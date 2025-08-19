/**
 * Presence list component for showing all active participants
 * Displays list of users with their presence status and controls
 */

import { motion, AnimatePresence } from 'framer-motion';
import { memo, useState, useMemo } from 'react';

import { PresenceIndicator } from '@/components/molecules/presence-indicator';
import type { CollaborationUser, UserPresence } from '@/types/collaboration';

export interface PresenceListProps {
  /** Map of active participants */
  participants: Map<string, CollaborationUser>;
  /** Map of user presence data */
  userPresence: Map<string, UserPresence>;
  /** Current user (to exclude from list) */
  currentUser?: CollaborationUser | null;
  /** Maximum number of users to show before overflow */
  maxVisible?: number;
  /** Whether the list is expanded */
  expanded?: boolean;
  /** Toggle expansion handler */
  onToggleExpanded?: () => void;
  /** User click handler */
  onUserClick?: (user: CollaborationUser) => void;
  /** Custom CSS class */
  className?: string;
}

/**
 * Overflow indicator showing additional users
 */
const OverflowIndicator = memo(({ 
  count, 
  onClick 
}: { 
  count: number;
  onClick?: () => void;
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: '#6B7280',
      color: 'white',
      fontSize: '12px',
      fontWeight: '600',
      border: '2px solid white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    +{count}
  </motion.button>
));

OverflowIndicator.displayName = 'OverflowIndicator';

/**
 * Toggle button for expanding/collapsing the list
 */
const ToggleButton = memo(({ 
  expanded, 
  onClick 
}: { 
  expanded: boolean;
  onClick?: () => void;
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      padding: '8px',
      borderRadius: '6px',
      backgroundColor: 'rgba(0,0,0,0.05)',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      color: '#374151',
    }}
    aria-label={expanded ? 'Collapse participants' : 'Expand participants'}
  >
    <motion.div
      animate={{ rotate: expanded ? 180 : 0 }}
      transition={{ duration: 0.2 }}
    >
      ▼
    </motion.div>
  </motion.button>
));

ToggleButton.displayName = 'ToggleButton';

/**
 * User list item with presence information
 */
const UserListItem = memo(({ 
  user, 
  presence, 
  onClick 
}: { 
  user: CollaborationUser;
  presence?: UserPresence;
  onClick?: (user: CollaborationUser) => void;
}) => {
  const lastActivity = presence?.lastActivity || user.lastSeen;
  const isActive = lastActivity && Date.now() - lastActivity < 300000; // 5 minutes
  
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: 'transparent',
        transition: 'background-color 0.2s ease',
      }}
      whileHover={{
        backgroundColor: 'rgba(0,0,0,0.03)',
      }}
      onClick={() => onClick?.(user)}
    >
      <PresenceIndicator 
        user={user} 
        size="medium" 
        showName={true}
        showStatus={true}
      />
      
      {/* Activity indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {presence?.currentRoute && (
          <span style={{
            fontSize: '11px',
            color: '#6B7280',
            backgroundColor: 'rgba(0,0,0,0.05)',
            padding: '2px 6px',
            borderRadius: '4px',
          }}>
            {presence.currentRoute.split('/').pop()}
          </span>
        )}
        
        {isActive && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
            }}
          />
        )}
      </div>
    </motion.li>
  );
});

UserListItem.displayName = 'UserListItem';

/**
 * Presence list component
 */
export const PresenceList = memo<PresenceListProps>(({
  participants,
  userPresence,
  currentUser,
  maxVisible = 5,
  expanded = false,
  onToggleExpanded,
  onUserClick,
  className = '',
}) => {
  const [internalExpanded, setInternalExpanded] = useState(expanded);
  
  // Use internal state if no external control
  const isExpanded = onToggleExpanded ? expanded : internalExpanded;
  const toggleExpanded = onToggleExpanded || (() => setInternalExpanded(!internalExpanded));

  // Filter out current user and sort by activity
  const otherUsers = useMemo(() => {
    const users = Array.from(participants.values()).filter(user => 
      user.id !== currentUser?.id
    );
    
    // Sort by activity (most recent first)
    return users.sort((a, b) => {
      const aActivity = userPresence.get(a.id)?.lastActivity || a.lastSeen;
      const bActivity = userPresence.get(b.id)?.lastActivity || b.lastSeen;
      return bActivity - aActivity;
    });
  }, [participants, currentUser, userPresence]);

  // Determine visible users and overflow
  const visibleUsers = isExpanded ? otherUsers : otherUsers.slice(0, maxVisible);
  const overflowCount = Math.max(0, otherUsers.length - maxVisible);
  const hasOverflow = !isExpanded && overflowCount > 0;

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.1)',
        overflow: 'hidden',
        minWidth: '250px',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.02)',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
        }}>
          Participants ({otherUsers.length})
        </h3>
        
        {otherUsers.length > maxVisible && (
          <ToggleButton 
            expanded={isExpanded} 
            onClick={toggleExpanded}
          />
        )}
      </div>

      {/* User list */}
      <div style={{ maxHeight: isExpanded ? '400px' : 'auto', overflowY: 'auto' }}>
        <motion.ul
          layout
          style={{
            margin: 0,
            padding: '8px 0',
            listStyle: 'none',
          }}
          role="list"
          aria-label="Active participants"
        >
          <AnimatePresence mode="popLayout">
            {visibleUsers.map(user => (
              <UserListItem
                key={user.id}
                user={user}
                presence={userPresence.get(user.id)}
                onClick={onUserClick}
              />
            ))}
          </AnimatePresence>
        </motion.ul>

        {/* Overflow indicator */}
        {hasOverflow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '8px 16px',
              borderTop: '1px solid rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <OverflowIndicator 
              count={overflowCount} 
              onClick={toggleExpanded}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

PresenceList.displayName = 'PresenceList';