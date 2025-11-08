/**
 * Modal component for importing catalogue lists from URLs
 */

import React, { useState } from "react";
import {
  TextInput,
  Button,
  Group,
  Stack,
  Text,
  Alert,
  Modal,
  Divider,
  Badge,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDownload,
  IconLink,
} from "@tabler/icons-react";
import { logger } from "@/lib/logger";

interface ImportModalProps {
  onClose: () => void;
  onImport: (url: string) => Promise<void>;
}

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url.trim()) return;

    setIsImporting(true);
    setError(null);

    try {
      await onImport(url.trim());
      logger.info("catalogue-ui", "List import initiated successfully", {
        urlLength: url.trim().length,
        urlStart: url.trim().substring(0, 50)
      });
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to import list";
      setError(errorMessage);
      logger.error("catalogue-ui", "Failed to import list", {
        urlLength: url.trim().length,
        urlStart: url.trim().substring(0, 50),
        error
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      logger.debug("catalogue-ui", "Clipboard content pasted successfully", {
        textLength: text.trim().length
      });
    } catch (error) {
      logger.warn("catalogue-ui", "Could not read clipboard", { error });
    }
  };

  return (
    <Modal opened={true} onClose={onClose} title="Import List" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Import a catalogue list from a shared URL. The list will be copied to your account.
        </Text>

        <Alert
          icon={<IconAlertTriangle size={16} />}
          title="Important"
          color="blue"
          variant="light"
        >
          Importing creates a new copy of the list in your account. Changes to the imported list won't affect the original.
        </Alert>

        <TextInput
          label="Share URL"
          placeholder="Paste the shared list URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          leftSection={<IconLink size={16} />}
          rightSection={
            <Button
              variant="subtle"
              size="xs"
              onClick={handlePaste}
              title="Paste from clipboard"
            >
              Paste
            </Button>
          }
        />

        {error && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="Import Failed"
            color="red"
            variant="light"
          >
            {error}
          </Alert>
        )}

        <Divider label="How to import" labelPosition="center" />

        <Stack gap="xs">
          <Text size="sm" fw={500}>Steps:</Text>
          <Group gap="xs">
            <Badge size="xs">1</Badge>
            <Text size="sm">Get a share URL from someone who has a catalogue list</Text>
          </Group>
          <Group gap="xs">
            <Badge size="xs">2</Badge>
            <Text size="sm">Paste the URL in the field above</Text>
          </Group>
          <Group gap="xs">
            <Badge size="xs">3</Badge>
            <Text size="sm">Click "Import List" to create your copy</Text>
          </Group>
        </Stack>

        <Group justify="flex-end" gap="xs">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            loading={isImporting}
            disabled={!url.trim()}
            leftSection={<IconDownload size={16} />}
          >
            Import List
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}