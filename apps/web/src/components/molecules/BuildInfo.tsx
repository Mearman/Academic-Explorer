/**
 * Build information footer component
 * Displays application version, commit hash, build timestamp, and release links
 */

import React from "react";
import { Text, Group, Tooltip, Paper, Flex, Anchor } from "@mantine/core";
import {
  getBuildInfo,
  formatBuildTimestamp,
  getCommitUrl,
  getReleaseUrl,
  getRelativeBuildTime,
} from "@academic-explorer/utils";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  IconBrandGithub,
  IconTag,
  IconGitCommit,
  IconClock,
} from "@tabler/icons-react";

export const BuildInfo: React.FC = () => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const buildInfo = getBuildInfo();

  return (
    <Paper
      mt="auto"
      p="xs"
      bg="var(--mantine-color-gray-0)"
      radius="sm"
      withBorder
      style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
    >
      {/* Version */}
      <Group gap="xs" mb="xs">
        <IconTag size={12} />
        <Text size="xs" c="dimmed">Version</Text>
        <Anchor
          href={getReleaseUrl({
            repositoryUrl: buildInfo.repositoryUrl,
            version: buildInfo.version,
          })}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: colors.primary,
            textDecoration: "none",
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          {buildInfo.version}
              </Anchor>
      </Group>

      {/* Commit Hash */}
      <Group gap="xs" mb="xs">
        <IconGitCommit size={12} />
        <Anchor
          href={getCommitUrl({
            repositoryUrl: buildInfo.repositoryUrl,
            commitHash: buildInfo.commitHash,
          })}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            color: "var(--mantine-color-blue-6)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          {buildInfo.shortCommitHash}
        </Anchor>
        <Text size="xs" c="dimmed">
          ({buildInfo.branchName})
        </Text>
      </Group>

      {/* Build Time */}
      <Group gap="xs" mb="sm">
        <IconClock size={12} />
        <Tooltip label={formatBuildTimestamp(buildInfo.buildTimestamp)}>
          <Text size="xs" c="dimmed" span>
            Built {getRelativeBuildTime(buildInfo.buildTimestamp)}
          </Text>
        </Tooltip>
      </Group>

      {/* Repository Link */}
      <Group justify="center" gap="xs" pt="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
        <Anchor
          href={buildInfo.repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          size="xs"
          fw={500}
        >
          <IconBrandGithub size={14} />
          Academic Explorer
        </Anchor>
      </Group>
    </Paper>
  );
};
