/**
 * EntityDataDisplay Component
 *
 * Displays all entity data in a structured, readable format.
 * Handles nested objects, arrays, and various data types.
 * Renders ALL fields from the API response.
 */

import React from "react";

interface EntityDataDisplayProps {
  data: Record<string, unknown>;
  title?: string;
}

/**
 * Recursively renders data in a structured format
 */
function renderValue(value: unknown, depth: number = 0): React.ReactNode {
  const indent = depth * 20;

  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic text-sm">null</span>;
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        value
          ? "bg-green-100 text-green-800 border border-green-200"
          : "bg-red-100 text-red-800 border border-red-200"
      }`}>
        {value ? "✓ true" : "✗ false"}
      </span>
    );
  }

  // Handle numbers
  if (typeof value === "number") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
        {value.toLocaleString()}
      </span>
    );
  }

  // Handle strings
  if (typeof value === "string") {
    // Handle URLs
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline decoration-2 underline-offset-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="break-all">{value}</span>
        </a>
      );
    }
    // Handle DOIs
    if (value.startsWith("https://doi.org/")) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline decoration-2 underline-offset-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="break-all">{value}</span>
        </a>
      );
    }
    return <span className="text-gray-900">{value}</span>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic text-sm">[ ]</span>;
    }

    // For primitive arrays, show inline
    if (value.every(item => typeof item !== "object" || item === null)) {
      return (
        <div className="inline-flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 px-3 py-1 rounded-md text-sm border border-gray-200 shadow-sm">
              {renderValue(item, depth)}
            </span>
          ))}
        </div>
      );
    }

    // For object arrays, show each item
    return (
      <div className="space-y-3 mt-2">
        {value.map((item, index) => (
          <div key={index} className="relative border-l-4 border-indigo-300 pl-4 py-2 bg-gradient-to-r from-indigo-50/50 to-transparent rounded-r">
            <div className="absolute -left-[13px] top-2 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow">
              {index + 1}
            </div>
            <div className="mt-1">
              {renderValue(item, depth + 1)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Handle objects
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);

    if (entries.length === 0) {
      return <span className="text-gray-400 italic text-sm">{ }</span>;
    }

    return (
      <div className="space-y-2 mt-2" style={{ marginLeft: indent }}>
        {entries.map(([key, val]) => (
          <div key={key} className="border-l-2 border-purple-300 pl-4 py-1 bg-gradient-to-r from-purple-50/40 to-transparent rounded-r hover:border-purple-400 transition-colors">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-purple-900 text-sm">{key}:</span>
              <div className="ml-3">{renderValue(val, depth + 1)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback for unknown types
  return <span className="text-gray-600">{String(value)}</span>;
}

/**
 * Groups fields into logical sections for better organization
 */
function groupFields(data: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const groups: Record<string, Record<string, unknown>> = {
    "Basic Information": {},
    "Identifiers": {},
    "Metrics": {},
    "Relationships": {},
    "Dates": {},
    "Locations & Geo": {},
    "Other": {},
  };

  const identifierKeys = ["id", "ids", "doi", "orcid", "issn", "ror", "mag", "openalex_id", "pmid", "pmcid"];
  const metricKeys = ["cited_by_count", "works_count", "h_index", "i10_index", "counts_by_year", "summary_stats", "fwci", "citation_normalized_percentile", "cited_by_percentile_year"];
  const relationshipKeys = ["authorships", "institutions", "concepts", "topics", "keywords", "grants", "sustainable_development_goals", "mesh", "affiliations", "last_known_institutions", "primary_location", "locations", "best_oa_location", "alternate_host_venues"];
  const dateKeys = ["created_date", "updated_date", "publication_date", "publication_year"];
  const geoKeys = ["country_code", "countries_distinct_count", "geo", "latitude", "longitude"];
  const basicKeys = ["display_name", "title", "type", "description", "homepage_url", "image_url", "thumbnail_url", "is_oa", "oa_status", "has_fulltext"];

  Object.entries(data).forEach(([key, value]) => {
    if (identifierKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Identifiers"][key] = value;
    } else if (metricKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Metrics"][key] = value;
    } else if (relationshipKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Relationships"][key] = value;
    } else if (dateKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Dates"][key] = value;
    } else if (geoKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Locations & Geo"][key] = value;
    } else if (basicKeys.some(k => key.toLowerCase().includes(k))) {
      groups["Basic Information"][key] = value;
    } else {
      groups["Other"][key] = value;
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(groupName => {
    if (Object.keys(groups[groupName]).length === 0) {
      delete groups[groupName];
    }
  });

  return groups;
}

export function EntityDataDisplay({ data, title }: EntityDataDisplayProps) {
  const groups = groupFields(data);

  // Define icons for each section
  const sectionIcons: Record<string, string> = {
    "Basic Information": "ℹ️",
    "Identifiers": "🔑",
    "Metrics": "📊",
    "Relationships": "🔗",
    "Dates": "📅",
    "Locations & Geo": "🌍",
    "Other": "📋",
  };

  return (
    <div className="space-y-6">
      {title && (
        <h2 className="text-3xl font-bold mb-6 text-gray-900 border-b-2 border-gray-200 pb-3">
          {title}
        </h2>
      )}

      {Object.entries(groups).map(([groupName, groupData]) => (
        <div
          key={groupName}
          className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <span className="text-2xl">{sectionIcons[groupName] || "📄"}</span>
              <span>{groupName}</span>
              <span className="ml-auto text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {Object.keys(groupData).length} {Object.keys(groupData).length === 1 ? "field" : "fields"}
              </span>
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(groupData).map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col gap-2 p-4 rounded-lg bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-150"
              >
                <span className="font-bold text-gray-800 text-base tracking-wide">
                  {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <div className="ml-2 mt-1">
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
