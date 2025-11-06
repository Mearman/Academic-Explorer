/**
 * STAR datasets management interface
 * Upload, manage, and process systematic literature review datasets
 */

import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { IconUpload, IconChartBar } from "@tabler/icons-react";
import {
  Modal,
  FileInput,
  Button,
  Progress,
  Group,
  Stack,
  Text,
  Title,
  Paper,
  Flex,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  parseSTARFile,
  createSTARDatasetFromParseResult,
} from "@academic-explorer/utils";
import type { STARDataset } from "@academic-explorer/utils";
import { logError, logger } from "@academic-explorer/utils/logger";
import { BORDER_DEFAULT } from "@/constants/styles";


// Types are imported from @academic-explorer/utils

function DatasetsManagement() {
  const [datasets, setDatasets] = useState<STARDataset[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (file: File | null) => {
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Show initial progress
      setUploadProgress(10);

      // Parse file using actual file parser
      setUploadProgress(30);
      const parseResult = await parseSTARFile(uploadFile);

      // Check for parsing errors
      if (parseResult.metadata.errors.length > 0) {
        logger.warn(
          "ui",
          "File parsing warnings",
          { errors: parseResult.metadata.errors },
          "DatasetsManagement",
        );

        // Show error details to user for critical errors
        const criticalErrors = parseResult.metadata.errors.filter((error) =>
          error.includes("Failed to parse"),
        );

        if (criticalErrors.length > 0) {
          alert(
            `Upload failed: ${criticalErrors.join(", ")}\n\nSupported formats: CSV, JSON, Excel`,
          );
          throw new Error("File parsing failed");
        }
      }

      setUploadProgress(70);

      // Create dataset from parse result
      const reviewTopic =
        prompt("Enter the review topic for this dataset:") ??
        "Systematic Literature Review";
      const newDataset = createSTARDatasetFromParseResult({
        file: uploadFile,
        parseResult,
        reviewTopic,
      });

      setUploadProgress(100);

      // Add to datasets
      setDatasets((prev) => [...prev, newDataset]);

      // Reset upload state
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadFile(null);
        setShowUploadModal(false);
      }, 1000);
    } catch (error) {
      logError(
        logger,
        "Upload failed:",
        error,
        "DatasetsManagement",
        "routing",
      );
      setIsUploading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#1f2937",
              marginBottom: "8px",
            }}
          >
            STAR Datasets
          </h1>
          <p style={{ fontSize: "16px", color: "#6b7280" }}>
            Manage systematic literature review datasets for evaluation
            comparisons
          </p>
        </div>

        <button
          onClick={() => {
            setShowUploadModal(true);
          }}
          style={{
            backgroundColor: "#3b82f6",
            color: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            border: "none",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconUpload size={16} />
          Upload Dataset
        </button>
      </div>

      {/* Datasets Grid */}
      {datasets.length === 0 ? (
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "12px",
            border: BORDER_DEFAULT,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "16px", opacity: 0.3 }}>
            <IconChartBar size={48} />
          </div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "8px",
            }}
          >
            No datasets uploaded yet
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              marginBottom: "24px",
              maxWidth: "400px",
              margin: "0 auto 24px",
            }}
          >
            Upload your first STAR dataset to begin evaluation. Supported
            formats: CSV, JSON, Excel.
          </p>
          <button
            onClick={() => {
              setShowUploadModal(true);
            }}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "10px 18px",
              borderRadius: "6px",
              border: "none",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Upload Your First Dataset
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "24px",
          }}
        >
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                border: BORDER_DEFAULT,
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#1f2937",
                    marginBottom: "4px",
                  }}
                >
                  {dataset.name}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginBottom: "8px",
                  }}
                >
                  Topic: {dataset.reviewTopic}
                </p>
                <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                  Uploaded {formatDate(dataset.uploadDate)}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "16px",
                  padding: "12px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#1f2937",
                    }}
                  >
                    {dataset.originalPaperCount}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Total Papers
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#10b981",
                    }}
                  >
                    {dataset.includedPapers.length}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Included
                  </div>
                </div>
              </div>

              {"description" in dataset.metadata &&
                typeof dataset.metadata.description === "string" && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "16px",
                      lineHeight: "1.4",
                    }}
                  >
                    {dataset.metadata["description"]}
                  </p>
                )}

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    logger.debug(
                      "ui",
                      "View dataset details clicked",
                      { datasetId: dataset.id },
                      "DatasetsManagement",
                    );
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  View Details
                </button>
                <button
                  onClick={() => {
                    logger.debug(
                      "ui",
                      "Run comparison clicked",
                      { datasetId: dataset.id },
                      "DatasetsManagement",
                    );
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: "#10b981",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Run Comparison
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        opened={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadProgress(0);
        }}
        title="Upload STAR Dataset"
        size="md"
        radius="md"
      >
        <Stack>
          {!uploadFile ? (
            <FileInput
              accept=".csv,.json,.xlsx,.xls"
              onChange={(file) => handleFileUpload(file)}
              placeholder={
                <Stack align="center" gap="md" p="xl">
                  <IconUpload size={32} style={{ color: "var(--mantine-color-blue-6)" }} />
                  <Text size="lg" fw={500} ta="center">
                    Upload your dataset file
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Supported formats: CSV, JSON, Excel (.xlsx)
                  </Text>
                  <Text size="sm" c="blue" ta="center" td="underline">
                    Click to select file
                  </Text>
                </Stack>
              }
              styles={{
                input: {
                  borderStyle: "dashed",
                  backgroundColor: "var(--mantine-color-gray-0)",
                  cursor: "pointer",
                  textAlign: "center",
                },
              }}
            />
          ) : (
            <Stack gap="md">
              <Paper p="md" withBorder bg="var(--mantine-color-gray-0)">
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Selected file: {uploadFile.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Size: {(uploadFile.size / 1024).toFixed(1)} KB
                  </Text>
                </Stack>
              </Paper>

              {isUploading && (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Uploading...</Text>
                    <Text size="sm" c="dimmed">
                      {uploadProgress}%
                    </Text>
                  </Group>
                  <Progress
                    value={uploadProgress}
                    color="blue"
                    size="sm"
                  />
                </Stack>
              )}
            </Stack>
          )}

          <Group justify="flex-end" mt="lg">
            <Button
              variant="light"
              onClick={() => {
                setShowUploadModal(false);
                setUploadFile(null);
                setUploadProgress(0);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleUpload()}
              disabled={!uploadFile || isUploading}
              loading={isUploading}
            >
              Upload Dataset
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

export const Route = createFileRoute("/evaluation/datasets")({
  component: DatasetsManagement,
});
