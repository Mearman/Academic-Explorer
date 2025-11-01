import React from "react";
import { Box, Text, Code, Stack, Group, Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import * as styles from "./EntityDetail.css";

interface ErrorStateProps {
  entityType: string;
  entityId: string;
  error: unknown;
}

export function ErrorState({ entityType, entityId, error }: ErrorStateProps) {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorCard}>
        <Box style={{ textAlign: "center" }} mb="md">
          <div className={styles.errorIconWrapper}>
            <IconAlertCircle size={40} color="#dc2626" />
          </div>
          <h2 className={styles.errorTitle}>Error Loading {entityType}</h2>
        </Box>

        <Stack gap="md">
          <div className={styles.errorDetailsBox}>
            <p className={styles.errorDetailsTitle}>{entityType} ID:</p>
            <Code block className={styles.errorDetailsText}>{entityId}</Code>
          </div>

          <div className={styles.errorBox}>
            <p className={styles.errorBoxTitle}>Error Details:</p>
            <Code block className={styles.errorBoxText}>{String(error)}</Code>
          </div>
        </Stack>
      </div>
    </div>
  );
}
