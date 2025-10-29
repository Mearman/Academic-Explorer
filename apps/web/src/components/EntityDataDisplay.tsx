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
    return <span className="text-gray-400 italic">null</span>;
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return <span className={value ? "text-green-600" : "text-red-600"}>{String(value)}</span>;
  }

  // Handle numbers
  if (typeof value === "number") {
    return <span className="text-blue-600">{value.toLocaleString()}</span>;
  }

  // Handle strings
  if (typeof value === "string") {
    // Handle URLs
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          {value}
        </a>
      );
    }
    // Handle DOIs
    if (value.startsWith("https://doi.org/")) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          {value}
        </a>
      );
    }
    return <span className="text-gray-800">{value}</span>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic">[]</span>;
    }

    // For primitive arrays, show inline
    if (value.every(item => typeof item !== "object" || item === null)) {
      return (
        <div className="inline-flex flex-wrap gap-1">
          {value.map((item, index) => (
            <span key={index} className="bg-gray-100 px-2 py-0.5 rounded text-sm">
              {renderValue(item, depth)}
            </span>
          ))}
        </div>
      );
    }

    // For object arrays, show each item
    return (
      <div className="space-y-2 mt-1">
        {value.map((item, index) => (
          <div key={index} className="border-l-2 border-gray-300 pl-3">
            <div className="text-xs text-gray-500 mb-1">Item {index + 1}</div>
            {renderValue(item, depth + 1)}
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
      return <span className="text-gray-400 italic">{"{}"}</span>;
    }

    return (
      <div className="space-y-1 mt-1" style={{ marginLeft: indent }}>
        {entries.map(([key, val]) => (
          <div key={key} className="border-l-2 border-gray-200 pl-3">
            <div className="flex flex-col">
              <span className="font-medium text-gray-700 text-sm">{key}:</span>
              <div className="ml-2">{renderValue(val, depth + 1)}</div>
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

  return (
    <div className="space-y-6">
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}

      {Object.entries(groups).map(([groupName, groupData]) => (
        <div key={groupName} className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
            {groupName}
          </h3>
          <div className="space-y-3">
            {Object.entries(groupData).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="font-medium text-gray-700 mb-1">{key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}:</span>
                <div className="ml-4">
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
