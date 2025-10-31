import React from "react";
import { Box, Loader, Text, Code } from "@mantine/core";
import { EntityTypeConfig } from "./EntityTypeConfig";
import { vars } from "@/styles/theme.css";
import * as styles from "./EntityDetail.css";

interface LoadingStateProps {
  entityType: string;
  entityId: string;
  config: EntityTypeConfig;
}

export function LoadingState({ entityType, entityId, config }: LoadingStateProps) {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingCard}>
        <Loader size="xl" color={vars.color[config.colorKey as keyof typeof vars.color]} />
        <h2 className={styles.loadingTitle}>Loading {entityType}...</h2>
        <Code className={styles.loadingId}>{entityId}</Code>
      </div>
    </div>
  );
}
