import React, { ReactNode } from "react";
import { EntityTypeConfig } from "./EntityTypeConfig";
import { EntityDataDisplay } from "../EntityDataDisplay";

interface EntityDetailLayoutProps {
  config: EntityTypeConfig;
  entityId: string;
  displayName: string;
  selectParam?: string;
  selectFields: string[];
  viewMode: "raw" | "rich";
  onToggleView: () => void;
  data: Record<string, unknown>;
  children?: ReactNode;
}

export function EntityDetailLayout({
  config,
  entityId,
  displayName,
  selectParam,
  selectFields,
  viewMode,
  onToggleView,
  data,
  children,
}: EntityDetailLayoutProps) {
  // Map badge colors to header background colors
  const headerBgMap: Record<string, string> = {
    "bg-blue-100 text-blue-800": "bg-gradient-to-br from-white to-blue-50 border-blue-100",
    "bg-emerald-100 text-emerald-800": "bg-gradient-to-br from-white to-emerald-50 border-emerald-100",
    "bg-violet-100 text-violet-800": "bg-gradient-to-br from-white to-violet-50 border-violet-100",
    "bg-amber-100 text-amber-800": "bg-gradient-to-br from-white to-amber-50 border-amber-100",
    "bg-pink-100 text-pink-800": "bg-gradient-to-br from-white to-pink-50 border-pink-100",
    "bg-green-100 text-green-800": "bg-gradient-to-br from-white to-green-50 border-green-100",
    "bg-cyan-100 text-cyan-800": "bg-gradient-to-br from-white to-cyan-50 border-cyan-100",
    "bg-indigo-100 text-indigo-800": "bg-gradient-to-br from-white to-indigo-50 border-indigo-100",
  };

  const headerBg = headerBgMap[config.colors.badge] || "bg-gradient-to-br from-white to-blue-50 border-blue-100";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.colors.gradient} p-8`}>
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className={`${headerBg} rounded-2xl shadow-2xl p-8 mb-8 border`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className={`inline-flex items-center gap-2 ${config.colors.badge} px-3 py-1 rounded-full text-xs font-bold mb-3`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d={config.icon} clipRule="evenodd" />
                </svg>
                {config.name}
              </div>
              <h1 className="text-4xl font-bold mb-4 text-gray-900 leading-tight">
                {displayName}
              </h1>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-semibold text-gray-700 min-w-[100px]">{config.name} ID:</span>
                  <span className="text-gray-600 font-mono text-xs bg-gray-100 px-3 py-1 rounded break-all flex-1">
                    {entityId}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-semibold text-gray-700 min-w-[100px]">Select fields:</span>
                  <span className="text-gray-600 text-xs flex-1">
                    {selectParam && typeof selectParam === 'string' ? selectParam : `default (${selectFields.length} fields)`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={onToggleView}
                className={`group relative px-6 py-3 bg-gradient-to-r ${config.colors.button} text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105`}
              >
                <span className="flex items-center gap-2">
                  {viewMode === "raw" ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Switch to Rich View
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Switch to Raw View
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {viewMode === "raw" ? (
          <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Raw JSON Data
              </h3>
            </div>
            <pre className="p-6 text-sm text-gray-100 overflow-auto max-h-[800px] font-mono">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ) : (
          <>
            <EntityDataDisplay data={data} />
            {children}
          </>
        )}
      </div>
    </div>
  );
}
