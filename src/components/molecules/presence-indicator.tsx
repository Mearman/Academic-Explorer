/**
 * Presence indicator component for showing user status
 * Displays user avatar, name, and online status
 */

import { motion } from 'framer-motion';
import { memo } from 'react';

import type { CollaborationUser } from '@/types/collaboration';

export interface PresenceIndicatorProps {
  /** User information */
  user: CollaborationUser;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the user name */
  showName?: boolean;
  /** Whether to show the status indicator */
  showStatus?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Size configurations
 */
const sizeConfig = {
  small: {
    avatar: 24,
    fontSize: '12px',
    statusSize: 6,
    statusOffset: 2,
  },
  medium: {
    avatar: 32,
    fontSize: '14px',
    statusSize: 8,
    statusOffset: 2,
  },
  large: {
    avatar: 40,
    fontSize: '16px',
    statusSize: 10,
    statusOffset: 3,
  },
};

/**
 * Status indicator colors
 */
const statusColors = {
  online: '#10B981',    // Green
  away: '#F59E0B',      // Yellow
  offline: '#6B7280',   // Gray
};

/**
 * User avatar component
 */
const UserAvatar = memo(({ 
  user, 
  size, 
  onClick 
}: { 
  user: CollaborationUser;
  size: number;
  onClick?: () => void;
}) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      backgroundColor: user.colour,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: onClick ? 'pointer' : 'default',
      border: '2px solid white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}
    onClick={onClick}
  >
    {user.avatar ? (
      <img
        src={user.avatar}
        alt={`${user.name} avatar`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    ) : (
      <span
        style={{
          color: 'white',
          fontSize: `${size * 0.4}px`,
          fontWeight: '600',
          textTransform: 'uppercase',
        }}
      >
        {user.name.charAt(0)}
      </span>
    )}
  </motion.div>
));

UserAvatar.displayName = 'UserAvatar';

/**
 * Status indicator dot
 */
const StatusIndicator = memo(({ 
  status, 
  size, 
  offset 
}: { 
  status: CollaborationUser['status'];
  size: number;
  offset: number;
}) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    exit={{ scale: 0 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    style={{
      position: 'absolute',
      bottom: offset,
      right: offset,
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: statusColors[status],
      border: '2px solid white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }}
    data-testid={`status-${status}`}
  />
));

StatusIndicator.displayName = 'StatusIndicator';

/**
 * User name label
 */
const UserNameLabel = memo(({ 
  name, 
  fontSize, 
  colour 
}: { 
  name: string;
  fontSize: string;
  colour: string;
}) => (
  <motion.span
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    style={{
      fontSize,
      fontWeight: '500',
      color: colour,
      marginLeft: '8px',
      whiteSpace: 'nowrap',
    }}
  >
    {name}
  </motion.span>
));

UserNameLabel.displayName = 'UserNameLabel';

/**
 * Presence indicator component
 */
export const PresenceIndicator = memo<PresenceIndicatorProps>(({
  user,
  size = 'medium',
  showName = true,
  showStatus = true,
  className = '',
  onClick,
}) => {
  const config = sizeConfig[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
      }}
      data-testid={`presence-${user.id}`}
    >
      {/* Avatar container */}
      <div style={{ position: 'relative' }}>
        <UserAvatar 
          user={user} 
          size={config.avatar} 
          onClick={onClick} 
        />
        
        {/* Status indicator */}
        {showStatus && (
          <StatusIndicator
            status={user.status}
            size={config.statusSize}
            offset={config.statusOffset}
          />
        )}
      </div>

      {/* User name */}
      {showName && (
        <UserNameLabel
          name={user.name}
          fontSize={config.fontSize}
          colour={user.colour}
        />
      )}
    </motion.div>
  );
});

PresenceIndicator.displayName = 'PresenceIndicator';