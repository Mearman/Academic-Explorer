/**
 * Graph Activity Tracker Component
 * Invisible component that tracks graph and simulation activity
 */

import React from "react";
import { useGraphActivityTracker } from "@/hooks/use-graph-activity-tracker";

/**
 * Component that automatically tracks graph and simulation activity
 * Should be mounted once in the app to start tracking
 */
export const GraphActivityTracker: React.FC = () => {
  useGraphActivityTracker();

  // This component renders nothing - it just runs the tracker hook
  return null;
};