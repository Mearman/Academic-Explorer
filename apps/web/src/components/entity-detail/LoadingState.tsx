import React from "react";
import { Box, Loader, Text, Code, MantineColor } from "@mantine/core";
import { EntityTypeConfig, EntityType } from "./EntityTypeConfig";
import { vars } from "@/styles/theme.css";
import * as styles from "./EntityDetail.css";

interface LoadingStateProps {
  entityType: string;
  entityId: string;
  config: EntityTypeConfig;
}

export function LoadingState({ entityType, entityId, config }: LoadingStateProps) {
  // Map config colorKey to Mantine theme colors
  const colorMap: Record<string, MantineColor> = {
    author: 'blue',
    work: 'violet',
    institution: 'orange',
    source: 'teal',
    concept: 'yellow',
    topic: 'pink',
    publisher: 'indigo',
    funder: 'lime',
  };

  const loaderColor = colorMap[config.colorKey] || 'blue';

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingCard}>
        <Loader size="xl" color={loaderColor} />
        <h2 className={styles.loadingTitle}>Loading {entityType}...</h2>
        <Code className={styles.loadingId}>{entityId}</Code>
      </div>
    </div>
  );
}
