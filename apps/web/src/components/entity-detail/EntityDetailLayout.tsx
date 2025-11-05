import React, { ReactNode } from "react";
import { Button, Text, Code, Badge } from "@mantine/core";
import { IconEye, IconCode } from "@tabler/icons-react";
import { EntityTypeConfig, EntityType } from "./EntityTypeConfig";
import { EntityDataDisplay } from "../EntityDataDisplay";
import * as styles from "./EntityDetail.css";

interface EntityDetailLayoutProps {
  config: EntityTypeConfig;
  entityType: EntityType;
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
  entityType,
  entityId,
  displayName,
  selectParam,
  selectFields,
  viewMode,
  onToggleView,
  data,
  children,
}: EntityDetailLayoutProps) {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        {/* Header Section */}
        <div className={styles.headerCard}>
          <div className={styles.headerContent}>
            <div className={styles.headerInfo}>
              <Badge
                className={styles.entityBadge[entityType]}
                size="xl"
                leftSection={
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    {config.icon}
                  </svg>
                }
              >
                {config.name}
              </Badge>

              <h1 className={styles.entityTitle}>{displayName}</h1>

              <div className={styles.metadataGroup}>
                <div className={styles.metadataRow}>
                  <span className={styles.metadataLabel}>{config.name} ID:</span>
                  <Code className={styles.metadataValue}>{entityId}</Code>
                </div>
                <div className={styles.metadataRow}>
                  <span className={styles.metadataLabel}>Select fields:</span>
                  <Text size="sm" c="dimmed" fw={500} style={{ flex: 1 }}>
                    {selectParam && typeof selectParam === 'string'
                      ? selectParam
                      : `default (${selectFields.length} fields)`}
                  </Text>
                </div>
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <Button
                size="xl"
                variant="light"
                leftSection={viewMode === "raw" ? <IconEye size={20} /> : <IconCode size={20} />}
                onClick={onToggleView}
              >
                {viewMode === "raw" ? "Rich View" : "Raw View"}
              </Button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {viewMode === "raw" ? (
          <div className={styles.rawJsonContainer}>
            <div className={styles.rawJsonHeader}>
              <h3 className={styles.rawJsonTitle}>
                <IconCode size={20} />
                Raw JSON Data
              </h3>
            </div>
            <pre className={styles.rawJsonContent}>
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
