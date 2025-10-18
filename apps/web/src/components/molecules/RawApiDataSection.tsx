/**
 * Component to display raw OpenAlex API data in a readable format
 * Fetches data on demand only when entityId is provided
 */

import React, { useState } from "react";
import { IconDownload, IconLoader, IconCopy } from "@tabler/icons-react";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/utils/logger";

// Constants
const UNKNOWN_ERROR_MESSAGE = "Unknown error";

interface RawApiDataSectionProps {
  entityId?: string | null;
  className?: string;
}

export const RawApiDataSection: React.FC<RawApiDataSectionProps> = ({
  entityId,
  className,
}) => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  const rawEntityDataResult = useRawEntityData({
    entityId: entityId ?? null,
    enabled: !!entityId,
  });
  const rawData = rawEntityDataResult.data;
  const { isLoading } = rawEntityDataResult;
  const { error } = rawEntityDataResult;
  const isError = !!rawEntityDataResult.error;

  // Note: ExpandableSection component removed as we now show all data expanded by default

  // Helper functions for formatting different value types
  const formatNullValue = () => (
    <span
      style={{
        color: colors.text.secondary,
        fontStyle: "italic",
        fontSize: "12px",
        fontWeight: "500",
      }}
    >
      null
    </span>
  );

  const formatUndefinedValue = () => (
    <span
      style={{
        color: colors.text.secondary,
        fontStyle: "italic",
        fontSize: "12px",
        fontWeight: "500",
      }}
    >
      undefined
    </span>
  );

  const formatBooleanValue = (value: boolean) => (
    <span
      style={{
        color: value ? "#10b981" : "#f59e0b",
        fontWeight: "600",
        fontSize: "12px",
      }}
    >
      {value ? "true" : "false"}
    </span>
  );

  const formatNumberValue = (value: number) => (
    <span
      style={{
        color: "#dc2626",
        fontWeight: "600",
        fontSize: "12px",
      }}
    >
      {value.toLocaleString()}
    </span>
  );

  const formatUrlValue = (value: string) => (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "#2563eb",
        textDecoration: "underline",
        wordBreak: "break-all",
        fontSize: "12px",
        fontWeight: "500",
        backgroundColor: "#eff6ff",
        padding: "1px 4px",
        borderRadius: "3px",
      }}
    >
      {value}
    </a>
  );

  const formatStringValue = (value: string) => (
    <span
      style={{
        color: "#059669",
        fontSize: "12px",
        fontWeight: "500",
      }}
    >
      &ldquo;{value}&rdquo;
    </span>
  );

  const formatEmptyArray = () => (
    <span
      style={{
        color: colors.text.secondary,
        fontStyle: "italic",
        fontSize: "12px",
        backgroundColor: "#f3f4f6",
        padding: "2px 6px",
        borderRadius: "4px",
      }}
    >
      [] (empty array)
    </span>
  );

  const formatArrayValue = ({
    value,
    depth,
  }: {
    value: unknown[];
    depth: number;
  }) => {
    const indentSize = 16;
    return (
      <div
        style={{
          marginLeft: `${indentSize.toString()}px`,
          borderLeft: `2px solid ${colors.border.secondary}`,
          paddingLeft: "8px",
          marginTop: "4px",
        }}
      >
        <div
          style={{
            color: colors.text.secondary,
            fontSize: "11px",
            fontWeight: "600",
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Array ({value.length} items)
        </div>
        {value.map((item, index) => (
          <div
            key={`array-item-${String(index)}-${JSON.stringify(item).substring(0, 20)}`}
            style={{
              marginBottom: "6px",
              paddingBottom: "4px",
              borderBottom:
                index < value.length - 1
                  ? `1px solid ${colors.border.secondary}`
                  : "none",
            }}
          >
            <span
              style={{
                color: "#8b5cf6",
                fontWeight: "600",
                fontSize: "11px",
                backgroundColor: "#f3f4f6",
                padding: "1px 4px",
                borderRadius: "3px",
                marginRight: "8px",
              }}
            >
              [{index}]
            </span>
            {formatValue({ value: item, depth: depth + 1 })}
          </div>
        ))}
      </div>
    );
  };

  const formatEmptyObject = () => (
    <span
      style={{
        color: colors.text.secondary,
        fontStyle: "italic",
        fontSize: "12px",
        backgroundColor: "#f3f4f6",
        padding: "2px 6px",
        borderRadius: "4px",
      }}
    >
      {"{}"} (empty object)
    </span>
  );

  const formatObjectValue = ({
    value,
    depth,
  }: {
    value: Record<string, unknown>;
    depth: number;
  }) => {
    const entries = Object.entries(value);
    const indentSize = 16;
    return (
      <div
        style={{
          marginLeft: `${indentSize.toString()}px`,
          borderLeft: `2px solid ${colors.border.secondary}`,
          paddingLeft: "8px",
          marginTop: "4px",
        }}
      >
        <div
          style={{
            color: colors.text.secondary,
            fontSize: "11px",
            fontWeight: "600",
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Object ({entries.length} properties)
        </div>
        {entries.map(([key, val], index) => (
          <div
            key={key}
            style={{
              marginBottom: "6px",
              paddingBottom: "4px",
              borderBottom:
                index < entries.length - 1
                  ? `1px solid ${colors.border.secondary}`
                  : "none",
            }}
          >
            <span
              style={{
                color: "#1f2937",
                fontWeight: "600",
                fontSize: "12px",
                backgroundColor: "#fef3c7",
                padding: "1px 4px",
                borderRadius: "3px",
                marginRight: "8px",
              }}
            >
              {key}:
            </span>
            {formatValue({ value: val, depth: depth + 1 })}
          </div>
        ))}
      </div>
    );
  };

  const formatUnknownObject = () => (
    <span
      style={{
        color: colors.text.secondary,
        fontStyle: "italic",
        fontSize: "12px",
        backgroundColor: "#fef2f2",
        padding: "2px 6px",
        borderRadius: "4px",
      }}
    >
      [Unknown Object]
    </span>
  );

  const formatPrimitiveValue = (value: string | number | boolean) => (
    <span
      style={{
        color: colors.text.primary,
        fontSize: "12px",
      }}
    >
      {value}
    </span>
  );

  const formatUnsupportedType = (valueType: string) => (
    <span
      style={{
        color: colors.text.secondary,
        fontStyle: "italic",
        fontSize: "12px",
        backgroundColor: "#fef2f2",
        padding: "2px 6px",
        borderRadius: "4px",
      }}
    >
      [Unsupported entityType: {valueType}]
    </span>
  );

  const formatValue = ({
    value,
    depth = 0,
  }: {
    value: unknown;
    depth?: number;
  }): React.ReactNode => {
    if (value === null) return formatNullValue();
    if (value === undefined) return formatUndefinedValue();
    if (typeof value === "boolean") return formatBooleanValue(value);
    if (typeof value === "number") return formatNumberValue(value);

    if (typeof value === "string") {
      return value.startsWith("http")
        ? formatUrlValue(value)
        : formatStringValue(value);
    }

    if (Array.isArray(value)) {
      return value.length === 0
        ? formatEmptyArray()
        : formatArrayValue({ value, depth });
    }

    if (typeof value === "object") {
      const entries = Object.entries(value);
      return entries.length === 0
        ? formatEmptyObject()
        : formatObjectValue({ value: value as Record<string, unknown>, depth });
    }

    // Handle edge cases
    if (typeof value === "object") return formatUnknownObject();

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return formatPrimitiveValue(value);
    }

    return formatUnsupportedType(typeof value);
  };

  const downloadJsonData = () => {
    if (!rawData) return;

    try {
      const jsonString = JSON.stringify(rawData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `openalex-${entityId?.split("/").pop() ?? "entity"}-data.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      logger.debug(
        "ui",
        "Raw API data downloaded",
        {
          entityId,
          filename: a.download,
        },
        "RawApiDataSection",
      );
    } catch (error) {
      logger.error(
        "ui",
        "Failed to download raw API data",
        {
          entityId,
          error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
        },
        "RawApiDataSection",
      );
    }
  };

  const copyJsonData = async () => {
    if (!rawData) return;

    try {
      const jsonString = JSON.stringify(rawData, null, 2);
      await navigator.clipboard.writeText(jsonString);

      logger.debug(
        "ui",
        "Raw API data copied to clipboard",
        {
          entityId,
          dataSize: jsonString.length,
        },
        "RawApiDataSection",
      );
    } catch (error) {
      logger.error(
        "ui",
        "Failed to copy raw API data to clipboard",
        {
          entityId,
          error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
        },
        "RawApiDataSection",
      );
    }
  };

  if (!entityId) {
    return null;
  }

  return (
    <div className={className}>
      {isLoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            color: "#6b7280",
            fontSize: "12px",
          }}
        >
          <IconLoader
            size={16}
            style={{ animation: "spin 1s linear infinite" }}
          />
          Loading raw API data...
        </div>
      )}

      {isError && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fef2f2",
            borderRadius: "6px",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: "12px",
          }}
        >
          Failed to load raw API data:{" "}
          {error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}
        </div>
      )}

      {rawData && (
        <>
          {/* Controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
              paddingBottom: "8px",
              borderBottom: `1px solid ${colors.border.secondary}`,
            }}
          >
            <button
              onClick={() => {
                setViewMode("formatted");
              }}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                backgroundColor:
                  viewMode === "formatted" ? "#3b82f6" : "#f3f4f6",
                color: viewMode === "formatted" ? "white" : "#374151",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Formatted
            </button>
            <button
              onClick={() => {
                setViewMode("raw");
              }}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                backgroundColor: viewMode === "raw" ? "#3b82f6" : "#f3f4f6",
                color: viewMode === "raw" ? "white" : "#374151",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Raw JSON
            </button>
            <button
              onClick={() => {
                void copyJsonData();
              }}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                backgroundColor: "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <IconCopy size={12} />
              Copy
            </button>
            <button
              onClick={downloadJsonData}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <IconDownload size={12} />
              Download
            </button>
          </div>

          {/* Data Display */}
          <div
            style={{
              maxHeight: "500px",
              overflow: "auto",
              padding: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: `2px solid ${colors.border.secondary}`,
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            {viewMode === "formatted" ? (
              <div
                style={{
                  fontSize: "12px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
                  lineHeight: "1.6",
                  color: colors.text.primary,
                }}
              >
                {formatValue({ value: rawData })}
              </div>
            ) : (
              <pre
                style={{
                  fontSize: "10px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "#374151",
                }}
              >
                {JSON.stringify(rawData, null, 2)}
              </pre>
            )}
          </div>

          {/* Data Stats */}
          <div
            style={{
              marginTop: "8px",
              fontSize: "10px",
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            {Object.keys(rawData).length} properties •{" "}
            {JSON.stringify(rawData).length.toLocaleString()} characters
          </div>
        </>
      )}
    </div>
  );
};
