import { createLazyFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { WORK_FIELDS, cachedOpenAlex, type Work, type WorkField } from "@academic-explorer/client";
import { useQuery } from "@tanstack/react-query";
import { decodeEntityId } from "@/utils/url-decoding";
import { EntityDataDisplay } from "@/components/EntityDataDisplay";

function WorkRoute() {
  const { workId: rawWorkId } = useParams({ strict: false });
  const { select: selectParam } = useSearch({ strict: false });
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Decode the work ID and fix any collapsed protocol slashes
  const workId = decodeEntityId(rawWorkId);

  // Parse select parameter - if not provided, use all WORK_FIELDS (default behavior)
  const selectFields = selectParam && typeof selectParam === 'string'
    ? selectParam.split(',').map(field => field.trim()) as WorkField[]
    : [...WORK_FIELDS];

  // Fetch work data
  const { data: work, isLoading, error } = useQuery({
    queryKey: ["work", workId, selectParam],
    queryFn: async () => {
      if (!workId) {
        throw new Error("Work ID is required");
      }
      const response = await cachedOpenAlex.client.works.getWork(workId, {
        select: selectFields,
      });
      return response as Work;
    },
    enabled: !!workId && workId !== "random",
  });

  // Render content based on state
  let content;
  if (isLoading) {
    content = (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Loading Work...</h2>
          <p className="text-gray-600 font-mono text-sm bg-gray-100 px-4 py-2 rounded-lg inline-block">
            {workId}
          </p>
        </div>
      </div>
    );
  } else if (error) {
    content = (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-red-600 mb-2">Error Loading Work</h2>
          </div>
          <div className="space-y-3 text-left">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 font-semibold mb-1">Work ID:</p>
              <p className="text-gray-800 font-mono break-all">{workId}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-600 font-semibold mb-1">Error Details:</p>
              <p className="text-red-800 font-mono text-sm break-all">{String(error)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl shadow-2xl p-8 mb-8 border border-emerald-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold mb-3">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                  WORK
                </div>
                <h1 className="text-4xl font-bold mb-4 text-gray-900 leading-tight">
                  {work?.display_name || work?.title || "Work"}
                </h1>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-semibold text-gray-700 min-w-[100px]">Work ID:</span>
                    <span className="text-gray-600 font-mono text-xs bg-gray-100 px-3 py-1 rounded break-all flex-1">
                      {workId}
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
                  onClick={() => setViewMode(viewMode === "raw" ? "rich" : "raw")}
                  className="group relative px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105"
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
                {JSON.stringify(work, null, 2)}
              </pre>
            </div>
          ) : (
            <EntityDataDisplay data={work as Record<string, unknown>} />
          )}
        </div>
      </div>
    );
  }

  return content;
}

export const Route = createLazyFileRoute("/works/$workId")({
  component: WorkRoute,
});
