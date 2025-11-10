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
    <>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Share this list with others by sending them this link:
        </Text>

        <Stack gap="xs">
          <Text size="sm" fw={500}>Share URL</Text>
          <Group gap="xs">
            <TextInput
              value={shareUrl}
              readOnly
              flex={1}
              size="sm"
              data-testid="share-url-input"
            />
            <CopyButton value={shareUrl}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied!" : "Copy"}>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={copy}
                    leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    data-testid="copy-share-url-button"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Stack>

        <Group>
          <Button
            variant={showQR ? "filled" : "outline"}
            leftSection={<IconQrcode size={16} />}
            onClick={() => setShowQR(!showQR)}
            size="sm"
            data-testid="toggle-qr-code-button"
          >
            {showQR ? "Hide" : "Show"} QR Code
          </Button>
          <Tooltip label="Open link in new tab">
            <ActionIcon
              onClick={handleOpenLink}
              size="lg"
              variant="light"
              data-testid="open-share-link-button"
            >
              <IconExternalLink size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {showQR && qrCodeUrl && (
          <Stack align="center" gap="xs">
            <Text size="sm" fw={500}>QR Code</Text>
            <img
              src={qrCodeUrl}
              alt="QR Code for sharing"
              style={{ width: 200, height: 200 }}
              data-testid="share-qr-code"
            />
            <Text size="xs" c="dimmed">
              Scan with a mobile device to view this list
            </Text>
          </Stack>
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
    </>
  );
}