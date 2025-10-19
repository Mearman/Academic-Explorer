/**
 * Build information footer component
 * Displays application version, commit hash, build timestamp, and release links
 */

import React from "react";
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
    <div
      style={{
        marginTop: "auto",
        padding: "12px",
        backgroundColor: colors.background.secondary,
        borderRadius: "6px",
        fontSize: "11px",
        color: colors.text.tertiary,
        lineHeight: "1.3",
        borderTop: `1px solid ${colors.border.primary}`,
      }}
    >
      {/* Version */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "6px",
        }}
      >
        <IconTag size={12} />
        <span style={{ color: colors.text.secondary }}>Version</span>
        <a
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
        </a>
      </div>

      {/* Commit Hash */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "6px",
        }}
      >
        <IconGitCommit size={12} />
        <a
          href={getCommitUrl({
            repositoryUrl: buildInfo.repositoryUrl,
            commitHash: buildInfo.commitHash,
          })}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            color: colors.primary,
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
        </a>
        <span style={{ color: colors.text.tertiary }}>
          ({buildInfo.branchName})
        </span>
      </div>

      {/* Build Time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        <IconClock size={12} />
        <span title={formatBuildTimestamp(buildInfo.buildTimestamp)}>
          Built {getRelativeBuildTime(buildInfo.buildTimestamp)}
        </span>
      </div>

      {/* Repository Link */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "6px",
          borderTop: `1px solid ${colors.border.secondary}`,
        }}
      >
        <a
          href={buildInfo.repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: colors.text.secondary,
            textDecoration: "none",
            fontSize: "11px",
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.text.secondary;
          }}
        >
          <IconBrandGithub size={14} />
          Academic Explorer
        </a>
      </div>
    </div>
  );
};
