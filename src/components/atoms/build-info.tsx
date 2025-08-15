import React from 'react';

import { getBuildInfoString, getFullBuildInfo } from '@/lib/build-info-utils';

export interface BuildInfoProps {
  className?: string;
  showFullInfo?: boolean;
}

/**
 * Display build information in footer format: "SHORT_HASH built Xm ago"
 */
export function BuildInfo({ className = '', showFullInfo = false }: BuildInfoProps) {
  const buildString = getBuildInfoString();
  const fullInfo = getFullBuildInfo();
  
  if (showFullInfo) {
    return (
      <div className={`text-xs text-gray-500 space-y-1 ${className}`}>
        <div>{buildString}</div>
        <div>Branch: {fullInfo.git.branch}</div>
        <div>Node: {fullInfo.nodeVersion}</div>
        <div>Environment: {fullInfo.env.NODE_ENV}</div>
      </div>
    );
  }
  
  return (
    <div 
      className={`text-xs text-gray-500 ${className}`}
      title={`Full commit: ${fullInfo.git.full}\nBranch: ${fullInfo.git.branch}\nBuild time: ${fullInfo.buildTimestamp}\nEnvironment: ${fullInfo.env.NODE_ENV}`}
    >
      {buildString}
    </div>
  );
}

export default BuildInfo;