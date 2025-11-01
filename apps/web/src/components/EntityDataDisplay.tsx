/**
 * EntityDataDisplay Component
 *
 * Displays all entity data in a structured, readable format using Vanilla Extract and Mantine.
 * Handles nested objects, arrays, and various data types.
 * Renders ALL fields from the API response.
 */

import React from "react";
import { Anchor, Badge, Text } from "@mantine/core";
import {
  IconExternalLink,
  IconLink,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconKey,
  IconChartBar,
  IconNetwork,
  IconCalendar,
  IconWorld,
  IconClipboard,
  IconFile,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { convertOpenAlexToInternalLink, isOpenAlexId } from "@/utils/openalex-link-conversion";
import * as styles from "./EntityDataDisplay.css";

interface EntityDataDisplayProps {
  data: Record<string, unknown>;
  title?: string;
}

/**
 * Recursively renders data in a structured format
 */
function renderValue(value: unknown, depth: number = 0): React.ReactNode {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span className={styles.nullValue}>null</span>;
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return (
      <span className={styles.booleanBadge[value ? "true" : "false"]}>
        {value ? (
          <>
            <IconCheck size={14} />
            <span>true</span>
          </>
        ) : (
          <>
            <IconX size={14} />
            <span>false</span>
          </>
        )}
      </span>
    );
  }

  // Handle numbers
  if (typeof value === "number") {
    return (
      <span className={styles.numberBadge}>
        {value.toLocaleString()}
      </span>
    );
  }

  // Handle strings
  if (typeof value === "string") {
    // Check if it's an OpenAlex URL or ID
    const converted = convertOpenAlexToInternalLink(value);

    if (converted.isOpenAlexLink) {
      // Internal OpenAlex link
      return (
        <Link
          to={converted.internalPath}
          className={styles.urlLink}
          style={{ color: 'var(--mantine-color-blue-6)' }}
        >
          <IconLink size={16} />
          <span>{value}</span>
        </Link>
      );
    }

    // Handle other URLs (external links)
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <Anchor
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.urlLink}
        >
          <IconExternalLink size={16} />
          <span>{value}</span>
        </Anchor>
      );
    }

    // Check if it's just an OpenAlex ID (without URL)
    if (isOpenAlexId(value)) {
      const idConverted = convertOpenAlexToInternalLink(value);
      return (
        <Link
          to={idConverted.internalPath}
          className={styles.urlLink}
          style={{ color: 'var(--mantine-color-blue-6)' }}
        >
          <IconLink size={16} />
          <span>{value}</span>
        </Link>
      );
    }

    return <span className={styles.stringValue}>{value}</span>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className={styles.emptyArray}>[ ]</span>;
    }

    // For primitive arrays, show inline
    if (value.every(item => typeof item !== "object" || item === null)) {
      return (
        <div className={styles.primitiveArray}>
          {value.map((item, index) => (
            <span key={index} className={styles.primitiveArrayItem}>
              {renderValue(item, depth)}
            </span>
          ))}
        </div>
      );
    }

    // For object arrays, show each item
    return (
      <div className={styles.objectArray}>
        {value.map((item, index) => (
          <div key={index} className={styles.objectArrayItem}>
            <div className={styles.arrayItemNumber}>{index + 1}</div>
            <div className={styles.arrayItemContent}>
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
      return <span className={styles.emptyObject}>{"{ }"}</span>;
    }

    return (
      <div className={styles.objectContainer}>
        {entries.map(([key, val]) => (
          <div key={key} className={styles.objectField}>
            <div>
              <span className={styles.objectFieldLabel}>{key}:</span>
              <div className={styles.objectFieldValue}>{renderValue(val, depth + 1)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback for unknown types
  return <span className={styles.fallbackValue}>{String(value)}</span>;
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

// Section icons mapping
const sectionIcons: Record<string, React.ReactNode> = {
  "Basic Information": <IconInfoCircle size={20} />,
  "Identifiers": <IconKey size={20} />,
  "Metrics": <IconChartBar size={20} />,
  "Relationships": <IconNetwork size={20} />,
  "Dates": <IconCalendar size={20} />,
  "Locations & Geo": <IconWorld size={20} />,
  "Other": <IconClipboard size={20} />,
};

export function EntityDataDisplay({ data, title }: EntityDataDisplayProps) {
  const groups = groupFields(data);

  return (
    <div className={styles.container}>
      {title && <h2 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "1.5rem" }}>{title}</h2>}

      {Object.entries(groups).map(([groupName, groupData]) => (
        <div key={groupName} className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>{sectionIcons[groupName] || <IconFile size={20} />}</span>
              <span>{groupName}</span>
              <span className={styles.fieldCount}>
                {Object.keys(groupData).length} {Object.keys(groupData).length === 1 ? "field" : "fields"}
              </span>
            </h3>
          </div>
          <div className={styles.sectionContent}>
            {Object.entries(groupData).map(([key, value]) => (
              <div key={key} className={styles.fieldContainer}>
                <span className={styles.fieldLabel}>
                  {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <div className={styles.fieldValue}>
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
