import { buildInfo } from './build-info';

/**
 * Format a time difference as "Xm ago", "Xh ago", "Xd ago", etc.
 */
export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const buildTime = new Date(timestamp);
  const diffMs = now.getTime() - buildTime.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'just now';
  }
}

/**
 * Get the short commit hash from build info
 */
export function getShortHash(): string {
  return buildInfo.git.short;
}

/**
 * Get formatted build info string as "SHORT_HASH built Xm ago"
 */
export function getBuildInfoString(): string {
  const shortHash = getShortHash();
  const timeAgo = formatTimeAgo(buildInfo.buildTimestamp);
  return `${shortHash} built ${timeAgo}`;
}

/**
 * Get full build information for debugging
 */
export function getFullBuildInfo() {
  return buildInfo;
}