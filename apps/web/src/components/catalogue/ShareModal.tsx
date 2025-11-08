/**
 * Modal component for sharing catalogue lists
 */

import React, { useState, useEffect } from "react";
import {
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  CopyButton,
  ActionIcon,
  Tooltip,
  Modal,
} from "@mantine/core";
import {
  IconCopy,
  IconCheck,
  IconQrcode,
  IconExternalLink,
} from "@tabler/icons-react";
import QRCode from "qrcode";
import { logger } from "@/lib/logger";

interface ShareModalProps {
  shareUrl: string;
  listTitle: string;
  onClose: () => void;
}

export function ShareModal({ shareUrl, listTitle, onClose }: ShareModalProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    if (showQR && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => {
          setQrCodeUrl(url);
          logger.debug("catalogue-ui", "QR code generated successfully", {
            urlLength: shareUrl.length
          });
        })
        .catch((error) => {
          logger.error("catalogue-ui", "Failed to generate QR code", {
            urlLength: shareUrl.length,
            error
          });
        });
    }
  }, [showQR, shareUrl]);

  const handleOpenLink = () => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal opened={true} onClose={onClose} title="Share List" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Share "{listTitle}" with others by sending them this link:
        </Text>

        <Group gap="xs">
          <TextInput
            value={shareUrl}
            readOnly
            flex={1}
            size="sm"
          />
          <CopyButton value={shareUrl}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "Copied!" : "Copy link"}>
                <ActionIcon color={copied ? "teal" : "gray"} onClick={copy}>
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
          <Tooltip label="Open link">
            <ActionIcon onClick={handleOpenLink}>
              <IconExternalLink size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group>
          <Button
            variant={showQR ? "filled" : "outline"}
            leftSection={<IconQrcode size={16} />}
            onClick={() => setShowQR(!showQR)}
            size="sm"
          >
            {showQR ? "Hide" : "Show"} QR Code
          </Button>
        </Group>

        {showQR && qrCodeUrl && (
          <Group justify="center" p="md">
            <img
              src={qrCodeUrl}
              alt="QR Code"
              style={{ width: 200, height: 200 }}
            />
          </Group>
        )}

        <Text size="xs" c="dimmed" ta="center">
          Anyone with this link can view and import this list. The link will remain active indefinitely.
        </Text>

        <Group justify="flex-end">
          <Button onClick={onClose}>
            Done
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}