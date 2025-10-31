import React, { ReactNode } from "react";
import { Button, Box, Text, Code, Group, Stack, Badge } from "@mantine/core";
import { IconEye, IconCode } from "@tabler/icons-react";
import { EntityTypeConfig, EntityType } from "./EntityTypeConfig";
import { EntityDataDisplay } from "../EntityDataDisplay";
import { vars } from "@/styles/theme.css";
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
  const entityColor = vars.color[config.colorKey as keyof typeof vars.color];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        {/* Header Section */}
        <div className={styles.headerCard}>
          <div className={styles.headerContent}>
            <div className={styles.headerInfo}>
              <Badge
                className={styles.entityBadge[entityType]}
                size="lg"
                leftSection={
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
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
                  <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                    {selectParam && typeof selectParam === 'string'
                      ? selectParam
                      : `default (${selectFields.length} fields)`}
                  </Text>
                </div>
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <Button
                size="lg"
                variant="gradient"
                gradient={{
                  from: entityColor,
                  to: entityColor,
                  deg: 45,
                }}
                leftSection={viewMode === "raw" ? <IconEye size={20} /> : <IconCode size={20} />}
                onClick={onToggleView}
                styles={{
                  root: {
                    transition: "all 0.2s ease",
                    ":hover": {
                      transform: "scale(1.05)",
                    },
                  },
                }}
              >
                {viewMode === "raw" ? "Switch to Rich View" : "Switch to Raw View"}
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
