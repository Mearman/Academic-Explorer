import React, { ReactNode } from "react";
import { Button, Box, Text, Code, Group, Stack, Badge, MantineGradient } from "@mantine/core";
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
  // Map entity type to Mantine theme colors
  const entityColorMap: Record<EntityType, MantineGradient> = {
    author: { from: 'blue', to: 'cyan', deg: 45 },
    work: { from: 'violet', to: 'grape', deg: 45 },
    institution: { from: 'orange', to: 'red', deg: 45 },
    source: { from: 'teal', to: 'green', deg: 45 },
    concept: { from: 'yellow', to: 'orange', deg: 45 },
    topic: { from: 'pink', to: 'red', deg: 45 },
    publisher: { from: 'indigo', to: 'blue', deg: 45 },
    funder: { from: 'lime', to: 'green', deg: 45 },
  };

  const gradient = entityColorMap[entityType];

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
                variant="gradient"
                gradient={gradient}
                leftSection={viewMode === "raw" ? <IconEye size={24} /> : <IconCode size={24} />}
                onClick={onToggleView}
                styles={{
                  root: {
                    padding: "16px 32px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    transition: "all 0.3s ease",
                    ":hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
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
                <IconCode size={24} />
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
