/**
 * Enhanced presence indicator with improved visual feedback
 * Shows user status, connection quality, and activity with rich animations
 */

import { Tooltip } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { memo, useMemo, useState, useEffect } from 'react';

import type { CollaborationUser, UserPresence } from '@/types/collaboration';

export interface EnhancedPresenceIndicatorProps {
  /** User information */
  user: CollaborationUser;
  /** User presence data */
  presence?: UserPresence;
  /** User activity status */
  activityStatus?: 'active' | 'idle' | 'away' | 'offline';
  /** Connection quality */
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
  /** Participant stability score (0-1) */
  stability?: number;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show detailed status */
  showDetails?: boolean;
  /** Whether to show name */
  showName?: boolean;
  /** Whether to show activity indicator */
  showActivity?: boolean;
  /** Whether to animate presence changes */
  animated?: boolean;
  /** Click handler */
  onClick?: (user: CollaborationUser) => void;
  /** Custom CSS class */
  className?: string;
}

/**
 * Get avatar size based on size variant
 */
const getAvatarSize = (size: string) => {
  switch (size) {
    case 'small': return 24;
    case 'large': return 48;
    default: return 32;
  }
};

/**
 * Get status color based on activity and connection
 */
const getStatusColor = (
  activityStatus: string = 'offline',
  connectionQuality: string = 'offline'
): string => {
  if (activityStatus === 'offline' || connectionQuality === 'offline') {
    return '#9CA3AF'; // Gray
  }
  
  if (activityStatus === 'active') {
    switch (connectionQuality) {
      case 'excellent': return '#10B981'; // Green
      case 'good': return '#059669'; // Dark green
      case 'poor': return '#F59E0B'; // Amber
      default: return '#EF4444'; // Red
    }
  }
  
  if (activityStatus === 'idle') {
    return '#F59E0B'; // Amber
  }
  
  if (activityStatus === 'away') {
    return '#EF4444'; // Red
  }
  
  return '#9CA3AF'; // Gray fallback
};

/**
 * Get connection quality indicator
 */
const getConnectionQualityIndicator = (quality: string = 'offline') => {
  switch (quality) {
    case 'excellent': return { bars: 4, color: '#10B981' };
    case 'good': return { bars: 3, color: '#059669' };
    case 'poor': return { bars: 2, color: '#F59E0B' };
    default: return { bars: 0, color: '#EF4444' };
  }
};

/**
 * Connection quality bars component
 */
const ConnectionBars = memo(({ 
  quality, 
  size 
}: { 
  quality: string; 
  size: number;
}) => {
  const { bars, color } = getConnectionQualityIndicator(quality);
  const barSize = size / 8;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '1px',
        height: barSize * 2,
        width: barSize * 5,
      }}
    >
      {[1, 2, 3, 4].map(bar => (
        <motion.div
          key={bar}
          animate={{
            height: bar <= bars ? `${bar * (barSize / 2)}px` : '2px',
            backgroundColor: bar <= bars ? color : '#E5E7EB',
          }}
          transition={{ duration: 0.3, delay: bar * 0.05 }}
          style={{
            width: barSize,
            borderRadius: '1px',
            backgroundColor: '#E5E7EB',
          }}
        />
      ))}
    </div>
  );
});

ConnectionBars.displayName = 'ConnectionBars';

/**
 * Activity pulse animation component
 */
const ActivityPulse = memo(({ 
  active, 
  color, 
  size 
}: { 
  active: boolean; 
  color: string; 
  size: number;
}) => {
  if (!active) return null;

  return (
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        top: -2,
        right: -2,
        width: size / 4,
        height: size / 4,
        backgroundColor: color,
        borderRadius: '50%',
        border: '2px solid white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    />
  );
});

ActivityPulse.displayName = 'ActivityPulse';

/**
 * Stability indicator component
 */
const StabilityIndicator = memo(({ 
  stability = 1, 
  size 
}: { 
  stability: number; 
  size: number;
}) => {
  const circumference = 2 * Math.PI * (size / 4);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (stability * circumference);
  
  const getStabilityColor = (stability: number): string => {
    if (stability > 0.8) return '#10B981';
    if (stability > 0.6) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <svg
      width={size / 2}
      height={size / 2}
      style={{
        position: 'absolute',
        top: -2,
        left: -2,
        transform: 'rotate(-90deg)',
      }}
    >
      <circle
        cx={size / 4}
        cy={size / 4}
        r={size / 4}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="2"
      />
      <motion.circle
        cx={size / 4}
        cy={size / 4}
        r={size / 4}
        fill="none"
        stroke={getStabilityColor(stability)}
        strokeWidth="2"
        strokeLinecap="round"
        animate={{
          strokeDasharray,
          strokeDashoffset,
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  );
});

StabilityIndicator.displayName = 'StabilityIndicator';

/**
 * Enhanced presence indicator component
 */
export const EnhancedPresenceIndicator = memo<EnhancedPresenceIndicatorProps>(({
  user,
  presence,
  activityStatus = 'offline',
  connectionQuality = 'offline',
  stability = 1,
  size = 'medium',
  showDetails = false,
  showName = false,
  showActivity = true,
  animated = true,
  onClick,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [lastActivity, setLastActivity] = useState<string>('');

  const avatarSize = getAvatarSize(size);
  const statusColor = getStatusColor(activityStatus, connectionQuality);
  const isActive = activityStatus === 'active';

  // Update last activity string
  useEffect(() => {
    if (presence?.lastActivity) {
      const updateLastActivity = () => {
        const now = Date.now();
        const diff = now - presence.lastActivity;
        
        if (diff < 60000) {
          setLastActivity('Just now');
        } else if (diff < 3600000) {
          setLastActivity(`${Math.floor(diff / 60000)}m ago`);
        } else if (diff < 86400000) {
          setLastActivity(`${Math.floor(diff / 3600000)}h ago`);
        } else {
          setLastActivity(`${Math.floor(diff / 86400000)}d ago`);
        }
      };

      updateLastActivity();
      const interval = setInterval(updateLastActivity, 30000); // Update every 30s
      return () => clearInterval(interval);
    }
  }, [presence?.lastActivity]);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    const details = [
      `${user.name}`,
      `Status: ${activityStatus}`,
      `Connection: ${connectionQuality}`,
      stability < 1 && `Stability: ${Math.round(stability * 100)}%`,
      lastActivity && `Last seen: ${lastActivity}`,
      presence?.currentRoute && `On: ${presence.currentRoute.split('/').pop()}`,
    ].filter(Boolean);

    return details.join('\n');
  }, [user.name, activityStatus, connectionQuality, stability, lastActivity, presence?.currentRoute]);

  const avatarContent = user.avatar ? (
    <img
      src={user.avatar}
      alt={user.name}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  ) : (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: user.colour,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${avatarSize / 2.5}px`,
        fontWeight: '600',
      }}
    >
      {user.name.slice(0, 2).toUpperCase()}
    </div>
  );

  const presenceIndicator = (
    <motion.div
      className={className}
      layout={animated}
      whileHover={animated ? { scale: 1.05 } : undefined}
      whileTap={animated ? { scale: 0.95 } : undefined}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onClick?.(user)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: showName ? '8px' : '0',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Avatar container */}
      <div
        style={{
          position: 'relative',
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `2px solid ${statusColor}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {avatarContent}
        
        {/* Activity pulse */}
        {showActivity && (
          <ActivityPulse
            active={isActive && animated}
            color={statusColor}
            size={avatarSize}
          />
        )}
        
        {/* Stability indicator */}
        {showDetails && stability < 1 && (
          <StabilityIndicator
            stability={stability}
            size={avatarSize}
          />
        )}
      </div>

      {/* Name and details */}
      {showName && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontSize: size === 'small' ? '12px' : '14px',
              fontWeight: '500',
              color: '#374151',
            }}
          >
            {user.name}
          </span>
          
          {showDetails && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: '#6B7280',
                  textTransform: 'capitalize',
                }}
              >
                {activityStatus}
              </span>
              
              {connectionQuality !== 'offline' && (
                <ConnectionBars
                  quality={connectionQuality}
                  size={avatarSize}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Hover overlay */}
      <AnimatePresence>
        {isHovered && showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              whiteSpace: 'pre-line',
              zIndex: 1000,
              pointerEvents: 'none',
              minWidth: '150px',
            }}
          >
            {tooltipContent}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return showDetails ? (
    <Tooltip label={tooltipContent} multiline>
      {presenceIndicator}
    </Tooltip>
  ) : (
    presenceIndicator
  );
});

EnhancedPresenceIndicator.displayName = 'EnhancedPresenceIndicator';