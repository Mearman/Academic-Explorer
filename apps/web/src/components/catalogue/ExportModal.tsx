/**
 * Modal component for exporting catalogue lists
 */

import React, { useState } from "react";
import {
  Radio,
  Button,
  Group,
  Stack,
  Text,
  Alert,
  Code,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconDownload } from "@tabler/icons-react";
import { useCatalogue } from "@/hooks/useCatalogue";
import { logger } from "@/lib/logger";
import { notifications } from "@mantine/notifications";

type ExportFormat = "compressed" | "json" | "csv" | "bibtex";

interface ExportModalProps {
  listId: string;
  listTitle: string;
  onClose: () => void;
}

export function ExportModal({ listId, listTitle, onClose }: ExportModalProps) {
  const { exportListAsCompressedData } = useCatalogue();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("compressed");
  const [isExporting, setIsExporting] = useState(false);
  const [exportedData, setExportedData] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let data: string | null = null;

      switch (selectedFormat) {
        case "compressed":
          data = await exportListAsCompressedData(listId);
          break;
        case "json":
          // TODO: Implement JSON export
          notifications.show({
            title: "Not Implemented",
            message: "JSON export is not yet implemented",
            color: "yellow",
          });
          setIsExporting(false);
          return;
        case "csv":
          // TODO: Implement CSV export
          notifications.show({
            title: "Not Implemented",
            message: "CSV export is not yet implemented",
            color: "yellow",
          });
          setIsExporting(false);
          return;
        case "bibtex":
          // TODO: Implement BibTeX export
          notifications.show({
            title: "Not Implemented",
            message: "BibTeX export is not yet implemented",
            color: "yellow",
          });
          setIsExporting(false);
          return;
        default:
          throw new Error(`Unknown export format: ${selectedFormat}`);
      }

      if (data) {
        setExportedData(data);

        // Download the file
        const blob = new Blob([data], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${listTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${selectedFormat}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        logger.debug("catalogue-ui", "List exported successfully", {
          listId,
          listTitle,
          format: selectedFormat,
        });

        notifications.show({
          title: "Export Successful",
          message: `List exported as ${selectedFormat} format`,
          color: "green",
          icon: <IconCheck size={16} />,
        });
      } else {
        throw new Error("Export returned no data");
      }
    } catch (error) {
      logger.error("catalogue-ui", "Failed to export list", {
        listId,
        format: selectedFormat,
        error,
      });

      notifications.show({
        title: "Export Failed",
        message: "Failed to export list",
        color: "red",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!exportedData) return;

    try {
      await navigator.clipboard.writeText(exportedData);
      notifications.show({
        title: "Copied",
        message: "Export data copied to clipboard",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to copy export data to clipboard", { error });
      notifications.show({
        title: "Copy Failed",
        message: "Failed to copy to clipboard",
        color: "red",
      });
    }
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Export "{listTitle}" to share or backup your catalogue list
      </Text>

      <Radio.Group
        value={selectedFormat}
        onChange={(value) => setSelectedFormat(value as ExportFormat)}
        label="Select Export Format"
        required
      >
        <Stack gap="xs" mt="xs">
          <Radio
            value="compressed"
            label="Compressed Data"
            description="Compact format for sharing via URL or storing"
          />
          <Radio
            value="json"
            label="JSON"
            description="Standard JSON format for data interchange"
            disabled
          />
          <Radio
            value="csv"
            label="CSV"
            description="Spreadsheet-compatible format"
            disabled
          />
          <Radio
            value="bibtex"
            label="BibTeX"
            description="Bibliography format (works only)"
            disabled
          />
        </Stack>
      </Radio.Group>

      {exportedData && (
        <Alert color="green" icon={<IconCheck size={16} />}>
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Export Successful!
            </Text>
            <Text size="xs" c="dimmed">
              Data has been downloaded. You can also copy it to clipboard:
            </Text>
            <Group>
              <Button
                size="xs"
                variant="light"
                onClick={handleCopyToClipboard}
              >
                Copy to Clipboard
              </Button>
            </Group>
            {selectedFormat === "compressed" && exportedData.length > 100 && (
              <Code block style={{ maxHeight: "150px", overflow: "auto" }}>
                {exportedData.substring(0, 100)}...
              </Code>
            )}
          </Stack>
        </Alert>
      )}

      {selectedFormat !== "compressed" && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          This export format is not yet implemented. Please use Compressed Data format.
        </Alert>
      )}

      <Group justify="flex-end" gap="xs">
        <Button variant="subtle" onClick={onClose} disabled={isExporting}>
          Close
        </Button>
        <Button
          onClick={handleExport}
          loading={isExporting}
          disabled={selectedFormat !== "compressed"}
          leftSection={<IconDownload size={16} />}
          data-testid="export-list-button"
        >
          {exportedData ? "Export Again" : "Export"}
        </Button>
      </Group>
    </Stack>
  );
}
