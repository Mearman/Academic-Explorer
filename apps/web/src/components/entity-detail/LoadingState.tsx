import React from "react";
import { EntityTypeConfig } from "./EntityTypeConfig";

interface LoadingStateProps {
  entityType: string;
  entityId: string;
  config: EntityTypeConfig;
}

export function LoadingState({ entityType, entityId, config }: LoadingStateProps) {
  // Map loading gradient to spinner border color
  const spinnerColorMap: Record<string, string> = {
    "from-blue-50 to-indigo-50": "border-blue-500",
    "from-emerald-50 to-teal-50": "border-emerald-500",
    "from-violet-50 to-purple-50": "border-violet-500",
    "from-amber-50 to-orange-50": "border-amber-500",
    "from-pink-50 to-rose-50": "border-pink-500",
    "from-green-50 to-lime-50": "border-green-500",
    "from-cyan-50 to-sky-50": "border-cyan-500",
    "from-indigo-50 to-purple-50": "border-indigo-500",
  };

  const spinnerColor = spinnerColorMap[config.colors.loading] || "border-blue-500";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.colors.loading} flex items-center justify-center p-8`}>
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
        <div className={`animate-spin rounded-full h-16 w-16 border-b-4 ${spinnerColor} mx-auto mb-6`}></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Loading {entityType}...</h2>
        <p className="text-gray-600 font-mono text-sm bg-gray-100 px-4 py-2 rounded-lg inline-block">
          {entityId}
        </p>
      </div>
    </div>
  );
}
